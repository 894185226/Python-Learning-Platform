// ============================================================
// Python 基础学习平台 - 共享常量
// 供 server.js 和 admin.js 共同引用，避免白名单重复维护
// ============================================================

// 模块 ID 白名单（全部有效模块 ID）
const VALID_MODULES = [
    // 变量模块（第2章）子模块
    'ch2_intro','ch2_lab','ch2_lesson','ch2_judge','ch2_practice','ch2_trace','ch2_debug','ch2_extend','ch2_project','ch2_test',
    // 章节完成标记
    'chapter_ch1','chapter_ch2','chapter_ch3','chapter_ch4','chapter_ch5','chapter_ch6','chapter_ch7','chapter_ch8','chapter_ch9','chapter_ch10',
    'chapter_ch11','chapter_ch12','chapter_ch13','chapter_ch14','chapter_ch15','chapter_ch16','chapter_ch17','chapter_ch18','chapter_ch19',
    // 第1章 认识Python
    'ch1_intro','ch1_knowledge','ch1_lab','ch1_practice','ch1_debug','ch1_quiz',
    // 第3章 变量类型
    'ch3_intro','ch3_knowledge','ch3_lab','ch3_practice','ch3_debug','ch3_extend','ch3_project','ch3_quiz',
    // 第4章 条件判断
    'ch4_intro','ch4_knowledge','ch4_lab','ch4_practice','ch4_debug','ch4_extend','ch4_project','ch4_quiz',
    // 第5章 if进阶
    'ch5_intro','ch5_knowledge','ch5_lab','ch5_practice','ch5_debug','ch5_extend','ch5_project','ch5_quiz',
    // 第6章 while循环
    'ch6_intro','ch6_knowledge','ch6_lab','ch6_practice','ch6_debug','ch6_extend','ch6_project','ch6_quiz',
    // 第7章 while拓展
    'ch7_intro','ch7_knowledge','ch7_lab','ch7_practice','ch7_debug','ch7_extend','ch7_project','ch7_quiz',
    // 第8章 循环嵌套
    'ch8_intro','ch8_knowledge','ch8_lab','ch8_practice','ch8_debug','ch8_extend','ch8_project','ch8_quiz',
    // 第9章 综合应用一
    'ch9_intro','ch9_knowledge','ch9_lab','ch9_practice','ch9_debug','ch9_extend','ch9_project','ch9_quiz',
    // 第10章 排列小星星
    'ch10_intro','ch10_knowledge','ch10_lab','ch10_practice','ch10_debug','ch10_extend','ch10_project','ch10_quiz',
    // 第11章 初识列表
    'ch11_intro','ch11_knowledge','ch11_lab','ch11_practice','ch11_debug','ch11_extend','ch11_project','ch11_quiz',
    // 第12章 列表的使用
    'ch12_intro','ch12_knowledge','ch12_lab','ch12_practice','ch12_debug','ch12_extend','ch12_project','ch12_quiz',
    // 第13章 元组与集合
    'ch13_intro','ch13_knowledge','ch13_lab','ch13_practice','ch13_debug','ch13_extend','ch13_project','ch13_quiz',
    // 第14章 神奇的字典
    'ch14_intro','ch14_knowledge','ch14_lab','ch14_practice','ch14_debug','ch14_extend','ch14_project','ch14_quiz',
    // 第15章 再遇字符串
    'ch15_intro','ch15_knowledge','ch15_lab','ch15_practice','ch15_debug','ch15_extend','ch15_project','ch15_quiz',
    // 第16章 公共语法
    'ch16_intro','ch16_knowledge','ch16_lab','ch16_practice','ch16_debug','ch16_extend','ch16_project','ch16_quiz',
    // 第17章 轻松搞定二进制
    'ch17_intro','ch17_knowledge','ch17_lab','ch17_practice','ch17_debug','ch17_extend','ch17_project','ch17_quiz',
    // 第18章 编程思维实践
    'ch18_intro','ch18_knowledge','ch18_lab','ch18_practice','ch18_debug','ch18_extend','ch18_project','ch18_quiz',
    // 第19章 各种各样的数
    'ch19_intro','ch19_knowledge','ch19_lab','ch19_practice','ch19_debug','ch19_extend','ch19_project','ch19_quiz'
];

// 成就 ID 白名单
const VALID_ACHIEVEMENTS = [
    'ch1_done','ch2_done','ch3_done','ch4_done','ch5_done','ch6_done','ch7_done','ch8_done','ch9_done',
    'ch10_done','ch11_done','ch12_done','ch13_done','ch14_done','ch15_done','ch16_done','ch17_done','ch18_done','ch19_done',
    'milestone_beginner','milestone_flow','milestone_data','milestone_advance','champion',
    'beginner','judge','debugger','creator','tracer','explorer','coder'
];

// 模块名称映射（前端管理后台使用）
const MODULE_NAMES = {
    // 变量模块（第2章）子模块
    'ch2_intro': 'Ch2-情境导入', 'ch2_lab': 'Ch2-类比实验室', 'ch2_lesson': 'Ch2-知识讲解',
    'ch2_judge': 'Ch2-命名小法官', 'ch2_practice': 'Ch2-实践操作', 'ch2_trace': 'Ch2-值追踪',
    'ch2_debug': 'Ch2-错误调试', 'ch2_extend': 'Ch2-拓展延伸', 'ch2_project': 'Ch2-创意项目', 'ch2_test': 'Ch2-综合测试',
    // 章节完成标记
    'chapter_ch1': '第1章完成', 'chapter_ch2': '第2章完成', 'chapter_ch3': '第3章完成',
    'chapter_ch4': '第4章完成', 'chapter_ch5': '第5章完成', 'chapter_ch6': '第6章完成',
    'chapter_ch7': '第7章完成', 'chapter_ch8': '第8章完成', 'chapter_ch9': '第9章完成',
    'chapter_ch10': '第10章完成', 'chapter_ch11': '第11章完成', 'chapter_ch12': '第12章完成',
    'chapter_ch13': '第13章完成', 'chapter_ch14': '第14章完成', 'chapter_ch15': '第15章完成',
    'chapter_ch16': '第16章完成', 'chapter_ch17': '第17章完成', 'chapter_ch18': '第18章完成',
    'chapter_ch19': '第19章完成',
    // 第1章 认识Python
    'ch1_intro': 'Ch1-情境导入', 'ch1_knowledge': 'Ch1-知识讲解', 'ch1_lab': 'Ch1-类比实验室',
    'ch1_practice': 'Ch1-实践操作', 'ch1_debug': 'Ch1-错误调试', 'ch1_quiz': 'Ch1-综合测试',
    // 第3章 变量类型
    'ch3_intro': 'Ch3-情境导入', 'ch3_knowledge': 'Ch3-知识讲解', 'ch3_lab': 'Ch3-类比实验室',
    'ch3_practice': 'Ch3-实践操作', 'ch3_debug': 'Ch3-错误调试', 'ch3_extend': 'Ch3-拓展延伸',
    'ch3_project': 'Ch3-创意项目', 'ch3_quiz': 'Ch3-综合测试',
    // 第4章 条件判断
    'ch4_intro': 'Ch4-情境导入', 'ch4_knowledge': 'Ch4-知识讲解', 'ch4_lab': 'Ch4-类比实验室',
    'ch4_practice': 'Ch4-实践操作', 'ch4_debug': 'Ch4-错误调试', 'ch4_extend': 'Ch4-拓展延伸',
    'ch4_project': 'Ch4-创意项目', 'ch4_quiz': 'Ch4-综合测试',
    // 第5章 if进阶
    'ch5_intro': 'Ch5-情境导入', 'ch5_knowledge': 'Ch5-知识讲解', 'ch5_lab': 'Ch5-类比实验室',
    'ch5_practice': 'Ch5-实践操作', 'ch5_debug': 'Ch5-错误调试', 'ch5_extend': 'Ch5-拓展延伸',
    'ch5_project': 'Ch5-创意项目', 'ch5_quiz': 'Ch5-综合测试',
    // 第6章 while循环
    'ch6_intro': 'Ch6-情境导入', 'ch6_knowledge': 'Ch6-知识讲解', 'ch6_lab': 'Ch6-类比实验室',
    'ch6_practice': 'Ch6-实践操作', 'ch6_debug': 'Ch6-错误调试', 'ch6_extend': 'Ch6-拓展延伸',
    'ch6_project': 'Ch6-创意项目', 'ch6_quiz': 'Ch6-综合测试',
    // 第7章 while拓展
    'ch7_intro': 'Ch7-情境导入', 'ch7_knowledge': 'Ch7-知识讲解', 'ch7_lab': 'Ch7-类比实验室',
    'ch7_practice': 'Ch7-实践操作', 'ch7_debug': 'Ch7-错误调试', 'ch7_extend': 'Ch7-拓展延伸',
    'ch7_project': 'Ch7-创意项目', 'ch7_quiz': 'Ch7-综合测试',
    // 第8章 循环嵌套
    'ch8_intro': 'Ch8-情境导入', 'ch8_knowledge': 'Ch8-知识讲解', 'ch8_lab': 'Ch8-类比实验室',
    'ch8_practice': 'Ch8-实践操作', 'ch8_debug': 'Ch8-错误调试', 'ch8_extend': 'Ch8-拓展延伸',
    'ch8_project': 'Ch8-创意项目', 'ch8_quiz': 'Ch8-综合测试',
    // 第9章 综合应用一
    'ch9_intro': 'Ch9-情境导入', 'ch9_knowledge': 'Ch9-知识讲解', 'ch9_lab': 'Ch9-类比实验室',
    'ch9_practice': 'Ch9-实践操作', 'ch9_debug': 'Ch9-错误调试', 'ch9_extend': 'Ch9-拓展延伸',
    'ch9_project': 'Ch9-创意项目', 'ch9_quiz': 'Ch9-综合测试',
    // 第10章 排列小星星
    'ch10_intro': 'Ch10-情境导入', 'ch10_knowledge': 'Ch10-知识讲解', 'ch10_lab': 'Ch10-类比实验室',
    'ch10_practice': 'Ch10-实践操作', 'ch10_debug': 'Ch10-错误调试', 'ch10_extend': 'Ch10-拓展延伸',
    'ch10_project': 'Ch10-创意项目', 'ch10_quiz': 'Ch10-综合测试',
    // 第11章 初识列表
    'ch11_intro': 'Ch11-情境导入', 'ch11_knowledge': 'Ch11-知识讲解', 'ch11_lab': 'Ch11-类比实验室',
    'ch11_practice': 'Ch11-实践操作', 'ch11_debug': 'Ch11-错误调试', 'ch11_extend': 'Ch11-拓展延伸',
    'ch11_project': 'Ch11-创意项目', 'ch11_quiz': 'Ch11-综合测试',
    // 第12章 列表的使用
    'ch12_intro': 'Ch12-情境导入', 'ch12_knowledge': 'Ch12-知识讲解', 'ch12_lab': 'Ch12-类比实验室',
    'ch12_practice': 'Ch12-实践操作', 'ch12_debug': 'Ch12-错误调试', 'ch12_extend': 'Ch12-拓展延伸',
    'ch12_project': 'Ch12-创意项目', 'ch12_quiz': 'Ch12-综合测试',
    // 第13章 元组与集合
    'ch13_intro': 'Ch13-情境导入', 'ch13_knowledge': 'Ch13-知识讲解', 'ch13_lab': 'Ch13-类比实验室',
    'ch13_practice': 'Ch13-实践操作', 'ch13_debug': 'Ch13-错误调试', 'ch13_extend': 'Ch13-拓展延伸',
    'ch13_project': 'Ch13-创意项目', 'ch13_quiz': 'Ch13-综合测试',
    // 第14章 神奇的字典
    'ch14_intro': 'Ch14-情境导入', 'ch14_knowledge': 'Ch14-知识讲解', 'ch14_lab': 'Ch14-类比实验室',
    'ch14_practice': 'Ch14-实践操作', 'ch14_debug': 'Ch14-错误调试', 'ch14_extend': 'Ch14-拓展延伸',
    'ch14_project': 'Ch14-创意项目', 'ch14_quiz': 'Ch14-综合测试',
    // 第15章 再遇字符串
    'ch15_intro': 'Ch15-情境导入', 'ch15_knowledge': 'Ch15-知识讲解', 'ch15_lab': 'Ch15-类比实验室',
    'ch15_practice': 'Ch15-实践操作', 'ch15_debug': 'Ch15-错误调试', 'ch15_extend': 'Ch15-拓展延伸',
    'ch15_project': 'Ch15-创意项目', 'ch15_quiz': 'Ch15-综合测试',
    // 第16章 公共语法
    'ch16_intro': 'Ch16-情境导入', 'ch16_knowledge': 'Ch16-知识讲解', 'ch16_lab': 'Ch16-类比实验室',
    'ch16_practice': 'Ch16-实践操作', 'ch16_debug': 'Ch16-错误调试', 'ch16_extend': 'Ch16-拓展延伸',
    'ch16_project': 'Ch16-创意项目', 'ch16_quiz': 'Ch16-综合测试',
    // 第17章 轻松搞定二进制
    'ch17_intro': 'Ch17-情境导入', 'ch17_knowledge': 'Ch17-知识讲解', 'ch17_lab': 'Ch17-类比实验室',
    'ch17_practice': 'Ch17-实践操作', 'ch17_debug': 'Ch17-错误调试', 'ch17_extend': 'Ch17-拓展延伸',
    'ch17_project': 'Ch17-创意项目', 'ch17_quiz': 'Ch17-综合测试',
    // 第18章 编程思维实践
    'ch18_intro': 'Ch18-情境导入', 'ch18_knowledge': 'Ch18-知识讲解', 'ch18_lab': 'Ch18-类比实验室',
    'ch18_practice': 'Ch18-实践操作', 'ch18_debug': 'Ch18-错误调试', 'ch18_extend': 'Ch18-拓展延伸',
    'ch18_project': 'Ch18-创意项目', 'ch18_quiz': 'Ch18-综合测试',
    // 第19章 各种各样的数
    'ch19_intro': 'Ch19-情境导入', 'ch19_knowledge': 'Ch19-知识讲解', 'ch19_lab': 'Ch19-类比实验室',
    'ch19_practice': 'Ch19-实践操作', 'ch19_debug': 'Ch19-错误调试', 'ch19_extend': 'Ch19-拓展延伸',
    'ch19_project': 'Ch19-创意项目', 'ch19_quiz': 'Ch19-综合测试'
};

// 成就名称映射
const ACHIEVEMENT_NAMES = {
    'ch1_done': 'Python初识', 'ch2_done': '变量大师', 'ch3_done': '类型专家',
    'ch4_done': '判断达人', 'ch5_done': '逻辑高手', 'ch6_done': '循环入门',
    'ch7_done': '控制大师', 'ch8_done': '嵌套高手', 'ch9_done': '综合应用',
    'ch10_done': '星星画家', 'ch11_done': '列表新手', 'ch12_done': '列表达人',
    'ch13_done': '数据结构', 'ch14_done': '字典高手', 'ch15_done': '字符串专家',
    'ch16_done': '语法精通', 'ch17_done': '二进制通', 'ch18_done': '编程思维',
    'ch19_done': '数之奥秘',
    'milestone_beginner': '入门先锋', 'milestone_flow': '流程掌控',
    'milestone_data': '数据大师', 'milestone_advance': '进阶达人',
    'champion': 'Python王者',
    'beginner': '初出茅庐', 'judge': '火眼金睛', 'debugger': '调试高手',
    'creator': '创意无限', 'tracer': '侦探大师', 'explorer': '类型探索者', 'coder': '编程达人'
};

// 章节名称映射（供管理后台使用，单一数据源）
// 注意：仅包含章节级别 ID（ch1~ch19），不包含子模块 ID（如 ch1_intro）
// 如需修改章节名称，请在此处统一更新
const CHAPTER_NAMES = {
    'ch1': '第1章 认识Python', 'ch2': '第2章 变量', 'ch3': '第3章 变量类型',
    'ch4': '第4章 条件判断', 'ch5': '第5章 if进阶', 'ch6': '第6章 while循环',
    'ch7': '第7章 while拓展', 'ch8': '第8章 循环嵌套', 'ch9': '第9章 综合应用一',
    'ch10': '第10章 排列小星星', 'ch11': '第11章 初识列表', 'ch12': '第12章 列表的使用',
    'ch13': '第13章 元组与集合', 'ch14': '第14章 神奇的字典', 'ch15': '第15章 再遇字符串',
    'ch16': '第16章 公共语法', 'ch17': '第17章 轻松搞定二进制', 'ch18': '第18章 编程思维实践',
    'ch19': '第19章 各种各样的数'
};

// 全部模块总数
const TOTAL_MODULES = 171;

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VALID_MODULES,
        VALID_ACHIEVEMENTS,
        MODULE_NAMES,
        ACHIEVEMENT_NAMES,
        CHAPTER_NAMES,
        TOTAL_MODULES
    };
}