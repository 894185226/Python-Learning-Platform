// ===== PythonVariableLesson - search.js (搜索模块) =====
(function() {
    'use strict';

    // ===== 搜索关键词映射 =====
    const SEARCH_KEYWORDS = [
        { keywords: ['认识', 'python', 'print', 'hello', '入门', '第一课', '开始'], moduleId: 'ch1', name: '第1章 认识Python', icon: '🐍', desc: '了解Python，编写第一行代码' },
        { keywords: ['变量', 'variable', '盒子', '赋值', '命名', '变量名'], moduleId: 'ch2', name: '第2章 变量', icon: '📦', desc: '理解变量概念与命名规则' },
        { keywords: ['类型', 'int', 'float', 'str', 'bool', '整数', '小数', '字符串', '布尔'], moduleId: 'ch3', name: '第3章 变量类型', icon: '📊', desc: '掌握四种基本数据类型' },
        { keywords: ['条件', 'if', 'else', '判断', '条件判断', '比较'], moduleId: 'ch4', name: '第4章 条件判断', icon: '🔀', desc: '让程序做出智能决策' },
        { keywords: ['and', 'or', 'not', '逻辑', '组合', '进阶判断'], moduleId: 'ch5', name: '第5章 if进阶', icon: '🔗', desc: '组合多个条件进行判断' },
        { keywords: ['循环', 'while', '重复', '迭代', '次数'], moduleId: 'ch6', name: '第6章 while循环', icon: '🔄', desc: '让程序重复执行任务' },
        { keywords: ['break', 'continue', '跳出', '跳过', '中断'], moduleId: 'ch7', name: '第7章 while拓展', icon: '⏭️', desc: '控制循环的流程' },
        { keywords: ['嵌套', '双重循环', '内外', '嵌套循环'], moduleId: 'ch8', name: '第8章 循环嵌套', icon: '🔁', desc: '循环里面套循环' },
        { keywords: ['综合', '应用', '计算器', '整合'], moduleId: 'ch9', name: '第9章 综合应用', icon: '🧮', desc: '综合运用所学知识' },
        { keywords: ['星星', '图形', '图案', '打印', '星号'], moduleId: 'ch10', name: '第10章 排列小星星', icon: '⭐', desc: '用字符绘制图形' },
        { keywords: ['列表', 'list', '数组', '集合', '索引'], moduleId: 'ch11', name: '第11章 初识列表', icon: '📋', desc: '管理一组数据' },
        { keywords: ['append', 'pop', 'insert', 'remove', 'sort', '列表操作'], moduleId: 'ch12', name: '第12章 列表的使用', icon: '📝', desc: '列表的增删改查' },
        { keywords: ['元组', 'tuple', '集合', 'set', '不可变'], moduleId: 'ch13', name: '第13章 元组与集合', icon: '🔒', desc: '不可变序列与去重集合' },
        { keywords: ['字典', 'dict', '键值对', 'key', 'value', '通讯录'], moduleId: 'ch14', name: '第14章 神奇的字典', icon: '📖', desc: '键值对数据结构' },
        { keywords: ['字符串', 'string', '切片', 'replace', 'upper', 'lower'], moduleId: 'ch15', name: '第15章 再遇字符串', icon: '✂️', desc: '字符串切片与常用方法' },
        { keywords: ['len', 'max', 'min', '公共', '通用', 'in'], moduleId: 'ch16', name: '第16章 公共语法', icon: '🧰', desc: '通用函数与方法' },
        { keywords: ['二进制', '进制', 'bit', '字节', '转换'], moduleId: 'ch17', name: '第17章 二进制', icon: '💡', desc: '理解计算机的数字世界' },
        { keywords: ['流程图', '算法', '伪代码', '思维', '编程思维'], moduleId: 'ch18', name: '第18章 编程思维', icon: '🧠', desc: '培养计算思维' },
        { keywords: ['数字', '复数', '科学计数', '进制', '浮点'], moduleId: 'ch19', name: '第19章 各种各样的数', icon: '🔢', desc: '数字类型总结' },
        { keywords: ['情境', '场景', '导入', '介绍', '动画'], moduleId: 'ch2_intro', name: '情境导入', icon: '🎬', desc: '了解为什么需要变量' },
        { keywords: ['实验室', '拖拽', '标签', '数据', '拖动', '类比'], moduleId: 'ch2_lab', name: '生活类比实验室', icon: '🧪', desc: '拖拽体验变量概念' },
        { keywords: ['知识', '讲解', '概念', '命名', '规则', '赋值', '赋值符号', '学习', '教程'], moduleId: 'ch2_lesson', name: '知识讲解', icon: '📚', desc: '学习变量核心概念' },
        { keywords: ['法官', '合法', '非法', '判断', '命名规则', '判断题'], moduleId: 'ch2_judge', name: '命名小法官', icon: '⚖️', desc: '判断变量名合法性' },
        { keywords: ['实践', '操作', '代码', '运行', '编程', '练习', '写代码'], moduleId: 'ch2_practice', name: '实践操作', icon: '💻', desc: '动手编写变量代码' },
        { keywords: ['追踪', '值', '跟踪', '变量值', '变化'], moduleId: 'ch2_trace', name: '值追踪挑战', icon: '🔍', desc: '追踪变量值变化' },
        { keywords: ['错误', 'bug', '调试', '修复', '诊所', '纠错', '改错'], moduleId: 'ch2_debug', name: '错误调试诊所', icon: '🏥', desc: '找出并修复代码bug' },
        { keywords: ['扩展', '思维', '挑战', '交换', '拼接', '句子'], moduleId: 'ch2_extend', name: '扩展思维', icon: '🚀', desc: '高阶变量操作挑战' },
        { keywords: ['创意', '项目', '名片', '制作', '生成'], moduleId: 'ch2_project', name: '创意迷你项目', icon: '🎨', desc: '制作个人电子名片' },
        { keywords: ['测验', '测试', '考试', '小测', '题目', '选择题'], moduleId: 'ch2_test', name: '课堂小测', icon: '📝', desc: '检验学习成果' },
        { keywords: ['成就', '进度', '成果', '墙', '学习记录', '探险地图'], moduleId: 'achievement', name: '成就墙', icon: '🏆', desc: '查看学习成果与成就' }
    ];

    function matchModules(searchTerm) {
        if (!searchTerm) return SEARCH_KEYWORDS.map(function(m) { return { keywords: m.keywords, moduleId: m.moduleId, name: m.name, icon: m.icon, desc: m.desc, score: 0 }; });
        const term = searchTerm.toLowerCase();
        const results = [];

        SEARCH_KEYWORDS.forEach(function(entry) {
            let maxScore = 0;
            entry.keywords.forEach(function(kw) {
                const lowerKw = kw.toLowerCase();
                if (lowerKw === term) {
                    maxScore = Math.max(maxScore, 100);
                } else if (lowerKw.indexOf(term) === 0) {
                    maxScore = Math.max(maxScore, 80);
                } else if (lowerKw.indexOf(term) !== -1) {
                    maxScore = Math.max(maxScore, 50);
                } else {
                    const lcsLen = longestCommonSubseq(term, lowerKw);
                    const ratio = lcsLen / Math.max(term.length, lowerKw.length);
                    if (ratio > 0.5) {
                        maxScore = Math.max(maxScore, Math.round(ratio * 30));
                    }
                }
            });
            if (maxScore > 0 || !searchTerm) {
                results.push({ keywords: entry.keywords, moduleId: entry.moduleId, name: entry.name, icon: entry.icon, desc: entry.desc, score: maxScore });
            }
        });

        results.sort(function(a, b) { return b.score - a.score; });
        return results;
    }

    function longestCommonSubseq(a, b) {
        const m = a.length, n = b.length;
        const dp = [];
        for (let i = 0; i <= m; i++) {
            dp[i] = [];
            for (let j = 0; j <= n; j++) {
                dp[i][j] = 0;
            }
        }
        for (let i2 = 1; i2 <= m; i2++) {
            for (let j2 = 1; j2 <= n; j2++) {
                dp[i2][j2] = a[i2 - 1] === b[j2 - 1] ? dp[i2 - 1][j2 - 1] + 1 : Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
            }
        }
        return dp[m][n];
    }

    function showSearchSuggestions(inputId) {
        try {
            const input = document.getElementById(inputId);
            if (!input) return;
            const searchTerm = input.value.trim();
            const results = matchModules(searchTerm).slice(0, 6);

            const suggestionsId = inputId === 'hero-search-input' ? 'hero-search-suggestions' : 'search-suggestions';
            const suggestionsEl = document.getElementById(suggestionsId);
            if (!suggestionsEl) return;

            if (results.length === 0 || !searchTerm) {
                suggestionsEl.classList.remove('active');
            } else {
                suggestionsEl.innerHTML = results.map(function(r) {
                    return '<div class="search-suggestion-item" onclick="navigateToModule(\'' + r.moduleId + '\')"><span class="search-suggestion-icon">' + r.icon + '</span><div><div class="search-suggestion-text">' + r.name + '</div><div class="search-suggestion-desc">' + r.desc + '</div></div></div>';
                }).join('');
                suggestionsEl.classList.add('active');
            }
        } catch (e) {
            window.log.error('搜索建议出错:', e);
        }
    }

    function navigateToModule(moduleId) {
        try {
            document.querySelectorAll('.search-suggestions').forEach(function(el) { el.classList.remove('active'); });
            if (moduleId.indexOf('ch') === 0) {
                window.switchChapter(moduleId);
            } else {
                window.switchModule(moduleId);
            }
        } catch (e) {
            window.log.error('导航出错:', e);
        }
    }

    function search(inputId) {
        try {
            const input = document.getElementById(inputId);
            if (!input) return false;
            const searchTerm = input.value.trim();
            if (!searchTerm) return false;

            const results = matchModules(searchTerm);
            if (results.length > 0) {
                document.querySelectorAll('.search-suggestions').forEach(function(el) { el.classList.remove('active'); });
                navigateToModule(results[0].moduleId);
            } else {
                alert('未找到与"' + searchTerm + '"相关的内容，请尝试：变量、代码、调试、测验等关键词');
            }
        } catch (e) {
            window.log.error('搜索出错:', e);
        }
        return false;
    }

    // 点击其他地方关闭搜索建议
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container') && !e.target.closest('.hero-form')) {
            document.querySelectorAll('.search-suggestions').forEach(function(el) { el.classList.remove('active'); });
        }
    });

    // 暴露到全局
    window.SEARCH_KEYWORDS = SEARCH_KEYWORDS;
    window.matchModules = matchModules;
    window.showSearchSuggestions = showSearchSuggestions;
    window.navigateToModule = navigateToModule;
    window.search = search;

})();