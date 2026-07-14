// ===================================================
// Python 基础学习平台 - 后端服务器
// 技术栈：Node.js + Express + MySQL
// 启动方式：node server.js
// ===================================================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
let dbReady = false;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname, {
    maxAge: '1h',           // 静态文件缓存1小时，减少局域网带宽消耗
    setHeaders: (res, filePath) => {
        // HTML/CSS/JS 文件不缓存，确保总是获取最新版本
        if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// ===================================================
// 简易速率限制（防止暴力破解）
// ===================================================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分钟
const RATE_LIMIT_MAX = 60;           // 教室局域网正常使用

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
                password    VARCHAR(60)  NOT NULL COMMENT '密码（bcrypt 哈希）',
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
                password    VARCHAR(60)  NOT NULL COMMENT '密码（bcrypt 哈希）',
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

        // 错题本
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS mistake_book (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                chapter_id VARCHAR(10) NOT NULL COMMENT '章节ID，如ch1',
                question_text TEXT NOT NULL COMMENT '题目内容',
                correct_answer VARCHAR(500) NOT NULL COMMENT '正确答案',
                student_answer VARCHAR(500) NOT NULL COMMENT '学生答案',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student_chapter (student_id, chapter_id)
            ) ENGINE=InnoDB COMMENT='错题本'
        `);

        // 学习笔记
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS study_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                chapter_id VARCHAR(10) NOT NULL,
                module_id VARCHAR(30) DEFAULT '',
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student_chapter (student_id, chapter_id)
            ) ENGINE=InnoDB COMMENT='学习笔记'
        `);

        // 代码收藏
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS code_snippets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                code TEXT NOT NULL,
                chapter_id VARCHAR(10) DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            ) ENGINE=InnoDB COMMENT='代码收藏'
        `);

        // 作业
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                chapter_id VARCHAR(10) DEFAULT '',
                due_date DATE,
                created_by VARCHAR(50) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_due (due_date)
            ) ENGINE=InnoDB COMMENT='作业'
        `);

        // 作业提交
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS assignment_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assignment_id INT NOT NULL,
                student_id INT NOT NULL,
                content TEXT,
                score INT DEFAULT 0,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE KEY uk_assignment_student (assignment_id, student_id)
            ) ENGINE=InnoDB COMMENT='作业提交'
        `);

        // 每日一题
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS daily_questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question TEXT NOT NULL,
                options JSON COMMENT '选项列表JSON',
                answer VARCHAR(10) NOT NULL COMMENT '正确答案',
                explanation TEXT COMMENT '解析',
                question_date DATE NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB COMMENT='每日一题'
        `);

        // 学习目标
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS student_goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                goal_text VARCHAR(500) NOT NULL,
                target_chapters INT DEFAULT 0,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                completed TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student (student_id)
            ) ENGINE=InnoDB COMMENT='学习目标'
        `);

        // 通知
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                content TEXT,
                type VARCHAR(30) DEFAULT 'system' COMMENT 'system/achievement/assignment',
                is_read TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student_read (student_id, is_read)
            ) ENGINE=InnoDB COMMENT='通知'
        `);

        // 讨论帖
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS discussion_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                chapter_id VARCHAR(10) DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_chapter (chapter_id)
            ) ENGINE=InnoDB COMMENT='讨论帖'
        `);

        // 讨论回复
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS discussion_replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                student_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES discussion_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            ) ENGINE=InnoDB COMMENT='讨论回复'
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

        // 给 admins 表添加 role 字段（兼容迁移）
        try {
            await dbPool.execute("ALTER TABLE admins ADD COLUMN role VARCHAR(20) DEFAULT 'admin' AFTER display_name");
            console.log('[迁移] 已添加字段 role');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

        // 插入默认管理员账号
        const [adminExist] = await dbPool.execute(
            'SELECT COUNT(*) AS cnt FROM admins WHERE username = ?', ['admin']
        );
        if (adminExist[0].cnt === 0) {
            const adminHash = await bcrypt.hash('admin123', 10);
            await dbPool.execute(
                'INSERT INTO admins (username, password, display_name) VALUES (?, ?, ?)',
                ['admin', adminHash, '教师管理员']
            );
            console.log('[初始化] 已创建默认管理员账号 (admin / admin123)');
        }

        // 插入测试账号（仅在新环境首次运行时）
        const [existing] = await dbPool.execute(
            'SELECT COUNT(*) AS cnt FROM students WHERE username IN (?, ?)',
            ['test001', 'test002']
        );
        if (existing[0].cnt === 0) {
            const testHash = await bcrypt.hash('1234', 10);
            await dbPool.execute(
                `INSERT INTO students (username, password, display_name, grade, class_num) VALUES
                 ('test001', ?, '张三', '七年级', 3),
                 ('test002', ?, '李四', '七年级', 3)`,
                [testHash, testHash]
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
    connectionLimit: 20,       // 教室局域网多用户并发
});

async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
    if (!hash) return false;
    if (hash.length === 60 && hash.startsWith('$2')) {
        try {
            return await bcrypt.compare(password, hash);
        } catch {
            return false;
        }
    } else {
        return crypto.createHash('sha256').update(password).digest('hex') === hash;
    }
}

// 记录管理员操作日志
async function logAdminAction(adminName, action, detail) {
    try {
        await pool.query('INSERT INTO admin_logs (admin_name, action, detail) VALUES (?, ?, ?)',
            [adminName, action, detail || '']);
    } catch (e) { /* 日志记录失败不影响主流程 */ }
}

// ===================================================
// API 接口
// ===================================================

// ---------- 数据库状态检查 ----------
app.get('/api/status', (req, res) => {
    res.json({ success: true, dbReady });
});

// ---------- 离线模式中间件 ----------
function requireDB(req, res, next) {
    if (!dbReady) {
        return res.json({ success: false, error: '数据库未连接，请启动MySQL服务后刷新页面' });
    }
    next();
}

// ---------- 用户注册 ----------
app.post('/api/register', requireDB, async (req, res) => {
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

        const hashed = await hashPassword(password);
        await pool.query(
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
app.post('/api/login', requireDB, async (req, res) => {
    try {
        const { username, password } = req.body;

        // 服务端输入校验
        const errMsg = validateInput({ username, password });
        if (errMsg) return res.json({ success: false, error: errMsg });

        const [rows] = await pool.query(
            'SELECT id, username, display_name, grade, class_num, status, password FROM students WHERE username = ?',
            [username.trim()]
        );

        if (rows.length === 0) {
            return res.json({ success: false, error: '用户名或密码错误' });
        }

        const student = rows[0];
        const isValid = await verifyPassword(password, student.password);
        if (!isValid) {
            return res.json({ success: false, error: '用户名或密码错误' });
        }

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

// ---------- 学生退出登录 ----------
app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: '已退出登录' });
});

// ---------- 获取学习进度 ----------
app.get('/api/progress/:username', requireDB, async (req, res) => {
    try {
        const { username } = req.params;

        // 查找学生
        const [students] = await pool.query(
            'SELECT id FROM students WHERE username = ?', [username]
        );
        if (students.length === 0) {
            return res.json({ modules: {}, achievements: {}, loginDates: [], chapters: {} });
        }

        const studentId = students[0].id;

        // 获取模块进度
        const [modules] = await pool.query(
            'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1',
            [studentId]
        );
        const moduleMap = {};
        modules.forEach(m => {
            moduleMap[m.module_id] = m.completed_at;
        });

        // 提取章节进度（module_id 以 chapter_ 开头）
        const chapterMap = {};
        modules.forEach(m => {
            if (m.module_id.startsWith('chapter_')) {
                const chapterId = m.module_id.replace('chapter_', '');
                chapterMap[chapterId] = m.completed_at;
            }
        });

        // 获取成就
        const [achievements] = await pool.query(
            'SELECT achievement_id, earned_at FROM achievements WHERE student_id = ?',
            [studentId]
        );
        const achMap = {};
        achievements.forEach(a => {
            achMap[a.achievement_id] = a.earned_at;
        });

        // 获取登录日期
        const [logs] = await pool.query(
            'SELECT DISTINCT DATE(login_time) AS login_date FROM login_logs WHERE student_id = ?',
            [studentId]
        );
        const loginDates = logs.map(l => {
            // MySQL 日期格式化
            const d = new Date(l.login_date);
            return d.toISOString().split('T')[0];
        });

        res.json({ modules: moduleMap, achievements: achMap, loginDates, chapters: chapterMap });
    } catch (err) {
        console.error('获取进度错误:', err);
        res.json({ modules: {}, achievements: {}, loginDates: [], chapters: {} });
    }
});

// ---------- 标记模块完成 ----------
app.post('/api/progress/mark', requireDB, async (req, res) => {
    try {
        const { username, moduleId, score } = req.body;
        if (!username || !moduleId) {
            return res.json({ success: false, error: '参数不完整' });
        }
        // 模块ID白名单校验（支持章节模块 + 章节完成标记 + 旧模块）
        const validModules = [
            'intro','lab','lesson','judge','practice','trace','debug','extend','project','test',
            'chapter_ch1','chapter_ch2','chapter_ch3','chapter_ch4','chapter_ch5','chapter_ch6','chapter_ch7','chapter_ch8','chapter_ch9','chapter_ch10',
            'chapter_ch11','chapter_ch12','chapter_ch13','chapter_ch14','chapter_ch15','chapter_ch16','chapter_ch17','chapter_ch18','chapter_ch19',
            'ch1_intro','ch1_knowledge','ch1_lab','ch1_practice','ch1_debug','ch1_quiz',
            'ch3_intro','ch3_knowledge','ch3_lab','ch3_practice','ch3_debug','ch3_extend','ch3_project','ch3_quiz',
            'ch4_intro','ch4_knowledge','ch4_lab','ch4_practice','ch4_debug','ch4_extend','ch4_project','ch4_quiz',
            'ch5_intro','ch5_knowledge','ch5_lab','ch5_practice','ch5_debug','ch5_extend','ch5_project','ch5_quiz',
            'ch6_intro','ch6_knowledge','ch6_lab','ch6_practice','ch6_debug','ch6_extend','ch6_project','ch6_quiz',
            'ch7_intro','ch7_knowledge','ch7_lab','ch7_practice','ch7_debug','ch7_extend','ch7_project','ch7_quiz',
            'ch8_intro','ch8_knowledge','ch8_lab','ch8_practice','ch8_debug','ch8_extend','ch8_project','ch8_quiz',
            'ch9_intro','ch9_knowledge','ch9_lab','ch9_practice','ch9_debug','ch9_extend','ch9_project','ch9_quiz',
            'ch10_intro','ch10_knowledge','ch10_lab','ch10_practice','ch10_debug','ch10_extend','ch10_project','ch10_quiz',
            'ch11_intro','ch11_knowledge','ch11_lab','ch11_practice','ch11_debug','ch11_extend','ch11_project','ch11_quiz',
            'ch12_intro','ch12_knowledge','ch12_lab','ch12_practice','ch12_debug','ch12_extend','ch12_project','ch12_quiz',
            'ch13_intro','ch13_knowledge','ch13_lab','ch13_practice','ch13_debug','ch13_extend','ch13_project','ch13_quiz',
            'ch14_intro','ch14_knowledge','ch14_lab','ch14_practice','ch14_debug','ch14_extend','ch14_project','ch14_quiz',
            'ch15_intro','ch15_knowledge','ch15_lab','ch15_practice','ch15_debug','ch15_extend','ch15_project','ch15_quiz',
            'ch16_intro','ch16_knowledge','ch16_lab','ch16_practice','ch16_debug','ch16_extend','ch16_project','ch16_quiz',
            'ch17_intro','ch17_knowledge','ch17_lab','ch17_practice','ch17_debug','ch17_extend','ch17_project','ch17_quiz',
            'ch18_intro','ch18_knowledge','ch18_lab','ch18_practice','ch18_debug','ch18_extend','ch18_project','ch18_quiz',
            'ch19_intro','ch19_knowledge','ch19_lab','ch19_practice','ch19_debug','ch19_extend','ch19_project','ch19_quiz'
        ];
        if (!validModules.includes(moduleId)) {
            return res.json({ success: false, error: '无效的模块ID' });
        }
        if (username.length > 50 || moduleId.length > 30) {
            return res.json({ success: false, error: '参数过长' });
        }

        const [students] = await pool.query(
            'SELECT id FROM students WHERE username = ?', [username]
        );
        if (students.length === 0) {
            return res.json({ success: false, error: '用户不存在' });
        }

        const studentId = students[0].id;
        const validScore = Math.min(100, Math.max(0, parseInt(score) || 0));

        await pool.query(
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
app.post('/api/achievement/award', requireDB, async (req, res) => {
    try {
        const { username, achievementId } = req.body;
        if (!username || !achievementId) {
            return res.json({ success: false, error: '参数不完整' });
        }
        // 成就ID白名单校验（19章 + 5里程碑 + 旧成就）
        const validAchievements = [
            'ch1_done','ch2_done','ch3_done','ch4_done','ch5_done','ch6_done','ch7_done','ch8_done','ch9_done',
            'ch10_done','ch11_done','ch12_done','ch13_done','ch14_done','ch15_done','ch16_done','ch17_done','ch18_done','ch19_done',
            'milestone_beginner','milestone_flow','milestone_data','milestone_advance','champion',
            'beginner','judge','debugger','creator','tracer','explorer','coder'
        ];
        if (!validAchievements.includes(achievementId)) {
            return res.json({ success: false, error: '无效的成就ID' });
        }
        if (username.length > 50 || achievementId.length > 30) {
            return res.json({ success: false, error: '参数过长' });
        }

        const [students] = await pool.query(
            'SELECT id FROM students WHERE username = ?', [username]
        );
        if (students.length === 0) {
            return res.json({ success: false, error: '用户不存在' });
        }

        const studentId = students[0].id;

        await pool.query(
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
        console.error('获取学生列表错误:', err);
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
        console.error('获取学生详情错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 获取全局统计数据 ----------
app.get('/api/admin/stats', adminAuth, requireDB, async (req, res) => {
    try {
        const [[{ totalStudents }]] = await pool.query('SELECT COUNT(*) AS totalStudents FROM students');
        const [[{ totalCompleted }]] = await pool.query('SELECT COUNT(*) AS totalCompleted FROM learning_progress WHERE completed = 1');
        const [[{ totalAchievements }]] = await pool.query('SELECT COUNT(*) AS totalAchievements FROM achievements');
        const [[{ totalLogins }]] = await pool.query('SELECT COUNT(*) AS totalLogins FROM login_logs');

        // 各模块完成人数
        const [moduleStats] = await pool.query(`
            SELECT module_id, COUNT(*) AS count 
            FROM learning_progress WHERE completed = 1 
            GROUP BY module_id ORDER BY count DESC
        `);

        // 最近登录
        const [recentLogins] = await pool.query(`
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
app.delete('/api/admin/student/:id', adminAuth, requireDB, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        if (isNaN(studentId)) return res.json({ success: false, error: '无效的学生ID' });

        await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
        await logAdminAction(req.adminUser.username, '删除学生', `学生ID: ${studentId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('删除学生错误:', err);
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
        console.error('批量导入错误:', err);
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
                    const newPassword = (value || '123456').trim();
                    if (newPassword.length < 4) {
                        await conn.rollback();
                        return res.json({ success: false, error: '密码至少4位' });
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
        console.error('批量操作错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 系统公告 ----------
// 获取公告列表（学生端）
app.get('/api/notices', requireDB, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, title, content, created_at FROM notices ORDER BY created_at DESC LIMIT 10');
        res.json({ success: true, notices: rows });
    } catch (err) {
        console.error('获取公告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 管理端获取公告
app.get('/api/admin/notices', adminAuth, requireDB, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, title, content, created_at, updated_at FROM notices ORDER BY created_at DESC');
        res.json({ success: true, notices: rows });
    } catch (err) {
        console.error('获取公告错误:', err);
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
        res.json({ success: true });
    } catch (err) {
        console.error('发布公告错误:', err);
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
        console.error('编辑公告错误:', err);
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
        console.error('删除公告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 修改管理员密码 ----------
app.put('/api/admin/password', adminAuth, requireDB, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.json({ success: false, error: '密码不能为空' });
        if (newPassword.length < 4) return res.json({ success: false, error: '新密码至少4位' });

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
        console.error('修改密码错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 操作日志 ----------
app.get('/api/admin/logs', adminAuth, requireDB, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT admin_name, action, detail, created_at FROM admin_logs ORDER BY created_at DESC LIMIT 100');
        res.json({ success: true, logs: rows });
    } catch (err) {
        console.error('获取日志错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ---------- 数据备份 ----------
app.get('/api/admin/backup', adminAuth, requireDB, async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students');
        const [progress] = await pool.query('SELECT * FROM learning_progress');
        const [achievements] = await pool.query('SELECT * FROM achievements');
        const [loginLogs] = await pool.query('SELECT * FROM login_logs ORDER BY id DESC LIMIT 10000');
        const [notices] = await pool.query('SELECT * FROM notices');
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
        console.error('恢复错误:', err);
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
        console.error('班级统计错误:', err);
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
        console.error('导出错误:', err);
        res.status(500).json({ success: false, error: '导出失败' });
    }
});

// ===================================================
// 学生端 API - 错题本
// ===================================================

// 记录错题
app.post('/api/mistakes', requireDB, async (req, res) => {
    try {
        const { username, chapterId, questionText, correctAnswer, studentAnswer } = req.body;
        if (!username || !chapterId || !questionText || !correctAnswer || !studentAnswer) {
            return res.json({ success: false, error: '参数不完整' });
        }

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        await pool.query(
            'INSERT INTO mistake_book (student_id, chapter_id, question_text, correct_answer, student_answer) VALUES (?, ?, ?, ?, ?)',
            [students[0].id, chapterId, questionText, correctAnswer, studentAnswer]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('记录错题错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 获取错题列表
app.get('/api/mistakes/:username', requireDB, async (req, res) => {
    try {
        const { username } = req.params;
        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [rows] = await pool.query(
            'SELECT id, chapter_id, question_text, correct_answer, student_answer, created_at FROM mistake_book WHERE student_id = ? ORDER BY created_at DESC',
            [students[0].id]
        );
        res.json({ success: true, mistakes: rows });
    } catch (err) {
        console.error('获取错题错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 删除单条错题
app.delete('/api/mistakes/:id', requireDB, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

        const { username } = req.body;
        if (!username) return res.json({ success: false, error: '缺少用户名' });

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [mistake] = await pool.query('SELECT id FROM mistake_book WHERE id = ? AND student_id = ?', [id, students[0].id]);
        if (mistake.length === 0) return res.json({ success: false, error: '错题不存在或无权操作' });

        await pool.query('DELETE FROM mistake_book WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('删除错题错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 学习笔记
// ===================================================

// 保存笔记
app.post('/api/notes', requireDB, async (req, res) => {
    try {
        const { username, chapterId, moduleId, content } = req.body;
        if (!username || !chapterId || !content) {
            return res.json({ success: false, error: '参数不完整' });
        }

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        await pool.query(
            'INSERT INTO study_notes (student_id, chapter_id, module_id, content) VALUES (?, ?, ?, ?)',
            [students[0].id, chapterId, moduleId || '', content]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('保存笔记错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 获取某章节笔记
app.get('/api/notes/:username/:chapterId', requireDB, async (req, res) => {
    try {
        const { username, chapterId } = req.params;
        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [rows] = await pool.query(
            'SELECT id, module_id, content, created_at, updated_at FROM study_notes WHERE student_id = ? AND chapter_id = ? ORDER BY updated_at DESC',
            [students[0].id, chapterId]
        );
        res.json({ success: true, notes: rows });
    } catch (err) {
        console.error('获取笔记错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 更新笔记
app.put('/api/notes/:id', requireDB, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

        const { content } = req.body;
        if (!content) return res.json({ success: false, error: '内容不能为空' });

        await pool.query('UPDATE study_notes SET content = ? WHERE id = ?', [content, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('更新笔记错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 代码收藏
// ===================================================

// 收藏代码
app.post('/api/snippets', requireDB, async (req, res) => {
    try {
        const { username, title, code, chapterId } = req.body;
        if (!username || !title || !code) {
            return res.json({ success: false, error: '参数不完整' });
        }

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        await pool.query(
            'INSERT INTO code_snippets (student_id, title, code, chapter_id) VALUES (?, ?, ?, ?)',
            [students[0].id, title, code, chapterId || '']
        );
        res.json({ success: true });
    } catch (err) {
        console.error('收藏代码错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 获取收藏列表
app.get('/api/snippets/:username', requireDB, async (req, res) => {
    try {
        const { username } = req.params;
        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [rows] = await pool.query(
            'SELECT id, title, code, chapter_id, created_at FROM code_snippets WHERE student_id = ? ORDER BY created_at DESC',
            [students[0].id]
        );
        res.json({ success: true, snippets: rows });
    } catch (err) {
        console.error('获取收藏错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 删除收藏
app.delete('/api/snippets/:id', requireDB, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

        const { username } = req.body;
        if (!username) return res.json({ success: false, error: '缺少用户名' });

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [snippet] = await pool.query('SELECT id FROM code_snippets WHERE id = ? AND student_id = ?', [id, students[0].id]);
        if (snippet.length === 0) return res.json({ success: false, error: '收藏不存在或无权操作' });

        await pool.query('DELETE FROM code_snippets WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('删除收藏错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 排行榜
// ===================================================

app.get('/api/leaderboard', requireDB, async (req, res) => {
    try {
        const { grade, classNum } = req.query;
        let sql = `
            SELECT 
                s.username, s.display_name, s.grade, s.class_num,
                COALESCE(chapter_counts.cnt, 0) AS chapter_count,
                COALESCE(ach_counts.cnt, 0) AS achievement_count,
                (COALESCE(chapter_counts.cnt, 0) * 10 + COALESCE(ach_counts.cnt, 0)) AS score
            FROM students s
            LEFT JOIN (
                SELECT student_id, COUNT(*) AS cnt
                FROM learning_progress
                WHERE completed = 1 AND module_id LIKE 'chapter_%'
                GROUP BY student_id
            ) chapter_counts ON s.id = chapter_counts.student_id
            LEFT JOIN (
                SELECT student_id, COUNT(*) AS cnt
                FROM achievements
                GROUP BY student_id
            ) ach_counts ON s.id = ach_counts.student_id
            WHERE s.status = 'active'
        `;
        const params = [];

        if (grade) {
            sql += ' AND s.grade = ?';
            params.push(grade);
        }
        if (classNum) {
            sql += ' AND s.class_num = ?';
            params.push(parseInt(classNum));
        }

        sql += ' ORDER BY score DESC, s.display_name ASC LIMIT 50';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, leaderboard: rows });
    } catch (err) {
        console.error('排行榜错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 学习报告
// ===================================================

app.get('/api/report/:username', requireDB, async (req, res) => {
    try {
        const { username } = req.params;
        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const studentId = students[0].id;

        // 总章节完成数
        const [[{ chapterCount }]] = await pool.query(
            "SELECT COUNT(*) AS chapterCount FROM learning_progress WHERE student_id = ? AND completed = 1 AND module_id LIKE 'chapter_%'",
            [studentId]
        );

        // 总成就数
        const [[{ achievementCount }]] = await pool.query(
            'SELECT COUNT(*) AS achievementCount FROM achievements WHERE student_id = ?',
            [studentId]
        );

        // 连续学习天数
        const [loginDates] = await pool.query(
            'SELECT DISTINCT DATE(login_time) AS login_date FROM login_logs WHERE student_id = ? ORDER BY login_date DESC',
            [studentId]
        );
        let streakDays = 0;
        if (loginDates.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const lastLoginDate = new Date(loginDates[0].login_date);
            lastLoginDate.setHours(0, 0, 0, 0);

            if (lastLoginDate.getTime() >= yesterday.getTime()) {
                streakDays = 1;
                let current = new Date(lastLoginDate);
                for (let i = 1; i < loginDates.length; i++) {
                    const prev = new Date(loginDates[i].login_date);
                    const expected = new Date(current);
                    expected.setDate(expected.getDate() - 1);
                    if (prev.getTime() === expected.getTime()) {
                        streakDays++;
                        current = prev;
                    } else {
                        break;
                    }
                }
            }
        }

        // 各章完成情况
        const [chapterDetails] = await pool.query(
            "SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1 AND module_id LIKE 'chapter_%' ORDER BY module_id",
            [studentId]
        );

        // 所有模块完成详情
        const [allModules] = await pool.query(
            'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1 ORDER BY module_id',
            [studentId]
        );

        // 强项弱项分析：按章节统计得分
        const chapterScoreMap = {};
        for (const m of allModules) {
            // 提取章节ID（如 ch1_intro -> ch1, chapter_ch1 -> ch1）
            let chId = '';
            if (m.module_id.startsWith('chapter_')) {
                chId = m.module_id.replace('chapter_', '');
            } else if (m.module_id.startsWith('ch') && m.module_id.includes('_')) {
                chId = m.module_id.split('_')[0];
            }
            if (chId) {
                if (!chapterScoreMap[chId]) chapterScoreMap[chId] = { total: 0, count: 0 };
                chapterScoreMap[chId].total += m.score || 0;
                chapterScoreMap[chId].count++;
            }
        }

        const strengths = [];
        const weaknesses = [];
        for (const [ch, data] of Object.entries(chapterScoreMap)) {
            const avg = data.count > 0 ? data.total / data.count : 0;
            if (avg >= 80) strengths.push(ch);
            else if (avg < 60 && data.count > 0) weaknesses.push(ch);
        }

        // 总学习天数
        const [[{ totalDays }]] = await pool.query(
            'SELECT COUNT(DISTINCT DATE(login_time)) AS totalDays FROM login_logs WHERE student_id = ?',
            [studentId]
        );

        res.json({
            success: true,
            report: {
                totalChapters: Number(chapterCount),
                totalAchievements: Number(achievementCount),
                streakDays,
                totalDays: Number(totalDays),
                chapterDetails: chapterDetails.map(m => ({
                    moduleId: m.module_id,
                    score: m.score,
                    completedAt: m.completed_at
                })),
                strengths,
                weaknesses
            }
        });
    } catch (err) {
        console.error('学习报告错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 通知
// ===================================================

// 获取通知列表
app.get('/api/notifications/:username', requireDB, async (req, res) => {
    try {
        const { username } = req.params;
        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [rows] = await pool.query(
            'SELECT id, title, content, type, is_read, created_at FROM notifications WHERE student_id = ? ORDER BY created_at DESC LIMIT 50',
            [students[0].id]
        );
        res.json({ success: true, notifications: rows });
    } catch (err) {
        console.error('获取通知错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 标记已读
app.put('/api/notifications/:id/read', requireDB, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

        await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('标记已读错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 学习目标
// ===================================================

// 设置目标
app.post('/api/goals', requireDB, async (req, res) => {
    try {
        const { username, goalText, targetChapters, startDate, endDate } = req.body;
        if (!username || !goalText || !startDate || !endDate) {
            return res.json({ success: false, error: '参数不完整' });
        }

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        await pool.query(
            'INSERT INTO student_goals (student_id, goal_text, target_chapters, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [students[0].id, goalText, parseInt(targetChapters) || 0, startDate, endDate]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('设置目标错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 获取当前目标
app.get('/api/goals/:username', requireDB, async (req, res) => {
    try {
        const { username } = req.params;
        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [rows] = await pool.query(
            'SELECT id, goal_text, target_chapters, start_date, end_date, completed, created_at FROM student_goals WHERE student_id = ? ORDER BY created_at DESC LIMIT 5',
            [students[0].id]
        );
        res.json({ success: true, goals: rows });
    } catch (err) {
        console.error('获取目标错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 讨论区
// ===================================================

// 获取讨论列表
app.get('/api/discussions', requireDB, async (req, res) => {
    try {
        const { chapterId } = req.query;
        let sql = `
            SELECT dp.id, dp.title, dp.content, dp.chapter_id, dp.created_at,
                   s.display_name, s.username,
                   (SELECT COUNT(*) FROM discussion_replies WHERE post_id = dp.id) AS reply_count
            FROM discussion_posts dp
            JOIN students s ON dp.student_id = s.id
        `;
        const params = [];
        if (chapterId) {
            sql += ' WHERE dp.chapter_id = ?';
            params.push(chapterId);
        }
        sql += ' ORDER BY dp.created_at DESC LIMIT 50';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, discussions: rows });
    } catch (err) {
        console.error('获取讨论错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 发帖
app.post('/api/discussions', requireDB, async (req, res) => {
    try {
        const { username, title, content, chapterId } = req.body;
        if (!username || !title || !content) {
            return res.json({ success: false, error: '参数不完整' });
        }

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        const [result] = await pool.query(
            'INSERT INTO discussion_posts (student_id, title, content, chapter_id) VALUES (?, ?, ?, ?)',
            [students[0].id, title, content, chapterId || '']
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('发帖错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 获取帖子详情（含回复）
app.get('/api/discussions/:id', requireDB, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

        const [posts] = await pool.query(
            `SELECT dp.id, dp.title, dp.content, dp.chapter_id, dp.created_at,
                    s.display_name, s.username
             FROM discussion_posts dp
             JOIN students s ON dp.student_id = s.id
             WHERE dp.id = ?`,
            [id]
        );
        if (posts.length === 0) return res.json({ success: false, error: '帖子不存在' });

        const [replies] = await pool.query(
            `SELECT dr.id, dr.content, dr.created_at, s.display_name, s.username
             FROM discussion_replies dr
             JOIN students s ON dr.student_id = s.id
             WHERE dr.post_id = ?
             ORDER BY dr.created_at ASC`,
            [id]
        );

        res.json({ success: true, post: posts[0], replies });
    } catch (err) {
        console.error('获取帖子详情错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// 回复帖子
app.post('/api/discussions/:id/replies', requireDB, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        if (isNaN(postId)) return res.json({ success: false, error: '无效的ID' });

        const { username, content } = req.body;
        if (!username || !content) return res.json({ success: false, error: '参数不完整' });

        const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
        if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

        await pool.query(
            'INSERT INTO discussion_replies (post_id, student_id, content) VALUES (?, ?, ?)',
            [postId, students[0].id, content]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('回复错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 学生端 API - 每日一题
// ===================================================

app.get('/api/daily-question', requireDB, async (req, res) => {
    try {
        const { date } = req.query;
        let sql = 'SELECT id, question, options, answer, explanation, question_date FROM daily_questions';
        let params = [];

        if (date) {
            sql += ' WHERE question_date = ?';
            params.push(date);
        } else {
            sql += ' ORDER BY question_date DESC LIMIT 1';
        }

        const [rows] = await pool.query(sql, params);
        if (rows.length === 0) {
            return res.json({ success: false, error: '暂无题目' });
        }
        res.json({ success: true, question: rows[0] });
    } catch (err) {
        console.error('获取每日一题错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 管理端 API - 学习趋势
// ===================================================

app.get('/api/admin/trends', adminAuth, requireDB, async (req, res) => {
    try {
        const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
        const [moduleRows] = await pool.query(
            `SELECT DATE(completed_at) AS dt, COUNT(*) AS cnt
             FROM learning_progress WHERE completed = 1 AND completed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(completed_at) ORDER BY dt`,
            [days]
        );
        const [loginRows] = await pool.query(
            `SELECT DATE(login_time) AS dt, COUNT(DISTINCT student_id) AS cnt
             FROM login_logs WHERE login_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(login_time) ORDER BY dt`,
            [days]
        );

        // 构建完整日期序列
        const trendData = [];
        const moduleMap = {};
        const loginMap = {};
        moduleRows.forEach(r => { moduleMap[r.dt] = r.cnt; });
        loginRows.forEach(r => { loginMap[r.dt] = r.cnt; });

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            trendData.push({
                date: ds,
                newModules: Number(moduleMap[ds]) || 0,
                newLogins: Number(loginMap[ds]) || 0
            });
        }

        res.json({ success: true, trends: trendData });
    } catch (err) {
        console.error('学习趋势错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 管理端 API - 章节完成率
// ===================================================

app.get('/api/admin/chapter-completion', adminAuth, requireDB, async (req, res) => {
    try {
        const [[{ totalStudents }]] = await pool.query(
            "SELECT COUNT(*) AS totalStudents FROM students WHERE status = 'active'"
        );

        const [rows] = await pool.query(
            `SELECT module_id, COUNT(*) AS completed_count
             FROM learning_progress
             WHERE completed = 1 AND module_id LIKE 'chapter_%'
             GROUP BY module_id ORDER BY module_id`
        );

        const chapters = rows.map(r => ({
            chapterId: r.module_id.replace('chapter_', ''),
            completedCount: r.completed_count,
            totalStudents: Number(totalStudents),
            completionRate: totalStudents > 0 ? Math.round(r.completed_count / totalStudents * 100) : 0
        }));

        res.json({ success: true, chapters, totalStudents: Number(totalStudents) });
    } catch (err) {
        console.error('章节完成率错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 管理端 API - 测验成绩
// ===================================================

app.get('/api/admin/quiz-scores', adminAuth, requireDB, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT module_id, AVG(score) AS avg_score, COUNT(*) AS student_count,
                    MAX(score) AS max_score, MIN(score) AS min_score
             FROM learning_progress
             WHERE completed = 1 AND score > 0 AND module_id LIKE '%quiz%'
             GROUP BY module_id ORDER BY module_id`
        );
        const quizScores = rows.map(r => ({
            moduleId: r.module_id,
            avgScore: Math.round(Number(r.avg_score) * 10) / 10,
            studentCount: r.student_count,
            maxScore: r.max_score,
            minScore: r.min_score
        }));
        res.json({ success: true, quizScores });
    } catch (err) {
        console.error('测验成绩错误:', err);
        res.json({ success: false, error: '服务器错误' });
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
        console.error('布置作业错误:', err);
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
        console.error('获取作业列表错误:', err);
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
        console.error('编辑作业错误:', err);
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
        console.error('删除作业错误:', err);
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
        console.error('获取提交情况错误:', err);
        res.json({ success: false, error: '服务器错误' });
    }
});

// ===================================================
// 管理端 API - 活跃度监控
// ===================================================

app.get('/api/admin/inactive-students', adminAuth, requireDB, async (req, res) => {
    try {
        const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 7));

        const [rows] = await pool.query(
            `SELECT s.id, s.username, s.display_name, s.grade, s.class_num,
                    MAX(ll.login_time) AS last_login
             FROM students s
             LEFT JOIN login_logs ll ON s.id = ll.student_id
             WHERE s.status = 'active'
             GROUP BY s.id
             HAVING last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY last_login ASC`,
            [days]
        );
        res.json({ success: true, inactiveStudents: rows, days });
    } catch (err) {
        console.error('活跃度监控错误:', err);
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
        console.error('添加每日一题错误:', err);
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
        console.error('删除每日一题错误:', err);
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
        console.error('获取每日一题错误:', err);
        res.json({ success: false, error: '获取每日一题失败' });
    }
});

// 获取管理员列表
app.get('/api/admin/admins', adminAuth, requireDB, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, display_name, role, created_at FROM admins ORDER BY created_at DESC'
        );
        res.json({ success: true, admins: rows });
    } catch (err) {
        console.error('获取管理员列表错误:', err);
        res.json({ success: false, error: '获取管理员列表失败' });
    }
});

// ===================================================
// 管理端 API - 增强导出
// ===================================================

app.get('/api/admin/export/excel', adminAuth, requireDB, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                s.id, s.username, s.display_name, s.grade, s.class_num, s.status,
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

        // 获取每个学生的各章完成详情
        for (const row of rows) {
            const [chapters] = await pool.query(
                "SELECT module_id, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1 AND module_id LIKE 'chapter_%' ORDER BY module_id",
                [row.id]
            );
            row.chapterDetails = chapters.map(c => ({
                chapterId: c.module_id.replace('chapter_', ''),
                completedAt: c.completed_at
            }));
        }

        res.json({ success: true, students: rows, exportedAt: new Date().toISOString() });
    } catch (err) {
        console.error('增强导出错误:', err);
        res.json({ success: false, error: '服务器错误' });
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
        dbReady = true;
    } catch (err) {
        console.warn('===========================================');
        console.warn('[警告] 数据库初始化失败！');
        console.warn('[原因] ' + err.message);
        console.warn('');
        console.warn('网站将以离线模式启动，部分功能不可用：');
        console.warn('  - 用户登录/注册功能不可用');
        console.warn('  - 学习进度无法保存');
        console.warn('  - 管理员后台不可用');
        console.warn('');
        console.warn('请检查：');
        console.warn('  1. MySQL 服务是否已启动？');
        console.warn('  2. MySQL root 密码是否为空？(当前配置为空密码)');
        console.warn('  3. 如果 root 有密码，请修改 server.js 中的 password 配置');
        console.warn('===========================================');
        dbReady = false;
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
        console.log(`  Python 基础学习平台已启动`);
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