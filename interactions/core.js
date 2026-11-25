// ===== 章节交互 - 公共函数（从 chapter-interactions.js 拆分） =====
// 包含：shuffleDebugButtons / checkQuiz / shuffleQuizOptions / runPractice / escapeHtml / preprocessCode
// 被所有章节交互函数引用，必须先加载

// ============================================================
// Python 基础学习平台 - 章节交互函数
// 为 chapters.js 中的交互式元素提供通用工厂函数
// ============================================================

// ============================================================
// 调试诊所按钮随机排序
// ============================================================
function shuffleDebugButtons() {
    // 查找所有调试诊所的反馈容器（支持 -debug-fb 和 -debug-feedback 两种ID）
    var debugContainers = document.querySelectorAll('[id$="-debug-fb"], [id$="-debug-feedback"]');
    debugContainers.forEach(function(fb) {
        var parent = fb.parentElement;
        if (!parent) return;
        // 找到包含按钮的 div（通常是 flex-wrap 的容器）
        var btnContainers = parent.querySelectorAll('div[style*="display:flex"]');
        btnContainers.forEach(function(container) {
            var buttons = container.querySelectorAll('button');
            if (buttons.length <= 1) return;
            // 检查是否已经随机化过
            if (container.getAttribute('data-shuffled') === 'true') return;
            container.setAttribute('data-shuffled', 'true');
            // Fisher-Yates 洗牌
            var arr = Array.from(buttons);
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
            // 重新排列 DOM
            arr.forEach(function(btn) {
                container.appendChild(btn);
            });
        });
    });
}

// ============================================================
// 通用测验检查函数（使用 data-correct 属性）
// ============================================================
function checkQuiz(chapterNum) {
    const resultEl = document.getElementById('ch' + chapterNum + '-quiz-result');
    let correctCount = 0;
    let totalQuestions = 0;

    // 查找该章节的所有问题（按 radio name 分组）
    const allRadios = document.querySelectorAll('input[type="radio"][name^="ch' + chapterNum + 'q"]');
    const questionNames = new Set();
    allRadios.forEach(function(r) { questionNames.add(r.name); });
    totalQuestions = questionNames.size;

    // 先清除之前的高亮
    document.querySelectorAll('.quiz-option-correct, .quiz-option-incorrect, .quiz-option-correct-highlight').forEach(function(el) {
        el.classList.remove('quiz-option-correct', 'quiz-option-incorrect', 'quiz-option-correct-highlight');
    });
    document.querySelectorAll('.quiz-card-checked').forEach(function(el) {
        el.classList.remove('quiz-card-checked');
    });

    questionNames.forEach(function(name) {
        const radios = document.getElementsByName(name);
        let selected = null;
        for (var i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
                selected = radios[i];
                break;
            }
        }

        // 高亮每道题的正确选项
        for (var j = 0; j < radios.length; j++) {
            var label = radios[j].closest('label');
            if (radios[j].getAttribute('data-correct') === 'true') {
                if (label) label.classList.add('quiz-option-correct-highlight');
            }
            // 如果用户选了这道题且是正确答案
            if (radios[j] === selected && radios[j].getAttribute('data-correct') === 'true') {
                if (label) label.classList.add('quiz-option-correct');
                correctCount++;
            }
            // 如果用户选了这道题但是错误答案
            if (radios[j] === selected && radios[j].getAttribute('data-correct') !== 'true') {
                if (label) label.classList.add('quiz-option-incorrect');
            }
        }

        // 标记问题卡片为已检查
        if (radios.length > 0) {
            var card = radios[0].closest('.w3-card-2, .w3-card');
            if (card) card.classList.add('quiz-card-checked');
        }
    });

    if (resultEl) {
        if (totalQuestions === 0) {
            resultEl.innerHTML = '💡 未找到题目，请检查页面内容';
            resultEl.style.color = '#ff9800';
            return;
        }
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        let emoji = '🌟';
        let color = '#04AA6D';
        if (percentage < 60) { emoji = '📚'; color = '#ff9800'; }
        if (percentage < 40) { emoji = '💪'; color = '#ff4d4f'; }
        resultEl.innerHTML = emoji + ' 得分：' + correctCount + '/' + totalQuestions + '（' + percentage + '分）';
        resultEl.style.color = color;
    }
}

// ============================================================
// 测验选项随机排列
// ============================================================
function shuffleQuizOptions() {
    // 查找所有 quiz 容器
    var quizContainers = document.querySelectorAll('[id$="-quiz-result"]');
    quizContainers.forEach(function(resultEl) {
        var quizSection = resultEl.parentElement;
        if (!quizSection) return;

        // 找到所有问题卡片（只处理包含 radio 选项的卡片）
        var questionCards = quizSection.querySelectorAll('.w3-card-2');
        questionCards.forEach(function(card) {
            // 跳过没有 radio 选项的卡片（如提示卡片、示例卡片等）
            if (!card.querySelector('input[type="radio"]')) return;
            // 检查是否已经随机化过
            if (card.getAttribute('data-shuffled') === 'true') return;
            card.setAttribute('data-shuffled', 'true');

            // 找到所有 label 选项
            var labels = card.querySelectorAll('label');
            if (labels.length <= 1) return;

            // Fisher-Yates 洗牌
            var arr = Array.from(labels);
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }

            // 重新排列 DOM
            var parent = labels[0].parentElement;
            arr.forEach(function(label) {
                parent.appendChild(label);
            });
        });
    });
}

// ============================================================
// 通用实践运行函数
// ============================================================
function runPractice(chapterNum, validator) {
    const codeEl = document.getElementById('ch' + chapterNum + '-practice-code');
    const outputEl = document.getElementById('ch' + chapterNum + '-practice-output');
    if (!codeEl || !outputEl) return;

    const code = getPracticeCode(codeEl);
    if (typeof validator === 'function') {
        const result = validator(code);
        outputEl.innerHTML = result.html || result;
        outputEl.style.color = result.color || '#a6e22e';
    } else {
        // 默认：显示代码内容
        outputEl.innerHTML = '📝 你输入的代码：<br>' + escapeHtml(code);
        outputEl.style.color = '#a6e22e';
    }
}

function escapeHtml(str) {
	    const div = document.createElement('div');
	    div.textContent = str;
	    return div.innerHTML;
	}

	// 获取实践代码（优先从 CodeMirror 读取，否则从 textarea 读取）
	function getPracticeCode(codeEl) {
	    var cm = window._cmInstances && window._cmInstances[codeEl.id];
	    // 验证 CodeMirror 实例是否仍在 DOM 中
	    if (cm && cm.getWrapperElement && cm.getWrapperElement().parentNode) {
	        var val = cm.getValue();
	        console.log('[getPracticeCode] ' + codeEl.id + ' -> CodeMirror: ' + val.substring(0, 60));
	        return val;
	    }
	    console.log('[getPracticeCode] ' + codeEl.id + ' -> textarea.value: ' + codeEl.value.substring(0, 60));
	    return codeEl.value;
	}

	// 设置实践代码（优先更新 CodeMirror，否则更新 textarea）
	function setPracticeCode(codeEl, value) {
	    var cm = window._cmInstances && window._cmInstances[codeEl.id];
	    if (cm && cm.getWrapperElement && cm.getWrapperElement().parentNode) {
	        cm.setValue(value);
	        cm.refresh();
	        console.log('[setPracticeCode] ' + codeEl.id + ' -> CodeMirror.setValue: ' + value.substring(0, 60));
	    } else {
	        codeEl.value = value;
	        console.log('[setPracticeCode] ' + codeEl.id + ' -> textarea.value: ' + value.substring(0, 60));
	    }
	}

// 预处理代码：去除注释和字符串字面量，避免关键词误匹配
function preprocessCode(code) {
    // 1. 去除以 # 开头的注释行（包括行尾注释）
    var cleaned = code.replace(/#.*$/gm, '');
    // 2. 去除三引号字符串
    cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
    cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
    // 3. 去除单引号字符串内容
    cleaned = cleaned.replace(/'[^']*'/g, "''");
    // 4. 去除双引号字符串内容
    cleaned = cleaned.replace(/"[^"]*"/g, '""');
    return cleaned;
}

