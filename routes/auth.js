// ===================================================
// 认证路由 - 学生注册/登录/登出/CSRF Token
// ===================================================
const crypto = require('crypto');
const shared = require('../shared');
const middleware = require('../middleware');
const { createLogger } = require('../shared/logger');
const log = createLogger('auth');

const {
    pool,
    sessions,
    saveSessions,
    saveSessionToDB,
    removeSessionFromDB,
    generateSessionToken,
    hashPassword,
    verifyPassword,
    loginFailures,
    cleanupStudentSessions,
    LOGIN_FAILURE_WINDOW,
    LOGIN_FAILURE_MAX,
} = shared;

const {
    loginRateLimit,
    requireDB,
    validateInput,
    validatePassword,
    getOrCreateCSRFToken,
    generateCSRFToken,
} = middleware;

module.exports = function authRoutes(app) {
    // ---------- CSRF Token ----------
    app.get('/api/csrf-token', (req, res) => {
        const sessionToken = req.headers['x-session-token'];
        if (sessionToken) {
            const token = getOrCreateCSRFToken(sessionToken);
            if (token) return res.json({ token });
        }
        // 未登录用户：返回临时 Token（仅用于登录前的 CSRF 保护）
        // 实际上登录/注册接口本身不需要 CSRF Token（用户尚未登录，无法获取有效 Token）
        res.json({ token: '' });
    });

    // ---------- 用户注册 ----------
    app.post('/api/register', loginRateLimit, requireDB, async (req, res) => {
        try {
            const { username, password, displayName, grade, classNum, studentId } = req.body;

            // 服务端输入校验
            const errMsg = validateInput({ username, password, displayName });
            if (errMsg) return res.json({ success: false, error: errMsg });
            const pwdErr = validatePassword(password);
            if (pwdErr) return res.json({ success: false, error: pwdErr });
            if (username.length < 2) {
                return res.json({ success: false, error: '用户名至少2位' });
            }
            // 年级校验
            const validGrades = ['七年级', '八年级'];
            if (grade && !validGrades.includes(grade)) {
                return res.json({ success: false, error: '无效的年级' });
            }
            // 班级校验
            const cn = parseInt(classNum) || 0;
            if (cn < 1 || cn > 20) {
                return res.json({ success: false, error: '班级必须为1-20' });
            }

            const ip = req.ip || req.connection.remoteAddress || '';
            const userAgent = (req.headers['user-agent'] || '').substring(0, 500);

            // ===== 注册管理检查 =====
            // 1. 检查注册开关
            const [regSettings] = await pool.query(
                'SELECT setting_key, setting_value FROM registration_settings'
            );
            const settings = {};
            regSettings.forEach(r => { settings[r.setting_key] = r.setting_value; });

            if (settings.registration_enabled === 'false') {
                await logRegistrationActivity(pool, username, displayName, grade, cn, studentId,
                    ip, userAgent, 'blocked', '管理员已关闭注册功能');
                return res.json({ success: false, error: '管理员已暂时关闭注册功能，请联系老师' });
            }

            // 2. 学号唯一性校验（如果启用了 require_student_id）
            if (settings.require_student_id === 'true') {
                const sid = (studentId || '').trim();
                if (!sid) {
                    await logRegistrationActivity(pool, username, displayName, grade, cn, '',
                        ip, userAgent, 'blocked', '需要填写学号');
                    return res.json({ success: false, error: '当前需要填写学号才能注册' });
                }
                // 检查学号是否已被使用
                const maxPerSid = parseInt(settings.max_accounts_per_student_id) || 1;
                const [existingSid] = await pool.query(
                    `SELECT COUNT(*) AS cnt FROM student_identifiers si
                     JOIN students s ON si.student_id = s.id AND s.status = 'active'
                     WHERE si.identifier_type = 'student_id' AND si.identifier_value = ?`,
                    [sid]
                );
                if (existingSid[0].cnt >= maxPerSid) {
                    await logRegistrationActivity(pool, username, displayName, grade, cn, sid,
                        ip, userAgent, 'blocked', `学号 ${sid} 已被使用`);
                    return res.json({ success: false, error: '该学号已注册过账号，如需帮助请联系老师' });
                }
            }

            // 3. IP 频率限制
            const maxPerIp = parseInt(settings.max_accounts_per_ip) || 3;
            const cooldownMinutes = parseInt(settings.registration_cooldown_minutes) || 5;
            const [ipCount] = await pool.query(
                `SELECT COUNT(*) AS cnt FROM registration_logs
                 WHERE ip_address = ? AND result = 'success'
                 AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
                [ip, cooldownMinutes]
            );
            if (ipCount[0].cnt >= maxPerIp) {
                await logRegistrationActivity(pool, username, displayName, grade, cn, studentId,
                    ip, userAgent, 'blocked',
                    `IP ${ip} 在 ${cooldownMinutes} 分钟内已注册 ${ipCount[0].cnt} 个账号（上限 ${maxPerIp}）`);
                return res.json({
                    success: false,
                    error: `注册过于频繁，请 ${cooldownMinutes} 分钟后再试。如需帮助请联系老师`
                });
            }

            const hashed = await hashPassword(password);
            const [result] = await pool.query(
                'INSERT INTO students (username, password, display_name, grade, class_num) VALUES (?, ?, ?, ?, ?)',
                [username.trim(), hashed, displayName.trim(), grade || '', cn]
            );
            const studentId_db = result.insertId;

            // 保存学号（如果提供了）
            const sid = (studentId || '').trim();
            if (sid) {
                try {
                    await pool.query(
                        'INSERT INTO student_identifiers (student_id, identifier_type, identifier_value) VALUES (?, ?, ?)',
                        [studentId_db, 'student_id', sid]
                    );
                } catch (e) {
                    if (e.code !== 'ER_DUP_ENTRY') {
                        log.warn('保存学号失败', { error: e.message });
                    }
                }
            }

            // 记录注册成功日志
            await logRegistrationActivity(pool, username, displayName, grade, cn, sid,
                ip, userAgent, 'success', '');

            // 注册成功，自动创建会话（自动登录）
            const sessionToken = generateSessionToken();
            const csrfToken = generateCSRFToken();
            sessions.set(sessionToken, {
                username: username.trim(),
                studentId: studentId_db,
                csrfToken,
                createdAt: Date.now()
            });
            saveSessions();
            saveSessionToDB(sessionToken, { username: username.trim(), studentId: studentId_db, csrfToken, createdAt: Date.now() });

            res.json({
                success: true,
                token: sessionToken,
                csrfToken,
                user: {
                    username: username.trim(),
                    displayName: displayName.trim(),
                    grade: grade || '',
                    classNum: cn
                }
            });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.json({ success: false, error: '用户名已存在' });
            } else {
                log.error('注册失败', { error: err.message });
                res.json({ success: false, error: '服务器错误' });
            }
        }
    });

    // ---------- 用户登录 ----------
    app.post('/api/login', loginRateLimit, requireDB, async (req, res) => {
        try {
            const { username, password } = req.body;

            // 服务端输入校验
            const errMsg = validateInput({ username, password });
            if (errMsg) return res.json({ success: false, error: errMsg });

            // 暴力破解防护：用户名级别锁定（避免教室局域网共享IP误伤）
            const loginKey = username.trim();
            const failures = loginFailures.get(loginKey) || { count: 0, resetTime: Date.now() + LOGIN_FAILURE_WINDOW };
            if (Date.now() > failures.resetTime) {
                failures.count = 0;
                failures.resetTime = Date.now() + LOGIN_FAILURE_WINDOW;
            }
            if (failures.count >= LOGIN_FAILURE_MAX) {
                return res.status(429).json({ error: '登录尝试次数过多，请15分钟后再试' });
            }

            const [rows] = await pool.query(
                'SELECT id, username, display_name, grade, class_num, status, password FROM students WHERE username = ?',
                [username.trim()]
            );

            if (rows.length === 0) {
                failures.count++;
                loginFailures.set(loginKey, failures);
                return res.json({ success: false, error: '用户名或密码错误' });
            }

            const student = rows[0];
            const isValid = await verifyPassword(password, student.password);
            if (!isValid) {
                failures.count++;
                loginFailures.set(loginKey, failures);
                return res.json({ success: false, error: '用户名或密码错误' });
            }

            // 登录成功，清除失败计数器
            loginFailures.delete(loginKey);

            // 检查学生状态
            if (student.status === 'graduated') {
                return res.json({ success: false, error: '该账号已毕业，无法登录' });
            }

            // 记录登录日志
            const ip = req.ip || req.connection.remoteAddress || '';
            await pool.query(
                'INSERT INTO login_logs (student_id, ip_address) VALUES (?, ?)',
                [student.id, ip]
            );

            const sessionToken = generateSessionToken();
            const csrfToken = generateCSRFToken();

            // 单设备登录：清除该用户已有的其他会话，使旧设备登录状态失效
            cleanupStudentSessions(student.username);

            sessions.set(sessionToken, {
                username: student.username,
                studentId: student.id,
                csrfToken,
                createdAt: Date.now()
            });
            saveSessions(); // 持久化会话
            saveSessionToDB(sessionToken, { username: student.username, studentId: student.id, csrfToken, createdAt: Date.now() });

            res.json({
                success: true,
                token: sessionToken,
                csrfToken,
                user: {
                    username: student.username,
                    displayName: student.display_name,
                    grade: student.grade || '',
                    classNum: student.class_num || 0
                }
            });
        } catch (err) {
            log.error('登录失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 密码重置（学生自助） ----------
    // 通过用户名+显示名称验证身份，重置密码
    app.post('/api/reset-password', loginRateLimit, requireDB, async (req, res) => {
        try {
            const { username, displayName, newPassword } = req.body;

            // 输入校验
            const errMsg = validateInput({ username, displayName, newPassword });
            if (errMsg) return res.json({ success: false, error: errMsg });
            if (username.length < 2) return res.json({ success: false, error: '用户名至少2位' });

            const pwdErr = validatePassword(newPassword);
            if (pwdErr) return res.json({ success: false, error: pwdErr });

            // 验证用户身份（用户名+显示名称匹配）
            const [rows] = await pool.query(
                'SELECT id, display_name FROM students WHERE username = ? AND display_name = ?',
                [username.trim(), displayName.trim()]
            );

            if (rows.length === 0) {
                return res.json({ success: false, error: '用户名或显示名称不匹配，请确认后重试' });
            }

            // 重置密码
            const hashed = await hashPassword(newPassword);
            await pool.query('UPDATE students SET password = ? WHERE id = ?', [hashed, rows[0].id]);

            // 清除该用户的所有会话（强制重新登录）
            cleanupStudentSessions(username.trim());

            res.json({ success: true, message: '密码重置成功，请使用新密码登录' });
        } catch (err) {
            log.error('密码重置失败', { error: err.message });
            res.json({ success: false, error: '服务器错误，请稍后重试' });
        }
    });

    // ---------- 学生退出登录 ----------
    app.post('/api/logout', (req, res) => {
        const token = req.headers['x-session-token'] || (req.body && req.body._sessionToken);
        if (token) {
            sessions.delete(token);
            saveSessions(); // 持久化
            removeSessionFromDB(token);
        }
        res.json({ success: true, message: '已退出登录' });
    });
};

// ===== 注册审计日志辅助函数 =====
async function logRegistrationActivity(pool, username, displayName, grade, classNum,
    studentId, ip, userAgent, result, reason) {
    try {
        await pool.query(
            `INSERT INTO registration_logs 
             (username, display_name, grade, class_num, student_id, ip_address, user_agent, result, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username.trim(), (displayName || '').trim(), grade || '', classNum || 0,
             (studentId || '').trim(), ip, (userAgent || '').substring(0, 500),
             result, (reason || '').substring(0, 200)]
        );
    } catch (err) {
        // 日志记录失败不影响注册流程
        log.warn('注册日志记录失败', { error: err.message });
    }
}