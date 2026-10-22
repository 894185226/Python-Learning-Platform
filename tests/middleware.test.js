// ===================================================
// 中间件模块单元测试
// 运行方式: node --test tests/middleware.test.js
// ===================================================

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// 加载被测模块
const middleware = require('../middleware');
const shared = require('../shared');

// ===================================================
// validatePassword
// ===================================================
describe('validatePassword()', () => {
    it('空字符串应返回错误', () => {
        assert.strictEqual(middleware.validatePassword(''), '密码不能为空');
    });

    it('纯空格应返回错误', () => {
        assert.strictEqual(middleware.validatePassword('   '), '密码不能为空');
    });

    it('非字符串类型应返回错误', () => {
        assert.strictEqual(middleware.validatePassword(123456), '密码不能为空');
        assert.strictEqual(middleware.validatePassword(null), '密码不能为空');
        assert.strictEqual(middleware.validatePassword(undefined), '密码不能为空');
    });

    it('长度不足6位应返回错误', () => {
        assert.strictEqual(middleware.validatePassword('ab1'), '密码至少6位');
        assert.strictEqual(middleware.validatePassword('abc12'), '密码至少6位');
    });

    it('纯数字6位应返回错误', () => {
        assert.strictEqual(middleware.validatePassword('123456'), '密码必须包含字母和数字');
    });

    it('纯字母6位应返回错误', () => {
        assert.strictEqual(middleware.validatePassword('abcdef'), '密码必须包含字母和数字');
    });

    it('字母+数字6位应通过', () => {
        assert.strictEqual(middleware.validatePassword('abc123'), null);
    });

    it('大小写混合字母+数字应通过', () => {
        assert.strictEqual(middleware.validatePassword('Abc12345'), null);
        assert.strictEqual(middleware.validatePassword('Test1234'), null);
    });

    it('特殊字符+字母+数字应通过', () => {
        assert.strictEqual(middleware.validatePassword('abc@12345'), null);
    });

    it('长密码应通过', () => {
        assert.strictEqual(middleware.validatePassword('a'.repeat(50) + '1'), null);
    });
});

// ===================================================
// validateInput
// ===================================================
describe('validateInput()', () => {
    it('空对象应返回 null', () => {
        assert.strictEqual(middleware.validateInput({}), null);
    });

    it('合法字段应返回 null', () => {
        assert.strictEqual(middleware.validateInput({ username: 'test', password: 'abc123' }), null);
    });

    it('空字符串字段应返回错误', () => {
        const err = middleware.validateInput({ username: '' });
        assert.ok(err.includes('不能为空'));
    });

    it('纯空格字段应返回错误', () => {
        const err = middleware.validateInput({ username: '   ' });
        assert.ok(err.includes('不能为空'));
    });

    it('非字符串字段应返回错误', () => {
        const err = middleware.validateInput({ username: 123 });
        assert.ok(err.includes('格式错误'));
    });

    it('超长字段应返回错误', () => {
        const err = middleware.validateInput({ username: 'a'.repeat(101) });
        assert.ok(err.includes('长度不能超过100个字符'));
    });

    it('多字段校验应返回第一个错误', () => {
        const err = middleware.validateInput({ username: '', password: 'abc' });
        assert.ok(err.includes('username'));
    });
});

// ===================================================
// generateCSRFToken
// ===================================================
describe('generateCSRFToken()', () => {
    it('应生成64字符的十六进制字符串', () => {
        const token = middleware.generateCSRFToken();
        assert.strictEqual(typeof token, 'string');
        assert.strictEqual(token.length, 64);
        assert.ok(/^[0-9a-f]+$/.test(token));
    });

    it('每次调用应生成不同的 Token', () => {
        const t1 = middleware.generateCSRFToken();
        const t2 = middleware.generateCSRFToken();
        assert.notStrictEqual(t1, t2);
    });
});

// ===================================================
// sessionAuth（学生会话鉴权）
// ===================================================
function mockRes() {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = function (code) { this.statusCode = code; return this; };
    res.json = function (payload) { this.body = payload; return this; };
    return res;
}

describe('sessionAuth()', () => {
    beforeEach(() => { shared.sessions.clear(); });

    it('缺少 token 应返回 401', () => {
        const req = { headers: {}, body: {} };
        const res = mockRes();
        middleware.sessionAuth(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 401);
    });

    it('无效 token 应返回 401', () => {
        const req = { headers: { 'x-session-token': 'bad-token' }, body: {} };
        const res = mockRes();
        middleware.sessionAuth(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 401);
    });

    it('过期会话应返回 401', () => {
        shared.sessions.set('expired-token', {
            username: 'u', studentId: 1,
            createdAt: Date.now() - shared.SESSION_EXPIRE_MS - 1000
        });
        const req = { headers: { 'x-session-token': 'expired-token' }, body: {} };
        const res = mockRes();
        middleware.sessionAuth(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 401);
    });

    it('有效会话应放行并注入 sessionUser', () => {
        shared.sessions.set('valid-token', { username: 'u', studentId: 1, createdAt: Date.now() });
        const req = { headers: { 'x-session-token': 'valid-token' }, body: {} };
        let called = false;
        middleware.sessionAuth(req, mockRes(), () => { called = true; });
        assert.strictEqual(called, true);
        assert.strictEqual(req.sessionUser.username, 'u');
        assert.strictEqual(req.sessionToken, 'valid-token');
    });
});

// ===================================================
// adminAuth（管理员会话鉴权）
// ===================================================
describe('adminAuth()', () => {
    beforeEach(() => { shared.adminSessions.clear(); });

    it('缺少 token 应返回 401', () => {
        const req = { headers: {} };
        const res = mockRes();
        middleware.adminAuth(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 401);
    });

    it('过期管理员会话应返回 401', () => {
        shared.adminSessions.set('expired-admin', { username: 'admin', expires: Date.now() - 1000 });
        const req = { headers: { 'x-admin-token': 'expired-admin' } };
        const res = mockRes();
        middleware.adminAuth(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 401);
    });

    it('有效管理员会话应放行并注入 adminUser', () => {
        shared.adminSessions.set('valid-admin', { username: 'admin', displayName: '管理员', expires: Date.now() + 60000 });
        const req = { headers: { 'x-admin-token': 'valid-admin' } };
        let called = false;
        middleware.adminAuth(req, mockRes(), () => { called = true; });
        assert.strictEqual(called, true);
        assert.strictEqual(req.adminUser.username, 'admin');
    });
});

// ===================================================
// csrfProtection（CSRF 防护）
// ===================================================
describe('csrfProtection()', () => {
    beforeEach(() => { shared.sessions.clear(); });

    it('GET 请求应跳过校验', () => {
        const req = { method: 'GET', path: '/api/progress/u', headers: {}, body: {} };
        let called = false;
        middleware.csrfProtection(req, mockRes(), () => { called = true; });
        assert.strictEqual(called, true);
    });

    it('豁免路径（登录）应跳过校验', () => {
        const req = { method: 'POST', path: '/api/login', headers: {}, body: {} };
        let called = false;
        middleware.csrfProtection(req, mockRes(), () => { called = true; });
        assert.strictEqual(called, true);
    });

    it('写操作缺少 CSRF token 应返回 403', () => {
        const req = { method: 'POST', path: '/api/progress/mark', headers: {}, body: {} };
        const res = mockRes();
        middleware.csrfProtection(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 403);
    });

    it('会话不存在时应返回 403', () => {
        const req = {
            method: 'POST', path: '/api/progress/mark',
            headers: { 'x-session-token': 'ghost', 'x-csrf-token': 'abc' }, body: {}
        };
        const res = mockRes();
        middleware.csrfProtection(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 403);
    });

    it('CSRF token 不匹配应返回 403', () => {
        shared.sessions.set('s-token', { username: 'u', studentId: 1, csrfToken: 'real-csrf', createdAt: Date.now() });
        const req = {
            method: 'POST', path: '/api/progress/mark',
            headers: { 'x-session-token': 's-token', 'x-csrf-token': 'fake-csrf' }, body: {}
        };
        const res = mockRes();
        middleware.csrfProtection(req, res, () => assert.fail('不应进入 next'));
        assert.strictEqual(res.statusCode, 403);
    });

    it('CSRF token 匹配应放行', () => {
        shared.sessions.set('s-token', { username: 'u', studentId: 1, csrfToken: 'real-csrf', createdAt: Date.now() });
        const req = {
            method: 'POST', path: '/api/progress/mark',
            headers: { 'x-session-token': 's-token', 'x-csrf-token': 'real-csrf' }, body: {}
        };
        let called = false;
        middleware.csrfProtection(req, mockRes(), () => { called = true; });
        assert.strictEqual(called, true);
    });
});