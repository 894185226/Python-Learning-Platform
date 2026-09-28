// ===================================================
// 管理端路由模块
// 从 server.js 提取，依赖 shared 和 middleware 模块
// ===================================================

const shared = require('../shared');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { metrics } = require('../shared/monitor');
const { adminAuth, requireDB, validateInput, validatePassword } = require('../middleware');
const { createLogger } = require('../shared/logger');
const log = createLogger('admin');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

module.exports = function(app) {
    const {
        pool, adminSessions,
        hashPassword, verifyPassword,
        logAdminAction,
    } = shared;

    // 延迟导入 autoBackup 避免循环依赖
    function getAutoBackup() {
        return require('../shared/db').autoBackup;
    }

    // ---------- 工具函数 ----------
    function fmtDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        const pad = n => String(n).padStart(2, '0');
        return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
    }

    // ---------- 管理员登录 ----------
    app.post('/api/admin/login', requireDB, async (req, res) => {
        try {
            const { username, password } = req.body;
            const errMsg = validateInput({ username, password });
            if (errMsg) return res.json({ success: false, error: errMsg });

            const [rows] = await pool.query(
                'SELECT id, username, display_name, password FROM admins WHERE username = ?',
                [username.trim()]
            );

            if (rows.length === 0) {
                return res.json({ success: false, error: '管理员账号或密码错误' });
            }

            const admin = rows[0];
            const isValid = await verifyPassword(password, admin.password);
            if (!isValid) {
                return res.json({ success: false, error: '管理员账号或密码错误' });
            }
            const token = crypto.randomBytes(32).toString('hex');
            adminSessions.set(token, {
                username: admin.username,
                displayName: admin.display_name,
                expires: Date.now() + 24 * 60 * 60 * 1000
            });
            res.json({
                success: true,
                token,
                user: {
                    username: admin.username,
                    displayName: admin.display_name,
                    role: 'admin'
                }
            });
        } catch (err) {
            log.error('管理员登录失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 管理员登出 ----------
    app.post('/api/admin/logout', adminAuth, (req, res) => {
        const token = req.headers['x-admin-token'];
        adminSessions.delete(token);
        res.json({ success: true });
    });

    // ===== 以下管理端接口需要认证（每个路由单独声明 adminAuth，更灵活）=====

    // ---------- 获取所有学生列表（含统计数据，支持分页）----------
    app.get('/api/admin/students', adminAuth, requireDB, async (req, res) => {
        try {
            const page = Math.max(1, Math.trunc(parseInt(req.query.page) || 1));
            const pageSize = Math.min(100, Math.max(10, Math.trunc(parseInt(req.query.pageSize) || 50)));
            const offset = Math.trunc((page - 1) * pageSize);

            const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM students');

            const [rows] = await pool.query(`
                SELECT 
                    s.id, s.username, s.display_name, s.grade, s.class_num, s.status, s.created_at,
                    COALESCE(lp.module_count, 0) AS completed_modules,
                    COALESCE(ach.ach_count, 0) AS achievement_count,
                    COALESCE(ll.login_days, 0) AS login_days,
                    ll.last_login
                FROM students s
                LEFT JOIN (
                    SELECT student_id, COUNT(DISTINCT module_id) AS module_count
                    FROM learning_progress WHERE completed = 1 GROUP BY student_id
                ) lp ON s.id = lp.student_id
                LEFT JOIN (
                    SELECT student_id, COUNT(*) AS ach_count
                    FROM achievements GROUP BY student_id
                ) ach ON s.id = ach.student_id
                LEFT JOIN (
                    SELECT student_id, COUNT(DISTINCT DATE(login_time)) AS login_days,
                           MAX(login_time) AS last_login
                    FROM login_logs GROUP BY student_id
                ) ll ON s.id = ll.student_id
                ORDER BY s.created_at DESC
                LIMIT ? OFFSET ?
            `, [pageSize, offset]);
            res.json({ success: true, students: rows, total, page, pageSize });
        } catch (err) {
            log.error('获取学生列表失败', { error: err.message });
            res.json({ success: false, error: '查询学生列表失败' });
        }
    });

    // ---------- 获取单个学生详细数据 ----------
    app.get('/api/admin/student/:id', adminAuth, requireDB, async (req, res) => {
        try {
            const studentId = parseInt(req.params.id);
            if (isNaN(studentId)) return res.json({ success: false, error: '无效的学生ID' });

            // 学生基本信息
            const [students] = await pool.query(
                'SELECT id, username, display_name, grade, class_num, status, created_at FROM students WHERE id = ?',
                [studentId]
            );
            if (students.length === 0) return res.json({ success: false, error: '学生不存在' });

            // 模块进度
            const [modules] = await pool.query(
                'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1 ORDER BY completed_at',
                [studentId]
            );

            // 成就
            const [achievements] = await pool.query(
                'SELECT achievement_id, earned_at FROM achievements WHERE student_id = ? ORDER BY earned_at',
                [studentId]
            );

            // 登录日志
            const [logs] = await pool.query(
                'SELECT login_time, ip_address FROM login_logs WHERE student_id = ? ORDER BY login_time DESC LIMIT 50',
                [studentId]
            );

            // 测验成绩（有分数的模块）
            const [quizScores] = await pool.query(
                'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1 AND score > 0 ORDER BY module_id',
                [studentId]
            );

            res.json({
                success: true,
                student: students[0],
                modules,
                quizScores,
                achievements,
                loginLogs: logs
            });
        } catch (err) {
            log.error('获取学生详情失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 获取全局统计数据 ----------
    app.get('/api/admin/stats', adminAuth, requireDB, async (req, res) => {
        try {
            // P5.5: 合并 4 个 COUNT 查询为 1 个，减少数据库往返
            const [[stats]] = await pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM students) AS totalStudents,
                    (SELECT COUNT(*) FROM learning_progress WHERE completed = 1) AS totalCompleted,
                    (SELECT COUNT(*) FROM achievements) AS totalAchievements,
                    (SELECT COUNT(*) FROM login_logs) AS totalLogins
            `);

            // 并行执行剩余查询，减少总耗时
            const [moduleStatsResult, recentLoginsResult] = await Promise.all([
                pool.query(`
                    SELECT module_id, COUNT(*) AS count
                    FROM learning_progress WHERE completed = 1
                    GROUP BY module_id ORDER BY count DESC
                `),
                pool.query(`
                    SELECT s.display_name, s.username, ll.login_time
                    FROM login_logs ll
                    JOIN students s ON ll.student_id = s.id
                    ORDER BY ll.login_time DESC LIMIT 10
                `)
            ]);

            res.json({
                success: true,
                stats: {
                    totalStudents: stats.totalStudents,
                    totalCompleted: stats.totalCompleted,
                    totalAchievements: stats.totalAchievements,
                    totalLogins: stats.totalLogins,
                    moduleStats: moduleStatsResult[0],
                    recentLogins: recentLoginsResult[0]
                }
            });
        } catch (err) {
            log.error('获取统计数据失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 删除学生 ----------
    app.delete('/api/admin/student/:id', adminAuth, requireDB, async (req, res) => {
        try {
            const studentId = parseInt(req.params.id);
            if (isNaN(studentId)) return res.json({ success: false, error: '无效的学生ID' });

            await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
            await logAdminAction(req.adminUser.username, '删除学生', `学生ID: ${studentId}`);
            res.json({ success: true });
        } catch (err) {
            log.error('删除学生失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 批量导入学生 ----------
    app.post('/api/admin/students/import', adminAuth, requireDB, async (req, res) => {
        try {
            const { students } = req.body;
            if (!Array.isArray(students) || students.length === 0) {
                return res.json({ success: false, error: '导入数据为空' });
            }
            if (students.length > 500) {
                return res.json({ success: false, error: '单次最多导入500条' });
            }

            const validGrades = ['七年级', '八年级'];
            const results = { success: 0, failed: 0, errors: [] };
            const conn = await pool.getConnection();

            try {
                await conn.beginTransaction();
                for (const s of students) {
                    const username = (s.username || '').trim();
                    const displayName = (s.displayName || '').trim();
                    const password = (s.password || 'abc123').trim();
                    const grade = (s.grade || '').trim();
                    const classNum = parseInt(s.classNum) || 0;

                    if (!username || !displayName) {
                        results.failed++;
                        results.errors.push(`${displayName || username}: 信息不完整`);
                        continue;
                    }
                    const pwdErr = validatePassword(password);
                    if (pwdErr) {
                        results.failed++;
                        results.errors.push(`${displayName || username}: ${pwdErr}`);
                        continue;
                    }
                    if (!validGrades.includes(grade)) {
                        results.failed++;
                        results.errors.push(`${displayName}: 年级无效`);
                        continue;
                    }
                    if (classNum < 1 || classNum > 20) {
                        results.failed++;
                        results.errors.push(`${displayName}: 班级无效`);
                        continue;
                    }

                    try {
                        const hashed = await hashPassword(password);
                        await conn.execute(
                            'INSERT INTO students (username, password, display_name, grade, class_num) VALUES (?, ?, ?, ?, ?)',
                            [username, hashed, displayName, grade, classNum]
                        );
                        results.success++;
                    } catch (e) {
                        results.failed++;
                        results.errors.push(`${displayName}: ${e.code === 'ER_DUP_ENTRY' ? '用户名已存在' : '插入失败'}`);
                    }
                }
                await conn.commit();
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }

            await logAdminAction(req.adminUser.username, '批量导入', `成功${results.success}条，失败${results.failed}条`);
            res.json({ success: true, results });
        } catch (err) {
            log.error('批量导入失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 批量修改学生信息（转班/毕业/改密）----------
    app.put('/api/admin/students/batch', adminAuth, requireDB, async (req, res) => {
        try {
            const { ids, action, value } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.json({ success: false, error: '请选择学生' });
            }
            if (ids.length > 200) {
                return res.json({ success: false, error: '单次最多操作200人' });
            }

            const placeholders = ids.map(() => '?').join(',');
            const conn = await pool.getConnection();

            try {
                await conn.beginTransaction();

                switch (action) {
                    case 'transfer': {
                        // value = { grade, classNum }
                        const { grade, classNum } = value || {};
                        const validGrades = ['七年级', '八年级'];
                        if (!validGrades.includes(grade)) {
                            await conn.rollback();
                            return res.json({ success: false, error: '无效的年级' });
                        }
                        const cn = parseInt(classNum) || 0;
                        if (cn < 1 || cn > 20) {
                            await conn.rollback();
                            return res.json({ success: false, error: '班级必须为1-20' });
                        }
                        await conn.execute(
                            `UPDATE students SET grade = ?, class_num = ? WHERE id IN (${placeholders})`,
                            [grade, cn, ...ids]
                        );
                        break;
                    }
                    case 'graduate': {
                        await conn.execute(
                            `UPDATE students SET status = 'graduated' WHERE id IN (${placeholders})`,
                            ids
                        );
                        break;
                    }
                    case 'activate': {
                        await conn.execute(
                            `UPDATE students SET status = 'active' WHERE id IN (${placeholders})`,
                            ids
                        );
                        break;
                    }
                    case 'resetPassword': {
                        const newPassword = (value || 'abc123').trim();
                        const pwdErr = validatePassword(newPassword);
                        if (pwdErr) {
                            await conn.rollback();
                            return res.json({ success: false, error: pwdErr });
                        }
                        const hashed = await hashPassword(newPassword);
                        await conn.execute(
                            `UPDATE students SET password = ? WHERE id IN (${placeholders})`,
                            [hashed, ...ids]
                        );
                        break;
                    }
                    case 'delete': {
                        await conn.execute(
                            `DELETE FROM students WHERE id IN (${placeholders})`,
                            ids
                        );
                        break;
                    }
                    default:
                        await conn.rollback();
                        return res.json({ success: false, error: '无效的操作' });
                }

                await conn.commit();
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }

            await logAdminAction(req.adminUser.username, '批量操作', `${action}: ${ids.length}人`);
            res.json({ success: true, affected: ids.length });
        } catch (err) {
            log.error('批量操作失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 系统公告 ----------
    // 管理端获取公告
    app.get('/api/admin/notices', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT id, title, content, created_at, updated_at FROM notices ORDER BY created_at DESC');
            res.json({ success: true, notices: rows });
        } catch (err) {
            log.error('获取公告失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 管理端发布公告
    app.post('/api/admin/notices', adminAuth, requireDB, async (req, res) => {
        try {
            const { title, content } = req.body;
            if (!title || !title.trim()) return res.json({ success: false, error: '标题不能为空' });
            if (!content || !content.trim()) return res.json({ success: false, error: '内容不能为空' });
            await pool.query('INSERT INTO notices (title, content) VALUES (?, ?)', [title.trim(), content.trim()]);
            await logAdminAction(req.adminUser.username, '发布公告', title.trim());
            // 通过 WebSocket 向所有在线用户推送公告
            try { const ws = require('../ws'); ws.wsBroadcastAll({ type: 'announcement', data: { title: title.trim(), content: content.trim() } }); } catch(e) { log.warn('WebSocket公告广播失败', { error: e.message }); }
            res.json({ success: true });
        } catch (err) {
            log.error('发布公告失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 管理端编辑公告
    app.put('/api/admin/notices/:id', adminAuth, requireDB, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的公告ID' });
            const { title, content } = req.body;
            if (!title || !title.trim()) return res.json({ success: false, error: '标题不能为空' });
            if (!content || !content.trim()) return res.json({ success: false, error: '内容不能为空' });
            await pool.query('UPDATE notices SET title = ?, content = ? WHERE id = ?', [title.trim(), content.trim(), id]);
            await logAdminAction(req.adminUser.username, '编辑公告', title.trim());
            res.json({ success: true });
        } catch (err) {
            log.error('编辑公告失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 管理端删除公告
    app.delete('/api/admin/notices/:id', adminAuth, requireDB, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的公告ID' });
            await pool.query('DELETE FROM notices WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            log.error('删除公告失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 修改管理员密码 ----------
    app.put('/api/admin/password', adminAuth, requireDB, async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) return res.json({ success: false, error: '密码不能为空' });
            const pwdErr = validatePassword(newPassword);
            if (pwdErr) return res.json({ success: false, error: pwdErr });

            const adminName = req.adminUser.username;
            const [rows] = await pool.query('SELECT id, password FROM admins WHERE username = ?', [adminName]);
            if (rows.length === 0) return res.json({ success: false, error: '当前密码错误' });
            const isValid = await verifyPassword(oldPassword, rows[0].password);
            if (!isValid) return res.json({ success: false, error: '当前密码错误' });

            const newHashed = await hashPassword(newPassword);
            await pool.query('UPDATE admins SET password = ? WHERE username = ?', [newHashed, adminName]);
            await logAdminAction(adminName, '修改密码', '管理员密码已修改');
            res.json({ success: true });
        } catch (err) {
            log.error('修改密码失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 管理员列表 ----------
    app.get('/api/admin/admins', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT id, username, display_name, role, created_at FROM admins ORDER BY created_at ASC'
            );
            res.json({ success: true, admins: rows });
        } catch (err) {
            log.error('获取管理员列表失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 操作日志 ----------
    app.get('/api/admin/logs', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT admin_name, action, detail, created_at FROM admin_logs ORDER BY created_at DESC LIMIT 100');
            res.json({ success: true, logs: rows });
        } catch (err) {
            log.error('获取日志失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 数据备份 ----------
    app.get('/api/admin/backup', adminAuth, requireDB, async (req, res) => {
        try {
            // 并行查询所有表，减少总耗时
            const [[students], [progress], [achievements], [loginLogs], [notices]] = await Promise.all([
                pool.query('SELECT * FROM students'),
                pool.query('SELECT * FROM learning_progress'),
                pool.query('SELECT * FROM achievements'),
                pool.query('SELECT * FROM login_logs ORDER BY id DESC LIMIT 5000'),
                pool.query('SELECT * FROM notices')
            ]);

            const backup = {
                students, progress, achievements, loginLogs, notices,
                exportedAt: new Date().toISOString()
            };

            const jsonData = JSON.stringify(backup);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition',
                'attachment; filename=' + encodeURIComponent('数据备份_' + timestamp + '.json'));
            res.setHeader('Cache-Control', 'no-cache');

            // 检测客户端是否支持 gzip 压缩
            const acceptEncoding = req.headers['accept-encoding'] || '';
            if (acceptEncoding.includes('gzip')) {
                const compressed = zlib.gzipSync(jsonData);
                res.setHeader('Content-Encoding', 'gzip');
                res.send(compressed);
            } else {
                res.send(jsonData);
            }

            await logAdminAction(req.adminUser.username, '数据备份', '导出完整数据库备份');
        } catch (err) {
            log.error('备份失败', { error: err.message });
            res.status(500).json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 手动触发自动备份 ----------
    app.post('/api/admin/backup/trigger', adminAuth, requireDB, async (req, res) => {
        try {
            const autoBackupFn = getAutoBackup();
            await autoBackupFn();
            await logAdminAction(req.adminUser.username, '手动备份', '触发服务器端一键备份');

            // 读取最新备份文件信息
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
                .sort()
                .reverse();
            
            let backupInfo = { filename: '', size: '', createdAt: '' };
            if (files.length > 0) {
                const latestFile = files[0];
                const stat = fs.statSync(path.join(BACKUP_DIR, latestFile));
                backupInfo = {
                    filename: latestFile,
                    size: (stat.size / 1024).toFixed(1) + ' KB',
                    createdAt: stat.mtime.toISOString()
                };
            }

            res.json({ success: true, message: '备份成功', backup: backupInfo });
        } catch (err) {
            log.error('手动备份失败', { error: err.message });
            res.status(500).json({ success: false, error: '备份失败: ' + err.message });
        }
    });

    // ---------- 查看备份文件列表 ----------
    app.get('/api/admin/backup/list', adminAuth, (req, res) => {
        try {
            if (!fs.existsSync(BACKUP_DIR)) {
                return res.json({ success: true, backups: [] });
            }
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
                .sort()
                .reverse()
                .map(f => {
                    const stat = fs.statSync(path.join(BACKUP_DIR, f));
                    return {
                        filename: f,
                        size: (stat.size / 1024).toFixed(1) + ' KB',
                        createdAt: stat.mtime.toISOString()
                    };
                });
            res.json({ success: true, backups: files });
        } catch (err) {
            log.error('获取备份列表失败', { error: err.message });
            res.status(500).json({ success: false, error: '获取备份列表失败' });
        }
    });

    // ---------- 下载指定备份文件 ----------
    app.get('/api/admin/backup/download/:filename', adminAuth, (req, res) => {
        try {
            const filename = req.params.filename;
            // 安全检查：防止路径穿越
            if (!/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/.test(filename)) {
                return res.status(400).json({ success: false, error: '无效的文件名' });
            }
            const filePath = path.join(BACKUP_DIR, filename);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, error: '文件不存在' });
            }
            res.download(filePath, filename);
        } catch (err) {
            log.error('备份下载失败', { error: err.message });
            res.status(500).json({ success: false, error: '下载失败' });
        }
    });

    // ---------- 数据恢复 ----------
    app.post('/api/admin/restore', adminAuth, requireDB, async (req, res) => {
        try {
            const data = req.body;
            if (!data.students || !Array.isArray(data.students)) return res.json({ success: false, error: '无效的备份文件' });

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                // 按顺序恢复（先删后插，处理外键）
                await conn.execute('DELETE FROM login_logs');
                await conn.execute('DELETE FROM achievements');
                await conn.execute('DELETE FROM learning_progress');
                await conn.execute('DELETE FROM students');

                for (const s of data.students) {
                    await conn.execute(
                        'INSERT INTO students (id, username, password, display_name, grade, class_num, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
                        [s.id, s.username, s.password, s.display_name, s.grade || '', s.class_num || 0, s.status || 'active', s.created_at || new Date()]
                    );
                }
                if (data.progress) for (const p of data.progress) {
                    await conn.execute('INSERT INTO learning_progress (id, student_id, module_id, completed, score, completed_at) VALUES (?,?,?,?,?,?)',
                        [p.id, p.student_id, p.module_id, p.completed, p.score, p.completed_at]);
                }
                if (data.achievements) for (const a of data.achievements) {
                    await conn.execute('INSERT INTO achievements (id, student_id, achievement_id, earned_at) VALUES (?,?,?,?)',
                        [a.id, a.student_id, a.achievement_id, a.earned_at]);
                }
                if (data.loginLogs) for (const l of data.loginLogs) {
                    await conn.execute('INSERT INTO login_logs (id, student_id, login_time, ip_address) VALUES (?,?,?,?)',
                        [l.id, l.student_id, l.login_time, l.ip_address || '']);
                }
                if (data.notices) for (const n of data.notices) {
                    await conn.execute('INSERT INTO notices (id, title, content, created_at, updated_at) VALUES (?,?,?,?,?)',
                        [n.id, n.title, n.content, n.created_at, n.updated_at || n.created_at]);
                }
                await conn.commit();
                await logAdminAction(req.adminUser.username, '数据恢复', '从备份文件恢复数据');
                res.json({ success: true });
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }
        } catch (err) {
            log.error('恢复失败', { error: err.message });
            res.json({ success: false, error: '恢复删除失败' });
        }
    });

    // ---------- 按班级统计 ----------
    app.get('/api/admin/stats/class', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    s.grade, s.class_num,
                    COUNT(*) AS total,
                    SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN s.status = 'graduated' THEN 1 ELSE 0 END) AS graduated,
                    COALESCE(AVG(completed_modules.cnt), 0) AS avg_modules
                FROM students s
                LEFT JOIN (
                    SELECT student_id, COUNT(*) AS cnt FROM learning_progress WHERE completed = 1 GROUP BY student_id
                ) completed_modules ON s.id = completed_modules.student_id
                WHERE s.grade != ''
                GROUP BY s.grade, s.class_num
                ORDER BY s.grade, s.class_num
            `);
            // 确保 avg_modules 是数字类型
            const classStats = rows.map(r => ({
                ...r,
                avg_modules: Number(r.avg_modules) || 0,
                active: Number(r.active) || 0,
                graduated: Number(r.graduated) || 0,
                total: Number(r.total) || 0
            }));
            res.json({ success: true, classStats });
        } catch (err) {
            log.error('班级统计失败', { error: err.message });
            res.json({ success: false, error: '查询班级统计失败' });
        }
    });

    // ---------- 班级统计导出 CSV ----------
    app.get('/api/admin/stats/class/export', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    s.grade, s.class_num,
                    COUNT(*) AS total,
                    SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN s.status = 'graduated' THEN 1 ELSE 0 END) AS graduated,
                    COALESCE(AVG(completed_modules.cnt), 0) AS avg_modules
                FROM students s
                LEFT JOIN (
                    SELECT student_id, COUNT(*) AS cnt FROM learning_progress WHERE completed = 1 GROUP BY student_id
                ) completed_modules ON s.id = completed_modules.student_id
                WHERE s.grade != ''
                GROUP BY s.grade, s.class_num
                ORDER BY s.grade, s.class_num
            `);
            const BOM = '\uFEFF';
            const headers = ['年级', '班级', '总人数', '在读', '已毕业', '平均完成模块'];
            let csv = BOM + headers.join(',') + '\n';
            for (const r of rows) {
                csv += [r.grade, r.class_num + '班', r.total, r.active, r.graduated, Number(r.avg_modules).toFixed(1)].join(',') + '\n';
            }
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('班级统计_' + new Date().toISOString().split('T')[0] + '.csv'));
            res.send(csv);
        } catch (err) {
            log.error('班级统计导出失败', { error: err.message });
            res.status(500).json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 数据导出（CSV）----------
    app.get('/api/admin/export', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    s.display_name, s.username, s.grade, s.class_num, s.status,
                    s.created_at,
                    COALESCE(lp.module_count, 0) AS module_count,
                    COALESCE(ach.ach_count, 0) AS ach_count,
                    COALESCE(ll.login_days, 0) AS login_days,
                    ll.last_login
                FROM students s
                LEFT JOIN (
                    SELECT student_id, COUNT(DISTINCT module_id) AS module_count
                    FROM learning_progress WHERE completed = 1 GROUP BY student_id
                ) lp ON s.id = lp.student_id
                LEFT JOIN (
                    SELECT student_id, COUNT(*) AS ach_count
                    FROM achievements GROUP BY student_id
                ) ach ON s.id = ach.student_id
                LEFT JOIN (
                    SELECT student_id, COUNT(DISTINCT DATE(login_time)) AS login_days,
                           MAX(login_time) AS last_login
                    FROM login_logs GROUP BY student_id
                ) ll ON s.id = ll.student_id
                ORDER BY s.grade, s.class_num, s.display_name
            `);

            // 生成 CSV（BOM 解决中文乱码）
            const BOM = '\uFEFF';
            const headers = ['姓名', '用户名', '年级', '班级', '状态', '完成模块数', '成就数', '登录天数', '最后登录', '注册时间'];
            let csv = BOM + headers.join(',') + '\n';
            for (const row of rows) {
                const values = [
                    row.display_name,
                    row.username,
                    row.grade || '',
                    row.class_num ? row.class_num + '班' : '',
                    row.status === 'graduated' ? '已毕业' : '在读',
                    row.module_count,
                    row.ach_count,
                    row.login_days,
                    row.last_login ? fmtDate(row.last_login) : '',
                    row.created_at ? fmtDate(row.created_at) : ''
                ];
                const vals = values.map(v => {
                    let s = v != null ? String(v) : '';
                    s = s.replace(/"/g, '""');
                    return /[,"\n]/.test(s) ? `"${s}"` : s;
                });
                csv += vals.join(',') + '\n';
            }

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('学生数据_' + new Date().toISOString().split('T')[0] + '.csv'));
            res.send(csv);
        } catch (err) {
            log.error('导出失败', { error: err.message });
            res.status(500).json({ success: false, error: '导出失败' });
        }
    });

    // ===================================================
    // 管理端 API - 作业管理
    // ===================================================

    // 布置作业
    app.post('/api/admin/assignments', adminAuth, requireDB, async (req, res) => {
        try {
            const { title, description, chapterId, dueDate } = req.body;
            if (!title || !title.trim()) return res.json({ success: false, error: '标题不能为空' });

            await pool.query(
                'INSERT INTO assignments (title, description, chapter_id, due_date, created_by) VALUES (?, ?, ?, ?, ?)',
                [title.trim(), description || '', chapterId || '', dueDate || null, req.adminUser.username]
            );
            await logAdminAction(req.adminUser.username, '布置作业', title.trim());
            res.json({ success: true });
        } catch (err) {
            log.error('布置作业失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 获取作业列表
    app.get('/api/admin/assignments', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT a.id, a.title, a.description, a.chapter_id, a.due_date, a.created_by, a.created_at,
                        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) AS submission_count
                 FROM assignments a ORDER BY a.created_at DESC`
            );
            res.json({ success: true, assignments: rows });
        } catch (err) {
            log.error('获取作业列表失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 编辑作业
    app.put('/api/admin/assignments/:id', adminAuth, requireDB, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

            const { title, description, chapterId, dueDate } = req.body;
            if (!title || !title.trim()) return res.json({ success: false, error: '标题不能为空' });

            await pool.query(
                'UPDATE assignments SET title = ?, description = ?, chapter_id = ?, due_date = ? WHERE id = ?',
                [title.trim(), description || '', chapterId || '', dueDate || null, id]
            );
            await logAdminAction(req.adminUser.username, '编辑作业', title.trim());
            res.json({ success: true });
        } catch (err) {
            log.error('编辑作业失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 删除作业
    app.delete('/api/admin/assignments/:id', adminAuth, requireDB, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

            await pool.query('DELETE FROM assignments WHERE id = ?', [id]);
            await logAdminAction(req.adminUser.username, '删除作业', `作业ID: ${id}`);
            res.json({ success: true });
        } catch (err) {
            log.error('删除作业失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 查看提交情况
    app.get('/api/admin/assignments/:id/submissions', adminAuth, requireDB, async (req, res) => {
        try {
            const assignmentId = parseInt(req.params.id);
            if (isNaN(assignmentId)) return res.json({ success: false, error: '无效的ID' });

            const [rows] = await pool.query(
                `SELECT ass.id, ass.content, ass.score, ass.submitted_at,
                        s.display_name, s.username, s.grade, s.class_num
                 FROM assignment_submissions ass
                 JOIN students s ON ass.student_id = s.id
                 WHERE ass.assignment_id = ?
                 ORDER BY ass.submitted_at DESC`,
                [assignmentId]
            );
            res.json({ success: true, submissions: rows });
        } catch (err) {
            log.error('获取提交情况失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 作业评分
    app.put('/api/admin/assignments/:assignmentId/submissions/:submissionId/score', adminAuth, requireDB, async (req, res) => {
        try {
            const submissionId = parseInt(req.params.submissionId);
            const { score } = req.body;
            if (isNaN(submissionId)) return res.json({ success: false, error: '无效的提交ID' });
            if (score === undefined || score === null) return res.json({ success: false, error: '请提供评分' });

            const numScore = parseFloat(score);
            if (isNaN(numScore) || numScore < 0 || numScore > 100) {
                return res.json({ success: false, error: '评分必须在0-100之间' });
            }

            const [result] = await pool.query(
                'UPDATE assignment_submissions SET score = ? WHERE id = ?',
                [Math.round(numScore * 10) / 10, submissionId]
            );

            if (result.affectedRows === 0) {
                return res.json({ success: false, error: '提交记录不存在' });
            }
            res.json({ success: true, message: '评分成功' });
        } catch (err) {
            log.error('作业评分失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 管理端 API - 每日一题管理
    // ===================================================

    // 添加每日一题
    app.post('/api/admin/daily-questions', adminAuth, requireDB, async (req, res) => {
        try {
            const { question, options, answer, explanation, questionDate } = req.body;
            if (!question || !answer || !questionDate) {
                return res.json({ success: false, error: '参数不完整' });
            }

            await pool.query(
                'INSERT INTO daily_questions (question, options, answer, explanation, question_date) VALUES (?, ?, ?, ?, ?)',
                [question, options ? JSON.stringify(options) : null, answer, explanation || '', questionDate]
            );
            await logAdminAction(req.adminUser.username, '添加每日一题', questionDate);
            res.json({ success: true });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, error: '该日期已有题目' });
            }
            log.error('添加每日一题失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 删除每日一题
    app.delete('/api/admin/daily-questions/:id', adminAuth, requireDB, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

            await pool.query('DELETE FROM daily_questions WHERE id = ?', [id]);
            await logAdminAction(req.adminUser.username, '删除每日一题', `ID: ${id}`);
            res.json({ success: true });
        } catch (err) {
            log.error('删除每日一题失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 获取每日一题列表
    app.get('/api/admin/daily-questions', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT id, question, options, answer, explanation, question_date, created_at FROM daily_questions ORDER BY question_date DESC LIMIT 30'
            );
            res.json({ success: true, questions: rows });
        } catch (err) {
            log.error('获取每日一题失败', { error: err.message });
            res.json({ success: false, error: '获取每日一题失败' });
        }
    });

    // ===================================================
    // 管理端 API - 讨论区管理
    // ===================================================
    app.get('/api/admin/discussions', adminAuth, requireDB, async (req, res) => {
        try {
            const { page = 1, pageSize = 20 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(pageSize);
            const [rows] = await pool.query(`
                SELECT dp.id, dp.title, dp.content, dp.chapter_id, dp.created_at,
                       s.display_name, s.username, s.grade, s.class_num,
                       (SELECT COUNT(*) FROM discussion_replies WHERE post_id = dp.id) AS reply_count
                FROM discussion_posts dp
                LEFT JOIN students s ON dp.student_id = s.id
                ORDER BY dp.created_at DESC
                LIMIT ? OFFSET ?
            `, [parseInt(pageSize), offset]);
            const [[{ total }]] = await pool.query(
                'SELECT COUNT(*) AS total FROM discussion_posts'
            );
            res.json({ success: true, discussions: rows, total });
        } catch (err) {
            log.error('获取讨论列表失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    app.get('/api/admin/discussions/:id/replies', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT dr.id, dr.content, dr.created_at,
                       s.display_name, s.username
                FROM discussion_replies dr
                LEFT JOIN students s ON dr.student_id = s.id
                WHERE dr.post_id = ?
                ORDER BY dr.created_at ASC
            `, [req.params.id]);
            res.json({ success: true, replies: rows });
        } catch (err) {
            log.error('获取回复失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    app.delete('/api/admin/discussions/:id', adminAuth, requireDB, async (req, res) => {
        try {
            await pool.query('DELETE FROM discussion_posts WHERE id = ?', [req.params.id]);
            await logAdminAction(req.adminUser.username, '删除讨论帖', `帖子ID: ${req.params.id}`);
            res.json({ success: true, message: '已删除' });
        } catch (err) {
            log.error('删除讨论帖失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    app.delete('/api/admin/discussions/replies/:id', adminAuth, requireDB, async (req, res) => {
        try {
            await pool.query('DELETE FROM discussion_replies WHERE id = ?', [req.params.id]);
            await logAdminAction(req.adminUser.username, '删除讨论回复', `回复ID: ${req.params.id}`);
            res.json({ success: true, message: '已删除' });
        } catch (err) {
            log.error('删除回复失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 管理端 API - 章节锁定管理
    // ===================================================
    app.get('/api/admin/chapter-locks', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT chapter_id, locked, grade, class_num FROM chapter_locks ORDER BY chapter_id, grade, class_num'
            );
            res.json({ success: true, locks: rows });
        } catch (err) {
            log.error('获取章节锁定失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    app.put('/api/admin/chapter-locks', adminAuth, requireDB, async (req, res) => {
        try {
            const { locks } = req.body; // [{ chapter_id, locked, grade, class_num }]
            if (!Array.isArray(locks)) return res.json({ success: false, error: '参数错误' });

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                for (const lock of locks) {
                    await conn.execute(
                        `INSERT INTO chapter_locks (chapter_id, locked, grade, class_num) 
                         VALUES (?, ?, ?, ?) 
                         ON DUPLICATE KEY UPDATE locked = VALUES(locked)`,
                        [lock.chapter_id, lock.locked ? 1 : 0, lock.grade || '', lock.class_num || 0]
                    );
                }
                await conn.commit();
                await logAdminAction(req.adminUser.username, '更新章节锁定', `${locks.length} 条记录`);
                res.json({ success: true, message: '章节锁定已更新' });
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }
        } catch (err) {
            log.error('更新章节锁定失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 管理端 API - 系统监控（P6 新增）
    // ===================================================
    app.get('/api/admin/monitor', adminAuth, async (req, res) => {
        try {
            const snapshot = metrics.getSnapshot();
            // 补充连接池状态
            const poolInfo = shared.pool.pool;
            snapshot.pool = {
                total: poolInfo ? poolInfo._allConnections.length : 0,
                idle: poolInfo ? poolInfo._freeConnections.length : 0,
                waiting: poolInfo ? poolInfo._connectionQueue.length : 0,
            };
            snapshot.sessions = shared.sessions.size;
            snapshot.adminSessions = shared.adminSessions.size;
            res.json({ success: true, monitor: snapshot });
        } catch (err) {
            log.error('获取监控数据失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 管理端 API - 学习趋势（近N天）
    // ===================================================
    app.get('/api/admin/trends', adminAuth, requireDB, async (req, res) => {
        try {
            const days = parseInt(req.query.days, 10) || 30;

            // 查询近N天每天的登录数和模块完成数
            const [rows] = await pool.query(
                `SELECT
                    DATE(login_time) AS date,
                    COUNT(DISTINCT student_id) AS newLogins,
                    0 AS newModules
                 FROM login_logs
                 WHERE login_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                 GROUP BY DATE(login_time)
                 ORDER BY date ASC`,
                [days]
            );

            // 查询模块完成趋势
            const [moduleRows] = await pool.query(
                `SELECT
                    DATE(completed_at) AS date,
                    COUNT(*) AS newModules
                 FROM learning_progress
                 WHERE completed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                 GROUP BY DATE(completed_at)
                 ORDER BY date ASC`,
                [days]
            );

            // 合并两个结果集
            const dateMap = {};
            rows.forEach(r => {
                const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
                dateMap[d] = { date: d, newLogins: r.newLogins, newModules: 0 };
            });
            moduleRows.forEach(r => {
                const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
                if (dateMap[d]) {
                    dateMap[d].newModules = r.newModules;
                } else {
                    dateMap[d] = { date: d, newLogins: 0, newModules: r.newModules };
                }
            });

            // 补齐缺失的日期（填充 0）
            const trends = [];
            const today = new Date();
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().slice(0, 10);
                trends.push(dateMap[dateStr] || { date: dateStr, newLogins: 0, newModules: 0 });
            }

            res.json({ success: true, trends });
        } catch (err) {
            log.error('获取学习趋势失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 管理端 API - 章节完成率
    // ===================================================
    app.get('/api/admin/chapter-completion', adminAuth, requireDB, async (req, res) => {
        try {

            // 总学生数
            const [[{ total }]] = await pool.query(
                `SELECT COUNT(*) AS total FROM students WHERE status = 'active'`
            );

            // 每个章节的完成人数（仅统计已完成的学生）
            const [rows] = await pool.query(
                `SELECT module_id, COUNT(DISTINCT student_id) AS completedCount
                 FROM learning_progress
                 WHERE module_id LIKE 'chapter_ch%' AND completed = 1
                 GROUP BY module_id`
            );

            const chapters = rows.map(r => {
                // 使用正则提取章节ID，与 script.js 中 /^chapter_(ch\d+)$/ 保持一致
                const match = r.module_id.match(/^chapter_(ch\d+)$/);
                const chapterId = match ? match[1] : r.module_id;
                const completedCount = r.completedCount;
                const completionRate = total > 0 ? (completedCount / total) * 100 : 0;
                return { chapterId, completedCount, totalStudents: total, completionRate: Math.round(completionRate * 10) / 10 };
            });

            res.json({ success: true, chapters });
        } catch (err) {
            log.error('获取章节完成率失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 管理端 API - 测验成绩汇总
    // ===================================================
    app.get('/api/admin/quiz-scores', adminAuth, requireDB, async (req, res) => {
        try {

            // 查询各章节测验的平均分和参与人数（仅统计已完成的测验）
            const [rows] = await pool.query(
                `SELECT module_id, AVG(score) AS avgScore, COUNT(DISTINCT student_id) AS studentCount
                 FROM learning_progress
                 WHERE (module_id LIKE '%_quiz' OR module_id LIKE '%_test') AND completed = 1
                 GROUP BY module_id
                 ORDER BY avgScore DESC`
            );

            const quizScores = rows.map(r => ({
                moduleId: r.module_id,
                avgScore: Math.round(r.avgScore * 10) / 10,
                studentCount: r.studentCount
            }));

            res.json({ success: true, quizScores });
        } catch (err) {
            log.error('获取测验成绩失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 管理端 API - 注册管理系统
    // ===================================================

    // 获取注册配置
    app.get('/api/admin/registration-settings', adminAuth, requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT setting_key, setting_value FROM registration_settings');
            const settings = {};
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
            res.json({ success: true, settings });
        } catch (err) {
            log.error('获取注册配置失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 更新注册配置
    app.put('/api/admin/registration-settings', adminAuth, requireDB, async (req, res) => {
        try {
            const { settings } = req.body;
            if (!settings || typeof settings !== 'object') {
                return res.json({ success: false, error: '参数格式错误' });
            }

            const validKeys = ['registration_enabled', 'require_student_id',
                'max_accounts_per_ip', 'registration_cooldown_minutes', 'max_accounts_per_student_id',
                'profile_edit_enabled'];

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                for (const [key, value] of Object.entries(settings)) {
                    if (validKeys.includes(key)) {
                        await conn.execute(
                            `INSERT INTO registration_settings (setting_key, setting_value) 
                             VALUES (?, ?) 
                             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                            [key, String(value)]
                        );
                    }
                }
                await conn.commit();
                await logAdminAction(req.adminUser.username, '更新注册配置',
                    Object.entries(settings).map(([k, v]) => `${k}=${v}`).join(', '));
                res.json({ success: true, message: '注册配置已更新' });
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }
        } catch (err) {
            log.error('更新注册配置失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 获取注册审计日志
    app.get('/api/admin/registration-logs', adminAuth, requireDB, async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize) || 50));
            const offset = (page - 1) * pageSize;
            const resultFilter = req.query.result || '';

            let whereClause = '';
            const params = [];
            if (resultFilter) {
                whereClause = 'WHERE result = ?';
                params.push(resultFilter);
            }

            const [[{ total }]] = await pool.query(
                `SELECT COUNT(*) AS total FROM registration_logs ${whereClause}`, params
            );

            const [rows] = await pool.query(
                `SELECT * FROM registration_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [...params, pageSize, offset]
            );

            res.json({ success: true, logs: rows, total, page, pageSize });
        } catch (err) {
            log.error('获取注册日志失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 查找疑似重复账号（同名或相近用户名）
    app.get('/api/admin/duplicate-students', adminAuth, requireDB, async (req, res) => {
        try {
            // 策略1：查找 display_name 相同但 username 不同的学生
            const [sameName] = await pool.query(`
                SELECT s1.id AS id1, s1.username AS username1, s1.display_name AS display_name1,
                       s1.grade AS grade1, s1.class_num AS class1, s1.created_at AS created1,
                       s2.id AS id2, s2.username AS username2, s2.display_name AS display_name2,
                       s2.grade AS grade2, s2.class_num AS class2, s2.created_at AS created2,
                       'same_name' AS match_type
                FROM students s1
                JOIN students s2 ON s1.display_name = s2.display_name AND s1.id < s2.id
                WHERE s1.status = 'active' AND s2.status = 'active'
                LIMIT 50
            `);

            // 策略2：查找同一IP短时间内注册多个账号
            const [sameIp] = await pool.query(`
                SELECT rl.ip_address, COUNT(DISTINCT rl.username) AS account_count,
                       GROUP_CONCAT(DISTINCT rl.username ORDER BY rl.created_at SEPARATOR ', ') AS usernames,
                       MIN(rl.created_at) AS first_reg, MAX(rl.created_at) AS last_reg
                FROM registration_logs rl
                WHERE rl.result = 'success' AND rl.ip_address != ''
                GROUP BY rl.ip_address
                HAVING account_count > 1
                ORDER BY account_count DESC
                LIMIT 30
            `);

            res.json({
                success: true,
                sameNameDuplicates: sameName,
                sameIpGroups: sameIp
            });
        } catch (err) {
            log.error('查找重复账号失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 合并学生账号
    app.post('/api/admin/students/merge', adminAuth, requireDB, async (req, res) => {
        const conn = await pool.getConnection();
        try {
            const { sourceId, targetId } = req.body;
            const srcId = parseInt(sourceId);
            const tgtId = parseInt(targetId);

            if (isNaN(srcId) || isNaN(tgtId)) {
                return res.json({ success: false, error: '无效的学生ID' });
            }
            if (srcId === tgtId) {
                return res.json({ success: false, error: '不能合并到同一个账号' });
            }

            // 验证两个账号都存在
            const [students] = await pool.query(
                'SELECT id, username, display_name FROM students WHERE id IN (?, ?)', [srcId, tgtId]
            );
            if (students.length < 2) {
                return res.json({ success: false, error: '一个或多个账号不存在' });
            }

            const sourceStudent = students.find(s => s.id === srcId);
            const targetStudent = students.find(s => s.id === tgtId);

            await conn.beginTransaction();

            // 合并学习进度：将源账号的进度迁移到目标账号（跳过已存在的）
            const [srcProgress] = await conn.query(
                'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1',
                [srcId]
            );
            for (const p of srcProgress) {
                await conn.execute(
                    `INSERT INTO learning_progress (student_id, module_id, completed, score, completed_at)
                     VALUES (?, ?, 1, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     score = GREATEST(learning_progress.score, VALUES(score)),
                     completed_at = LEAST(learning_progress.completed_at, VALUES(completed_at))`,
                    [tgtId, p.module_id, p.score, p.completed_at]
                );
            }

            // 合并成就
            const [srcAch] = await conn.query(
                'SELECT achievement_id, earned_at FROM achievements WHERE student_id = ?', [srcId]
            );
            for (const a of srcAch) {
                await conn.execute(
                    `INSERT IGNORE INTO achievements (student_id, achievement_id, earned_at)
                     VALUES (?, ?, ?)`,
                    [tgtId, a.achievement_id, a.earned_at]
                );
            }

            // 合并登录日志
            await conn.execute(
                'UPDATE login_logs SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );

            // 合并错题本
            await conn.execute(
                'UPDATE mistake_book SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );

            // 合并学习笔记
            await conn.execute(
                'UPDATE study_notes SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );

            // 合并代码收藏
            await conn.execute(
                'UPDATE code_snippets SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );

            // 合并作业提交
            const [srcSubs] = await conn.query(
                'SELECT assignment_id, content, score, submitted_at FROM assignment_submissions WHERE student_id = ?',
                [srcId]
            );
            for (const sub of srcSubs) {
                await conn.execute(
                    `INSERT INTO assignment_submissions (assignment_id, student_id, content, score, submitted_at)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     score = GREATEST(assignment_submissions.score, VALUES(score)),
                     submitted_at = LEAST(assignment_submissions.submitted_at, VALUES(submitted_at))`,
                    [sub.assignment_id, tgtId, sub.content, sub.score, sub.submitted_at]
                );
            }

            // 合并讨论帖和回复
            await conn.execute(
                'UPDATE discussion_posts SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );
            await conn.execute(
                'UPDATE discussion_replies SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );

            // 合并学习目标
            await conn.execute(
                'UPDATE student_goals SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );

            // 合并通知
            await conn.execute(
                'UPDATE notifications SET student_id = ? WHERE student_id = ?', [tgtId, srcId]
            );

            // 合并唯一标识
            const [srcIdentifiers] = await conn.query(
                'SELECT identifier_type, identifier_value FROM student_identifiers WHERE student_id = ?',
                [srcId]
            );
            for (const ident of srcIdentifiers) {
                await conn.execute(
                    `INSERT IGNORE INTO student_identifiers (student_id, identifier_type, identifier_value)
                     VALUES (?, ?, ?)`,
                    [tgtId, ident.identifier_type, ident.identifier_value]
                );
            }

            // 记录合并
            await conn.execute(
                'INSERT INTO merge_records (source_student_id, target_student_id, admin_name) VALUES (?, ?, ?)',
                [srcId, tgtId, req.adminUser.username]
            );

            // 删除源账号
            await conn.execute('DELETE FROM students WHERE id = ?', [srcId]);

            await conn.commit();

            await logAdminAction(req.adminUser.username, '合并账号',
                `${sourceStudent.display_name}(${sourceStudent.username}) → ${targetStudent.display_name}(${targetStudent.username})`);

            res.json({
                success: true,
                message: `已将 ${sourceStudent.display_name} 的数据合并到 ${targetStudent.display_name}`,
                mergedProgress: srcProgress.length,
                mergedAchievements: srcAch.length
            });
        } catch (err) {
            await conn.rollback();
            log.error('合并账号失败', { error: err.message });
            res.json({ success: false, error: '合并失败: ' + err.message });
        } finally {
            conn.release();
        }
    });

    // ===================================================
    // 管理端 API - 作品截图查看
    // ===================================================
    app.get('/api/admin/screenshots', adminAuth, requireDB, async (req, res) => {
        try {
            const { chapterId } = req.query;
            let sql = `
                SELECT ss.id, ss.chapter_id, ss.file_name, ss.created_at,
                       s.display_name, s.username, s.grade, s.class_num
                FROM screenshot_submissions ss
                JOIN students s ON ss.student_id = s.id
            `;
            const params = [];
            if (chapterId) {
                sql += ' WHERE ss.chapter_id = ?';
                params.push(chapterId);
            }
            sql += ' ORDER BY ss.created_at DESC LIMIT 200';
            const [rows] = await pool.query(sql, params);
            res.json({ success: true, screenshots: rows });
        } catch (err) {
            log.error('获取截图列表失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });
};