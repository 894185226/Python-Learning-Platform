// ===== 消息通知 + 学习目标 + 作业 + 讨论区章节常量（从 script-extras.js 拆分） =====
// 依赖：script.js 核心函数；chapterDisplayName（在 extras/study.js）

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

// ================================================================
//   新功能模块 - 作业
// ================================================================
// 截图保存教程：展开状态在重新渲染后保持不变
let screenshotGuideOpen = false;

function toggleScreenshotGuide() {
    screenshotGuideOpen = !screenshotGuideOpen;
    const body = document.getElementById('screenshotGuideBody');
    const arrow = document.getElementById('screenshotGuideArrow');
    if (body) body.style.display = screenshotGuideOpen ? 'block' : 'none';
    if (arrow) arrow.textContent = screenshotGuideOpen ? '收起 ▲' : '展开 ▼';
}

function screenshotGuideHTML() {
    // 键盘按键使用站点已有的 .kbd 样式（亮色/暗色主题均已适配）
    const kbd = function (key) {
        return '<kbd class="kbd">' + key + '</kbd>';
    };
    const li = function (text) {
        return '<li style="margin-bottom:6px;">' + text + '</li>';
    };
    const methodCard = function (title, desc, items) {
        return '<div style="background:var(--w3-white);border:1px solid var(--border-light);border-radius:10px;padding:14px 16px;margin-bottom:12px;">' +
            '<div style="font-weight:700;color:#04AA6D;font-size:15px;margin-bottom:4px;">' + title + '</div>' +
            (desc ? '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">' + desc + '</div>' : '') +
            '<ol style="margin:0;padding-left:22px;line-height:1.9;font-size:14px;color:var(--text-primary);">' + items + '</ol>' +
            '</div>';
    };

    const method1 = methodCard(
        '方法一：用「画图」保存截图（推荐，Win10 / Win11 都适用）',
        '画图是 Windows 自带的程序，不用安装任何软件。',
        li('先把要截图的画面显示在屏幕上，例如 Python 代码和运行结果。') +
        li('同时按下 ' + kbd('Win') + ' + ' + kbd('Shift') + ' + ' + kbd('S') + '，屏幕会变暗，顶部出现截图工具栏。') +
        li('按住鼠标左键框选要截取的区域，松开鼠标后，截图已自动复制到剪贴板（右下角会出现预览）。') +
        li('点击屏幕左下角的「开始」按钮（Windows 图标），输入「画图」，点击打开「画图」程序。') +
        li('在画图窗口中按 ' + kbd('Ctrl') + ' + ' + kbd('V') + ' 粘贴，截图就会出现在白色画布上。') +
        li('点击左上角「文件」→「另存为」→「PNG 图片」。') +
        li('在弹出的窗口中，左侧选择「桌面」，文件名填写「班级+姓名+作业名」（例如：七年级1班-张三-第1章作业），点击「保存」。') +
        li('回到本页面，点「交作业」→ 在「附件」处点击「选择文件」→ 选中桌面上刚保存的截图 → 点击「提交作业」。')
    );

    const method2 = methodCard(
        '方法二：用「画图 3D」保存截图（Windows 10）',
        '如果你的电脑是 Windows 11，可能找不到「画图 3D」，请使用方法一。',
        li('同样先按 ' + kbd('Win') + ' + ' + kbd('Shift') + ' + ' + kbd('S') + ' 框选并截取画面，截图会复制到剪贴板。') +
        li('点击「开始」按钮，输入「画图 3D」并打开程序。') +
        li('点击「新建」，在空白画布上按 ' + kbd('Ctrl') + ' + ' + kbd('V') + ' 粘贴截图。') +
        li('点击左上角「菜单」→「另存为」→「PNG 图片」。') +
        li('选择「桌面」，文件名填写「班级+姓名+作业名」，点击「保存」。') +
        li('回到作业页面，在「附件」中选择这张图片，然后点击「提交作业」。')
    );

    const tips = '<div style="background:rgba(4,170,109,0.08);border-left:4px solid #04AA6D;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.9;color:var(--text-primary);">' +
        '<div style="font-weight:700;color:#04AA6D;margin-bottom:4px;">💡 小贴士</div>' +
        '<div>① 想截整个屏幕：按 ' + kbd('Win') + ' + ' + kbd('PrtScn') + '，系统会自动保存到「此电脑 → 图片 → 屏幕截图」，可直接上传该图片，无需再用画图保存。</div>' +
        '<div>② 截图里要同时包含「代码」和「运行结果」，字迹清晰，否则老师无法批改。</div>' +
        '<div>③ 保存格式建议选 PNG，比 JPG 更清晰；保存后找不到文件，请到「桌面」查看。</div>' +
        '<div>④ 如果粘贴到画图后是空白，说明截图没有成功，请重新按 ' + kbd('Win') + ' + ' + kbd('Shift') + ' + ' + kbd('S') + ' 再截一次。</div>' +
        '</div>';

    return '<div style="border:1px solid rgba(4,170,109,0.35);border-radius:12px;background:rgba(4,170,109,0.05);margin-bottom:16px;overflow:hidden;">' +
        '<button type="button" onclick="toggleScreenshotGuide()" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;background:none;border:none;cursor:pointer;font-size:15px;font-weight:700;color:#04AA6D;text-align:left;font-family:inherit;">' +
        '<span>📸 不会把截图保存成图片？点这里查看详细操作步骤</span>' +
        '<span id="screenshotGuideArrow" style="font-size:12px;color:var(--text-secondary);white-space:nowrap;">' + (screenshotGuideOpen ? '收起 ▲' : '展开 ▼') + '</span>' +
        '</button>' +
        '<div id="screenshotGuideBody" style="display:' + (screenshotGuideOpen ? 'block' : 'none') + ';padding:0 16px 16px;">' +
        '<div style="font-size:13px;color:var(--text-secondary);line-height:1.8;margin-bottom:12px;">提交作业时如果要求上传截图，请先把画面截取下来并保存成图片文件（PNG / JPG），再通过下方作业的「附件」上传。下面以 Windows 自带的「画图」和「画图 3D」为例：</div>' +
        method1 + method2 + tips +
        '</div>' +
        '</div>';
}

async function renderAssignments() {
    const currentUser = getCurrentUser();
    const container = document.getElementById('assignmentsContent');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-secondary);"><p style="font-size:16px;margin-bottom:16px;">🔒 请先登录后查看作业</p><button class="form-submit-btn" onclick="openLoginModal()">登录</button></div>';
        return;
    }
    container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">加载中...</p>';
    try {
        const data = await API.getAssignments(currentUser.username);
        if (!data.success || !data.assignments || data.assignments.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-secondary);">📭 暂无作业，老师布置后会显示在这里。</div>';
            return;
        }
        container.innerHTML = screenshotGuideHTML() + '<div id="assignment-exemplary"></div>' + data.assignments.map(function (a) {
            const overdue = a.due_date && new Date(a.due_date) < new Date();
            const statusTag = overdue
                ? '<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:#666;color:#fff;font-size:12px;">已截止</span>'
                : '<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:#04AA6D;color:#fff;font-size:12px;">进行中</span>';
            const sub = a.submission;
            const returned = sub && sub.status === 'returned';
            const graded = sub && sub.score !== null && sub.score !== undefined;
            const exemplary = sub && sub.isExemplary;
            const subText = sub
                ? (returned
                    ? ('👀 已退回' + (sub.returnReason ? '（原因：' + sub.returnReason + '）' : '') + '，请修改后重新提交')
                    : (graded ? ('✅ 已提交（得分 ' + sub.score + '）') : '✅ 已提交，待批改') + (exemplary ? ' 🏆 优秀' : ''))
                : '⏳ 未提交';
            const feedbackText = sub && sub.feedback ? '<div style="margin-top:6px;color:#04AA6D;font-size:13px;">💬 老师评语：' + escHtml(sub.feedback) + '</div>' : '';
            const lateText = a.allow_late ? '<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:10px;background:#fff7ed;color:#ea580c;font-size:11px;">可补交</span>' : '';
            const chapterName = chapterDisplayName(a.chapter_id) || (a.chapter_id || '-');
            const dueText = a.due_date ? new Date(a.due_date).toLocaleString('zh-CN', { hour12: false }) : '未设置';
            const ft = a.file_type || 'any';
            const fileHint = ft === 'image' ? '📌 本作业要求提交图片（必填）：' : (ft === 'document' ? '📌 本作业要求提交文档（必填）：' : '📎 附件（图片或文件，可选）：');
            const fileAccept = ft === 'image' ? 'image/*' : (ft === 'document' ? '.pdf,.doc,.docx,.txt,.md,.zip,.rar,.7z,.xls,.xlsx,.ppt,.pptx,.csv' : 'image/*,.pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx');
            const ftBadge = ft === 'image' ? ' 🖼️仅图片' : (ft === 'document' ? ' 📄仅文档' : '');
            return '<div style="border:1px solid rgba(0,0,0,0.12);border-radius:12px;padding:16px;margin-bottom:16px;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
                '<span style="font-weight:700;font-size:16px;">📋 ' + escHtml(a.title || '未命名作业') + ' ' + statusTag + lateText + '</span>' +
                '<span style="font-size:12px;color:var(--text-secondary);">截止: ' + escHtml(dueText) + '</span>' +
                '</div>' +
                (a.description ? '<div style="margin-top:10px;color:var(--text-secondary);white-space:pre-wrap;">' + escHtml(a.description) + '</div>' : '') +
                '<div style="font-size:12px;color:var(--text-secondary);margin-top:10px;">关联章节: ' + escHtml(chapterName) + '　|　' + subText + ftBadge + '</div>' +
                feedbackText +
                ((!sub || returned)
                    ? '<div style="margin-top:12px;"><button class="form-submit-btn" onclick="toggleAssignmentForm(' + a.id + ')">📝 ' + (returned ? '修改并重新提交' : '交作业') + '</button></div>'
                    : '') +
                ((sub && !graded && !returned)
                    ? '<div style="margin-top:8px;"><button class="form-cancel-btn" onclick="withdrawAssignment(' + a.id + ')">↩️ 撤回作业（重新提交）</button></div>'
                    : '') +
                '<div id="assignment-form-' + a.id + '" style="display:none;margin-top:12px;">' +
                '<textarea id="assignment-content-' + a.id + '" class="form-input" rows="5" placeholder="在这里输入你的作业内容…（可只上传文件不填文字）" maxlength="10000"></textarea>' +
                '<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);">' + fileHint + '</div>' +
                '<input type="file" id="assignment-file-' + a.id + '" class="form-input" style="margin-top:4px;" accept="' + fileAccept + '" data-ft="' + ft + '">' +
                '<div style="margin-top:8px;"><button class="form-submit-btn" onclick="submitAssignmentForm(' + a.id + ')">提交作业</button> <button class="form-cancel-btn" onclick="toggleAssignmentForm(' + a.id + ')">取消</button></div>' +
                '</div>' +
                '</div>';
        }).join('');
        loadExemplaryShowcase();
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">⚠️ 加载失败: ' + escHtml(e.message || '请重试') + '</div>';
    }
}

function toggleAssignmentForm(id) {
    const f = document.getElementById('assignment-form-' + id);
    if (f) f.style.display = (f.style.display === 'none' || f.style.display === '') ? 'block' : 'none';
}

async function withdrawAssignment(id) {
    if (!confirm('确认撤回该作业吗？撤回后可重新提交。')) return;
    try {
        const data = await API.withdrawAssignment(id);
        if (data.success) {
            alert('✅ 已撤回，可重新提交');
            renderAssignments();
        } else {
            alert('撤回失败: ' + (data.error || '请重试'));
        }
    } catch (e) { alert('撤回失败: ' + e.message); }
}

function isImageName(name) {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name || '');
}

async function loadExemplaryShowcase() {
    const box = document.getElementById('assignment-exemplary');
    if (!box) return;
    try {
        const data = await API.getExemplary();
        if (!data.success || !data.exemplary || data.exemplary.length === 0) { box.innerHTML = ''; return; }
        box.innerHTML = '<div style="border:1px solid rgba(245,158,11,0.4);border-radius:12px;padding:16px;background:rgba(245,158,11,0.06);margin-bottom:16px;">' +
            '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">🏆 本班优秀作业展示</div>' +
            data.exemplary.map(function(e) {
                return '<div style="padding:10px;border-left:3px solid #f59e0b;margin-bottom:10px;background:#fff;border-radius:8px;">' +
                    '<div style="font-size:13px;font-weight:600;">' + escHtml(e.assignment_title || '作业') + ' — ' + escHtml(e.display_name || '') + (e.score !== null && e.score !== undefined ? '（' + e.score + '分）' : '') + '</div>' +
                    '<div style="font-size:13px;color:var(--text-secondary);margin-top:4px;white-space:pre-wrap;">' + escHtml(e.content || '') + '</div>' +
                    (isImageName(e.file_original_name) && e.file_name ? '<img src="/uploads/' + encodeURIComponent(e.file_name) + '" style="max-width:140px;max-height:140px;border-radius:6px;margin-top:6px;cursor:pointer;" onclick="window.open(\'/uploads/' + encodeURIComponent(e.file_name) + '\')">' : (e.file_name ? '<div style="margin-top:6px;"><a href="/uploads/' + encodeURIComponent(e.file_name) + '" target="_blank" style="color:#04AA6D;">📎 ' + escHtml(e.file_original_name || '附件') + '</a></div>' : '')) +
                    '</div>';
            }).join('') + '</div>';
    } catch (e) { /* 静默处理 */ }
}

async function submitAssignmentForm(id) {
    const ta = document.getElementById('assignment-content-' + id);
    const fileInput = document.getElementById('assignment-file-' + id);
    const currentUser = getCurrentUser();
    if (!currentUser) { alert('请先登录'); return; }
    const content = ta ? ta.value.trim() : '';

    let fileData = null, fileName = null;
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 6 * 1024 * 1024) { alert('文件过大（最大约6MB）'); return; }
        fileName = file.name;
        try { fileData = await readFileAsDataURL(file); } catch (e) { alert('读取文件失败，请重试'); return; }
    }

    if (!content && !fileData) { alert('请填写作业内容或上传文件'); return; }

    // 客户端预校验文件格式要求
    const ft = fileInput ? (fileInput.getAttribute('data-ft') || 'any') : 'any';
    if (ft === 'image' || ft === 'document') {
        if (!fileData) {
            alert(ft === 'image' ? '本作业要求提交图片文件，请上传图片' : '本作业要求提交文档文件，请上传文档');
            return;
        }
        const ext = (fileName || '').toLowerCase().split('.').pop();
        const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        const DOC_EXTS = ['pdf', 'doc', 'docx', 'txt', 'md', 'zip', 'rar', '7z', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'];
        if (ft === 'image') {
            if (!(fileInput.files[0] && fileInput.files[0].type.startsWith('image/')) && !IMAGE_EXTS.includes(ext)) {
                alert('提交文件必须是图片格式（jpg/png/gif/webp/bmp）');
                return;
            }
        } else if (!DOC_EXTS.includes(ext)) {
            alert('提交文件必须是文档格式（pdf/word/txt/zip等）');
            return;
        }
    }

    try {
        const data = await API.submitAssignment(id, currentUser.username, content, fileData, fileName);
        if (data.success) {
            alert('✅ 作业提交成功！');
            renderAssignments();
        } else {
            alert('提交失败: ' + (data.error || '请重试'));
        }
    } catch (e) {
        alert('提交失败: ' + e.message);
    }
}

function readFileAsDataURL(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = function() { reject(new Error('读取文件失败')); };
        reader.readAsDataURL(file);
    });
}
