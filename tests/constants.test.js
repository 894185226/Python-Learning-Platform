// ===================================================
// 共享常量一致性单元测试
// 运行方式: node --test tests/constants.test.js
// ===================================================

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    VALID_MODULES,
    VALID_ACHIEVEMENTS,
    MODULE_NAMES,
    ACHIEVEMENT_NAMES,
    CHAPTER_NAMES,
    TOTAL_MODULES,
} = require('../constants');

describe('模块白名单 VALID_MODULES', () => {
    it('TOTAL_MODULES 应与白名单长度一致（防止硬编码不同步）', () => {
        assert.strictEqual(TOTAL_MODULES, VALID_MODULES.length);
    });

    it('白名单不应包含重复模块 ID', () => {
        assert.strictEqual(new Set(VALID_MODULES).size, VALID_MODULES.length);
    });

    it('应包含全部 19 个章节完成标记', () => {
        const marks = VALID_MODULES.filter(m => /^chapter_ch\d+$/.test(m));
        assert.strictEqual(marks.length, 19);
        for (let i = 1; i <= 19; i++) {
            assert.ok(marks.includes('chapter_ch' + i), `缺少 chapter_ch${i}`);
        }
    });

    it('每章应有且仅有一个课堂小测模块（ch2 为 ch2_test，其余为 chX_quiz）', () => {
        const quizzes = VALID_MODULES.filter(m => /^ch\d+_(quiz|test)$/.test(m));
        assert.strictEqual(quizzes.length, 19);
        assert.ok(quizzes.includes('ch2_test'), '缺少 ch2_test');
        for (let i = 1; i <= 19; i++) {
            if (i === 2) continue;
            assert.ok(quizzes.includes('ch' + i + '_quiz'), `缺少 ch${i}_quiz`);
        }
    });

    it('每个模块 ID 都应有中文名称映射（管理后台展示依赖）', () => {
        for (const id of VALID_MODULES) {
            assert.ok(MODULE_NAMES[id], `模块 ${id} 缺少 MODULE_NAMES 映射`);
        }
    });
});

describe('成就白名单 VALID_ACHIEVEMENTS', () => {
    it('不应包含重复成就 ID', () => {
        assert.strictEqual(new Set(VALID_ACHIEVEMENTS).size, VALID_ACHIEVEMENTS.length);
    });

    it('每个成就 ID 都应有名称映射', () => {
        for (const id of VALID_ACHIEVEMENTS) {
            assert.ok(ACHIEVEMENT_NAMES[id], `成就 ${id} 缺少 ACHIEVEMENT_NAMES 映射`);
        }
    });

    it('应包含 19 个章节成就、4 个里程碑与终极成就', () => {
        const chapters = VALID_ACHIEVEMENTS.filter(a => /^ch\d+_done$/.test(a));
        assert.strictEqual(chapters.length, 19);
        for (const m of ['milestone_beginner', 'milestone_flow', 'milestone_data', 'milestone_advance', 'champion']) {
            assert.ok(VALID_ACHIEVEMENTS.includes(m), `缺少成就 ${m}`);
        }
    });
});

describe('章节名称映射 CHAPTER_NAMES', () => {
    it('应覆盖 ch1 到 ch19', () => {
        assert.strictEqual(Object.keys(CHAPTER_NAMES).length, 19);
        for (let i = 1; i <= 19; i++) {
            assert.ok(CHAPTER_NAMES['ch' + i], `缺少 ch${i} 的名称映射`);
        }
    });
});
