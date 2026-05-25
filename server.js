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
// 启动服务器
// ===================================================
app.listen(PORT, () => {
    console.log(`🐍 Python 变量学习平台后端已启动`);
    console.log(`   地址：http://localhost:${PORT}`);
    console.log(`   数据库：MySQL -> python_var_lesson`);
    console.log(`   关闭：Ctrl + C`);
});