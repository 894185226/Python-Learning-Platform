// ===== 章节交互 - 第1、3~9章（从 chapter-interactions.js 拆分） =====
// 依赖：interactions/core.js 的公共函数

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

