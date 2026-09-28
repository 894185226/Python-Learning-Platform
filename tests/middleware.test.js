// ===================================================
// 中间件模块单元测试
// 运行方式: node --test tests/middleware.test.js
// ===================================================

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// 加载被测模块
const middleware = require('../middleware');

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