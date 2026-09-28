// ===================================================
// 监控模块 - 请求统计、错误率、性能指标收集
// ===================================================

const os = require('os');

// 1 分钟窗口的指标
const WINDOW_MS = 60 * 1000;

class MetricsCollector {
    constructor() {
        this.reset();
        // 每分钟自动轮转窗口
        this._interval = setInterval(() => this.rotate(), WINDOW_MS);
    }

    reset() {
        // 当前窗口
        this.current = {
            startTime: Date.now(),
            requestCount: 0,
            error4xx: 0,
            error5xx: 0,
            totalResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            // 按路径统计
            pathStats: {},
        };
        // 上一个窗口（已完成，数据稳定）
        this.previous = null;
        // 累计数据
        this.total = {
            requestCount: 0,
            error4xx: 0,
            error5xx: 0,
        };
        // 启动时间
        this.startTime = Date.now();
    }

    rotate() {
        // 完成当前窗口，保存到 previous
        this.current.endTime = Date.now();
        this.previous = { ...this.current, pathStats: { ...this.current.pathStats } };
        // 开启新窗口
        this.current = {
            startTime: Date.now(),
            requestCount: 0,
            error4xx: 0,
            error5xx: 0,
            totalResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            pathStats: {},
        };
    }

    recordRequest(method, path, statusCode, responseTime) {
        const stats = this.current;
        stats.requestCount++;
        stats.totalResponseTime += responseTime;
        if (responseTime > stats.maxResponseTime) stats.maxResponseTime = responseTime;
        if (responseTime < stats.minResponseTime) stats.minResponseTime = responseTime;

        // 按路径统计
        if (!stats.pathStats[path]) {
            stats.pathStats[path] = { count: 0, errors: 0, totalTime: 0 };
        }
        stats.pathStats[path].count++;
        stats.pathStats[path].totalTime += responseTime;

        // 错误分类
        if (statusCode >= 500) {
            stats.error5xx++;
            stats.pathStats[path].errors++;
        } else if (statusCode >= 400) {
            stats.error4xx++;
            stats.pathStats[path].errors++;
        }

        this.total.requestCount++;
        if (statusCode >= 500) this.total.error5xx++;
        else if (statusCode >= 400) this.total.error4xx++;
    }

    // 获取监控快照
    getSnapshot() {
        const now = Date.now();
        const currentWindow = this.current;
        const reqCount = currentWindow.requestCount;
        const avgTime = reqCount > 0 ? Math.round(currentWindow.totalResponseTime / reqCount) : 0;

        // 内存
        const mem = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        // CPU
        const cpus = os.cpus();

        return {
            server: {
                uptime: process.uptime(),
                startedAt: new Date(this.startTime).toISOString(),
                nodeVersion: process.version,
                platform: process.platform,
            },
            requests: {
                currentWindow: {
                    startTime: new Date(currentWindow.startTime).toISOString(),
                    count: reqCount,
                    avgResponseTime: avgTime,
                    maxResponseTime: currentWindow.maxResponseTime === Infinity ? 0 : currentWindow.maxResponseTime,
                    minResponseTime: currentWindow.minResponseTime === Infinity ? 0 : currentWindow.minResponseTime,
                    error4xx: currentWindow.error4xx,
                    error5xx: currentWindow.error5xx,
                    errorRate: reqCount > 0 ? Math.round((currentWindow.error4xx + currentWindow.error5xx) / reqCount * 10000) / 100 : 0,
                },
                previousWindow: this.previous ? {
                    startTime: new Date(this.previous.startTime).toISOString(),
                    count: this.previous.requestCount,
                    avgResponseTime: this.previous.requestCount > 0 ? Math.round(this.previous.totalResponseTime / this.previous.requestCount) : 0,
                    error4xx: this.previous.error4xx,
                    error5xx: this.previous.error5xx,
                } : null,
                total: { ...this.total },
                // 请求量 Top 10 路径
                topPaths: Object.entries(currentWindow.pathStats)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10)
                    .map(([path, s]) => ({
                        path,
                        count: s.count,
                        errors: s.errors,
                        avgTime: s.count > 0 ? Math.round(s.totalTime / s.count) : 0,
                    })),
            },
            memory: {
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                rss: Math.round(mem.rss / 1024 / 1024),
                external: Math.round(mem.external / 1024 / 1024),
                systemTotal: Math.round(totalMem / 1024 / 1024),
                systemFree: Math.round(freeMem / 1024 / 1024),
                systemUsage: Math.round((1 - freeMem / totalMem) * 100),
            },
            cpu: {
                model: cpus[0] ? cpus[0].model : 'unknown',
                cores: cpus.length,
                loadAvg: os.loadavg().map(l => Math.round(l * 100) / 100),
            },
        };
    }

    // 获取简洁摘要（用于日志/告警）
    getSummary() {
        const s = this.getSnapshot();
        return `[监控] 运行${Math.round(s.server.uptime)}s | ` +
            `请求:${s.requests.currentWindow.count}/min | ` +
            `4xx:${s.requests.currentWindow.error4xx} 5xx:${s.requests.currentWindow.error5xx} | ` +
            `内存:${s.memory.heapUsed}MB | ` +
            `系统内存:${s.memory.systemUsage}%`;
    }
}

// 单例
const metrics = new MetricsCollector();

// ===================================================
// 请求日志中间件
// ===================================================
function requestLogger(req, res, next) {
    const start = Date.now();

    // 记录响应完成
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;

        // 记录到指标收集器
        metrics.recordRequest(req.method, req.path, statusCode, duration);

        // 慢请求警告（超过 1 秒）
        if (duration > 1000) {
            console.warn(`[慢请求] ${req.method} ${req.path} ${statusCode} ${duration}ms`);
        }

        // 5xx 错误日志
        if (statusCode >= 500) {
            console.error(`[5xx错误] ${req.method} ${req.path} ${statusCode} ${duration}ms`);
        }
    });

    next();
}

// ===================================================
// 定时输出监控摘要
// ===================================================
setInterval(() => {
    console.log(metrics.getSummary());
}, 5 * 60 * 1000); // 每 5 分钟

module.exports = { metrics, requestLogger };