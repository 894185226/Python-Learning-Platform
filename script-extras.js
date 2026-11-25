// ===== 扩展功能模块（初始化入口） =====
// 各扩展功能已拆分到 extras/ 目录（按加载顺序）：
//   extras/leaderboard.js  - 学习排行榜、班级综合排行
//   extras/study.js        - 错题本、学习报告、学习日历、学习笔记、代码收藏
//   extras/interaction.js  - 消息通知、学习目标、作业、讨论区章节常量
//   extras/community.js    - 讨论区、每日一题、语音朗读
// 本文件仅负责 DOM 就绪后统一初始化各扩展功能
// 依赖：script.js 核心函数（getCurrentUser / API / showToast / escHtml 等）+ 上述 extras/*.js

console.log('%c[script-extras.js] 扩展功能已加载', 'color:#04AA6D;font-weight:bold');

// ================================================================
//   DOM 就绪后初始化扩展功能
// ================================================================
function initExtras() {
    initNotificationPolling();
    checkDailyQuestionStatus();
    renderStudyCalendar('calendarGrid');
    updateStudyStreak();
    initNotePanelObserver();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtras);
} else {
    initExtras();
}
