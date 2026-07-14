// ===== API 层（连接后端 MySQL 数据库） =====
const API_BASE = '/api';

const DEBUG = false;
const log = { log: DEBUG ? console.log.bind(console) : () => {}, warn: console.warn.bind(console), error: console.error.bind(console) };

let dbReady = false;

async function checkDBStatus() {
    try {
        const res = await fetch(API_BASE + '/status');
        const data = await res.json();
        dbReady = data.dbReady;
        if (!dbReady) {
            showOfflineWarning();
        }
    } catch (e) {
        dbReady = false;
        showOfflineWarning();
    }
}

function showOfflineWarning() {
    const existing = document.getElementById('offline-warning');
    if (existing) return;
    
    const warning = document.createElement('div');
    warning.id = 'offline-warning';
    warning.style.cssText = `
        position: fixed; top: 60px; left: 0; right: 0; z-index: 1000;
        background: #ff9800; color: white; padding: 12px; text-align: center;
        font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    warning.innerHTML = `
        <i class="fas fa-database"></i>
        <span>数据库未连接，学习进度无法保存。请启动 MySQL 服务后刷新页面。</span>
        <button onclick="this.parentElement.remove()" style="margin-left: 10px; padding: 4px 12px; border: none; border-radius: 4px; background: rgba(255,255,255,0.3); color: white; cursor: pointer;">
            关闭
        </button>
    `;
    document.body.appendChild(warning);
}

// 通用错误提示条
function showToast(message, type = 'error') {
    const container = document.getElementById('achievementToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `achievement-toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = `
        <div class="achievement-toast-icon">${type === 'error' ? '⚠️' : '✅'}</div>
        <div class="achievement-toast-body">
            <div class="achievement-toast-title">${type === 'error' ? '提示' : '成功'}</div>
            <div class="achievement-toast-desc">${message}</div>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }, 3000);
}

// 登录成功欢迎动画
function showLoginWelcome(user) {
    const overlay = document.createElement('div');
    overlay.className = 'login-welcome-overlay';
    overlay.innerHTML = `
        <div class="login-welcome-card">
            <div class="login-welcome-icon">👋</div>
            <h2 class="login-welcome-title">欢迎回来！</h2>
            <p class="login-welcome-name">${user.displayName || user.username}</p>
            <p class="login-welcome-subtitle">正在为你加载学习内容...</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // 点击遮罩可提前关闭
    overlay.addEventListener('click', () => {
        dismissWelcome(overlay);
    });

    // 2秒后自动消失
    setTimeout(() => {
        dismissWelcome(overlay);
    }, 2000);
}

function dismissWelcome(overlay) {
    if (overlay._dismissing) return;
    overlay._dismissing = true;
    overlay.classList.add('removing');
    setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 500);
}

// 按钮加载态管理
function setButtonLoading(btn, loading) {
    if (!btn) return;
    const originalHTML = btn._originalHTML || btn.innerHTML;
    if (loading) {
        btn._originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> 处理中...';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn._originalHTML;
        delete btn._originalHTML;
    }
}

// 第2章(变量)子模块 ID 列表，用于 hash 路由判断
const CH2_MODULE_IDS = ['intro', 'lab', 'lesson', 'judge', 'practice', 'trace', 'debug', 'extend', 'project', 'test'];

// 暗色主题切换
const THEME_KEY = 'pv_theme';
function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon(false);
    } else {
        // 默认暗色主题
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
    }
    // 初始加载时应用暗色主题到章节内容
    setTimeout(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyThemeToChapterContent(isDark);
    }, 300);
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
    }
    updateThemeIcon(!isDark);
    // 暗色主题：修复 chapters.js 中的内联样式
    applyThemeToChapterContent(!isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = isDark ? 'far fa-moon' : 'fas fa-sun';
    }
    const mobileIcon = document.getElementById('mobileThemeIcon');
    if (mobileIcon) {
        mobileIcon.className = isDark ? 'far fa-moon' : 'fas fa-sun';
    }
}

// 暗色主题：修复内联样式（CSS无法覆盖内联样式）
// 扫描 main 内所有带 style 属性的元素，排除导航栏
// 使用 data-original-style 存储原始样式，避免亮↔暗反复切换导致样式污染
function applyThemeToChapterContent(isDark) {
    // 扫描整个 main 区域（覆盖所有模块、章节、外部 section）
    const main = document.querySelector('main');
    if (!main) return;

    const allStyled = main.querySelectorAll('[style]');
    allStyled.forEach(el => {
        // 跳过导航栏和主题无关的元素
        if (el.closest('.w3-top') || el.closest('.w3-sidebar') || el.closest('nav') || el.closest('.w3-dropdown-content')) return;

        const currentStyle = el.getAttribute('style') || '';

        if (isDark) {
            // 首次暗色主题：保存原始样式，再进行转换
            if (!el.hasAttribute('data-original-style')) {
                el.setAttribute('data-original-style', currentStyle);
            }
            const original = el.getAttribute('data-original-style') || currentStyle;
            let newStyle = original;

            // === 文字颜色 ===
            newStyle = newStyle.replace(/color:\s*#000000\b/gi, 'color:#e0e0e0');
            newStyle = newStyle.replace(/color:\s*#000\b/gi, 'color:#e0e0e0');
            newStyle = newStyle.replace(/color:\s*#333333\b/gi, 'color:#ddd');
            newStyle = newStyle.replace(/color:\s*#333\b/gi, 'color:#ddd');
            newStyle = newStyle.replace(/color:\s*#555\b/gi, 'color:#bbb');
            newStyle = newStyle.replace(/color:\s*#666\b/gi, 'color:#aaa');
            newStyle = newStyle.replace(/color:\s*#777\b/gi, 'color:#999');
            newStyle = newStyle.replace(/color:\s*#999999\b/gi, 'color:#888');
            newStyle = newStyle.replace(/color:\s*#999\b/gi, 'color:#888');
            newStyle = newStyle.replace(/color:\s*#aaa\b/gi, 'color:#999');
            newStyle = newStyle.replace(/color:\s*#ccc\b/gi, 'color:#aaa');
            newStyle = newStyle.replace(/color:\s*#7F7F7F\b/gi, 'color:#999');
            // 特色颜色保持可辨识度
            newStyle = newStyle.replace(/color:\s*#667eea\b/gi, 'color:#8ea0ff');
            newStyle = newStyle.replace(/color:\s*#ff9800\b/gi, 'color:#ffb74d');
            newStyle = newStyle.replace(/color:\s*#e91e63\b/gi, 'color:#f06292');
            newStyle = newStyle.replace(/color:\s*#1890ff\b/gi, 'color:#42a5f5');
            newStyle = newStyle.replace(/color:\s*#ff4d4f\b/gi, 'color:#ff6b6b');
            newStyle = newStyle.replace(/color:\s*#D73A49\b/gi, 'color:#ff6b6b');
            newStyle = newStyle.replace(/color:\s*#005CC5\b/gi, 'color:#569cd6');
            newStyle = newStyle.replace(/color:\s*#04AA6D\b/gi, 'color:#04AA6D'); // 保持品牌绿色
            newStyle = newStyle.replace(/color:\s*#FFD700\b/gi, 'color:#FFD700'); // 保持金色
            newStyle = newStyle.replace(/color:\s*#a6e22e\b/gi, 'color:#a6e22e'); // 保持亮绿
            newStyle = newStyle.replace(/color:\s*#569cd6\b/gi, 'color:#569cd6'); // 保持
            newStyle = newStyle.replace(/color:\s*#d4d4d4\b/gi, 'color:#d4d4d4'); // 保持
            newStyle = newStyle.replace(/color:\s*#B5CEA8\b/gi, 'color:#B5CEA8'); // 保持
            newStyle = newStyle.replace(/color:\s*#C586C0\b/gi, 'color:#C586C0'); // 保持
            newStyle = newStyle.replace(/color:\s*#CE9178\b/gi, 'color:#CE9178'); // 保持
            newStyle = newStyle.replace(/color:\s*#f92672\b/gi, 'color:#f92672'); // 保持Monokai注释色
            newStyle = newStyle.replace(/color:\s*#0a0\b/gi, 'color:#4ec94e'); // 代码绿色→更亮
            newStyle = newStyle.replace(/color:\s*#905\b/gi, 'color:#c586c0'); // 代码紫色→更亮
            newStyle = newStyle.replace(/color:\s*#005cc5\b/gi, 'color:#569cd6'); // 代码蓝色
            newStyle = newStyle.replace(/color:\s*#d73a49\b/gi, 'color:#ff6b6b'); // 代码红色
            // 白色文字在浅色背景上 → 深色背景上保持白色
            newStyle = newStyle.replace(/color:\s*#fff\b/gi, 'color:#fff');
            newStyle = newStyle.replace(/color:\s*#ffffff\b/gi, 'color:#fff');

            // === 背景颜色 ===
            newStyle = newStyle.replace(/background:\s*#fff\b/gi, 'background:#2d2d44');
            newStyle = newStyle.replace(/background:\s*#ffffff\b/gi, 'background:#2d2d44');
            newStyle = newStyle.replace(/background:\s*#f5f5f5\b/gi, 'background:#1a1a2e');
            newStyle = newStyle.replace(/background:\s*#fafafa\b/gi, 'background:#1a1a2e');
            newStyle = newStyle.replace(/background:\s*#D9EEE1\b/gi, 'background:#1a3a2a');
            newStyle = newStyle.replace(/background:\s*#FFF4A3\b/gi, 'background:#3a3520');
            newStyle = newStyle.replace(/background:\s*#FFC0C7\b/gi, 'background:#3a2028');
            newStyle = newStyle.replace(/background:\s*#96D4D4\b/gi, 'background:#1a3035');
            newStyle = newStyle.replace(/background:\s*#e0e0e0\b/gi, 'background:#3a3a4a');
            newStyle = newStyle.replace(/background:\s*#fff3f3\b/gi, 'background:#2a1a1a');
            newStyle = newStyle.replace(/background:\s*#282A35\b/gi, 'background:#282A35'); // 保持
            newStyle = newStyle.replace(/background:\s*#1a1a2e\b/gi, 'background:#1a1a2e'); // 保持
            newStyle = newStyle.replace(/background:\s*#0d0d1a\b/gi, 'background:#0d0d1a'); // 保持
            newStyle = newStyle.replace(/background:\s*#1e1e1e\b/gi, 'background:#1e1e1e'); // 保持
            newStyle = newStyle.replace(/background:\s*#0f0f1a\b/gi, 'background:#0f0f1a'); // 保持
            newStyle = newStyle.replace(/background:\s*#16162a\b/gi, 'background:#16162a'); // 保持
            newStyle = newStyle.replace(/background-color:\s*#D9EEE1\b/gi, 'background-color:#1a3a2a');
            newStyle = newStyle.replace(/background-color:\s*#FFF4A3\b/gi, 'background-color:#3a3520');
            newStyle = newStyle.replace(/background-color:\s*#FFC0C7\b/gi, 'background-color:#3a2028');
            newStyle = newStyle.replace(/background-color:\s*#96D4D4\b/gi, 'background-color:#1a3035');

            // === 边框 ===
            newStyle = newStyle.replace(/border:\s*2px solid #ff4d4f\b/gi, 'border:2px solid #ff6b6b');

            if (newStyle !== currentStyle) {
                el.setAttribute('style', newStyle);
            }
        } else {
            // 亮色主题：恢复原始样式
            const original = el.getAttribute('data-original-style');
            if (original) {
                el.setAttribute('style', original);
                el.removeAttribute('data-original-style');
            }
        }
    });
}

// 图片懒加载渐入
function initLazyImages() {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.addEventListener('load', () => img.classList.add('loaded'));
        if (img.complete) img.classList.add('loaded');
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initLazyImages();
    initScrollProgress();
    initNavScrollBehavior();
    initClassDropdown();
    checkDBStatus();
});

// 初始化班级下拉框（1-20班）
function initClassDropdown() {
    const select = document.getElementById('regClassNum');
    if (!select) return;
    // 保留"请选择班级"选项，追加1-20
    for (let i = 1; i <= 20; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i + '班';
        select.appendChild(opt);
    }
}

const API = {
    async _fetch(url, options = {}) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) {
                throw new Error(`服务器错误 (${res.status})`);
            }
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch {
                throw new Error('服务器返回格式错误');
            }
        } catch (e) {
            // 网络错误：返回默认错误对象，让调用方统一处理
            if (e.name === 'TypeError' && e.message.includes('fetch')) {
                return { success: false, error: '网络不可用' };
            }
            if (e.name === 'AbortError') {
                return { success: false, error: '请求超时' };
            }
            // 其他错误也返回对象而非抛出，避免控制台红色报错
            return { success: false, error: e.message || '未知错误' };
        }
    },

    // 注册
    async register(username, password, displayName, grade, classNum) {
        return await this._fetch(API_BASE + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, displayName, grade, classNum })
        });
    },
    // 登录
    async login(username, password) {
        return await this._fetch(API_BASE + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    },
    // 管理员登录
    async adminLogin(username, password) {
        return await this._fetch(API_BASE + '/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    },
    // 获取用户学习进度
    async getProgress(username) {
        return await this._fetch(API_BASE + '/progress/' + encodeURIComponent(username));
    },
    // 标记模块完成
    async markModuleCompleted(username, moduleId, score) {
        return await this._fetch(API_BASE + '/progress/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, moduleId, score })
        });
    },
    // 颁发成就
    async awardAchievement(username, achievementId) {
        return await this._fetch(API_BASE + '/achievement/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, achievementId })
        });
    },
    // 错题本
    async addMistake(username, chapterId, questionText, correctAnswer, studentAnswer) {
        return await this._fetch(API_BASE + '/mistakes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, chapterId, questionText, correctAnswer, studentAnswer })
        });
    },
    async getMistakes(username) {
        return await this._fetch(API_BASE + '/mistakes/' + encodeURIComponent(username));
    },
    async deleteMistake(id, username) {
        return await this._fetch(API_BASE + '/mistakes/' + id, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
    },
    // 笔记
    async saveNote(username, chapterId, moduleId, content) {
        return await this._fetch(API_BASE + '/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, chapterId, moduleId, content })
        });
    },
    async getNotes(username, chapterId) {
        return await this._fetch(API_BASE + '/notes/' + encodeURIComponent(username) + '/' + encodeURIComponent(chapterId));
    },
    async updateNote(id, content) {
        return await this._fetch(API_BASE + '/notes/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
    },
    // 收藏
    async addSnippet(username, title, code, chapterId) {
        return await this._fetch(API_BASE + '/snippets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, title, code, chapterId })
        });
    },
    async getSnippets(username) {
        return await this._fetch(API_BASE + '/snippets/' + encodeURIComponent(username));
    },
    async deleteSnippet(id, username) {
        return await this._fetch(API_BASE + '/snippets/' + id, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
    },
    // 排行榜
    async getLeaderboard(grade, classNum) {
        let url = API_BASE + '/leaderboard?';
        if (grade) url += 'grade=' + encodeURIComponent(grade) + '&';
        if (classNum) url += 'classNum=' + encodeURIComponent(classNum);
        return await this._fetch(url);
    },
    // 学习报告
    async getReport(username) {
        return await this._fetch(API_BASE + '/report/' + encodeURIComponent(username));
    },
    // 通知
    async getNotifications(username) {
        return await this._fetch(API_BASE + '/notifications/' + encodeURIComponent(username));
    },
    async markNotificationRead(id) {
        return await this._fetch(API_BASE + '/notifications/' + id + '/read', { method: 'PUT' });
    },
    // 目标
    async setGoal(username, goalText, targetChapters, startDate, endDate) {
        return await this._fetch(API_BASE + '/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, goalText, targetChapters, startDate, endDate })
        });
    },
    async getGoals(username) {
        return await this._fetch(API_BASE + '/goals/' + encodeURIComponent(username));
    },
    // 讨论
    async getDiscussions(chapterId) {
        let url = API_BASE + '/discussions?';
        if (chapterId) url += 'chapterId=' + encodeURIComponent(chapterId);
        return await this._fetch(url);
    },
    async createDiscussion(username, title, content, chapterId) {
        return await this._fetch(API_BASE + '/discussions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, title, content, chapterId })
        });
    },
    async getDiscussionDetail(id) {
        return await this._fetch(API_BASE + '/discussions/' + id);
    },
    async createReply(discussionId, username, content) {
        return await this._fetch(API_BASE + '/discussions/' + discussionId + '/replies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, content })
        });
    },
    // 每日一题
    async getDailyQuestion(date) {
        let url = API_BASE + '/daily-question?';
        if (date) url += 'date=' + encodeURIComponent(date);
        return await this._fetch(url);
    }
};

// ===== 本地进度管理（未登录时用 localStorage 持久化） =====
const LOCAL_PROGRESS_KEY = 'pv_local_progress';
const LOCAL_ACHIEVEMENTS_KEY = 'pv_local_achievements';

function getLocalProgress() {
    try {
        const data = localStorage.getItem(LOCAL_PROGRESS_KEY);
        const base = data ? JSON.parse(data) : { modules: {}, achievements: {}, loginDates: [] };
        // 合并章节进度
        const chapterData = localStorage.getItem('pv_chapter_progress');
        base.chapters = chapterData ? JSON.parse(chapterData) : {};
        return base;
    } catch (e) {
        return { modules: {}, chapters: {}, achievements: {}, loginDates: [] };
    }
}

function saveLocalProgress(progress) {
    try {
        localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        log.warn('localStorage 存储失败，可能已满');
    }
}

function getLocalAchievements() {
    try {
        const data = localStorage.getItem(LOCAL_ACHIEVEMENTS_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

function saveLocalAchievement(achId) {
    const ach = getLocalAchievements();
    ach[achId] = new Date().toISOString();
    try {
        localStorage.setItem(LOCAL_ACHIEVEMENTS_KEY, JSON.stringify(ach));
    } catch (e) {
        log.warn('localStorage 存储失败');
    }
}

// 登录时将本地进度同步到后端
async function syncLocalProgressToBackend(username) {
    const localProgress = getLocalProgress();
    const localAchievements = getLocalAchievements();
    const modules = Object.keys(localProgress.modules);

    if (modules.length === 0 && Object.keys(localAchievements).length === 0) return;

    log.log(`正在同步 ${modules.length} 个模块进度到服务器...`);

    // 同步模块进度
    for (const moduleId of modules) {
        try {
            await API.markModuleCompleted(username, moduleId);
        } catch (e) {
            log.warn(`同步模块 ${moduleId} 失败:`, e.message);
        }
    }

    // 同步成就
    for (const achId of Object.keys(localAchievements)) {
        try {
            await API.awardAchievement(username, achId);
        } catch (e) {
            log.warn(`同步成就 ${achId} 失败:`, e.message);
        }
    }

    // 同步完成后清除本地数据
    try {
        localStorage.removeItem(LOCAL_PROGRESS_KEY);
        localStorage.removeItem(LOCAL_ACHIEVEMENTS_KEY);
    } catch (e) {
        log.warn('清除本地缓存失败');
    }
}

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

// 成就定义 - 基于19章Python学习平台
const ACHIEVEMENTS = [
    // 章节成就（每完成一章获得）
    { id: 'ch1_done', icon: '🐍', name: 'Python初识', desc: '完成第1章：认识Python', check: (p) => p.chapters && p.chapters['ch1'] },
    { id: 'ch2_done', icon: '📦', name: '变量大师', desc: '完成第2章：变量', check: (p) => p.chapters && p.chapters['ch2'] },
    { id: 'ch3_done', icon: '📊', name: '类型专家', desc: '完成第3章：变量类型', check: (p) => p.chapters && p.chapters['ch3'] },
    { id: 'ch4_done', icon: '🔀', name: '判断达人', desc: '完成第4章：条件判断', check: (p) => p.chapters && p.chapters['ch4'] },
    { id: 'ch5_done', icon: '🔗', name: '逻辑高手', desc: '完成第5章：if进阶', check: (p) => p.chapters && p.chapters['ch5'] },
    { id: 'ch6_done', icon: '🔄', name: '循环入门', desc: '完成第6章：while循环', check: (p) => p.chapters && p.chapters['ch6'] },
    { id: 'ch7_done', icon: '⏭️', name: '控制大师', desc: '完成第7章：while拓展', check: (p) => p.chapters && p.chapters['ch7'] },
    { id: 'ch8_done', icon: '🔁', name: '嵌套高手', desc: '完成第8章：循环嵌套', check: (p) => p.chapters && p.chapters['ch8'] },
    { id: 'ch9_done', icon: '🧮', name: '综合应用', desc: '完成第9章：综合应用一', check: (p) => p.chapters && p.chapters['ch9'] },
    { id: 'ch10_done', icon: '⭐', name: '星星画家', desc: '完成第10章：排列小星星', check: (p) => p.chapters && p.chapters['ch10'] },
    { id: 'ch11_done', icon: '📋', name: '列表新手', desc: '完成第11章：初识列表', check: (p) => p.chapters && p.chapters['ch11'] },
    { id: 'ch12_done', icon: '📝', name: '列表达人', desc: '完成第12章：列表的使用', check: (p) => p.chapters && p.chapters['ch12'] },
    { id: 'ch13_done', icon: '🔒', name: '集合探索者', desc: '完成第13章：元组与集合', check: (p) => p.chapters && p.chapters['ch13'] },
    { id: 'ch14_done', icon: '📖', name: '字典大师', desc: '完成第14章：神奇的字典', check: (p) => p.chapters && p.chapters['ch14'] },
    { id: 'ch15_done', icon: '✂️', name: '字符串达人', desc: '完成第15章：再遇字符串', check: (p) => p.chapters && p.chapters['ch15'] },
    { id: 'ch16_done', icon: '🧰', name: '语法通才', desc: '完成第16章：公共语法', check: (p) => p.chapters && p.chapters['ch16'] },
    { id: 'ch17_done', icon: '💡', name: '二进制解码', desc: '完成第17章：轻松搞定二进制', check: (p) => p.chapters && p.chapters['ch17'] },
    { id: 'ch18_done', icon: '🧠', name: '思维达人', desc: '完成第18章：编程思维实践', check: (p) => p.chapters && p.chapters['ch18'] },
    { id: 'ch19_done', icon: '🔢', name: '数字专家', desc: '完成第19章：各种各样的数', check: (p) => p.chapters && p.chapters['ch19'] },
    // 里程碑成就
    { id: 'milestone_beginner', icon: '🚀', name: '入门先锋', desc: '完成入门基础（第1-3章）', check: (p) => p.chapters && ['ch1','ch2','ch3'].every(c => p.chapters[c]) },
    { id: 'milestone_flow', icon: '🔀', name: '控制流大师', desc: '完成控制流程（第4-8章）', check: (p) => p.chapters && ['ch4','ch5','ch6','ch7','ch8'].every(c => p.chapters[c]) },
    { id: 'milestone_data', icon: '📋', name: '数据结构达人', desc: '完成数据结构（第11-15章）', check: (p) => p.chapters && ['ch11','ch12','ch13','ch14','ch15'].every(c => p.chapters[c]) },
    { id: 'milestone_advance', icon: '💡', name: '拓展探索者', desc: '完成进阶拓展（第16-19章）', check: (p) => p.chapters && ['ch16','ch17','ch18','ch19'].every(c => p.chapters[c]) },
    { id: 'champion', icon: '👑', name: '全能学霸', desc: '完成全部19个章节', check: (p) => p.chapters && Object.keys(p.chapters).length >= 19 }
];

// 受保护的模块（需要登录才能访问，welcome 和 achievement 除外）
// 包含所有章节子模块，防止通过 URL hash 绕过登录检查
const PROTECTED_MODULES = [
    // 变量模块（第2章）子模块
    'intro', 'lesson', 'judge', 'debug', 'practice', 'trace', 'lab', 'extend', 'project', 'test',
    // 章节完成标记
    'chapter_ch1', 'chapter_ch2', 'chapter_ch3', 'chapter_ch4', 'chapter_ch5',
    'chapter_ch6', 'chapter_ch7', 'chapter_ch8', 'chapter_ch9', 'chapter_ch10',
    'chapter_ch11', 'chapter_ch12', 'chapter_ch13', 'chapter_ch14', 'chapter_ch15',
    'chapter_ch16', 'chapter_ch17', 'chapter_ch18', 'chapter_ch19',
    // 第1章子模块
    'ch1_intro', 'ch1_knowledge', 'ch1_lab', 'ch1_practice', 'ch1_debug', 'ch1_quiz',
    // 第3-19章子模块（每章8个：intro, knowledge, lab, practice, debug, extend, project, quiz）
    'ch3_intro', 'ch3_knowledge', 'ch3_lab', 'ch3_practice', 'ch3_debug', 'ch3_extend', 'ch3_project', 'ch3_quiz',
    'ch4_intro', 'ch4_knowledge', 'ch4_lab', 'ch4_practice', 'ch4_debug', 'ch4_extend', 'ch4_project', 'ch4_quiz',
    'ch5_intro', 'ch5_knowledge', 'ch5_lab', 'ch5_practice', 'ch5_debug', 'ch5_extend', 'ch5_project', 'ch5_quiz',
    'ch6_intro', 'ch6_knowledge', 'ch6_lab', 'ch6_practice', 'ch6_debug', 'ch6_extend', 'ch6_project', 'ch6_quiz',
    'ch7_intro', 'ch7_knowledge', 'ch7_lab', 'ch7_practice', 'ch7_debug', 'ch7_extend', 'ch7_project', 'ch7_quiz',
    'ch8_intro', 'ch8_knowledge', 'ch8_lab', 'ch8_practice', 'ch8_debug', 'ch8_extend', 'ch8_project', 'ch8_quiz',
    'ch9_intro', 'ch9_knowledge', 'ch9_lab', 'ch9_practice', 'ch9_debug', 'ch9_extend', 'ch9_project', 'ch9_quiz',
    'ch10_intro', 'ch10_knowledge', 'ch10_lab', 'ch10_practice', 'ch10_debug', 'ch10_extend', 'ch10_project', 'ch10_quiz',
    'ch11_intro', 'ch11_knowledge', 'ch11_lab', 'ch11_practice', 'ch11_debug', 'ch11_extend', 'ch11_project', 'ch11_quiz',
    'ch12_intro', 'ch12_knowledge', 'ch12_lab', 'ch12_practice', 'ch12_debug', 'ch12_extend', 'ch12_project', 'ch12_quiz',
    'ch13_intro', 'ch13_knowledge', 'ch13_lab', 'ch13_practice', 'ch13_debug', 'ch13_extend', 'ch13_project', 'ch13_quiz',
    'ch14_intro', 'ch14_knowledge', 'ch14_lab', 'ch14_practice', 'ch14_debug', 'ch14_extend', 'ch14_project', 'ch14_quiz',
    'ch15_intro', 'ch15_knowledge', 'ch15_lab', 'ch15_practice', 'ch15_debug', 'ch15_extend', 'ch15_project', 'ch15_quiz',
    'ch16_intro', 'ch16_knowledge', 'ch16_lab', 'ch16_practice', 'ch16_debug', 'ch16_extend', 'ch16_project', 'ch16_quiz',
    'ch17_intro', 'ch17_knowledge', 'ch17_lab', 'ch17_practice', 'ch17_debug', 'ch17_extend', 'ch17_project', 'ch17_quiz',
    'ch18_intro', 'ch18_knowledge', 'ch18_lab', 'ch18_practice', 'ch18_debug', 'ch18_extend', 'ch18_project', 'ch18_quiz',
    'ch19_intro', 'ch19_knowledge', 'ch19_lab', 'ch19_practice', 'ch19_debug', 'ch19_extend', 'ch19_project', 'ch19_quiz',
    // 新功能模块
    'leaderboard', 'mistakes', 'report', 'snippets', 'goals', 'discussion'
];
let pendingModuleId = null; // 登录后要跳转的目标模块
let pendingChapterId = null; // 登录后要跳转的目标章节

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
    pendingChapterId = null;
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    pendingModuleId = null;
    pendingChapterId = null;
}

function closeAllModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
    pendingModuleId = null;
    pendingChapterId = null;
}

// ESC 键关闭弹窗
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllModals();
        closeMobileMenu();
    }
});

// 保留兼容旧调用
function closeLoginModal_old() {
    closeAllModals();
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.querySelector('#loginForm .form-submit-btn');

    setButtonLoading(submitBtn, true);

    // 检测是否为管理员登录（用户名以 admin 开头）
    const isAdmin = username.toLowerCase() === 'admin';

    let result;
    try {
        result = isAdmin ? await API.adminLogin(username, password) : await API.login(username, password);
    } catch (e) {
        errorEl.textContent = e.message || '网络错误，请稍后重试';
        errorEl.classList.remove('w3-hide');
        setButtonLoading(submitBtn, false);
        return false;
    }
    setButtonLoading(submitBtn, false);

    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('w3-hide');
        return false;
    }

    // 登录成功
    if (isAdmin) {
        sessionStorage.setItem('pv_admin_user', JSON.stringify(result.user));
        sessionStorage.setItem('pv_admin_token', result.token);
        window.location.href = 'admin.html';
        return false;
    }

    setCurrentUser(result.user);
    closeLoginModal();
    showLoginWelcome(result.user);
    updateLoginUI();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    errorEl.classList.add('w3-hide');
    
    // 同步本地进度到后端
    await syncLocalProgressToBackend(result.user.username);
    
    // 刷新成就墙
    renderAchievementWall();

    // 如果有待跳转的目标，自动跳转
    // 优先处理章节跳转（含子模块）
    if (pendingChapterId) {
        const chapterId = pendingChapterId;
        const moduleId = pendingModuleId;
        pendingChapterId = null;
        pendingModuleId = null;
        switchChapter(chapterId);
        // 如果同时有待跳转的子模块，在章节渲染完成后跳转
        if (moduleId && moduleId !== chapterId) {
            setTimeout(() => switchChapterModule(chapterId, moduleId, 0), 200);
        }
    } else if (pendingModuleId) {
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
    const grade = document.getElementById('regGrade').value;
    const classNum = parseInt(document.getElementById('regClassNum').value) || 0;
    const errorEl = document.getElementById('registerError');
    const submitBtn = document.querySelector('#registerForm .form-submit-btn');

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
    if (!grade) {
        errorEl.textContent = '请选择年级！';
        errorEl.classList.remove('w3-hide');
        return false;
    }
    if (classNum < 1 || classNum > 20) {
        errorEl.textContent = '请选择班级！';
        errorEl.classList.remove('w3-hide');
        return false;
    }

    setButtonLoading(submitBtn, true);
    let result;
    try {
        result = await API.register(username, password, displayName, grade, classNum);
    } catch (e) {
        errorEl.textContent = e.message || '网络错误，请稍后重试';
        errorEl.classList.remove('w3-hide');
        setButtonLoading(submitBtn, false);
        return false;
    }
    setButtonLoading(submitBtn, false);

    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.classList.remove('w3-hide');
        return false;
    }

    // 注册成功，自动登录
    setCurrentUser({ username, displayName, grade, classNum });
    closeRegisterModal();
    updateLoginUI();
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regDisplayName').value = '';
    document.getElementById('regGrade').value = '';
    document.getElementById('regClassNum').value = '';
    renderAchievementWall();

    // 如果有待跳转的目标，自动跳转
    // 优先处理章节跳转（含子模块）
    if (pendingChapterId) {
        const chapterId = pendingChapterId;
        const moduleId = pendingModuleId;
        pendingChapterId = null;
        pendingModuleId = null;
        switchChapter(chapterId);
        if (moduleId && moduleId !== chapterId) {
            setTimeout(() => switchChapterModule(chapterId, moduleId, 0), 200);
        }
    } else if (pendingModuleId) {
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
    
    // 同步移动端登录按钮
    const mobileBtn = document.getElementById('mobileLoginBtnText');
    if (mobileBtn) {
        mobileBtn.textContent = btnText.textContent;
    }
}

// ===== 学习进度追踪 =====
async function markModuleCompleted(moduleId) {
    const currentUser = getCurrentUser();

    if (currentUser) {
        // 已登录：保存到后端
        try {
            await API.markModuleCompleted(currentUser.username, moduleId);
        } catch (e) {
            log.error('保存进度失败，将存入本地:', e.message);
            saveLocalModule(moduleId);
        }

        // 检查并颁发成就
        try {
            const newAch = await checkAndAwardAchievements(currentUser.username);
            if (newAch.length > 0) {
                log.log('新成就：', newAch);
                newAch.forEach(ach => showAchievementToast(ach));
            }
        } catch (e) {
            log.error('检查成就失败:', e.message);
        }
    } else {
        // 未登录：存入 localStorage
        saveLocalModule(moduleId);
        // 本地也检查成就
        checkLocalAchievements();
    }
}

// 保存单个模块到 localStorage
function saveLocalModule(moduleId) {
    const progress = getLocalProgress();
    if (!progress.modules[moduleId]) {
        progress.modules[moduleId] = true;
        if (!progress.loginDates.includes(new Date().toLocaleDateString('zh-CN'))) {
            progress.loginDates.push(new Date().toLocaleDateString('zh-CN'));
        }
        saveLocalProgress(progress);
    }
}

// 检查本地成就
function checkLocalAchievements() {
    const progress = getLocalProgress();
    const earned = getLocalAchievements();
    let hasNew = false;

    // 确保 progress 有 chapters 属性
    const checkProgress = {
        chapters: progress.chapters || {},
        modules: progress.modules || {}
    };

    ACHIEVEMENTS.forEach(ach => {
        if (!earned[ach.id] && ach.check(checkProgress)) {
            saveLocalAchievement(ach.id);
            showAchievementToast(ach);
            hasNew = true;
        }
    });

    if (hasNew) {
        renderAchievementWall();
    }
}

async function checkAndAwardAchievements(username) {
    try {
        const progress = await API.getProgress(username);
        if (!progress.success) {
            log.warn('获取进度失败:', progress.error);
            return [];
        }
        // 确保必要字段存在
        if (!progress.achievements) progress.achievements = {};
        if (!progress.modules) progress.modules = {};
        if (!progress.chapters) progress.chapters = {};
        // 合并本地章节进度（服务器可能没有存储章节进度）
        if (Object.keys(progress.chapters).length === 0) {
            const chapterData = localStorage.getItem('pv_chapter_progress');
            progress.chapters = chapterData ? JSON.parse(chapterData) : {};
        }
        const newAchievements = [];
        
        for (const ach of ACHIEVEMENTS) {
            if (ach.check(progress)) {
                if (!progress.achievements[ach.id]) {
                    try {
                        await API.awardAchievement(username, ach.id);
                        newAchievements.push(ach);
                    } catch (e) {
                        log.warn(`颁发成就 ${ach.id} 失败:`, e.message);
                    }
                }
            }
        }
        
        return newAchievements;
    } catch (e) {
        log.error('检查成就失败:', e.message);
        return [];
    }
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

function escHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ===== 加载公告 =====
async function loadNotices() {
    try {
        const res = await fetch('/api/notices');
        const data = await res.json();
        const board = document.getElementById('noticeBoard');
        const content = document.getElementById('noticeBoardContent');
        if (!board || !content) return;
        if (!data.success || !data.notices || data.notices.length === 0) {
            board.style.display = 'none';
            return;
        }
        board.style.display = 'block';
        content.innerHTML = data.notices.map(n => `
            <div class="notice-card">
                <div class="notice-card-header">
                    <strong>${escHtml(n.title)}</strong>
                    <span class="notice-card-time">${new Date(n.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div class="notice-card-body">${escHtml(n.content)}</div>
            </div>
        `).join('');
    } catch (e) { /* 静默失败 */ }
}

// ===== 成就墙渲染 =====
async function renderAchievementWall() {
    loadNotices();
    const currentUser = getCurrentUser();
    const userNameEl = document.getElementById('achievementUserName');
    const mapGrid = document.getElementById('mapGrid');
    const progressSummary = document.getElementById('progressSummary');
    const progressBar = document.getElementById('progressBar');
    const achievementList = document.getElementById('achievementList');
    const learningStats = document.getElementById('learningStats');

    let progress;

    if (!currentUser) {
        // 未登录状态：使用 localStorage 数据
        progress = getLocalProgress();
        const achievements = getLocalAchievements();

        if (userNameEl) userNameEl.textContent = '未登录 - 进度已本地保存，登录后可同步！';

        updateMapGrid(progress);

        const completedCount = Object.keys(progress.chapters || {}).length;
        const totalChapters = 19;
        const percent = Math.round((completedCount / totalChapters) * 100);

        if (progressSummary) {
            progressSummary.textContent = `总进度：${completedCount}/${totalChapters} 章节完成 (${percent}%)`;
        }
        if (progressBar) {
            progressBar.style.width = percent + '%';
            progressBar.textContent = percent + '%';
        }

        // 显示成就列表
        if (achievementList) {
            achievementList.innerHTML = ACHIEVEMENTS.map(ach => {
                const earned = !!achievements[ach.id];
                const dateStr = earned ? new Date(achievements[ach.id]).toLocaleDateString('zh-CN') : '';
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

        // 学习统计
        if (learningStats) {
            learningStats.style.display = 'block';
            document.getElementById('statCompleted').textContent = completedCount;
            document.getElementById('statAchievements').textContent = Object.keys(achievements).length;
            document.getElementById('statDays').textContent = progress.loginDates.length;
        }
        return;
    }

    // 已登录：使用后端数据
    try {
        progress = await API.getProgress(currentUser.username);
        if (!progress.success) {
            log.warn('获取进度失败:', progress.error);
            if (achievementList) achievementList.innerHTML = '<p style="text-align:center;color:#999;">无法连接服务器，请检查网络</p>';
            return;
        }
        // 确保必要字段存在
        if (!progress.achievements) progress.achievements = {};
        if (!progress.modules) progress.modules = {};
        if (!progress.chapters) progress.chapters = {};
        if (!progress.loginDates) progress.loginDates = [];
        // 合并本地章节进度（确保不丢失）
        if (Object.keys(progress.chapters).length === 0) {
            const chapterData = localStorage.getItem('pv_chapter_progress');
            progress.chapters = chapterData ? JSON.parse(chapterData) : {};
        }
    } catch (e) {
        log.error('获取进度失败:', e.message);
        if (achievementList) achievementList.innerHTML = '<p style="text-align:center;color:#999;">无法连接服务器，请检查网络</p>';
        return;
    }

    if (userNameEl) {
        userNameEl.textContent = currentUser.displayName + ' 的学习成果';
    }
    
    // 更新探险地图
    updateMapGrid(progress);
    
    // 更新进度条
    const completedCount = Object.keys(progress.chapters || {}).length;
    const totalChapters = 19;
    const percent = Math.round((completedCount / totalChapters) * 100);
    
    if (progressSummary) {
        progressSummary.textContent = `总进度：${completedCount}/${totalChapters} 章节完成 (${percent}%)`;
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
    const mapItems = document.querySelectorAll('.map-item[data-chapter-id]');
    if (!mapItems.length) return;
    
    const chapters = (progress && progress.chapters) ? progress.chapters : {};
    
    mapItems.forEach(item => {
        const chapterId = item.getAttribute('data-chapter-id');
        if (chapters[chapterId]) {
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
    // 初始化主题
    initTheme();
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

    // 全局键盘快捷键
    window.addEventListener('keydown', (e) => {
        // Esc - 关闭所有弹窗
        if (e.key === 'Escape') {
            closeAllModals();
            closeMobileMenu();
        }
        // Ctrl+K / Cmd+K - 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    // 浏览器前进/后退支持
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash && hash !== state.currentModule) {
            // 第2章子模块：需要先重建 ch2 容器和导航栏
            if (CH2_MODULE_IDS.includes(hash)) {
                switchChapter('ch2');
                // switchChapter('ch2') 会调用 switchToVariableChapterBody('intro')
                // 如果 hash 不是 'intro'，需要额外切换到正确的模块
                if (hash !== 'intro') {
                    setTimeout(() => startVariableModule(hash), 100);
                }
            } else {
                switchModule(hash);
            }
        }
    });

    // 初始 hash 处理（支持书签直接跳转 / Ctrl+Shift+R 刷新恢复）
    const initHash = window.location.hash.replace('#', '');
    if (initHash && initHash !== 'welcome') {
        if (CH2_MODULE_IDS.includes(initHash)) {
            // 第2章子模块：先创建 ch2 容器，再打开对应模块
            switchToVariableChapterBody(initHash);
        } else {
            switchModule(initHash);
        }
    }
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
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link, .w3-button[data-module]');
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

// 关闭所有下拉菜单
function closeAllDropdowns() {
    document.querySelectorAll('.w3-dropdown-content').forEach(function(nav) {
        nav.classList.add('w3-hide');
    });
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
    // 章节关键词
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
    // 旧模块关键词（保留兼容）
    { keywords: ['情境', '场景', '导入', '介绍', '动画'], moduleId: 'intro', name: '情境导入', icon: '🎬', desc: '了解为什么需要变量' },
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
    try {
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
    } catch (e) {
        log.error('搜索建议出错:', e);
    }
}

// 跳转到模块
function navigateToModule(moduleId) {
    try {
        // 隐藏所有建议下拉
        document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
        // 判断是章节ID还是旧模块ID
        if (moduleId.startsWith('ch')) {
            switchChapter(moduleId);
        } else {
            switchModule(moduleId);
        }
    } catch (e) {
        log.error('导航出错:', e);
    }
}

// 搜索功能（提交时调用）
function search(inputId) {
    try {
        const input = document.getElementById(inputId);
        if (!input) return false;
        const searchTerm = input.value.trim();
        if (!searchTerm) return false;

        const results = matchModules(searchTerm);
        if (results.length > 0) {
            // 隐藏建议下拉
            document.querySelectorAll('.search-suggestions').forEach(el => el.classList.remove('active'));
            // 使用 navigateToModule 正确分发章节/模块跳转
            navigateToModule(results[0].moduleId);
        } else {
            alert(`未找到与"${searchTerm}"相关的内容，请尝试：变量、代码、调试、测验等关键词`);
        }
    } catch (e) {
        log.error('搜索出错:', e);
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
    document.body.style.overflow = 'hidden'; // 锁定背景滚动
    // 同步移动端主题图标
    syncMobileThemeIcon();
    // 同步移动端登录按钮文字
    syncMobileLoginBtn();
}

function closeMobileMenu() {
    document.getElementById('mobileMenuModal').style.display = 'none';
    document.body.style.overflow = ''; // 恢复滚动
}

// 同步移动端主题图标
function syncMobileThemeIcon() {
    const mobileIcon = document.getElementById('mobileThemeIcon');
    if (mobileIcon) {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        mobileIcon.className = isDark ? 'far fa-moon' : 'fas fa-sun';
    }
}

// 同步移动端登录按钮文字
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
        log.error('Module not found:', moduleId);
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
    
    // 离开情境导入时清理动画，避免内存泄漏
    if (state.currentModule === 'intro') {
        stopIntroAnimations();
    }
    
    modules.forEach(module => module.classList.remove('active'));
    targetModule.classList.add('active');
    state.currentModule = moduleId;

    // 如果切换到成就墙或首页，隐藏所有章节容器
    if (moduleId === 'achievement' || moduleId === 'welcome') {
        document.querySelectorAll('.chapter-section').forEach(c => c.classList.remove('active'));
        hideSidebarToggle();
        currentChapter = null;
        currentChapterModule = null;
    }

    // 更新 URL hash（避免重复添加历史记录导致后退需要两次）
    const targetHash = '#' + moduleId;
    if (window.location.hash === targetHash) {
        history.replaceState(null, '', targetHash);
    } else {
        window.location.hash = targetHash;
    }

    // 高亮导航栏当前模块
    updateNavActiveState(moduleId);

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

    // 新模块渲染
    if (moduleId === 'leaderboard') {
        renderLeaderboard();
    }
    if (moduleId === 'mistakes') {
        renderMistakeBook();
    }
    if (moduleId === 'report') {
        renderReport();
    }
    if (moduleId === 'snippets') {
        renderSnippets();
    }
    if (moduleId === 'goals') {
        renderGoals();
    }
    if (moduleId === 'discussion') {
        renderDiscussions();
    }

    // 平滑滚动到模块顶部
    setTimeout(() => {
        targetModule.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    // 暗色主题：处理模块内联样式（延迟以覆盖异步渲染的模块）
    setTimeout(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) applyThemeToChapterContent(true);
    }, 300);
}

// 更新导航栏激活状态
function updateNavActiveState(moduleId) {
    // 桌面端导航项（仅下拉菜单触发按钮）
    document.querySelectorAll('.w3-bar > .w3-bar-item.w3-hide-small > .w3-button.w3-hover-green').forEach(item => {
        item.classList.remove('active-nav');
    });
    // 移动端导航项
    document.querySelectorAll('.mobile-nav-link').forEach(item => {
        item.classList.remove('active-nav');
    });
    
    // 根据当前模块高亮对应导航项
    const navMap = {
        'intro': 'tutorials',
        'lesson': 'tutorials',
        'lab': 'tutorials',
        'practice': 'practice',
        'judge': 'practice',
        'trace': 'practice',
        'debug': 'challenge',
        'extend': 'challenge',
        'test': 'challenge',
        'project': 'project'
    };
    
    const navId = navMap[moduleId];
    if (navId) {
        const desktopBtns = document.querySelectorAll('.w3-bar > .w3-bar-item.w3-hide-small > .w3-button.w3-hover-green');
        desktopBtns.forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            if (onclick.includes(`'${navId}'`)) {
                btn.classList.add('active-nav');
            }
        });
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
    startIntroAnimations();
}

// 情境导入动画管理（存储 interval ID 避免内存泄漏）
const _introAnimIntervals = [];

function startIntroAnimations() {
    animateScore();
    animateNames();
    animateCountdown();
}

function stopIntroAnimations() {
    _introAnimIntervals.forEach(id => clearInterval(id));
    _introAnimIntervals.length = 0;
}

function animateScore() {
    const scoreSpan = document.querySelector('.score');
    if (!scoreSpan) return;
    let score = 0;
    _introAnimIntervals.push(setInterval(() => {
        score += Math.floor(Math.random() * 10) + 1;
        scoreSpan.textContent = score;
        if (score >= 100) score = 0;
    }, 200));
}

function animateNames() {
    const names = ['张三', '李四', '王五', '赵六', '小明'];
    const nameSpan = document.querySelector('.name');
    if (!nameSpan) return;
    let index = 0;
    _introAnimIntervals.push(setInterval(() => {
        index = (index + 1) % names.length;
        nameSpan.textContent = names[index];
    }, 1500));
}

function animateCountdown() {
    const countdownSpan = document.querySelector('.countdown');
    if (!countdownSpan) return;
    let count = 10;
    _introAnimIntervals.push(setInterval(() => {
        count--;
        countdownSpan.textContent = count;
        if (count <= 0) {
            count = 10;
        }
    }, 1000));
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
        if (!progress.success) return;
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
            variableBox.style.borderColor = 'var(--primary-purple)';
        } else if (type === 'data') {
            currentValue = value;
            labValueDropped = true;
            currentValueType = dataType;
            boxValueArea.textContent = value;
            codeValue.textContent = dataType === 'text' ? `"${value}"` : value;
            
            if (dataType === 'number') {
                variableBox.style.borderColor = 'var(--success)';
                boxType.textContent = '类型: 数字';
            } else {
                variableBox.style.borderColor = 'var(--info)';
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

    // 使用全局 state 追踪评分
    if (typeof state.judgeAnswered === 'undefined') state.judgeAnswered = 0;
    if (typeof state.judgeScore === 'undefined') state.judgeScore = 0;
    let shuffledQuestions = [...state.judgeQuestions]; // 打乱的副本

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // 初始打乱
    shuffleArray(shuffledQuestions);

    function resetJudge() {
        state.judgeAnswered = 0;
        state.judgeScore = 0;
        scoreDisplay.textContent = '0';
        answeredDisplay.textContent = '0';
        shuffleArray(shuffledQuestions);
        state.currentJudgeIndex = 0;
        feedback.textContent = '';
        validBtn.disabled = false;
        invalidBtn.disabled = false;
        resetBtn.style.display = 'none';
        showCurrentQuestion();
    }

    function showCurrentQuestion() {
        const current = shuffledQuestions[state.currentJudgeIndex];
        document.getElementById('current-variable').textContent = current.name;
        feedback.textContent = '';
    }

    function checkAnswer(isValid) {
        if (validBtn.disabled) return;

        const current = shuffledQuestions[state.currentJudgeIndex];
        const questionEl = document.getElementById('current-variable');
        
        if (isValid === current.valid) {
            feedback.textContent = `✅ 回答正确！${current.reason}`;
            feedback.className = 'feedback-correct';
            state.judgeScore++;
            scoreDisplay.textContent = state.judgeScore;
            scoreDisplay.classList.add('bounce-in');
            setTimeout(() => scoreDisplay.classList.remove('bounce-in'), 500);

            if (state.judgeScore >= 8) {
                markModuleCompleted('judge');
            }
        } else {
            feedback.textContent = `❌ 回答错误！${current.reason}`;
            feedback.className = 'feedback-wrong';
            if (questionEl) {
                questionEl.classList.add('shake');
                setTimeout(() => questionEl.classList.remove('shake'), 500);
            }
        }

        setTimeout(() => {
            state.judgeAnswered++;
            answeredDisplay.textContent = state.judgeAnswered;

            state.currentJudgeIndex = (state.currentJudgeIndex + 1) % shuffledQuestions.length;

            if (state.judgeAnswered >= 10) {
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
    const codeInputEl = document.getElementById('code-input');
    const runBtn = document.getElementById('run-code');
    const outputContent = document.getElementById('output-content');
    let practiceCompleted = false;

    // CodeMirror 加载检测与降级
    let editor; // 统一编辑器接口
    const cmLoaded = typeof CodeMirror !== 'undefined';

    if (cmLoaded) {
        editor = CodeMirror(codeInputEl, {
            value: '# 在这里编写代码\nname = \nprint(name)',
            mode: 'python',
            theme: 'monokai',
            lineNumbers: true,
            gutters: ['CodeMirror-linenumbers'],
            indentUnit: 4,
            smartIndent: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            extraKeys: {
                'Ctrl-Enter': runCode,
                'Cmd-Enter': runCode
            }
        });
        // 强制刷新行号区域，同步 gutter 宽度
        setTimeout(() => {
            editor.refresh();
            // 读取 CodeMirror 计算的 margin-left，同步设置 gutter 宽度
            const sizer = codeInputEl.querySelector('.CodeMirror-sizer');
            if (sizer) {
                const marginLeft = parseInt(getComputedStyle(sizer).marginLeft) || 0;
                const gutters = codeInputEl.querySelector('.CodeMirror-gutters');
                const gutter = codeInputEl.querySelector('.CodeMirror-gutter');
                if (gutters && marginLeft > 0) {
                    gutters.style.width = marginLeft + 'px';
                    gutters.style.minWidth = marginLeft + 'px';
                }
                if (gutter && marginLeft > 0) {
                    gutter.style.width = marginLeft + 'px';
                }
            }
        }, 150);
    } else {
        // 降级方案：使用原生 textarea
        log.warn('CodeMirror 加载失败，已降级为原生编辑器');
        codeInputEl.innerHTML = '<textarea id="code-input-fallback" style="width:100%;height:200px;font-family:monospace;font-size:0.95rem;padding:12px;border-radius:10px;border:2px solid var(--border-light);resize:vertical;"># 在这里编写代码\nname = \nprint(name)</textarea>';
        const textarea = document.getElementById('code-input-fallback');
        editor = {
            getValue: () => textarea.value,
            setValue: (v) => { textarea.value = v; }
        };
        // 为 textarea 绑快捷键
        textarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                runCode();
            }
        });
    }

    const levels = {
        1: {
            instruction: '补全代码：给变量name赋值为"小明"并打印输出',
            template: '# 在这里编写代码\nname = \nprint(name)',
            solution: ['name = "小明"', 'name = "小明"\n', "name = '小明'", "name = '小明'\n"]
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
            editor.setValue(levels[level].template);
            outputContent.textContent = '';
        });
    });

    function runCode() {
        const code = editor.getValue();
        
        try {
            let output = '';
            const lines = code.split('\n');
            
            const variables = {};
            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#')) return;
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
                    const match = line.match(/print\((.*)\)/);
                    if (match) {
                        const varName = match[1].trim();
                        if (variables[varName] !== undefined) {
                            output += variables[varName] + '\n';
                        } else {
                            output += varName + '\n';
                        }
                    }
                }
            });
            
            outputContent.textContent = output || '无输出';
            outputContent.style.color = 'var(--monokai-output)';
            if (!practiceCompleted) {
                practiceCompleted = true;
                markModuleCompleted('practice');
            }
        } catch (e) {
            outputContent.textContent = '错误: ' + e.message;
            outputContent.style.color = 'var(--monokai-error)';
        }
    }

    runBtn.addEventListener('click', runCode);
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
            feedback.style.color = 'var(--success)';
        } else {
            feedback.textContent = '🎉 执行完成！最终结果: x=10, y=7, z=17';
            feedback.style.color = 'var(--primary-purple)';
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
    const bugProgress = document.getElementById('bug-progress');

    // 追踪已修复的 bug（使用索引集合）
    let fixedBugs = new Set();

    function updateBugProgress() {
        if (bugProgress) {
            bugProgress.textContent = `${fixedBugs.size}/${state.bugs.length} 已修复`;
        }
    }

    function showBug(index) {
        const bug = state.bugs[index];
        bugCode.textContent = bug.code;
        
        // 清空现有选项
        optionsContainer.innerHTML = '';
        
        // 如果已修复，显示修复状态
        if (fixedBugs.has(index)) {
            feedback.textContent = '✅ 这个 bug 已修复！';
            feedback.className = 'feedback-correct';
            optionsContainer.innerHTML = '<p style="color: var(--success); font-weight:bold;">✅ 已修复，太棒了！</p>';
            return;
        }

        feedback.textContent = '';
        const hint = document.createElement('p');
        hint.textContent = '请选择正确的修复方案：';
        optionsContainer.appendChild(hint);
        
        // 添加新选项
        bug.options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option.text;
            btn.dataset.index = idx;
            btn.addEventListener('click', () => checkBugAnswer(option.correct, index));
            optionsContainer.appendChild(btn);
        });
    }

    function checkBugAnswer(isCorrect, bugIndex) {
        if (fixedBugs.has(bugIndex)) return;

        if (isCorrect) {
            feedback.textContent = '✅ 修复成功！获得一枚勋章！';
            feedback.className = 'feedback-correct';
            state.debugMedals++;
            medalCount.textContent = state.debugMedals;
            medalCount.parentElement.classList.add('bounce-in');
            setTimeout(() => medalCount.parentElement.classList.remove('bounce-in'), 500);
            
            fixedBugs.add(bugIndex);
            updateBugProgress();
            
            if (fixedBugs.size >= state.bugs.length) {
                markModuleCompleted('debug');
                setTimeout(() => {
                    feedback.textContent = '🎉 全部 bug 修复完毕！你是调试高手！';
                }, 1000);
            }
        } else {
            feedback.textContent = '❌ 修复失败，再试试吧！';
            feedback.className = 'feedback-wrong';
            const bugDisplay = document.getElementById('bug-code');
            if (bugDisplay) {
                bugDisplay.classList.add('shake');
                setTimeout(() => bugDisplay.classList.remove('shake'), 500);
            }
        }

        setTimeout(() => {
            showBug(bugIndex);
        }, 1500);
    }

    function findNextUnfixedBug(currentIndex, direction) {
        const total = state.bugs.length;
        // 如果全部修复，返回当前
        if (fixedBugs.size >= total) return currentIndex;

        let next = currentIndex;
        for (let i = 0; i < total; i++) {
            next = (next + direction + total) % total;
            if (!fixedBugs.has(next)) return next;
        }
        return currentIndex;
    }

    prevBtn.addEventListener('click', () => {
        state.currentBugIndex = findNextUnfixedBug(state.currentBugIndex, -1);
        showBug(state.currentBugIndex);
    });

    nextBtn.addEventListener('click', () => {
        state.currentBugIndex = findNextUnfixedBug(state.currentBugIndex, 1);
        showBug(state.currentBugIndex);
    });

    // 重置功能
    const resetBtn = document.getElementById('debug-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            fixedBugs.clear();
            state.debugMedals = 0;
            medalCount.textContent = '0';
            updateBugProgress();
            state.currentBugIndex = 0;
            showBug(0);
        });
    }

    updateBugProgress();
    showBug(state.currentBugIndex);
}

// 扩展思维模块
function initExtendModule() {
    const challengeButtons = document.querySelectorAll('.challenge-btn');
    const swapChallenge = document.getElementById('swap-challenge');
    const combineChallenge = document.getElementById('combine-challenge');
    const generateSentenceBtn = document.getElementById('generate-sentence');
    const combineOutput = document.getElementById('combine-output');

    // 使用全局 state 追踪扩展模块进度
    if (typeof state.extendSwapDone === 'undefined') state.extendSwapDone = false;
    if (typeof state.extendSentenceDone === 'undefined') state.extendSentenceDone = false;

    function checkExtendComplete() {
        if (state.extendSwapDone && state.extendSentenceDone) {
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
                state.extendSwapDone = true;
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
            state.extendSentenceDone = true;
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
        // 从 CSS 变量读取主题颜色
        const rootStyle = getComputedStyle(document.documentElement);
        const radarAxis = rootStyle.getPropertyValue('--radar-axis').trim();
        const primaryPurple = rootStyle.getPropertyValue('--primary-purple').trim();
        const textPrimary = rootStyle.getPropertyValue('--text-primary').trim();
        
        // 将 hex 颜色转为 rgba
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        const fillColor = hexToRgba(primaryPurple, 0.3);
        
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
            ctx.strokeStyle = radarAxis;
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
            ctx.strokeStyle = radarAxis;
            ctx.stroke();
            
            // 绘制标签
            ctx.fillStyle = textPrimary;
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
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = primaryPurple;
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
            ctx.fillStyle = primaryPurple;
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
        
        // 防止重复执行：如果已经有内容，跳过
        if (!output || output.textContent.trim().length > 0) return;
        
        const text = `# 变量赋值演示
name = "小明"
age = 14
favorite_color = "蓝色"

# 打印变量值
print("我叫", name)
print("我今年", age, "岁")
print("我喜欢", favorite_color)`;
        
        output.textContent = '';
        if (cursor) cursor.style.display = 'inline-block';
        
        // 使用 Array.from 正确拆分 Unicode 字符
        const chars = Array.from(text);
        let charIndex = 0;
        
        function typeCharacter() {
            if (charIndex < chars.length) {
                const char = chars[charIndex];
                if (char === '\n') {
                    output.appendChild(document.createElement('br'));
                } else if (char === '\r') {
                    // 跳过 Windows 换行符中的 \r
                } else {
                    output.appendChild(document.createTextNode(char));
                }
                charIndex++;
                const delay = char === '\n' ? 200 : 60;
                setTimeout(typeCharacter, delay);
            } else {
                // 打字完成后隐藏光标
                if (cursor) {
                    setTimeout(() => { cursor.style.display = 'none'; }, 2000);
                }
            }
        }
        
        setTimeout(typeCharacter, 500);
    });
}

// 滚动显示效果
function initScrollReveal() {
    const modules = document.querySelectorAll('.module');
    const featureCards = document.querySelectorAll('.feature-card');
    const typewriterContainer = document.querySelector('.typewriter-container');
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
        
        // 检测typewriter-container并触发打字机效果
        if (typewriterContainer && !typewriterStarted) {
            const rect = typewriterContainer.getBoundingClientRect();
            if (rect.top < windowHeight * 0.7) {
                typewriterStarted = true;
                setTimeout(startTypewriterEffect, 300);
            }
        }
    }
    
    // 初始检测
    setTimeout(checkScroll, 100);
    
    // 滚动事件监听（节流处理，减少 CPU 消耗）
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => {
            checkScroll();
            // 回到顶部按钮显示/隐藏
            const backToTopBtn = document.getElementById('backToTopBtn');
            if (backToTopBtn) {
                if (window.scrollY > 400) {
                    backToTopBtn.classList.add('visible');
                } else {
                    backToTopBtn.classList.remove('visible');
                }
            }
            // 章节子模块导航吸顶效果
            stickyChapterNav();
            scrollTimer = null;
        }, 100);
    });

    // 使用 IntersectionObserver 处理 .reveal 系列元素的滚动入场

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
            revealObserver.observe(el);
        });
    } else {
        // 降级：直接显示所有元素
        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
            el.classList.add('revealed');
        });
    }
}

// 章节子模块导航吸顶效果（一体化：主导航+次级导航联动）
// 使用 position:sticky 实现，JS 仅处理主导航显隐
function stickyChapterNav() {
    const MAIN_NAV_HEIGHT = 60;
    const topBar = document.querySelector('.w3-top');
    const navs = document.querySelectorAll('.chapter-module-nav');
    if (navs.length === 0) return;

    const currentY = window.scrollY;
    if (stickyChapterNav._lastY === undefined) stickyChapterNav._lastY = currentY;
    const isScrollingDown = currentY > stickyChapterNav._lastY;
    const isScrollingUp = currentY < stickyChapterNav._lastY;
    stickyChapterNav._lastY = currentY;

    navs.forEach(nav => {
        if (isScrollingDown && currentY > 100) {
            // 下滑经过 hero 后：主导航隐藏，次级导航置顶
            nav.classList.add('nav-top-zero');
            if (topBar) topBar.classList.add('nav-hidden');
        } else if (isScrollingUp) {
            // 上滑：主导航恢复，次级导航回到主导航下方
            nav.classList.remove('nav-top-zero');
            if (topBar) topBar.classList.remove('nav-hidden');
        }
    });

    // 回滚到顶部时确保主导航显示
    if (currentY <= MAIN_NAV_HEIGHT) {
        navs.forEach(nav => nav.classList.remove('nav-top-zero'));
        if (topBar) topBar.classList.remove('nav-hidden');
    }
}

// 回到顶部
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 页面滚动进度条
function initScrollProgress() {
    const bar = document.getElementById('scrollProgressBar');
    if (!bar) return;

    function updateProgress() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        bar.style.width = Math.min(progress, 100) + '%';
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
}

// ================================================================
//   导航栏滚动感知 - Scroll-Aware Navbar
// ================================================================
function initNavScrollBehavior() {
    const navbar = document.querySelector('.w3-bar');
    const topBar = document.querySelector('.w3-top');
    if (!navbar) return;

    let lastScrollY = 0;
    let ticking = false;

    function updateNavState() {
        const scrollY = window.scrollY;
        
        // 滚动超过 50px 后添加 scrolled 类
        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // 仅在非章节页面（无 chapter-module-nav）时控制主导航显隐
        // 章节页面的导航栏由 stickyChapterNav() 统一管理
        const hasChapterNav = document.querySelector('.chapter-module-nav');
        if (!hasChapterNav) {
            if (scrollY > 200 && scrollY > lastScrollY) {
                if (topBar) topBar.classList.add('nav-hidden');
            } else if (scrollY < lastScrollY) {
                if (topBar) topBar.classList.remove('nav-hidden');
            }
        }
        
        lastScrollY = scrollY;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNavState);
            ticking = true;
        }
    }, { passive: true });

    updateNavState();
}

// ================================================================
//   科技感增强动画 - Tech Enhancement Animations
// ================================================================

// ----- 粒子背景 Canvas 动画 -----
function initParticleCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;
    let mouseX = 0;
    let mouseY = 0;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', () => {
        resize();
        initParticles();
    });

    // 鼠标跟踪
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * canvas.height; // 初始随机分布
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = -10;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedY = Math.random() * 0.6 + 0.2;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.hue = Math.random() > 0.5 ? 160 : 230; // 绿色或蓝紫色
        }
        update() {
            this.y += this.speedY;
            this.x += this.speedX;

            // 鼠标吸引效果
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                const angle = Math.atan2(dy, dx);
                const force = (150 - dist) / 150 * 0.03;
                this.x -= Math.cos(angle) * force;
                this.y -= Math.sin(angle) * force;
            }

            if (this.y > canvas.height + 10 || this.x < -10 || this.x > canvas.width + 10) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 70%, 55%, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        particles = Array.from({ length: count }, () => new Particle());
    }

    // 连线
    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(4, 170, 109, ${(120 - dist) / 120 * 0.12})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines();
        animationId = requestAnimationFrame(animate);
    }

    initParticles();
    animate();

    // 页面不可见时暂停，节省资源
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            animate();
        }
    });
}

// ----- 数字雨效果（Hero 区域） -----
function initDigitalRain() {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';
    const container = document.createElement('div');
    container.className = 'digital-rain';
    container.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;';
    hero.insertBefore(container, hero.firstChild);

    const columns = Math.floor(hero.offsetWidth / 30);
    const drops = [];

    for (let i = 0; i < columns; i++) {
        const span = document.createElement('span');
        span.className = 'digital-rain-char';
        span.style.left = (i * 30 + Math.random() * 20) + 'px';
        span.style.animationDuration = (Math.random() * 4 + 6) + 's';
        span.style.animationDelay = (Math.random() * 5) + 's';
        span.textContent = chars[Math.floor(Math.random() * chars.length)];
        container.appendChild(span);
        drops.push(span);
    }

    // 定期更新字符
    setInterval(() => {
        if (document.hidden) return;
        drops.forEach(span => {
            if (Math.random() > 0.7) {
                span.textContent = chars[Math.floor(Math.random() * chars.length)];
            }
        });
    }, 2000);
}

// ----- 数据流SVG动画 -----
function initDataFlowLines() {
    // 为特征卡片区域添加数据流线
    const featuresSection = document.querySelector('.features-section');
    if (!featuresSection) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'data-flow-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';

    // 创建几条流动线
    const lines = [
        { x1: '10%', y1: '20%', x2: '90%', y2: '80%' },
        { x1: '90%', y1: '10%', x2: '10%', y2: '90%' },
        { x1: '5%', y1: '50%', x2: '95%', y2: '50%' }
    ];

    lines.forEach((line, i) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        path.setAttribute('x1', line.x1);
        path.setAttribute('y1', line.y1);
        path.setAttribute('x2', line.x2);
        path.setAttribute('y2', line.y2);
        path.setAttribute('stroke', 'rgba(4, 170, 109, 0.06)');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('stroke-dasharray', '8,12');
        path.style.animation = `dashFlow ${3 + i * 2}s linear infinite`;
        svg.appendChild(path);
    });

    featuresSection.style.position = 'relative';
    featuresSection.insertBefore(svg, featuresSection.firstChild);
}

// 虚线流动动画 keyframes（动态注入）
(function injectDataFlowKeyframes() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes dashFlow {
            0% { stroke-dashoffset: 40; }
            100% { stroke-dashoffset: 0; }
        }
    `;
    document.head.appendChild(style);
})();

// ----- 鼠标光晕跟随 -----
function initMouseGlow() {
    const glow = document.createElement('div');
    glow.className = 'mouse-glow';
    glow.style.cssText = `
        position: fixed;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(4,170,109,0.04) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
        transform: translate(-50%, -50%);
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(glow);

    let timeout;
    document.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
        glow.style.opacity = '1';
        clearTimeout(timeout);
        timeout = setTimeout(() => { glow.style.opacity = '0'; }, 2000);
    });
}

// ----- 初始化所有科技感动画 -----
function initTechEnhancements() {
    initParticleCanvas();
    initDigitalRain();
    initDataFlowLines();
    initMouseGlow();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTechEnhancements);
} else {
    initTechEnhancements();
}

// ============================================
//  章节导航系统
// ============================================

let currentChapter = null;
let currentChapterModule = null;

// 渲染侧边栏章节列表
function renderChapterSidebar() {
    const chapterList = document.getElementById('chapterList');
    if (!chapterList || typeof CHAPTERS === 'undefined') return;

    chapterList.innerHTML = CHAPTERS.map(ch => {
        const completed = isChapterCompleted(ch.id);
        return `
            <li class="chapter-item">
                <a class="chapter-link ${completed ? 'completed' : ''}" 
                   onclick="switchChapter('${ch.id}')" 
                   data-chapter="${ch.id}">
                    <span class="chapter-num">${ch.num}</span>
                    <span class="chapter-info">
                        <div class="chapter-title">${ch.icon} ${ch.title}</div>
                        <div class="chapter-desc">${ch.desc}</div>
                    </span>
                    ${completed ? '<span class="chapter-badge">✓</span>' : ''}
                </a>
            </li>
        `;
    }).join('');
}

// 检查章节是否完成
function isChapterCompleted(chapterId) {
    try {
        const progress = JSON.parse(localStorage.getItem('pv_chapter_progress') || '{}');
        return progress[chapterId] === true;
    } catch (e) {
        return false;
    }
}

// 标记章节完成
async function markChapterCompleted(chapterId) {
    // 先保存到本地（作为兜底）
    try {
        const progress = JSON.parse(localStorage.getItem('pv_chapter_progress') || '{}');
        progress[chapterId] = true;
        localStorage.setItem('pv_chapter_progress', JSON.stringify(progress));
    } catch (e) {
        // ignore
    }

    // 同步到服务器
    const currentUser = getCurrentUser();
    if (currentUser && dbReady) {
        try {
            await API.markModuleCompleted(currentUser.username, 'chapter_' + chapterId);
        } catch (e) {
            log.warn('同步章节进度失败:', e.message);
        }
    }

    renderChapterSidebar();

    // 检查成就
    if (currentUser) {
        try {
            const newAch = await checkAndAwardAchievements(currentUser.username);
            if (newAch.length > 0) {
                newAch.forEach(ach => showAchievementToast(ach));
            }
        } catch (e) {
            log.error('检查成就失败:', e.message);
        }
    } else {
        checkLocalAchievements();
    }
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.getElementById('chapterSidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');

    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        toggle.classList.remove('shifted');
        overlay.classList.remove('open');
        mainContent.classList.remove('sidebar-open');
        toggle.querySelector('i').className = 'fas fa-chevron-right';
    } else {
        sidebar.classList.add('open');
        toggle.classList.add('shifted');
        overlay.classList.add('open');
        mainContent.classList.add('sidebar-open');
        toggle.querySelector('i').className = 'fas fa-chevron-left';
    }
}

// 切换到指定章节
function switchChapter(chapterId) {
    // 检查是否需要登录 —— 所有章节内容都需要登录
    const currentUser = getCurrentUser();
    if (!currentUser) {
        // 只设置 pendingChapterId，登录后由 switchChapter 处理
        pendingChapterId = chapterId;
        openLoginModal();
        return;
    }

    // 关闭侧边栏(移动端)
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }

    currentChapter = chapterId;
    currentChapterModule = null;

    // 隐藏所有模块（包括welcome首页）
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));

    // 隐藏所有动态章节容器
    document.querySelectorAll('.chapter-section').forEach(c => c.classList.remove('active'));

    // 显示侧边栏切换按钮（进入章节后显示）
    showSidebarToggle();

    // 特殊处理：第2章(变量)使用现有HTML内容
    if (chapterId === 'ch2') {
        switchToVariableChapterBody();
        return;
    }

    // 显示/创建章节容器
    let chapterContainer = document.getElementById('chapter-' + chapterId);
    if (!chapterContainer) {
        chapterContainer = document.createElement('div');
        chapterContainer.id = 'chapter-' + chapterId;
        chapterContainer.className = 'chapter-section';
        document.querySelector('main').appendChild(chapterContainer);
    }
    chapterContainer.classList.add('active');

    // 渲染章节内容
    renderChapterContent(chapterId, chapterContainer);

    // 更新侧边栏高亮
    updateSidebarActive(chapterId);

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 平滑滚动后触发吸顶检查
    setTimeout(() => stickyChapterNav(), 200);

    // 更新URL hash（避免重复添加历史记录导致后退死循环）
    const targetHash = '#' + chapterId;
    if (window.location.hash === targetHash) {
        history.replaceState(null, '', targetHash);
    } else {
        history.pushState(null, '', targetHash);
    }
}

// 切换到变量章节(第2章) - 显示变量模块交互内容(内部函数)
// initialModule: 可选，指定初始打开的子模块，默认 'intro'
function switchToVariableChapterBody(initialModule) {
    initialModule = initialModule || 'intro';
    // 显示侧边栏切换按钮
    showSidebarToggle();

    if (window.innerWidth <= 768) {
        toggleSidebar();
    }

    currentChapter = 'ch2';
    currentChapterModule = null;

    // 隐藏所有动态章节容器
    document.querySelectorAll('.chapter-section').forEach(c => c.classList.remove('active'));

    // 隐藏所有模块
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));

    // 显示/创建第2章独立容器
    let ch2Container = document.getElementById('chapter-ch2');
    if (!ch2Container) {
        ch2Container = document.createElement('div');
        ch2Container.id = 'chapter-ch2';
        ch2Container.className = 'chapter-section';
        document.querySelector('main').appendChild(ch2Container);
    }
    ch2Container.classList.add('active');

    // 渲染第2章：导航栏在 .chapter-landing 外部，确保 sticky 有完整页面高度作为上下文
    ch2Container.innerHTML = `
        <div class="chapter-module-nav" id="chapterModNav-ch2">
            <div class="mod-nav-inner">
            <button class="mod-nav-btn" onclick="startVariableModule('intro')">🎬 情境导入</button>
            <button class="mod-nav-btn" onclick="startVariableModule('lab')">🧪 类比实验室</button>
            <button class="mod-nav-btn" onclick="startVariableModule('lesson')">📚 知识讲解</button>
            <button class="mod-nav-btn" onclick="startVariableModule('judge')">⚖️ 命名小法官</button>
            <button class="mod-nav-btn" onclick="startVariableModule('practice')">💻 实践操作</button>
            <button class="mod-nav-btn" onclick="startVariableModule('trace')">🔍 值追踪挑战</button>
            <button class="mod-nav-btn" onclick="startVariableModule('debug')">🏥 调试诊所</button>
            <button class="mod-nav-btn" onclick="startVariableModule('extend')">🚀 扩展思维</button>
            <button class="mod-nav-btn" onclick="startVariableModule('project')">🎨 创意项目</button>
            <button class="mod-nav-btn" onclick="startVariableModule('test')">📝 课堂小测</button>
            </div>
        </div>
        <div class="chapter-landing">
            <div class="chapter-hero" id="ch2-hero">
                <div class="chapter-badge-tag">核心概念</div>
                <h1>📦 变量</h1>
                <p class="chapter-subtitle">理解变量的概念，掌握命名规则与赋值操作</p>
                <div class="chapter-cta">
                    <button class="cta-btn cta-primary" onclick="startVariableModule('intro')">
                        开始学习
                    </button>
                    <button class="cta-btn cta-secondary" onclick="toggleSidebar()">
                        浏览章节
                    </button>
                </div>
            </div>
            <div class="chapter-content" id="chapterContent-ch2">
            </div>
        </div>
    `;

    updateSidebarActive('ch2');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 平滑滚动后触发吸顶检查
    setTimeout(() => stickyChapterNav(), 200);
    // 避免重复添加历史记录
    const targetHash2 = '#ch2';
    if (window.location.hash === targetHash2) {
        history.replaceState(null, '', targetHash2);
    } else {
        history.pushState(null, '', targetHash2);
    }

    // 自动打开初始子模块
    setTimeout(() => {
        startVariableModule(initialModule);
    }, 50);
}

// 启动变量模块的子模块
function startVariableModule(moduleId) {
    // 保持第2章容器可见(作为页面头部)
    const ch2Container = document.getElementById('chapter-ch2');
    if (ch2Container) {
        ch2Container.classList.add('active');
        // 进入子模块时隐藏 hero 区域，只保留导航
        const hero = ch2Container.querySelector('.chapter-hero');
        if (hero) hero.style.display = 'none';
    }

    // 更新子模块导航高亮
    const nav = document.getElementById('chapterModNav-ch2');
    const moduleNames = ['intro', 'lab', 'lesson', 'judge', 'practice', 'trace', 'debug', 'extend', 'project', 'test'];
    if (nav) {
        nav.querySelectorAll('.mod-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', moduleNames[i] === moduleId);
        });
    }

    currentChapter = 'ch2';
    currentChapterModule = moduleId;

    // 使用原有的switchModule函数，保留所有事件处理器
    switchModule(moduleId);

    // 添加下一页按钮到当前激活的模块底部
    const currentIndex = moduleNames.indexOf(moduleId);
    const nextIndex = currentIndex + 1;
    const isLast = nextIndex >= moduleNames.length;

    const activeModule = document.getElementById(moduleId);
    if (activeModule) {
        // 移除已有的下一页按钮
        const existing = activeModule.querySelector('.ch-next-bar');
        if (existing) existing.remove();

        const nextBtnHTML = `
            <div class="ch-next-bar">
                ${isLast ? `
                    <button class="ch-next-btn ch-next-btn-done" onclick="markChapterCompleted('ch2');document.getElementById('ch2-hero').style.display='';window.scrollTo({top:0,behavior:'smooth'})">
                        ✓ 本章学习完成，返回顶部
                    </button>
                ` : `
                    <button class="ch-next-btn" onclick="startVariableModule('${moduleNames[nextIndex]}')">
                        下一页：${moduleNames[nextIndex] === 'lab' ? '🧪 类比实验室' : moduleNames[nextIndex] === 'lesson' ? '📚 知识讲解' : moduleNames[nextIndex] === 'judge' ? '⚖️ 命名小法官' : moduleNames[nextIndex] === 'practice' ? '💻 实践操作' : moduleNames[nextIndex] === 'trace' ? '🔍 值追踪挑战' : moduleNames[nextIndex] === 'debug' ? '🏥 调试诊所' : moduleNames[nextIndex] === 'extend' ? '🚀 扩展思维' : moduleNames[nextIndex] === 'project' ? '🎨 创意项目' : '📝 课堂小测'} →
                    </button>
                `}
            </div>
        `;
        activeModule.insertAdjacentHTML('beforeend', nextBtnHTML);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 暗色主题：处理新渲染内容的内联样式
    setTimeout(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) applyThemeToChapterContent(true);
    }, 80);
}

// 渲染章节内容
function renderChapterContent(chapterId, container) {
    const chapter = CHAPTERS.find(c => c.id === chapterId);
    if (!chapter) return;

    const bgColor = chapter.color || '#04AA6D';

    container.innerHTML = `
        <div class="chapter-landing">
            <!-- 子模块导航 -->
            <div class="chapter-module-nav" id="chapterModNav-${chapterId}">
                <div class="mod-nav-inner">
                    ${chapter.modules.map((mod, i) => `
                        <button class="mod-nav-btn" onclick="switchChapterModule('${chapterId}', '${mod.id}', ${i})">
                            ${mod.icon} ${mod.title}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- 章节Hero -->
            <div class="chapter-hero">
                <div class="chapter-badge-tag">${chapter.badge || '学习'}</div>
                <h1>${chapter.icon} ${chapter.title}</h1>
                <p class="chapter-subtitle">${chapter.subtitle}</p>
                <div class="chapter-cta">
                    <button class="cta-btn cta-primary" onclick="startChapterLearning('${chapterId}')">
                        开始学习
                    </button>
                    <button class="cta-btn cta-secondary" onclick="toggleSidebar()">
                        浏览章节
                    </button>
                </div>
            </div>

            <!-- 模块内容区 -->
            <div class="chapter-content" id="chapterContent-${chapterId}">
                <div class="ch-module-wrap">
                    <div style="text-align:center;padding:48px 0;">
                        <div style="font-size:48px;margin-bottom:16px;">${chapter.icon}</div>
                        <h3 style="color:var(--w3-text-color);margin-bottom:8px;">${chapter.title} - ${chapter.subtitle}</h3>
                        <p style="color:var(--text-secondary);margin-top:8px;">${chapter.desc}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 自动打开第一个子模块（情境导入）
    if (chapter.modules && chapter.modules.length > 0) {
        setTimeout(() => {
            switchChapterModule(chapterId, chapter.modules[0].id, 0);
        }, 50);
    }

    // 暗色主题：修复内联样式
    setTimeout(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) applyThemeToChapterContent(true);
    }, 100);
}

// 切换到章节内的子模块
function switchChapterModule(chapterId, moduleId, index) {
    // 检查是否需要登录
    const currentUser = getCurrentUser();
    if (!currentUser) {
        pendingModuleId = moduleId;
        pendingChapterId = chapterId;
        openLoginModal();
        return;
    }

    currentChapterModule = moduleId;

    const chapter = CHAPTERS.find(c => c.id === chapterId);
    if (!chapter) return;

    const module = chapter.modules.find(m => m.id === moduleId);
    if (!module) return;

    // 更新子模块导航高亮
    const nav = document.getElementById('chapterModNav-' + chapterId);
    if (nav) {
        nav.querySelectorAll('.mod-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
    }

    // 渲染模块内容
    const contentArea = document.getElementById('chapterContent-' + chapterId);
    if (!contentArea) return;

    if (typeof module.render === 'function') {
        contentArea.innerHTML = '<div class="ch-module-wrap">' + module.render() + '</div>';
    } else {
        contentArea.innerHTML = `
            <div class="ch-module-wrap">
                <div class="module-header">
                    <h2>${module.icon} ${module.title}</h2>
                    <p>${module.desc || ''}</p>
                </div>
                <div style="text-align:center;color:#aaa;padding:40px;">
                    <p>此模块内容正在建设中...</p>
                </div>
            </div>
        `;
    }

    // 添加下一页按钮
    const nextIndex = index + 1;
    const isLast = nextIndex >= chapter.modules.length;
    const nextBtnHTML = `
        <div class="ch-next-bar">
            ${isLast ? `
                <button class="ch-next-btn ch-next-btn-done" onclick="markChapterCompleted('${chapterId}');window.scrollTo({top:0,behavior:'smooth'})">
                    ✓ 本章学习完成，返回顶部
                </button>
            ` : `
                <button class="ch-next-btn" onclick="switchChapterModule('${chapterId}', '${chapter.modules[nextIndex].id}', ${nextIndex})">
                    下一页：${chapter.modules[nextIndex].icon} ${chapter.modules[nextIndex].title} →
                </button>
            `}
        </div>
    `;
    contentArea.insertAdjacentHTML('beforeend', nextBtnHTML);

    // 滚动到内容区
    contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 暗色主题：处理新渲染内容的内联样式
    setTimeout(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) applyThemeToChapterContent(true);
    }, 80);
}

// 开始章节学习(从第一个子模块开始)
function startChapterLearning(chapterId) {
    const chapter = CHAPTERS.find(c => c.id === chapterId);
    if (!chapter || !chapter.modules.length) return;

    switchChapterModule(chapterId, chapter.modules[0].id, 0);
}

// 更新侧边栏高亮
function updateSidebarActive(chapterId) {
    document.querySelectorAll('.chapter-link').forEach(link => {
        link.classList.toggle('active', link.dataset.chapter === chapterId);
    });
}

// 显示侧边栏切换按钮
function showSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
        // 关闭侧边栏状态
        const sidebar = document.getElementById('chapterSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const mainContent = document.querySelector('.main-content');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            mainContent.classList.remove('sidebar-open');
            toggle.querySelector('i').className = 'fas fa-chevron-right';
        }
        toggle.classList.remove('shifted');
        toggle.style.display = 'flex';
    }
}

// 隐藏侧边栏切换按钮（首页时使用）
function hideSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
        toggle.style.display = 'none';
    }
    // 确保侧边栏关闭
    const sidebar = document.getElementById('chapterSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mainContent = document.querySelector('.main-content');
    if (sidebar) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        mainContent.classList.remove('sidebar-open');
    }
}

// 初始化章节系统
function initChapterSystem() {
    if (typeof CHAPTERS === 'undefined') {
        console.warn('chapters.js 未加载，章节系统不可用');
        return;
    }

    renderChapterSidebar();
    // 首页默认隐藏侧边栏按钮
    hideSidebarToggle();

    // 从URL hash恢复章节
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('ch')) {
        setTimeout(() => switchChapter(hash), 100);
    }
}

// 处理浏览器前进/后退
window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '');
    // 防止递归：switchModule/setHash 会触发 popstate，如果已经在目标模块则跳过
    if (hash === state.currentModule) return;
    if (hash && hash.startsWith('ch')) {
        switchChapter(hash);
    } else if (CH2_MODULE_IDS.includes(hash)) {
        // 第2章子模块：需要重建 ch2 容器和导航栏
        switchChapter('ch2');
        if (hash !== 'intro') {
            setTimeout(() => startVariableModule(hash), 100);
        }
    } else if (hash === 'achievement' || hash === 'welcome') {
        // 非章节模块：交由 switchModule 处理，避免被重置回首页
        switchModule(hash);
    } else if (hash === '') {
        // 返回首页
        document.querySelectorAll('.chapter-section').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
        const welcome = document.getElementById('welcome');
        if (welcome) welcome.classList.add('active');
        updateSidebarActive(null);
        hideSidebarToggle();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// 在DOMContentLoaded中初始化章节系统
document.addEventListener('DOMContentLoaded', () => {
    initChapterSystem();
    // 初始化通知轮询
    initNotificationPolling();
    // 初始化每日一题
    renderDailyQuestion();
    // 初始化学习日历
    renderStudyCalendar('calendarGrid');
    updateStudyStreak();
    // 初始化笔记面板（在章节内容渲染后）
    initNotePanelObserver();
});

// ================================================================
//   新功能模块 - 学习排行榜
// ================================================================
async function renderLeaderboard() {
    const currentUser = getCurrentUser();
    const body = document.getElementById('leaderboardBody');
    const empty = document.getElementById('leaderboardEmpty');
    const loginHint = document.getElementById('leaderboardLoginHint');
    const table = document.getElementById('leaderboardTable');

    if (!currentUser) {
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (loginHint) loginHint.style.display = 'block';
        return;
    }

    if (loginHint) loginHint.style.display = 'none';

    const grade = document.getElementById('lbGradeFilter')?.value || '';
    const classNum = document.getElementById('lbClassFilter')?.value || '';

    try {
        const data = await API.getLeaderboard(grade, classNum);
        if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (table) table.style.display = '';
        if (empty) empty.style.display = 'none';

        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        body.innerHTML = data.leaderboard.map((item, i) => {
            const rank = i + 1;
            const isMe = item.username === currentUser.username;
            const rankStyle = rank <= 3 ? `style="background:${rankColors[rank-1]};color:#000;font-weight:700;border-radius:50%;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;"` : '';
            const rowStyle = isMe ? 'style="background:rgba(4,170,109,0.1);font-weight:600;"' : '';
            return `
                <tr ${rowStyle}>
                    <td>${rank <= 3 ? `<span ${rankStyle}>${rank}</span>` : rank}</td>
                    <td>${escHtml(item.display_name || item.username)}${isMe ? ' (我)' : ''}</td>
                    <td>${escHtml(item.grade || '')}${item.class_num ? item.class_num + '班' : ''}</td>
                    <td>${item.chapter_count || 0}</td>
                    <td>${item.achievement_count || 0}</td>
                    <td>${item.score || 0}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        if (table) table.style.display = 'none';
        if (empty) { empty.style.display = 'block'; empty.innerHTML = '<p>⚠️ 加载排行榜失败，请稍后重试</p>'; }
    }
}

// ================================================================
//   新功能模块 - 错题本
// ================================================================
async function renderMistakeBook() {
    const currentUser = getCurrentUser();
    const list = document.getElementById('mistakesList');
    const empty = document.getElementById('mistakesEmpty');
    const loginHint = document.getElementById('mistakesLoginHint');
    const stats = document.getElementById('mistakesStats');
    const filter = document.getElementById('mistakeChapterFilter');

    if (!currentUser) {
        if (list) list.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loginHint) loginHint.style.display = 'block';
        if (stats) stats.style.display = 'none';
        return;
    }

    if (loginHint) loginHint.style.display = 'none';
    if (stats) stats.style.display = '';

    try {
        const data = await API.getMistakes(currentUser.username);
        if (!data.success) {
            if (list) list.innerHTML = '<p style="text-align:center;color:#e74c3c;">加载错题失败，请稍后重试</p>';
            return;
        }
        const mistakes = data.mistakes || [];
        const selectedChapter = filter?.value || '';

        // 更新筛选下拉
        if (filter && filter.options.length <= 1) {
            const chapters = [...new Set(mistakes.map(m => m.chapter_id))];
            filter.innerHTML = '<option value="">全部章节</option>' +
                chapters.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
        }

        const filtered = selectedChapter ? mistakes.filter(m => m.chapter_id === selectedChapter) : mistakes;

        // 更新统计
        const totalChapters = new Set(mistakes.map(m => m.chapter_id)).size;
        document.getElementById('mstatTotal').textContent = mistakes.length;
        document.getElementById('mstatChapters').textContent = totalChapters;

        if (filtered.length === 0) {
            if (list) list.innerHTML = '';
            if (empty) { empty.style.display = 'block'; empty.querySelector('p').textContent = mistakes.length === 0 ? '🎉 暂无错题记录，继续保持！' : '该章节暂无错题'; }
            return;
        }

        if (empty) empty.style.display = 'none';

        // 按章节分组
        const grouped = {};
        filtered.forEach(m => {
            if (!grouped[m.chapter_id]) grouped[m.chapter_id] = [];
            grouped[m.chapter_id].push(m);
        });

        list.innerHTML = Object.entries(grouped).map(([chapterId, items]) => `
            <div class="mistake-group">
                <h4 class="mistake-group-title">章节：${escHtml(chapterId)} (${items.length}题)</h4>
                ${items.map(m => `
                    <div class="mistake-item">
                        <div class="mistake-question"><strong>题目：</strong>${escHtml(m.question_text)}</div>
                        <div class="mistake-answers">
                            <span class="mistake-correct">正确答案：${escHtml(m.correct_answer)}</span>
                            <span class="mistake-wrong">我的答案：${escHtml(m.student_answer)}</span>
                        </div>
                        <div class="mistake-time">${m.created_at ? new Date(m.created_at).toLocaleString('zh-CN') : ''}</div>
                        <button class="mistake-delete-btn" onclick="deleteMistakeItem(${m.id})">🗑️ 删除</button>
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch (e) {
        if (list) list.innerHTML = '<p style="color:#e74c3c;text-align:center;">加载错题失败，请稍后重试</p>';
    }
}

async function recordMistake(chapterId, questionText, correctAnswer, studentAnswer) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        // 本地存储
        const local = JSON.parse(localStorage.getItem('pv_local_mistakes') || '[]');
        local.push({ chapterId, questionText, correctAnswer, studentAnswer, created_at: new Date().toISOString() });
        localStorage.setItem('pv_local_mistakes', JSON.stringify(local));
        return;
    }
    try {
        await API.addMistake(currentUser.username, chapterId, questionText, correctAnswer, studentAnswer);
    } catch (e) {
        log.error('记录错题失败:', e.message);
    }
}

async function deleteMistakeItem(id) {
    if (!confirm('确定要删除这条错题记录吗？')) return;
    try {
        const currentUser = getCurrentUser();
        await API.deleteMistake(id, currentUser?.username || '');
        renderMistakeBook();
    } catch (e) {
        showToast('删除失败: ' + e.message, 'error');
    }
}

// ================================================================
//   新功能模块 - 个人学习报告
// ================================================================
async function renderReport() {
    const currentUser = getCurrentUser();
    const loginHint = document.getElementById('reportLoginHint');
    const userName = document.getElementById('reportUserName');

    if (!currentUser) {
        if (loginHint) loginHint.style.display = 'block';
        if (userName) userName.textContent = '你的学习数据分析';
        // 本地报告
        renderLocalReport();
        return;
    }

    if (loginHint) loginHint.style.display = 'none';
    if (userName) userName.textContent = currentUser.displayName + ' 的学习报告';

    try {
        const data = await API.getReport(currentUser.username);
        if (!data.success) {
            renderLocalReport();
            return;
        }

        const report = data.report || {};
        document.getElementById('rstatCompleted').textContent = report.totalChapters || 0;
        document.getElementById('rstatAchievements').textContent = report.totalAchievements || 0;
        document.getElementById('rstatStreak').textContent = report.streakDays || 0;
        document.getElementById('rstatTotalDays').textContent = report.totalDays || 0;

        // 环形进度
        const percent = Math.round(((report.totalChapters || 0) / 19) * 100);
        const ring = document.getElementById('ringCircle');
        if (ring) ring.style.background = `conic-gradient(var(--w3-green) ${percent * 3.6}deg, #333 ${percent * 3.6}deg)`;
        const ringPercent = document.getElementById('ringPercent');
        if (ringPercent) ringPercent.textContent = percent + '%';

        // 时间线
        const timeline = document.getElementById('chapterTimeline');
        if (timeline && report.chapterDetails) {
            timeline.innerHTML = report.chapterDetails.map(c => `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <strong>${escHtml(c.moduleId)}</strong>
                        <span>${c.completedAt ? new Date(c.completedAt).toLocaleDateString('zh-CN') : '未完成'}</span>
                    </div>
                </div>
            `).join('');
        }

        // 强项/弱项
        const strong = document.getElementById('strongChapters');
        const weak = document.getElementById('weakChapters');
        if (strong) strong.innerHTML = report.strengths?.length ? report.strengths.map(c => `<span class="tag tag-green">${escHtml(c)}</span>`).join('') : '<p class="text-muted">完成更多测验来发现你的强项</p>';
        if (weak) weak.innerHTML = report.weaknesses?.length ? report.weaknesses.map(c => `<span class="tag tag-red">${escHtml(c)}</span>`).join('') : '<p class="text-muted">错题较多的章节会显示在这里</p>';

        renderStudyCalendar('calendarGrid');
        updateStudyStreak();
    } catch (e) {
        renderLocalReport();
    }
}

function renderLocalReport() {
    const progress = getLocalProgress();
    const completed = Object.keys(progress.chapters || {}).length;
    const achievements = getLocalAchievements();
    const achCount = Object.keys(achievements).length;

    const elCompleted = document.getElementById('rstatCompleted');
    const elAch = document.getElementById('rstatAchievements');
    if (elCompleted) elCompleted.textContent = completed;
    if (elAch) elAch.textContent = achCount;

    const percent = Math.round((completed / 19) * 100);
    const ring = document.getElementById('ringCircle');
    if (ring) ring.style.background = `conic-gradient(var(--w3-green) ${percent * 3.6}deg, #333 ${percent * 3.6}deg)`;
    const ringPercent = document.getElementById('ringPercent');
    if (ringPercent) ringPercent.textContent = percent + '%';

    renderStudyCalendar('calendarGrid');
    updateStudyStreak();
}

// ================================================================
//   学习日历/连续天数
// ================================================================
function renderStudyCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const days = [];
    const today = new Date();
    const studyDates = getStudyDates();

    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('zh-CN');
        days.push({
            date: dateStr,
            day: d.getDate(),
            weekday: d.getDay(),
            studied: studyDates.includes(dateStr),
            isToday: i === 0
        });
    }

    container.innerHTML = days.map(d => `
        <div class="calendar-day ${d.studied ? 'studied' : ''} ${d.isToday ? 'today' : ''}" 
             title="${d.date}${d.studied ? ' - 已学习' : ''}">
            ${d.day}
        </div>
    `).join('');
}

function getStudyDates() {
    try {
        return JSON.parse(localStorage.getItem('pv_study_dates') || '[]');
    } catch (e) {
        return [];
    }
}

function updateStudyStreak() {
    const streakEl = document.getElementById('calendarStreak');
    if (!streakEl) return;

    const dates = getStudyDates();
    const today = new Date().toLocaleDateString('zh-CN');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('zh-CN');

    // 如果今天和昨天都没有学习记录，连续天数为0
    if (!dates.includes(today) && !dates.includes(yesterday)) {
        streakEl.textContent = '🔥 连续学习 0 天，今天开始学习吧！';
        document.getElementById('rstatStreak') && (document.getElementById('rstatStreak').textContent = '0');
        return;
    }

    let streak = 0;
    let checkDate = new Date();
    if (!dates.includes(today)) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dates.includes(checkDate.toLocaleDateString('zh-CN'))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    streakEl.textContent = `🔥 连续学习 ${streak} 天，太棒了！`;
    const elStreak = document.getElementById('rstatStreak');
    if (elStreak) elStreak.textContent = streak;
}

// 记录今日学习
function recordTodayStudy() {
    const dates = getStudyDates();
    const today = new Date().toLocaleDateString('zh-CN');
    if (!dates.includes(today)) {
        dates.push(today);
        localStorage.setItem('pv_study_dates', JSON.stringify(dates));
        updateStudyStreak();
        renderStudyCalendar('calendarGrid');
    }
}

// ================================================================
//   学习笔记
// ================================================================
function initNotePanelObserver() {
    // 监听章节内容变化以添加笔记面板
    const observer = new MutationObserver(() => {
        if (currentChapter && currentChapterModule) {
            const contentArea = document.getElementById('chapterContent-' + currentChapter);
            if (contentArea && !contentArea.querySelector('.note-panel')) {
                initNotePanelForChapter(currentChapter);
            }
        }
    });
    observer.observe(document.querySelector('main'), { childList: true, subtree: true });
}

function initNotePanelForChapter(chapterId) {
    const contentArea = document.getElementById('chapterContent-' + chapterId);
    if (!contentArea || contentArea.querySelector('.note-panel')) return;

    const notePanel = document.createElement('div');
    notePanel.className = 'note-panel';
    notePanel.innerHTML = `
        <div class="note-panel-header" onclick="this.parentElement.classList.toggle('open')">
            <h4>📝 学习笔记 <i class="fas fa-chevron-down"></i></h4>
        </div>
        <div class="note-panel-body">
            <textarea class="note-textarea" id="noteTextarea-${chapterId}" placeholder="在这里记录你的学习笔记...支持简单文本"></textarea>
            <div class="note-actions">
                <button class="note-save-btn" onclick="saveNoteForChapter('${chapterId}')">💾 保存笔记</button>
                <span class="note-status" id="noteStatus-${chapterId}"></span>
            </div>
        </div>
    `;
    contentArea.appendChild(notePanel);

    // 加载已有笔记
    loadNoteForChapter(chapterId);
}

async function saveNoteForChapter(chapterId) {
    const textarea = document.getElementById('noteTextarea-' + chapterId);
    const status = document.getElementById('noteStatus-' + chapterId);
    if (!textarea) return;

    const content = textarea.value.trim();
    const currentUser = getCurrentUser();

    if (currentUser) {
        try {
            await API.saveNote(currentUser.username, chapterId, currentChapterModule || 'general', content);
            if (status) { status.textContent = '✅ 已保存'; status.className = 'note-status saved'; }
        } catch (e) {
            if (status) { status.textContent = '❌ 保存失败'; status.className = 'note-status error'; }
        }
    } else {
        // localStorage
        const notes = JSON.parse(localStorage.getItem('pv_notes') || '{}');
        notes[chapterId] = { content, savedAt: new Date().toISOString() };
        localStorage.setItem('pv_notes', JSON.stringify(notes));
        if (status) { status.textContent = '✅ 已本地保存'; status.className = 'note-status saved'; }
    }

    setTimeout(() => { if (status) status.textContent = ''; }, 2000);
}

async function loadNoteForChapter(chapterId) {
    const textarea = document.getElementById('noteTextarea-' + chapterId);
    if (!textarea) return;

    const currentUser = getCurrentUser();
    let content = '';

    if (currentUser) {
        try {
            const data = await API.getNotes(currentUser.username, chapterId);
            if (data.notes && data.notes.length > 0) {
                content = data.notes[0].content || '';
            }
        } catch (e) { /* ignore */ }
    } else {
        const notes = JSON.parse(localStorage.getItem('pv_notes') || '{}');
        if (notes[chapterId]) content = notes[chapterId].content || '';
    }

    textarea.value = content;
}

// ================================================================
//   代码收藏夹
// ================================================================
async function renderSnippets() {
    const currentUser = getCurrentUser();
    const list = document.getElementById('snippetsList');
    const empty = document.getElementById('snippetsEmpty');
    const loginHint = document.getElementById('snippetsLoginHint');

    if (!currentUser) {
        if (list) list.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loginHint) loginHint.style.display = 'block';
        return;
    }

    if (loginHint) loginHint.style.display = 'none';

    try {
        const data = await API.getSnippets(currentUser.username);
        const snippets = data.snippets || [];

        if (snippets.length === 0) {
            if (list) list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        list.innerHTML = snippets.map(s => `
            <div class="snippet-item" id="snippet-${s.id}">
                <div class="snippet-header">
                    <h4>⭐ ${escHtml(s.title)}</h4>
                    <span class="snippet-chapter">${escHtml(s.chapter_id || '')}</span>
                </div>
                <div class="snippet-preview">
                    <pre><code>${escHtml(s.code?.substring(0, 200) || '')}${s.code?.length > 200 ? '...' : ''}</code></pre>
                </div>
                <div class="snippet-actions">
                    <button class="snippet-btn" onclick="toggleSnippetCode(${s.id})">📖 ${s.code?.length > 200 ? '展开' : '查看'}</button>
                    <button class="snippet-btn snippet-delete" onclick="deleteSnippetItem(${s.id})">🗑️ 删除</button>
                    <span class="snippet-time">${s.created_at ? new Date(s.created_at).toLocaleDateString('zh-CN') : ''}</span>
                </div>
                <div class="snippet-full-code" id="snippetFullCode-${s.id}" style="display:none">
                    <pre><code>${escHtml(s.code || '')}</code></pre>
                </div>
            </div>
        `).join('');
    } catch (e) {
        if (list) list.innerHTML = '<p style="color:#e74c3c;text-align:center;">加载收藏失败</p>';
    }
}

function toggleSnippetCode(id) {
    const el = document.getElementById('snippetFullCode-' + id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function saveSnippet(title, code, chapterId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('请先登录后再收藏', 'error');
        return;
    }
    try {
        await API.addSnippet(currentUser.username, title, code, chapterId);
        showToast('已收藏代码片段', 'success');
    } catch (e) {
        showToast('收藏失败: ' + e.message, 'error');
    }
}

async function deleteSnippetItem(id) {
    if (!confirm('确定要删除这个收藏吗？')) return;
    try {
        const currentUser = getCurrentUser();
        await API.deleteSnippet(id, currentUser?.username || '');
        renderSnippets();
    } catch (e) {
        showToast('删除失败: ' + e.message, 'error');
    }
}

// ================================================================
//   消息通知中心
// ================================================================
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
}

async function fetchNotifications() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
        const data = await API.getNotifications(currentUser.username);
        if (!data.success) return;
        const notifications = data.notifications || [];
        const badge = document.getElementById('notificationBadge');
        const body = document.getElementById('notificationPanelBody');

        const unreadCount = notifications.filter(n => !n.is_read).length;
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        if (body) {
            if (notifications.length === 0) {
                body.innerHTML = '<div class="notification-empty">暂无通知</div>';
            } else {
                body.innerHTML = notifications.map(n => `
                    <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
                        <div class="notification-icon">${n.type === 'achievement' ? '🏆' : n.type === 'announce' ? '📢' : '📝'}</div>
                        <div class="notification-body">
                            <div class="notification-text">${escHtml(n.title || n.content || '')}</div>
                            <div class="notification-time">${n.created_at ? new Date(n.created_at).toLocaleString('zh-CN') : ''}</div>
                        </div>
                        ${!n.is_read ? '<span class="notification-dot"></span>' : ''}
                    </div>
                `).join('');
            }
        }
    } catch (e) { /* 静默失败 */ }
}

async function markNotificationRead(id) {
    try {
        await API.markNotificationRead(id);
        fetchNotifications();
    } catch (e) { /* ignore */ }
}

function initNotificationPolling() {
    fetchNotifications();
    setInterval(fetchNotifications, 30000); // 每30秒轮询
}

// 点击其他地方关闭通知面板
document.addEventListener('click', function(e) {
    const panel = document.getElementById('notificationPanel');
    const bell = document.getElementById('notificationBellWrap');
    if (panel && panel.style.display !== 'none' && !bell?.contains(e.target)) {
        panel.style.display = 'none';
    }
});

// ================================================================
//   学习目标设定
// ================================================================
async function renderGoals() {
    const currentUser = getCurrentUser();
    const loginHint = document.getElementById('goalsLoginHint');
    const list = document.getElementById('goalsList');
    const empty = document.getElementById('goalsEmpty');
    const form = document.getElementById('goalForm');

    if (!currentUser) {
        if (loginHint) loginHint.style.display = 'block';
        if (list) list.innerHTML = '<h3>📋 当前目标</h3>';
        if (empty) empty.style.display = 'none';
        if (form) form.style.display = 'none';
        return;
    }

    if (loginHint) loginHint.style.display = 'none';
    if (form) form.style.display = '';

    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const startInput = document.getElementById('goalStartDate');
    const endInput = document.getElementById('goalEndDate');
    if (startInput && !startInput.value) startInput.value = today;
    if (endInput && !endInput.value) endInput.value = endDate;

    try {
        const data = await API.getGoals(currentUser.username);
        if (!data.success) {
            if (list) list.innerHTML = '<h3>📋 当前目标</h3><p style="color:#e74c3c;">加载目标失败</p>';
            return;
        }
        const goals = data.goals || [];

        if (goals.length === 0) {
            if (list) list.innerHTML = '<h3>📋 当前目标</h3>';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        const chapterProgress = JSON.parse(localStorage.getItem('pv_chapter_progress') || '{}');
        const completedCount = Object.keys(chapterProgress).length;

        list.innerHTML = '<h3>📋 当前目标</h3>' + goals.map(g => {
            const targetChapters = g.target_chapters || 1;
            const progress = Math.min(100, Math.round((completedCount / targetChapters) * 100));
            const isComplete = completedCount >= targetChapters;
            return `
                <div class="goal-item ${isComplete ? 'goal-completed' : ''}">
                    <div class="goal-header">
                        <h4>🎯 ${escHtml(g.goal_text)}</h4>
                        ${isComplete ? '<span class="goal-badge">✅ 已完成</span>' : ''}
                    </div>
                    <div class="goal-meta">
                        <span>📅 ${g.start_date ? new Date(g.start_date).toLocaleDateString('zh-CN') : ''} - ${g.end_date ? new Date(g.end_date).toLocaleDateString('zh-CN') : ''}</span>
                        <span>📚 目标：${targetChapters}章 / 已完成：${completedCount}章</span>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width:${progress}%">${progress}%</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        if (list) list.innerHTML = '<h3>📋 当前目标</h3><p style="color:#e74c3c;">加载目标失败</p>';
    }
}

async function setGoal(event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('请先登录', 'error');
        return false;
    }

    const goalText = document.getElementById('goalText').value.trim();
    const targetChapters = parseInt(document.getElementById('goalTargetChapters').value) || 5;
    const startDate = document.getElementById('goalStartDate').value;
    const endDate = document.getElementById('goalEndDate').value;

    try {
        await API.setGoal(currentUser.username, goalText, targetChapters, startDate, endDate);
        showToast('目标设定成功！', 'success');
        document.getElementById('goalText').value = '';
        renderGoals();
    } catch (e) {
        showToast('设定失败: ' + e.message, 'error');
    }
    return false;
}

// ================================================================
//   讨论区
// ================================================================
async function renderDiscussions(chapterId) {
    const currentUser = getCurrentUser();
    const posts = document.getElementById('discussionPosts');
    const empty = document.getElementById('discussionEmpty');
    const loginHint = document.getElementById('discussionLoginHint');
    const detail = document.getElementById('discussionDetail');
    const filter = document.getElementById('discussionChapterFilter');

    if (detail) detail.style.display = 'none';

    if (!currentUser) {
        if (posts) posts.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loginHint) loginHint.style.display = 'block';
        return;
    }

    if (loginHint) loginHint.style.display = 'none';

    // 初始化章节筛选下拉
    if (filter && filter.options.length <= 1) {
        const chOptions = [{ id: 'ch1', name: '第1章 认识Python' }, { id: 'ch2', name: '第2章 变量' }, { id: 'ch3', name: '第3章 变量类型' },
            { id: 'ch4', name: '第4章 条件判断' }, { id: 'ch6', name: '第6章 while循环' }, { id: 'ch11', name: '第11章 初识列表' }];
        filter.innerHTML = '<option value="">全部章节</option>' +
            chOptions.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // 初始化发帖章节下拉
    const postChapterSelect = document.getElementById('postChapterId');
    if (postChapterSelect && postChapterSelect.options.length <= 1) {
        const chOptions = [{ id: 'ch1', name: '第1章 认识Python' }, { id: 'ch2', name: '第2章 变量' }, { id: 'ch3', name: '第3章 变量类型' },
            { id: 'ch4', name: '第4章 条件判断' }, { id: 'ch6', name: '第6章 while循环' }, { id: 'ch11', name: '第11章 初识列表' }];
        postChapterSelect.innerHTML = '<option value="">不关联章节</option>' +
            chOptions.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    try {
        const data = await API.getDiscussions(chapterId || '');
        if (!data.success) {
            if (posts) posts.innerHTML = '<p style="text-align:center;color:#e74c3c;">加载讨论失败</p>';
            return;
        }
        const discussions = data.discussions || [];

        if (discussions.length === 0) {
            if (posts) posts.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        posts.innerHTML = discussions.map(d => `
            <div class="discussion-post-item" onclick="renderDiscussionDetail(${d.id})">
                <div class="discussion-post-title">${escHtml(d.title)}</div>
                <div class="discussion-post-meta">
                    <span>👤 ${escHtml(d.username)}</span>
                    <span>💬 ${d.reply_count || 0} 回复</span>
                    <span>📅 ${d.created_at ? new Date(d.created_at).toLocaleDateString('zh-CN') : ''}</span>
                    ${d.chapter_id ? `<span class="discussion-chapter-tag">${escHtml(d.chapter_id)}</span>` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        if (posts) posts.innerHTML = '<p style="text-align:center;color:#e74c3c;">加载讨论失败</p>';
    }
}

async function renderDiscussionDetail(postId) {
    const posts = document.getElementById('discussionPosts');
    const detail = document.getElementById('discussionDetail');
    const empty = document.getElementById('discussionEmpty');

    if (posts) posts.style.display = 'none';
    if (empty) empty.style.display = 'none';
    if (detail) detail.style.display = 'block';

    try {
        const data = await API.getDiscussionDetail(postId);
        if (!data.success || !data.post) {
            if (detail) detail.innerHTML = '<p style="text-align:center;">帖子不存在</p>';
            return;
        }

        const d = data.post;
        const replies = data.replies || [];

        detail.innerHTML = `
            <div class="discussion-detail-card">
                <button class="discussion-back-btn" onclick="backToDiscussionList()">← 返回列表</button>
                <h3>${escHtml(d.title)}</h3>
                <div class="discussion-detail-meta">
                    <span>👤 ${escHtml(d.username)}</span>
                    <span>📅 ${d.created_at ? new Date(d.created_at).toLocaleString('zh-CN') : ''}</span>
                    ${d.chapter_id ? `<span class="discussion-chapter-tag">${escHtml(d.chapter_id)}</span>` : ''}
                </div>
                <div class="discussion-detail-content">${escHtml(d.content)}</div>
            </div>
            <div class="discussion-replies">
                <h4>💬 回复 (${replies.length})</h4>
                ${replies.map(r => `
                    <div class="discussion-reply-item">
                        <div class="discussion-reply-header">
                            <strong>${escHtml(r.username)}</strong>
                            <span>${r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : ''}</span>
                        </div>
                        <div class="discussion-reply-content">${escHtml(r.content)}</div>
                    </div>
                `).join('')}
                <div class="discussion-reply-form">
                    <h4>📝 发表回复</h4>
                    <form onsubmit="return createReply(${postId}, event)">
                        <textarea id="replyContent" class="form-input" rows="3" placeholder="输入你的回复..." required></textarea>
                        <button type="submit" class="form-submit-btn">回复</button>
                    </form>
                </div>
            </div>
        `;
    } catch (e) {
        if (detail) detail.innerHTML = '<p style="text-align:center;color:#e74c3c;">加载帖子详情失败</p>';
    }
}

function backToDiscussionList() {
    const posts = document.getElementById('discussionPosts');
    const detail = document.getElementById('discussionDetail');
    const empty = document.getElementById('discussionEmpty');
    if (posts) posts.style.display = '';
    if (detail) detail.style.display = 'none';
    renderDiscussions();
}

function showDiscussionForm() {
    document.getElementById('discussionFormWrap').style.display = 'block';
}

function hideDiscussionForm() {
    document.getElementById('discussionFormWrap').style.display = 'none';
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
}

async function createPost(event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('请先登录', 'error');
        return false;
    }

    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const chapterId = document.getElementById('postChapterId').value;

    try {
        await API.createDiscussion(currentUser.username, title, content, chapterId);
        showToast('发帖成功！', 'success');
        hideDiscussionForm();
        renderDiscussions();
    } catch (e) {
        showToast('发帖失败: ' + e.message, 'error');
    }
    return false;
}

async function createReply(postId, event) {
    event.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showToast('请先登录', 'error');
        return false;
    }

    const content = document.getElementById('replyContent').value.trim();
    try {
        await API.createReply(postId, currentUser.username, content);
        showToast('回复成功！', 'success');
        renderDiscussionDetail(postId);
    } catch (e) {
        showToast('回复失败: ' + e.message, 'error');
    }
    return false;
}

// ================================================================
//   每日一题
// ================================================================
async function renderDailyQuestion() {
    const card = document.getElementById('dailyQuestionCard');
    if (!card) return;

    try {
        const data = await API.getDailyQuestion();
        if (!data.success || !data.question) {
            card.style.display = 'none';
            return;
        }

        const q = data.question;
        card.style.display = 'block';
        card.innerHTML = `
            <div class="daily-question-header">
                <h3>📅 每日一题</h3>
                <span class="daily-question-date">${new Date().toLocaleDateString('zh-CN')}</span>
            </div>
            <div class="daily-question-body">
                <p class="daily-question-text">${escHtml(q.question)}</p>
                <div class="daily-question-options">
                    ${(typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || [])).map((opt, i) => `
                        <button class="daily-option-btn" onclick="submitDailyAnswer(${i}, '${escHtml(q.answer || '').replace(/'/g, "\\'")}', this)" data-index="${i}">
                            ${String.fromCharCode(65 + i)}. ${escHtml(opt)}
                        </button>
                    `).join('')}
                </div>
                <div class="daily-question-feedback" id="dailyFeedback" style="display:none"></div>
            </div>
        `;
    } catch (e) {
        card.style.display = 'none';
    }
}

function submitDailyAnswer(answerIndex, correctAnswer, btn) {
    const feedback = document.getElementById('dailyFeedback');
    const allBtns = document.querySelectorAll('.daily-option-btn');

    allBtns.forEach(b => b.disabled = true);

    const isCorrect = String(answerIndex) === String(correctAnswer);
    if (isCorrect) {
        btn.classList.add('correct');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.innerHTML = '✅ 回答正确！太棒了！';
            feedback.className = 'daily-question-feedback correct';
        }
    } else {
        btn.classList.add('wrong');
        // 高亮正确答案
        allBtns.forEach(b => {
            if (b.dataset.index === String(correctAnswer)) b.classList.add('correct');
        });
        if (feedback) {
            feedback.style.display = 'block';
            feedback.innerHTML = '❌ 回答错误，正确答案已标出。';
            feedback.className = 'daily-question-feedback wrong';
        }
    }
}

// ================================================================
//   语音朗读
// ================================================================
let speechSynth = window.speechSynthesis;
let currentUtterance = null;

function speakText(text) {
    if (!speechSynth) {
        showToast('您的浏览器不支持语音朗读', 'error');
        return;
    }

    // 如果正在朗读，暂停
    if (speechSynth.speaking && !speechSynth.paused) {
        speechSynth.pause();
        return;
    }

    // 如果已暂停，继续
    if (speechSynth.paused) {
        speechSynth.resume();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    currentUtterance = utterance;
    speechSynth.speak(utterance);
}

function stopSpeaking() {
    if (speechSynth) {
        speechSynth.cancel();
        currentUtterance = null;
    }
}

// 在章节内容渲染后添加朗读按钮
function addSpeakButton(container) {
    if (!container || container.querySelector('.speak-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'speak-btn';
    btn.innerHTML = '🔊 朗读';
    btn.title = '朗读当前内容';
    btn.onclick = function() {
        const text = container.textContent || '';
        if (speechSynth?.speaking) {
            stopSpeaking();
            btn.innerHTML = '🔊 朗读';
        } else {
            speakText(text);
            btn.innerHTML = '⏸️ 暂停';
            // 监听朗读结束
            const checkEnd = setInterval(() => {
                if (!speechSynth?.speaking) {
                    btn.innerHTML = '🔊 朗读';
                    clearInterval(checkEnd);
                }
            }, 500);
        }
    };
    container.insertBefore(btn, container.firstChild);
}

// 在章节内容渲染后调用 - 由 chapter-interactions.js 调用
// 通过 MutationObserver 自动添加
(function initSpeakButtonObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    const contentAreas = node.querySelectorAll ? node.querySelectorAll('.ch-module-wrap, .module-header') : [];
                    contentAreas.forEach(area => {
                        if (area.querySelector('h2') && !area.querySelector('.speak-btn')) {
                            addSpeakButton(area);
                        }
                    });
                }
            });
        });
    });
    observer.observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
})();
