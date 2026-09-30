// ===================================================
// 共享模块 - 数据库连接池、状态、工具函数
// ===================================================
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const crypto = require('crypto');
const { createLogger } = require('./logger');
const log = createLogger('shared');

// 加载 .env 环境变量
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const eqIdx = line.indexOf('=');
                if (eqIdx > 0) {
                    const key = line.substring(0, eqIdx).trim();
                    const value = line.substring(eqIdx + 1).trim();
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            }
        });
    }
}
loadEnv();

// 数据库配置
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_ROOT_USER = process.env.DB_ROOT_USER || 'root';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || '';
const DB_APP_USER = process.env.DB_APP_USER || 'app_user';
const DB_APP_PASSWORD = process.env.DB_APP_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'python_var_lesson';

// 数据库状态
let dbReady = false;

// MySQL 连接池（P5.5 优化：添加超时与资源控制参数）
const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_APP_PASSWORD ? DB_APP_USER : DB_ROOT_USER,
    password: DB_APP_PASSWORD || DB_ROOT_PASSWORD,
    database: DB_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 30,           // 最大连接数（56 人课堂峰值场景留有安全余量）
    queueLimit: 20,                // 等待队列上限（超过则立即报错，防止雪崩）
    idleTimeout: 60000,            // 空闲连接 60 秒后释放
    connectTimeout: 5000,          // 建立连接超时 5 秒
    enableKeepAlive: true,
    keepAliveInitialDelay: 60000,
});

// 会话管理
const SESSION_FILE = path.join(__dirname, '..', '.sessions.json');
const ADMIN_SESSION_FILE = path.join(__dirname, '..', '.admin-sessions.json');
const SESSION_EXPIRE_MS = 24 * 60 * 60 * 1000;
const sessions = new Map(); // token -> { username, studentId, createdAt, csrfToken }

// 管理员会话
const adminSessions = new Map(); // token -> { username, displayName, expires }

// 登录失败计数器
const loginFailures = new Map();
const LOGIN_FAILURE_WINDOW = 15 * 60 * 1000;
const LOGIN_FAILURE_MAX = 5;

// 从文件加载会话
function loadSessions() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
            const now = Date.now();
            let validCount = 0;
            for (const [token, data] of Object.entries(raw)) {
                if (data.createdAt && now - data.createdAt < SESSION_EXPIRE_MS) {
                    sessions.set(token, data);
                    validCount++;
                }
            }
            log.info(`从文件恢复了 ${validCount} 个有效会话`);
        }
    } catch (e) {
        log.warn('加载会话文件失败，将使用全新会话', { error: e.message });
    }
}

// 保存会话到文件
function saveSessions() {
    try {
        const obj = Object.fromEntries(sessions);
        fs.writeFileSync(SESSION_FILE, JSON.stringify(obj), 'utf-8');
    } catch (e) {
        log.warn('保存会话文件失败', { error: e.message });
    }
}

// 管理员会话持久化
function loadAdminSessions() {
    try {
        if (fs.existsSync(ADMIN_SESSION_FILE)) {
            const raw = JSON.parse(fs.readFileSync(ADMIN_SESSION_FILE, 'utf-8'));
            const now = Date.now();
            let validCount = 0;
            for (const [token, data] of Object.entries(raw)) {
                if (data.expires && now < data.expires) {
                    adminSessions.set(token, data);
                    validCount++;
                }
            }
            log.info(`从文件恢复了 ${validCount} 个管理员会话`);
        }
    } catch (e) {
        log.warn('加载管理员会话文件失败，将使用全新会话', { error: e.message });
    }
}

function saveAdminSessions() {
    try {
        const obj = Object.fromEntries(adminSessions);
        fs.writeFileSync(ADMIN_SESSION_FILE, JSON.stringify(obj), 'utf-8');
    } catch (e) {
        log.warn('保存管理员会话文件失败', { error: e.message });
    }
}

// 保存单个会话到数据库
async function saveSessionToDB(token, data) {
    if (!dbReady) return;
    try {
        await pool.execute(
            'INSERT INTO sessions (token, username, student_id, csrf_token, created_at) VALUES (?, ?, ?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE username=VALUES(username), student_id=VALUES(student_id), csrf_token=VALUES(csrf_token), created_at=VALUES(created_at)',
            [token, data.username, data.studentId, data.csrfToken || '', data.createdAt]
        );
    } catch (e) { /* 会话文件可能不存在或损坏 */ }
}

// 从数据库删除会话
async function removeSessionFromDB(token) {
    if (!dbReady) return;
    try {
        await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
    } catch (e) { /* 会话文件可能不存在或损坏 */ }
}

// 清除指定用户名的所有会话（实现单设备登录：登录时使旧设备失效）
// exceptToken: 可选，排除某个 token 不清除（登录时保留即将创建的新会话）
function cleanupStudentSessions(username, exceptToken) {
    if (!username) return;
    let changed = false;
    for (const [token, data] of sessions) {
        if (data && data.username === username && token !== exceptToken) {
            sessions.delete(token);
            removeSessionFromDB(token);
            changed = true;
        }
    }
    if (changed) saveSessions();
}

// 从数据库加载会话
async function loadSessionsFromDB() {
    if (!dbReady) return;
    try {
        const [rows] = await pool.query('SELECT token, username, student_id, csrf_token, created_at FROM sessions');
        const now = Date.now();
        let loaded = 0;
        for (const row of rows) {
            if (now - row.created_at < SESSION_EXPIRE_MS) {
                sessions.set(row.token, {
                    username: row.username,
                    studentId: row.student_id,
                    csrfToken: row.csrf_token || '',
                    createdAt: row.created_at
                });
                loaded++;
            }
        }
        if (loaded > 0) log.info(`从数据库恢复了 ${loaded} 个有效会话`);
        await pool.execute('DELETE FROM sessions WHERE created_at < ?', [now - SESSION_EXPIRE_MS]);
    } catch (e) { /* 会话表可能尚未创建，首次启动正常 */ }
}

// 生成会话 Token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// 密码工具
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
    if (!hash) return false;
    try {
        return await bcrypt.compare(password, hash);
    } catch { return false; }
}

// 管理员操作日志
async function logAdminAction(adminName, action, detail) {
    try {
        await pool.query('INSERT INTO admin_logs (admin_name, action, detail) VALUES (?, ?, ?)',
            [adminName, action, detail || '']);
    } catch (e) { /* 日志记录失败不影响主流程，可能数据库暂不可用 */ }
}

// 连接池健康检查
async function dbHealthCheck() {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        if (!dbReady) {
            dbReady = true;
            log.info('健康检查通过，数据库已恢复可用');
        }
    } catch (e) {
        if (dbReady) {
            log.warn('健康检查失败，数据库可能不可用', { error: e.message });
            dbReady = false;
        }
    }
}

// 初始化会话
loadSessions();
loadAdminSessions();

// 定期清理过期会话
setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [token, data] of sessions) {
        if (now - data.createdAt > SESSION_EXPIRE_MS) {
            sessions.delete(token);
            changed = true;
        }
    }
    if (changed) saveSessions();
}, 60 * 60 * 1000);

// 每5分钟自动保存会话
setInterval(() => { saveSessions(); saveAdminSessions(); }, 5 * 60 * 1000);

// 进程退出时保存会话
process.on('SIGINT', () => { saveSessions(); saveAdminSessions(); process.exit(); });
process.on('SIGTERM', () => { saveSessions(); saveAdminSessions(); process.exit(); });

// 每30秒数据库健康检查
setInterval(dbHealthCheck, 30000);
setTimeout(dbHealthCheck, 5000);

module.exports = {
    pool,
    sessions,
    adminSessions,
    loginFailures,
    get dbReady() { return dbReady; },
    set dbReady(v) { dbReady = v; },
    DB_HOST, DB_ROOT_USER, DB_ROOT_PASSWORD, DB_APP_USER, DB_APP_PASSWORD, DB_NAME,
    SESSION_EXPIRE_MS, LOGIN_FAILURE_WINDOW, LOGIN_FAILURE_MAX,
    loadSessions, saveSessions, saveSessionToDB, removeSessionFromDB, loadSessionsFromDB,
    cleanupStudentSessions,
    generateSessionToken,
    hashPassword, verifyPassword,
    logAdminAction,
    dbHealthCheck,
};