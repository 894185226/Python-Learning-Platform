// ===================================================
// 公开路由模块 - 状态、健康检查、错误上报、公告
// ===================================================
const shared = require('../shared');
const { metrics } = require('../shared/monitor');
const { requireDB } = require('../middleware');

module.exports = function (app) {
    // ---------- 数据库状态检查（前端可定期检查此接口） ----------
    app.get('/api/status', (req, res) => {
        res.json({
            success: true,
            dbReady: shared.dbReady,
            serverTime: Date.now(),
            sessionCount: shared.sessions.size,
            message: shared.dbReady ? '数据库连接正常' : '数据库暂时不可用，学习内容仍可浏览，但进度保存和登录功能暂不可用'
        });
    });

    // ---------- 健康检查端点（P6 增强：连接池、请求指标） ----------
    app.get('/api/health', async (req, res) => {
        const health = {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: {
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
            },
            database: { status: 'unknown' },
            pool: { total: 0, idle: 0, waiting: 0 },
            sessions: shared.sessions.size,
            wsClients: typeof wsClients !== 'undefined' ? wsClients.size : 0,
            requests: {
                currentMinute: metrics.current.requestCount,
                errorRate: metrics.current.requestCount > 0
                    ? Math.round((metrics.current.error4xx + metrics.current.error5xx) / metrics.current.requestCount * 10000) / 100
                    : 0,
            },
        };
        // 数据库连接检测 + 连接池状态
        try {
            const conn = await shared.pool.getConnection();
            await conn.ping();
            // 获取连接池状态
            const poolInfo = shared.pool.pool;
            health.pool = {
                total: poolInfo ? poolInfo._allConnections.length : 0,
                idle: poolInfo ? poolInfo._freeConnections.length : 0,
                waiting: poolInfo ? poolInfo._connectionQueue.length : 0,
            };
            conn.release();
            health.database = { status: 'connected', ready: shared.dbReady };
        } catch (e) {
            health.database = { status: 'error', message: e.message };
            health.status = 'degraded';
        }
        res.json(health);
    });

    // ---------- 前端错误上报 ----------
    // 误报错误去重缓存：同一错误在去重窗口内只记录一次
    const errorDedupCache = new Map();
    const ERROR_DEDUP_WINDOW = 30000; // 30秒去重窗口

    app.post('/api/error-report', (req, res) => {
        const { message, source, line, col, timestamp, userAgent } = req.body;

        // --- 服务端误报过滤 ---
        // 1. 过滤 IDE/Electron 环境注入的脚本错误
        //    特征：line=1, col=1，source 为页面 URL 自身（不含 .js 扩展名）
        if (line === 1 && col === 1 && source && source.indexOf('.js') === -1) {
            return res.json({ success: true, filtered: true, reason: 'ide-injected' });
        }
        // 2. 过滤浏览器扩展注入的脚本错误
        if (source && /^(chrome|moz|safari)-extension:\/\//.test(source)) {
            return res.json({ success: true, filtered: true, reason: 'browser-extension' });
        }
        // 3. 过滤跨域脚本的 "Script error." 无详情
        if (message === 'Script error.' && (!source || source === '')) {
            return res.json({ success: true, filtered: true, reason: 'cross-origin-script' });
        }
        // 4. 过滤 CDN 回退脚本错误
        if (source && /cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net/.test(source)) {
            return res.json({ success: true, filtered: true, reason: 'cdn-fallback' });
        }
        // 5. 过滤 Vite HMR 客户端相关错误
        if (message && message.indexOf('@vite/client') !== -1) {
            return res.json({ success: true, filtered: true, reason: 'vite-hmr' });
        }

        // --- 去重：相同错误在 30 秒内只记录一次 ---
        const dedupKey = `${message || ''}|${source || ''}|${line || 0}|${col || 0}`;
        const now = Date.now();
        const lastReport = errorDedupCache.get(dedupKey);
        if (lastReport && (now - lastReport) < ERROR_DEDUP_WINDOW) {
            return res.json({ success: true, filtered: true, reason: 'dedup' });
        }
        errorDedupCache.set(dedupKey, now);

        // 定期清理过期缓存
        if (errorDedupCache.size > 500) {
            const cutoff = now - ERROR_DEDUP_WINDOW;
            for (const [key, time] of errorDedupCache) {
                if (time < cutoff) errorDedupCache.delete(key);
            }
        }

        console.warn(`[前端错误] ${timestamp || ''} ${message || ''} (${source || '?'}:${line || '?'}:${col || '?'})`);
        res.json({ success: true });
    });

    // ---------- 系统公告 ----------
    // 获取公告列表（学生端）
    app.get('/api/notices', requireDB, async (req, res) => {
        try {
            const [rows] = await shared.pool.query('SELECT id, title, content, created_at FROM notices ORDER BY created_at DESC LIMIT 10');
            res.json({ success: true, notices: rows });
        } catch (err) {
            console.error('获取公告错误:', err);
            res.json({ success: false, error: '服务器错误' });
        }
    });
};