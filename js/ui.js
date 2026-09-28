// ===== PythonVariableLesson - ui.js (UI 交互模块) =====
(function() {
    'use strict';

    // ===================================================
    // 通用确认弹窗（替代原生 confirm）
    // ===================================================
    let confirmCallback = null;

    function showConfirm(title, message, icon, btnText, callback) {
        document.getElementById('confirmTitle').textContent = title || '确认操作';
        document.getElementById('confirmMessage').textContent = message || '确定要执行此操作吗？';
        document.getElementById('confirmIcon').textContent = icon || '⚠️';
        const okBtn = document.getElementById('confirmOkBtn');
        okBtn.textContent = btnText || '确定';
        confirmCallback = callback;
        document.getElementById('confirmModal').style.display = 'block';
        setTimeout(function() { okBtn.focus(); }, 100);
    }

    function closeConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        confirmCallback = null;
    }

    document.addEventListener('DOMContentLoaded', function() {
        const okBtn = document.getElementById('confirmOkBtn');
        if (okBtn) {
            okBtn.addEventListener('click', function() {
                const cb = confirmCallback;
                closeConfirmModal();
                if (typeof cb === 'function') cb();
            });
        }
    });

    // ===================================================
    // Toast 通知（非阻塞消息提示）
    // ===================================================
    function showToast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;

        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = 'toast-item toast-' + type;
        toast.innerHTML = '<span>' + (icons[type] || '') + ' ' + message + '</span><span class="toast-close">&times;</span>';

        toast.addEventListener('click', function() { removeToast(toast); });

        container.appendChild(toast);

        const timer = setTimeout(function() { removeToast(toast); }, duration);
        toast._timer = timer;
    }

    function removeToast(toast) {
        if (toast._removing) return;
        toast._removing = true;
        clearTimeout(toast._timer);
        toast.classList.add('toast-removing');
        toast.addEventListener('animationend', function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 350);
    }

    // 检查跨文件依赖
    window._startupCheck = function() {
        window.log.log('%c--- 跨文件依赖检查 ---', 'color:#667eea;font-weight:bold');
        window.log.log('[依赖] CHAPTERS 是否加载:', typeof CHAPTERS !== 'undefined' ? '✅ (' + CHAPTERS.length + ' 章)' : '❌ 未加载');
        window.log.log('[依赖] MODULE_NAMES 是否加载:', typeof MODULE_NAMES !== 'undefined' ? '✅' : '❌ 未加载');
        window.log.log('[依赖] VALID_MODULES 是否加载:', typeof VALID_MODULES !== 'undefined' ? '✅' : '❌ 未加载');
        window.log.log('[依赖] CH2_MODULE_IDS:', typeof CH2_MODULE_IDS !== 'undefined' ? '✅ [' + CH2_MODULE_IDS.join(',') + ']' : '❌');
        window.log.log('[依赖] startVariableModule:', typeof startVariableModule !== 'undefined' ? '✅ (script-ch2.js)' : '⏳ 尚未加载');
        window.log.log('[依赖] fetchNotifications:', typeof fetchNotifications !== 'undefined' ? '✅ (script-extras.js)' : '⏳ 尚未加载');
        window.log.log('[依赖] initNotificationPolling:', typeof initNotificationPolling !== 'undefined' ? '✅ (script-extras.js)' : '⏳ 尚未加载');
        window.log.log('%c--- 依赖检查完成 ---', 'color:#667eea;font-weight:bold');
    };

    let dbReady = false;
    window.dbReady = dbReady;

    let chaptersContentLoaded = false;
    let chaptersContentLoading = false;
    window.chaptersContentLoaded = chaptersContentLoaded;
    window.chaptersContentLoading = chaptersContentLoading;

    function loadChaptersContent() {
        if (chaptersContentLoaded || chaptersContentLoading) return;
        chaptersContentLoading = true;
        const script = document.createElement('script');
        script.src = 'chapters-content.js';
        script.onload = function() {
            chaptersContentLoaded = true;
            chaptersContentLoading = false;
            window.log.log('[ui.js] chapters-content.js 异步加载完成');
        };
        script.onerror = function() {
            chaptersContentLoading = false;
            console.error('[ui.js] chapters-content.js 加载失败，3秒后重试...');
            setTimeout(function() { loadChaptersContent(); }, 3000);
        };
        document.head.appendChild(script);
        window.log.log('[ui.js] 开始异步加载 chapters-content.js...');
    }

    async function checkDBStatus() {
        try {
            const res = await fetch(window.API_BASE + '/status');
            const data = await res.json();
            dbReady = data.dbReady;
            window.dbReady = dbReady;
            if (!dbReady) {
                showOfflineWarning();
            }
        } catch (e) {
            dbReady = false;
            window.dbReady = false;
            showOfflineWarning();
        }
    }

    function showOfflineWarning() {
        const existing = document.getElementById('offline-warning');
        if (existing) return;

        const warning = document.createElement('div');
        warning.id = 'offline-warning';
        warning.style.cssText = 'position: fixed; top: 60px; left: 0; right: 0; z-index: 1000; background: #ff9800; color: white; padding: 12px; text-align: center; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
        warning.innerHTML = '<i class="fas fa-database"></i> <span>数据库未连接，学习进度无法保存。请启动 MySQL 服务后刷新页面。</span> <button onclick="this.parentElement.remove()" style="margin-left: 10px; padding: 4px 12px; border: none; border-radius: 4px; background: rgba(255,255,255,0.3); color: white; cursor: pointer;">关闭</button>';
        document.body.appendChild(warning);
    }

    // 登录成功欢迎动画
    function showLoginWelcome(user) {
        const overlay = document.createElement('div');
        overlay.className = 'login-welcome-overlay';
        overlay.innerHTML = '<div class="login-welcome-card"><div class="login-welcome-icon">👋</div><h2 class="login-welcome-title">欢迎回来！</h2><p class="login-welcome-name">' + (user.displayName || user.username) + '</p><p class="login-welcome-subtitle">正在为你加载学习内容...</p></div>';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function() {
            dismissWelcome(overlay);
        }, { once: true });

        const timer = setTimeout(function() {
            dismissWelcome(overlay);
        }, 2000);

        overlay._timer = timer;
    }

    function dismissWelcome(overlay) {
        if (overlay._dismissing) return;
        overlay._dismissing = true;
        if (overlay._timer) {
            clearTimeout(overlay._timer);
            overlay._timer = null;
        }
        overlay.classList.add('removing');
        setTimeout(function() {
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

    // 第2章(变量)子模块 ID 列表
    const CH2_MODULE_IDS = ['ch2_intro', 'ch2_lab', 'ch2_lesson', 'ch2_judge', 'ch2_practice', 'ch2_trace', 'ch2_debug', 'ch2_extend', 'ch2_project', 'ch2_test'];

    // 暗色主题切换
    const THEME_KEY = 'pv_theme';
    function initTheme() {
        window.log.log('[主题] 初始化主题，当前偏好:', localStorage.getItem(THEME_KEY) || '无(默认暗色)');
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeIcon(false);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon(true);
        }
        setTimeout(function() {
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

    function preprocessHTMLForDark(html) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (!isDark) return html;

        return html.replace(/style="([^"]*)"/gi, function(match, styleContent) {
            const original = styleContent;
            let s = styleContent;

            s = s.replace(/color:\s*#000000\b/gi, 'color:#e0e0e0');
            s = s.replace(/color:\s*#000\b/gi, 'color:#e0e0e0');
            s = s.replace(/color:\s*#333333\b/gi, 'color:#ddd');
            s = s.replace(/color:\s*#333\b/gi, 'color:#ddd');
            s = s.replace(/color:\s*#555\b/gi, 'color:#bbb');
            s = s.replace(/color:\s*#666\b/gi, 'color:#aaa');
            s = s.replace(/color:\s*#777\b/gi, 'color:#999');
            s = s.replace(/color:\s*#999999\b/gi, 'color:#888');
            s = s.replace(/color:\s*#999\b/gi, 'color:#888');
            s = s.replace(/color:\s*#aaa\b/gi, 'color:#999');
            s = s.replace(/color:\s*#ccc\b/gi, 'color:#aaa');
            s = s.replace(/color:\s*#7F7F7F\b/gi, 'color:#999');
            s = s.replace(/color:\s*#667eea\b/gi, 'color:#8ea0ff');
            s = s.replace(/color:\s*#ff9800\b/gi, 'color:#ffb74d');
            s = s.replace(/color:\s*#e91e63\b/gi, 'color:#f06292');
            s = s.replace(/color:\s*#1890ff\b/gi, 'color:#42a5f5');
            s = s.replace(/color:\s*#ff4d4f\b/gi, 'color:#ff6b6b');
            s = s.replace(/color:\s*#D73A49\b/gi, 'color:#ff6b6b');
            s = s.replace(/color:\s*#005CC5\b/gi, 'color:#569cd6');
            s = s.replace(/color:\s*#04AA6D\b/gi, 'color:#04AA6D');
            s = s.replace(/color:\s*#FFD700\b/gi, 'color:#FFD700');
            s = s.replace(/color:\s*#a6e22e\b/gi, 'color:#a6e22e');
            s = s.replace(/color:\s*#569cd6\b/gi, 'color:#569cd6');
            s = s.replace(/color:\s*#d4d4d4\b/gi, 'color:#d4d4d4');
            s = s.replace(/color:\s*#B5CEA8\b/gi, 'color:#B5CEA8');
            s = s.replace(/color:\s*#C586C0\b/gi, 'color:#C586C0');
            s = s.replace(/color:\s*#CE9178\b/gi, 'color:#CE9178');
            s = s.replace(/color:\s*#f92672\b/gi, 'color:#f92672');
            s = s.replace(/color:\s*#0a0\b/gi, 'color:#4ec94e');
            s = s.replace(/color:\s*#905\b/gi, 'color:#c586c0');
            s = s.replace(/color:\s*#005cc5\b/gi, 'color:#569cd6');
            s = s.replace(/color:\s*#d73a49\b/gi, 'color:#ff6b6b');
            s = s.replace(/color:\s*#fff\b/gi, 'color:#fff');
            s = s.replace(/color:\s*#ffffff\b/gi, 'color:#fff');

            s = s.replace(/background:\s*#fff\b/gi, 'background:#2d2d44');
            s = s.replace(/background:\s*#ffffff\b/gi, 'background:#2d2d44');
            s = s.replace(/background:\s*#f5f5f5\b/gi, 'background:#1a1a2e');
            s = s.replace(/background:\s*#fafafa\b/gi, 'background:#1a1a2e');
            s = s.replace(/background:\s*#D9EEE1\b/gi, 'background:#1a3a2a');
            s = s.replace(/background:\s*#FFF4A3\b/gi, 'background:#3a3520');
            s = s.replace(/background:\s*#FFC0C7\b/gi, 'background:#3a2028');
            s = s.replace(/background:\s*#96D4D4\b/gi, 'background:#1a3035');
            s = s.replace(/background:\s*#e0e0e0\b/gi, 'background:#3a3a4a');
            s = s.replace(/background:\s*#fff3f3\b/gi, 'background:#2a1a1a');
            s = s.replace(/background:\s*#282A35\b/gi, 'background:#282A35');
            s = s.replace(/background:\s*#1a1a2e\b/gi, 'background:#1a1a2e');
            s = s.replace(/background:\s*#0d0d1a\b/gi, 'background:#0d0d1a');
            s = s.replace(/background:\s*#1e1e1e\b/gi, 'background:#1e1e1e');
            s = s.replace(/background:\s*#0f0f1a\b/gi, 'background:#0f0f1a');
            s = s.replace(/background:\s*#16162a\b/gi, 'background:#16162a');
            s = s.replace(/background-color:\s*#D9EEE1\b/gi, 'background-color:#1a3a2a');
            s = s.replace(/background-color:\s*#FFF4A3\b/gi, 'background-color:#3a3520');
            s = s.replace(/background-color:\s*#FFC0C7\b/gi, 'background-color:#3a2028');
            s = s.replace(/background-color:\s*#96D4D4\b/gi, 'background-color:#1a3035');

            s = s.replace(/border:\s*2px solid #ff4d4f\b/gi, 'border:2px solid #ff6b6b');

            if (s !== original) {
                return 'style="' + s + '" data-original-style="' + original + '"';
            }
            return 'style="' + s + '"';
        });
    }

    function applyThemeToChapterContent(isDark) {
        const main = document.querySelector('main');
        if (!main) return;

        const allStyled = main.querySelectorAll('[style]');
        allStyled.forEach(function(el) {
            if (el.closest('.w3-top') || el.closest('.w3-sidebar') || el.closest('nav') || el.closest('.w3-dropdown-content')) return;

            const currentStyle = el.getAttribute('style') || '';

            if (isDark) {
                if (!el.hasAttribute('data-original-style')) {
                    el.setAttribute('data-original-style', currentStyle);
                }
                const original = el.getAttribute('data-original-style') || currentStyle;
                let newStyle = original;

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
                newStyle = newStyle.replace(/color:\s*#667eea\b/gi, 'color:#8ea0ff');
                newStyle = newStyle.replace(/color:\s*#ff9800\b/gi, 'color:#ffb74d');
                newStyle = newStyle.replace(/color:\s*#e91e63\b/gi, 'color:#f06292');
                newStyle = newStyle.replace(/color:\s*#1890ff\b/gi, 'color:#42a5f5');
                newStyle = newStyle.replace(/color:\s*#ff4d4f\b/gi, 'color:#ff6b6b');
                newStyle = newStyle.replace(/color:\s*#D73A49\b/gi, 'color:#ff6b6b');
                newStyle = newStyle.replace(/color:\s*#005CC5\b/gi, 'color:#569cd6');
                newStyle = newStyle.replace(/color:\s*#04AA6D\b/gi, 'color:#04AA6D');
                newStyle = newStyle.replace(/color:\s*#FFD700\b/gi, 'color:#FFD700');
                newStyle = newStyle.replace(/color:\s*#a6e22e\b/gi, 'color:#a6e22e');
                newStyle = newStyle.replace(/color:\s*#569cd6\b/gi, 'color:#569cd6');
                newStyle = newStyle.replace(/color:\s*#d4d4d4\b/gi, 'color:#d4d4d4');
                newStyle = newStyle.replace(/color:\s*#B5CEA8\b/gi, 'color:#B5CEA8');
                newStyle = newStyle.replace(/color:\s*#C586C0\b/gi, 'color:#C586C0');
                newStyle = newStyle.replace(/color:\s*#CE9178\b/gi, 'color:#CE9178');
                newStyle = newStyle.replace(/color:\s*#f92672\b/gi, 'color:#f92672');
                newStyle = newStyle.replace(/color:\s*#0a0\b/gi, 'color:#4ec94e');
                newStyle = newStyle.replace(/color:\s*#905\b/gi, 'color:#c586c0');
                newStyle = newStyle.replace(/color:\s*#005cc5\b/gi, 'color:#569cd6');
                newStyle = newStyle.replace(/color:\s*#d73a49\b/gi, 'color:#ff6b6b');
                newStyle = newStyle.replace(/color:\s*#fff\b/gi, 'color:#fff');
                newStyle = newStyle.replace(/color:\s*#ffffff\b/gi, 'color:#fff');

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
                newStyle = newStyle.replace(/background:\s*#282A35\b/gi, 'background:#282A35');
                newStyle = newStyle.replace(/background:\s*#1a1a2e\b/gi, 'background:#1a1a2e');
                newStyle = newStyle.replace(/background:\s*#0d0d1a\b/gi, 'background:#0d0d1a');
                newStyle = newStyle.replace(/background:\s*#1e1e1e\b/gi, 'background:#1e1e1e');
                newStyle = newStyle.replace(/background:\s*#0f0f1a\b/gi, 'background:#0f0f1a');
                newStyle = newStyle.replace(/background:\s*#16162a\b/gi, 'background:#16162a');
                newStyle = newStyle.replace(/background-color:\s*#D9EEE1\b/gi, 'background-color:#1a3a2a');
                newStyle = newStyle.replace(/background-color:\s*#FFF4A3\b/gi, 'background-color:#3a3520');
                newStyle = newStyle.replace(/background-color:\s*#FFC0C7\b/gi, 'background-color:#3a2028');
                newStyle = newStyle.replace(/background-color:\s*#96D4D4\b/gi, 'background-color:#1a3035');

                newStyle = newStyle.replace(/border:\s*2px solid #ff4d4f\b/gi, 'border:2px solid #ff6b6b');

                if (newStyle !== currentStyle) {
                    el.setAttribute('style', newStyle);
                }
            } else {
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
        document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
            img.addEventListener('load', function() { img.classList.add('loaded'); });
            if (img.complete) img.classList.add('loaded');
        });
    }

    // 页面加载完成后初始化（第1组：基础UI初始化）
    document.addEventListener('DOMContentLoaded', function() {
        window.log.log('[DOMReady] 第1个监听器触发');
        initLazyImages();
        initScrollProgress();
        initNavScrollBehavior();
        initClassDropdown();
        checkDBStatus();
    });

    // 初始化班级下拉框
    function initClassDropdown() {
        const select = document.getElementById('regClassNum');
        if (!select) return;
        for (let i = 1; i <= 20; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i + '班';
            select.appendChild(opt);
        }
    }

    // ============================================================
    // 打字机效果
    // ============================================================
    function initTypewriterEffect() {
        // 不自动启动，等待滚动显示后再启动
    }

    function startTypewriterEffect() {
        const containers = document.querySelectorAll('.typewriter-container');

        containers.forEach(function(container) {
            const output = container.querySelector('.typewriter-output');
            const cursor = container.querySelector('.typewriter-cursor');

            if (!output || output.textContent.trim().length > 0) return;

            const text = '# 变量赋值演示\nname = "小明"\nage = 14\nfavorite_color = "蓝色"\n\n# 打印变量值\nprint("我叫", name)\nprint("我今年", age, "岁")\nprint("我喜欢", favorite_color)';

            output.textContent = '';
            if (cursor) cursor.style.display = 'inline-block';

            const chars = Array.from(text);
            let charIndex = 0;

            function typeCharacter() {
                if (charIndex < chars.length) {
                    const char = chars[charIndex];
                    if (char === '\n') {
                        output.appendChild(document.createElement('br'));
                    } else if (char === '\r') {
                        // skip
                    } else {
                        output.appendChild(document.createTextNode(char));
                    }
                    charIndex++;
                    const delay = char === '\n' ? 200 : 60;
                    setTimeout(typeCharacter, delay);
                } else {
                    if (cursor) {
                        setTimeout(function() { cursor.style.display = 'none'; }, 2000);
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

        const firstModule = document.querySelector('.module');
        if (firstModule) {
            firstModule.classList.add('active');
        }

        setTimeout(function() {
            const windowHeight = window.innerHeight;
            featureCards.forEach(function(card) {
                const rect = card.getBoundingClientRect();
                if (rect.top < windowHeight * 0.8) {
                    card.classList.add('visible');
                }
            });
        }, 100);

        function checkScroll() {
            const windowHeight = window.innerHeight;

            modules.forEach(function(module) {
                const rect = module.getBoundingClientRect();
                const moduleTop = rect.top;
                const moduleHeight = rect.height;

                if (moduleTop < windowHeight * 0.7 && moduleTop + moduleHeight > 0) {
                    module.classList.add('active');
                }
            });

            featureCards.forEach(function(card) {
                const rect = card.getBoundingClientRect();
                if (rect.top < windowHeight * 0.8) {
                    card.classList.add('visible');
                }
            });

            if (typewriterContainer && !typewriterStarted) {
                const rect = typewriterContainer.getBoundingClientRect();
                if (rect.top < windowHeight * 0.7) {
                    typewriterStarted = true;
                    setTimeout(startTypewriterEffect, 300);
                }
            }
        }

        setTimeout(checkScroll, 100);

        let scrollTimer = null;
        window.addEventListener('scroll', function() {
            if (scrollTimer) return;
            scrollTimer = setTimeout(function() {
                checkScroll();
                const backToTopBtn = document.getElementById('backToTopBtn');
                if (backToTopBtn) {
                    if (window.scrollY > 400) {
                        backToTopBtn.classList.add('visible');
                    } else {
                        backToTopBtn.classList.remove('visible');
                    }
                }
                stickyChapterNav();
                scrollTimer = null;
            }, 100);
        });

        if ('IntersectionObserver' in window) {
            const revealObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.15,
                rootMargin: '0px 0px -40px 0px'
            });

            document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function(el) {
                revealObserver.observe(el);
            });
        } else {
            document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function(el) {
                el.classList.add('revealed');
            });
        }
    }

    // 章节子模块导航吸顶效果
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

        navs.forEach(function(nav) {
            if (isScrollingDown && currentY > 100) {
                nav.classList.add('nav-top-zero');
                if (topBar) topBar.classList.add('nav-hidden');
            } else if (isScrollingUp) {
                nav.classList.remove('nav-top-zero');
                if (topBar) topBar.classList.remove('nav-hidden');
            }
        });

        if (currentY <= MAIN_NAV_HEIGHT) {
            navs.forEach(function(nav) { nav.classList.remove('nav-top-zero'); });
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

            if (scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

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

        window.addEventListener('scroll', function() {
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
        window.addEventListener('resize', function() {
            resize();
            initParticles();
        });

        document.addEventListener('mousemove', function(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function Particle() {
            this.reset();
            this.y = Math.random() * canvas.height;
        }
        Particle.prototype.reset = function() {
            this.x = Math.random() * canvas.width;
            this.y = -10;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedY = Math.random() * 0.6 + 0.2;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.hue = Math.random() > 0.5 ? 160 : 230;
        };
        Particle.prototype.update = function() {
            this.y += this.speedY;
            this.x += this.speedX;

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
        };
        Particle.prototype.draw = function() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + this.hue + ', 70%, 55%, ' + this.opacity + ')';
            ctx.fill();
        };

        function initParticles() {
            const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
            particles = [];
            for (let i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        }

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
                        ctx.strokeStyle = 'rgba(4, 170, 109, ' + ((120 - dist) / 120 * 0.12) + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(function(p) { p.update(); p.draw(); });
            drawLines();
            animationId = requestAnimationFrame(animate);
        }

        initParticles();
        animate();

        document.addEventListener('visibilitychange', function() {
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

        setInterval(function() {
            if (document.hidden) return;
            drops.forEach(function(span) {
                if (Math.random() > 0.7) {
                    span.textContent = chars[Math.floor(Math.random() * chars.length)];
                }
            });
        }, 2000);
    }

    // ----- 数据流SVG动画 -----
    function initDataFlowLines() {
        const featuresSection = document.querySelector('.features-section');
        if (!featuresSection) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'data-flow-svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';

        const lines = [
            { x1: '10%', y1: '20%', x2: '90%', y2: '80%' },
            { x1: '90%', y1: '10%', x2: '10%', y2: '90%' },
            { x1: '5%', y1: '50%', x2: '95%', y2: '50%' }
        ];

        lines.forEach(function(line, i) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            path.setAttribute('x1', line.x1);
            path.setAttribute('y1', line.y1);
            path.setAttribute('x2', line.x2);
            path.setAttribute('y2', line.y2);
            path.setAttribute('stroke', 'rgba(4, 170, 109, 0.06)');
            path.setAttribute('stroke-width', '1');
            path.setAttribute('stroke-dasharray', '8,12');
            path.style.animation = 'dashFlow ' + (3 + i * 2) + 's linear infinite';
            svg.appendChild(path);
        });

        featuresSection.style.position = 'relative';
        featuresSection.insertBefore(svg, featuresSection.firstChild);
    }

    // 虚线流动动画 keyframes
    (function() {
        const style = document.createElement('style');
        style.textContent = '@keyframes dashFlow { 0% { stroke-dashoffset: 40; } 100% { stroke-dashoffset: 0; } }';
        document.head.appendChild(style);
    })();

    // ----- 鼠标光晕跟随 -----
    function initMouseGlow() {
        const glow = document.createElement('div');
        glow.className = 'mouse-glow';
        glow.style.cssText = 'position: fixed; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(4,170,109,0.04) 0%, transparent 70%); pointer-events: none; z-index: 0; transform: translate(-50%, -50%); transition: opacity 0.3s ease;';
        document.body.appendChild(glow);

        let timeout;
        document.addEventListener('mousemove', function(e) {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
            glow.style.opacity = '1';
            clearTimeout(timeout);
            timeout = setTimeout(function() { glow.style.opacity = '0'; }, 2000);
        });
    }

    // ----- 初始化所有科技感动画 -----
    function initTechEnhancements() {
        initParticleCanvas();
        initDigitalRain();
        initDataFlowLines();
        initMouseGlow();
    }

    // 页面加载完成后初始化科技感动画
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTechEnhancements);
    } else {
        initTechEnhancements();
    }

    // 暴露到全局
    window.showConfirm = showConfirm;
    window.closeConfirmModal = closeConfirmModal;
    window.showToast = showToast;
    window.removeToast = removeToast;
    window.showLoginWelcome = showLoginWelcome;
    window.dismissWelcome = dismissWelcome;
    window.setButtonLoading = setButtonLoading;
    window.CH2_MODULE_IDS = CH2_MODULE_IDS;
    window.initTheme = initTheme;
    window.toggleTheme = toggleTheme;
    window.updateThemeIcon = updateThemeIcon;
    window.preprocessHTMLForDark = preprocessHTMLForDark;
    window.applyThemeToChapterContent = applyThemeToChapterContent;
    window.initLazyImages = initLazyImages;
    window.initScrollProgress = initScrollProgress;
    window.initNavScrollBehavior = initNavScrollBehavior;
    window.initClassDropdown = initClassDropdown;
    window.checkDBStatus = checkDBStatus;
    window.showOfflineWarning = showOfflineWarning;
    window.loadChaptersContent = loadChaptersContent;
    window.initTypewriterEffect = initTypewriterEffect;
    window.startTypewriterEffect = startTypewriterEffect;
    window.initScrollReveal = initScrollReveal;
    window.stickyChapterNav = stickyChapterNav;
    window.scrollToTop = scrollToTop;
    window.initParticleCanvas = initParticleCanvas;
    window.initDigitalRain = initDigitalRain;
    window.initDataFlowLines = initDataFlowLines;
    window.initMouseGlow = initMouseGlow;
    window.initTechEnhancements = initTechEnhancements;

})();