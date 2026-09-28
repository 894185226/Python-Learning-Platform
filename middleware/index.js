// ===================================================
// 中间件模块 - 认证、CSRF、速率限制、输入校验
// ===================================================
const crypto = require('crypto');
const shared = require('../shared');

// ===================================================
// CSRF 保护
// ===================================================
function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

function getOrCreateCSRFToken(sessionToken) {
    const session = shared.sessions.get(sessionToken);
    if (!session) return null;
    if (!session.csrfToken) {
        session.csrfToken = generateCSRFToken();
        shared.sessions.set(sessionToken, session);
    }
    return session.csrfToken;
}

function csrfProtection(req, res, next) {
    // 跳过非写操作
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }
    // 跳过不需要 CSRF 的路径
    const skipPaths = ['/api/register', '/api/login', '/api/admin/login', '/api/error-report', '/api/health', '/api/status'];
    if (skipPaths.includes(req.path)) return next();
    // 管理端 API 使用 X-Admin-Token 验证，无需 CSRF
    if (req.path.startsWith('/api/admin/')) return next();
    // 跳过 WebSocket 升级请求
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') return next();

    const token = req.headers['x-csrf-token'] || (req.body && req.body._csrfToken);
    const sessionToken = req.headers['x-session-token'] || (req.body && req.body._sessionToken);
    if (!token || !sessionToken) {
        return res.status(403).json({ success: false, error: 'CSRF 验证失败' });
    }
    const session = shared.sessions.get(sessionToken);
    if (!session || !session.csrfToken || session.csrfToken !== token) {
        return res.status(403).json({ success: false, error: 'CSRF 验证失败' });
    }
    next();
}

// ===================================================
// 速率限制
// ===================================================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 60;

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

const loginRateLimitMap = new Map();
const LOGIN_RATE_LIMIT_WINDOW = 60 * 1000;
const LOGIN_RATE_LIMIT_MAX = 10;

function loginRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = loginRateLimitMap.get(ip);
    if (record && now - record.start < LOGIN_RATE_LIMIT_WINDOW) {
        if (record.count >= LOGIN_RATE_LIMIT_MAX) {
            return res.status(429).json({ success: false, error: '登录尝试过于频繁，请1分钟后再试' });
        }
        record.count++;
    } else {
        loginRateLimitMap.set(ip, { start: now, count: 1 });
    }
    next();
}

// 定期清理过期速率限制记录
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap) {
        if (now - record.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(ip);
    }
    for (const [ip, record] of loginRateLimitMap) {
        if (now - record.start > LOGIN_RATE_LIMIT_WINDOW) loginRateLimitMap.delete(ip);
    }
}, 60000);

// ===================================================
// 会话认证（学生端）
// ===================================================
function sessionAuth(req, res, next) {
    const token = req.headers['x-session-token'] || (req.body && req.body._sessionToken);
    if (!token) {
        return res.status(401).json({ success: false, error: '未登录或登录已过期' });
    }
    const session = shared.sessions.get(token);
    if (!session || Date.now() - session.createdAt > shared.SESSION_EXPIRE_MS) {
        if (session) shared.sessions.delete(token);
        return res.status(401).json({ success: false, error: '未登录或登录已过期' });
    }
    req.sessionUser = session;
    req.sessionToken = token;
    next();
}

// ===================================================
// 管理员认证
// ===================================================
function adminAuth(req, res, next) {
    const token = req.headers['x-admin-token'] || '';
    const session = shared.adminSessions.get(token);
    if (!session || session.expires < Date.now()) {
        if (session) shared.adminSessions.delete(token);
        return res.status(401).json({ success: false, error: '未登录或登录已过期' });
    }
    req.adminUser = session;
    next();
}

// ===================================================
// 数据库就绪检查
// ===================================================
function requireDB(req, res, next) {
    if (!shared.dbReady) {
        return res.json({ success: false, error: '数据库未连接，请启动MySQL服务后刷新页面' });
    }
    next();
}

// ===================================================
// 输入校验
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
// 密码复杂度校验（统一入口，所有密码修改/创建均需调用）
// 规则：至少6位 + 必须包含字母和数字
// 返回：null 表示通过，否则返回错误消息字符串
// ===================================================
function validatePassword(password) {
    if (typeof password !== 'string' || password.trim().length === 0) {
        return '密码不能为空';
    }
    if (password.length < 6) {
        return '密码至少6位';
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password)) {
        return '密码必须包含字母和数字';
    }
    return null;
}

module.exports = {
    generateCSRFToken, getOrCreateCSRFToken, csrfProtection,
    rateLimit, loginRateLimit,
    sessionAuth, adminAuth,
    requireDB, validateInput, validatePassword,
};