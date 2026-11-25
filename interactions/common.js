// ===== 章节交互 - 通用功能（从 chapter-interactions.js 拆分） =====
// 包含：拖拽分类 / 积木组装 / 步进式小测引擎 / 截图上传 / 练习还原
// 依赖：interactions/core.js 的公共函数

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
