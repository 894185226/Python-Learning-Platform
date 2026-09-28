// ===== PythonVariableLesson - api.js (API 通信与 WebSocket 模块) =====
(function() {
    'use strict';

    // ===== 全局加载指示器 =====
    let loadingCount = 0;
    function showLoading() {
        loadingCount++;
        if (loadingCount === 1) {
            const loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = '<div class="loader-spinner"></div><p style="color:#fff;margin-top:10px;font-size:12px;">加载中...</p>';
            loader.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99998;background:rgba(0,0,0,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;';
            document.body.appendChild(loader);
        }
    }
    function hideLoading() {
        loadingCount = Math.max(0, loadingCount - 1);
        if (loadingCount === 0) {
            const loader = document.getElementById('global-loader');
            if (loader) loader.remove();
        }
    }

    const API = {
        _csrfToken: null,
        _sessionToken: sessionStorage.getItem('pv_session_token') || '',

        async _fetch(url, options) {
            options = options || {};
            showLoading();
            try {
                const headers = {};
                const optHeaders = options.headers || {};
                for (let k in optHeaders) {
                    if (optHeaders.hasOwnProperty(k)) headers[k] = optHeaders[k];
                }
                if (['POST', 'PUT', 'DELETE'].indexOf(options.method || 'GET') !== -1) {
                    if (!this._csrfToken) {
                        await this._fetchCsrfToken();
                    }
                    if (this._csrfToken) {
                        headers['X-CSRF-Token'] = this._csrfToken;
                    }
                }
                if (this._sessionToken) {
                    headers['X-Session-Token'] = this._sessionToken;
                }
                const controller = new AbortController();
                const timeout = setTimeout(function() { controller.abort(); }, 15000);
                const res = await fetch(url, { method: options.method, headers: headers, body: options.body, signal: controller.signal });
                clearTimeout(timeout);
                if (!res.ok) {
                    if (res.status === 401) {
                        // 单设备登录：会话被清除说明账号已在其他设备登录，清除本地登录状态
                        if (this._sessionToken) {
                            window.showError('您的账号已在其他设备登录，当前设备已退出登录', 'auth');
                            this._sessionToken = '';
                            this._csrfToken = null;
                            sessionStorage.removeItem('pv_session_token');
                            try {
                                if (typeof window.setCurrentUser === 'function') window.setCurrentUser(null);
                                if (typeof window.disconnectWebSocket === 'function') window.disconnectWebSocket();
                                if (typeof window.updateLoginUI === 'function') window.updateLoginUI();
                            } catch (e) { /* 清理登录状态失败不影响主流程 */ }
                        } else {
                            window.showError('登录已过期，请重新登录', 'auth');
                        }
                    } else if (res.status === 500) {
                        window.showError('服务器繁忙，请稍后重试', 'server');
                    } else if (res.status === 429) {
                        window.showError('操作过于频繁，请稍后再试', 'validation');
                    }
                    throw new Error('服务器错误 (' + res.status + ')');
                }
                const text = await res.text();
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error('服务器返回格式错误');
                }
            } catch (e) {
                if (e.name === 'TypeError' && e.message.indexOf('fetch') !== -1) {
                    window.showError('网络连接失败，请检查网络后重试', 'network');
                    return { success: false, error: '网络不可用' };
                }
                if (e.name === 'AbortError') {
                    return { success: false, error: '请求超时' };
                }
                return { success: false, error: e.message || '未知错误' };
            } finally {
                hideLoading();
            }
        },

        async _fetchCsrfToken() {
            try {
                const headers = {};
                if (this._sessionToken) {
                    headers['X-Session-Token'] = this._sessionToken;
                }
                const res = await fetch('/api/csrf-token', { headers: headers });
                const data = await res.json();
                if (data.token) {
                    this._csrfToken = data.token;
                }
            } catch (e) {
                // CSRF Token 获取失败不影响主流程
            }
        },

        async register(username, password, displayName, grade, classNum) {
            return await this._fetch(window.API_BASE + '/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password, displayName: displayName, grade: grade, classNum: classNum })
            });
        },
        async login(username, password) {
            return await this._fetch(window.API_BASE + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
        },
        async adminLogin(username, password) {
            return await this._fetch(window.API_BASE + '/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
        },
        async getProgress(username) {
            return await this._fetch(window.API_BASE + '/progress/' + encodeURIComponent(username));
        },
        async markModuleCompleted(username, moduleId, score) {
            return await this._fetch(window.API_BASE + '/progress/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, moduleId: moduleId, score: score })
            });
        },
        async awardAchievement(username, achievementId) {
            return await this._fetch(window.API_BASE + '/achievement/award', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, achievementId: achievementId })
            });
        },
        async addMistake(username, chapterId, questionText, correctAnswer, studentAnswer) {
            return await this._fetch(window.API_BASE + '/mistakes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, chapterId: chapterId, questionText: questionText, correctAnswer: correctAnswer, studentAnswer: studentAnswer })
            });
        },
        async getMistakes(username) {
            return await this._fetch(window.API_BASE + '/mistakes/' + encodeURIComponent(username));
        },
        async deleteMistake(id, username) {
            return await this._fetch(window.API_BASE + '/mistakes/' + id, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });
        },
        async saveNote(username, chapterId, moduleId, content) {
            return await this._fetch(window.API_BASE + '/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, chapterId: chapterId, moduleId: moduleId, content: content })
            });
        },
        async getNotes(username, chapterId) {
            return await this._fetch(window.API_BASE + '/notes/' + encodeURIComponent(username) + '/' + encodeURIComponent(chapterId));
        },
        async updateNote(id, content) {
            return await this._fetch(window.API_BASE + '/notes/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content })
            });
        },
        async addSnippet(username, title, code, chapterId) {
            return await this._fetch(window.API_BASE + '/snippets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, title: title, code: code, chapterId: chapterId })
            });
        },
        async getSnippets(username) {
            return await this._fetch(window.API_BASE + '/snippets/' + encodeURIComponent(username));
        },
        async deleteSnippet(id, username) {
            return await this._fetch(window.API_BASE + '/snippets/' + id, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });
        },
        async getLeaderboard(grade, classNum) {
            let url = window.API_BASE + '/leaderboard?';
            if (grade) url += 'grade=' + encodeURIComponent(grade) + '&';
            if (classNum) url += 'classNum=' + encodeURIComponent(classNum);
            return await this._fetch(url);
        },
        async getLeaderboardClasses(grade) {
            let url = window.API_BASE + '/leaderboard/classes?';
            if (grade) url += 'grade=' + encodeURIComponent(grade);
            return await this._fetch(url);
        },
        async getChapterLocks(grade, classNum) {
            let url = window.API_BASE + '/chapter-locks?';
            if (grade) url += 'grade=' + encodeURIComponent(grade) + '&';
            if (classNum) url += 'classNum=' + encodeURIComponent(classNum);
            return await this._fetch(url);
        },
        async getReport(username) {
            return await this._fetch(window.API_BASE + '/report/' + encodeURIComponent(username));
        },
        async getNotifications(username) {
            return await this._fetch(window.API_BASE + '/notifications/' + encodeURIComponent(username));
        },
        async markNotificationRead(id) {
            return await this._fetch(window.API_BASE + '/notifications/' + id + '/read', { method: 'PUT' });
        },
        async setGoal(username, goalText, targetChapters, startDate, endDate) {
            return await this._fetch(window.API_BASE + '/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, goalText: goalText, targetChapters: targetChapters, startDate: startDate, endDate: endDate })
            });
        },
        async getGoals(username) {
            return await this._fetch(window.API_BASE + '/goals/' + encodeURIComponent(username));
        },
        async getDiscussions(chapterId) {
            let url = window.API_BASE + '/discussions?';
            if (chapterId) url += 'chapterId=' + encodeURIComponent(chapterId);
            return await this._fetch(url);
        },
        async createDiscussion(username, title, content, chapterId) {
            return await this._fetch(window.API_BASE + '/discussions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, title: title, content: content, chapterId: chapterId })
            });
        },
        async getDiscussionDetail(id) {
            return await this._fetch(window.API_BASE + '/discussions/' + id);
        },
        async createReply(discussionId, username, content) {
            return await this._fetch(window.API_BASE + '/discussions/' + discussionId + '/replies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, content: content })
            });
        },
        async getDailyQuestion(date) {
            let url = window.API_BASE + '/daily-question?';
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
            window.log.warn('localStorage 存储失败，可能已满');
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
            window.log.warn('localStorage 存储失败');
        }
    }

    // 登录时将本地进度同步到后端
    async function syncLocalProgressToBackend(username) {
        const localProgress = getLocalProgress();
        const localAchievements = getLocalAchievements();
        const modules = Object.keys(localProgress.modules);

        if (modules.length === 0 && Object.keys(localAchievements).length === 0) return;

        window.log.log('正在同步 ' + modules.length + ' 个模块进度到服务器...');

        for (let i = 0; i < modules.length; i++) {
            try {
                await API.markModuleCompleted(username, modules[i]);
            } catch (e) {
                window.log.warn('同步模块 ' + modules[i] + ' 失败:', e.message);
            }
        }

        const achIds = Object.keys(localAchievements);
        for (let j = 0; j < achIds.length; j++) {
            try {
                await API.awardAchievement(username, achIds[j]);
            } catch (e) {
                window.log.warn('同步成就 ' + achIds[j] + ' 失败:', e.message);
            }
        }

        try {
            localStorage.removeItem(LOCAL_PROGRESS_KEY);
            localStorage.removeItem(LOCAL_ACHIEVEMENTS_KEY);
        } catch (e) {
            window.log.warn('清除本地缓存失败');
        }
    }

    // 会话管理
    function getCurrentUser() {
        const data = sessionStorage.getItem('pv_current_user');
        return data ? JSON.parse(data) : null;
    }
    function setCurrentUser(user) {
        if (user) {
            sessionStorage.setItem('pv_current_user', JSON.stringify(user));
            connectWebSocket();
        } else {
            sessionStorage.removeItem('pv_current_user');
            disconnectWebSocket();
        }
    }

    // ===================================================
    // WebSocket 实时通知客户端
    // ===================================================
    let wsConnection = null;
    let wsReconnectTimer = null;
    let wsReconnectAttempts = 0;
    const WS_MAX_RECONNECT = 10;

    function connectWebSocket() {
        const user = getCurrentUser();
        if (!user || !user.username) return;
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) return;

        if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = protocol + '//' + window.location.host;

        try {
            wsConnection = new WebSocket(wsUrl);
        } catch (e) {
            console.warn('[WS] 连接失败:', e.message);
            scheduleReconnect();
            return;
        }

        wsConnection.onopen = function() {
            console.log('[WS] ✅ 已连接到服务器');
            wsReconnectAttempts = 0;
            const token = API._sessionToken;
            wsConnection.send(JSON.stringify({
                type: 'auth',
                token: token
            }));
        };

        wsConnection.onmessage = function(event) {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'notification') {
                    handleWebSocketNotification(msg.data);
                } else if (msg.type === 'announcement') {
                    window.showToast(msg.data.title || '新公告', 'info');
                    handleWebSocketNotification(msg.data);
                }
            } catch (e) { window.log.warn('[WS] 关闭WebSocket失败:', e.message); }
        };

        wsConnection.onclose = function(event) {
            console.log('[WS] 已断开, code:', event.code, 'reason:', event.reason || '(无)');
            wsConnection = null;
            if (event.code !== 1000 && event.code !== 4001) {
                scheduleReconnect();
            }
        };

        wsConnection.onerror = function() {
            // onclose 会随后触发
        };
    }

    function disconnectWebSocket() {
        if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
        wsReconnectAttempts = WS_MAX_RECONNECT;
        if (wsConnection) {
            wsConnection.close(1000, '用户登出');
            wsConnection = null;
        }
    }

    function scheduleReconnect() {
        if (wsReconnectAttempts >= WS_MAX_RECONNECT) return;
        wsReconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
        console.log('[WS] ' + (delay / 1000) + 's 后重连 (第' + wsReconnectAttempts + '次)');
        wsReconnectTimer = setTimeout(connectWebSocket, delay);
    }

    function handleWebSocketNotification(data) {
        const badge = document.getElementById('notificationBadge');
        if (badge && data.is_read === 0) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + 1;
            badge.style.display = 'flex';
        }
        const body = document.getElementById('notificationPanelBody');
        if (body && document.getElementById('notificationPanel') && document.getElementById('notificationPanel').style.display !== 'none') {
            if (typeof fetchNotifications === 'function') {
                fetchNotifications();
            }
        }
        if (data.title) {
            let toastType = 'info';
            if (data.type === 'achievement') toastType = 'success';
            else if (data.type === 'warning') toastType = 'warning';
            else if (data.type === 'error') toastType = 'error';
            window.showToast(data.title, toastType);
        }
    }

    // 页面加载时自动连接（如果已登录）
    if (getCurrentUser()) {
        connectWebSocket();
    }

    // 暴露到全局
    window.API = API;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.getLocalProgress = getLocalProgress;
    window.saveLocalProgress = saveLocalProgress;
    window.getLocalAchievements = getLocalAchievements;
    window.saveLocalAchievement = saveLocalAchievement;
    window.syncLocalProgressToBackend = syncLocalProgressToBackend;
    window.getCurrentUser = getCurrentUser;
    window.setCurrentUser = setCurrentUser;
    window.connectWebSocket = connectWebSocket;
    window.disconnectWebSocket = disconnectWebSocket;
    window.wsConnection = wsConnection;
    window.wsReconnectTimer = wsReconnectTimer;

})();