// ===== PythonVariableLesson - utils.js (基础工具模块) =====
(function() {
    'use strict';

    // ===== API 层（连接后端 MySQL 数据库） =====
    const API_BASE = '/api';

    const DEBUG = false;
    const log = { log: DEBUG ? console.log.bind(console) : function() {}, warn: console.warn.bind(console), error: console.error.bind(console) };

    // ===== 启动诊断日志（生产环境仅输出文件加载确认） =====
    console.log('%c[utils.js] 文件已加载 %c' + new Date().toISOString(), 'color:#04AA6D;font-weight:bold', 'color:#888');
    log.log('[utils.js] 当前 URL:', window.location.href);
    log.log('[utils.js] 当前 hash:', window.location.hash || '(无)');
    log.log('[utils.js] 屏幕尺寸:', window.innerWidth + 'x' + window.innerHeight);
    log.log('[utils.js] 主题偏好:', localStorage.getItem('pv_theme') || '(未设置，默认暗色)');

    // ===== 旧浏览器检测提示 =====
    // 检测 IE 内核或缺少现代 Web API（fetch/closest/Promise）的浏览器，提示用户更换 Chrome/Edge
    // 注意：本段代码必须用 ES5 语法书写，确保在旧浏览器上也能正常执行并弹出提示
    (function initLegacyBrowserCheck() {
        function isLegacy() {
            if (window.document && window.document.documentMode) return true; // IE 内核特有属性
            if (typeof window.fetch === 'undefined') return true;
            if (typeof Promise === 'undefined') return true;
            if (window.Element && typeof Element.prototype.closest === 'undefined') return true;
            return false;
        }
        function showLegacyBanner() {
            if (document.getElementById('legacyBrowserBanner')) return;
            var banner = document.createElement('div');
            banner.id = 'legacyBrowserBanner';
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100000;background:#f59e0b;color:#1e293b;text-align:center;padding:12px 48px 12px 16px;font-size:14px;font-weight:600;box-shadow:0 2px 12px rgba(0,0,0,0.25);';
            banner.appendChild(document.createTextNode('检测到您正在使用旧版浏览器（如 IE），部分功能可能无法正常使用，请改用 Chrome 或 Edge 浏览器打开本网站。'));
            var closeBtn = document.createElement('button');
            closeBtn.style.cssText = 'position:absolute;top:50%;right:12px;transform:translateY(-50%);background:rgba(0,0,0,0.15);border:none;border-radius:4px;color:#1e293b;cursor:pointer;font-size:14px;line-height:1;padding:4px 9px;';
            closeBtn.title = '关闭';
            closeBtn.appendChild(document.createTextNode('\u2715'));
            closeBtn.onclick = function() { if (banner.parentNode) banner.parentNode.removeChild(banner); };
            banner.appendChild(closeBtn);
            document.body.insertBefore(banner, document.body.firstChild);
        }
        if (isLegacy()) showLegacyBanner();
    })();

    // ===== 全局错误处理 =====
    // 误报错误过滤器：判断是否为环境注入/外部脚本导致的非应用错误
    function isFalsePositiveError(message, source, lineno, colno) {
        // 1. IDE/Electron 环境注入的脚本（Vite HMR 等）
        if (lineno === 1 && colno === 1 && source && source.indexOf(location.origin) === 0 && source.indexOf('.js') === -1) {
            return true;
        }
        // 2. 浏览器扩展注入的脚本
        if (source && /^(chrome|moz|safari)-extension:\/\//.test(source)) {
            return true;
        }
        // 3. 跨域脚本的 "Script error." 无详情
        if (message === 'Script error.' && (!source || source === '')) {
            return true;
        }
        // 4. 来自 CDN 回退的脚本加载失败
        if (source && /cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net/.test(source)) {
            return true;
        }
        // 5. Vite HMR 客户端相关错误
        if (message && message.indexOf('@vite/client') !== -1) {
            return true;
        }
        return false;
    }

    window.onerror = function(message, source, lineno, colno, error) {
        if (isFalsePositiveError(message, source, lineno, colno)) {
            return true;
        }
        const errorDetail = {
            message: message,
            source: source,
            line: lineno,
            col: colno,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        console.error('[全局错误]', errorDetail);
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/error-report', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(errorDetail));
        } catch (e) { /* 日志系统容错 */ }
        if (document.readyState === 'complete') {
            showGlobalError('页面发生错误，请刷新页面重试。如果问题持续，请联系老师。');
        }
        return true;
    };

    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        if (reason && reason.message) {
            const msg = reason.message;
            if (msg.indexOf('Failed to fetch') !== -1 ||
                msg.indexOf('NetworkError') !== -1 ||
                msg.indexOf('Load failed') !== -1) {
                console.warn('[Promise错误(已过滤)]', msg);
                event.preventDefault();
                return;
            }
        }
        console.error('[未处理的Promise错误]', event.reason);
        if (document.readyState === 'complete') {
            showGlobalError('操作失败，请检查网络连接后重试。');
        }
        event.preventDefault();
    });

    function showGlobalError(message) {
        if (document.getElementById('globalErrorToast')) return;
        const toast = document.createElement('div');
        toast.id = 'globalErrorToast';
        toast.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ff4444;color:#fff;text-align:center;padding:12px 20px;font-size:14px;cursor:pointer;';
        toast.textContent = message;
        toast.onclick = function() { toast.remove(); };
        document.body.appendChild(toast);
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 5000);
    }

    // ===================================================
    // 降级模式检测（定期检查后端健康状态）
    // ===================================================
    (function initDegradedModeCheck() {
        let bannerShown = false;
        function checkHealth() {
            fetch('/api/health', { credentials: 'omit' })
                .then(function(r) { return r.json(); })
                .then(function(health) {
                    if (health.database && health.database.status !== 'connected') {
                        if (!bannerShown) {
                            bannerShown = true;
                            showDegradedBanner(health.database.message || '数据库连接异常');
                        }
                    } else {
                        if (bannerShown) {
                            bannerShown = false;
                            hideDegradedBanner();
                        }
                    }
                })
                .catch(function() {});
        }
        function showDegradedBanner(msg) {
            const banner = document.createElement('div');
            banner.id = 'degradedBanner';
            banner.style.cssText = 'position:fixed;top:var(--navbar-height,56px);left:0;right:0;z-index:9999;background:#e74c3c;color:#fff;text-align:center;padding:8px 16px;font-size:14px;';
            banner.textContent = '\u26A0\uFE0F ' + (msg || '系统部分功能暂时不可用，学习进度可能无法保存');
            const closeBtn = document.createElement('button');
            closeBtn.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer;margin-left:12px;font-size:16px;';
            closeBtn.textContent = '\u2715';
            closeBtn.onclick = function() { banner.remove(); };
            banner.appendChild(closeBtn);
            document.body.insertBefore(banner, document.body.firstChild);
        }
        function hideDegradedBanner() {
            const banner = document.getElementById('degradedBanner');
            if (banner) banner.remove();
        }
        setTimeout(checkHealth, 3000);
        setInterval(checkHealth, 30000);
    })();

    // ===================================================
    // 统一错误提示函数
    // ===================================================
    function showError(message, type) {
        type = type || 'error';
        var icons = {
            network: '🌐',
            server: '🖥️',
            auth: '🔒',
            validation: '⚠️',
            error: '❌'
        };
        var suggestions = {
            network: '请检查网络连接后重试',
            server: '服务器繁忙，请稍后重试',
            auth: '请重新登录',
            validation: '请稍后再试',
            error: ''
        };
        var fullMessage = (icons[type] || '❌') + ' ' + message;
        if (suggestions[type]) {
            fullMessage += '\n' + suggestions[type];
        }
        if (window.showToast) {
            window.showToast(fullMessage, 'error', 5000);
        } else {
            console.error('[showError]', message, 'type:', type);
        }
    }

    // 暴露到全局
    window.API_BASE = API_BASE;
    window.log = log;
    window.showGlobalError = showGlobalError;
    window.isFalsePositiveError = isFalsePositiveError;
    window.showError = showError;

})();