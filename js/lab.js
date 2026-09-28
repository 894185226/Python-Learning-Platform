// ===== PythonVariableLesson - lab.js (代码编辑器与执行模块) =====
(function() {
    'use strict';

    // CodeMirror 语法高亮初始化
    const _cmInstances = {};
    window._cmInstances = _cmInstances;

    // 根据编辑器 id（如 ch1-practice-code）分发到对应的 runChXPractice 函数
    function runPracticeByEditorId(id) {
        var m = /^ch(\d+)-practice-code$/.exec(id);
        if (!m) return;
        var fn = window['runCh' + m[1] + 'Practice'];
        if (typeof fn === 'function') fn();
    }

    function initCodeMirrorForPractice() {
        if (typeof CodeMirror === 'undefined') return;
        document.querySelectorAll('textarea[id$="-practice-code"]').forEach(function(textarea) {
            const id = textarea.id;
            if (_cmInstances[id]) {
		            // 检查旧实例的 wrapper 是否还在 DOM 中（模块切换会销毁 DOM）
		            if (_cmInstances[id].getWrapperElement && _cmInstances[id].getWrapperElement().parentNode) {
		                return; // 实例仍有效，跳过
		            }
		            // 旧实例已失效，移除引用
		            delete _cmInstances[id];
	        }
            const wrapper = textarea.parentElement;
            if (!wrapper) return;

            const cm = CodeMirror.fromTextArea(textarea, {
                mode: 'python',
                theme: 'monokai',
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                autoCloseBrackets: true,
                lineWrapping: true,
                viewportMargin: Infinity,
                extraKeys: {
                    'Ctrl-Enter': function() { runPracticeByEditorId(id); },
                    'Cmd-Enter': function() { runPracticeByEditorId(id); }
                }
            });
            cm.setSize('100%', 'auto');
            cm.refresh();
            _cmInstances[id] = cm;

            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (!isDark) {
                wrapper.style.background = '#fafafa';
                cm.setOption('theme', 'default');
            }
        });
    }

    // 暗色主题切换时刷新 CodeMirror
    const _origToggleTheme = window.toggleTheme;
    window.toggleTheme = function() {
        _origToggleTheme();
        setTimeout(function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            Object.keys(_cmInstances).forEach(function(id) {
                const cm = _cmInstances[id];
                if (cm) {
                    cm.setOption('theme', isDark ? 'monokai' : 'default');
                    const wrapper = cm.getWrapperElement();
                    if (wrapper && wrapper.parentElement) {
                        wrapper.parentElement.style.background = isDark ? '' : '#fafafa';
                    }
                }
            });
        }, 100);
    };

    // 暴露到全局
    window.initCodeMirrorForPractice = initCodeMirrorForPractice;

})();