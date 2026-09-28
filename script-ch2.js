// ===== 第2章（变量）交互模块 =====
// 此文件包含第2章变量章节的专属函数
// 依赖：script.js 中的核心函数（showSidebarToggle, toggleSidebar, updateSidebarActive,
//       stickyChapterNav, switchModule, markChapterCompleted, applyThemeToChapterContent 等）
// 依赖：chapter-interactions.js 中的 shuffleDebugButtons, shuffleQuizOptions

console.log('%c[script-ch2.js] 文件已加载', 'color:#04AA6D;font-weight:bold');

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
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_intro')">🎬 情境导入</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_lab')">🧪 类比实验室</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_lesson')">📚 知识讲解</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_judge')">⚖️ 命名小法官</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_practice')">💻 实践操作</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_trace')">🔍 值追踪挑战</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_debug')">🏥 调试诊所</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_extend')">🚀 扩展思维</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_project')">🎨 创意项目</button>
            <button class="mod-nav-btn" onclick="startVariableModule('ch2_test')">📝 课堂小测</button>
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
    const moduleNames = ['ch2_intro', 'ch2_lab', 'ch2_lesson', 'ch2_judge', 'ch2_practice', 'ch2_trace', 'ch2_debug', 'ch2_extend', 'ch2_project', 'ch2_test'];
    if (nav) {
        nav.querySelectorAll('.mod-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', moduleNames[i] === moduleId);
        });
    }

    currentChapter = 'ch2';
    currentChapterModule = moduleId;

    // 使用原有的switchModule函数，保留所有事件处理器
    switchModule(moduleId);

    // 添加下一页按钮到当前激活的模块底部（情境导入页不显示"下一页"按钮）
    const currentIndex = moduleNames.indexOf(moduleId);
    const nextIndex = currentIndex + 1;
    const isLast = nextIndex >= moduleNames.length;

    if (moduleId !== 'ch2_intro') {
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
