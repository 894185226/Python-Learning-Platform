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

// ============================================================
// 第1章：认识Python
// ============================================================
function checkCh1Quiz() { checkQuiz(1); }

var ch1PracticeLevel = 1;
var ch1PracticeData = {
    1: { title: '📝 Lv1：补全 print() 语句', desc: '补全下面的代码，让它输出"Hello Python"', code: 'print(______)' },
    2: { title: '📝 Lv2：写一句打招呼的话', desc: '用 print() 写一句打招呼的话', code: '# 写一句打招呼的话\nprint("______")' },
    3: { title: '📝 Lv3：修改句子', desc: '修改下面的代码，让它输出你喜欢的句子', code: 'print("我是一个Python学习者")\n# 修改上面的句子' }
};

function switchPracticeLevel(level) {
	    // 限制范围：防止上一题/下一题越界
	    if (level < 1) level = 1;
	    if (level > 3) level = 3;
	    ch1PracticeLevel = level;
	    var data = ch1PracticeData[level];
	    var titleEl = document.getElementById('ch1-practice-title');
	    var descEl = document.getElementById('ch1-practice-desc');
	    var codeEl = document.getElementById('ch1-practice-code');
	    var outputEl = document.getElementById('ch1-practice-output');
	    if (titleEl) titleEl.textContent = data.title;
	    if (descEl) descEl.textContent = data.desc;
	    if (codeEl) {
	        setPracticeCode(codeEl, data.code);
	    }
	    // 切换级别时清空输出结果
	    if (outputEl) {
	        outputEl.innerHTML = '▶ 点击运行按钮查看结果';
	        outputEl.style.color = '#888';
	    }

	    // 更新按钮样式：切换 .active 类（与第2章 .level-btn 一致）
    for (var i = 1; i <= 3; i++) {
        var btn = document.getElementById('ch1-lv' + i + '-btn');
        if (btn) {
            btn.classList.toggle('active', i === level);
        }
    }

    // 更新前后导航按钮：Lv1只显示下一题，Lv2双向，Lv3只显示上一题
    var prevBtn = document.getElementById('ch1-practice-prev');
    var nextBtn = document.getElementById('ch1-practice-next');
    if (prevBtn) prevBtn.style.display = (level > 1) ? '' : 'none';
    if (nextBtn) nextBtn.style.display = (level < 3) ? '' : 'none';
}

function runCh1Practice() {
	    var codeEl = document.getElementById('ch1-practice-code');
	    var output = document.getElementById('ch1-practice-output');
	    if (!codeEl || !output) return;
	    var code = getPracticeCode(codeEl);

	    var clean = preprocessCode(code);
		    // 检测中文输入法引号（"" ''）
		    var hasChineseQuote = /[\u201C\u201D\u2018\u2019]/.test(code);

	    if (ch1PracticeLevel === 1) {
	        // Lv1：补全 print() 语句，输出 "Hello Python"
		        var hasPrint = /\bprint\s*\(/.test(clean);
		        var quoteMatch = code.match(/print\s*\([^"'\n]*["']([^"']*)["']/);
		        // 去除残留下划线（学生可能在 ___ 前后输入内容）
		        var content = quoteMatch ? quoteMatch[1].replace(/_/g, '') : '';
		        // Lv1占位符检测：去除引号内容后检查是否还有连续下划线
		        var hasPlaceholder = /_{3,}/.test(code.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, ''));
	        if (hasChineseQuote) {
	            output.innerHTML = '💡 检测到中文输入法引号！请切换到英文输入法，使用英文双引号 "<br>如 print("Hello Python")';
	            output.style.color = '#ff9800';
	        } else if (hasPrint && quoteMatch && content === 'Hello Python') {
	            output.innerHTML = '✅ 正确！代码运行结果：<br><span style="color:#a6e22e;">Hello Python</span>';
	            output.style.color = '#04AA6D';
		        } else if (hasPrint && quoteMatch && content && content !== 'Hello Python') {
		            output.innerHTML = '💡 格式正确！但内容不对哦，题目要求输出 "Hello Python"，你输入的是 "' + escapeHtml(content) + '"';
		            output.style.color = '#ff9800';
		        } else if (hasPlaceholder) {
		            output.innerHTML = '💡 请先补全代码中的空白（______）部分，把 ______ 替换成 "Hello Python"！';
		            output.style.color = '#ff9800';
		        } else if (!quoteMatch && hasPrint) {
		            output.innerHTML = '💡 提示：字符串需要用英文引号括起来，如 print("Hello Python")';
		            output.style.color = '#ff9800';
		        } else {
		            output.innerHTML = '💡 提示：在括号里用引号括住"Hello Python"试试看！';
		            output.style.color = '#ff9800';
		        }
	    } else if (ch1PracticeLevel === 2) {
	        // Lv2：写一句打招呼的话
		        var hasPrint2 = /\bprint\s*\(/.test(clean);
		        var quoteMatch2 = code.match(/print\s*\([^"'\n]*["']([^"']*)["']/);
		        // 去除残留下划线（学生可能在 ___ 前后输入内容）
		        var content2 = quoteMatch2 ? quoteMatch2[1].replace(/_/g, '') : '';
		        // Lv2占位符检测：引号内内容全部是下划线才视为占位符
		        var hasPlaceholder = !content2 || /^_+$/.test(content2);
		        if (hasChineseQuote) {
		            output.innerHTML = '💡 检测到中文输入法引号！请切换到英文输入法，使用英文双引号 "<br>如 print("你好")';
		            output.style.color = '#ff9800';
		        } else if (hasPrint2 && quoteMatch2 && content2 && !hasPlaceholder) {
	            output.innerHTML = '✅ 正确！代码运行结果：<br><span style="color:#a6e22e;">' + escapeHtml(content2) + '</span>';
	            output.style.color = '#04AA6D';
		        } else if (hasPrint2 && quoteMatch2 && !content2) {
		            output.innerHTML = '💡 格式正确！但引号里不能为空哦，请写一句打招呼的话';
		            output.style.color = '#ff9800';
		        } else if (hasPlaceholder) {
		            output.innerHTML = '💡 请先补全代码中的空白（______）部分！';
		            output.style.color = '#ff9800';
		        } else if (!quoteMatch2 && hasPrint2) {
		            output.innerHTML = '💡 提示：字符串需要用英文引号括起来，如 print("你的话")';
		            output.style.color = '#ff9800';
		        } else {
		            output.innerHTML = '💡 提示：用 print("你的话") 的格式来写';
		            output.style.color = '#ff9800';
		        }
	    } else {
	        // Lv3：必须修改了原句（不能和原句一模一样），且语法正确
	        var original = 'print("我是一个Python学习者")';
	        // 去除注释后再比较，避免 # 修改上面的句子 造成误判
	        var codeNoComment = code.replace(/#.*$/gm, '').replace(/\s+/g, ' ').trim();
	        var origTrimmed = original.replace(/\s+/g, ' ').trim();
	        // 检查 print() 中引号是否正确闭合
	        var quoteMatch3 = code.match(/print\s*\([^"'\n]*["']([^"']*)["']/);
	        if (hasChineseQuote) {
	            output.innerHTML = '💡 检测到中文输入法引号！请切换到英文输入法，使用英文双引号 "<br>如 print("你好")';
	            output.style.color = '#ff9800';
	        } else if (codeNoComment !== origTrimmed && /\bprint\s*\(/.test(clean) && quoteMatch3) {
	            var content3 = quoteMatch3 ? quoteMatch3[1] : '';
	            output.innerHTML = '✅ 你修改了代码！运行结果：<br><span style="color:#a6e22e;">' + escapeHtml(content3) + '</span>';
	            output.style.color = '#04AA6D';
	        } else if (codeNoComment === origTrimmed) {
	            output.innerHTML = '💡 提示：你还没修改代码哦！试着改一下print()里面的句子吧！';
	            output.style.color = '#ff9800';
	        } else if (!quoteMatch3) {
	            output.innerHTML = '💡 提示：请检查引号是否正确闭合，格式应为 print("你的句子")';
	            output.style.color = '#ff9800';
	        } else {
	            output.innerHTML = '💡 提示：请使用print()函数输出你的句子';
	            output.style.color = '#ff9800';
	        }
	    }
}

// ============================================================
// 第3章：变量类型
// ============================================================
function checkCh3Quiz() { checkQuiz(3); }

function runCh3Practice() {
    var codeEl = document.getElementById('ch3-practice-code');
    var output = document.getElementById('ch3-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);
    if (code.indexOf("____") >= 0) {
        // 去除____后检查是否还有其他有意义的内容（学生可能在____前后输入了内容）
        var codeWithoutPH = code.replace(/_+/g, '').replace(/#.*$/gm, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        if (!/\w/.test(codeWithoutPH)) {
            output.innerHTML = "💡 请先补全代码中的空白（____）部分！";
            output.style.color = "#ff9800";
            return;
        }
    }


    var clean = preprocessCode(code);
    var hasInt = /\b\d+\b/.test(clean) && /\bage\b/.test(clean);
    var hasFloat = /\d+\.\d+/.test(clean) && /\bscore\b/.test(clean);
    var hasStr = /["'].*["']/.test(code) && /\bname\b/.test(clean);
    var hasBool = /\bTrue\b|\bFalse\b/.test(clean) && /\bis_student\b/.test(clean);

    var count = [hasInt, hasFloat, hasStr, hasBool].filter(Boolean).length;
    output.innerHTML = '创建了 ' + count + '/4 种类型的变量<br>' +
        (hasInt ? '✅ 整数 ✓<br>' : '❌ 缺少整数 (int)<br>') +
        (hasFloat ? '✅ 浮点数 ✓<br>' : '❌ 缺少浮点数 (float)<br>') +
        (hasStr ? '✅ 字符串 ✓<br>' : '❌ 缺少字符串 (str)<br>') +
        (hasBool ? '✅ 布尔值 ✓<br>' : '❌ 缺少布尔值 (bool)<br>');
    output.style.color = count >= 4 ? '#04AA6D' : '#ff9800';
}

function generateCh3Card() {
    var name = document.getElementById('ch3-name').value || '小明';
    var age = document.getElementById('ch3-age').value || '12';
    var height = document.getElementById('ch3-height').value || '1.55';
    var isStudent = document.getElementById('ch3-student').value || 'True';

    var previewName = document.getElementById('ch3-preview-name');
    var previewAge = document.getElementById('ch3-preview-age');
    var previewHeight = document.getElementById('ch3-preview-height');
    var previewStudent = document.getElementById('ch3-preview-student');
    var cardCode = document.getElementById('ch3-card-code');
    if (!previewName || !previewAge || !previewHeight || !previewStudent || !cardCode) return;

    previewName.textContent = name;
    previewAge.textContent = '年龄: ' + age + ' (int)';
    previewHeight.textContent = '身高: ' + height + 'm (float)';
    previewStudent.textContent = '学生: ' + isStudent + ' (bool)';

    cardCode.innerHTML =
        'name = "' + escapeHtml(name) + '"  <span style="color:#888;"># str</span><br>' +
        'age = ' + age + '  <span style="color:#888;"># int</span><br>' +
        'height = ' + height + '  <span style="color:#888;"># float</span><br>' +
        'is_student = ' + isStudent + '  <span style="color:#888;"># bool</span>';
}

// 第3章拖拽分类初始化
(function initCh3DragDrop() {
    var observer = new MutationObserver(function() {
        var items = document.querySelectorAll('.ch3-drag-item');
        var zones = document.querySelectorAll('.ch3-drop-zone');
        if (items.length > 0 && zones.length > 0) {
            initDragDrop(items, zones, 'ch3-lab-score');
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

// ============================================================
// 第4章：条件判断
// ============================================================
function checkCh4Quiz() { checkQuiz(4); }

function runCh4Practice() {
    var codeEl = document.getElementById('ch4-practice-code');
    var output = document.getElementById('ch4-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    // 未填空提示
    if (code.indexOf('____') >= 0) {
        output.innerHTML = '💡 请先补全 print 中的空白（____）内容！';
        output.style.color = '#ff9800';
        return;
    }

    // 提取 score 的值
    var scoreMatch = code.match(/\bscore\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (!scoreMatch) {
        output.innerHTML = '⚠️ 未找到 "score = ..." 赋值语句，请保持题目结构';
        output.style.color = '#ff9800';
        return;
    }
    var score = parseFloat(scoreMatch[1]);

    // 提取 if 条件中的比较（如 score >= 60）
    var condMatch = code.match(/\bif\s+(.+?)\s*:/);
    var cmp = condMatch ? condMatch[1].match(/(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?)/) : null;
    if (!cmp) {
        output.innerHTML = '⚠️ 无法解析 if 条件，请使用 "if score >= 60:" 这类写法';
        output.style.color = '#ff9800';
        return;
    }
    var op = cmp[1];
    var rhs = parseFloat(cmp[2]);
    var isTrue;
    if (op === '>=') isTrue = score >= rhs;
    else if (op === '<=') isTrue = score <= rhs;
    else if (op === '>') isTrue = score > rhs;
    else if (op === '<') isTrue = score < rhs;
    else if (op === '==') isTrue = score === rhs;
    else isTrue = score !== rhs;

    // 提取所有 print("...") 中的字符串（第一个属 if 分支，第二个属 else 分支）
    var prints = [];
    var printRe = /print\s*\(\s*["'](.*?)["']\s*\)/g;
    var pm;
    while ((pm = printRe.exec(code)) !== null) {
        prints.push(pm[1]);
    }
    if (prints.length < 2) {
        output.innerHTML = '⚠️ 请保持 if 和 else 各有一个 print 语句';
        output.style.color = '#ff9800';
        return;
    }

    var result = isTrue ? prints[0] : prints[1];

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var resultLine = document.createElement('div');
    resultLine.textContent = result;
    resultLine.style.fontSize = '18px';
    resultLine.style.fontWeight = '600';
    resultLine.style.color = '#ffffff';
    resultLine.style.marginTop = '6px';
    output.appendChild(resultLine);
}

function runCh4Mood() {
    var score = parseInt(document.getElementById('ch4-mood').value) || 7;
    var resultDiv = document.getElementById('ch4-mood-result');
    var textDiv = document.getElementById('ch4-mood-text');
    var adviceDiv = document.getElementById('ch4-mood-advice');

    var emoji, text, advice;
    if (score >= 8) {
        emoji = '😄'; text = '心情很好！'; advice = '今天是个美好的一天，继续保持！';
    } else if (score >= 5) {
        emoji = '😊'; text = '心情不错'; advice = '保持平常心，一切都会好的。';
    } else if (score >= 3) {
        emoji = '😐'; text = '心情一般'; advice = '试试听首歌或出去走走？';
    } else {
        emoji = '😢'; text = '心情不太好'; advice = '没关系，每个人都会有低谷，明天会更好！';
    }

    if (resultDiv) resultDiv.textContent = emoji;
    if (textDiv) textDiv.textContent = text;
    if (adviceDiv) adviceDiv.textContent = advice;
}

// 第4章拖拽积木初始化
(function initCh4DragDrop() {
    var observer = new MutationObserver(function() {
        var blocks = document.querySelectorAll('.ch4-block');
        var assembly = document.getElementById('ch4-assembly');
        if (blocks.length > 0 && assembly) {
            initBlockAssembly(blocks, assembly);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

// 第4章积木组装检查：校验组装区积木块顺序是否正确
function checkCh4Assembly() {
    var assembly = document.getElementById('ch4-assembly');
    var result = document.getElementById('ch4-lab-result');
    if (!assembly || !result) return;

    var correct = ['if', 'print1', 'else', 'print2'];
    var blocks = assembly.querySelectorAll('.ch4-block');
    var order = [];
    for (var i = 0; i < blocks.length; i++) {
        order.push(blocks[i].getAttribute('data-block'));
    }

    var isCorrect = order.length === correct.length;
    if (isCorrect) {
        for (var k = 0; k < correct.length; k++) {
            if (order[k] !== correct[k]) {
                isCorrect = false;
                break;
            }
        }
    }

    if (isCorrect) {
        result.innerHTML = '✅ 组装正确！if score >= 60 判断成绩是否及格。';
        result.style.color = '#04AA6D';
    } else if (blocks.length === 0) {
        result.innerHTML = '💡 请先把积木块拖到组装区再检查。';
        result.style.color = '#ff9800';
    } else {
        result.innerHTML = '❌ 组装不正确，请再想想：先判断条件（if），再写满足条件的输出，然后是 else 分支。';
        result.style.color = '#ff4d4f';
    }
}

// ============================================================
// 第5章：if进阶
// ============================================================
function checkCh5Quiz() { checkQuiz(5); }

function runCh5Practice() {
    var codeEl = document.getElementById('ch5-practice-code');
    var output = document.getElementById('ch5-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    // 提取 age / height 值
    var age = 14, height = 150;
    var ageM = code.match(/\bage\s*=\s*(-?\d+(?:\.\d+)?)/);
    var hiM = code.match(/\bheight\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (ageM) age = parseFloat(ageM[1]);
    if (hiM) height = parseFloat(hiM[1]);

    // 提取逻辑运算符（age >= 12 ____ height >= 140 中的 ____）
    var op = '';
    var opM = code.match(/\bif\s+age\s*>=\s*\d+(?:\.\d+)?\s+(\S+)\s+height\b/);
    if (opM) op = opM[1];

    // 提取两个 print 内容（if 分支 + else 分支）
    var prints = [];
    var re = /print\s*\(\s*["'](.*?)["']\s*\)/g;
    var m;
    while ((m = re.exec(code)) !== null) prints.push(m[1]);

    if (op === '' || op.indexOf('_') >= 0 || prints.length < 2 || prints[0].indexOf('_') >= 0 || prints[1].indexOf('_') >= 0) {
        output.innerHTML = '💡 请先补全空白：逻辑运算符（and/or）和两个 print 内容！';
        output.style.color = '#ff9800';
        return;
    }

    var leftOk = age >= 12;
    var rightOk = height >= 140;
    var cond;
    if (op === 'and') cond = leftOk && rightOk;
    else if (op === 'or') cond = leftOk || rightOk;
    else {
        output.innerHTML = '⚠️ 逻辑运算符请使用 and 或 or';
        output.style.color = '#ff9800';
        return;
    }

    var result = cond ? prints[0] : prints[1];

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.textContent = result;
    r.style.cssText = 'font-size:18px;font-weight:600;color:#fff;margin-top:6px;';
    output.appendChild(r);
}

function updateCh5Bulb() {
    var s1 = document.getElementById('ch5-switch1');
    var s2 = document.getElementById('ch5-switch2');
    var s3 = document.getElementById('ch5-switch3');
    var bulb = document.getElementById('ch5-bulb');
    var text = document.getElementById('ch5-bulb-text');

    if (!s1 || !s2 || !s3 || !bulb || !text) return;

    var allOn = s1.checked && s2.checked && s3.checked;
    if (allOn) {
        bulb.textContent = '💡';
        text.textContent = '灯泡亮了！';
        text.style.color = '#a6e22e';
    } else {
        bulb.textContent = '🔌';
        text.textContent = '灯泡灭了...';
        text.style.color = '#ff4d4f';
    }
}

function runCh5Equip() {
    var level = parseInt(document.getElementById('ch5-level').value) || 0;
    var gold = parseInt(document.getElementById('ch5-gold').value) || 0;
    var isVip = document.getElementById('ch5-vip').checked;
    var result = document.getElementById('ch5-equip-result');
    var text = document.getElementById('ch5-equip-text');
    var reason = document.getElementById('ch5-equip-reason');

    if (!result || !text || !reason) return;

    var canBuy = (level >= 10 && gold >= 1000) || isVip;
    if (canBuy) {
        result.textContent = '✅';
        text.textContent = '可以购买！';
        if (isVip) {
            reason.textContent = 'VIP会员无需检查等级和金币';
        } else {
            reason.textContent = '等级≥10 且 金币≥1000，满足条件';
        }
    } else {
        result.textContent = '🔒';
        text.textContent = '无法购买';
        var reasons = [];
        if (level < 10) reasons.push('等级不足(需≥10)');
        if (gold < 1000) reasons.push('金币不足(需≥1000)');
        reason.textContent = reasons.join('，');
    }
}

// ============================================================
// 第6章：while循环
// ============================================================
function checkCh6Quiz() { checkQuiz(6); }

function runCh6Practice() {
    var codeEl = document.getElementById('ch6-practice-code');
    var output = document.getElementById('ch6-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    // 提取 count 初始值
    var count = 5;
    var cm = code.match(/\bcount\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (cm) count = parseFloat(cm[1]);

    // 提取循环关键字（____ count > 0: 中的 ____）
    var kw = '';
    var kwM = code.match(/^\s*(\w+)\s+count\s*>/m);
    if (kwM) kw = kwM[1];

    // 提取递减表达式（count = ____）
    var dec = '';
    var decM = code.match(/count\s*=\s*(.+)/);
    if (decM) dec = decM[1].replace(/#.*$/, '').trim();

    if (kw === '' || kw.indexOf('_') >= 0 || dec === '' || dec.indexOf('_') >= 0) {
        output.innerHTML = '💡 请先补全空白：循环关键字（while）和递减表达式（count - 1）';
        output.style.color = '#ff9800';
        return;
    }

    if (kw !== 'while') {
        output.innerHTML = '⚠️ 循环关键字应使用 while';
        output.style.color = '#ff9800';
        return;
    }

    // 解析递减步长：支持 count = count - 1 或 count -= 1
    var step = 0;
    if (/count\s*-\s*\d+/.test(dec)) {
        var n = dec.match(/count\s*-\s*(\d+)/);
        step = -(n ? parseFloat(n[1]) : 1);
    } else if (/-\s*=\s*\d+/.test(dec)) {
        var n2 = dec.match(/-\s*=\s*(\d+)/);
        step = -(n2 ? parseFloat(n2[1]) : 1);
    }

    if (step === 0) {
        output.innerHTML = '⚠️ 请使用 count = count - 1 或 count -= 1 让倒计时递减';
        output.style.color = '#ff9800';
        return;
    }

    // 模拟倒计时
    var lines = [];
    var cur = count;
    var guard = 0;
    while (cur > 0 && guard < 100) {
        lines.push(String(cur));
        cur += step;
        guard++;
    }
    lines.push('发射！');

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.textContent = lines.join('\n');
    r.style.cssText = 'font-size:16px;color:#fff;margin-top:6px;white-space:pre;';
    output.appendChild(r);
}

var ch6SecretNumber = 0;
function startCh6Carousel() {
    var carousel = document.getElementById('ch6-carousel');
    var carouselText = document.getElementById('ch6-carousel-text');
    if (!carousel) return;
    var items = ['🎁', '🎈', '🎉', '🎊', '🎀', '✨', '🌟', '💫'];
    var i = 0;
    if (carousel._interval) clearInterval(carousel._interval);
    carousel._interval = setInterval(function() {
        carousel.textContent = items[i % items.length];
        if (carouselText) carouselText.textContent = '旋转中... 第' + (i + 1) + '圈';
        i++;
    }, 200);
}

function guessCh6Number() {
    if (ch6SecretNumber === 0) {
        ch6SecretNumber = Math.floor(Math.random() * 100) + 1;
    }
    var guess = parseInt(document.getElementById('ch6-guess').value);
    var hint = document.getElementById('ch6-guess-hint');
    var result = document.getElementById('ch6-guess-result');

    if (!guess || guess < 1 || guess > 100) {
        if (hint) hint.textContent = '⚠️';
        if (result) { result.textContent = '请输入1-100之间的数字！'; result.style.color = '#ff4d4f'; }
        return;
    }

    if (guess === ch6SecretNumber) {
        if (hint) hint.textContent = '🎉';
        if (result) { result.textContent = '恭喜！猜对了！数字就是 ' + ch6SecretNumber; result.style.color = '#04AA6D'; }
        ch6SecretNumber = 0;
    } else if (guess < ch6SecretNumber) {
        if (hint) hint.textContent = '📈';
        if (result) { result.textContent = '太小了！再大一点'; result.style.color = '#ff9800'; }
    } else {
        if (hint) hint.textContent = '📉';
        if (result) { result.textContent = '太大了！再小一点'; result.style.color = '#ff9800'; }
    }
}

// ============================================================
// 第7章：break与continue
// ============================================================
function checkCh7Quiz() { checkQuiz(7); }

function runCh7Practice() {
    var codeEl = document.getElementById('ch7-practice-code');
    var output = document.getElementById('ch7-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    // 填空应为 continue
    if (code.indexOf('____') >= 0) {
        output.innerHTML = '💡 请先补全空白（continue）';
        output.style.color = '#ff9800';
        return;
    }

    if (!/\bcontinue\b/.test(code)) {
        output.innerHTML = '⚠️ 请使用 continue 跳过奇数';
        output.style.color = '#ff9800';
        return;
    }

    // 模拟：1~10 中奇数 continue，只打印偶数
    var evens = [];
    for (var i = 1; i <= 10; i++) {
        if (i % 2 !== 0) continue;
        evens.push(i);
    }

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.textContent = evens.join(' ');
    r.style.cssText = 'font-size:18px;font-weight:600;color:#fff;margin-top:6px;';
    output.appendChild(r);
}

function startCh7Line() {
    var line = document.getElementById('ch7-line');
    var lineMsg = document.getElementById('ch7-line-msg');
    if (!line) return;
    if (lineMsg) lineMsg.textContent = '🏭 流水线启动中...';
    var steps = ['📦 原料', '🔧 加工', '✅ 质检', '📮 包装', '🚚 出货'];
    var i = 0;
    if (line._interval) clearInterval(line._interval);
    line._interval = setInterval(function() {
        if (i < steps.length) {
            line.innerHTML = steps.slice(0, i + 1).join(' → ');
            if (lineMsg) lineMsg.textContent = '步骤 ' + (i + 1) + '/' + steps.length;
            i++;
        } else {
            line.innerHTML = '✅ 流水线完成！';
            if (lineMsg) lineMsg.textContent = '所有步骤已完成！';
            clearInterval(line._interval);
        }
    }, 500);
}

function simulateCh7Continue() {
    var output = document.getElementById('ch7-line-msg');
    if (!output) return;
    output.innerHTML = '<span style="color:#a6e22e;">模拟 continue：</span><br>' +
        'for i in range(1, 6):<br>' +
        '&nbsp;&nbsp;if i == 3: continue<br>' +
        '&nbsp;&nbsp;print(i)<br>' +
        '<span style="color:#ff9800;">输出：1 2 4 5（跳过了3）</span>';
}

function simulateCh7Break() {
    var output = document.getElementById('ch7-line-msg');
    if (!output) return;
    output.innerHTML = '<span style="color:#a6e22e;">模拟 break：</span><br>' +
        'for i in range(1, 6):<br>' +
        '&nbsp;&nbsp;if i == 3: break<br>' +
        '&nbsp;&nbsp;print(i)<br>' +
        '<span style="color:#ff9800;">输出：1 2（遇到3就停止了）</span>';
}

function startCh7Lottery() {
    var prizeEl = document.getElementById('ch7-prize');
    var textEl = document.getElementById('ch7-prize-text');
    var logEl = document.getElementById('ch7-lottery-log');
    if (!prizeEl || !textEl || !logEl) return;

    var prizes = [
        { emoji: '😅', text: '谢谢参与', weight: 40 },
        { emoji: '🎈', text: '三等奖', weight: 30 },
        { emoji: '🎁', text: '二等奖', weight: 20 },
        { emoji: '🏆', text: '一等奖', weight: 10 }
    ];

    var totalWeight = prizes.reduce(function(s, p) { return s + p.weight; }, 0);
    var rand = Math.random() * totalWeight;
    var cumulative = 0;
    var prize = prizes[0];

    for (var i = 0; i < prizes.length; i++) {
        cumulative += prizes[i].weight;
        if (rand <= cumulative) {
            prize = prizes[i];
            break;
        }
    }

    prizeEl.textContent = prize.emoji;
    textEl.textContent = prize.text;
    logEl.innerHTML = '抽奖结果：' + prize.emoji + ' ' + prize.text + '<br>' + logEl.innerHTML;

    if (prize.text === '一等奖') {
        setTimeout(function() {
            prizeEl.textContent = '🎁';
            textEl.textContent = '点击开始抽奖';
        }, 3000);
    }
}

// ============================================================
// 第8章：嵌套循环
// ============================================================
function checkCh8Quiz() { checkQuiz(8); }

function runCh8Practice() {
    var codeEl = document.getElementById('ch8-practice-code');
    var output = document.getElementById('ch8-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    // 提取两个 range 参数（外层=行数，内层=列数）
    var ranges = [];
    var re = /range\s*\(\s*(\d+)\s*\)/g;
    var m;
    while ((m = re.exec(code)) !== null) ranges.push(parseInt(m[1], 10));

    if (ranges.length < 2) {
        output.innerHTML = '💡 请先补全两个 range() 中的数字（外层控制行数、内层控制列数）';
        output.style.color = '#ff9800';
        return;
    }

    var rows = ranges[0];
    var cols = ranges[1];

    // 模拟嵌套循环输出星号矩阵
    var lines = [];
    for (var i = 0; i < rows; i++) {
        var rowArr = [];
        for (var j = 0; j < cols; j++) rowArr.push('*');
        lines.push(rowArr.join(' '));
    }

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.textContent = lines.join('\n');
    r.style.cssText = 'font-size:16px;color:#fff;margin-top:6px;white-space:pre;line-height:1.4;';
    output.appendChild(r);
}

function updateCh8Table() {
    var rows = parseInt(document.getElementById('ch8-rows').value) || 3;
    var cols = parseInt(document.getElementById('ch8-cols').value) || 3;
    var table = document.getElementById('ch8-table');
    if (!table) return;

    var html = '';
    for (var i = 1; i <= rows; i++) {
        for (var j = 1; j <= cols; j++) {
            html += j + '×' + i + '=' + (i * j) + ' ';
        }
        html += '<br>';
    }
    table.innerHTML = html;
}

function generateCh8Pattern() {
    var rows = parseInt(document.getElementById('ch8-pat-rows').value) || 5;
    var char = document.getElementById('ch8-pat-char').value || '⭐';
    var pattern = document.getElementById('ch8-pattern');
    if (!pattern) return;

    var html = '';
    for (var i = 1; i <= rows; i++) {
        html += escapeHtml(char).repeat(i) + '<br>';
    }
    pattern.innerHTML = html;
}

// ============================================================
// 第9章：综合练习
// ============================================================
function checkCh9Quiz() { checkQuiz(9); }

function runCh9Practice() {
    var codeEl = document.getElementById('ch9-practice-code');
    var output = document.getElementById('ch9-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    if (code.indexOf('____') >= 0) {
        output.innerHTML = '💡 请先补全四个 print 中的表达式（a+b、a-b、a*b、a/b）';
        output.style.color = '#ff9800';
        return;
    }

    // 提取四个 print 里的表达式
    var exprs = [];
    var re = /print\s*\(\s*([^)\n]+?)\s*\)/g;
    var m;
    while ((m = re.exec(code)) !== null) exprs.push(m[1].trim());

    if (exprs.length < 4) {
        output.innerHTML = '⚠️ 请保持四个 print 语句完整';
        output.style.color = '#ff9800';
        return;
    }

    // 用示例输入 a=10、b=5 分别求值
    var a = 10, b = 5;
    var opSymbols = ['+', '-', '*', '/'];
    var lines = [];
    for (var i = 0; i < 4; i++) {
        var val = calcCh9Expr(exprs[i], a, b);
        lines.push('op = "' + opSymbols[i] + '" → ' + val);
    }

    output.innerHTML = '▶ 运行结果（示例：a=10, b=5）：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.textContent = lines.join('\n');
    r.style.cssText = 'font-size:15px;color:#fff;margin-top:6px;white-space:pre;line-height:1.6;';
    output.appendChild(r);
}

function calcCh9Expr(expr, a, b) {
    var cleaned = expr.replace(/\s+/g, '');
    // 白名单：只允许 a/b、数字、四则运算和括号
    if (!/^[abAB0-9+\-*/().]+$/.test(cleaned)) return '表达式有误';
    var js = cleaned.replace(/\ba\b/g, String(a)).replace(/\bb\b/g, String(b));
    try {
        var v = (new Function('return (' + js + ');'))();
        return (typeof v === 'number' && isFinite(v)) ? String(v) : '表达式有误';
    } catch (e) {
        return '表达式有误';
    }
}

function calcCh9(op) {
    var num1 = parseFloat(document.getElementById('ch9-num1').value) || 0;
    var num2 = parseFloat(document.getElementById('ch9-num2').value) || 0;
    var resultEl = document.getElementById('ch9-calc-result');
    var formulaEl = document.getElementById('ch9-calc-formula');
    if (!resultEl) return;

    var result;
    if (op === '+') result = num1 + num2;
    else if (op === '-') result = num1 - num2;
    else if (op === '*') result = num1 * num2;
    else if (op === '/') result = num2 !== 0 ? (num1 / num2).toFixed(2) : '错误(除数不能为0)';

    resultEl.textContent = result;
    if (formulaEl) formulaEl.textContent = num1 + ' ' + op + ' ' + num2 + ' = ' + result;
}

// 第9章拖拽组装初始化
(function initCh9DragDrop() {
    var observer = new MutationObserver(function() {
        var blocks = document.querySelectorAll('.ch9-block');
        var assembly = document.getElementById('ch9-assembly');
        if (blocks.length > 0 && assembly) {
            initBlockAssembly(blocks, assembly);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

// ============================================================
// 第10章：字符串进阶
// ============================================================
function checkCh10Quiz() { checkQuiz(10); }

function runCh10Practice() {
    var codeEl = document.getElementById('ch10-practice-code');
    var output = document.getElementById('ch10-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    // 提取 range 上界（for i in range(1, N)）
    var rangeM = code.match(/range\s*\(\s*1\s*,\s*(\d+)\s*\)/);
    // 提取重复字符（print("X" * i)）
    var charM = code.match(/print\s*\(\s*["'](.*?)["']\s*\*\s*i\s*\)/);

    if (!rangeM || !charM) {
        output.innerHTML = '💡 请先补全空白：range 上界（6）和重复字符（"*"）';
        output.style.color = '#ff9800';
        return;
    }

    var n = parseInt(rangeM[1], 10);
    var ch = charM[1];

    if (ch.length === 0) {
        output.innerHTML = '⚠️ 请填一个要重复打印的字符，如 "*"';
        output.style.color = '#ff9800';
        return;
    }

    // 模拟直角三角形输出
    var lines = [];
    for (var i = 1; i < n; i++) {
        lines.push(ch.repeat(i));
    }

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.textContent = lines.join('\n');
    r.style.cssText = 'font-size:16px;color:#fff;margin-top:6px;white-space:pre;line-height:1.3;';
    output.appendChild(r);
}

function drawCh10Stars() {
    var rows = parseInt(document.getElementById('ch10-rows').value) || 5;
    var char = document.getElementById('ch10-char').value || '⭐';
    var canvas = document.getElementById('ch10-canvas');
    if (!canvas) return;
    var html = '';
    for (var i = 1; i <= rows; i++) {
        html += char.repeat(i) + '\n';
    }
    canvas.textContent = html;
}

function generateCh10Logo() {
    var size = parseInt(document.getElementById('ch10-logo-size').value) || 5;
    var char = document.getElementById('ch10-logo-char').value || '★';
    var logo = document.getElementById('ch10-logo');
    if (!logo) return;

    // 生成菱形图案
    var html = '';
    for (var i = 1; i <= size; i++) {
        html += '&nbsp;'.repeat(size - i) + escapeHtml(char).repeat(2 * i - 1) + '<br>';
    }
    for (var i = size - 1; i >= 1; i--) {
        html += '&nbsp;'.repeat(size - i) + escapeHtml(char).repeat(2 * i - 1) + '<br>';
    }
    logo.innerHTML = html;
}

// ============================================================
// 第11章：列表
// ============================================================
function checkCh11Quiz() { checkQuiz(11); }

function runCh11Practice() {
    var codeEl = document.getElementById('ch11-practice-code');
    var output = document.getElementById('ch11-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);
    if (code.indexOf("____") >= 0) {
        // 去除____后检查是否还有其他有意义的内容（学生可能在____前后输入了内容）
        var codeWithoutPH = code.replace(/_+/g, '').replace(/#.*$/gm, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        if (!/\w/.test(codeWithoutPH)) {
            output.innerHTML = "💡 请先补全代码中的空白（____）部分！";
            output.style.color = "#ff9800";
            return;
        }
    }

    var clean = preprocessCode(code);
    var hasList = clean.indexOf('[') >= 0 && clean.indexOf(']') >= 0;
    var hasAppend = /\bappend\b/.test(clean);
    var hasFor = /\bfor\b/.test(clean);

    output.innerHTML = '代码分析：<br>' +
        (hasList ? '✅ 包含列表 ✓<br>' : '💡 提示：用[]创建列表<br>') +
        (hasAppend ? '✅ 使用了append() ✓<br>' : '') +
        (hasFor ? '✅ 包含for循环 ✓<br>' : '');
    output.style.color = hasList ? '#04AA6D' : '#ff9800';
}

function addToCh11Cart(item) {
    var cart = document.getElementById('ch11-cart');
    var countEl = document.getElementById('ch11-cart-count');
    if (!cart || !item) return;

    var current = cart.textContent || '';
    if (current === '[]' || current === '' || current.indexOf('购物车是空的') >= 0) {
        cart.textContent = '[' + item + ']';
    } else {
        cart.textContent = current.replace(']', ', ' + item + ']');
    }
    // 更新商品数量
    if (countEl) {
        var items = cart.textContent.replace('[', '').replace(']', '').split(', ');
        countEl.textContent = '共' + items.length + '件商品';
    }
}

function addCh11Friend() {
    var nameInput = document.getElementById('ch11-friend-name');
    var friendsEl = document.getElementById('ch11-friends');
    if (!nameInput || !friendsEl) return;
    var name = nameInput.value.trim();
    if (!name) return;
    var current = friendsEl.textContent || '';
    if (current === '[]' || current === '') {
        friendsEl.textContent = '[' + name + ']';
    } else {
        friendsEl.textContent = current.replace(']', ', ' + name + ']');
    }
    nameInput.value = '';
}

// ============================================================
// 第12章：列表操作
// ============================================================
function checkCh12Quiz() { checkQuiz(12); }

function runCh12Practice() {
    var codeEl = document.getElementById('ch12-practice-code');
    var output = document.getElementById('ch12-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);
    if (code.indexOf("____") >= 0) {
        // 去除____后检查是否还有其他有意义的内容（学生可能在____前后输入了内容）
        var codeWithoutPH = code.replace(/_+/g, '').replace(/#.*$/gm, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        if (!/\w/.test(codeWithoutPH)) {
            output.innerHTML = "💡 请先补全代码中的空白（____）部分！";
            output.style.color = "#ff9800";
            return;
        }
    }

    var clean = preprocessCode(code);
    var ops = [];
    if (/\bappend\b/.test(clean)) ops.push('append()');
    if (/\bpop\b/.test(clean)) ops.push('pop()');
    if (/\bsort\b/.test(clean)) ops.push('sort()');
    if (/\bremove\b/.test(clean)) ops.push('remove()');

    output.innerHTML = '使用的方法：' + (ops.length > 0 ? ops.join(', ') : '无') + '<br>';
    output.style.color = ops.length > 0 ? '#04AA6D' : '#ff9800';
}

var ch12ListData = [3, 1, 4, 1, 5, 9];

function opCh12List(op) {
    var listEl = document.getElementById('ch12-list');
    var infoEl = document.getElementById('ch12-list-info');
    if (!listEl) return;

    if (op === 'append') {
        ch12ListData.push(Math.floor(Math.random() * 10));
    } else if (op === 'pop') {
        if (ch12ListData.length > 0) ch12ListData.pop();
    } else if (op === 'sort') {
        ch12ListData.sort(function(a, b) { return a - b; });
    } else if (op === 'reset') {
        ch12ListData = [3, 1, 4, 1, 5, 9];
    }

    listEl.textContent = '[' + ch12ListData.join(', ') + ']';
    if (infoEl) infoEl.textContent = '长度: ' + ch12ListData.length;
}

function addCh12Score() {
    var scoreInput = document.getElementById('ch12-score');
    var scoresEl = document.getElementById('ch12-scores');
    var statsEl = document.getElementById('ch12-stats');
    if (!scoreInput || !scoresEl) return;
    var score = parseInt(scoreInput.value);
    if (isNaN(score) || score < 0 || score > 100) return;

    if (!window._ch12Scores) window._ch12Scores = [];
    window._ch12Scores.push(score);
    scoresEl.textContent = '[' + window._ch12Scores.join(', ') + ']';
    scoreInput.value = '';

    if (statsEl && window._ch12Scores.length > 0) {
        var sum = window._ch12Scores.reduce(function(a, b) { return a + b; }, 0);
        var avg = (sum / window._ch12Scores.length).toFixed(1);
        var max = Math.max.apply(null, window._ch12Scores);
        var min = Math.min.apply(null, window._ch12Scores);
        statsEl.textContent = '平均: ' + avg + ' | 最高: ' + max + ' | 最低: ' + min;
    }
}

// ============================================================
// 第13章：元组与集合
// ============================================================
function checkCh13Quiz() { checkQuiz(13); }

function runCh13Practice() {
    var codeEl = document.getElementById('ch13-practice-code');
    var output = document.getElementById('ch13-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);
    if (code.indexOf("____") >= 0) {
        // 去除____后检查是否还有其他有意义的内容（学生可能在____前后输入了内容）
        var codeWithoutPH = code.replace(/_+/g, '').replace(/#.*$/gm, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        if (!/\w/.test(codeWithoutPH)) {
            output.innerHTML = "💡 请先补全代码中的空白（____）部分！";
            output.style.color = "#ff9800";
            return;
        }
    }


    var clean = preprocessCode(code);
    var hasTuple = clean.indexOf('(') >= 0;
    var hasSet = clean.indexOf('{') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasTuple ? '✅ 包含元组/集合 ✓<br>' : '💡 提示：用()创建元组，用{}创建集合<br>');
    output.style.color = hasTuple ? '#04AA6D' : '#ff9800';
}

// 第13章拖拽初始化
(function initCh13DragDrop() {
    var observer = new MutationObserver(function() {
        var items = document.querySelectorAll('.ch13-drag-item');
        var zones = document.querySelectorAll('.ch13-zone');
        if (items.length > 0 && zones.length > 0) {
            initDragDrop(items, zones, 'ch13-lab-score');
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

var ch13LotteryPool = [];

function lotteryNoRepeat() {
    var resultEl = document.getElementById('ch13-lottery-result');
    if (!resultEl) return;
    var prizes = ['🎁 文具套装', '📚 笔记本', '🖊️ 钢笔', '🎨 水彩笔', '🧮 计算器', '📐 尺子套装', '🎒 书包', '🏆 大奖'];

    if (ch13LotteryPool.length >= prizes.length) {
        resultEl.innerHTML = '🎉 所有奖品都已抽完！<br>' + resultEl.innerHTML;
        return;
    }

    var available = [];
    for (var i = 0; i < prizes.length; i++) {
        if (ch13LotteryPool.indexOf(i) === -1) available.push(i);
    }
    var idx = available[Math.floor(Math.random() * available.length)];
    ch13LotteryPool.push(idx);
    resultEl.innerHTML = '🎯 抽中了：' + prizes[idx] + '<br>' + resultEl.innerHTML;
}

// ============================================================
// 第14章：字典
// ============================================================
function checkCh14Quiz() { checkQuiz(14); }

function runCh14Practice() {
    var codeEl = document.getElementById('ch14-practice-code');
    var output = document.getElementById('ch14-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    // 提取英语分数、访问的键、.items() 对象
    var engM = code.match(/scores\["英语"\]\s*=\s*(\d+(?:\.\d+)?)/);
    var keyM = code.match(/print\s*\(\s*scores\["([^"]*)"\]/);
    var itemsM = code.match(/(\w+)\s*\.items\s*\(/);

    if (!engM || !keyM || !itemsM) {
        output.innerHTML = '💡 请先补全空白：英语分数、访问的键、.items() 的对象';
        output.style.color = '#ff9800';
        return;
    }

    var eng = parseFloat(engM[1]);
    var key = keyM[1];
    var obj = itemsM[1];

    var scores = { '语文': 85, '数学': 92, '英语': eng };

    var lines = [];
    var access = scores[key];
    if (access !== undefined) {
        lines.push('print 访问 "' + key + '" → ' + access);
    } else {
        lines.push('⚠️ 字典里没有键 "' + key + '"');
    }
    if (obj === 'scores') {
        for (var k in scores) lines.push(k + ' ' + scores[k]);
    } else {
        lines.push('⚠️ items() 应调用在 scores 上');
    }

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.textContent = lines.join('\n');
    r.style.cssText = 'font-size:15px;color:#fff;margin-top:6px;white-space:pre;line-height:1.6;';
    output.appendChild(r);
}

function queryCh14Dict() {
    var key = document.getElementById('ch14-dict-key').value.trim();
    var result = document.getElementById('ch14-dict-result');
    if (!result) return;

    // 电话本数据
    var phoneBook = { '小明': '13800138000', '小红': '13900139000', '小刚': '13700137000' };

    if (!key) {
        result.innerHTML = '💡 请输入姓名查询，如：<b>小明</b>、<b>小红</b>、<b>小刚</b>';
        result.style.color = '#ff9800';
    } else if (phoneBook[key]) {
        result.innerHTML = '<b>' + escapeHtml(key) + '</b> 的电话：' + escapeHtml(phoneBook[key]) + '<br><span style="font-size:12px;color:#888;">可查询：小明、小红、小刚</span>';
        result.style.color = '#04AA6D';
    } else {
        result.innerHTML = '❌ 未找到 "<b>' + escapeHtml(key) + '</b>"<br><span style="font-size:12px;color:#888;">可查询：小明、小红、小刚</span>';
        result.style.color = '#ff4d4f';
    }
}

function queryCh14Book() {
    var bookName = document.getElementById('ch14-book-name').value.trim();
    var resultEl = document.getElementById('ch14-book-result');
    if (!resultEl) return;

    var library = {
        'Python入门': '张三',
        '算法导论': '李四',
        '数据结构': '王五',
        '计算机网络': '赵六',
        '操作系统': '钱七'
    };

    if (library[bookName]) {
        resultEl.textContent = '《' + bookName + '》作者：' + library[bookName];
        resultEl.style.color = '#04AA6D';
    } else if (bookName === '') {
        resultEl.textContent = '请输入书名进行查询';
        resultEl.style.color = '#ff9800';
    } else {
        resultEl.textContent = '未找到《' + bookName + '》';
        resultEl.style.color = '#ff4d4f';
    }
}

// ============================================================
// 第15章：字符串操作
// ============================================================
function checkCh15Quiz() { checkQuiz(15); }

function runCh15Practice() {
    var codeEl = document.getElementById('ch15-practice-code');
    var output = document.getElementById('ch15-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);

    if (code.indexOf('____') >= 0) {
        output.innerHTML = '💡 请先补全空白：去空格方法、转大写方法、切片索引';
        output.style.color = '#ff9800';
        return;
    }

    var stripM = code.match(/text\s*=\s*text\s*\.\s*([a-zA-Z_]+)\s*\(/);
    var upperM = code.match(/print\s*\(\s*text\s*\.\s*([a-zA-Z_]+)\s*\(/);
    var sliceM = code.match(/text\s*\[\s*(-?\d+)\s*:\s*(-?\d+)\s*\]/);

    var stripMethod = stripM ? stripM[1] : 'strip';
    var upperMethod = upperM ? upperM[1] : 'upper';
    var a = sliceM ? parseInt(sliceM[1], 10) : 6;
    var b = sliceM ? parseInt(sliceM[2], 10) : 12;

    // 去空格后的结果
    var base = 'Hello Python World';

    var upperText;
    if (upperMethod === 'upper') upperText = base.toUpperCase();
    else if (upperMethod === 'lower') upperText = base.toLowerCase();
    else upperText = base.toUpperCase(); // 其他方法也按大写展示（简化）

    var sliceText = base.slice(a, b);

    output.innerHTML = '▶ 运行结果：';
    output.style.color = '#a6e22e';
    var r = document.createElement('div');
    r.style.cssText = 'font-size:15px;color:#fff;margin-top:6px;white-space:pre;line-height:1.6;';
    r.textContent = stripMethod + '(): "' + base + '"\n' + upperMethod + '(): ' + upperText + '\n切片[' + a + ':' + b + ']: ' + sliceText;
    output.appendChild(r);
}

function sliceCh15Str() {
    var textEl = document.getElementById('ch15-str-input');
    var startEl = document.getElementById('ch15-slice-start');
    var endEl = document.getElementById('ch15-slice-end');
    var result = document.getElementById('ch15-slice-result');
    if (!textEl || !startEl || !endEl || !result) return;

    var text = textEl.value || 'Python';
    var start = parseInt(startEl.value) || 0;
    var end = parseInt(endEl.value) || 3;
    result.textContent = text.slice(start, end);
}

function encryptCh15() {
    var msg = document.getElementById('ch15-msg').value;
    var cipherEl = document.getElementById('ch15-cipher');
    if (!cipherEl || !msg) return;
    // 反转 + 简单替换加密
    var encrypted = msg.split('').reverse().join('');
    // 将每个字符的编码+1
    var enhanced = '';
    for (var i = 0; i < encrypted.length; i++) {
        enhanced += String.fromCharCode(encrypted.charCodeAt(i) + 1);
    }
    cipherEl.textContent = enhanced;
}

// ============================================================
// 第16章：函数
// ============================================================
function checkCh16Quiz() { checkQuiz(16); }

function runCh16Practice() {
    var codeEl = document.getElementById('ch16-practice-code');
    var output = document.getElementById('ch16-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);
    if (code.indexOf("____") >= 0) {
        // 去除____后检查是否还有其他有意义的内容（学生可能在____前后输入了内容）
        var codeWithoutPH = code.replace(/_+/g, '').replace(/#.*$/gm, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        if (!/\w/.test(codeWithoutPH)) {
            output.innerHTML = "💡 请先补全代码中的空白（____）部分！";
            output.style.color = "#ff9800";
            return;
        }
    }

    var clean = preprocessCode(code);
    var hasDef = /\bdef\b/.test(clean);
    var hasReturn = /\breturn\b/.test(clean);
    var hasCall = (clean.match(/[a-zA-Z_]+\s*\(/g) || []).length >= 2;

    output.innerHTML = '代码分析：<br>' +
        (hasDef ? '✅ 定义了函数 ✓<br>' : '💡 提示：用def定义函数<br>') +
        (hasReturn ? '✅ 包含return ✓<br>' : '') +
        (hasCall ? '✅ 调用了函数 ✓<br>' : '💡 提示：记得调用函数<br>');
    output.style.color = (hasDef && hasCall) ? '#04AA6D' : '#ff9800';
}

function updateCh16Test() {
    var dataType = document.getElementById('ch16-data-type').value;
    var result = document.getElementById('ch16-test-result');
    if (!result) return;

    var dataMap = {
        'list': { data: [1, 5, 3, 2, 4], label: '列表 [1, 5, 3, 2, 4]' },
        'str': { data: 'Python', label: '字符串 "Python"' },
        'tuple': { data: [10, 20, 30], label: '元组 (10, 20, 30)' }
    };

    var info = dataMap[dataType];
    if (!info) return;

    var d = info.data;
    var html = '<strong>' + info.label + '</strong><br>';
    html += 'len() = ' + d.length + '<br>';

    if (dataType === 'str') {
        html += 'upper() = "' + d.toUpperCase() + '"<br>';
        html += '类型: str → ' + typeof d + '<br>';
    } else {
        var arr = Array.isArray(d) ? d : [d];
        html += 'max() = ' + Math.max.apply(null, arr) + '<br>';
        html += 'min() = ' + Math.min.apply(null, arr) + '<br>';
        html += 'sum() = ' + arr.reduce(function(a, b) { return a + b; }, 0) + '<br>';
        html += '类型: ' + (Array.isArray(d) ? 'list' : 'tuple') + '<br>';
    }
    html += 'bool() = ' + (d ? 'True' : 'False');

    result.innerHTML = html;
    result.style.color = '#a6e22e';
}

function testCh16Func() {
    updateCh16Test();
}

// ============================================================
// 第17章：二进制
// ============================================================
function checkCh17Quiz() { checkQuiz(17); }

function runCh17Practice() {
    var codeEl = document.getElementById('ch17-practice-code');
    var output = document.getElementById('ch17-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);
    if (code.indexOf("____") >= 0) {
        // 去除____后检查是否还有其他有意义的内容（学生可能在____前后输入了内容）
        var codeWithoutPH = code.replace(/_+/g, '').replace(/#.*$/gm, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        if (!/\w/.test(codeWithoutPH)) {
            output.innerHTML = "💡 请先补全代码中的空白（____）部分！";
            output.style.color = "#ff9800";
            return;
        }
    }

    var clean = preprocessCode(code);
    var hasBin = /\bbin\b/.test(clean);
    var hasInt = /\bint\b/.test(clean);

    output.innerHTML = '代码分析：<br>' +
        (hasBin ? '✅ 使用了bin() ✓<br>' : '') +
        (hasInt ? '✅ 使用了int()转换 ✓<br>' : '');
    output.style.color = (hasBin || hasInt) ? '#04AA6D' : '#ff9800';
}

function toggleCh17Bit(bit) {
    var bulb = document.getElementById('ch17-bit' + bit);
    var decimal = document.getElementById('ch17-decimal');
    var binary = document.getElementById('ch17-binary');
    if (!bulb || !decimal) return;

    // 切换灯泡状态
    if (bulb.style.background === 'rgb(255, 193, 7)' || bulb.style.background === '#ffc107') {
        bulb.style.background = '#333';
        bulb.style.boxShadow = 'none';
    } else {
        bulb.style.background = '#ffc107';
        bulb.style.boxShadow = '0 0 20px #ffc107';
    }

    // 计算十进制值
    var value = 0;
    var binStr = '';
    for (var i = 3; i >= 0; i--) {
        var b = document.getElementById('ch17-bit' + i);
        var isOn = b && (b.style.background === 'rgb(255, 193, 7)' || b.style.background === '#ffc107');
        binStr = (isOn ? '1' : '0') + binStr;
        if (isOn) value += Math.pow(2, i);
    }
    decimal.textContent = value;
    if (binary) binary.textContent = '二进制: ' + binStr;
}

function convertCh17Base() {
    var input = document.getElementById('ch17-dec-input');
    var result = document.getElementById('ch17-convert-result');
    if (!input || !result) return;
    var n = parseInt(input.value) || 0;
    result.innerHTML = '二进制: ' + n.toString(2) + '<br>八进制: ' + n.toString(8) + '<br>十六进制: ' + n.toString(16).toUpperCase();
}

// ============================================================
// 第18章：编程思维
// ============================================================
function checkCh18Quiz() { checkQuiz(18); }

function runCh18Practice() {
    runPractice(18, function(code) {
        var hasSteps = code.split('\n').filter(function(l) { return l.trim().length > 0; }).length >= 3;
        return {
            html: hasSteps ? '✅ 你描述了算法步骤，很好！<br>' + escapeHtml(code) : '💡 提示：用自然语言描述解题步骤（至少3步）',
            color: hasSteps ? '#04AA6D' : '#ff9800'
        };
    });
}

var ch18Order = [];
var ch18Total = 0;

function orderCh18(item, price) {
    ch18Order.push(item);
    ch18Total += price;
    var orderEl = document.getElementById('ch18-order');
    var totalEl = document.getElementById('ch18-total');
    if (orderEl) orderEl.textContent = ch18Order.join(' + ');
    if (totalEl) totalEl.textContent = '总计: ¥' + ch18Total;
}

// 第18章流程图拼图 — 检查函数
function checkCh18Flowchart() {
    var assembly = document.getElementById('ch18-assembly');
    var result = document.getElementById('ch18-flowchart-result');
    if (!assembly || !result) return;

    var blocks = assembly.querySelectorAll('.ch18-block');
    var order = [];
    blocks.forEach(function(b) {
        order.push(b.getAttribute('data-block'));
    });

    var correctOrder = ['start', 'input', 'judge', 'pass', 'fail', 'end'];
    var altCorrect = ['start', 'input', 'judge', 'fail', 'pass', 'end']; // 两种分支顺序都正确

    // 将整个顺序与两个有效顺序逐一比对，避免混合匹配
    var isCorrect = (order.length === correctOrder.length) &&
        (order.every(function(v, i) { return v === correctOrder[i]; }) ||
         order.every(function(v, i) { return v === altCorrect[i]; }));

    if (isCorrect) {
        result.innerHTML = '✅ 正确！流程图顺序：开始 → 输入 → 判断 → 输出 → 结束';
        result.style.color = '#04AA6D';
    } else {
        result.innerHTML = '❌ 顺序不对哦！正确顺序：开始 → 输入成绩 → 判断成绩 → 输出结果 → 结束';
        result.style.color = '#ff4d4f';
    }
}

// 第18章拖拽初始化
(function initCh18DragDrop() {
    var observer = new MutationObserver(function() {
        var blocks = document.querySelectorAll('.ch18-block');
        var assembly = document.getElementById('ch18-assembly');
        if (blocks.length > 0 && assembly) {
            initBlockAssembly(blocks, assembly);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

// ============================================================
// 第19章：综合复习
// ============================================================
function checkCh19Quiz() { checkQuiz(19); }

function runCh19Practice() {
    var codeEl = document.getElementById('ch19-practice-code');
    var output = document.getElementById('ch19-practice-output');
    if (!codeEl || !output) return;
    var code = getPracticeCode(codeEl);
    if (code.indexOf("____") >= 0) {
        // 去除____后检查是否还有其他有意义的内容（学生可能在____前后输入了内容）
        var codeWithoutPH = code.replace(/_+/g, '').replace(/#.*$/gm, '').replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        if (!/\w/.test(codeWithoutPH)) {
            output.innerHTML = "💡 请先补全代码中的空白（____）部分！";
            output.style.color = "#ff9800";
            return;
        }
    }

    var clean = preprocessCode(code);
    var features = [];
    if (/\bprint\b/.test(clean)) features.push('打印输出');
    if (/\bif\b/.test(clean)) features.push('条件判断');
    if (/\bfor\b/.test(clean) || /\bwhile\b/.test(clean)) features.push('循环');
    if (clean.indexOf('[') >= 0) features.push('列表');
    if (/\bdef\b/.test(clean)) features.push('函数');

    output.innerHTML = '代码包含以下知识点：<br>' +
        (features.length > 0 ? features.map(function(f) { return '✅ ' + f; }).join('<br>') : '💡 写一个综合性的Python程序吧！');
    output.style.color = features.length > 0 ? '#04AA6D' : '#ff9800';
}

function updateCh19Display() {
    var num = parseInt(document.getElementById('ch19-num').value) || 0;
    var display = document.getElementById('ch19-display');
    if (!display) return;
    display.innerHTML = '十进制: ' + num + '<br>二进制: 0b' + num.toString(2) + '<br>八进制: 0o' + num.toString(8) + '<br>十六进制: 0x' + num.toString(16).toUpperCase() + '<br>浮点: ' + num + '.0<br>布尔: ' + (num ? 'True' : 'False');
}

function convertCh19Base() {
    var input = document.getElementById('ch19-base-input');
    var result = document.getElementById('ch19-base-result');
    if (!input || !result) return;
    var n = parseInt(input.value) || 0;
    result.innerHTML = '二进制: ' + n.toString(2) + '<br>八进制: ' + n.toString(8) + '<br>十六进制: ' + n.toString(16).toUpperCase() + '<br>bool: ' + (n ? 'True' : 'False');
}

// ============================================================
// 通用拖拽分类功能
// ============================================================
function initDragDrop(items, zones, scoreId) {
    var correctCount = 0;
    var totalItems = items.length;

    items.forEach(function(item) {
        item.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', item.getAttribute('data-type'));
            item.style.opacity = '0.5';
        });
        item.addEventListener('dragend', function() {
            item.style.opacity = '1';
        });
    });

    zones.forEach(function(zone) {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.style.background = 'rgba(255,255,255,0.1)';
        });
        zone.addEventListener('dragleave', function() {
            zone.style.background = '';
        });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.style.background = '';
            var dataType = e.dataTransfer.getData('text/plain');
            var acceptType = zone.getAttribute('data-accept');

            if (dataType === acceptType) {
                correctCount++;
                zone.style.borderColor = '#04AA6D';
            } else {
                zone.style.borderColor = '#ff4d4f';
            }

            var scoreEl = document.getElementById(scoreId);
            if (scoreEl) {
                scoreEl.textContent = '正确: ' + correctCount + '/' + totalItems;
                scoreEl.style.color = correctCount >= totalItems ? '#04AA6D' : '#ff9800';
            }
        });
    });
}

// ============================================================
// 通用积木组装功能
// ============================================================
function initBlockAssembly(blocks, assembly) {
    // 打乱积木块初始顺序，避免学生直接按现有顺序组装
    var arr = Array.prototype.slice.call(blocks);
    if (arr.length > 1) {
        var parent = arr[0].parentElement;
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        if (parent) {
            arr.forEach(function(el) { parent.appendChild(el); });
        }
    }

    blocks.forEach(function(block) {
        block.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', block.getAttribute('data-block'));
            block.style.opacity = '0.5';
        });
        block.addEventListener('dragend', function() {
            block.style.opacity = '1';
        });
    });

    assembly.addEventListener('dragover', function(e) {
        e.preventDefault();
        assembly.style.borderColor = '#04AA6D';
    });
    assembly.addEventListener('dragleave', function() {
        assembly.style.borderColor = '';
    });
    assembly.addEventListener('drop', function(e) {
        e.preventDefault();
        assembly.style.borderColor = '';
        var blockType = e.dataTransfer.getData('text/plain');
        var draggedEl = document.querySelector('[data-block="' + blockType + '"]');
        if (draggedEl) {
            var clone = draggedEl.cloneNode(true);
            clone.draggable = false;
            clone.style.opacity = '1';
            clone.style.cursor = 'default';
            if (assembly.textContent.indexOf('拖到这里') >= 0) {
                assembly.textContent = '';
            }
            assembly.appendChild(clone);
        }
    });
}

// ============================================================
// 步进式课堂小测引擎 - 统一所有章节的小测交互
// ============================================================
function renderStepByStepQuiz(chapterNum, rawHTML, accentColor) {
    // 解析原始HTML，提取题目数据
    var questions = [];
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHTML;

    // 提取标题
    var titleEl = tempDiv.querySelector('h2');
    var quizTitle = titleEl ? titleEl.textContent : '第' + chapterNum + '章 课堂小测';

    // 查找所有题目卡片（w3-card-2）
    var cards = tempDiv.querySelectorAll('.w3-card-2, .w3-card');
    cards.forEach(function(card, idx) {
        var h4 = card.querySelector('h4');
        if (!h4) return;

        var questionText = h4.textContent.replace(/^\d+\.\s*/, '').trim();
        var options = [];
        var correctIndex = -1;

        var labels = card.querySelectorAll('label');
        labels.forEach(function(label, optIdx) {
            var radio = label.querySelector('input[type="radio"]');
            var text = label.textContent.replace(/^\s*[A-D][.、]\s*/, '').trim();
            options.push(text);
            if (radio && radio.getAttribute('data-correct') === 'true') {
                correctIndex = optIdx;
            }
        });

        if (options.length > 0) {
            questions.push({
                question: questionText,
                options: options,
                correct: correctIndex,
                userAnswer: -1
            });
        }
    });

    if (questions.length === 0) return rawHTML; // 无法解析则返回原始内容

    var totalQuestions = questions.length;
    var accentBg = hexToRgba(accentColor, 0.1);
    var currentIdx = 0;
    var submitted = false;
    var score = 0;

    // 生成HTML
    var html = '<div class="ch-step-quiz" style="--ch-accent:' + accentColor + ';--ch-accent-bg:' + accentBg + ';" id="stepQuiz-' + chapterNum + '">';
    html += '<div class="ch-step-quiz-header">';
    html += '<h2 style="color:' + accentColor + ';">' + quizTitle + '</h2>';
    html += '<p class="ch-step-quiz-subtitle">共 ' + totalQuestions + ' 题，点击选项作答，答完提交</p>';
    html += '</div>';

    // 进度条
    html += '<div class="ch-step-quiz-progress-wrap">';
    html += '<div class="ch-step-quiz-progress-bar"><div class="ch-step-quiz-progress-fill" id="sq-progress-' + chapterNum + '" style="width:0%"></div></div>';
    html += '<span class="ch-step-quiz-progress-text" id="sq-progress-text-' + chapterNum + '">1/' + totalQuestions + '</span>';
    html += '</div>';

    // 题目卡片区
    html += '<div id="sq-card-area-' + chapterNum + '"></div>';

    // 导航按钮
    html += '<div class="ch-step-quiz-nav" id="sq-nav-' + chapterNum + '">';
    html += '<button class="ch-step-quiz-btn ch-step-quiz-btn-prev" id="sq-prev-' + chapterNum + '" disabled>⬅ 上一题</button>';
    html += '<button class="ch-step-quiz-btn ch-step-quiz-btn-next" id="sq-next-' + chapterNum + '">下一题 ➡</button>';
    html += '<button class="ch-step-quiz-btn ch-step-quiz-btn-submit" id="sq-submit-' + chapterNum + '" style="display:none;">📤 提交答案</button>';
    html += '</div>';

    // 结果面板
    html += '<div class="ch-step-quiz-result" id="sq-result-' + chapterNum + '">';
    html += '<div class="ch-step-quiz-score-circle" id="sq-circle-' + chapterNum + '">';
    html += '<span class="ch-score-num" id="sq-score-num-' + chapterNum + '">0</span>';
    html += '<span class="ch-score-label">/' + totalQuestions + '</span>';
    html += '</div>';
    html += '<div class="ch-step-quiz-grade" id="sq-grade-' + chapterNum + '"></div>';
    html += '<div class="ch-step-quiz-detail">';
    html += '<div class="ch-step-quiz-stat"><span class="ch-stat-val" id="sq-correct-' + chapterNum + '">0</span><span class="ch-stat-label">正确</span></div>';
    html += '<div class="ch-step-quiz-stat"><span class="ch-stat-val" id="sq-wrong-' + chapterNum + '">0</span><span class="ch-stat-label">错误</span></div>';
    html += '<div class="ch-step-quiz-stat"><span class="ch-stat-val" id="sq-rate-' + chapterNum + '">0%</span><span class="ch-stat-label">正确率</span></div>';
    html += '</div>';
    html += '<button class="ch-step-quiz-btn ch-step-quiz-btn-next" onclick="retryStepQuiz(' + chapterNum + ')" style="margin-top:12px;">🔄 重新作答</button>';
    html += '</div>';

    html += '</div>';

    // 存储数据
    window['_sqData' + chapterNum] = {
        questions: questions,
        total: totalQuestions,
        current: currentIdx,
        accent: accentColor,
        accentBg: accentBg,
        submitted: false,
        score: 0
    };

    return html;
}

function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function initStepQuiz(chapterNum) {
    var data = window['_sqData' + chapterNum];
    if (!data) return;
    renderStepQuizCard(chapterNum);
}

function renderStepQuizCard(chapterNum) {
    var data = window['_sqData' + chapterNum];
    if (!data) return;
    var idx = data.current;
    var q = data.questions[idx];
    var accent = data.accent;
    var letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    var cardArea = document.getElementById('sq-card-area-' + chapterNum);
    if (!cardArea) return;

    var html = '<div class="ch-step-quiz-card">';
    html += '<span class="ch-step-quiz-num">第 ' + (idx + 1) + ' 题 / 共 ' + data.total + ' 题</span>';
    html += '<h3>' + q.question + '</h3>';
    html += '<div class="ch-step-quiz-options">';

    q.options.forEach(function(opt, optIdx) {
        var cls = 'ch-step-quiz-option';
        if (data.submitted) {
            if (optIdx === q.correct) cls += ' correct';
            else if (optIdx === q.userAnswer && optIdx !== q.correct) cls += ' wrong';
            else if (q.userAnswer !== q.correct && optIdx === q.correct) cls += ' show-correct';
        } else if (q.userAnswer === optIdx) {
            cls += ' selected';
        }

        html += '<button class="' + cls + '" onclick="selectStepQuizOption(' + chapterNum + ',' + optIdx + ')"' + (data.submitted ? ' disabled' : '') + '>';
        html += '<span class="ch-option-letter">' + letters[optIdx] + '</span>';
        html += '<span class="ch-option-text">' + opt + '</span>';
        html += '</button>';
    });

    html += '</div></div>';
    cardArea.innerHTML = html;

    // 更新进度条
    var answered = data.questions.filter(function(q) { return q.userAnswer >= 0; }).length;
    var progressPct = Math.round((answered / data.total) * 100);
    var progressBar = document.getElementById('sq-progress-' + chapterNum);
    var progressText = document.getElementById('sq-progress-text-' + chapterNum);
    if (progressBar) progressBar.style.width = progressPct + '%';
    if (progressText) progressText.textContent = (idx + 1) + '/' + data.total;

    // 更新导航按钮
    var prevBtn = document.getElementById('sq-prev-' + chapterNum);
    var nextBtn = document.getElementById('sq-next-' + chapterNum);
    var submitBtn = document.getElementById('sq-submit-' + chapterNum);
    var navDiv = document.getElementById('sq-nav-' + chapterNum);

    if (data.submitted) {
        if (navDiv) navDiv.style.display = 'none';
    } else {
        if (navDiv) navDiv.style.display = 'flex';
        if (prevBtn) prevBtn.disabled = (idx === 0);
        if (nextBtn) {
            if (idx >= data.total - 1) {
                nextBtn.style.display = 'none';
                if (submitBtn) submitBtn.style.display = 'inline-flex';
            } else {
                nextBtn.style.display = 'inline-flex';
                if (submitBtn) submitBtn.style.display = 'none';
            }
        }
    }

    // 如果已提交，显示结果
    if (data.submitted) {
        showStepQuizResult(chapterNum);
    }
}

function selectStepQuizOption(chapterNum, optIdx) {
    var data = window['_sqData' + chapterNum];
    if (!data || data.submitted) return;
    data.questions[data.current].userAnswer = optIdx;
    renderStepQuizCard(chapterNum);
}

function goStepQuizNext(chapterNum) {
    var data = window['_sqData' + chapterNum];
    if (!data || data.submitted) return;
    if (data.current < data.total - 1) {
        data.current++;
        renderStepQuizCard(chapterNum);
    }
}

function goStepQuizPrev(chapterNum) {
    var data = window['_sqData' + chapterNum];
    if (!data || data.submitted) return;
    if (data.current > 0) {
        data.current--;
        renderStepQuizCard(chapterNum);
    }
}

function submitStepQuiz(chapterNum) {
    var data = window['_sqData' + chapterNum];
    if (!data || data.submitted) return;

    // 计算得分
    var correct = 0;
    data.questions.forEach(function(q) {
        if (q.userAnswer === q.correct) correct++;
    });
    data.submitted = true;
    data.score = correct;

    // 跳转到第一题查看结果
    data.current = 0;
    renderStepQuizCard(chapterNum);

    // 滚动到题目
    setTimeout(function() {
        var card = document.querySelector('#sq-card-area-' + chapterNum + ' .ch-step-quiz-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function showStepQuizResult(chapterNum) {
    var data = window['_sqData' + chapterNum];
    if (!data) return;

    var resultDiv = document.getElementById('sq-result-' + chapterNum);
    var navDiv = document.getElementById('sq-nav-' + chapterNum);
    if (resultDiv) resultDiv.classList.add('show');
    if (navDiv) navDiv.style.display = 'none';

    var pct = Math.round((data.score / data.total) * 100);
    var wrong = data.total - data.score;

    var circle = document.getElementById('sq-circle-' + chapterNum);
    var scoreNum = document.getElementById('sq-score-num-' + chapterNum);
    var gradeEl = document.getElementById('sq-grade-' + chapterNum);
    var correctEl = document.getElementById('sq-correct-' + chapterNum);
    var wrongEl = document.getElementById('sq-wrong-' + chapterNum);
    var rateEl = document.getElementById('sq-rate-' + chapterNum);

    if (scoreNum) scoreNum.textContent = data.score;
    if (correctEl) correctEl.textContent = data.score;
    if (wrongEl) wrongEl.textContent = wrong;
    if (rateEl) rateEl.textContent = pct + '%';

    // 评级
    var grade, circleClass;
    if (pct >= 90) { grade = '🏆 太棒了！优秀！'; circleClass = 'excellent'; }
    else if (pct >= 70) { grade = '👍 做得不错，良好！'; circleClass = 'good'; }
    else if (pct >= 50) { grade = '✅ 继续加油！'; circleClass = 'ok'; }
    else { grade = '📚 需要多加练习哦！'; circleClass = 'retry'; }

    if (gradeEl) gradeEl.textContent = grade;
    if (circle) {
        circle.className = 'ch-step-quiz-score-circle ' + circleClass;
    }

    // 如果全部答对，可以触发完成事件
    if (data.score === data.total) {
        setTimeout(function() {
            var evt = new CustomEvent('quizPerfect', { detail: { chapter: chapterNum, score: data.score } });
            document.dispatchEvent(evt);
        }, 500);
    }
}

function retryStepQuiz(chapterNum) {
    var data = window['_sqData' + chapterNum];
    if (!data) return;
    data.submitted = false;
    data.score = 0;
    data.current = 0;
    data.questions.forEach(function(q) { q.userAnswer = -1; });

    var resultDiv = document.getElementById('sq-result-' + chapterNum);
    if (resultDiv) resultDiv.classList.remove('show');

    var navDiv = document.getElementById('sq-nav-' + chapterNum);
    if (navDiv) navDiv.style.display = 'flex';

    renderStepQuizCard(chapterNum);
    window.scrollTo({ top: document.getElementById('sq-card-area-' + chapterNum).offsetTop - 100, behavior: 'smooth' });
}

// 通用初始化函数：将步进小测的导航事件绑定
function bindStepQuizEvents(chapterNum) {
    var prevBtn = document.getElementById('sq-prev-' + chapterNum);
    var nextBtn = document.getElementById('sq-next-' + chapterNum);
    var submitBtn = document.getElementById('sq-submit-' + chapterNum);

    if (prevBtn) {
        prevBtn.onclick = function() { goStepQuizPrev(chapterNum); };
    }
    if (nextBtn) {
        nextBtn.onclick = function() { goStepQuizNext(chapterNum); };
    }
    if (submitBtn) {
        submitBtn.onclick = function() { submitStepQuiz(chapterNum); };
    }

    // 初始化第一题
    renderStepQuizCard(chapterNum);
}

// ============================================================
// 截图上传功能
// ============================================================
function submitScreenshot() {
    // 创建文件选择器
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', function() {
        var file = input.files[0];
        if (!file) {
            document.body.removeChild(input);
            return;
        }

        // 检查文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            showScreenshotMsg('❌ 文件过大，请使用截图工具截取较小区域（建议小于10MB）', '#ff4d4f');
            document.body.removeChild(input);
            return;
        }

        // 显示上传中提示
        showScreenshotMsg('⏳ 正在上传截图...', '#ff9800');

        var reader = new FileReader();
        reader.onload = function(e) {
            var currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
            var username = currentUser ? currentUser.username : '';

            if (!username) {
                showScreenshotMsg('❌ 请先登录后再上传截图', '#ff4d4f');
                document.body.removeChild(input);
                return;
            }

            // 获取当前章节
            var chapterId = '';
            var hash = window.location.hash;
            var match = hash.match(/#(ch\d+)/);
            if (match) chapterId = match[1];

            // 获取或刷新 CSRF token
            async function ensureCsrfToken() {
                if (window.API && window.API._csrfToken) return;
                if (window.API && window.API._fetchCsrfToken) {
                    await window.API._fetchCsrfToken();
                }
            }

            ensureCsrfToken().then(function() {
                return fetch('/api/screenshots/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': (window.API && window.API._csrfToken) || '',
                        'X-Session-Token': (window.API && window.API._sessionToken) || ''
                    },
                    body: JSON.stringify({
                        username: username,
                        imageData: e.target.result,
                        chapterId: chapterId,
                        fileName: file.name || 'screenshot'
                    })
                });
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.success) {
                    showScreenshotMsg('✅ 截图上传成功！老师已收到你的作业截图。', '#04AA6D');
                    loadMyScreenshots();
                } else {
                    showScreenshotMsg('❌ 上传失败：' + (data.error || '未知错误'), '#ff4d4f');
                }
            })
            .catch(function() {
                showScreenshotMsg('❌ 网络错误，请检查连接后重试', '#ff4d4f');
            })
            .finally(function() {
                document.body.removeChild(input);
            });
        };
        reader.onerror = function() {
            showScreenshotMsg('❌ 读取文件失败，请重试', '#ff4d4f');
            document.body.removeChild(input);
        };
        reader.readAsDataURL(file);
    });

    input.click();
}

function showScreenshotMsg(msg, color) {
    // 在项目模块中显示上传反馈
    var feedbackEl = document.getElementById('screenshot-feedback');
    if (!feedbackEl) {
        // 如果不存在反馈元素，创建一个
        var projectSection = document.querySelector('#chapterContent-ch1 .ch-module-wrap');
        if (!projectSection) {
            alert(msg);
            return;
        }
        feedbackEl = document.createElement('div');
        feedbackEl.id = 'screenshot-feedback';
        feedbackEl.style.cssText = 'text-align:center;margin-top:16px;padding:12px;border-radius:8px;font-size:14px;font-weight:600;';
        // 插入到截图按钮下方
        var btnArea = projectSection.querySelector('div[style*="text-align:center"][style*="background:#282A35"]');
        if (btnArea) {
            btnArea.appendChild(feedbackEl);
        } else {
            projectSection.appendChild(feedbackEl);
        }
    }
    feedbackEl.textContent = msg;
    feedbackEl.style.color = color;
    feedbackEl.style.background = color === '#04AA6D' ? '#D9EEE1' : (color === '#ff4d4f' ? '#fff3f3' : '#FFF4A3');
}

// 加载并展示当前学生已提交的截图（第1章 创意项目）
function loadMyScreenshots() {
    var container = document.getElementById('ch1-project-screenshots');
    if (!container) return;

    var currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!currentUser || !currentUser.username) {
        container.innerHTML = '<p style="color:#aaa;font-size:13px;margin:0;">登录后即可查看已提交的截图。</p>';
        return;
    }

    container.innerHTML = '<p style="color:#aaa;font-size:13px;margin:0;">正在加载已提交的截图...</p>';
    window.API._fetch(window.API_BASE + '/screenshots/' + encodeURIComponent(currentUser.username))
        .then(function(data) {
            if (!data || !data.success) {
                container.innerHTML = '<p style="color:#aaa;font-size:13px;margin:0;">暂无已提交的截图。</p>';
                return;
            }
            var list = data.screenshots || [];
            if (list.length === 0) {
                container.innerHTML = '<p style="color:#aaa;font-size:13px;margin:0;">暂无已提交的截图，快去上传吧！</p>';
                return;
            }
            container.innerHTML = '<h4 style="color:#04AA6D;margin:0 0 12px;">📁 我的截图（' + list.length + '张）</h4>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">' +
                list.map(function(s) {
                    return '<div style="background:#fff;border-radius:8px;overflow:hidden;"><img src="/uploads/' + encodeURIComponent(s.file_name) + '" alt="我的截图" loading="lazy" style="width:100%;display:block;cursor:zoom-in;" onclick="window.open(this.src)"></div>';
                }).join('') +
                '</div>';
        })
        .catch(function() {
            container.innerHTML = '<p style="color:#aaa;font-size:13px;margin:0;">加载截图失败，请刷新重试。</p>';
        });
}

// ============================================================
// 通用还原函数 — 将练习代码恢复为初始模板
// ============================================================
var chPracticeTemplates = {
    1: null,  // Ch1 使用 ch1PracticeData 动态获取
    3: '# 创建变量并打印类型\nage = \nscore = \nname = \nis_student = \nprint(type(age))\nprint(type(score))\nprint(type(name))\nprint(type(is_student))',
    4: 'score = 75\nif score >= 60:\n    print("____")\nelse:\n    print("____")',
    5: 'age = 14\nheight = 150\nif age >= 12 ____ height >= 140:\n    print("____")\nelse:\n    print("____")',
    6: 'count = 5\n____ count > 0:\n    print(count)\n    count = ____\nprint("发射！")',
    7: 'for i in range(1, 11):\n    if i % 2 != 0:\n        ____\n    print(i)',
    8: 'for i in range(____):\n    for j in range(____):\n        print("*", end=" ")\n    print()',
    9: 'a = float(input("输入第一个数: "))\nb = float(input("输入第二个数: "))\nop = input("运算符(+,-,*,/): ")\nif op == "+":\n    print(____)\nelif op == "-":\n    print(____)\nelif op == "*":\n    print(____)\nelif op == "/":\n    print(____)',
    10: 'for i in range(1, ____):\n    print("____" * i)',
    11: 'colors = ["红", "橙", "黄", "绿", "蓝"]\nprint(colors[____])  # 输出"红"\nprint(colors[____])  # 输出"黄"\nprint(colors[____])  # 输出"蓝"',
    12: 'scores = [85, 92, 78]\nscores.____(95)  # 添加95\nscores.____(0)  # 删除第一个\nprint(scores)',
    13: 'nums = [1, 2, 2, 3, 3, 3, 4]\nunique = ____(nums)\nprint(unique)',
    14: 'scores = {"语文": 85, "数学": 92}\nscores["英语"] = ____  # 添加英语\nprint(scores["____"])  # 访问数学\nfor k, v in ____.items(): print(k, v)',
    15: 'text = "  Hello Python World  "\ntext = text.____()  # 去空格\nprint(text.____())  # 转大写\nprint(text[____:____])  # 切片取"Python"',
    16: 'scores = [85, 92, 78, 95, 88]\nprint("人数:", ____(scores))\nprint("最高:", ____(scores))\nprint("最低:", ____(scores))\nprint("平均:", ____(scores)/____(scores))',
    17: '# 用Python转换进制\nn = 42\nprint(bin(____))  # 二进制\nprint(oct(____))  # 八进制\nprint(hex(____))  # 十六进制',
    18: 'heights = []\nwhile True:\n    h = input("身高(输入q结束): ")\n    if h == "____":\n        break\n    heights.append(____(h))\nif heights:\n    avg = ____(heights) / ____(heights)\n    print(f"平均身高: {avg:.1f}cm")',
    19: 'a = ____  # 二进制 1010\nb = ____  # 八进制 52\nc = ____  # 十六进制 2A\nprint(a, b, c)  # 应该都是 42\nd = 1.5e3\nprint(d)  # 科学计数法'
};

function resetPractice(chapterNum) {
    var codeEl = document.getElementById('ch' + chapterNum + '-practice-code');
    var outputEl = document.getElementById('ch' + chapterNum + '-practice-output');
    if (!codeEl) return;

    // Ch1 特殊处理：根据当前级别获取模板
    var template;
    if (chapterNum === 1) {
        template = ch1PracticeData[ch1PracticeLevel].code;
    } else {
        template = chPracticeTemplates[chapterNum];
    }

    if (template) {
        setPracticeCode(codeEl, template);
    }

    // 清空输出结果
    if (outputEl) {
        outputEl.innerHTML = '▶ 点击运行按钮查看结果';
        outputEl.style.color = '#888';
    }
}