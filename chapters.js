﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// Python基础学习平台 - 章节数据
const CHAPTERS = [
    // ============================================================
    // 第1章：认识Python
    // ============================================================
    {
        id: 'ch1',
        num: 1,
        title: '认识Python',
        subtitle: '开启编程之旅',
        icon: '🐍',
        desc: '了解Python，编写第一行代码',
        badge: '入门',
        color: '#04AA6D',        objectives: ['了解Python语言的特点和用途', '掌握print()函数的基本用法', '能够编写简单的Python程序'],
        duration: '25',
        modules: [
            {
                id: 'ch1_intro',
                title: '情境导入',
                icon: '🎬',
                type: 'intro',
                render: null
            },
            {
                id: 'ch1_knowledge',
                title: '知识讲解',
                icon: '📚',
                type: 'knowledge',
                render: null
            },
            {
                id: 'ch1_lab',
                title: '互动实验室',
                icon: '🧪',
                type: 'lab',
                render: null
            },
            {
                id: 'ch1_practice',
                title: '实践操作',
                icon: '💻',
                type: 'practice',
                render: null
            },
            {
                id: 'ch1_debug',
                title: '调试诊所',
                icon: '🏥',
                type: 'debug',
                render: null
            },
            {
                id: 'ch1_extend',
                title: '扩展思维',
                icon: '🚀',
                type: 'extend',
                render: null
            },
            {
                id: 'ch1_project',
                title: '创意项目',
                icon: '🎨',
                type: 'project',
                render: null
            },
            {
                id: 'ch1_quiz',
                title: '课堂小测',
                icon: '📝',
                type: 'quiz',
                render: null
            }
        ]
    },
    // ============================================================
    // 第2章：变量（保留现有变量模块，modules为空数组）
    // ============================================================
    {
        id: 'ch2',
        num: 2,
        title: '变量',
        subtitle: '会变的小盒子',
        icon: '📦',
        desc: '理解变量概念，掌握命名规则与赋值操作',
        badge: '基础',
        color: '#667eea',
        modules: []
    },
    // ============================================================
    // 第3章：变量类型
    // ============================================================
    {
        id: 'ch3',
        num: 3,
        title: '变量类型',
        subtitle: '数据的身份证',
        icon: '🏷️',
        desc: '认识int、float、str、bool四种基本数据类型',
        badge: '基础',
        color: '#ff9800',        modules: [
            {
                id: 'ch3_intro',
                title: '情境导入',
                icon: '🎬',
                type: 'intro',
                render: null
            },
            {
                id: 'ch3_knowledge',
                title: '知识讲解',
                icon: '📚',
                type: 'knowledge',
                render: null
            },
            {
                id: 'ch3_lab',
                title: '互动实验室',
                icon: '🧪',
                type: 'lab',
                render: null
            },
            {
                id: 'ch3_practice',
                title: '实践操作',
                icon: '💻',
                type: 'practice',
                render: null
            },
            {
                id: 'ch3_debug',
                title: '调试诊所',
                icon: '🏥',
                type: 'debug',
                render: null
            },
            {
                id: 'ch3_extend',
                title: '扩展思维',
                icon: '🚀',
                type: 'extend',
                render: null
            },
            {
                id: 'ch3_project',
                title: '创意项目',
                icon: '🎨',
                type: 'project',
                render: null
            },
            {
                id: 'ch3_quiz',
                title: '课堂小测',
                icon: '📝',
                type: 'quiz',
                render: null
            }
        ]
    },
    // ============================================================
    // 第4章：条件判断
    // ============================================================
    {
        id: 'ch4',
        num: 4,
        title: '条件判断',
        subtitle: '程序的分叉路口',
        icon: '🔀',
        desc: '学习if/else语句，让程序做出判断',
        badge: '核心',
        color: '#E91E63',        modules: [
            {
                id: 'ch4_intro',
                title: '情境导入',
                icon: '🎬',
                type: 'intro',
                render: null
            },
            {
                id: 'ch4_knowledge',
                title: '知识讲解',
                icon: '📚',
                type: 'knowledge',
                render: null
            },
            {
                id: 'ch4_lab',
                title: '互动实验室',
                icon: '🧪',
                type: 'lab',
                render: null
            },
            {
                id: 'ch4_practice',
                title: '实践操作',
                icon: '💻',
                type: 'practice',
                render: null
            },
            {
                id: 'ch4_debug',
                title: '调试诊所',
                icon: '🏥',
                type: 'debug',
                render: null
            },
            {
                id: 'ch4_extend',
                title: '扩展思维',
                icon: '🚀',
                type: 'extend',
                render: null
            },
            {
                id: 'ch4_project',
                title: '创意项目',
                icon: '🎨',
                type: 'project',
                render: null
            },
            {
                id: 'ch4_quiz',
                title: '课堂小测',
                icon: '📝',
                type: 'quiz',
                render: null
            }
        ]
    },
    // ============================================================
    // 第5章：if进阶
    // ============================================================
    {
        id: 'ch5',
        num: 5,
        title: 'if进阶',
        subtitle: '逻辑运算符',
        icon: '🔗',
        desc: '学习and/or/not，组合多个条件',
        badge: '进阶',
        color: '#9C27B0',        modules: [
            { id: 'ch5_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch5_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch5_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch5_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch5_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch5_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch5_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch5_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第6章：while循环
    // ============================================================
    {
        id: 'ch6',
        num: 6,
        title: 'while循环',
        subtitle: '重复执行的力量',
        icon: '🔄',
        desc: '学习while循环结构，让程序自动重复执行',
        badge: '核心',
        color: '#2196F3',        modules: [
            { id: 'ch6_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch6_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch6_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch6_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch6_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch6_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch6_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch6_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第7章：while拓展
    // ============================================================
    {
        id: 'ch7',
        num: 7,
        title: 'while拓展',
        subtitle: 'break与continue',
        icon: '⏯️',
        desc: '学习break/continue控制循环流程',
        badge: '进阶',
        color: '#00BCD4',        modules: [
            { id: 'ch7_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch7_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch7_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch7_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch7_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch7_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch7_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch7_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第8章：循环嵌套
    // ============================================================
    {
        id: 'ch8',
        num: 8,
        title: '循环嵌套',
        subtitle: '循环中的循环',
        icon: '🔄',
        desc: '理解循环嵌套，用双重循环解决复杂问题',
        badge: '进阶',
        color: '#3F51B5',        modules: [
            { id: 'ch8_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch8_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch8_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch8_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch8_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch8_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch8_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch8_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第9章：综合应用一
    // ============================================================
    {
        id: 'ch9',
        num: 9,
        title: '综合应用一',
        subtitle: '前8章大融汇',
        icon: '🧩',
        desc: '整合变量、条件、循环，打造迷你计算器',
        badge: '综合',
        color: '#FF5722',        modules: [
            { id: 'ch9_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch9_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch9_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch9_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch9_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch9_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch9_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch9_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第10章：排列小星星
    // ============================================================
    {
        id: 'ch10',
        num: 10,
        title: '排列小星星',
        subtitle: '字符图形入门',
        icon: '⭐',
        desc: '用循环打印字符图形，培养空间想象力',
        badge: '趣味',
        color: '#ffc107',        modules: [
            { id: 'ch10_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch10_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch10_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch10_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch10_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch10_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch10_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch10_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第11章：初识列表
    // ============================================================
    {
        id: 'ch11',
        num: 11,
        title: '初识列表',
        subtitle: '数据的收纳盒',
        icon: '📋',
        desc: '学习列表的定义与基本操作',
        badge: '核心',
        color: '#8BC34A',        modules: [
            { id: 'ch11_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch11_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch11_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch11_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch11_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch11_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch11_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch11_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第12章：列表的使用
    // ============================================================
    {
        id: 'ch12',
        num: 12,
        title: '列表的使用',
        subtitle: '增删改查',
        icon: '🔧',
        desc: '掌握append/pop等列表操作方法',
        badge: '核心',
        color: '#009688',        modules: [
            { id: 'ch12_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch12_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch12_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch12_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch12_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch12_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch12_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch12_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第13章：元组与集合
    // ============================================================
    {
        id: 'ch13',
        num: 13,
        title: '元组与集合',
        subtitle: '不可变与不重复',
        icon: '📚',
        desc: '了解元组(tuple)和集合(set)的特点与用法',
        badge: '拓展',
        color: '#795548',        objectives: ['理解元组的不可变特性', '掌握集合的去重和运算', '区分数列、元组、集合的适用场景'],
        duration: '30',
        modules: [
            { id: 'ch13_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch13_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch13_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch13_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch13_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch13_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch13_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch13_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第14章：神奇的字典
    // ============================================================
    {
        id: 'ch14',
        num: 14,
        title: '神奇的字典',
        subtitle: '键值对的魔法',
        icon: '📖',
        desc: '学习字典的键值对结构，掌握键值访问与操作',
        badge: '核心',
        color: '#673AB7',        modules: [
            { id: 'ch14_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch14_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch14_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch14_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch14_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch14_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch14_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch14_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第15章：再遇字符串
    // ============================================================
    {
        id: 'ch15',
        num: 15,
        title: '再遇字符串',
        subtitle: '文字魔法师',
        icon: '🔤',
        desc: '深入学习字符串的索引、切片和常用方法',
        badge: '核心',
        color: '#F44336',        modules: [
            { id: 'ch15_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch15_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch15_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch15_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch15_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch15_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch15_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch15_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第16章：公共语法
    // ============================================================
    {
        id: 'ch16',
        num: 16,
        title: '公共语法',
        subtitle: '万能工具箱',
        icon: '🧰',
        desc: '学习len()、in、max/min等通用函数和方法',
        badge: '拓展',
        color: '#607D8B',        modules: [
            { id: 'ch16_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch16_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch16_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch16_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch16_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch16_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch16_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch16_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第17章：轻松搞定二进制
    // ============================================================
    {
        id: 'ch17',
        num: 17,
        title: '轻松搞定二进制',
        subtitle: '0和1的世界',
        icon: '💡',
        desc: '理解二进制原理，掌握二进制与十进制的转换',
        badge: '趣味',
        color: '#546E7A',        modules: [
            { id: 'ch17_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch17_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch17_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch17_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch17_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch17_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch17_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch17_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第18章：编程思维实践
    // ============================================================
    {
        id: 'ch18',
        num: 18,
        title: '编程思维实践',
        subtitle: '导演一出小剧目',
        icon: '🧠',
        desc: '学习流程图、伪代码和问题分解的编程思维',
        badge: '拓展',
        color: '#AB47BC',        modules: [
            { id: 'ch18_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch18_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch18_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch18_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch18_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch18_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch18_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch18_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    },
    // ============================================================
    // 第19章：各种各样的"数"
    // ============================================================
    {
        id: 'ch19',
        num: 19,
        title: '各种各样的"数"',
        subtitle: '数字家族大聚会',
        icon: '🔢',
        desc: '总结数字类型，了解进制表示和科学计数法',
        badge: '总结',
        color: '#43A047',        modules: [
            { id: 'ch19_intro', title: '情境导入', icon: '🎬', type: 'intro', render: null },
            { id: 'ch19_knowledge', title: '知识讲解', icon: '📚', type: 'knowledge', render: null },
            { id: 'ch19_lab', title: '互动实验室', icon: '🧪', type: 'lab', render: null },
            { id: 'ch19_practice', title: '实践操作', icon: '💻', type: 'practice', render: null },
            { id: 'ch19_debug', title: '调试诊所', icon: '🏥', type: 'debug', render: null },
            { id: 'ch19_extend', title: '扩展思维', icon: '🚀', type: 'extend', render: null },
            { id: 'ch19_project', title: '创意项目', icon: '🎨', type: 'project', render: null },
            { id: 'ch19_quiz', title: '课堂小测', icon: '📝', type: 'quiz', render: null }
        ]
    }
];