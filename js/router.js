// ===== PythonVariableLesson - router.js (路由与导航模块) =====
(function() {
    'use strict';

    // 全局状态
    const state = {
        currentModule: 'welcome',
        judgeScore: 0,
        judgeQuestions: [
            { name: 'my_name', valid: true, reason: '符合命名规则' },
            { name: '2name', valid: false, reason: '不能以数字开头' },
            { name: 'user-name', valid: false, reason: '不能包含连字符' },
            { name: 'class', valid: false, reason: 'class是Python关键字' },
            { name: 'Age', valid: true, reason: '符合命名规则' },
            { name: 'my name', valid: false, reason: '不能包含空格' },
            { name: '_private', valid: true, reason: '可以以下划线开头' },
            { name: '姓名', valid: true, reason: 'Python支持中文变量名' },
            { name: 'if', valid: false, reason: 'if是Python关键字' },
            { name: 'score123', valid: true, reason: '符合命名规则' }
        ],
        currentJudgeIndex: 0,
        debugMedals: 0,
        currentBugIndex: 0,
        bugs: [
            { code: 'print(score)', question: '这段代码会报错，为什么？', options: [{ text: 'print拼写错误', correct: false }, { text: '变量score未定义', correct: true }, { text: '缺少分号', correct: false }, { text: '括号不匹配', correct: false }] },
            { code: 'name = 小明', question: '这段代码会报错，为什么？', options: [{ text: '变量名错误', correct: false }, { text: '字符串需要加引号', correct: true }, { text: '赋值符号错误', correct: false }, { text: '缺少括号', correct: false }] },
            { code: '2age = 12', question: '这段代码会报错，为什么？', options: [{ text: '数字不能赋值给变量', correct: false }, { text: '变量名不能以数字开头', correct: true }, { text: '缺少等号', correct: false }, { text: '语法错误', correct: false }] },
            { code: 'my name = "张三"', question: '这段代码会报错，为什么？', options: [{ text: '变量名不能有空格', correct: true }, { text: '字符串格式错误', correct: false }, { text: '缺少引号', correct: false }, { text: '赋值错误', correct: false }] },
            { code: 'x = 5\ny = x + "2"', question: '这段代码会报错，为什么？', options: [{ text: '变量y未定义', correct: false }, { text: '不能将数字和字符串直接相加', correct: true }, { text: '缺少分号', correct: false }, { text: '缩进错误', correct: false }] }
        ],
        testAnswers: {},
        questions: [
            { question: '以下哪个是合法的Python变量名？', options: ['2const', 'my-const', 'my_const', 'const!'], correct: 2 },
            { question: '语句 x = 10 的含义是？', options: ['x等于10', '将10赋值给x', 'x加10', 'x减10'], correct: 1 },
            { question: '执行 x = 5; x = x + 1 后，x的值是？', options: ['5', '6', '1', '错误'], correct: 1 },
            { question: '以下哪个是Python的关键字？', options: ['name', 'age', 'class', 'score'], correct: 2 },
            { question: '交换两个变量a和b的值，需要？', options: ['直接交换', '引入临时变量', '使用加法', '无法交换'], correct: 1 }
        ],
        chQuizQuestions: {
            ch1: [
                { question: 'Python中，输出"Hello"的正确代码是？', options: ['print[Hello]', 'print("Hello")', 'Print(Hello)', 'print(Hello)'], correct: 1 },
                { question: 'print(1 + 2) 的输出结果是什么？', options: ['1 + 2', '3', '12', '报错'], correct: 1 },
                { question: '文字内容在print()中需要用什么括起来？', options: ['中括号 [ ]', '大括号 { }', '引号 " " 或 \' \'', '不需要任何符号'], correct: 2 },
                { question: 'print("你好", "世界") 的输出是？', options: ['你好世界', '你好 世界', '报错', '"你好""世界"'], correct: 1 },
                { question: '以下哪个代码会报错？', options: ['print(100)', 'print(你好)', 'print("你好")', 'print()'], correct: 1 }
            ],
            ch3: [
                { question: '3.14 属于什么类型？', options: ['int', 'float', 'str', 'bool'], correct: 1 },
                { question: 'type("Hello") 的结果是？', options: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'bool'>"], correct: 1 },
                { question: 'int(3.9) 的结果是？', options: ['4', '3', '3.9', '报错'], correct: 1 },
                { question: 'bool(0) 的值是？', options: ['True', 'False', '0', 'None'], correct: 1 },
                { question: '"12" + "34" 的结果是？', options: ['46', '"1234"', '报错', '"12""34"'], correct: 1 }
            ],
            ch4: [
                { question: 'if语句的行尾必须有什么？', options: ['分号 ;', '冒号 :', '逗号 ,', '句号 .'], correct: 1 },
                { question: '判断相等应该用哪个运算符？', options: ['=', '==', '!=', '==='], correct: 1 },
                { question: 'if x > 5: print("big") 中，print前面的空格叫什么？', options: ['空格', '缩进', '制表符', '对齐'], correct: 1 },
                { question: 'else后面可以省略吗？', options: ['不可以，必须一起用', '可以，if可以单独使用', 'else必须和elif一起', '以上都不对'], correct: 1 },
                { question: 'elif 是什么意思？', options: ['else + if', 'if + if', 'else + else', 'end + if'], correct: 0 }
            ],
            ch5: [
                { question: 'True and False 的结果是？', options: ['True', 'False'], correct: 1 },
                { question: 'not True 的结果是？', options: ['True', 'False'], correct: 1 },
                { question: 'if age >= 12 and height >= 140: 要满足什么条件？', options: ['两个条件都要满足', '满足一个即可'], correct: 0 },
                { question: 'True or False 的结果是？', options: ['True', 'False'], correct: 0 },
                { question: '以下哪个运算符表示"取反"？', options: ['and', 'or', 'not', '!='], correct: 2 }
            ],
            ch6: [
                { question: 'while循环的条件在什么时候停止？', options: ['条件为True时', '条件为False时', '执行10次后'], correct: 1 },
                { question: 'while True: 会怎样？', options: ['执行一次', '无限循环', '不执行'], correct: 1 },
                { question: '循环体中必须有什么才能避免无限循环？', options: ['print语句', '改变条件变量的语句', '注释'], correct: 1 },
                { question: 'count = count - 1 的作用是？', options: ['count加1', 'count减1', '打印count'], correct: 1 },
                { question: 'while i <= 5: 当i=5时还会执行吗？', options: ['会执行', '不会执行'], correct: 0 }
            ],
            ch7: [
                { question: 'break的作用是？', options: ['跳过本轮循环', '结束整个循环', '重新开始循环'], correct: 1 },
                { question: 'continue的作用是？', options: ['跳过本轮，继续下一轮', '结束整个循环', '暂停循环'], correct: 0 },
                { question: 'for i in range(5): if i==2: break; print(i) 输出什么？', options: ['0 1 2 3 4', '0 1', '0 1 2'], correct: 1 },
                { question: 'break和continue可以同时使用吗？', options: ['不可以', '可以'], correct: 1 },
                { question: 'break执行后，while-else中的else还会执行吗？', options: ['会执行', '不会执行'], correct: 1 }
            ],
            ch8: [
                { question: '嵌套循环中外层循环执行3次，内层执行4次，print共执行几次？', options: ['7次', '12次', '3次'], correct: 1 },
                { question: 'for i in range(2): for j in range(3): print(i,j) 输出几行？', options: ['5行', '6行', '2行'], correct: 1 },
                { question: '内层循环的缩进应该是？', options: ['和外层循环对齐', '比外层多缩进一级'], correct: 1 },
                { question: 'print("*", end=" ") 中的 end=" " 是什么意思？', options: ['打印后换行', '打印后以空格结尾，不换行'], correct: 1 },
                { question: '九九乘法表需要几层嵌套循环？', options: ['1层', '2层', '3层'], correct: 1 }
            ],
            ch9: [
                { question: 'input()返回的数据类型是？', options: ['int', 'str', 'float'], correct: 1 },
                { question: '把input()的结果转为数字需要用？', options: ['str()', 'int()或float()', 'bool()'], correct: 1 },
                { question: '计算器程序主要用到了哪些知识？', options: ['变量、条件、循环、输入输出', '只有变量', '只有循环'], correct: 0 }
            ],
            ch10: [
                { question: '"*" * 5 的结果是？', options: ['"*****"', '5', '报错'], correct: 0 },
                { question: '打印5行直角三角形，外层循环range怎么写？', options: ['range(5)', 'range(1, 6)', 'range(1, 5)'], correct: 1 },
                { question: 'print("*", end="") 的作用是？', options: ['打印后不换行', '打印后换行'], correct: 0 },
                { question: '" " * 3 产生什么？', options: ['3个空格', '空字符串'], correct: 0 },
                { question: 'for i in range(1, 6): print("*" * i) 第3行打印几个星号？', options: ['2个', '3个', '4个'], correct: 1 }
            ],
            ch11: [
                { question: '列表的索引从几开始？', options: ['0', '1'], correct: 0 },
                { question: '[1,2,3][-1] 的值是？', options: ['1', '3', '报错'], correct: 1 },
                { question: 'len([10,20,30]) 的值是？', options: ['2', '3', '30'], correct: 1 },
                { question: '列表用哪个符号定义？', options: ['[]', '()', '{}'], correct: 0 },
                { question: '[1,2,3][3] 会怎样？', options: ['返回3', '索引越界报错'], correct: 1 }
            ],
            ch12: [
                { question: '在列表末尾添加元素用哪个方法？', options: ['append()', 'add()', 'insert()'], correct: 0 },
                { question: 'pop() 默认删除哪个位置的元素？', options: ['第一个', '最后一个', '随机'], correct: 1 },
                { question: 'nums.sort() 的作用是？', options: ['打乱顺序', '从小到大排序', '反转列表'], correct: 1 },
                { question: '[1,2,3][1:3] 的结果是？', options: ['[1,2]', '[2,3]', '[1,2,3]'], correct: 1 },
                { question: 'remove(3) 和 pop(3) 的区别？', options: ['remove按值删除，pop按索引删除', '没有区别'], correct: 0 }
            ],
            ch13: [
                { question: '元组(tuple)用什么符号定义？', options: ['()', '[]', '{}'], correct: 0 },
                { question: '集合(set)的特点是什么？', options: ['元素不重复、无序', '元素有序、可重复'], correct: 0 },
                { question: '{1, 2, 2, 3} 打印结果是什么？', options: ['{1, 2, 3}', '{1, 2, 2, 3}'], correct: 0 },
                { question: '以下哪个操作会报错？', options: ['t = (1,2); t[0] = 5', 's = {1,2}; s.add(3)'], correct: 0 },
                { question: '两个集合的交集用什么符号？', options: ['&', '|', '-'], correct: 0 }
            ],
            ch14: [
                { question: '字典用什么符号定义？', options: ['{}', '[]', '()'], correct: 0 },
                { question: 'd = {"a":1}; d["a"] 的值是？', options: ['1', '"a"'], correct: 0 },
                { question: '安全访问字典用哪个方法？', options: ['get()', 'append()'], correct: 0 },
                { question: '遍历键值对用哪个方法？', options: ['items()', 'keys()'], correct: 0 },
                { question: 'd["new"] = 5 的作用是？', options: ['添加或修改键值对', '删除键'], correct: 0 }
            ],
            ch15: [
                { question: '"Python"[0:3] 的结果是？', options: ['"Pyt"', '"Py"', '"Pyth"'], correct: 0 },
                { question: 'upper() 方法的作用是？', options: ['转为大写', '转为小写'], correct: 0 },
                { question: 'split(",") 的作用是？', options: ['按逗号分割成列表', '删除逗号'], correct: 0 },
                { question: '字符串可以修改某个字符吗？', options: ['不可以，字符串不可变', '可以'], correct: 0 },
                { question: 'f"{name}你好" 是什么？', options: ['f-string 格式化字符串', '普通字符串'], correct: 0 }
            ],
            ch16: [
                { question: 'len([1,2,3,4]) 的值是？', options: ['4', '3'], correct: 0 },
                { question: '3 in [1,2,3] 的结果是？', options: ['True', 'False'], correct: 0 },
                { question: 'max([5, 2, 9, 1]) 的值是？', options: ['9', '1'], correct: 0 },
                { question: 'sum([1,2,3]) 的值是？', options: ['6', '5'], correct: 0 },
                { question: 'int("5") 的作用是？', options: ['字符串转整数', '整数转字符串'], correct: 0 }
            ],
            ch17: [
                { question: '二进制 1010 的十进制值是？', options: ['10', '8'], correct: 0 },
                { question: '1 byte 等于多少 bit？', options: ['8', '4'], correct: 0 },
                { question: 'bin(10) 的输出是？', options: ["'0b1010'", "'1010'"], correct: 0 },
                { question: '十进制 7 的二进制是？', options: ['111', '110'], correct: 0 },
                { question: '二进制加法 1+1 等于？', options: ['10（进位）', '2'], correct: 0 }
            ],
            ch18: [
                { question: '编程思维的第一步是什么？', options: ['分解问题', '直接写代码'], correct: 0 },
                { question: '流程图中菱形代表什么？', options: ['判断', '开始/结束'], correct: 0 },
                { question: '伪代码的作用是？', options: ['用自然语言描述算法步骤', '直接运行的代码'], correct: 0 },
                { question: '"抽象"在编程中是什么意思？', options: ['忽略细节，关注核心', '画图'], correct: 0 },
                { question: '递归是什么？', options: ['函数自己调用自己', '循环的一种'], correct: 0 }
            ],
            ch19: [
                { question: 'Python中整数类型叫什么？', options: ['int', 'integer'], correct: 0 },
                { question: '0b1010 的十进制值是？', options: ['10', '1010'], correct: 0 },
                { question: '1.5e3 等于？', options: ['1500.0', '1.5'], correct: 0 },
                { question: '0x2A 是什么进制？', options: ['十六进制', '八进制'], correct: 0 },
                { question: '0.1 + 0.2 == 0.3 的结果是？', options: ['False（浮点精度问题）', 'True'], correct: 0 }
            ]
        },
        traceStep: 0,
        traceVariables: { x: '?', y: '?', z: '?' },
        currentLevel: 1
    };

    // 页面加载完成后初始化（第2组：主题、登录、模块初始化）
    document.addEventListener('DOMContentLoaded', function() {
        window.log.log('[DOMReady] router 第2个监听器触发');
        window.initTheme();
        window.updateLoginUI();

        initWelcomeModule();
        initNavigation();
        initIntroModule();
        initLessonModule();
        initLabModule();
        initJudgeModule();
        initPracticeModule();
        initTraceModule();
        initDebugModule();
        initExtendModule();
        initProjectModule();
        window.initTestModule();
        window.initTypewriterEffect();
        window.initScrollReveal();

        if (typeof window.renderAchievementWall === 'function') window.renderAchievementWall();

        // 全局键盘快捷键
        window.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                window.closeAllModals();
                closeMobileMenu();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });

        // 特殊模块 ID 映射
        const SPECIAL_HASH_MAP = {
            'achievement-wall': 'achievement',
            'leaderboard': 'leaderboard',
            'mistake-book': 'mistakes',
            'discussions': 'discussion'
        };

        // 浏览器前进/后退支持
        window.addEventListener('hashchange', function() {
            let hash = window.location.hash.replace('#', '');
            hash = hash.replace(/^chapter_(ch\d+)$/, '$1');
            hash = SPECIAL_HASH_MAP[hash] || hash;
            if (hash && hash !== state.currentModule) {
                if (window.CH2_MODULE_IDS.indexOf(hash) !== -1) {
                    switchChapter('ch2');
                    if (hash !== 'ch2_intro') {
                        setTimeout(function() { if (typeof startVariableModule === 'function') startVariableModule(hash); }, 100);
                    }
                } else if (/^ch\d+$/.test(hash)) {
                    if (currentChapter !== hash) {
                        switchChapter(hash);
                    }
                } else {
                    switchModule(hash);
                }
            }
        });

        // 初始 hash 处理
        let initHash = window.location.hash.replace('#', '');
        initHash = initHash.replace(/^chapter_(ch\d+)$/, '$1');
        initHash = SPECIAL_HASH_MAP[initHash] || initHash;
        if (initHash && initHash !== 'welcome') {
            if (window.CH2_MODULE_IDS.indexOf(initHash) !== -1) {
                if (typeof switchToVariableChapterBody === 'function') {
                    switchToVariableChapterBody(initHash);
                }
            } else if (/^ch\d+$/.test(initHash)) {
                setTimeout(function() { switchChapter(initHash); }, 100);
            } else {
                switchModule(initHash);
            }
        }
    });

    function initWelcomeModule() {}

    // 导航模块
    function initNavigation() {
        const logoLink = document.querySelector('.logo-link');
        if (logoLink) {
            logoLink.addEventListener('click', function(e) {
                e.preventDefault();
                switchModule('welcome');
            });
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.w3-top')) {
                const allNavs = document.querySelectorAll('.w3-dropdown-content');
                allNavs.forEach(function(nav) { nav.classList.add('w3-hide'); });
            }
        });

        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                const moduleId = this.dataset.module;
                switchModule(moduleId);
                closeMobileMenu();
            });
        });

        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link, .w3-button[data-module]');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const moduleId = this.dataset.module;
                if (moduleId) {
                    switchModule(moduleId);
                }
                const allNavs = document.querySelectorAll('.w3-dropdown-content');
                allNavs.forEach(function(nav) { nav.classList.add('w3-hide'); });
            });
        });

        const footerLinks = document.querySelectorAll('.footer-section a[href^="#"]');
        footerLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const moduleId = this.getAttribute('href').substring(1);
                switchModule(moduleId);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // 全局函数 - 打开导航菜单
    function openNavItem(navId) {
        const allNavs = document.querySelectorAll('.w3-dropdown-content');
        const targetNav = document.getElementById('nav_' + navId);

        allNavs.forEach(function(nav) {
            if (nav !== targetNav) {
                nav.classList.add('w3-hide');
            }
        });

        if (targetNav) {
            targetNav.classList.toggle('w3-hide');
        }
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.w3-dropdown-content').forEach(function(nav) {
            nav.classList.add('w3-hide');
        });
    }

    function toggleNavItem(navId) {
        const allNavs = document.querySelectorAll('.w3-dropdown-content');
        const targetNav = document.getElementById('nav_' + navId);

        if (targetNav) {
            allNavs.forEach(function(nav) {
                if (nav.id !== 'nav_' + navId) {
                    nav.classList.add('w3-hide');
                }
            });

            if (targetNav.classList.contains('w3-hide')) {
                targetNav.classList.remove('w3-hide');
            } else {
                targetNav.classList.add('w3-hide');
            }
        }
    }

    // 移动端菜单控制
    function toggleMobileMenu() {
        document.getElementById('mobileMenuModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        syncMobileThemeIcon();
        syncMobileLoginBtn();
    }

    function closeMobileMenu() {
        document.getElementById('mobileMenuModal').style.display = 'none';
        document.body.style.overflow = '';
    }

    function syncMobileThemeIcon() {
        const mobileIcon = document.getElementById('mobileThemeIcon');
        if (mobileIcon) {
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            mobileIcon.className = isDark ? 'far fa-moon' : 'fas fa-sun';
        }
    }

    function syncMobileLoginBtn() {
        const mobileBtn = document.getElementById('mobileLoginBtnText');
        const loginBtn = document.getElementById('loginBtnText');
        if (mobileBtn && loginBtn) {
            mobileBtn.textContent = loginBtn.textContent;
        }
    }

    function switchModule(moduleId) {
        const modules = document.querySelectorAll('.module');
        const targetModule = document.getElementById(moduleId);

        if (!targetModule) {
            window.log.error('Module not found:', moduleId);
            return;
        }

        if (window.PROTECTED_MODULES.indexOf(moduleId) !== -1) {
            const currentUser = window.getCurrentUser();
            if (!currentUser) {
                window.pendingModuleId = moduleId;
                window.openLoginModal();
                return;
            }
        }

        if (state.currentModule === 'ch2_intro') {
            stopIntroAnimations();
        }

        const currentActive = document.querySelector('.module.active');
        if (currentActive && currentActive !== targetModule) {
            let transitionDone = false;
            currentActive.classList.add('module-transitioning');
            const onTransitionEnd = function() {
                if (transitionDone) return;
                transitionDone = true;
                currentActive.classList.remove('module-transitioning');
                currentActive.classList.remove('active');
                targetModule.classList.add('active');
                targetModule.classList.add('module-showing');
                setTimeout(function() { targetModule.classList.remove('module-showing'); }, 260);
                currentActive.removeEventListener('animationend', onTransitionEnd);
            };
            currentActive.addEventListener('animationend', onTransitionEnd);
            setTimeout(function() {
                if (!transitionDone) {
                    onTransitionEnd();
                }
            }, 250);
        } else {
            modules.forEach(function(module) { module.classList.remove('active'); });
            targetModule.classList.add('active');
        }
        state.currentModule = moduleId;

        if (['welcome', 'achievement', 'leaderboard', 'mistakes', 'report', 'snippets', 'goals', 'discussion'].indexOf(moduleId) !== -1) {
                document.querySelectorAll('.chapter-section').forEach(function(c) { c.classList.remove('active'); });
                hideSidebarToggle();
                currentChapter = null;
                currentChapterModule = null;
                document.body.classList.remove('in-ch2');
            }

        const targetHash = '#' + moduleId;
        if (window.location.hash === targetHash) {
            history.replaceState(null, '', targetHash);
        } else {
            window.location.hash = targetHash;
        }

        updateNavActiveState(moduleId);

        if (moduleId === 'achievement') {
            window.renderAchievementWall();
        }
        if (moduleId === 'ch2_lesson') {
            refreshLessonButton();
        }

        if (moduleId === 'leaderboard' && typeof renderLeaderboard === 'function') {
            renderLeaderboard();
        }
        if (moduleId === 'mistakes' && typeof renderMistakeBook === 'function') {
            renderMistakeBook();
        }
        if (moduleId === 'report' && typeof renderReport === 'function') {
            renderReport();
        }
        if (moduleId === 'snippets' && typeof renderSnippets === 'function') {
            renderSnippets();
        }
        if (moduleId === 'goals' && typeof renderGoals === 'function') {
            renderGoals();
        }
        if (moduleId === 'discussion' && typeof renderDiscussions === 'function') {
            renderDiscussions();
        }

        setTimeout(function() {
            targetModule.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);

        setTimeout(function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) window.applyThemeToChapterContent(true);
            window.shuffleDebugButtons();
            window.shuffleQuizOptions();
        }, 300);
    }

    function updateNavActiveState(moduleId) {
        document.querySelectorAll('.w3-bar > .w3-bar-item.w3-hide-small > .w3-button.w3-hover-green').forEach(function(item) {
            item.classList.remove('active-nav');
        });
        document.querySelectorAll('.mobile-nav-link').forEach(function(item) {
            item.classList.remove('active-nav');
        });

        // 特殊页面（成就墙/排行榜/错题本/讨论区）直接映射到自身
        if (['achievement', 'leaderboard', 'mistakes', 'discussion'].indexOf(moduleId) !== -1) {
            highlightNavButton(moduleId);
            return;
        }

        // 从模块 ID（如 ch2_practice）或章节 ID（如 ch2）中提取章节前缀
        const chapterMatch = /^(ch\d+)/.exec(moduleId);
        if (!chapterMatch) return;

        const chapterNum = parseInt(chapterMatch[1].replace('ch', ''), 10);

        // 章节 → 分区映射：入门基础(1-3) / 控制流程(4-10) / 数据结构(11-15) / 进阶拓展(16-19)
        let navId;
        if (chapterNum >= 1 && chapterNum <= 3) {
            navId = 'tutorials';
        } else if (chapterNum >= 4 && chapterNum <= 10) {
            navId = 'practice';
        } else if (chapterNum >= 11 && chapterNum <= 15) {
            navId = 'challenge';
        } else if (chapterNum >= 16 && chapterNum <= 19) {
            navId = 'project';
        }

        if (navId) highlightNavButton(navId);
    }

    function highlightNavButton(navId) {
        const desktopBtns = document.querySelectorAll('.w3-bar > .w3-bar-item.w3-hide-small > .w3-button.w3-hover-green');
        desktopBtns.forEach(function(btn) {
            const onclick = btn.getAttribute('onclick') || '';
            if (onclick.indexOf("'" + navId + "'") !== -1) {
                btn.classList.add('active-nav');
            }
        });
    }

    // 暴露到全局
    window.state = state;
    window.initNavigation = initNavigation;
    window.initWelcomeModule = initWelcomeModule;
    window.openNavItem = openNavItem;
    window.closeAllDropdowns = closeAllDropdowns;
    window.toggleNavItem = toggleNavItem;
    window.toggleMobileMenu = toggleMobileMenu;
    window.closeMobileMenu = closeMobileMenu;
    window.syncMobileThemeIcon = syncMobileThemeIcon;
    window.syncMobileLoginBtn = syncMobileLoginBtn;
    window.switchModule = switchModule;
    window.updateNavActiveState = updateNavActiveState;

})();