// ===== PythonVariableLesson - auth.js (用户认证模块) =====
(function() {
    'use strict';

    // 受保护的模块（需要登录才能访问）
    const PROTECTED_MODULES = (typeof VALID_MODULES !== 'undefined' ? VALID_MODULES : [
        'ch2_intro', 'ch2_lesson', 'ch2_judge', 'ch2_debug', 'ch2_practice', 'ch2_trace', 'ch2_lab', 'ch2_extend', 'ch2_project', 'ch2_test',
        'chapter_ch1', 'chapter_ch2', 'chapter_ch3', 'chapter_ch4', 'chapter_ch5',
        'chapter_ch6', 'chapter_ch7', 'chapter_ch8', 'chapter_ch9', 'chapter_ch10',
        'chapter_ch11', 'chapter_ch12', 'chapter_ch13', 'chapter_ch14', 'chapter_ch15',
        'chapter_ch16', 'chapter_ch17', 'chapter_ch18', 'chapter_ch19',
        'ch1_intro', 'ch1_knowledge', 'ch1_lab', 'ch1_practice', 'ch1_debug', 'ch1_quiz',
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
        'leaderboard', 'mistakes', 'report', 'snippets', 'goals', 'discussion'
    ]);

    let pendingModuleId = null;
    let pendingChapterId = null;

    // ===== 用户认证系统 =====
    function openLoginModal() {
        const currentUser = window.getCurrentUser();
        if (currentUser) {
            window.showConfirm(
                '退出登录',
                currentUser.displayName + '，确定要退出登录吗？',
                '👋',
                '退出',
                function() {
                    window.setCurrentUser(null);
                    sessionStorage.removeItem('pv_session_token');
                    window.API._sessionToken = '';
                    window.API._csrfToken = null;
                    window.disconnectWebSocket();
                    updateLoginUI();
                    window.showToast('已退出登录', 'info');
                    location.reload();
                }
            );
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
        document.getElementById('resetPasswordModal').style.display = 'none';
        pendingModuleId = null;
        pendingChapterId = null;
    }

    function openResetPasswordModal() {
        document.getElementById('resetPasswordModal').style.display = 'block';
        document.getElementById('resetUsername').value = '';
        document.getElementById('resetDisplayName').value = '';
        document.getElementById('resetNewPassword').value = '';
        document.getElementById('resetPasswordError').classList.add('w3-hide');
        document.getElementById('resetPasswordSuccess').classList.add('w3-hide');
    }

    function closeResetPasswordModal() {
        document.getElementById('resetPasswordModal').style.display = 'none';
    }

    async function handleResetPassword(event) {
        const errorEl = document.getElementById('resetPasswordError');
        const successEl = document.getElementById('resetPasswordSuccess');
        errorEl.classList.add('w3-hide');
        successEl.classList.add('w3-hide');

        const username = document.getElementById('resetUsername').value.trim();
        const displayName = document.getElementById('resetDisplayName').value.trim();
        const newPassword = document.getElementById('resetNewPassword').value;

        if (!username || !displayName || !newPassword) {
            errorEl.textContent = '请填写所有字段';
            errorEl.classList.remove('w3-hide');
            return;
        }

        if (newPassword.length < 6) {
            errorEl.textContent = '新密码至少6位';
            errorEl.classList.remove('w3-hide');
            return;
        }
        if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
            errorEl.textContent = '密码必须包含字母和数字';
            errorEl.classList.remove('w3-hide');
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '重置中...';

        try {
            const resp = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, displayName: displayName, newPassword: newPassword })
            });
            const data = await resp.json();

            if (data.success) {
                successEl.textContent = data.message;
                successEl.classList.remove('w3-hide');
                setTimeout(function() {
                    closeResetPasswordModal();
                    openLoginModal();
                }, 3000);
            } else {
                errorEl.textContent = data.error;
                errorEl.classList.remove('w3-hide');
            }
        } catch (e) {
            errorEl.textContent = '网络错误，请稍后重试';
            errorEl.classList.remove('w3-hide');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '重置密码';
        }
    }

    // ESC 键关闭弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
            if (typeof window.closeMobileMenu === 'function') window.closeMobileMenu();
        }
    });

    // 登录表单处理
    async function handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const errorEl = document.getElementById('loginError');
        const submitBtn = document.querySelector('#loginForm .form-submit-btn');

        window.setButtonLoading(submitBtn, true);

        const isAdmin = username.toLowerCase() === 'admin';

        let result;
        try {
            result = isAdmin ? await window.API.adminLogin(username, password) : await window.API.login(username, password);
        } catch (e) {
            errorEl.textContent = e.message || '网络错误，请稍后重试';
            errorEl.classList.remove('w3-hide');
            window.setButtonLoading(submitBtn, false);
            return false;
        }
        window.setButtonLoading(submitBtn, false);

        if (!result.success) {
            errorEl.textContent = result.error;
            errorEl.classList.remove('w3-hide');
            return false;
        }

        if (isAdmin) {
            sessionStorage.setItem('pv_admin_user', JSON.stringify(result.user));
            sessionStorage.setItem('pv_admin_token', result.token);
            window.location.href = 'admin.html';
            return false;
        }

        window.setCurrentUser(result.user);

        if (result.token) {
            sessionStorage.setItem('pv_session_token', result.token);
            window.API._sessionToken = result.token;
        }
        if (result.csrfToken) {
            window.API._csrfToken = result.csrfToken;
        }

        const pendingChapter = pendingChapterId;
        const pendingModule = pendingModuleId;

        closeLoginModal();
        window.showLoginWelcome(result.user);
        updateLoginUI();
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        errorEl.classList.add('w3-hide');

        await window.syncLocalProgressToBackend(result.user.username);

        if (typeof window.renderAchievementWall === 'function') window.renderAchievementWall();

        if (pendingChapter) {
            window.switchChapter(pendingChapter);
            if (pendingModule && pendingModule !== pendingChapter) {
                setTimeout(function() { window.switchChapterModule(pendingChapter, pendingModule, 0); }, 200);
            }
        } else if (pendingModule) {
            window.switchModule(pendingModule);
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
        if (password.length < 6) {
            errorEl.textContent = '密码至少需要6个字符！';
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

        window.setButtonLoading(submitBtn, true);
        let result;
        try {
            result = await window.API.register(username, password, displayName, grade, classNum);
        } catch (e) {
            errorEl.textContent = e.message || '网络错误，请稍后重试';
            errorEl.classList.remove('w3-hide');
            window.setButtonLoading(submitBtn, false);
            return false;
        }
        window.setButtonLoading(submitBtn, false);

        if (!result.success) {
            errorEl.textContent = result.error;
            errorEl.classList.remove('w3-hide');
            return false;
        }

        window.setCurrentUser(result.user || { username: username, displayName: displayName, grade: grade, classNum: classNum });
        if (result.token) {
            sessionStorage.setItem('pv_session_token', result.token);
            window.API._sessionToken = result.token;
        }
        if (result.csrfToken) {
            window.API._csrfToken = result.csrfToken;
        }

        const pendingChapter = pendingChapterId;
        const pendingModule = pendingModuleId;

        closeRegisterModal();
        updateLoginUI();
        document.getElementById('regUsername').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regDisplayName').value = '';
        document.getElementById('regGrade').value = '';
        document.getElementById('regClassNum').value = '';
        if (typeof window.renderAchievementWall === 'function') window.renderAchievementWall();

        if (pendingChapter) {
            window.switchChapter(pendingChapter);
            if (pendingModule && pendingModule !== pendingChapter) {
                setTimeout(function() { window.switchChapterModule(pendingChapter, pendingModule, 0); }, 200);
            }
        } else if (pendingModule) {
            window.switchModule(pendingModule);
        }

        return false;
    }

    // 个人信息编辑弹窗
    function showProfileEditor() {
        var user = window.getCurrentUser();
        if (!user) return;

        var modal = document.createElement('div');
        modal.className = 'w3-modal';
        modal.style.display = 'block';
        modal.id = 'profileEditorModal';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

        modal.innerHTML = '<div class="w3-modal-content w3-animate-zoom w3-card-4" style="max-width:450px;border-radius:12px;">' +
            '<div class="w3-bar" style="background:#04AA6D;border-radius:12px 12px 0 0;">' +
            '<span class="w3-bar-item w3-large">👤 编辑个人信息</span>' +
            '<button class="w3-bar-item w3-button w3-right w3-hover-red" onclick="document.getElementById(\'profileEditorModal\').remove()">✕</button>' +
            '</div>' +
            '<div class="w3-container w3-padding-24">' +
            '<form id="profileForm" onsubmit="saveProfile(event); return false;">' +
            '<div class="form-group">' +
            '<label>用户名（不可修改）</label>' +
            '<input type="text" value="' + user.username + '" disabled class="form-input" style="background:#f5f5f5;">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>显示名称</label>' +
            '<input type="text" id="profileDisplayName" value="' + (user.displayName || '') + '" class="form-input" required maxlength="50">' +
            '</div>' +
            '<div class="form-group">' +
            '<label>年级</label>' +
            '<select id="profileGrade" class="form-input">' +
            '<option value="七年级"' + (user.grade === '七年级' ? ' selected' : '') + '>七年级</option>' +
            '<option value="八年级"' + (user.grade === '八年级' ? ' selected' : '') + '>八年级</option>' +
            '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>班级</label>' +
            '<input type="number" id="profileClassNum" value="' + (user.classNum || 1) + '" class="form-input" min="1" max="20" required>' +
            '</div>' +
            '<div id="profileError" class="form-error w3-hide"></div>' +
            '<div id="profileSuccess" class="form-success w3-hide"></div>' +
            '<button type="submit" class="form-submit-btn">💾 保存修改</button>' +
            '</form>' +
            '</div></div>';
        document.body.appendChild(modal);
    }

    async function saveProfile(event) {
        var errorEl = document.getElementById('profileError');
        var successEl = document.getElementById('profileSuccess');
        errorEl.classList.add('w3-hide');
        successEl.classList.add('w3-hide');

        var displayName = document.getElementById('profileDisplayName').value.trim();
        var grade = document.getElementById('profileGrade').value;
        var classNum = parseInt(document.getElementById('profileClassNum').value);

        if (!displayName) { errorEl.textContent = '显示名称不能为空'; errorEl.classList.remove('w3-hide'); return; }
        if (isNaN(classNum) || classNum < 1 || classNum > 20) { errorEl.textContent = '班级范围为1-20'; errorEl.classList.remove('w3-hide'); return; }

        var btn = event.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '保存中...';

        try {
            var data = await window.API._fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: displayName, grade: grade, classNum: classNum })
            });
            if (data.success) {
                successEl.textContent = '个人信息更新成功！';
                successEl.classList.remove('w3-hide');
                // 更新本地用户信息
                var currentUser = window.getCurrentUser();
                if (currentUser) {
                    currentUser.displayName = displayName;
                    currentUser.grade = grade;
                    currentUser.classNum = classNum;
                    window.setCurrentUser(currentUser);
                }
                updateLoginUI();
                setTimeout(function() { document.getElementById('profileEditorModal').remove(); }, 2000);
            } else {
                errorEl.textContent = data.error;
                errorEl.classList.remove('w3-hide');
            }
        } catch (e) {
            errorEl.textContent = '网络错误，请稍后重试';
            errorEl.classList.remove('w3-hide');
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 保存修改';
        }
    }

    // 检查管理员是否允许学生自行编辑资料
    async function checkProfileEditEnabled() {
        var profileBtn = document.getElementById('profileEditBtn');
        if (!profileBtn) return;
        try {
            var data = await window.API._fetch('/api/profile-edit-enabled');
            profileBtn.style.display = (data && data.enabled !== false) ? '' : 'none';
        } catch (e) {
            profileBtn.style.display = '';
        }
    }

    // 加载当前学生的章节锁定状态（供 switchChapter 拦截）
    async function loadChapterLocks() {
        var currentUser = window.getCurrentUser();
        if (!currentUser) return;
        try {
            var data = await window.API.getChapterLocks(currentUser.grade, currentUser.classNum);
            window.lockedChapters = (data && data.success && data.lockedChapters) ? data.lockedChapters : {};
        } catch (e) {
            window.lockedChapters = {};
        }
    }

    function updateLoginUI() {
        var currentUser = window.getCurrentUser();
        var btnText = document.getElementById('loginBtnText');
        var btn = document.querySelector('.signin-btn');
        var profileBtn = document.getElementById('profileEditBtn');

        if (currentUser) {
            btnText.textContent = currentUser.displayName;
            btn.classList.add('logged-in');
            btn.title = '点击退出登录';
            if (profileBtn) profileBtn.style.display = '';
            checkProfileEditEnabled();
            loadChapterLocks();
        } else {
            btnText.textContent = '登录';
            btn.classList.remove('logged-in');
            btn.title = '';
            if (profileBtn) profileBtn.style.display = 'none';
        }

        var mobileBtn = document.getElementById('mobileLoginBtnText');
        if (mobileBtn) {
            mobileBtn.textContent = btnText.textContent;
        }
    }

    // 暴露到全局
    window.PROTECTED_MODULES = PROTECTED_MODULES;
    window.pendingModuleId = pendingModuleId;
    window.pendingChapterId = pendingChapterId;
    window.openLoginModal = openLoginModal;
    window.closeLoginModal = closeLoginModal;
    window.openRegisterModal = openRegisterModal;
    window.closeRegisterModal = closeRegisterModal;
    window.closeAllModals = closeAllModals;
    window.openResetPasswordModal = openResetPasswordModal;
    window.closeResetPasswordModal = closeResetPasswordModal;
    window.handleResetPassword = handleResetPassword;
    window.handleLogin = handleLogin;
    window.handleRegister = handleRegister;
    window.updateLoginUI = updateLoginUI;
    window.checkProfileEditEnabled = checkProfileEditEnabled;
    window.loadChapterLocks = loadChapterLocks;
    window.showProfileEditor = showProfileEditor;
    window.saveProfile = saveProfile;

})();