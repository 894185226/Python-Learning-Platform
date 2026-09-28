// ===================================================
// Python 基础学习平台 - 后端服务器（入口文件）
// 技术栈：Node.js + Express + MySQL
// 启动方式：node server.js
// ===================================================

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

// 加载环境变量
require('dotenv').config();

// 加载共享模块（数据库、会话、工具函数）
const shared = require('./shared');

// 加载结构化日志
const { createLogger } = require('./shared/logger');
const log = createLogger('server');

// 加载中间件模块
const middleware = require('./middleware');

// 加载监控模块
const { requestLogger } = require('./shared/monitor');

// 共享常量
const { VALID_MODULES, VALID_ACHIEVEMENTS } = require('./constants.js');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ===================================================
// 请求日志与性能监控（最先注册）
// ===================================================
app.use(requestLogger);

// 结构化请求日志中间件（记录 method、path、status、响应时间）
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        log.info('请求', { method: req.method, path: req.path, status: res.statusCode, duration: duration + 'ms' });
    });
    next();
});

// ===================================================
// CORS 配置
// ===================================================
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        const isLAN = /^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
        if (isLAN) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('CORS 不允许'));
    },
    credentials: true
}));

// 静态资源 Gzip 压缩（文本类资源压缩率可达 70-80%）
app.use(compression({
    filter: (req, res) => {
        // 已压缩的字体/图片不重复压缩
        if (req.path.match(/\.(woff2?|ttf|eot|png|jpg|jpeg|gif|webp)$/i)) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6  // 平衡压缩率与 CPU 开销
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===================================================
// 安全响应头
// ===================================================
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' cdnjs.cloudflare.com; " +
        "connect-src 'self'; " +
        "frame-src 'self';"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), ' +
        'payment=(), usb=(), magnetometer=(), ' +
        'accelerometer=(), gyroscope=()'
    );
    next();
});

// ===================================================
// CSRF 保护
// ===================================================
const CSRF_DISABLED = process.env.CSRF_DISABLED === 'true';
app.use(middleware.csrfProtection);

// ===================================================
// 速率限制
// ===================================================
app.use('/api', middleware.rateLimit);
app.use('/api/login', middleware.loginRateLimit);
app.use('/api/register', middleware.loginRateLimit);

// ===================================================
// API 响应缓存控制（动态数据禁止缓存）
// ===================================================
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// ===================================================
// 静态文件服务（含缓存策略 + ETag）
// ===================================================
app.use(express.static(__dirname, {
    etag: true,           // 启用 ETag（Express 默认开启，显式声明）
    lastModified: true,   // 启用 Last-Modified
    setHeaders: (res, filePath) => {
        // 1. 设置正确的 Content-Type
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }

        // 2. 根据文件类型设置 Cache-Control
        const ext = path.extname(filePath).toLowerCase();

        // HTML 入口文件：每次必须验证（内容可能更新）
        if (ext === '.html') {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
        // 字体和图片：长期缓存（30天，很少变更）
        else if (['.woff2', '.woff', '.ttf', '.eot', '.otf',
                   '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000');
        }
        // CSS/JS：中期缓存（7天，配合 ETag 可 304 响应）
        else if (['.css', '.js'].includes(ext)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, must-revalidate');
        }
        // 其他文件：短期缓存（1天）
        else {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// ===================================================
// 加载路由模块
// ===================================================
require('./routes/public')(app);
require('./routes/auth')(app);
require('./routes/student')(app);
require('./routes/admin')(app);

// ===================================================
// 全局错误处理中间件
// ===================================================

// 404 处理 - 未知 API 路由
app.use('/api/{*path}', (req, res) => {
    res.status(404).json({ success: false, error: '接口不存在' });
});

// Express 全局错误处理（4 参数中间件）
app.use((err, req, res, next) => {
    log.error('Express错误', { method: req.method, path: req.path, error: err.message });
    // 不暴露内部错误详情给客户端
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误，请稍后重试'
    });
});

// ===================================================
// 启动服务器
// ===================================================
(async function startServer() {
    const { initializeDatabase, runMigrations, scheduleBackup, autoBackup } = require('./shared/db');

    try {
        log.info('正在连接 MySQL 并初始化数据库...');
        await initializeDatabase();
        log.info('数据库初始化完成');
        await runMigrations();
        shared.dbReady = true;
        await shared.loadSessionsFromDB();
        scheduleBackup();
    } catch (err) {
        log.warn('数据库初始化失败，网站将以离线模式启动', { reason: err.message });
        log.warn('部分功能不可用：用户登录/注册、学习进度保存、管理员后台');
        log.warn('请检查：1.MySQL服务是否已启动 2.MySQL root密码是否为空 3.如有密码请修改.env中的DB_ROOT_PASSWORD');
        shared.dbReady = false;
    }

    const server = http.createServer(app);

    // 初始化 WebSocket
    const ws = require('./ws');
    ws.initWebSocket(server);

    // 全局未捕获异常处理
    process.on('uncaughtException', (err) => {
        log.error('未捕获异常', { message: err.message, stack: err.stack });
    });

    process.on('unhandledRejection', (reason, promise) => {
        log.error('未处理的 Promise 拒绝', { reason: reason && reason.stack ? reason.stack : reason });
    });

    server.listen(PORT, '0.0.0.0', () => {
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
        log.info('===========================================');
        log.info(`Python 基础学习平台已启动`);
        log.info(`本机访问：http://localhost:${PORT}`);
        if (localIPs.length > 0) {
            log.info(`局域网访问：http://${localIPs[0]}:${PORT}`);
        }
        log.info(`管理后台：http://localhost:${PORT}/admin.html`);
        log.info(`管理员账号：admin（默认密码请查看 .env 文件或联系系统管理员）`);
        log.info(`数据库：MySQL -> python_var_lesson`);
        log.info(`关闭：Ctrl + C`);
        log.info('===========================================');
    });
})();