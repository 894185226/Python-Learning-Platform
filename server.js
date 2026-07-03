// ===================================================
// Python 变量专题学习网站 - 后端服务器
// 技术栈：Node.js + Express + MySQL
// 启动方式：node server.js
// ===================================================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '1mb' })); // 限制请求体大小
app.use(express.static(__dirname));

// ===================================================
// 简易速率限制（防止暴力破解）
// ===================================================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分钟
const RATE_LIMIT_MAX = 20;           // 最多 20 次请求

function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (record && now - record.start < RATE_LIMIT_WINDOW) {
        if (record.count >= RATE_LIMIT_MAX) {
            return res.status(429).json({ success: false, error: '请求过于频繁，请稍后再试' });
        }
        record.count++;
    } else {
        rateLimitMap.set(ip, { start: now, count: 1 });
    }
    next();
}
// 对 /api 路径启用速率限制
app.use('/api', rateLimit);

// 定期清理过期记录
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap) {
        if (now - record.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(ip);
    }
}, 60000);

// ===================================================
// 管理员认证
// ===================================================
const adminSessions = new Map(); // token -> { username, displayName, expires }

function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token'] || '';
    const session = adminSessions.get(token);
    if (!session || session.expires < Date.now()) {
        if (session) adminSessions.delete(token);
        return res.status(401).json({ success: false, error: '未登录或登录已过期' });
    }
    req.adminUser = session;
    next();
}

// ===================================================
// 输入校验工具函数
// ===================================================
function validateInput(fields) {
    for (const [key, value] of Object.entries(fields)) {
        if (typeof value !== 'string') return `${key} 格式错误`;
        if (value.trim().length === 0) return `${key} 不能为空`;
        if (value.length > 100) return `${key} 长度不能超过100个字符`;
    }
    return null;
}

// ===================================================
// 数据库初始化（自动创建数据库和表，无需手动导入 database.sql）
// ===================================================
async function initializeDatabase() {
    // 第一步：用无数据库的连接，创建数据库
    const initPool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 1
    });

    try {
        console.log('[初始化] 正在检查/创建数据库...');
        await initPool.execute(
            'CREATE DATABASE IF NOT EXISTS python_var_lesson CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );
        console.log('[初始化] 数据库 python_var_lesson 就绪');
    } finally {
        await initPool.end();
    }

    // 第二步：用带数据库的连接池，创建所有表
    const dbPool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'python_var_lesson',
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 2
    });

    try {
        console.log('[初始化] 正在检查/创建数据表...');

        // 学生用户表
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS students (
                id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '学生唯一编号',
                username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '登录用户名',
                password    VARCHAR(64)  NOT NULL COMMENT '密码（SHA256 哈希）',
                display_name VARCHAR(50) NOT NULL COMMENT '真实姓名/显示名称',
                grade       VARCHAR(20)  DEFAULT '' COMMENT '年级',
                class_num   INT          DEFAULT 0 COMMENT '班级编号',
                status      VARCHAR(20)  DEFAULT 'active' COMMENT '状态: active/graduated',
                created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
                INDEX idx_username (username),
                INDEX idx_grade_class (grade, class_num)
            ) ENGINE=InnoDB COMMENT='学生用户信息表'
        `);

        // 学习模块进度表
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS learning_progress (
                id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
                student_id  INT          NOT NULL COMMENT '学生编号（外键）',
                module_id   VARCHAR(30)  NOT NULL COMMENT '模块标识',
                completed   TINYINT(1)   DEFAULT 1 COMMENT '是否完成',
                score       INT          DEFAULT 0 COMMENT '得分',
                completed_at DATETIME    DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE KEY uk_student_module (student_id, module_id)
            ) ENGINE=InnoDB COMMENT='学生学习进度表'
        `);

        // 成就记录表
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS achievements (
                id              INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
                student_id      INT          NOT NULL COMMENT '学生编号（外键）',
                achievement_id  VARCHAR(30)  NOT NULL COMMENT '成就标识',
                earned_at       DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE KEY uk_student_ach (student_id, achievement_id)
            ) ENGINE=InnoDB COMMENT='学生成就记录表'
        `);

        // 登录记录表
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS login_logs (
                id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
                student_id  INT      NOT NULL COMMENT '学生编号（外键）',
                login_time  DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
                ip_address  VARCHAR(45) DEFAULT '' COMMENT 'IP 地址',
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student_date (student_id, login_time)
            ) ENGINE=InnoDB COMMENT='学生登录日志表'
        `);

        // 管理员表
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS admins (
                id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '管理员编号',
                username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '登录用户名',
                password    VARCHAR(64)  NOT NULL COMMENT '密码（SHA256 哈希）',
                display_name VARCHAR(50) NOT NULL DEFAULT '管理员' COMMENT '显示名称',
                created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
            ) ENGINE=InnoDB COMMENT='管理员账号表'
        `);

        // 系统公告表
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS notices (
                id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '公告编号',
                title       VARCHAR(200) NOT NULL COMMENT '公告标题',
                content     TEXT         NOT NULL COMMENT '公告内容',
                created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
                updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
            ) ENGINE=InnoDB COMMENT='系统公告表'
        `);

        // 操作日志表
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                admin_name  VARCHAR(50)  NOT NULL COMMENT '管理员用户名',
                action      VARCHAR(50)  NOT NULL COMMENT '操作类型',
                detail      VARCHAR(500) DEFAULT '' COMMENT '操作详情',
                created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB COMMENT='管理员操作日志表'
        `);

        console.log('[初始化] 所有数据表就绪');

        // 兼容旧表结构：添加新字段（如果不存在）
        const newCols = [
            { name: 'grade', sql: "ALTER TABLE students ADD COLUMN grade VARCHAR(20) DEFAULT '' AFTER display_name" },
            { name: 'class_num', sql: "ALTER TABLE students ADD COLUMN class_num INT DEFAULT 0 AFTER grade" },
            { name: 'status', sql: "ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'active' AFTER class_num" }
        ];
        for (const col of newCols) {
            try { await dbPool.execute(col.sql); console.log(`[迁移] 已添加字段 ${col.name}`); }
            catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
        }
        // 迁移旧 class_name 数据到新字段
        try {
            await dbPool.execute("UPDATE students SET grade = '七年级' WHERE grade = '' AND class_name LIKE '初一%'");
            await dbPool.execute("UPDATE students SET grade = '八年级' WHERE grade = '' AND class_name LIKE '初二%'");
            await dbPool.execute("UPDATE students SET class_num = CAST(REPLACE(REPLACE(REPLACE(class_name, '初一(', ''), '初二(', ''), ')班', '') AS UNSIGNED) WHERE class_num = 0 AND class_name != '' AND class_name REGEXP '[0-9]+'");
        } catch (e) { /* 迁移失败不阻塞启动 */ }

        // 插入默认管理员账号
        const [adminExist] = await dbPool.execute(
            'SELECT COUNT(*) AS cnt FROM admins WHERE username = ?', ['admin']
        );
        if (adminExist[0].cnt === 0) {
            await dbPool.execute(
                'INSERT INTO admins (username, password, display_name) VALUES (?, SHA2(?, 256), ?)',
                ['admin', 'admin123', '教师管理员']
            );
            console.log('[初始化] 已创建默认管理员账号 (admin / admin123)');
        }

        // 插入测试账号（仅在新环境首次运行时）
        const [existing] = await dbPool.execute(
            'SELECT COUNT(*) AS cnt FROM students WHERE username IN (?, ?)',
            ['test001', 'test002']
        );
        if (existing[0].cnt === 0) {
            await dbPool.execute(
                `INSERT INTO students (username, password, display_name, grade, class_num) VALUES
                 ('test001', SHA2('1234', 256), '张三', '七年级', 3),
                 ('test002', SHA2('1234', 256), '李四', '七年级', 3)`
            );
            console.log('[初始化] 已插入测试账号 (test001 / test002, 密码: 1234)');
        }
    } finally {
        await dbPool.end();
    }
}

// ===================================================
// MySQL 连接池配置
// ===================================================
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'python_var_lesson',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10
});

// SHA256 密码加密（教学用途，生产环境建议 bcrypt）
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 记录管理员操作日志
async function logAdminAction(adminName, action, detail) {
    try {
        await pool.execute('INSERT INTO admin_logs (admin_name, action, detail) VALUES (?, ?, ?)',
            [adminName, action, detail || '']);
    } catch (e) { /* 日志记录失败不影响主流程 */ }
}

// ===================================================
// API 接口
// ===================================================

// ---------- 用户注册 ----------
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, displayName, grade, classNum } = req.body;

        // 服务端输入校验
        const errMsg = validateInput({ username, password, displayName });
        if (errMsg) return res.json({ success: false, error: errMsg });
        if (password.length < 4) {
            return res.json({ success: false, error: '密码至少4位' });
        }
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

        const hashed = hashPassword(password);
        await pool.execute(
            'INSERT INTO students (username, password, display_name, grade, class_num) VALUES (?, ?, ?, ?, ?)',
            [username.trim(), hashed, displayName.trim(), grade || '', cn]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.json({ success: false, error: '用户名已存在' });
        } else {
            console.error('注册错误:', err);
            res.json({ success: false, error: '服务器错误' });
        }
    }
});

// ---------- 用户登录 ----------
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 服务端输入校验
        const errMsg = validateInput({ username, password });
        if (errMsg) return res.json({ success: false, error: errMsg });

        const hashed = hashPassword(password);
        const [rows] = await pool.execute(
            'SELECT id, username, display_name, grade, class_num, status FROM students WHERE username = ? AND password = ?',
            [username.trim(), hashed]
        );

        if (rows.length === 0) {
            return res.json({ success: false, error: '用户名或密码错误' });
        }

        const student = rows[0];

        // 检查学生状态
        if (student.status === 'graduated') {
            return res.json({ success: false, error: '该账号已毕业，无法登录' });
        }

        // 记录登录日志
        const ip = req.ip || req.connection.remoteAddress || '';
        await pool.execute(
            'INSERT INTO login_logs (student_id, ip_address) VALUES (?, ?)',
            [student.id, ip]
        );

        res.json({
            success: true,
            user: {
                username: student.username,
                displayName: student.display_name,
                grade: student.grade || '',
                classNum: student.class_num || 0
            }
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 获取学习进度 ----------
app.get('/api/progress/:username', async (req, res) => {
    try {
        const { username } = req.params;

        // 查找学生
        const [students] = await pool.execute(
            'SELECT id FROM students WHERE username = ?', [username]
        );
        if (students.length === 0) {
            return res.json({ modules: {}, achievements: {}, loginDates: [] });
        }

        const studentId = students[0].id;

        // 获取模块进度
        const [modules] = await pool.execute(
            'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1',
            [studentId]
        );
        const moduleMap = {};
        modules.forEach(m => {
            moduleMap[m.module_id] = m.completed_at;
        });

        // 获取成就
        const [achievements] = await pool.execute(
            'SELECT achievement_id, earned_at FROM achievements WHERE student_id = ?',
            [studentId]
        );
        const achMap = {};
        achievements.forEach(a => {
            achMap[a.achievement_id] = a.earned_at;
        });

        // 获取登录日期
        const [logs] = await pool.execute(
            'SELECT DISTINCT DATE(login_time) AS login_date FROM login_logs WHERE student_id = ?',
            [studentId]
        );
        const loginDates = logs.map(l => {
            // MySQL 日期格式化
            const d = new Date(l.login_date);
            return d.toISOString().split('T')[0];
        });

        res.json({ modules: moduleMap, achievements: achMap, loginDates });
    } catch (err) {
        console.error('获取进度错误:', err);
        res.json({ modules: {}, achievements: {}, loginDates: [] });
    }
});

// ---------- 标记模块完成 ----------
app.post('/api/progress/mark', async (req, res) => {
    try {
        const { username, moduleId, score } = req.body;
        if (!username || !moduleId) {
            return res.json({ success: false, error: '参数不完整' });
        }
        // 模块ID白名单校验
        const validModules = ['intro', 'lab', 'lesson', 'judge', 'practice', 'trace', 'debug', 'extend', 'project', 'test'];
        if (!validModules.includes(moduleId)) {
            return res.json({ success: false, error: '无效的模块ID' });
        }
        if (username.length > 50 || moduleId.length > 30) {
            return res.json({ success: false, error: '参数过长' });
        }

        const [students] = await pool.execute(
            'SELECT id FROM students WHERE username = ?', [username]
        );
        if (students.length === 0) {
            return res.json({ success: false, error: '用户不存在' });
        }

        const studentId = students[0].id;
        const validScore = Math.min(100, Math.max(0, parseInt(score) || 0));

        await pool.execute(
            `INSERT INTO learning_progress (student_id, module_id, completed, score, completed_at)
             VALUES (?, ?, 1, ?, NOW())
             ON DUPLICATE KEY UPDATE completed = 1, score = VALUES(score), completed_at = NOW()`,
            [studentId, moduleId, validScore]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('标记模块错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 颁发成就 ----------
app.post('/api/achievement/award', async (req, res) => {
    try {
        const { username, achievementId } = req.body;
        if (!username || !achievementId) {
            return res.json({ success: false, error: '参数不完整' });
        }
        // 成就ID白名单校验
        const validAchievements = ['beginner', 'judge', 'debugger', 'creator', 'champion', 'tracer', 'explorer', 'coder'];
        if (!validAchievements.includes(achievementId)) {
            return res.json({ success: false, error: '无效的成就ID' });
        }
        if (username.length > 50 || achievementId.length > 30) {
            return res.json({ success: false, error: '参数过长' });
        }

        const [students] = await pool.execute(
            'SELECT id FROM students WHERE username = ?', [username]
        );
        if (students.length === 0) {
            return res.json({ success: false, error: '用户不存在' });
        }

        const studentId = students[0].id;

        await pool.execute(
            `INSERT IGNORE INTO achievements (student_id, achievement_id, earned_at)
             VALUES (?, ?, NOW())`,
            [studentId, achievementId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('成就错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 管理员 API
// ===================================================

// ---------- 管理员登录 ----------
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const errMsg = validateInput({ username, password });
        if (errMsg) return res.json({ success: false, error: errMsg });

        const hashed = hashPassword(password);
        const [rows] = await pool.execute(
            'SELECT id, username, display_name FROM admins WHERE username = ? AND password = ?',
            [username.trim(), hashed]
        );

        if (rows.length === 0) {
            return res.json({ success: false, error: '管理员账号或密码错误' });
        }

        const admin = rows[0];
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
        console.error('管理员登录错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 管理员登出 ----------
app.post('/api/admin/logout', adminAuth, (req, res) => {
    const token = req.headers['x-admin-token'];
    adminSessions.delete(token);
    res.json({ success: true });
});

// ===== 以下管理端接口需要认证 =====
app.use('/api/admin', adminAuth);

// ---------- 获取所有学生列表（含统计数据，支持分页）----------
app.get('/api/admin/students', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize) || 50));
        const offset = (page - 1) * pageSize;

        const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM students');

        const [rows] = await pool.execute(`
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
        console.error('获取学生列表错误:', err);
        res.json({ success: false, error: '服务器错误: ' + err.message });
    }
});

// ---------- 获取单个学生详细数据 ----------
app.get('/api/admin/student/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        if (isNaN(studentId)) return res.json({ success: false, error: '无效的学生ID' });

        // 学生基本信息
        const [students] = await pool.execute(
            'SELECT id, username, display_name, grade, class_num, status, created_at FROM students WHERE id = ?',
            [studentId]
        );
        if (students.length === 0) return res.json({ success: false, error: '学生不存在' });

        // 模块进度
        const [modules] = await pool.execute(
            'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1 ORDER BY completed_at',
            [studentId]
        );

        // 成就
        const [achievements] = await pool.execute(
            'SELECT achievement_id, earned_at FROM achievements WHERE student_id = ? ORDER BY earned_at',
            [studentId]
        );

        // 登录日志
        const [logs] = await pool.execute(
            'SELECT login_time, ip_address FROM login_logs WHERE student_id = ? ORDER BY login_time DESC LIMIT 50',
            [studentId]
        );

        res.json({
            success: true,
            student: students[0],
            modules,
            achievements,
            loginLogs: logs
        });
    } catch (err) {
        console.error('获取学生详情错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 获取全局统计数据 ----------
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [[{ totalStudents }]] = await pool.execute('SELECT COUNT(*) AS totalStudents FROM students');
        const [[{ totalCompleted }]] = await pool.execute('SELECT COUNT(*) AS totalCompleted FROM learning_progress WHERE completed = 1');
        const [[{ totalAchievements }]] = await pool.execute('SELECT COUNT(*) AS totalAchievements FROM achievements');
        const [[{ totalLogins }]] = await pool.execute('SELECT COUNT(*) AS totalLogins FROM login_logs');

        // 各模块完成人数
        const [moduleStats] = await pool.execute(`
            SELECT module_id, COUNT(*) AS count 
            FROM learning_progress WHERE completed = 1 
            GROUP BY module_id ORDER BY count DESC
        `);

        // 最近登录
        const [recentLogins] = await pool.execute(`
            SELECT s.display_name, s.username, ll.login_time
            FROM login_logs ll
            JOIN students s ON ll.student_id = s.id
            ORDER BY ll.login_time DESC LIMIT 10
        `);

        res.json({
            success: true,
            stats: {
                totalStudents,
                totalCompleted,
                totalAchievements,
                totalLogins,
                moduleStats,
                recentLogins
            }
        });
    } catch (err) {
        console.error('获取统计数据错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 删除学生 ----------
app.delete('/api/admin/student/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        if (isNaN(studentId)) return res.json({ success: false, error: '无效的学生ID' });

        await pool.execute('DELETE FROM students WHERE id = ?', [studentId]);
        await logAdminAction(req.adminUser.username, '删除学生', `学生ID: ${studentId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('删除学生错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 批量导入学生 ----------
app.post('/api/admin/students/import', async (req, res) => {
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
                const password = (s.password || '123456').trim();
                const grade = (s.grade || '').trim();
                const classNum = parseInt(s.classNum) || 0;

                if (!username || !displayName || password.length < 4) {
                    results.failed++;
                    results.errors.push(`${displayName || username}: 信息不完整`);
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
                    const hashed = hashPassword(password);
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
        console.error('批量导入错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 批量修改学生信息（转班/毕业/改密）----------
app.put('/api/admin/students/batch', async (req, res) => {
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
                    const newPassword = (value || '123456').trim();
                    if (newPassword.length < 4) {
                        await conn.rollback();
                        return res.json({ success: false, error: '密码至少4位' });
                    }
                    const hashed = hashPassword(newPassword);
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
        console.error('批量操作错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 系统公告 ----------
// 获取公告列表（学生端）
app.get('/api/notices', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, title, content, created_at FROM notices ORDER BY created_at DESC LIMIT 10');
        res.json({ success: true, notices: rows });
    } catch (err) {
        console.error('获取公告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 管理端获取公告
app.get('/api/admin/notices', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, title, content, created_at, updated_at FROM notices ORDER BY created_at DESC');
        res.json({ success: true, notices: rows });
    } catch (err) {
        console.error('获取公告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 管理端发布公告
app.post('/api/admin/notices', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !title.trim()) return res.json({ success: false, error: '标题不能为空' });
        if (!content || !content.trim()) return res.json({ success: false, error: '内容不能为空' });
        await pool.execute('INSERT INTO notices (title, content) VALUES (?, ?)', [title.trim(), content.trim()]);
        await logAdminAction(req.adminUser.username, '发布公告', title.trim());
        res.json({ success: true });
    } catch (err) {
        console.error('发布公告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 管理端编辑公告
app.put('/api/admin/notices/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.json({ success: false, error: '无效的公告ID' });
        const { title, content } = req.body;
        if (!title || !title.trim()) return res.json({ success: false, error: '标题不能为空' });
        if (!content || !content.trim()) return res.json({ success: false, error: '内容不能为空' });
        await pool.execute('UPDATE notices SET title = ?, content = ? WHERE id = ?', [title.trim(), content.trim(), id]);
        await logAdminAction(req.adminUser.username, '编辑公告', title.trim());
        res.json({ success: true });
    } catch (err) {
        console.error('编辑公告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 管理端删除公告
app.delete('/api/admin/notices/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.json({ success: false, error: '无效的公告ID' });
        await pool.execute('DELETE FROM notices WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('删除公告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 修改管理员密码 ----------
app.put('/api/admin/password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.json({ success: false, error: '密码不能为空' });
        if (newPassword.length < 4) return res.json({ success: false, error: '新密码至少4位' });

        const adminName = req.adminUser.username;
        const oldHashed = hashPassword(oldPassword);
        const [rows] = await pool.execute('SELECT id FROM admins WHERE username = ? AND password = ?', [adminName, oldHashed]);
        if (rows.length === 0) return res.json({ success: false, error: '当前密码错误' });

        const newHashed = hashPassword(newPassword);
        await pool.execute('UPDATE admins SET password = ? WHERE username = ?', [newHashed, adminName]);
        await logAdminAction(adminName, '修改密码', '管理员密码已修改');
        res.json({ success: true });
    } catch (err) {
        console.error('修改密码错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 操作日志 ----------
app.get('/api/admin/logs', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT admin_name, action, detail, created_at FROM admin_logs ORDER BY created_at DESC LIMIT 100');
        res.json({ success: true, logs: rows });
    } catch (err) {
        console.error('获取日志错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 数据备份 ----------
app.get('/api/admin/backup', async (req, res) => {
    try {
        const [students] = await pool.execute('SELECT * FROM students');
        const [progress] = await pool.execute('SELECT * FROM learning_progress');
        const [achievements] = await pool.execute('SELECT * FROM achievements');
        const [loginLogs] = await pool.execute('SELECT * FROM login_logs ORDER BY id DESC LIMIT 10000');
        const [notices] = await pool.execute('SELECT * FROM notices');
        const backup = { students, progress, achievements, loginLogs, notices, exportedAt: new Date().toISOString() };
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('数据备份_' + new Date().toISOString().split('T')[0] + '.json'));
        res.json(backup);
        await logAdminAction(req.adminUser.username, '数据备份', '导出完整数据库备份');
    } catch (err) {
        console.error('备份错误:', err);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ---------- 数据恢复 ----------
app.post('/api/admin/restore', async (req, res) => {
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
        console.error('恢复错误:', err);
        res.json({ success: false, error: '服务器错误: ' + err.message });
    }
});

// ---------- 按班级统计 ----------
app.get('/api/admin/stats/class', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
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
        console.error('班级统计错误:', err);
        res.json({ success: false, error: '服务器错误: ' + err.message });
    }
});

// ---------- 班级统计导出 CSV ----------
app.get('/api/admin/stats/class/export', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
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
        console.error('班级统计导出错误:', err);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ---------- 工具函数 ----------
function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    const pad = n => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

// ---------- 数据导出（CSV）----------
app.get('/api/admin/export', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
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
        console.error('导出错误:', err);
        res.status(500).json({ success: false, error: '服务器错误: ' + err.message });
    }
});

// ===================================================
// 全局错误处理
// ===================================================
app.use((err, req, res, next) => {
    console.error('未捕获的服务器错误:', err.message);
    if (err.type === 'entity.too.large') {
        return res.json({ success: false, error: '请求体过大' });
    }
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

// ===================================================
// 启动服务器（先初始化数据库，再启动）
// ===================================================
(async function startServer() {
    try {
        console.log('[启动] 正在连接 MySQL 并初始化数据库...');
        await initializeDatabase();
        console.log('[启动] 数据库初始化完成');
    } catch (err) {
        console.error('===========================================');
        console.error('[错误] 数据库初始化失败！');
        console.error('[原因] ' + err.message);
        console.error('');
        console.error('请检查：');
        console.error('  1. MySQL 服务是否已启动？');
        console.error('  2. MySQL root 密码是否为空？(当前配置为空密码)');
        console.error('  3. 如果 root 有密码，请修改 server.js 中的 password 配置');
        console.error('');
        console.error('详细错误：');
        console.error(err);
        console.error('===========================================');
        process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        const localIPs = [];
        for (const iface of Object.values(networkInterfaces)) {
            for (const info of iface) {
                if (info.family === 'IPv4' && !info.internal) {
                    localIPs.push(info.address);
                }
            }
        }
        console.log('===========================================');
        console.log(`  Python 变量学习平台已启动`);
        console.log(`  本机访问：http://localhost:${PORT}`);
        if (localIPs.length > 0) {
            console.log(`  局域网访问：http://${localIPs[0]}:${PORT}`);
        }
        console.log(`  管理后台：http://localhost:${PORT}/admin.html`);
        console.log(`  管理员账号：admin / admin123`);
        console.log(`  数据库：MySQL -> python_var_lesson`);
        console.log(`  关闭：Ctrl + C`);
        console.log('===========================================');
    });
})();