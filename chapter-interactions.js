// ============================================================
// Python 基础学习平台 - 章节交互函数
// 为 chapters.js 中的交互式元素提供通用工厂函数
// ============================================================

// ============================================================
// 通用测验检查函数
// ============================================================
function checkQuiz(chapterNum, correctAnswers) {
    const resultEl = document.getElementById('ch' + chapterNum + '-quiz-result');
    let correctCount = 0;
    const totalQuestions = Object.keys(correctAnswers).length;

    for (let i = 1; i <= totalQuestions; i++) {
        const radios = document.getElementsByName('ch' + chapterNum + 'q' + i);
        let selected = null;
        for (const radio of radios) {
            if (radio.checked) {
                selected = radio.value;
                break;
            }
        }
        if (selected === String(correctAnswers[i])) {
            correctCount++;
        }
    }

    if (resultEl) {
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
// 通用实践运行函数
// ============================================================
function runPractice(chapterNum, validator) {
    const codeEl = document.getElementById('ch' + chapterNum + '-practice-code');
    const outputEl = document.getElementById('ch' + chapterNum + '-practice-output');
    if (!codeEl || !outputEl) return;

    const code = codeEl.value;
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

// ============================================================
// 第1章：认识Python
// ============================================================
function checkCh1Quiz() {
    checkQuiz(1, { 1: 1, 2: 1, 3: 2, 4: 1, 5: 1 });
}

var ch1PracticeLevel = 1;
var ch1PracticeData = {
    1: { title: '📝 Lv1：补全 print() 语句', desc: '补全下面的代码，让它输出"Hello Python"', code: 'print(______)' },
    2: { title: '📝 Lv2：写一句打招呼的话', desc: '用 print() 写一句打招呼的话', code: '# 写一句打招呼的话\nprint("______")' },
    3: { title: '📝 Lv3：修改句子', desc: '修改下面的代码，让它输出你喜欢的句子', code: 'print("我是一个Python学习者")\n# 修改上面的句子' }
};

function switchPracticeLevel(level) {
    ch1PracticeLevel = level;
    var data = ch1PracticeData[level];
    var titleEl = document.getElementById('ch1-practice-title');
    var descEl = document.getElementById('ch1-practice-desc');
    var codeEl = document.getElementById('ch1-practice-code');
    if (titleEl) titleEl.textContent = data.title;
    if (descEl) descEl.textContent = data.desc;
    if (codeEl) codeEl.value = data.code;

    // 更新按钮样式
    for (var i = 1; i <= 3; i++) {
        var btn = document.getElementById('ch1-lv' + i + '-btn');
        if (btn) {
            btn.style.background = (i === level) ? '#04AA6D' : '#e0e0e0';
            btn.style.color = (i === level) ? '#fff' : '#333';
        }
    }
}

function runCh1Practice() {
    var code = document.getElementById('ch1-practice-code').value;
    var output = document.getElementById('ch1-practice-output');
    if (!output) return;

    if (ch1PracticeLevel === 1) {
        if (code.indexOf('"Hello') >= 0 || code.indexOf("'Hello") >= 0 || code.indexOf('"你好') >= 0) {
            output.innerHTML = '✅ 正确！print("Hello Python") 会输出：<br><span style="color:#a6e22e;">Hello Python</span>';
            output.style.color = '#04AA6D';
        } else {
            output.innerHTML = '💡 提示：在括号里用引号括住"Hello Python"试试看！';
            output.style.color = '#ff9800';
        }
    } else if (ch1PracticeLevel === 2) {
        if (code.indexOf('print(') >= 0 && (code.indexOf('"') >= 0 || code.indexOf("'") >= 0)) {
            output.innerHTML = '✅ 很好！你写了一句打招呼的话！<br>' + escapeHtml(code);
            output.style.color = '#04AA6D';
        } else {
            output.innerHTML = '💡 提示：用 print("你的话") 的格式来写';
            output.style.color = '#ff9800';
        }
    } else {
        output.innerHTML = '✅ 你修改了代码！<br>原句：print("我是一个Python学习者")<br>新代码：<br>' + escapeHtml(code);
        output.style.color = '#04AA6D';
    }
}

// ============================================================
// 第3章：变量类型
// ============================================================
function checkCh3Quiz() {
    checkQuiz(3, { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
}

function runCh3Practice() {
    var code = document.getElementById('ch3-practice-code').value;
    var output = document.getElementById('ch3-practice-output');
    if (!output) return;

    var hasInt = /\d+/.test(code) && code.indexOf('age') >= 0;
    var hasFloat = /\d+\.\d+/.test(code) && code.indexOf('score') >= 0;
    var hasStr = /["'].*["']/.test(code) && code.indexOf('name') >= 0;
    var hasBool = /True|False/.test(code) && code.indexOf('is_student') >= 0;

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

    document.getElementById('ch3-preview-name').textContent = name;
    document.getElementById('ch3-preview-age').textContent = '年龄: ' + age + ' (int)';
    document.getElementById('ch3-preview-height').textContent = '身高: ' + height + 'm (float)';
    document.getElementById('ch3-preview-student').textContent = '学生: ' + isStudent + ' (bool)';

    document.getElementById('ch3-card-code').innerHTML =
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
function checkCh4Quiz() {
    checkQuiz(4, { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0 });
}

function runCh4Practice() {
    var code = document.getElementById('ch4-practice-code').value;
    var output = document.getElementById('ch4-practice-output');
    if (!output) return;

    var hasIf = code.indexOf('if') >= 0;
    var hasElse = code.indexOf('else') >= 0;
    var hasColon = code.indexOf(':') >= 0;
    var hasCompare = />=|<=|==|!=|>|</.test(code);

    output.innerHTML = '代码分析：<br>' +
        (hasIf ? '✅ 包含if ✓<br>' : '❌ 缺少if<br>') +
        (hasElse ? '✅ 包含else ✓<br>' : '❌ 缺少else<br>') +
        (hasColon ? '✅ 包含冒号 ✓<br>' : '❌ 缺少冒号<br>') +
        (hasCompare ? '✅ 包含比较运算符 ✓<br>' : '❌ 缺少比较运算符<br>');
    output.style.color = (hasIf && hasElse && hasColon) ? '#04AA6D' : '#ff9800';
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

// ============================================================
// 第5章：if进阶
// ============================================================
function checkCh5Quiz() {
    checkQuiz(5, { 1: 1, 2: 1, 3: 0, 4: 0, 5: 2 });
}

function runCh5Practice() {
    var code = document.getElementById('ch5-practice-code').value;
    var output = document.getElementById('ch5-practice-output');
    if (!output) return;

    var hasAnd = code.indexOf('and') >= 0;
    var hasIf = code.indexOf('if') >= 0;
    output.innerHTML = '代码分析：<br>' +
        (hasAnd ? '✅ 使用了and ✓<br>' : '💡 提示：两个条件之间需要用 and 连接<br>') +
        (hasIf ? '✅ 使用了if ✓<br>' : '❌ 缺少if<br>');
    output.style.color = (hasAnd && hasIf) ? '#04AA6D' : '#ff9800';
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
function checkCh6Quiz() {
    checkQuiz(6, { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0 });
}

function runCh6Practice() {
    var code = document.getElementById('ch6-practice-code').value;
    var output = document.getElementById('ch6-practice-output');
    if (!output) return;

    var hasWhile = code.indexOf('while') >= 0;
    var hasColon = code.indexOf(':') >= 0;
    var hasIncrement = /[+\-]=/.test(code) || /count\s*=\s*count\s*[+\-]/.test(code);

    output.innerHTML = '代码分析：<br>' +
        (hasWhile ? '✅ 包含while ✓<br>' : '❌ 缺少while<br>') +
        (hasColon ? '✅ 包含冒号 ✓<br>' : '❌ 缺少冒号<br>') +
        (hasIncrement ? '✅ 包含计数变化 ✓<br>' : '💡 提示：需要改变循环变量（如count += 1）<br>');
    output.style.color = (hasWhile && hasColon && hasIncrement) ? '#04AA6D' : '#ff9800';
}

var ch6SecretNumber = 0;
function startCh6Carousel() {
    var carousel = document.getElementById('ch6-carousel-display');
    if (!carousel) return;
    var items = ['🎁', '🎈', '🎉', '🎊', '🎀', '✨', '🌟', '💫'];
    var i = 0;
    if (carousel._interval) clearInterval(carousel._interval);
    carousel._interval = setInterval(function() {
        carousel.textContent = items[i % items.length];
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
function checkCh7Quiz() {
    checkQuiz(7, { 1: 1, 2: 0, 3: 1, 4: 1, 5: 1 });
}

function runCh7Practice() {
    var code = document.getElementById('ch7-practice-code').value;
    var output = document.getElementById('ch7-practice-output');
    if (!output) return;

    var hasBreak = code.indexOf('break') >= 0;
    var hasContinue = code.indexOf('continue') >= 0;
    var hasLoop = code.indexOf('for') >= 0 || code.indexOf('while') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasLoop ? '✅ 包含循环 ✓<br>' : '❌ 缺少循环<br>') +
        (hasBreak ? '✅ 包含break ✓<br>' : '💡 提示：需要break来跳出循环<br>') +
        (hasContinue ? '✅ 包含continue ✓<br>' : '');
    output.style.color = (hasLoop && (hasBreak || hasContinue)) ? '#04AA6D' : '#ff9800';
}

function startCh7Line() {
    var line = document.getElementById('ch7-line-display');
    if (!line) return;
    line.textContent = '🏭 流水线启动中...';
    var steps = ['📦 原料 →', '🔧 加工 →', '✅ 质检 →', '📮 包装 →', '🚚 出货'];
    var i = 0;
    if (line._interval) clearInterval(line._interval);
    line._interval = setInterval(function() {
        if (i < steps.length) {
            line.textContent = steps.slice(0, i + 1).join(' ');
            i++;
        } else {
            line.textContent = '✅ 流水线完成！';
            clearInterval(line._interval);
        }
    }, 500);
}

function simulateCh7Continue() {
    var output = document.getElementById('ch7-sim-output');
    if (!output) return;
    output.innerHTML = '<span style="color:#a6e22e;">模拟 continue：</span><br>' +
        'for i in range(1, 6):<br>' +
        '&nbsp;&nbsp;if i == 3: continue<br>' +
        '&nbsp;&nbsp;print(i)<br>' +
        '<span style="color:#ff9800;">输出：1 2 4 5（跳过了3）</span>';
}

function simulateCh7Break() {
    var output = document.getElementById('ch7-sim-output');
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
function checkCh8Quiz() {
    checkQuiz(8, { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
}

function runCh8Practice() {
    var code = document.getElementById('ch8-practice-code').value;
    var output = document.getElementById('ch8-practice-output');
    if (!output) return;

    var hasNested = (code.match(/for/g) || []).length >= 2;
    var hasRange = code.indexOf('range') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasNested ? '✅ 包含嵌套循环 ✓<br>' : '💡 提示：需要两个for循环嵌套<br>') +
        (hasRange ? '✅ 使用了range() ✓<br>' : '💡 提示：用range()控制循环次数<br>');
    output.style.color = (hasNested && hasRange) ? '#04AA6D' : '#ff9800';
}

function updateCh8Table() {
    var rows = parseInt(document.getElementById('ch8-table-rows').value) || 5;
    var table = document.getElementById('ch8-multi-table');
    if (!table) return;

    var html = '';
    for (var i = 1; i <= rows; i++) {
        for (var j = 1; j <= i; j++) {
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
        html += char.repeat(i) + '<br>';
    }
    pattern.innerHTML = html;
}

// ============================================================
// 第9章：综合练习
// ============================================================
function checkCh9Quiz() {
    checkQuiz(9, { 1: 1, 2: 1, 3: 0 });
}

function runCh9Practice() {
    var code = document.getElementById('ch9-practice-code').value;
    var output = document.getElementById('ch9-practice-output');
    if (!output) return;

    var hasInput = code.indexOf('input') >= 0;
    var hasPrint = code.indexOf('print') >= 0;
    var hasIf = code.indexOf('if') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasInput ? '✅ 包含input() ✓<br>' : '💡 提示：用input()获取用户输入<br>') +
        (hasPrint ? '✅ 包含print() ✓<br>' : '💡 提示：用print()输出结果<br>') +
        (hasIf ? '✅ 包含条件判断 ✓<br>' : '');
    output.style.color = (hasInput && hasPrint) ? '#04AA6D' : '#ff9800';
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
function checkCh10Quiz() {
    checkQuiz(10, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 });
}

function runCh10Practice() {
    var code = document.getElementById('ch10-practice-code').value;
    var output = document.getElementById('ch10-practice-output');
    if (!output) return;

    var hasFor = code.indexOf('for') >= 0;
    var hasMultiply = code.indexOf('*') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasFor ? '✅ 包含for循环 ✓<br>' : '💡 提示：用for循环控制行数<br>') +
        (hasMultiply ? '✅ 包含字符串乘法 ✓<br>' : '💡 提示：用"*"*i 来重复字符<br>');
    output.style.color = (hasFor && hasMultiply) ? '#04AA6D' : '#ff9800';
}

// ============================================================
// 第11章：列表
// ============================================================
function checkCh11Quiz() {
    checkQuiz(11, { 1: 0, 2: 1, 3: 1, 4: 0, 5: 1 });
}

function runCh11Practice() {
    var code = document.getElementById('ch11-practice-code').value;
    var output = document.getElementById('ch11-practice-output');
    if (!output) return;

    var hasList = code.indexOf('[') >= 0 && code.indexOf(']') >= 0;
    var hasAppend = code.indexOf('append') >= 0;
    var hasFor = code.indexOf('for') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasList ? '✅ 包含列表 ✓<br>' : '💡 提示：用[]创建列表<br>') +
        (hasAppend ? '✅ 使用了append() ✓<br>' : '') +
        (hasFor ? '✅ 包含for循环 ✓<br>' : '');
    output.style.color = hasList ? '#04AA6D' : '#ff9800';
}

function addToCh11Cart() {
    var item = document.getElementById('ch11-item').value;
    var cart = document.getElementById('ch11-cart');
    if (!cart || !item) return;

    var current = cart.textContent || '';
    if (current.indexOf('购物车是空的') >= 0 || current === '') {
        cart.textContent = '[' + item + ']';
    } else {
        cart.textContent = current.replace(']', ', ' + item + ']');
    }
}

// ============================================================
// 第12章：列表操作
// ============================================================
function checkCh12Quiz() {
    checkQuiz(12, { 1: 0, 2: 1, 3: 1, 4: 1, 5: 0 });
}

function runCh12Practice() {
    var code = document.getElementById('ch12-practice-code').value;
    var output = document.getElementById('ch12-practice-output');
    if (!output) return;

    var ops = [];
    if (code.indexOf('append') >= 0) ops.push('append()');
    if (code.indexOf('pop') >= 0) ops.push('pop()');
    if (code.indexOf('sort') >= 0) ops.push('sort()');
    if (code.indexOf('remove') >= 0) ops.push('remove()');

    output.innerHTML = '使用的方法：' + (ops.length > 0 ? ops.join(', ') : '无') + '<br>';
    output.style.color = ops.length > 0 ? '#04AA6D' : '#ff9800';
}

function opCh12List() {
    var list = document.getElementById('ch12-list-display');
    if (!list) return;
    var items = ['苹果', '香蕉', '橘子', '葡萄', '西瓜'];
    list.textContent = '[' + items.join(', ') + ']';
}

// ============================================================
// 第13章：元组与集合
// ============================================================
function checkCh13Quiz() {
    checkQuiz(13, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
}

function runCh13Practice() {
    var code = document.getElementById('ch13-practice-code').value;
    var output = document.getElementById('ch13-practice-output');
    if (!output) return;

    var hasTuple = code.indexOf('(') >= 0;
    var hasSet = code.indexOf('{') >= 0;

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

// ============================================================
// 第14章：字典
// ============================================================
function checkCh14Quiz() {
    checkQuiz(14, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
}

function runCh14Practice() {
    var code = document.getElementById('ch14-practice-code').value;
    var output = document.getElementById('ch14-practice-output');
    if (!output) return;

    var hasDict = code.indexOf('{') >= 0 && code.indexOf(':') >= 0;
    var hasGet = code.indexOf('get') >= 0;
    var hasItems = code.indexOf('items') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasDict ? '✅ 包含字典 ✓<br>' : '💡 提示：用{"key": value}创建字典<br>') +
        (hasGet ? '✅ 使用了get() ✓<br>' : '') +
        (hasItems ? '✅ 使用了items() ✓<br>' : '');
    output.style.color = hasDict ? '#04AA6D' : '#ff9800';
}

function queryCh14Dict() {
    var key = document.getElementById('ch14-dict-key').value;
    var result = document.getElementById('ch14-dict-result');
    if (!result) return;

    var dict = { 'name': '小明', 'age': '12', 'grade': '七年级', 'hobby': '编程' };
    if (dict[key]) {
        result.textContent = key + ' → ' + dict[key];
        result.style.color = '#04AA6D';
    } else {
        result.textContent = '未找到键 "' + key + '"';
        result.style.color = '#ff4d4f';
    }
}

// ============================================================
// 第15章：字符串操作
// ============================================================
function checkCh15Quiz() {
    checkQuiz(15, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
}

function runCh15Practice() {
    var code = document.getElementById('ch15-practice-code').value;
    var output = document.getElementById('ch15-practice-output');
    if (!output) return;

    var hasSlice = code.indexOf('[') >= 0 && code.indexOf(':') >= 0;
    var hasUpper = code.indexOf('upper') >= 0;
    var hasSplit = code.indexOf('split') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasSlice ? '✅ 包含切片 ✓<br>' : '') +
        (hasUpper ? '✅ 使用了upper()/lower() ✓<br>' : '') +
        (hasSplit ? '✅ 使用了split() ✓<br>' : '');
    output.style.color = (hasSlice || hasUpper || hasSplit) ? '#04AA6D' : '#ff9800';
}

function sliceCh15Str() {
    var text = document.getElementById('ch15-str-input').value || 'Python';
    var start = parseInt(document.getElementById('ch15-slice-start').value) || 0;
    var end = parseInt(document.getElementById('ch15-slice-end').value) || 3;
    var result = document.getElementById('ch15-slice-result');
    if (result) {
        result.textContent = text.slice(start, end);
    }
}

// ============================================================
// 第16章：函数
// ============================================================
function checkCh16Quiz() {
    checkQuiz(16, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
}

function runCh16Practice() {
    var code = document.getElementById('ch16-practice-code').value;
    var output = document.getElementById('ch16-practice-output');
    if (!output) return;

    var hasDef = code.indexOf('def') >= 0;
    var hasReturn = code.indexOf('return') >= 0;
    var hasCall = (code.match(/[a-zA-Z_]+\s*\(/g) || []).length >= 2;

    output.innerHTML = '代码分析：<br>' +
        (hasDef ? '✅ 定义了函数 ✓<br>' : '💡 提示：用def定义函数<br>') +
        (hasReturn ? '✅ 包含return ✓<br>' : '') +
        (hasCall ? '✅ 调用了函数 ✓<br>' : '💡 提示：记得调用函数<br>');
    output.style.color = (hasDef && hasCall) ? '#04AA6D' : '#ff9800';
}

function updateCh16Test() {
    var funcName = document.getElementById('ch16-func-select').value;
    var input = document.getElementById('ch16-test-input').value;
    var result = document.getElementById('ch16-test-result');
    if (!result) return;

    var builtins = {
        'len': function(v) { return v.length; },
        'max': function(v) { var arr = v.split(',').map(Number); return Math.max.apply(null, arr); },
        'min': function(v) { var arr = v.split(',').map(Number); return Math.min.apply(null, arr); },
        'sum': function(v) { var arr = v.split(',').map(Number); return arr.reduce(function(a, b) { return a + b; }, 0); },
        'int': function(v) { return parseInt(v); },
        'str': function(v) { return '"' + v + '"'; },
        'float': function(v) { return parseFloat(v); },
        'bool': function(v) { return v ? 'True' : 'False'; }
    };

    var fn = builtins[funcName];
    if (fn) {
        try {
            result.textContent = funcName + '(' + input + ') = ' + fn(input);
            result.style.color = '#04AA6D';
        } catch (e) {
            result.textContent = '错误：' + e.message;
            result.style.color = '#ff4d4f';
        }
    }
}

function testCh16Func() {
    updateCh16Test();
}

// ============================================================
// 第17章：二进制
// ============================================================
function checkCh17Quiz() {
    checkQuiz(17, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
}

function runCh17Practice() {
    var code = document.getElementById('ch17-practice-code').value;
    var output = document.getElementById('ch17-practice-output');
    if (!output) return;

    var hasBin = code.indexOf('bin') >= 0;
    var hasInt = code.indexOf('int') >= 0;

    output.innerHTML = '代码分析：<br>' +
        (hasBin ? '✅ 使用了bin() ✓<br>' : '') +
        (hasInt ? '✅ 使用了int()转换 ✓<br>' : '');
    output.style.color = (hasBin || hasInt) ? '#04AA6D' : '#ff9800';
}

function toggleCh17Bit() {
    var bits = document.querySelectorAll('.ch17-bit');
    var decimal = document.getElementById('ch17-decimal');
    if (!bits.length || !decimal) return;

    var value = 0;
    bits.forEach(function(bit, i) {
        if (bit.classList.contains('active')) {
            value += Math.pow(2, bits.length - 1 - i);
        }
    });
    decimal.textContent = value;
}

// ============================================================
// 第18章：编程思维
// ============================================================
function checkCh18Quiz() {
    checkQuiz(18, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
}

function runCh18Practice() {
    runPractice(18, function(code) {
        var hasSteps = code.split('\n').filter(function(l) { return l.trim().length > 0; }).length >= 3;
        return {
            html: hasSteps ? '✅ 你描述了算法步骤，很好！<br>' + escapeHtml(code) : '💡 提示：用自然语言描述解题步骤（至少3步）',
            color: hasSteps ? '#04AA6D' : '#ff9800'
        };
    });
}

// ============================================================
// 第19章：综合复习
// ============================================================
function checkCh19Quiz() {
    checkQuiz(19, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
}

function runCh19Practice() {
    var code = document.getElementById('ch19-practice-code').value;
    var output = document.getElementById('ch19-practice-output');
    if (!output) return;

    var features = [];
    if (code.indexOf('print') >= 0) features.push('打印输出');
    if (code.indexOf('if') >= 0) features.push('条件判断');
    if (code.indexOf('for') >= 0 || code.indexOf('while') >= 0) features.push('循环');
    if (code.indexOf('[') >= 0) features.push('列表');
    if (code.indexOf('def') >= 0) features.push('函数');

    output.innerHTML = '代码包含以下知识点：<br>' +
        (features.length > 0 ? features.map(function(f) { return '✅ ' + f; }).join('<br>') : '💡 写一个综合性的Python程序吧！');
    output.style.color = features.length > 0 ? '#04AA6D' : '#ff9800';
}

function updateCh19Display() {
    var topic = document.getElementById('ch19-topic').value;
    var display = document.getElementById('ch19-display');
    if (!display) return;

    var topics = {
        'variables': '变量：存储数据的容器，如 name = "小明"',
        'types': '数据类型：int(整数), float(浮点), str(字符串), bool(布尔)',
        'conditions': '条件判断：if/elif/else 让程序做选择',
        'loops': '循环：for/while 让程序重复执行',
        'lists': '列表：用[]存储多个数据，如 [1,2,3]',
        'functions': '函数：用def定义可复用的代码块'
    };

    display.textContent = topics[topic] || '请选择一个知识点';
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