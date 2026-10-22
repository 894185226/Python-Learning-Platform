// ===================================================
// 评分引擎 computeScore() 单元测试
// 运行方式: node --test tests/scoring.test.js
// ===================================================

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    TOTAL_CHAPTERS,
    WEIGHTS,
    CAPS,
    UNGRADED_ASSIGNMENT_SCORE,
    NO_ASSIGNMENT_NEUTRAL,
    clamp,
    ratioPart,
    computeDimensions,
    computeScore,
} = require('../shared/scoring');

// ===================================================
// 常量与权重
// ===================================================
describe('评分权重与常量', () => {
    it('六维权重合计应等于 100%', () => {
        const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(sum - 1.0) < 1e-9, `权重合计应为 1.0，实际 ${sum}`);
    });

    it('权重键应与维度输出一一对应', () => {
        const dims = computeDimensions({});
        assert.deepStrictEqual(Object.keys(dims).sort(), Object.keys(WEIGHTS).sort());
    });

    it('总章节数应为 19', () => {
        assert.strictEqual(TOTAL_CHAPTERS, 19);
    });

    it('未批改作业基础分与无作业中性分应为 60', () => {
        assert.strictEqual(UNGRADED_ASSIGNMENT_SCORE, 60);
        assert.strictEqual(NO_ASSIGNMENT_NEUTRAL, 60);
    });

    it('归一化上限应为正数', () => {
        for (const [key, cap] of Object.entries(CAPS)) {
            assert.ok(cap > 0, `${key} 上限应为正数`);
        }
    });
});

// ===================================================
// 工具函数
// ===================================================
describe('clamp()', () => {
    it('超上限应截断到上限', () => assert.strictEqual(clamp(150), 100));
    it('低于下限应截断到下限', () => assert.strictEqual(clamp(-10), 0));
    it('区间内保持原值', () => assert.strictEqual(clamp(45.5), 45.5));
});

describe('ratioPart()', () => {
    it('按上限线性归一化', () => assert.strictEqual(ratioPart(15, 30), 50));
    it('超过上限应截断到 100', () => assert.strictEqual(ratioPart(35, 30), 100));
    it('非数字输入按 0 处理', () => assert.strictEqual(ratioPart(null, 30), 0));
    it('上限非正数时返回 0', () => assert.strictEqual(ratioPart(10, 0), 0));
});

// ===================================================
// 各维度计算
// ===================================================
describe('computeDimensions()', () => {
    it('空聚合数据应给出确定性基线分（作业60/课堂表现50）', () => {
        const d = computeDimensions({});
        assert.strictEqual(d.taskCompletion, 0);
        assert.strictEqual(d.assessment, 0);
        assert.strictEqual(d.assignment, NO_ASSIGNMENT_NEUTRAL);
        assert.strictEqual(d.participation, 0);
        assert.strictEqual(d.achievement, 0);
        assert.strictEqual(d.classPerformance, 50);
    });

    it('任务完成率：完成全部 19 章应得 100', () => {
        const d = computeDimensions({ chapter_done: 19 });
        assert.strictEqual(d.taskCompletion, 100);
    });

    it('任务完成率：完成一半应得 50', () => {
        const d = computeDimensions({ chapter_done: 9.5 });
        assert.ok(Math.abs(d.taskCompletion - 50) < 1e-9);
    });

    it('作业维度：未批改按 60 分计入', () => {
        const d = computeDimensions({ totalAssignments: 4, assign_graded_sum: 200, assign_ungraded: 1 });
        // (200 + 60) / 4 = 65
        assert.strictEqual(d.assignment, 65);
    });

    it('作业维度：全部未批改应得 60 基础分', () => {
        const d = computeDimensions({ totalAssignments: 4, assign_graded_sum: 0, assign_ungraded: 4 });
        assert.strictEqual(d.assignment, 60);
    });

    it('课堂参与度：讨论40% + 每日一题30% + 登录活跃30%', () => {
        // 讨论 30 帖 + 0 回复 = 100；每日一题 15/30 = 50；登录 45/90 = 50
        // 0.4*100 + 0.3*50 + 0.3*50 = 70
        const d = computeDimensions({ posts: 30, replies: 0, daily_answers: 15, login_days: 45 });
        assert.ok(Math.abs(d.participation - 70) < 1e-9);
    });

    it('成就习惯：成就60% + 笔记代码40%', () => {
        // 成就 10/20 = 50；笔记代码 10/20 = 50 → 0.6*50 + 0.4*50 = 50
        const d = computeDimensions({ achievements: 10, notes_code: 10 });
        assert.strictEqual(d.achievement, 50);
    });

    it('课堂表现：基准 50 + 加减分，收敛到 0-100', () => {
        assert.strictEqual(computeDimensions({ class_points: 80 }).classPerformance, 100);
        assert.strictEqual(computeDimensions({ class_points: -100 }).classPerformance, 0);
        assert.strictEqual(computeDimensions({ class_points: -25 }).classPerformance, 25);
        assert.strictEqual(computeDimensions({ class_points: 10 }).classPerformance, 60);
    });

    it('知识测评分应截断到 0-100', () => {
        assert.strictEqual(computeDimensions({ assessment_avg: 120 }).assessment, 100);
        assert.strictEqual(computeDimensions({ assessment_avg: -5 }).assessment, 0);
    });
});

// ===================================================
// 综合得分
// ===================================================
describe('computeScore()', () => {
    it('空数据综合得分 = 60*0.2 + 50*0.1 = 17.0', () => {
        const { total } = computeScore({});
        assert.strictEqual(total, 17.0);
    });

    it('满分聚合数据应得 100.0', () => {
        const { dimensions, total } = computeScore({
            chapter_done: 19,
            assessment_avg: 100,
            totalAssignments: 1,
            assign_graded_sum: 100,
            assign_ungraded: 0,
            posts: 30,
            replies: 0,
            daily_answers: 30,
            login_days: 90,
            achievements: 20,
            notes_code: 20,
            class_points: 50,
        });
        for (const [key, v] of Object.entries(dimensions)) {
            assert.strictEqual(v, 100, `${key} 应为 100，实际 ${v}`);
        }
        assert.strictEqual(total, 100.0);
    });

    it('综合得分始终在 0-100 之间', () => {
        const { total } = computeScore({ chapter_done: 100, assessment_avg: 500, class_points: -1000 });
        assert.ok(total >= 0 && total <= 100, `得分越界: ${total}`);
    });

    it('综合得分保留 1 位小数', () => {
        // 任务完成 1 章 ≈ 5.263… → 加权后产生小数
        const { total } = computeScore({ chapter_done: 1 });
        assert.ok(Math.abs(total * 10 - Math.round(total * 10)) < 1e-9);
    });
});
