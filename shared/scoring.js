// ===================================================
// 排行榜综合得分计算模块
// 说明：本模块实现一套 0-100 分的综合评分体系，用于客观反映学生整体学习效果。
// 各维度权重总和为 100%，每个维度先归一化为 0-100 标准分，再按权重加权求和。
// ===================================================

// 总章节数（对应 ch1~ch19）
const TOTAL_CHAPTERS = 19;

// 各维度权重（合计 1.0 = 100%）
const WEIGHTS = {
    taskCompletion: 0.20,    // 学习任务完成率
    assessment: 0.25,        // 知识测评成绩（课堂小测/阶段测验合并）
    assignment: 0.20,        // 作业完成质量与得分
    participation: 0.15,     // 课堂参与度（线上讨论/每日一题/登录活跃）
    achievement: 0.10,       // 学习成就与习惯
    classPerformance: 0.10   // 课堂表现（教师手动加减分）
};

// 各维度归一化所用上限（用于把“数量类”指标线性映射到 0-100）
const CAPS = {
    discussion: 30,     // 讨论发帖+回复
    dailyQuestion: 30,  // 每日一题作答数
    loginDays: 90,      // 登录天数
    achievement: 20,    // 成就数
    notesCode: 20       // 笔记+代码收藏数
};

// 未批改作业按及格基础分计入（提交即给基本分）
const UNGRADED_ASSIGNMENT_SCORE = 60;

// 无作业布置时的中性分（避免因“老师尚未布置作业”而惩罚学生）
const NO_ASSIGNMENT_NEUTRAL = 60;

function clamp(v, lo = 0, hi = 100) {
    return Math.max(lo, Math.min(hi, v));
}

// 数量类指标线性归一化：value 相对上限 cap 的比例，映射到 0-100
function ratioPart(value, cap) {
    const v = Number(value) || 0;
    if (cap <= 0) return 0;
    return clamp((v / cap) * 100);
}

/**
 * 计算各维度的 0-100 标准分
 * @param {Object} agg 学生维度聚合数据，字段见 leaderboard 路由查询
 * @returns {Object} { taskCompletion, assessment, assignment, participation, achievement }
 */
function computeDimensions(agg) {
    const chapterDone = Number(agg.chapter_done) || 0;
    const assessmentAvg = Number(agg.assessment_avg) || 0;

    // 作业完成质量：缺交 = 0；已交未批改 = 60；有分 = 实得分
    const totalAssignments = Number(agg.totalAssignments) || 0;
    let assignment;
    if (totalAssignments <= 0) {
        assignment = NO_ASSIGNMENT_NEUTRAL;
    } else {
        const gradedSum = Number(agg.assign_graded_sum) || 0;
        const ungraded = Number(agg.assign_ungraded) || 0;
        assignment = clamp((gradedSum + UNGRADED_ASSIGNMENT_SCORE * ungraded) / totalAssignments);
    }

    // 课堂参与度：讨论 40% + 每日一题 30% + 登录活跃 30%
    const discussion = (Number(agg.posts) || 0) + (Number(agg.replies) || 0);
    const participation =
        0.40 * ratioPart(discussion, CAPS.discussion) +
        0.30 * ratioPart(agg.daily_answers, CAPS.dailyQuestion) +
        0.30 * ratioPart(agg.login_days, CAPS.loginDays);

    // 学习成就与习惯：成就 60% + 笔记/代码 40%
    const achievement =
        0.60 * ratioPart(agg.achievements, CAPS.achievement) +
        0.40 * ratioPart(agg.notes_code, CAPS.notesCode);

    // 课堂表现：教师手动加减分（正=加分，负=扣分），基准 50 分并收敛到 0-100
    const classPerformance = clamp(50 + (Number(agg.class_points) || 0));

    return {
        taskCompletion: clamp((chapterDone / TOTAL_CHAPTERS) * 100),
        assessment: clamp(assessmentAvg),
        assignment: clamp(assignment),
        participation: clamp(participation),
        achievement: clamp(achievement),
        classPerformance
    };
}

/**
 * 按权重对各维度标准分加权求和，得到 0-100 综合得分（保留 1 位小数）
 */
function computeTotal(dimensions) {
    let total = 0;
    for (const key of Object.keys(WEIGHTS)) {
        total += (Number(dimensions[key]) || 0) * WEIGHTS[key];
    }
    return Math.round(total * 10) / 10;
}

/**
 * 一次性计算维度分与综合得分
 */
function computeScore(agg) {
    const dimensions = computeDimensions(agg);
    return { dimensions, total: computeTotal(dimensions) };
}

module.exports = {
    TOTAL_CHAPTERS,
    WEIGHTS,
    CAPS,
    UNGRADED_ASSIGNMENT_SCORE,
    NO_ASSIGNMENT_NEUTRAL,
    clamp,
    ratioPart,
    computeDimensions,
    computeTotal,
    computeScore
};