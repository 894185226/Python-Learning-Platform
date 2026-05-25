// ===== API 层（连接后端 MySQL 数据库） =====
// 后端地址配置
const API_BASE = 'http://localhost:3000/api';

const API = {
    // 注册
    async register(username, password, displayName) {
        const res = await fetch(API_BASE + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, displayName })
        });
        return await res.json();
    },
    // 登录
    async login(username, password) {
        const res = await fetch(API_BASE + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await res.json();
    },
    // 获取用户学习进度
    async getProgress(username) {
        const res = await fetch(API_BASE + '/progress/' + encodeURIComponent(username));
        return await res.json();
    },
    // 标记模块完成
    async markModuleCompleted(username, moduleId, score) {
        const res = await fetch(API_BASE + '/progress/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, moduleId, score })
        });
        return await res.json();
    },
    // 颁发成就
    async awardAchievement(username, achievementId) {
        const res = await fetch(API_BASE + '/achievement/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, achievementId })
        });
        return await res.json();
    }
};

// 会话管理（仅存当前用户名，敏感操作走后端）
function getCurrentUser() {
    const data = sessionStorage.getItem('pv_current_user');
    return data ? JSON.parse(data) : null;
}
function setCurrentUser(user) {
    if (user) {
        sessionStorage.setItem('pv_current_user', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('pv_current_user');
    }
}

// 成就定义
const ACHIEVEMENTS = [
    { id: 'beginner', icon: '⭐', name: '入门之星', desc: '完成情境导入和知识讲解', check: (p) => p.modules['intro'] && p.modules['lesson'] },
    { id: 'judge', icon: '⚖️', name: '公正小法官', desc: '在命名小法官中获得8分以上', check: (p) => p.modules['judge'] },
    { id: 'debugger', icon: '🔧', name: '调试能手', desc: '修复所有bug（完成错误调试诊所）', check: (p) => p.modules['debug'] },
    { id: 'creator', icon: '🎨', name: '创意达人', desc: '完成创意项目制作', check: (p) => p.modules['project'] },
    { id: 'champion', icon: '🏆', name: '全能学霸', desc: '完成全部10个模块', check: (p) => Object.keys(p.modules).length >= 10 },
    { id: 'tracer', icon: '🔍', name: '追踪大师', desc: '完成值追踪挑战', check: (p) => p.modules['trace'] },
    { id: 'explorer', icon: '🧪', name: '实验先锋', desc: '完成类比实验室', check: (p) => p.modules['lab'] },
    { id: 'coder', icon: '💻', name: '编程新星', desc: '完成实践操作', check: (p) => p.modules['practice'] }
];

// 受保护的模块（需要登录才能访问，welcome 和 achievement 除外）
const PROTECTED_MODULES = ['intro', 'lesson', 'judge', 'debug', 'practice', 'trace', 'lab', 'extend', 'project', 'test'];
let pendingModuleId = null; // 登录后要跳转的目标模块

// ===== 用户认证系统 =====
function openLoginModal() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        // 已登录，询问是否退出
        if (confirm(currentUser.displayName + '，你要退出登录吗？')) {
            setCurrentUser(null);
            updateLoginUI();
            // 退出后刷新页面，回到未登录状态（仅显示基础介绍）
            location.reload();
        }
        return;
    }
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    pendingModuleId = null;
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    pendingModuleId = null;
}

function closeAllModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
    pendingModuleId = null;
}

// 保留兼容旧调用
function closeLoginModal_old() {
    closeAllModals();
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');

    const result = await API.login(username, password);
    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('w3-hide');
        return false;
    }

    // 登录成功
    setCurrentUser(result.user);
    closeLoginModal();
    updateLoginUI();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    errorEl.classList.add('w3-hide');
    
    // 刷新成就墙
    renderAchievementWall();

    // 如果有待跳转的目标模块，自动跳转
    if (pendingModuleId) {
        const target = pendingModuleId;
        pendingModuleId = null;
        switchModule(target);
    }
    
    return false;
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    const errorEl = document.getElementById('registerError');

    if (username.length < 2) {
        errorEl.textContent = '用户名至少需要2个字符！';
        errorEl.classList.remove('w3-hide');
        return false;
    }
    if (password.length < 4) {
        errorEl.textContent = '密码至少需要4个字符！';
        errorEl.classList.remove('w3-hide');
        return false;
    }

    const result = await API.register(username, password, displayName);
    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('w3-hide');
        return false;
    }

    // 注册成功，自动登录
    setCurrentUser({ username, displayName });
    closeRegisterModal();
    updateLoginUI();
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regDisplayName').value = '';
    renderAchievementWall();

    // 如果有待跳转的目标模块，自动跳转
    if (pendingModuleId) {
        const target = pendingModuleId;
        pendingModuleId = null;
        switchModule(target);
    }
    
    return false;
}

function updateLoginUI() {
    const currentUser = getCurrentUser();
    const btnText = document.getElementById('loginBtnText');
    const btn = document.querySelector('.signin-btn');
    
    if (currentUser) {
        btnText.textContent = currentUser.displayName;
        btn.classList.add('logged-in');
        btn.title = '点击退出登录';
    } else {
        btnText.textContent = '登录';
        btn.classList.remove('logged-in');
        btn.title = '';
    }
}

// ===== 学习进度追踪 =====
async function markModuleCompleted(moduleId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return; // 未登录不记录
    
    await API.markModuleCompleted(currentUser.username, moduleId);
    
    // 检查并颁发成就
    const newAch = await checkAndAwardAchievements(currentUser.username);
    if (newAch.length > 0) {
        console.log('新成就：', newAch);
        newAch.forEach(ach => showAchievementToast(ach));
    }
}

async function checkAndAwardAchievements(username) {
    const progress = await API.getProgress(username);
    const newAchievements = [];
    
    for (const ach of ACHIEVEMENTS) {
        if (ach.check(progress)) {
            if (!progress.achievements[ach.id]) {
                // 后端会忽略重复颁发，但先检查减少请求
                await API.awardAchievement(username, ach.id);
                newAchievements.push(ach);
            }
        }
    }
    
    return newAchievements;
}

// ===== 成就弹出提示 =====
function showAchievementToast(achievement) {
    const container = document.getElementById('achievementToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="achievement-toast-icon">${achievement.icon}</div>
        <div class="achievement-toast-body">
            <div class="achievement-toast-title">🏆 成就达成</div>
            <div class="achievement-toast-name">${achievement.name}</div>
            <div class="achievement-toast-desc">${achievement.desc}</div>
        </div>
    `;

    container.appendChild(toast);

    // 2.5秒后播放消失动画，3秒后移除元素
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }, 2500);
}

// ===== 成就墙渲染 =====
async function renderAchievementWall() {
    const currentUser = getCurrentUser();
    const userNameEl = document.getElementById('achievementUserName');
    const mapGrid = document.getElementById('mapGrid');
    const progressSummary = document.getElementById('progressSummary');
    const progressBar = document.getElementById('progressBar');
    const achievementList = document.getElementById('achievementList');
    const learningStats = document.getElementById('learningStats');

    if (!currentUser) {
        // 未登录状态
        if (userNameEl) userNameEl.textContent = '请先登录以查看学习成果！';
        if (learningStats) learningStats.style.display = 'none';
        updateMapGrid(null);
        if (achievementList) achievementList.innerHTML = '<p style="text-align:center;color:#999;">登录后可查看成就</p>';
        if (progressSummary) progressSummary.textContent = '总进度：请先登录';
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
        }
        return;
    }

    const progress = await API.getProgress(currentUser.username);
    
    if (userNameEl) {
        userNameEl.textContent = currentUser.displayName + ' 的学习成果';
    }
    
    // 更新探险地图
    updateMapGrid(progress);
    
    // 更新进度条
    const completedCount = Object.keys(progress.modules).length;
    const totalModules = 10;
    const percent = Math.round((completedCount / totalModules) * 100);
    
    if (progressSummary) {
        progressSummary.textContent = `总进度：${completedCount}/${totalModules} 模块完成 (${percent}%)`;
    }
    if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.textContent = percent + '%';
    }
    
    // 更新成就列表
    if (achievementList) {
        achievementList.innerHTML = ACHIEVEMENTS.map(ach => {
            const earnedDate = progress.achievements[ach.id];
            const earned = !!earnedDate;
            const dateStr = earnedDate ? new Date(earnedDate).toLocaleDateString('zh-CN') : '';
            return `
                <div class="achievement-item ${earned ? 'earned' : 'locked'}">
                    <span class="ach-icon">${ach.icon}</span>
                    <div class="ach-info">
                        <h4>${ach.icon} ${ach.name}</h4>
                        <p>${ach.desc}</p>
                    </div>
                    ${earned ? `<span class="achievement-date">${dateStr}</span>` : '<span class="achievement-date">未获得</span>'}
                </div>
            `;
        }).join('');
    }
    
    // 更新学习统计
    if (learningStats) {
        learningStats.style.display = 'block';
        document.getElementById('statCompleted').textContent = completedCount;
        document.getElementById('statAchievements').textContent = Object.keys(progress.achievements).length;
        document.getElementById('statDays').textContent = progress.loginDates.length;
    }
}

function updateMapGrid(progress) {
    const mapItems = document.querySelectorAll('.map-item[data-module-id]');
    if (!mapItems.length) return;
    
    mapItems.forEach(item => {
        const moduleId = item.getAttribute('data-module-id');
        if (progress && progress.modules[moduleId]) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });
}
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
        {
            code: 'print(score)',
            question: '这段代码会报错，为什么？',
            options: [
                { text: 'print拼写错误', correct: false },
                { text: '变量score未定义', correct: true },
                { text: '缺少分号', correct: false },
                { text: '括号不匹配', correct: false }
            ]
        },
        {
            code: 'name = 小明',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '变量名错误', correct: false },
                { text: '字符串需要加引号', correct: true },
                { text: '赋值符号错误', correct: false },
                { text: '缺少括号', correct: false }
            ]
        },
        {
            code: '2age = 12',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '数字不能赋值给变量', correct: false },
                { text: '变量名不能以数字开头', correct: true },
                { text: '缺少等号', correct: false },
                { text: '语法错误', correct: false }
            ]
        },
        {
            code: 'my name = "张三"',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '变量名不能有空格', correct: true },
                { text: '字符串格式错误', correct: false },
                { text: '缺少引号', correct: false },
                { text: '赋值错误', correct: false }
            ]
        },
        {
            code: 'x = 5\ny = x + "2"',
            question: '这段代码会报错，为什么？',
            options: [
                { text: '变量y未定义', correct: false },
                { text: '不能将数字和字符串直接相加', correct: true },
                { text: '缺少分号', correct: false },
                { text: '缩进错误', correct: false }
            ]
        }
    ],
    testAnswers: {},
    questions: [
        {
            question: '以下哪个是合法的Python变量名？',
            options: ['2var', 'my-var', 'my_var', 'var!'],
            correct: 2
        },
        {
            question: '语句 x = 10 的含义是？',
            options: ['x等于10', '将10赋值给x', 'x加10', 'x减10'],
            correct: 1
        },
        {
            question: '执行 x = 5; x = x + 1 后，x的值是？',
            options: ['5', '6', '1', '错误'],
            correct: 1
        },
        {
            question: '以下哪个是Python的关键字？',
            options: ['name', 'age', 'class', 'score'],
            correct: 2
        },
        {
            question: '交换两个变量a和b的值，需要？',
            options: ['直接交换', '引入临时变量', '使用加法', '无法交换'],
            correct: 1
        }
    ],
    traceStep: 0,
    traceVariables: { x: '?', y: '?', z: '?' },
    currentLevel: 1
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化用户登录UI
    updateLoginUI();
    
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
    initTestModule();
    initTypewriterEffect();
    initScrollReveal();
    
    // 如果在成就墙模块，刷新显示
    renderAchievementWall();
});

// 欢迎模块
function initWelcomeModule() {
    const startBtn = document.getElementById('start-learning');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // 切换到情境导入模块
            switchModule('intro');
        });
    }
}

// 导航模块 - W3Schools风格下拉菜单
function initNavigation() {
    // Logo链接点击事件 - 返回首页
    const logoLink = document.querySelector('.logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', function(e) {
            e.preventDefault();
            switchModule('welcome');
        });
    }
    
    // 下拉菜单功能由全局 openNavItem 函数处理（HTML onclick 调用）
    // 此处不再重复绑定事件，避免冲突
    
    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.w3-top')) {
            const allNavs = document.querySelectorAll('.w3-dropdown-content');
            allNavs.forEach(nav => nav.classList.add('w3-hide'));
        }
    });
    
    // 移动端菜单
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            const moduleId = this.dataset.module;
            switchModule(moduleId);
            closeMobileMenu();
        });
    });
    
    // 导航链接（包含所有带有 data-module 属性的链接）
    const navLinks = document.querySelectorAll('.nav-link, [data-module]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const moduleId = this.dataset.module;
            if (moduleId) {
                switchModule(moduleId);
            }
            
            // 关闭下拉菜单
            const allNavs = document.querySelectorAll('.w3-dropdown-content');
            allNavs.forEach(nav => nav.classList.add('w3-hide'));
        });
    });
    
    // 页脚链接
    const footerLinks = document.querySelectorAll('.footer-section a[href^="#"]');
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const moduleId = this.getAttribute('href').substring(1);
            switchModule(moduleId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// 全局函数 - 打开导航菜单（供HTML onclick调用）
function openNavItem(navId) {
    const allNavs = document.querySelectorAll('.w3-dropdown-content');
    const targetNav = document.getElementById('nav_' + navId);
    
    // 隐藏其他菜单
    allNavs.forEach(function(nav) {
        if (nav !== targetNav) {
            nav.classList.add('w3-hide');
        }
    });
    
    // 切换当前菜单
    if (targetNav) {
        targetNav.classList.toggle('w3-hide');
    }
}

// 切换下拉菜单
function toggleNavItem(navId) {
    const allNavs = document.querySelectorAll('.w3-dropdown-content');
    const targetNav = document.getElementById(`nav_${navId}`);
    
    if (targetNav) {
        allNavs.forEach(nav => {
            if (nav.id !== `nav_${navId}`) {
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

// ===== 搜索关键词映射 =====
const SEARCH_KEYWORDS = [
    { keywords: ['变量', 'variable', '盒子', '情境', '场景', '导入', '介绍'], moduleId: 'intro', name: '情境导入', icon: '🎬', desc: '了解为什么需要变量' },
    { keywords: ['实验室', '拖拽', '标签', '数据', '拖动', '类比'], moduleId: 'lab', name: '生活类比实验室', icon: '🧪', desc: '拖拽体验变量概念' },
    { keywords: ['知识', '讲解', '概念', '命名', '规则', '赋值', '赋值符号', '学习', '教程'], moduleId: 'lesson', name: '知识讲解', icon: '📚', desc: '学习变量核心概念' },
    { keywords: ['法官', '合法', '非法', '判断', '命名规则', '判断题'], moduleId: 'judge', name: '命名小法官', icon: '⚖️', desc: '判断变量名合法性' },
    { keywords: ['实践', '操作', '代码', '运行', '编程', '练习', '写代码'], moduleId: 'practice', name: '实践操作', icon: '💻', desc: '动手编写变量代码' },
    { keywords: ['追踪', '值', '跟踪', '变量值', '变化'], moduleId: 'trace', name: '值追踪挑战', icon: '🔍', desc: '追踪变量值变化' },
    { keywords: ['错误', 'bug', '调试', '修复', '诊所', '纠错', '改错'], moduleId: 'debug', name: '错误调试诊所', icon: '🏥', desc: '找出并修复代码bug' },
    { keywords: ['扩展', '思维', '挑战', '交换', '拼接', '句子'], moduleId: 'extend', name: '扩展思维', icon: '🚀', desc: '高阶变量操作挑战' },
    { keywords: ['创意', '项目', '名片', '制作', '生成'], moduleId: 'project', name: '创意迷你项目', icon: '🎨', desc: '制作个人电子名片' },
    { keywords: ['测验', '测试', '考试', '小测', '题目', '选择题'], moduleId: 'test', name: '课堂小测', icon: '📝', desc: '检验学习成果' },
    { keywords: ['成就', '进度', '成果', '墙', '学习记录', '探险地图'], moduleId: 'achievement', name: '成就墙', icon: '🏆', desc: '查看学习成果与成就' }
];

// 根据输入文本匹配模块
function matchModules(searchTerm) {
    if (!searchTerm) return SEARCH_KEYWORDS.map(m => ({ ...m, score: 0 }));
    const term = searchTerm.toLowerCase();
    const results = [];
    
    SEARCH_KEYWORDS.forEach(entry => {
        let maxScore = 0;
        entry.keywords.forEach(kw => {
            const lowerKw = kw.toLowerCase();
            if (lowerKw === term) {
                maxScore = Math.max(maxScore, 100); // 完全匹配
            } else if (lowerKw.startsWith(term)) {
                maxScore = Math.max(maxScore, 80); // 前缀匹配
            } else if (lowerKw.includes(term)) {
                maxScore = Math.max(maxScore, 50); // 包含匹配
            } else {
                // 模糊匹配：计算最长公共子序列
                const lcsLen = longestCommonSubseq(term, lowerKw);
                const ratio = lcsLen / Math.max(term.length, lowerKw.length);
                if (ratio > 0.5) {
                    maxScore = Math.max(maxScore, Math.round(ratio * 30));
                }
            }
        });
        if (maxScore > 0 || !searchTerm) {
            results.push({ ...entry, score: maxScore });
        }
    });
    
    results.sort((a, b) => b.score - a.score);
    return results;
}

// 最长公共子序列长度
function longestCommonSubseq(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}

// 搜索建议下拉
function showSearchSuggestions(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const searchTerm = input.value.trim();
    const results = matchModules(searchTerm).slice(0, 6);

    // 找到对应的建议容器
    const suggestionsId = inputId === 'hero-search-input' ? 'hero-search-suggestions' : 'search-suggestions';
    const suggestionsEl = document.getElementById(suggestionsId);
    if (!suggestionsEl) return;

    if (results.length === 0 || !searchTerm) {
        suggestionsEl.classList.remove('active');
    } else {
        suggestionsEl.innerHTML = results.map(r => `
            <div class="search-suggestion-item" onclick="navigateToModule('${r.moduleId}')">
                <span class="search-suggestion-icon">${r.icon}</span>
                <div>
                    <div class="search-suggestion-text">${r.name}</div>
                    <div class="search-suggestion-desc">${r.desc}</div>
                </div>
            </div>
        `).join('');
        suggestionsEl.classList.add('active');
    }
}

// 跳转到模块
function navigateToModule(moduleId) {
    // 隐藏所有建议下拉
    document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
    switchModule(moduleId);
}

// 搜索功能（提交时调用）
function search(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return false;
    const searchTerm = input.value.trim();
    if (!searchTerm) return false;

    const results = matchModules(searchTerm);
    if (results.length > 0) {
        // 隐藏建议下拉
        document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
        switchModule(results[0].moduleId);
    } else {
        alert(`未找到与"${searchTerm}"相关的内容，请尝试：变量、代码、调试、测验等关键词`);
    }
    return false;
}

// 点击其他地方关闭搜索建议
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container') && !e.target.closest('.hero-form')) {
        document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
    }
});

// 移动端菜单控制
function toggleMobileMenu() {
    document.getElementById('mobileMenuModal').style.display = 'block';
}

function closeMobileMenu() {
    document.getElementById('mobileMenuModal').style.display = 'none';
}

function switchModule(moduleId) {
    const modules = document.querySelectorAll('.module');
    const targetModule = document.getElementById(moduleId);
    
    if (!targetModule) {
        console.error('Module not found:', moduleId);
        return;
    }

    // 检查是否需要登录
    if (PROTECTED_MODULES.includes(moduleId)) {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            // 未登录：记录目标模块，弹出登录弹窗
            pendingModuleId = moduleId;
            openLoginModal();
            return;
        }
    }
    
    modules.forEach(module => module.classList.remove('active'));
    targetModule.classList.add('active');
    state.currentModule = moduleId;

    // 注意：不再在此处自动标记模块完成
    // 各模块需在用户实际完成交互后才调用 markModuleCompleted()
    
    // 如果切换到成就墙页面，刷新显示
    if (moduleId === 'achievement') {
        renderAchievementWall();
    }
    // 如果切换到知识讲解，刷新按钮状态
    if (moduleId === 'lesson') {
        refreshLessonButton();
    }
}

// 情境导入模块
function initIntroModule() {
    const sceneButtons = document.querySelectorAll('.scene-btn');
    const visitedScenes = new Set();

    sceneButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetScene = btn.dataset.target;
            const scenes = document.querySelectorAll('.scene');
            scenes.forEach(scene => scene.classList.remove('active'));
            document.querySelector(`.scene[data-scene="${targetScene}"]`).classList.add('active');

            // 追踪场景访问，三个场景都看过才算完成
            visitedScenes.add(targetScene);
            if (visitedScenes.size >= 3) {
                markModuleCompleted('intro');
            }
        });
    });

    // 动画效果
    animateScore();
    animateNames();
    animateCountdown();
}

function animateScore() {
    const scoreSpan = document.querySelector('.score');
    let score = 0;
    setInterval(() => {
        score += Math.floor(Math.random() * 10) + 1;
        scoreSpan.textContent = score;
        if (score >= 100) score = 0;
    }, 200);
}

function animateNames() {
    const names = ['张三', '李四', '王五', '赵六', '小明'];
    const nameSpan = document.querySelector('.name');
    let index = 0;
    setInterval(() => {
        index = (index + 1) % names.length;
        nameSpan.textContent = names[index];
    }, 1500);
}

function animateCountdown() {
    const countdownSpan = document.querySelector('.countdown');
    let count = 10;
    const interval = setInterval(() => {
        count--;
        countdownSpan.textContent = count;
        if (count <= 0) {
            count = 10;
        }
    }, 1000);
}

// 知识讲解模块
function initLessonModule() {
    const completeBtn = document.getElementById('lesson-complete-btn');
    if (!completeBtn) return;

    completeBtn.addEventListener('click', async () => {
        await markModuleCompleted('lesson');
        completeBtn.textContent = '✅ 已学完';
        completeBtn.disabled = true;
        completeBtn.style.opacity = '0.6';
    });

    // 检查是否已完成，更新按钮状态
    refreshLessonButton();
}

async function refreshLessonButton() {
    const completeBtn = document.getElementById('lesson-complete-btn');
    if (!completeBtn) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    try {
        const progress = await API.getProgress(currentUser.username);
        if (progress.modules['lesson']) {
            completeBtn.textContent = '✅ 已学完';
            completeBtn.disabled = true;
            completeBtn.style.opacity = '0.6';
        }
    } catch (e) {
        // 静默处理
    }
}

// 生活类比实验室模块
function initLabModule() {
    const dragItems = document.querySelectorAll('.drag-item');
    const variableBox = document.getElementById('variable-box');
    const boxLabelArea = document.getElementById('box-label-area');
    const boxValueArea = document.getElementById('box-value-area');
    const boxType = document.getElementById('box-type');
    const codeLabel = document.querySelector('.code-label');
    const codeValue = document.querySelector('.code-value');

    let currentLabel = '';
    let currentValue = '';
    let currentValueType = '';
    let labLabelDropped = false;
    let labValueDropped = false;

    function checkLabComplete() {
        if (labLabelDropped && labValueDropped) {
            markModuleCompleted('lab');
        }
    }

    dragItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', item.dataset.type);
            e.dataTransfer.setData('value', item.dataset.value);
            if (item.classList.contains('text')) {
                e.dataTransfer.setData('dataType', 'text');
            } else if (item.classList.contains('number')) {
                e.dataTransfer.setData('dataType', 'number');
            }
        });
    });

    variableBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        variableBox.classList.add('dragover');
    });

    variableBox.addEventListener('dragleave', () => {
        variableBox.classList.remove('dragover');
    });

    variableBox.addEventListener('drop', (e) => {
        e.preventDefault();
        variableBox.classList.remove('dragover');

        const type = e.dataTransfer.getData('type');
        const value = e.dataTransfer.getData('value');
        const dataType = e.dataTransfer.getData('dataType');

        if (type === 'label') {
            currentLabel = value;
            labLabelDropped = true;
            boxLabelArea.textContent = value;
            codeLabel.textContent = value;
            variableBox.style.borderColor = '#667eea';
        } else if (type === 'data') {
            currentValue = value;
            labValueDropped = true;
            currentValueType = dataType;
            boxValueArea.textContent = value;
            codeValue.textContent = dataType === 'text' ? `"${value}"` : value;
            
            if (dataType === 'number') {
                variableBox.style.borderColor = '#28a745';
                boxType.textContent = '类型: 数字';
            } else {
                variableBox.style.borderColor = '#17a2b8';
                boxType.textContent = '类型: 文字';
            }
        }
        checkLabComplete();
    });
}

// 命名小法官模块
function initJudgeModule() {
    const validBtn = document.getElementById('btn-valid');
    const invalidBtn = document.getElementById('btn-invalid');
    const feedback = document.getElementById('judge-feedback');
    const scoreDisplay = document.getElementById('judge-score');
    const answeredDisplay = document.getElementById('judge-answered');
    const resetBtn = document.getElementById('judge-reset-btn');

    let judgeAnswered = 0;
    let judgeScore = 0;
    let judgeQuestions = [...state.judgeQuestions]; // 副本，用于打乱

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // 初始打乱
    shuffleArray(judgeQuestions);

    function resetJudge() {
        judgeAnswered = 0;
        judgeScore = 0;
        scoreDisplay.textContent = '0';
        answeredDisplay.textContent = '0';
        shuffleArray(judgeQuestions);
        state.currentJudgeIndex = 0;
        feedback.textContent = '';
        validBtn.disabled = false;
        invalidBtn.disabled = false;
        resetBtn.style.display = 'none';
        showCurrentQuestion();
    }

    function showCurrentQuestion() {
        const current = judgeQuestions[state.currentJudgeIndex];
        document.getElementById('current-variable').textContent = current.name;
        feedback.textContent = '';
    }

    function checkAnswer(isValid) {
        if (validBtn.disabled) return; // 10题已答完

        const current = judgeQuestions[state.currentJudgeIndex];
        if (isValid === current.valid) {
            feedback.textContent = `✅ 回答正确！${current.reason}`;
            feedback.style.color = '#28a745';
            judgeScore++;
            scoreDisplay.textContent = judgeScore;

            // 达到8分立即标记完成
            if (judgeScore >= 8) {
                markModuleCompleted('judge');
            }
        } else {
            feedback.textContent = `❌ 回答错误！${current.reason}`;
            feedback.style.color = '#dc3545';
        }

        setTimeout(() => {
            judgeAnswered++;
            answeredDisplay.textContent = judgeAnswered;

            state.currentJudgeIndex = (state.currentJudgeIndex + 1) % judgeQuestions.length;

            if (judgeAnswered >= 10) {
                // 10题答完，禁用按钮，显示重置
                validBtn.disabled = true;
                invalidBtn.disabled = true;
                resetBtn.style.display = 'block';
                return;
            }

            showCurrentQuestion();
        }, 1500);
    }

    validBtn.addEventListener('click', () => checkAnswer(true));
    invalidBtn.addEventListener('click', () => checkAnswer(false));
    resetBtn.addEventListener('click', resetJudge);

    showCurrentQuestion();
}

// 实践操作模块
function initPracticeModule() {
    const levelButtons = document.querySelectorAll('.level-btn');
    const instructionText = document.getElementById('instruction-text');
    const codeInput = document.getElementById('code-input');
    const runBtn = document.getElementById('run-code');
    const outputContent = document.getElementById('output-content');
    let practiceCompleted = false;

    const levels = {
        1: {
            instruction: '补全代码：给变量name赋值为"小明"并打印输出',
            template: '# 在这里编写代码\nname = \nprint(name)',
            solution: ['name = "小明"', 'name = "小明"\n', 'name = \'小明\'', 'name = \'小明\'\n']
        },
        2: {
            instruction: '定义两个变量：name赋值为"小红"，age赋值为12，然后打印它们',
            template: '# 在这里编写代码\nname = \nage = \nprint(name)\nprint(age)',
            solution: ['name = "小红"\nage = 12', 'name = "小红"\nage = 12\n']
        },
        3: {
            instruction: '修改变量值：先给x赋值5，然后让x增加3，最后打印x',
            template: '# 在这里编写代码\nx = \nx = \nprint(x)',
            solution: ['x = 5\nx = x + 3', 'x = 5\nx = x + 3\n', 'x = 5\nx = 8', 'x = 5\nx = 8\n']
        }
    };

    levelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const level = parseInt(btn.dataset.level);
            state.currentLevel = level;
            levelButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            instructionText.textContent = levels[level].instruction;
            codeInput.value = levels[level].template;
            outputContent.textContent = '';
        });
    });

    runBtn.addEventListener('click', () => {
        const code = codeInput.value;
        const level = state.currentLevel;
        
        try {
            // 简单的代码执行模拟
            let output = '';
            const lines = code.split('\n');
            
            const variables = {};
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('#')) return;
                if (line.includes('=')) {
                    const parts = line.split('=');
                    const varName = parts[0].trim();
                    let varValue = parts.slice(1).join('=').trim();
                    
                    // 处理字符串
                    if ((varValue.startsWith('"') && varValue.endsWith('"')) || 
                        (varValue.startsWith('\'') && varValue.endsWith('\''))) {
                        variables[varName] = varValue.slice(1, -1);
                    } else if (!isNaN(varValue)) {
                        variables[varName] = parseInt(varValue);
                    } else {
                        variables[varName] = varValue;
                    }
                } else if (line.startsWith('print(')) {
                    const varName = line.slice(6, -1).trim();
                    if (variables[varName] !== undefined) {
                        output += variables[varName] + '\n';
                    } else {
                        output += varName + '\n';
                    }
                }
            });
            
            outputContent.textContent = output || '无输出';
            outputContent.style.color = '#a6e22e';
            if (!practiceCompleted) {
                practiceCompleted = true;
                markModuleCompleted('practice');
            }
        } catch (e) {
            outputContent.textContent = '错误: ' + e.message;
            outputContent.style.color = '#f92672';
        }
    });
}

// 值追踪挑战模块
function initTraceModule() {
    const stepBtn = document.getElementById('step-forward');
    const resetBtn = document.getElementById('reset-trace');
    const feedback = document.getElementById('trace-feedback');

    const steps = [
        { x: 5, y: '?', z: '?', line: 0 },
        { x: 5, y: 7, z: '?', line: 1 },
        { x: 10, y: 7, z: '?', line: 2 },
        { x: 10, y: 7, z: 17, line: 3 }
    ];

    function updateDisplay() {
        const current = steps[state.traceStep];
        document.getElementById('value-x').textContent = current.x;
        document.getElementById('value-y').textContent = current.y;
        document.getElementById('value-z').textContent = current.z;
    }

    stepBtn.addEventListener('click', () => {
        if (state.traceStep < steps.length - 1) {
            state.traceStep++;
            updateDisplay();
            
            const lineTexts = ['x = 5', 'y = x + 2', 'x = 10', 'z = x + y'];
            feedback.textContent = `执行: ${lineTexts[state.traceStep]}`;
            feedback.style.color = '#28a745';
        } else {
            feedback.textContent = '🎉 执行完成！最终结果: x=10, y=7, z=17';
            feedback.style.color = '#667eea';
            // 记录值追踪完成
            markModuleCompleted('trace');
        }
    });

    resetBtn.addEventListener('click', () => {
        state.traceStep = 0;
        updateDisplay();
        feedback.textContent = '';
    });

    updateDisplay();
}

// 错误调试诊所模块
function initDebugModule() {
    const bugCode = document.getElementById('bug-code');
    const optionsContainer = document.getElementById('debug-options');
    const feedback = document.getElementById('debug-feedback');
    const prevBtn = document.getElementById('prev-bug');
    const nextBtn = document.getElementById('next-bug');
    const medalCount = document.querySelector('#debug-medal span');

    function showBug(index) {
        const bug = state.bugs[index];
        bugCode.textContent = bug.code;
        
        // 清空现有选项
        optionsContainer.innerHTML = '<p>请选择正确的修复方案：</p>';
        
        // 添加新选项
        bug.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option.text;
            btn.dataset.index = idx;
            btn.addEventListener('click', () => checkBugAnswer(option.correct));
            optionsContainer.appendChild(btn);
        });
        
        feedback.textContent = '';
    }

    function checkBugAnswer(isCorrect) {
        if (isCorrect) {
            feedback.textContent = '✅ 修复成功！获得一枚勋章！';
            feedback.style.color = '#28a745';
            state.debugMedals++;
            medalCount.textContent = state.debugMedals;
            
            // 所有bug修复完成
            if (state.debugMedals >= state.bugs.length) {
                markModuleCompleted('debug');
            }
        } else {
            feedback.textContent = '❌ 修复失败，再试试吧！';
            feedback.style.color = '#dc3545';
        }

        setTimeout(() => {
            nextBtn.click();
        }, 1500);
    }

    prevBtn.addEventListener('click', () => {
        state.currentBugIndex = (state.currentBugIndex - 1 + state.bugs.length) % state.bugs.length;
        showBug(state.currentBugIndex);
    });

    nextBtn.addEventListener('click', () => {
        state.currentBugIndex = (state.currentBugIndex + 1) % state.bugs.length;
        showBug(state.currentBugIndex);
    });

    showBug(state.currentBugIndex);
}

// 扩展思维模块
function initExtendModule() {
    const challengeButtons = document.querySelectorAll('.challenge-btn');
    const swapChallenge = document.getElementById('swap-challenge');
    const combineChallenge = document.getElementById('combine-challenge');
    const generateSentenceBtn = document.getElementById('generate-sentence');
    const combineOutput = document.getElementById('combine-output');

    let extendSwapDone = false;
    let extendSentenceDone = false;

    function checkExtendComplete() {
        if (extendSwapDone && extendSentenceDone) {
            markModuleCompleted('extend');
        }
    }

    // 挑战切换
    challengeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const challenge = btn.dataset.challenge;
            challengeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (challenge === 'swap') {
                swapChallenge.style.display = 'block';
                combineChallenge.style.display = 'none';
            } else {
                swapChallenge.style.display = 'none';
                combineChallenge.style.display = 'block';
            }
        });
    });

    // ---------- 挑战1：变量交换交互 ----------
    const swapStepBtn = document.getElementById('swap-step-btn');
    const swapResetBtn = document.getElementById('swap-reset-btn');
    const swapStepText = document.getElementById('swap-step-text');
    const glassASpan = document.querySelector('#glass-a .glass-content');
    const glassBSpan = document.querySelector('#glass-b .glass-content');
    const glassTempSpan = document.querySelector('#glass-temp .glass-content');

    let swapStep = 0;
    const swapData = { a: '🍎', b: '🍊', temp: '' };

    function highlightCodeLine(step) {
        document.querySelectorAll('#swap-code-block .code-line[data-step]').forEach(el => {
            el.classList.remove('active');
            if (parseInt(el.dataset.step) === step) {
                el.classList.add('active');
            }
        });
    }

    function updateSwapDisplay() {
        glassASpan.textContent = swapData.a || '空';
        glassBSpan.textContent = swapData.b || '空';
        glassTempSpan.textContent = swapData.temp || '空';
    }

    if (swapStepBtn) {
        swapStepBtn.addEventListener('click', () => {
            swapStep++;

            if (swapStep === 1) {
                // Step 1: temp = a
                swapData.temp = swapData.a;
                swapData.a = '';
                swapStepText.textContent = '步骤 1/3：temp = a  →  🍎 移到了"临时"杯';
                highlightCodeLine(1);
                updateSwapDisplay();
            } else if (swapStep === 2) {
                // Step 2: a = b
                swapData.a = swapData.b;
                swapData.b = '';
                swapStepText.textContent = '步骤 2/3：a = b  →  🍊 移到了 A 杯';
                highlightCodeLine(2);
                updateSwapDisplay();
            } else if (swapStep === 3) {
                // Step 3: b = temp
                swapData.b = swapData.temp;
                swapData.temp = '';
                swapStepText.textContent = '步骤 3/3：b = temp  →  🍎 移到了 B 杯，交换完成！';
                highlightCodeLine(3);
                swapStepBtn.disabled = true;
                swapStepBtn.textContent = '✓ 交换完成';
                updateSwapDisplay();
                extendSwapDone = true;
                checkExtendComplete();
            }
        });
    }

    if (swapResetBtn) {
        swapResetBtn.addEventListener('click', () => {
            swapStep = 0;
            swapData.a = '🍎';
            swapData.b = '🍊';
            swapData.temp = '';
            swapStepBtn.disabled = false;
            swapStepBtn.textContent = '▶ 开始交换';
            swapStepText.textContent = '点击"开始交换"观察变量交换过程';
            highlightCodeLine(0);
            updateSwapDisplay();
        });
    }

    // ---------- 挑战2：句子拼接 ----------
    if (generateSentenceBtn) {
        generateSentenceBtn.addEventListener('click', () => {
            const name = document.getElementById('combine-name').value;
            const age = document.getElementById('combine-age').value;
            const hobby = document.getElementById('combine-hobby').value;
            
            const sentence = `大家好！我叫${name}，今年${age}岁，我喜欢${hobby}。`;
            combineOutput.textContent = sentence;
            extendSentenceDone = true;
            checkExtendComplete();
        });
    }
}

// 创意迷你项目模块
function initProjectModule() {
    const generateCardBtn = document.getElementById('generate-card');

    generateCardBtn.addEventListener('click', () => {
        const name = document.getElementById('card-name').value;
        const age = document.getElementById('card-age').value;
        const hobby = document.getElementById('card-hobby').value;
        const dream = document.getElementById('card-dream').value;

        document.getElementById('preview-name').textContent = name;
        document.getElementById('preview-age').textContent = age;
        document.getElementById('preview-hobby').textContent = hobby;
        document.getElementById('preview-dream').textContent = dream;
        
        // 记录项目完成
        markModuleCompleted('project');
    });
}

// 课堂小测模块
function initTestModule() {
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-question');
    const nextBtn = document.getElementById('next-question');
    const submitBtn = document.getElementById('submit-test');
    const progressDisplay = document.getElementById('test-progress');
    const testResult = document.getElementById('test-result');
    const questionContainer = document.getElementById('question-container');
    const testControls = document.querySelector('.test-controls');
    const finalScore = document.getElementById('final-score');
    const finalGrade = document.getElementById('final-grade');

    let currentQuestion = 0;

    function showQuestion(index) {
        const question = state.questions[index];
        questionText.textContent = question.question;
        progressDisplay.textContent = index + 1;
        
        // 清空现有选项
        optionsContainer.innerHTML = '';
        
        // 添加新选项
        question.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option;
            btn.dataset.index = idx;
            
            // 如果已有答案，高亮显示
            if (state.testAnswers[index] === idx) {
                btn.classList.add('selected');
            }
            
            btn.addEventListener('click', () => {
                state.testAnswers[index] = idx;
                // 移除其他选项的高亮
                optionsContainer.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            
            optionsContainer.appendChild(btn);
        });
    }

    prevBtn.addEventListener('click', () => {
        if (currentQuestion > 0) {
            currentQuestion--;
            showQuestion(currentQuestion);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestion < state.questions.length - 1) {
            currentQuestion++;
            showQuestion(currentQuestion);
        }
    });

    submitBtn.addEventListener('click', () => {
        // 计算得分
        let score = 0;
        state.questions.forEach((q, idx) => {
            if (state.testAnswers[idx] === q.correct) {
                score++;
            }
        });

        finalScore.textContent = score;
        
        // 计算评级
        const percentage = (score / state.questions.length) * 100;
        let grade;
        if (percentage >= 90) grade = '🏆 优秀';
        else if (percentage >= 70) grade = '👍 良好';
        else if (percentage >= 60) grade = '✅ 及格';
        else grade = '📚 继续加油';
        finalGrade.textContent = grade;

        // 显示结果
        questionContainer.style.display = 'none';
        testControls.style.display = 'none';
        testResult.style.display = 'block';
        
        // 记录测试完成
        markModuleCompleted('test');

        // 绘制雷达图
        drawRadarChart(score);
    });

    function drawRadarChart(score) {
        const canvas = document.getElementById('radar-canvas');
        const ctx = canvas.getContext('2d');
        const centerX = 150;
        const centerY = 150;
        const radius = 100;
        const labels = ['变量定义', '命名规则', '赋值操作', '调试能力', '综合应用'];
        
        // 根据得分计算各维度能力
        const values = [];
        for (let i = 0; i < 5; i++) {
            // 根据得分分布各维度能力
            if (score >= 5) values.push(3);
            else if (score >= 4) values.push(i < 4 ? 3 : 2);
            else if (score >= 3) values.push(i < 3 ? 3 : i < 4 ? 2 : 1);
            else if (score >= 2) values.push(i < 2 ? 2 : 1);
            else values.push(i === 0 ? 1 : 0);
        }

        // 绘制背景网格
        for (let r = radius / 3; r <= radius; r += radius / 3) {
            ctx.beginPath();
            for (let i = 0; i < labels.length; i++) {
                const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 绘制坐标轴
        for (let i = 0; i < labels.length; i++) {
            const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#ddd';
            ctx.stroke();
            
            // 绘制标签
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            const labelX = centerX + (radius + 20) * Math.cos(angle);
            const labelY = centerY + (radius + 20) * Math.sin(angle);
            ctx.fillText(labels[i], labelX, labelY);
        }

        // 绘制数据区域
        ctx.beginPath();
        for (let i = 0; i < labels.length; i++) {
            const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
            const value = values[i];
            const r = (value / 3) * radius;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制数据点
        for (let i = 0; i < labels.length; i++) {
            const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
            const value = values[i];
            const r = (value / 3) * radius;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#667eea';
            ctx.fill();
        }
    }

    showQuestion(currentQuestion);
}

// 打字机效果初始化（不自动启动）
function initTypewriterEffect() {
    // 不自动启动，等待滚动显示后再启动
}

// 启动打字机效果
function startTypewriterEffect() {
    const containers = document.querySelectorAll('.typewriter-container');
    
    containers.forEach((container) => {
        const output = container.querySelector('.typewriter-output');
        const cursor = container.querySelector('.typewriter-cursor');
        
        if (!output) return;
        
        const text = `name = "小明"
age = 12
score = 95.5`;
        
        output.textContent = '';
        
        if (cursor) {
            output.appendChild(cursor);
        }
        
        let charIndex = 0;
        
        function typeCharacter() {
            if (charIndex < text.length) {
                const char = text[charIndex];
                if (char === '\n') {
                    output.insertBefore(document.createElement('br'), cursor);
                } else {
                    output.insertBefore(document.createTextNode(char), cursor);
                }
                charIndex++;
                setTimeout(typeCharacter, 100);
            }
        }
        
        setTimeout(typeCharacter, 500);
    });
}

// 滚动显示效果
function initScrollReveal() {
    const modules = document.querySelectorAll('.module');
    const featureCards = document.querySelectorAll('.feature-card');
    const quickStartContent = document.querySelector('.quick-start-content');
    let typewriterStarted = false;
    
    // 页面加载时显示第一个模块和可见的feature-card
    const firstModule = document.querySelector('.module');
    if (firstModule) {
        firstModule.classList.add('active');
    }
    
    // 初始检测feature-card
    setTimeout(() => {
        const windowHeight = window.innerHeight;
        featureCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < windowHeight * 0.8) {
                card.classList.add('visible');
            }
        });
    }, 100);
    
    // 滚动检测
    function checkScroll() {
        const windowHeight = window.innerHeight;
        
        // 检测模块
        modules.forEach((module) => {
            const rect = module.getBoundingClientRect();
            const moduleTop = rect.top;
            const moduleHeight = rect.height;
            
            // 当模块进入视口70%时激活
            if (moduleTop < windowHeight * 0.7 && moduleTop + moduleHeight > 0) {
                module.classList.add('active');
            }
        });
        
        // 检测feature-card
        featureCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < windowHeight * 0.8) {
                card.classList.add('visible');
            }
        });
        
        // 检测quick-start-content并触发打字机效果
        if (quickStartContent && !quickStartContent.classList.contains('visible')) {
            const rect = quickStartContent.getBoundingClientRect();
            if (rect.top < windowHeight * 0.7) {
                quickStartContent.classList.add('visible');
                
                // 打字机效果在显示后延迟启动
                if (!typewriterStarted) {
                    typewriterStarted = true;
                    setTimeout(startTypewriterEffect, 300);
                }
            }
        }
    }
    
    // 初始检测
    setTimeout(checkScroll, 100);
    
    // 滚动事件监听
    window.addEventListener('scroll', checkScroll);
}
