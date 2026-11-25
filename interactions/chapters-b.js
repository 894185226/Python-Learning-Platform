// ===== 章节交互 - 第10~19章（从 chapter-interactions.js 拆分） =====
// 依赖：interactions/core.js 的公共函数

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
