// ===== 扩展功能模块 =====
// 此文件包含排行榜、错题本、学习报告、学习日历、笔记、代码收藏、消息通知、
// 学习目标、讨论区、每日一题、语音朗读等扩展功能
// 依赖：script.js 中的核心函数（getCurrentUser, getLocalProgress, getLocalAchievements,
//       API, showToast, escHtml, currentChapter, currentChapterModule 等）

console.log('%c[script-extras.js] 文件已加载', 'color:#04AA6D;font-weight:bold');

// ================================================================
//   新功能模块 - 学习排行榜
// ================================================================
// 动态填充班级筛选下拉（根据所选年级加载对应班级）
async function populateLeaderboardClassFilter() {
    const sel = document.getElementById('lbClassFilter');
    if (!sel) return;
    const grade = document.getElementById('lbGradeFilter')?.value || '';
    const previous = sel.value;
    try {
        const data = await API.getLeaderboardClasses(grade);
        const classes = (data.success && Array.isArray(data.classes)) ? data.classes : [];
        sel.innerHTML = '<option value="">全部班级</option>' +
            classes.map(c => `<option value="${c}">${c}班</option>`).join('');
        // 若之前选中的班级仍在新列表中，则保留原选择
        if (previous && classes.some(c => String(c) === previous)) {
            sel.value = previous;
        }
    } catch (e) {
        sel.innerHTML = '<option value="">全部班级</option>';
    }
}

// 年级切换：先刷新班级选项，再刷新排行榜
async function onLeaderboardGradeChange() {
    await populateLeaderboardClassFilter();
    renderLeaderboard();
}

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

    // 首次进入排行榜时动态填充班级筛选
    const classFilter = document.getElementById('lbClassFilter');
    if (classFilter && classFilter.options.length <= 1) {
        await populateLeaderboardClassFilter();
    }

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
    } catch (e) { log.warn('[extras] 目标保存失败:', e.message); }
}

async function markNotificationRead(id) {
    try {
        await API.markNotificationRead(id);
        fetchNotifications();
    } catch (e) { log.warn('[extras] 笔记加载失败:', e.message); }
}

function initNotificationPolling() {
    fetchNotifications();
    // WebSocket 实时推送为主，轮询作为降级兜底（每5分钟一次）
    setInterval(fetchNotifications, 300000);
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
// 全 19 章章节选项（与 constants.js CHAPTER_NAMES 保持一致）
const DISCUSSION_CHAPTER_OPTIONS = [
    { id: 'ch1', name: '第1章 认识Python' }, { id: 'ch2', name: '第2章 变量' }, { id: 'ch3', name: '第3章 变量类型' },
    { id: 'ch4', name: '第4章 条件判断' }, { id: 'ch5', name: '第5章 if进阶' }, { id: 'ch6', name: '第6章 while循环' },
    { id: 'ch7', name: '第7章 while拓展' }, { id: 'ch8', name: '第8章 循环嵌套' }, { id: 'ch9', name: '第9章 综合应用一' },
    { id: 'ch10', name: '第10章 排列小星星' }, { id: 'ch11', name: '第11章 初识列表' }, { id: 'ch12', name: '第12章 列表的使用' },
    { id: 'ch13', name: '第13章 元组与集合' }, { id: 'ch14', name: '第14章 神奇的字典' }, { id: 'ch15', name: '第15章 再遇字符串' },
    { id: 'ch16', name: '第16章 公共语法' }, { id: 'ch17', name: '第17章 轻松搞定二进制' }, { id: 'ch18', name: '第18章 编程思维实践' },
    { id: 'ch19', name: '第19章 各种各样的数' }
];

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
        filter.innerHTML = '<option value="">全部章节</option>' +
            DISCUSSION_CHAPTER_OPTIONS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // 初始化发帖章节下拉
    const postChapterSelect = document.getElementById('postChapterId');
    if (postChapterSelect && postChapterSelect.options.length <= 1) {
        postChapterSelect.innerHTML = '<option value="">不关联章节</option>' +
            DISCUSSION_CHAPTER_OPTIONS.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
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

// ================================================================
//   DOM 就绪后初始化扩展功能
//   （script-extras.js 在 script.js 之后加载，DOM 通常已就绪）
// ================================================================
function initExtras() {
    initNotificationPolling();
    renderDailyQuestion();
    renderStudyCalendar('calendarGrid');
    updateStudyStreak();
    initNotePanelObserver();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtras);
} else {
    initExtras();
}
