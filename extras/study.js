// ===== 错题本 + 学习报告 + 学习日历 + 笔记 + 代码收藏（从 script-extras.js 拆分） =====
// 依赖：script.js 核心函数；chapterDisplayName 引用 DISCUSSION_CHAPTER_OPTIONS（在 extras/interaction.js）

// ================================================================
//   新功能模块 - 错题本
// ================================================================
// 章节 ID → 中文名（支持 'ch1' 与 'chapter_ch1' 两种格式）
function chapterDisplayName(chapterId) {
    if (!chapterId) return '';
    const id = String(chapterId).replace('chapter_', '');
    if (id === 'daily') return '每日一题';
    const opt = DISCUSSION_CHAPTER_OPTIONS.find(o => o.id === id);
    return opt ? opt.name : chapterId;
}

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
                chapters.map(c => `<option value="${escHtml(c)}">${escHtml(chapterDisplayName(c))}</option>`).join('');
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
                <h4 class="mistake-group-title">${escHtml(chapterDisplayName(chapterId))} (${items.length}题)</h4>
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
    showConfirm('删除错题', '确定要删除这条错题记录吗？', '🗑️', '删除', async function() {
        try {
            const currentUser = getCurrentUser();
            await API.deleteMistake(id, currentUser?.username || '');
            renderMistakeBook();
        } catch (e) {
            showToast('删除失败: ' + e.message, 'error');
        }
    });
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
                        <strong>${escHtml(chapterDisplayName(c.moduleId))}</strong>
                        <span>${c.completedAt ? new Date(c.completedAt).toLocaleDateString('zh-CN') : '未完成'}</span>
                    </div>
                </div>
            `).join('');
        }

        // 强项/弱项
        const strong = document.getElementById('strongChapters');
        const weak = document.getElementById('weakChapters');
        if (strong) strong.innerHTML = report.strengths?.length ? report.strengths.map(c => `<span class="tag tag-green">${escHtml(chapterDisplayName(c))}</span>`).join('') : '<p class="text-muted">完成更多测验来发现你的强项</p>';
        if (weak) weak.innerHTML = report.weaknesses?.length ? report.weaknesses.map(c => `<span class="tag tag-red">${escHtml(chapterDisplayName(c))}</span>`).join('') : '<p class="text-muted">错题较多的章节会显示在这里</p>';

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
        } catch (e) { log.warn('[extras] 笔记加载失败:', e.message); }
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
                    <span class="snippet-chapter">${escHtml(chapterDisplayName(s.chapter_id))}</span>
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

// 收藏当前章节「实践操作」编辑器里的代码
function collectPracticeCode(chapterNum) {
    let code = '';
    if (chapterNum === 2) {
        // 第2章变量模块使用独立的 CodeMirror 实例 #code-input
        const cm = window._cmInstances && window._cmInstances['code-input'];
        if (cm) {
            code = cm.getValue();
        } else {
            const fb = document.getElementById('code-input-fallback');
            code = fb ? fb.value : '';
        }
    } else {
        const codeEl = document.getElementById('ch' + chapterNum + '-practice-code');
        if (!codeEl) { showToast('未找到代码编辑器', 'error'); return; }
        code = (typeof getPracticeCode === 'function') ? getPracticeCode(codeEl) : codeEl.value;
    }
    code = String(code || '').trim();
    if (!code.replace(/\s/g, '')) { showToast('没有可收藏的代码', 'error'); return; }
    saveSnippet('第' + chapterNum + '章 练习代码', code, 'ch' + chapterNum);
}

async function deleteSnippetItem(id) {
    showConfirm('删除收藏', '确定要删除这个收藏吗？', '🗑️', '删除', async function() {
        try {
            const currentUser = getCurrentUser();
            await API.deleteSnippet(id, currentUser?.username || '');
            renderSnippets();
        } catch (e) {
            showToast('删除失败: ' + e.message, 'error');
        }
    });
}
