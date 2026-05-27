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
app.use(express.json());
// 托管静态文件（index.html, style.css, script.js 等）
app.use(express.static(__dirname));

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
                password    VARCHAR(255) NOT NULL COMMENT '密码（SHA256 哈希）',
                display_name VARCHAR(50) NOT NULL COMMENT '真实姓名/显示名称',
                class_name  VARCHAR(50)  DEFAULT '' COMMENT '班级',
                created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
                INDEX idx_username (username)
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

        console.log('[初始化] 所有数据表就绪');
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

// ===================================================
// API 接口
// ===================================================

// ---------- 用户注册 ----------
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, displayName } = req.body;
        if (!username || !password || !displayName) {
            return res.json({ success: false, error: '请填写所有字段' });
        }
        if (password.length < 4) {
            return res.json({ success: false, error: '密码至少4位' });
        }

        const hashed = hashPassword(password);
        await pool.execute(
            'INSERT INTO students (username, password, display_name) VALUES (?, ?, ?)',
            [username, hashed, displayName]
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
        if (!username || !password) {
            return res.json({ success: false, error: '请输入用户名和密码' });
        }

        const hashed = hashPassword(password);
        const [rows] = await pool.execute(
            'SELECT id, username, display_name FROM students WHERE username = ? AND password = ?',
            [username, hashed]
        );

        if (rows.length === 0) {
            return res.json({ success: false, error: '用户名或密码错误' });
        }

        const student = rows[0];

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
                displayName: student.display_name
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

        const [students] = await pool.execute(
            'SELECT id FROM students WHERE username = ?', [username]
        );
        if (students.length === 0) {
            return res.json({ success: false, error: '用户不存在' });
        }

        const studentId = students[0].id;

        await pool.execute(
            `INSERT INTO learning_progress (student_id, module_id, completed, score, completed_at)
             VALUES (?, ?, 1, ?, NOW())
             ON DUPLICATE KEY UPDATE completed = 1, score = VALUES(score), completed_at = NOW()`,
            [studentId, moduleId, score || 0]
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

    app.listen(PORT, () => {
        console.log('===========================================');
        console.log(`  Python 变量学习平台已启动`);
        console.log(`  地址：http://localhost:${PORT}`);
        console.log(`  数据库：MySQL -> python_var_lesson`);
        console.log(`  关闭：Ctrl + C`);
        console.log('===========================================');
    });
})();