// ===== 第2章（变量）交互模块 =====
// 此文件包含第2章变量章节的专属函数
// 依赖：script.js 中的核心函数（showSidebarToggle, toggleSidebar, updateSidebarActive,
//       stickyChapterNav, switchModule, markChapterCompleted, applyThemeToChapterContent 等）
// 依赖：chapter-interactions.js 中的 shuffleDebugButtons, shuffleQuizOptions

console.log('%c[script-ch2.js] 文件已加载', 'color:#04AA6D;font-weight:bold');

// ===== 第2章模块递进式解锁 =====
const CH2_MODULE_NAMES = ['ch2_intro','ch2_lab','ch2_lesson','ch2_judge','ch2_practice','ch2_trace','ch2_debug','ch2_extend','ch2_project','ch2_test'];
const CH2_MODULE_LABELS = {
    'ch2_intro':'🎬 情境导入','ch2_lab':'🧪 类比实验室','ch2_lesson':'📚 知识讲解','ch2_judge':'⚖️ 命名小法官',
    'ch2_practice':'💻 实践操作','ch2_trace':'🔍 值追踪挑战','ch2_debug':'🏥 调试诊所','ch2_extend':'🚀 扩展思维',
    'ch2_project':'🎨 创意项目','ch2_test':'📝 课堂小测'
};

function ch2IsUnlocked(index, completedIds) {
    if (index <= 0) return true;
    return completedIds.has(CH2_MODULE_NAMES[index - 1]);
}

function applyCH2NavStates(completedIds) {
    const nav = document.getElementById('chapterModNav-ch2');
    if (!nav) return;
    nav.querySelectorAll('.mod-nav-btn').forEach(function(btn, i) {
        const modId = CH2_MODULE_NAMES[i];
        if (!modId) return;
        const completed = completedIds.has(modId);
        const unlocked = ch2IsUnlocked(i, completedIds);
        const locked = !completed && !unlocked;
        btn.disabled = locked;
        btn.style.opacity = locked ? '0.45' : '';
        btn.style.cursor = locked ? 'not-allowed' : '';
        if (locked) btn.setAttribute('title', '完成前置模块后解锁'); else btn.removeAttribute('title');
        const badge = btn.querySelector('.mod-nav-badge');
        if (badge) badge.textContent = completed ? '✅' : (locked ? '🔒' : '');
    });
}

function renderCH2Locked(moduleId) {
    const contentArea = document.getElementById('chapterContent-ch2');
    if (!contentArea) return;
    const idx = CH2_MODULE_NAMES.indexOf(moduleId);
    const prevId = idx > 0 ? CH2_MODULE_NAMES[idx - 1] : '';
    const prevName = prevId ? (CH2_MODULE_LABELS[prevId] || prevId) : '';
    const curName = CH2_MODULE_LABELS[moduleId] || moduleId;
    contentArea.innerHTML = '<div class="ch-module-wrap"><div style="text-align:center;padding:80px 24px;">' +
        '<div style="font-size:52px;line-height:1;">🔒</div>' +
        '<h3 style="margin:20px 0 8px;">' + curName + ' 尚未解锁</h3>' +
        '<p style="color:var(--text-secondary);margin:0;">请先完成「' + prevName + '」模块后再学习本模块。</p>' +
        '</div></div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 模块完成时即时刷新第2章导航的解锁状态
window.addEventListener('moduleCompleted', function(e) {
    const moduleId = e.detail && e.detail.moduleId;
    if (moduleId && CH2_MODULE_NAMES.indexOf(moduleId) >= 0) {
        window.getCompletedModuleIds().then(function(ids) {
            applyCH2NavStates(ids);
        });
    }
});

// 切换到变量章节(第2章) - 显示变量模块交互内容(内部函数)
// initialModule: 可选，指定初始打开的子模块，默认 'ch2_intro'
async function switchToVariableChapterBody(initialModule) {
    // 章节锁定检查：老师锁定的第2章禁止访问
    if (typeof window.lockedChapters === 'undefined') {
        await window.loadChapterLocks();
    }
    if (window.lockedChapters && window.lockedChapters['ch2']) {
        window.showConfirm('🔒 章节已锁定', '《变量》已被老师锁定，暂时无法学习，请联系老师。', '🔒', '我知道了', null);
        return;
    }

    initialModule = initialModule || 'ch2_intro';
    // 显示侧边栏切换按钮
    showSidebarToggle();

    if (window.innerWidth <= 768) {
        toggleSidebar();
    }

    currentChapter = 'ch2';
    currentChapterModule = null;

    // 标记进入 ch2，使子模块内容获得导航栏补偿
    document.body.classList.add('in-ch2');

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
            <button class="mod-nav-btn" data-module="ch2_intro" onclick="startVariableModule('ch2_intro')">🎬 <span class="mod-nav-label">情境导入</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_lab" onclick="startVariableModule('ch2_lab')">🧪 <span class="mod-nav-label">类比实验室</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_lesson" onclick="startVariableModule('ch2_lesson')">📚 <span class="mod-nav-label">知识讲解</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_judge" onclick="startVariableModule('ch2_judge')">⚖️ <span class="mod-nav-label">命名小法官</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_practice" onclick="startVariableModule('ch2_practice')">💻 <span class="mod-nav-label">实践操作</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_trace" onclick="startVariableModule('ch2_trace')">🔍 <span class="mod-nav-label">值追踪挑战</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_debug" onclick="startVariableModule('ch2_debug')">🏥 <span class="mod-nav-label">调试诊所</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_extend" onclick="startVariableModule('ch2_extend')">🚀 <span class="mod-nav-label">扩展思维</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_project" onclick="startVariableModule('ch2_project')">🎨 <span class="mod-nav-label">创意项目</span><span class="mod-nav-badge"></span></button>
            <button class="mod-nav-btn" data-module="ch2_test" onclick="startVariableModule('ch2_test')">📝 <span class="mod-nav-label">课堂小测</span><span class="mod-nav-badge"></span></button>
            </div>
        </div>
        <div class="chapter-landing">
            <div class="chapter-hero" id="ch2-hero">
                <div class="chapter-badge-tag">核心概念</div>
                <h1>📦 变量</h1>
                <p class="chapter-subtitle">理解变量的概念，掌握命名规则与赋值操作</p>
                <div class="chapter-cta">
                    <button class="cta-btn cta-primary" onclick="startVariableModule('ch2_intro')">
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
async function startVariableModule(moduleId) {
    // 递进式解锁检查：未完成前置模块则显示锁定提示
    const modIndex = CH2_MODULE_NAMES.indexOf(moduleId);
    const completedIds = await window.getCompletedModuleIds();
    applyCH2NavStates(completedIds);
    if (modIndex >= 0 && !ch2IsUnlocked(modIndex, completedIds)) {
        renderCH2Locked(moduleId);
        return;
    }

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
    if (nav) {
        nav.querySelectorAll('.mod-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', CH2_MODULE_NAMES[i] === moduleId);
        });
    }

    currentChapter = 'ch2';
    currentChapterModule = moduleId;

    // 使用原有的switchModule函数，保留所有事件处理器
    switchModule(moduleId);

    // 添加下一页按钮到当前激活的模块底部（情境导入页不显示"下一页"按钮）
    const currentIndex = CH2_MODULE_NAMES.indexOf(moduleId);
    const nextIndex = currentIndex + 1;
    const isLast = nextIndex >= CH2_MODULE_NAMES.length;

    if (moduleId !== 'ch2_intro') {
        const activeModule = document.getElementById(moduleId);
        if (activeModule) {
            // 移除已有的下一页按钮
            const existing = activeModule.querySelector('.ch-next-bar');
            if (existing) existing.remove();

            const nextBtnHTML = `
                <div class="ch-next-bar">
                    ${isLast ? `
                        <button class="ch-next-btn ch-next-btn-done" id="ch-complete-btn" style="display:none;" onclick="markChapterCompleted('ch2');window.switchChapter('ch3')">
                            ✓ 本章完成，进入下一章：📊 变量类型 →
                        </button>
                        <button class="ch-next-btn ch-next-btn-locked" id="ch-complete-locked-btn" onclick="alert('请先完成上面的综合测试哦')">🔒 完成综合测试后即可进入下一章 →</button>
                    ` : `
                        <button class="ch-next-btn" onclick="window.saveLocalModule('${moduleId}');window.markModuleCompleted('${moduleId}');startVariableModule('${CH2_MODULE_NAMES[nextIndex]}')">
                            下一页：${CH2_MODULE_LABELS[CH2_MODULE_NAMES[nextIndex]] || CH2_MODULE_NAMES[nextIndex]} →
                        </button>
                    `}
                </div>
            `;
            activeModule.insertAdjacentHTML('beforeend', nextBtnHTML);

            // 若 ch2 综合测试已完成则直接显示「本章完成」按钮
            if (isLast && typeof window.checkQuizCompleted === 'function') {
                window.checkQuizCompleted('ch2', function(completed) {
                    if (completed && typeof window.revealChapterComplete === 'function') window.revealChapterComplete();
                });
            }
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 暗色主题：处理新渲染内容的内联样式
    setTimeout(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) applyThemeToChapterContent(true);
        shuffleDebugButtons();
        shuffleQuizOptions();
        if (moduleId === 'ch2_test') {
            setTimeout(function() { initChapterQuiz('ch2'); }, 100);
        }
    }, 80);
}
