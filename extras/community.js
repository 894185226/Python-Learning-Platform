// ===== 讨论区 + 每日一题 + 语音朗读（从 script-extras.js 拆分） =====
// 依赖：script.js 核心函数；recordMistake（在 extras/study.js）；DISCUSSION_CHAPTER_OPTIONS（在 extras/interaction.js）

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

    // 讨论区状态（总开关 / 个人封禁）
    const banner = document.getElementById('discussionStatusBanner');
    const postBtn = document.getElementById('discussionPostBtn');
    const formWrap = document.getElementById('discussionFormWrap');
    try {
        const status = await API.getDiscussionStatus();
        const globalClosed = (status && status.enabled === false);
        const banned = (status && status.banned);
        if (banner) {
            banner.style.display = 'none';
            if (globalClosed) {
                banner.style.display = 'block';
                banner.innerHTML = '🚫 讨论区已被老师暂时关闭，无法发帖和回复';
            } else if (banned) {
                banner.style.display = 'block';
                banner.innerHTML = '🔒 你已被暂停讨论区使用权，如有疑问请联系老师';
            }
        }
        const disabled = globalClosed || banned;
        if (postBtn) postBtn.style.display = disabled ? 'none' : '';
        if (formWrap && disabled) formWrap.style.display = 'none';
    } catch (e) { /* 状态获取失败时保持默认 */ }

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
                    ${d.chapter_id ? `<span class="discussion-chapter-tag">${escHtml(chapterDisplayName(d.chapter_id))}</span>` : ''}
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
                    ${d.chapter_id ? `<span class="discussion-chapter-tag">${escHtml(chapterDisplayName(d.chapter_id))}</span>` : ''}
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
//   每日一题（独立模块 + 强制弹窗 + 历史复习）
// ================================================================
let _curDailyQ = null; // 当前渲染的每日一题（用于做错时记录到错题本）

function _dqParseOptions(q) {
    try { return typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []); }
    catch (e) { return []; }
}

function _dqOptionsHtml(q, questionId, inModal) {
    return _dqParseOptions(q).map((opt, i) =>
        `<button class="daily-option-btn" onclick="submitDailyAnswer(${questionId}, ${i}, this, ${inModal ? 'true' : 'false'})" data-index="${i}">
            ${String.fromCharCode(65 + i)}. ${escHtml(opt)}
        </button>`).join('');
}

function _dqCardHtml(q, questionId, inModal) {
    const feedbackId = inModal ? 'dailyModalFeedback' : 'dailyFeedback';
    return `
        <div class="daily-question-card ${inModal ? 'dq-no-border' : ''}">
            <div class="daily-question-header">
                <h3>📅 每日一题</h3>
                <span class="daily-question-date">${escHtml(String(q.question_date || '').slice(0, 10))}</span>
            </div>
            <div class="daily-question-body">
                <p class="daily-question-text">${escHtml(q.question)}</p>
                <div class="daily-question-options">${_dqOptionsHtml(q, questionId, inModal)}</div>
                <div class="daily-question-feedback" id="${feedbackId}" style="display:none"></div>
            </div>
        </div>`;
}

async function renderDailyQuestionModule() {
    const container = document.getElementById('dailyQuestionContent');
    if (!container) return;
    const currentUser = getCurrentUser();
    if (!currentUser) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">🔒 请先<a href="javascript:void(0)" onclick="openLoginModal()">登录</a>后查看每日一题</p>';
        return;
    }
    try {
        const status = await API.getDailyQuestionStatus();
        const q = status.question;
        _curDailyQ = q;
        if (!q) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:24px 40px 8px;">📭 老师还没发布每日一题，先去学习吧！</p>';
        } else {
            container.innerHTML = _dqCardHtml(q, q.id, false);
        }
        container.insertAdjacentHTML('beforeend', '<h3 style="margin:28px 0 4px;">📚 历史题目</h3><div id="dqHistoryArea"><p style="color:var(--text-secondary);">加载中...</p></div>');
        await renderDailyQuestionHistory();
    } catch (e) {
        container.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px;">加载每日一题失败</p>';
    }
}

async function renderDailyQuestionHistory() {
    const area = document.getElementById('dqHistoryArea');
    if (!area) return;
    try {
        const data = await API.getDailyQuestionHistory();
        const list = data.questions || [];
        if (list.length === 0) {
            area.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">暂无历史题目</p>';
            return;
        }
        area.innerHTML = list.map(it => {
            const options = _dqParseOptions(it);
            const state = it.answered_at ? (it.is_correct ? '✅ 已答对' : '❌ 已答错') : '⏳ 未答';
            const correctLetter = String(it.answer || '').toUpperCase();
            return `<div class="dq-history-item">
                <div class="dq-history-question">${escHtml(it.question)}</div>
                <div class="dq-history-options">${options.map((o, i) => '<span>' + String.fromCharCode(65 + i) + '. ' + escHtml(o) + '</span>').join('　')}</div>
                <div class="dq-history-meta">
                    <span>📅 ${escHtml(String(it.question_date || '').slice(0, 10))}</span>
                    <span class="dq-history-state">${state}</span>
                    <span>正确答案：${escHtml(correctLetter)}</span>
                    ${it.explanation ? '<span class="dq-history-exp">💡 ' + escHtml(it.explanation) + '</span>' : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        area.innerHTML = '<p style="text-align:center;color:#e74c3c;">加载历史题目失败</p>';
    }
}

function showDailyQuestionModal(q) {
    _curDailyQ = q;
    const overlay = document.getElementById('dailyQuestionOverlay');
    const box = document.getElementById('dailyQuestionModalBox');
    if (!overlay || !box) return;
    box.innerHTML = _dqCardHtml(q, q.id, true);
    overlay.style.display = 'flex';
}

function closeDailyQuestionModal() {
    const overlay = document.getElementById('dailyQuestionOverlay');
    if (overlay) overlay.style.display = 'none';
}

// 页面加载 / 登录后检查：若最新一题未作答则弹出强制弹窗
async function checkDailyQuestionStatus() {
    if (!getCurrentUser()) return;
    try {
        const status = await API.getDailyQuestionStatus();
        if (status && status.question && !status.answered) {
            showDailyQuestionModal(status.question);
        }
    } catch (e) { /* 忽略状态获取失败 */ }
}

// WebSocket 推送：教师发布后立即弹出（由 js/api.js 调用）
async function showDailyQuestionPopup() {
    if (!getCurrentUser()) return;
    try {
        const status = await API.getDailyQuestionStatus();
        if (status && status.question && !status.answered) {
            showDailyQuestionModal(status.question);
        }
    } catch (e) { /* 忽略 */ }
}

// 提交答案（模块内 与 强制弹窗 共用）
async function submitDailyAnswer(questionId, answerIndex, btn, inModal) {
    const feedbackId = inModal ? 'dailyModalFeedback' : 'dailyFeedback';
    const feedback = document.getElementById(feedbackId);
    const scope = btn ? btn.parentElement : document;
    const buttons = scope.querySelectorAll('.daily-option-btn');
    buttons.forEach(b => b.disabled = true);

    try {
        const data = await API.answerDailyQuestion(questionId, answerIndex);
        if (!data.success) {
            if (feedback) { feedback.style.display = 'block'; feedback.innerHTML = '提交失败，请重试'; feedback.className = 'daily-question-feedback wrong'; }
            return;
        }
        const correctIndex = data.correctIndex;
        const isCorrect = data.isCorrect;

        // 做错的题目记入错题本（仅首次作答时记录，避免重复）
        if (!isCorrect && data.isFirstTime && _curDailyQ) {
            const opts = _dqParseOptions(_curDailyQ);
            const cText = opts[correctIndex] || '';
            const aText = opts[answerIndex] || '';
            recordMistake('daily', _curDailyQ.question,
                String.fromCharCode(65 + correctIndex) + '. ' + cText,
                String.fromCharCode(65 + answerIndex) + '. ' + aText);
        }

        buttons.forEach(b => {
            const idx = parseInt(b.dataset.index);
            if (idx === correctIndex) b.classList.add('correct');
            else if (idx === answerIndex) b.classList.add('wrong');
        });
        if (feedback) {
            feedback.style.display = 'block';
            feedback.innerHTML = isCorrect ? '✅ 回答正确！太棒了！' : '❌ 回答错误，正确答案已标出。';
            feedback.className = 'daily-question-feedback ' + (isCorrect ? 'correct' : 'wrong');
        }
        if (inModal) {
            setTimeout(function() {
                closeDailyQuestionModal();
                if (typeof renderDailyQuestionModule === 'function') renderDailyQuestionModule();
            }, 1200);
        } else {
            setTimeout(function() { renderDailyQuestionModule(); }, 1200);
        }
    } catch (e) {
        if (feedback) { feedback.style.display = 'block'; feedback.innerHTML = '提交失败：' + e.message; feedback.className = 'daily-question-feedback wrong'; }
    }
}

// 暴露到全局
window.renderDailyQuestionModule = renderDailyQuestionModule;
window.showDailyQuestionPopup = showDailyQuestionPopup;
window.checkDailyQuestionStatus = checkDailyQuestionStatus;

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
