// ===================================================
// 监控模块单元测试
// 使用 Node.js 内置 node:test 模块（Node 18+）
// 运行方式: node --test tests/monitor.test.js
// ===================================================

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// 停止自动轮转的定时器（避免干扰测试）
const origSetInterval = global.setInterval;
const timers = [];

// 在加载模块前拦截 setInterval
global.setInterval = function (fn, ms, ...args) {
    const id = origSetInterval(fn, ms, ...args);
    timers.push(id);
    return id;
};

// 加载被测模块
const { metrics } = require('../shared/monitor');

// 清理所有定时器
function clearAllTimers() {
    for (const id of timers) {
        clearInterval(id);
    }
    timers.length = 0;
}

// 恢复原始 setInterval
function restoreSetInterval() {
    global.setInterval = origSetInterval;
}

// ===================================================
// 测试套件
// ===================================================
describe('MetricsCollector', () => {
    beforeEach(() => {
        // 每个测试前重置指标
        metrics.reset();
    });

    afterEach(() => {
        clearAllTimers();
    });

    // ---------- recordRequest ----------
    describe('recordRequest()', () => {
        it('应正确增加请求计数', () => {
            metrics.recordRequest('GET', '/api/health', 200, 15);
            assert.strictEqual(metrics.current.requestCount, 1);
            assert.strictEqual(metrics.total.requestCount, 1);
        });

        it('应正确累加响应时间', () => {
            metrics.recordRequest('GET', '/api/test', 200, 10);
            metrics.recordRequest('GET', '/api/test', 200, 20);
            assert.strictEqual(metrics.current.totalResponseTime, 30);
        });

        it('应正确追踪最大响应时间', () => {
            metrics.recordRequest('GET', '/api/test', 200, 5);
            metrics.recordRequest('GET', '/api/test', 200, 50);
            metrics.recordRequest('GET', '/api/test', 200, 30);
            assert.strictEqual(metrics.current.maxResponseTime, 50);
        });

        it('应正确追踪最小响应时间', () => {
            metrics.recordRequest('GET', '/api/test', 200, 50);
            metrics.recordRequest('GET', '/api/test', 200, 5);
            metrics.recordRequest('GET', '/api/test', 200, 30);
            assert.strictEqual(metrics.current.minResponseTime, 5);
        });

        it('应正确分类 4xx 错误', () => {
            metrics.recordRequest('GET', '/api/nonexistent', 404, 5);
            metrics.recordRequest('POST', '/api/login', 401, 10);
            assert.strictEqual(metrics.current.error4xx, 2);
            assert.strictEqual(metrics.current.error5xx, 0);
            assert.strictEqual(metrics.total.error4xx, 2);
        });

        it('应正确分类 5xx 错误', () => {
            metrics.recordRequest('GET', '/api/error', 500, 100);
            metrics.recordRequest('GET', '/api/timeout', 503, 200);
            assert.strictEqual(metrics.current.error5xx, 2);
            assert.strictEqual(metrics.current.error4xx, 0);
            assert.strictEqual(metrics.total.error5xx, 2);
        });

        it('应正确按路径统计', () => {
            metrics.recordRequest('GET', '/api/health', 200, 5);
            metrics.recordRequest('GET', '/api/health', 200, 10);
            metrics.recordRequest('GET', '/api/status', 200, 8);
            assert.strictEqual(metrics.current.pathStats['/api/health'].count, 2);
            assert.strictEqual(metrics.current.pathStats['/api/status'].count, 1);
        });

        it('路径统计应包含错误计数', () => {
            metrics.recordRequest('GET', '/api/bad', 404, 5);
            metrics.recordRequest('GET', '/api/bad', 500, 10);
            assert.strictEqual(metrics.current.pathStats['/api/bad'].errors, 2);
        });
    });

    // ---------- getSnapshot ----------
    describe('getSnapshot()', () => {
        it('应返回正确的快照结构', () => {
            metrics.recordRequest('GET', '/api/health', 200, 10);
            const snap = metrics.getSnapshot();

            // 验证顶层字段
            assert.ok(snap.server);
            assert.ok(snap.requests);
            assert.ok(snap.memory);
            assert.ok(snap.cpu);

            // 验证 server 字段
            assert.ok(typeof snap.server.uptime === 'number');
            assert.ok(snap.server.nodeVersion);
            assert.ok(snap.server.platform);

            // 验证 requests 字段
            assert.strictEqual(snap.requests.currentWindow.count, 1);
            assert.strictEqual(snap.requests.currentWindow.avgResponseTime, 10);
            assert.strictEqual(snap.requests.currentWindow.error4xx, 0);
            assert.strictEqual(snap.requests.currentWindow.error5xx, 0);
            assert.strictEqual(snap.requests.currentWindow.errorRate, 0);
            assert.strictEqual(snap.requests.total.requestCount, 1);

            // 验证 memory 字段
            assert.ok(typeof snap.memory.heapUsed === 'number');
            assert.ok(typeof snap.memory.systemUsage === 'number');

            // 验证 cpu 字段
            assert.ok(typeof snap.cpu.cores === 'number');
        });

        it('无请求时错误率应为 0', () => {
            const snap = metrics.getSnapshot();
            assert.strictEqual(snap.requests.currentWindow.count, 0);
            assert.strictEqual(snap.requests.currentWindow.errorRate, 0);
            assert.strictEqual(snap.requests.currentWindow.avgResponseTime, 0);
            assert.strictEqual(snap.requests.currentWindow.maxResponseTime, 0);
            assert.strictEqual(snap.requests.currentWindow.minResponseTime, 0);
        });

        it('错误率应正确计算', () => {
            metrics.recordRequest('GET', '/', 200, 10);   // 成功
            metrics.recordRequest('GET', '/x', 404, 5);    // 4xx
            metrics.recordRequest('GET', '/y', 500, 20);   // 5xx
            // 2/4 = 50% 错误率
            metrics.recordRequest('GET', '/z', 200, 10);   // 成功
            const snap = metrics.getSnapshot();
            assert.strictEqual(snap.requests.currentWindow.count, 4);
            assert.strictEqual(snap.requests.currentWindow.errorRate, 50);
        });

        it('topPaths 应按请求数降序排列', () => {
            metrics.recordRequest('GET', '/api/a', 200, 1);
            metrics.recordRequest('GET', '/api/b', 200, 1);
            metrics.recordRequest('GET', '/api/b', 200, 1);
            metrics.recordRequest('GET', '/api/c', 200, 1);
            metrics.recordRequest('GET', '/api/c', 200, 1);
            metrics.recordRequest('GET', '/api/c', 200, 1);
            const snap = metrics.getSnapshot();
            assert.strictEqual(snap.requests.topPaths[0].path, '/api/c');
            assert.strictEqual(snap.requests.topPaths[0].count, 3);
            assert.strictEqual(snap.requests.topPaths[1].path, '/api/b');
            assert.strictEqual(snap.requests.topPaths[1].count, 2);
        });

        it('previousWindow 初始应为 null', () => {
            const snap = metrics.getSnapshot();
            assert.strictEqual(snap.requests.previousWindow, null);
        });
    });

    // ---------- getSummary ----------
    describe('getSummary()', () => {
        it('应返回格式正确的摘要字符串', () => {
            metrics.recordRequest('GET', '/api/health', 200, 10);
            const summary = metrics.getSummary();
            assert.ok(summary.startsWith('[监控]'));
            assert.ok(summary.includes('请求:'));
            assert.ok(summary.includes('4xx:'));
            assert.ok(summary.includes('5xx:'));
            assert.ok(summary.includes('内存:'));
            assert.ok(summary.includes('系统内存:'));
        });
    });

    // ---------- rotate ----------
    describe('rotate()', () => {
        it('旋转后 previous 应包含上一个窗口的数据', () => {
            metrics.recordRequest('GET', '/api/test', 200, 10);
            metrics.recordRequest('GET', '/api/test', 404, 5);
            assert.strictEqual(metrics.current.requestCount, 2);

            metrics.rotate();

            // 旋转后 current 应重置
            assert.strictEqual(metrics.current.requestCount, 0);
            assert.strictEqual(metrics.current.error4xx, 0);
            assert.strictEqual(metrics.current.maxResponseTime, 0);
            assert.strictEqual(metrics.current.minResponseTime, Infinity);

            // previous 应包含旧数据
            assert.ok(metrics.previous !== null);
            assert.strictEqual(metrics.previous.requestCount, 2);
            assert.strictEqual(metrics.previous.error4xx, 1);
        });

        it('旋转后 snapshot 的 previousWindow 应包含正确数据', () => {
            metrics.recordRequest('GET', '/api/test', 200, 10);
            metrics.recordRequest('GET', '/api/test', 500, 20);
            metrics.rotate();
            metrics.recordRequest('GET', '/api/new', 200, 5);

            const snap = metrics.getSnapshot();
            assert.strictEqual(snap.requests.currentWindow.count, 1);
            assert.ok(snap.requests.previousWindow !== null);
            assert.strictEqual(snap.requests.previousWindow.count, 2);
            assert.strictEqual(snap.requests.previousWindow.error5xx, 1);
        });

        it('多次旋转后累计数据应保持不变', () => {
            metrics.recordRequest('GET', '/api/test', 200, 10);
            metrics.recordRequest('GET', '/api/test', 404, 5);
            assert.strictEqual(metrics.total.requestCount, 2);
            assert.strictEqual(metrics.total.error4xx, 1);

            metrics.rotate();
            metrics.recordRequest('GET', '/api/test', 500, 20);
            assert.strictEqual(metrics.total.requestCount, 3);
            assert.strictEqual(metrics.total.error5xx, 1);

            metrics.rotate();
            assert.strictEqual(metrics.total.requestCount, 3);
            assert.strictEqual(metrics.total.error4xx, 1);
            assert.strictEqual(metrics.total.error5xx, 1);
        });
    });

    // ---------- reset ----------
    describe('reset()', () => {
        it('应重置所有计数器和状态', () => {
            metrics.recordRequest('GET', '/api/test', 200, 10);
            metrics.recordRequest('GET', '/api/test', 404, 5);
            metrics.rotate();
            metrics.recordRequest('GET', '/api/test', 500, 20);

            metrics.reset();

            assert.strictEqual(metrics.current.requestCount, 0);
            assert.strictEqual(metrics.current.error4xx, 0);
            assert.strictEqual(metrics.current.error5xx, 0);
            assert.strictEqual(metrics.current.maxResponseTime, 0);
            assert.strictEqual(metrics.current.minResponseTime, Infinity);
            assert.strictEqual(Object.keys(metrics.current.pathStats).length, 0);
            assert.strictEqual(metrics.previous, null);
            assert.strictEqual(metrics.total.requestCount, 0);
            assert.strictEqual(metrics.total.error4xx, 0);
            assert.strictEqual(metrics.total.error5xx, 0);
        });
    });

    // ---------- 边界情况 ----------
    describe('边界情况', () => {
        it('大量请求下 pathStats 不应溢出', () => {
            for (let i = 0; i < 1000; i++) {
                metrics.recordRequest('GET', `/api/endpoint_${i}`, 200, i % 100);
            }
            const snap = metrics.getSnapshot();
            assert.strictEqual(snap.requests.currentWindow.count, 1000);
            assert.strictEqual(snap.requests.topPaths.length, 10); // 只返回 Top 10
        });

        it('单次请求应正确计算平均值', () => {
            metrics.recordRequest('GET', '/api/solo', 200, 42);
            const snap = metrics.getSnapshot();
            assert.strictEqual(snap.requests.currentWindow.avgResponseTime, 42);
        });

        it('statusCode < 400 不应计为错误', () => {
            metrics.recordRequest('GET', '/', 200, 10);
            metrics.recordRequest('GET', '/', 301, 5);
            metrics.recordRequest('GET', '/', 304, 2);
            assert.strictEqual(metrics.current.error4xx, 0);
            assert.strictEqual(metrics.current.error5xx, 0);
        });
    });
});

// 清理
process.on('exit', () => {
    restoreSetInterval();
    clearAllTimers();
});