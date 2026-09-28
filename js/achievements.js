// ===== PythonVariableLesson - achievements.js (成就系统模块) =====
(function() {
    'use strict';

    // 成就定义 - 基于19章Python学习平台
    const ACHIEVEMENTS = [
        { id: 'ch1_done', icon: '🐍', name: 'Python初识', desc: '完成第1章：认识Python', check: function(p) { return p.chapters && p.chapters['ch1']; } },
        { id: 'ch2_done', icon: '📦', name: '变量大师', desc: '完成第2章：变量', check: function(p) { return p.chapters && p.chapters['ch2']; } },
        { id: 'ch3_done', icon: '📊', name: '类型专家', desc: '完成第3章：变量类型', check: function(p) { return p.chapters && p.chapters['ch3']; } },
        { id: 'ch4_done', icon: '🔀', name: '判断达人', desc: '完成第4章：条件判断', check: function(p) { return p.chapters && p.chapters['ch4']; } },
        { id: 'ch5_done', icon: '🔗', name: '逻辑高手', desc: '完成第5章：if进阶', check: function(p) { return p.chapters && p.chapters['ch5']; } },
        { id: 'ch6_done', icon: '🔄', name: '循环入门', desc: '完成第6章：while循环', check: function(p) { return p.chapters && p.chapters['ch6']; } },
        { id: 'ch7_done', icon: '⏭️', name: '控制大师', desc: '完成第7章：while拓展', check: function(p) { return p.chapters && p.chapters['ch7']; } },
        { id: 'ch8_done', icon: '🔁', name: '嵌套高手', desc: '完成第8章：循环嵌套', check: function(p) { return p.chapters && p.chapters['ch8']; } },
        { id: 'ch9_done', icon: '🧮', name: '综合应用', desc: '完成第9章：综合应用一', check: function(p) { return p.chapters && p.chapters['ch9']; } },
        { id: 'ch10_done', icon: '⭐', name: '星星画家', desc: '完成第10章：排列小星星', check: function(p) { return p.chapters && p.chapters['ch10']; } },
        { id: 'ch11_done', icon: '📋', name: '列表新手', desc: '完成第11章：初识列表', check: function(p) { return p.chapters && p.chapters['ch11']; } },
        { id: 'ch12_done', icon: '📝', name: '列表达人', desc: '完成第12章：列表的使用', check: function(p) { return p.chapters && p.chapters['ch12']; } },
        { id: 'ch13_done', icon: '🔒', name: '集合探索者', desc: '完成第13章：元组与集合', check: function(p) { return p.chapters && p.chapters['ch13']; } },
        { id: 'ch14_done', icon: '📖', name: '字典大师', desc: '完成第14章：神奇的字典', check: function(p) { return p.chapters && p.chapters['ch14']; } },
        { id: 'ch15_done', icon: '✂️', name: '字符串达人', desc: '完成第15章：再遇字符串', check: function(p) { return p.chapters && p.chapters['ch15']; } },
        { id: 'ch16_done', icon: '🧰', name: '语法通才', desc: '完成第16章：公共语法', check: function(p) { return p.chapters && p.chapters['ch16']; } },
        { id: 'ch17_done', icon: '💡', name: '二进制解码', desc: '完成第17章：轻松搞定二进制', check: function(p) { return p.chapters && p.chapters['ch17']; } },
        { id: 'ch18_done', icon: '🧠', name: '思维达人', desc: '完成第18章：编程思维实践', check: function(p) { return p.chapters && p.chapters['ch18']; } },
        { id: 'ch19_done', icon: '🔢', name: '数字专家', desc: '完成第19章：各种各样的数', check: function(p) { return p.chapters && p.chapters['ch19']; } },
        { id: 'milestone_beginner', icon: '🚀', name: '入门先锋', desc: '完成入门基础（第1-3章）', check: function(p) { return p.chapters && ['ch1','ch2','ch3'].every(function(c) { return p.chapters[c]; }); } },
        { id: 'milestone_flow', icon: '🔀', name: '控制流大师', desc: '完成控制流程（第4-8章）', check: function(p) { return p.chapters && ['ch4','ch5','ch6','ch7','ch8'].every(function(c) { return p.chapters[c]; }); } },
        { id: 'milestone_data', icon: '📋', name: '数据结构达人', desc: '完成数据结构（第11-15章）', check: function(p) { return p.chapters && ['ch11','ch12','ch13','ch14','ch15'].every(function(c) { return p.chapters[c]; }); } },
        { id: 'milestone_advance', icon: '💡', name: '拓展探索者', desc: '完成进阶拓展（第16-19章）', check: function(p) { return p.chapters && ['ch16','ch17','ch18','ch19'].every(function(c) { return p.chapters[c]; }); } },
        { id: 'champion', icon: '👑', name: '全能学霸', desc: '完成全部19个章节', check: function(p) { return p.chapters && Object.keys(p.chapters).length >= 19; } }
    ];

    function escHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    // ===== 成就弹出提示 =====
    function showAchievementToast(achievement) {
        const container = document.getElementById('achievementToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = '<div class="achievement-toast-icon">' + achievement.icon + '</div><div class="achievement-toast-body"><div class="achievement-toast-title">🏆 成就达成</div><div class="achievement-toast-name">' + achievement.name + '</div><div class="achievement-toast-desc">' + achievement.desc + '</div></div>';

        container.appendChild(toast);

        setTimeout(function() {
            toast.classList.add('removing');
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400);
        }, 2500);
    }

    // ===== 学习进度追踪 =====
    async function markModuleCompleted(moduleId) {
        const currentUser = window.getCurrentUser();

        if (currentUser) {
            try {
                await window.API.markModuleCompleted(currentUser.username, moduleId);
            } catch (e) {
                window.log.error('保存进度失败，将存入本地:', e.message);
                saveLocalModule(moduleId);
            }

            try {
                const newAch = await checkAndAwardAchievements(currentUser.username);
                if (newAch.length > 0) {
                    window.log.log('新成就：', newAch);
                    newAch.forEach(function(ach) { showAchievementToast(ach); });
                }
            } catch (e) {
                window.log.error('检查成就失败:', e.message);
            }
        } else {
            saveLocalModule(moduleId);
            checkLocalAchievements();
        }
    }

    function saveLocalModule(moduleId) {
        const progress = window.getLocalProgress();
        if (!progress.modules[moduleId]) {
            progress.modules[moduleId] = true;
            if (progress.loginDates.indexOf(new Date().toLocaleDateString('zh-CN')) === -1) {
                progress.loginDates.push(new Date().toLocaleDateString('zh-CN'));
            }
            window.saveLocalProgress(progress);
        }
    }

    function checkLocalAchievements() {
        const progress = window.getLocalProgress();
        const earned = window.getLocalAchievements();
        let hasNew = false;

        const checkProgress = {
            chapters: progress.chapters || {},
            modules: progress.modules || {}
        };

        ACHIEVEMENTS.forEach(function(ach) {
            if (!earned[ach.id] && ach.check(checkProgress)) {
                window.saveLocalAchievement(ach.id);
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
            let progress = await window.API.getProgress(username);
            if (!progress.success) {
                window.log.warn('获取进度失败:', progress.error);
                return [];
            }
            if (!progress.achievements) progress.achievements = {};
            if (!progress.modules) progress.modules = {};
            if (!progress.chapters) progress.chapters = {};
            if (Object.keys(progress.chapters).length === 0) {
                const chapterData = localStorage.getItem('pv_chapter_progress');
                progress.chapters = chapterData ? JSON.parse(chapterData) : {};
            }
            const newAchievements = [];

            for (let i = 0; i < ACHIEVEMENTS.length; i++) {
                const ach = ACHIEVEMENTS[i];
                if (ach.check(progress)) {
                    if (!progress.achievements[ach.id]) {
                        try {
                            await window.API.awardAchievement(username, ach.id);
                            newAchievements.push(ach);
                        } catch (e) {
                            window.log.warn('颁发成就 ' + ach.id + ' 失败:', e.message);
                        }
                    }
                }
            }

            return newAchievements;
        } catch (e) {
            window.log.error('检查成就失败:', e.message);
            return [];
        }
    }

    // ===== 加载公告 =====
    async function loadNotices() {
        try {
            const data = await window.API._fetch('/api/notices');
            const board = document.getElementById('noticeBoard');
            const content = document.getElementById('noticeBoardContent');
            if (!board || !content) return;
            if (!data.success || !data.notices || data.notices.length === 0) {
                board.style.display = 'none';
                return;
            }
            board.style.display = 'block';
            content.innerHTML = data.notices.map(function(n) {
                return '<div class="notice-card"><div class="notice-card-header"><strong>' + escHtml(n.title) + '</strong><span class="notice-card-time">' + new Date(n.created_at).toLocaleDateString('zh-CN') + '</span></div><div class="notice-card-body">' + escHtml(n.content) + '</div></div>';
            }).join('');
        } catch (e) { window.log.warn('[UI] 更新成就弹窗失败:', e.message); }
    }

    // ===== 成就墙渲染 =====
    async function renderAchievementWall() {
        loadNotices();
        const currentUser = window.getCurrentUser();
        const userNameEl = document.getElementById('achievementUserName');
        const mapGrid = document.getElementById('mapGrid');
        const progressSummary = document.getElementById('progressSummary');
        const progressBar = document.getElementById('progressBar');
        const achievementList = document.getElementById('achievementList');
        const learningStats = document.getElementById('learningStats');

        let progress;

        if (!currentUser) {
            progress = window.getLocalProgress();
            const achievements = window.getLocalAchievements();

            if (userNameEl) userNameEl.textContent = '未登录 - 进度已本地保存，登录后可同步！';

            updateMapGrid(progress);

            const completedCount = Object.keys(progress.chapters || {}).length;
            const totalChapters = 19;
            const percent = Math.round((completedCount / totalChapters) * 100);

            if (progressSummary) {
                progressSummary.textContent = '总进度：' + completedCount + '/' + totalChapters + ' 章节完成 (' + percent + '%)';
            }
            if (progressBar) {
                progressBar.style.width = percent + '%';
                progressBar.textContent = percent + '%';
            }
            updateProgressDonut(completedCount, totalChapters, percent);

            if (achievementList) {
                achievementList.innerHTML = ACHIEVEMENTS.map(function(ach) {
                    const earned = !!achievements[ach.id];
                    const dateStr = earned ? new Date(achievements[ach.id]).toLocaleDateString('zh-CN') : '';
                    return '<div class="achievement-item ' + (earned ? 'earned' : 'locked') + '"><span class="ach-icon">' + ach.icon + '</span><div class="ach-info"><h4>' + ach.icon + ' ' + ach.name + '</h4><p>' + ach.desc + '</p></div>' + (earned ? '<span class="achievement-date">' + dateStr + '</span>' : '<span class="achievement-date">未获得</span>') + '</div>';
                }).join('');
            }

            if (learningStats) {
                learningStats.style.display = 'block';
                document.getElementById('statCompleted').textContent = completedCount;
                document.getElementById('statAchievements').textContent = Object.keys(achievements).length;
                document.getElementById('statDays').textContent = progress.loginDates.length;
            }
            return;
        }

        try {
            progress = await window.API.getProgress(currentUser.username);
            if (!progress.success) {
                window.log.warn('获取进度失败:', progress.error);
                if (achievementList) achievementList.innerHTML = '<p style="text-align:center;color:#999;">无法连接服务器，请检查网络</p>';
                return;
            }
            if (!progress.achievements) progress.achievements = {};
            if (!progress.modules) progress.modules = {};
            if (!progress.chapters) progress.chapters = {};
            if (!progress.loginDates) progress.loginDates = [];
        } catch (e) {
            window.log.error('获取进度失败:', e.message);
            if (achievementList) achievementList.innerHTML = '<p style="text-align:center;color:#999;">无法连接服务器，请检查网络</p>';
            return;
        }

        if (userNameEl) {
            userNameEl.textContent = currentUser.displayName + ' 的学习成果';
        }

        updateMapGrid(progress);

        const completedCount = Object.keys(progress.chapters || {}).length;
        const totalChapters = 19;
        const percent = Math.round((completedCount / totalChapters) * 100);

        if (progressSummary) {
            progressSummary.textContent = '总进度：' + completedCount + '/' + totalChapters + ' 章节完成 (' + percent + '%)';
        }
        if (progressBar) {
            progressBar.style.width = percent + '%';
            progressBar.textContent = percent + '%';
        }
        updateProgressDonut(completedCount, totalChapters, percent);

        if (achievementList) {
            achievementList.innerHTML = ACHIEVEMENTS.map(function(ach) {
                const earnedDate = progress.achievements[ach.id];
                const earned = !!earnedDate;
                const dateStr = earnedDate ? new Date(earnedDate).toLocaleDateString('zh-CN') : '';
                return '<div class="achievement-item ' + (earned ? 'earned' : 'locked') + '"><span class="ach-icon">' + ach.icon + '</span><div class="ach-info"><h4>' + ach.icon + ' ' + ach.name + '</h4><p>' + ach.desc + '</p></div>' + (earned ? '<span class="achievement-date">' + dateStr + '</span>' : '<span class="achievement-date">未获得</span>') + '</div>';
            }).join('');
        }

        if (learningStats) {
            learningStats.style.display = 'block';
            document.getElementById('statCompleted').textContent = completedCount;
            document.getElementById('statAchievements').textContent = Object.keys(progress.achievements).length;
            document.getElementById('statDays').textContent = progress.loginDates.length;
        }
    }

    function updateProgressDonut(completed, total, percent) {
        const donut = document.getElementById('progressDonut');
        const percentEl = document.getElementById('progressPercent');
        const fractionEl = document.getElementById('progressFraction');
        if (!donut || !percentEl || !fractionEl) return;
        const circumference = 314;
        const dashLength = (percent / 100) * circumference;
        donut.setAttribute('stroke-dasharray', dashLength + ' ' + (circumference - dashLength));
        percentEl.textContent = percent + '%';
        fractionEl.textContent = completed + '/' + total;
    }

    function updateMapGrid(progress) {
        const mapItems = document.querySelectorAll('.map-item[data-chapter-id]');
        if (!mapItems.length) return;

        const chapters = (progress && progress.chapters) ? progress.chapters : {};

        mapItems.forEach(function(item) {
            const chapterId = item.getAttribute('data-chapter-id');
            if (chapters[chapterId]) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }
        });
    }

    // 暴露到全局
    window.ACHIEVEMENTS = ACHIEVEMENTS;
    window.escHtml = escHtml;
    window.showAchievementToast = showAchievementToast;
    window.markModuleCompleted = markModuleCompleted;
    window.saveLocalModule = saveLocalModule;
    window.checkLocalAchievements = checkLocalAchievements;
    window.checkAndAwardAchievements = checkAndAwardAchievements;
    window.loadNotices = loadNotices;
    window.renderAchievementWall = renderAchievementWall;
    window.updateProgressDonut = updateProgressDonut;
    window.updateMapGrid = updateMapGrid;

})();