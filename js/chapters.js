// ===== PythonVariableLesson - chapters.js (章节渲染与交互模块) =====
(function() {
    'use strict';

    // 情境导入动画管理
    const _introAnimIntervals = [];

    function initIntroModule() {
        const sceneButtons = document.querySelectorAll('.scene-btn');
        const visitedScenes = new Set();

        sceneButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const targetScene = btn.dataset.target;
                const scenes = document.querySelectorAll('.scene');
                scenes.forEach(function(scene) { scene.classList.remove('active'); });
                document.querySelector('.scene[data-scene="' + targetScene + '"]').classList.add('active');

                visitedScenes.add(targetScene);
                if (visitedScenes.size >= 3) {
                    window.markModuleCompleted('ch2_intro');
                }
            });
        });

        startIntroAnimations();
    }

    function startIntroAnimations() {
        animateScore();
        animateNames();
        animateCountdown();
    }

    function stopIntroAnimations() {
        _introAnimIntervals.forEach(function(id) { clearInterval(id); });
        _introAnimIntervals.length = 0;
    }

    function animateScore() {
        const scoreSpan = document.querySelector('.score');
        if (!scoreSpan) return;
        let score = 0;
        _introAnimIntervals.push(setInterval(function() {
            score += Math.floor(Math.random() * 10) + 1;
            scoreSpan.textContent = score;
            if (score >= 100) score = 0;
        }, 200));
    }

    function animateNames() {
        const names = ['张三', '李四', '王五', '赵六', '小明'];
        const nameSpan = document.querySelector('.name');
        if (!nameSpan) return;
        let index = 0;
        _introAnimIntervals.push(setInterval(function() {
            index = (index + 1) % names.length;
            nameSpan.textContent = names[index];
        }, 1500));
    }

    function animateCountdown() {
        const countdownSpan = document.querySelector('.countdown');
        if (!countdownSpan) return;
        let count = 10;
        _introAnimIntervals.push(setInterval(function() {
            count--;
            countdownSpan.textContent = count;
            if (count <= 0) {
                count = 10;
            }
        }, 1000));
    }

    // 知识讲解模块
    function initLessonModule() {
        const completeBtn = document.getElementById('lesson-complete-btn');
        if (!completeBtn) return;

        completeBtn.addEventListener('click', async function() {
            await window.markModuleCompleted('ch2_lesson');
            completeBtn.textContent = '✅ 已学完';
            completeBtn.disabled = true;
            completeBtn.style.opacity = '0.6';
        });

        refreshLessonButton();
    }

    async function refreshLessonButton() {
        const completeBtn = document.getElementById('lesson-complete-btn');
        if (!completeBtn) return;
        const currentUser = window.getCurrentUser();
        if (!currentUser) return;
        try {
            const progress = await window.API.getProgress(currentUser.username);
            if (!progress.success) return;
            if (progress.modules['ch2_lesson']) {
                completeBtn.textContent = '✅ 已学完';
                completeBtn.disabled = true;
                completeBtn.style.opacity = '0.6';
            }
        } catch (e) {
            // 静默处理
        }
    }

    // 生活类比实验室模块
    function initLabModule() {
        const dragItems = document.querySelectorAll('.drag-item');
        const variableBox = document.getElementById('variable-box');
        const boxLabelArea = document.getElementById('box-label-area');
        const boxValueArea = document.getElementById('box-value-area');
        const boxType = document.getElementById('box-type');
        const codeLabel = document.querySelector('.code-label');
        const codeValue = document.querySelector('.code-value');

        let currentLabel = '';
        let currentValue = '';
        let currentValueType = '';
        let labLabelDropped = false;
        let labValueDropped = false;

        function checkLabComplete() {
            if (labLabelDropped && labValueDropped) {
                window.markModuleCompleted('ch2_lab');
            }
        }

        dragItems.forEach(function(item) {
            item.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('type', item.dataset.type);
                e.dataTransfer.setData('value', item.dataset.value);
                if (item.classList.contains('text')) {
                    e.dataTransfer.setData('dataType', 'text');
                } else if (item.classList.contains('number')) {
                    e.dataTransfer.setData('dataType', 'number');
                }
            });
        });

        variableBox.addEventListener('dragover', function(e) {
            e.preventDefault();
            variableBox.classList.add('dragover');
        });

        variableBox.addEventListener('dragleave', function() {
            variableBox.classList.remove('dragover');
        });

        variableBox.addEventListener('drop', function(e) {
            e.preventDefault();
            variableBox.classList.remove('dragover');

            const type = e.dataTransfer.getData('type');
            const value = e.dataTransfer.getData('value');
            const dataType = e.dataTransfer.getData('dataType');

            if (type === 'label') {
                currentLabel = value;
                labLabelDropped = true;
                boxLabelArea.textContent = value;
                codeLabel.textContent = value;
                variableBox.style.borderColor = 'var(--primary-purple)';
            } else if (type === 'data') {
                currentValue = value;
                labValueDropped = true;
                currentValueType = dataType;
                boxValueArea.textContent = value;
                codeValue.textContent = dataType === 'text' ? '"' + value + '"' : value;

                if (dataType === 'number') {
                    variableBox.style.borderColor = 'var(--success)';
                    boxType.textContent = '类型: 数字';
                } else {
                    variableBox.style.borderColor = 'var(--info)';
                    boxType.textContent = '类型: 文字';
                }
            }
            checkLabComplete();
        });
    }

    // 命名小法官模块
    function initJudgeModule() {
        const validBtn = document.getElementById('btn-valid');
        const invalidBtn = document.getElementById('btn-invalid');
        const feedback = document.getElementById('judge-feedback');
        const scoreDisplay = document.getElementById('judge-score');
        const answeredDisplay = document.getElementById('judge-answered');
        const resetBtn = document.getElementById('judge-reset-btn');

        if (typeof window.state.judgeAnswered === 'undefined') window.state.judgeAnswered = 0;
        if (typeof window.state.judgeScore === 'undefined') window.state.judgeScore = 0;
        const shuffledQuestions = window.state.judgeQuestions.slice();

        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
            return arr;
        }

        shuffleArray(shuffledQuestions);

        function resetJudge() {
            window.state.judgeAnswered = 0;
            window.state.judgeScore = 0;
            scoreDisplay.textContent = '0';
            answeredDisplay.textContent = '0';
            shuffleArray(shuffledQuestions);
            window.state.currentJudgeIndex = 0;
            feedback.textContent = '';
            validBtn.disabled = false;
            invalidBtn.disabled = false;
            resetBtn.style.display = 'none';
            showCurrentQuestion();
        }

        function showCurrentQuestion() {
            const current = shuffledQuestions[window.state.currentJudgeIndex];
            document.getElementById('current-variable').textContent = current.name;
            feedback.textContent = '';
        }

        function checkAnswer(isValid) {
            if (validBtn.disabled) return;

            const current = shuffledQuestions[window.state.currentJudgeIndex];
            const questionEl = document.getElementById('current-variable');

            if (isValid === current.valid) {
                feedback.textContent = '✅ 回答正确！' + current.reason;
                feedback.className = 'feedback-correct';
                window.state.judgeScore++;
                scoreDisplay.textContent = window.state.judgeScore;
                scoreDisplay.classList.add('bounce-in');
                setTimeout(function() { scoreDisplay.classList.remove('bounce-in'); }, 500);

                if (window.state.judgeScore >= 8) {
                    window.markModuleCompleted('ch2_judge');
                }
            } else {
                feedback.textContent = '❌ 回答错误！' + current.reason;
                feedback.className = 'feedback-wrong';
                if (questionEl) {
                    questionEl.classList.add('shake');
                    setTimeout(function() { questionEl.classList.remove('shake'); }, 500);
                }
            }

            setTimeout(function() {
                window.state.judgeAnswered++;
                answeredDisplay.textContent = window.state.judgeAnswered;

                window.state.currentJudgeIndex = (window.state.currentJudgeIndex + 1) % shuffledQuestions.length;

                if (window.state.judgeAnswered >= 10) {
                    validBtn.disabled = true;
                    invalidBtn.disabled = true;
                    resetBtn.style.display = 'block';
                    return;
                }

                showCurrentQuestion();
            }, 1500);
        }

        validBtn.addEventListener('click', function() { checkAnswer(true); });
        invalidBtn.addEventListener('click', function() { checkAnswer(false); });
        resetBtn.addEventListener('click', resetJudge);

        showCurrentQuestion();
    }

    // 实践操作模块
    function initPracticeModule() {
        const levelButtons = document.querySelectorAll('.level-btn');
        const instructionText = document.getElementById('instruction-text');
        const codeInputEl = document.getElementById('code-input');
        const runBtn = document.getElementById('run-code');
        const outputContent = document.getElementById('output-content');
        let practiceCompleted = false;

        let editor;
        const cmLoaded = typeof CodeMirror !== 'undefined';
        const isMobileDevice = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768;

        if (cmLoaded && !isMobileDevice) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            editor = CodeMirror(codeInputEl, {
                value: '# 在这里编写代码\nname = \nprint(name)',
                mode: 'python',
                theme: isDark ? 'monokai' : 'default',
                lineNumbers: true,
                gutters: ['CodeMirror-linenumbers'],
                indentUnit: 4,
                smartIndent: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                extraKeys: {
                    'Ctrl-Enter': runCode,
                    'Cmd-Enter': runCode
                }
            });
            window._cmInstances['code-input'] = editor;
            if (!isDark) {
                codeInputEl.style.background = '#fafafa';
            }
            setTimeout(function() {
                editor.refresh();
                const sizer = codeInputEl.querySelector('.CodeMirror-sizer');
                if (sizer) {
                    const marginLeft = parseInt(getComputedStyle(sizer).marginLeft) || 0;
                    const gutters = codeInputEl.querySelector('.CodeMirror-gutters');
                    const gutter = codeInputEl.querySelector('.CodeMirror-gutter');
                    if (gutters && marginLeft > 0) {
                        gutters.style.width = marginLeft + 'px';
                        gutters.style.minWidth = marginLeft + 'px';
                    }
                    if (gutter && marginLeft > 0) {
                        gutter.style.width = marginLeft + 'px';
                    }
                }
            }, 150);
        } else {
            window.log.warn(isMobileDevice ? '移动端检测，使用原生编辑器' : 'CodeMirror 加载失败，已降级为原生编辑器');
            codeInputEl.innerHTML = '<textarea id="code-input-fallback" style="width:100%;height:200px;font-family:monospace;font-size:0.95rem;padding:12px;border-radius:10px;border:2px solid var(--border-light);resize:vertical;"># 在这里编写代码\nname = \nprint(name)</textarea>';
            const textarea = document.getElementById('code-input-fallback');
            editor = {
                getValue: function() { return textarea.value; },
                setValue: function(v) { textarea.value = v; }
            };
            textarea.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    runCode();
                }
            });
        }

        const levels = {
            1: { instruction: '补全代码：给变量name赋值为"小明"并打印输出', template: '# 在这里编写代码\nname = \nprint(name)', solution: ['name = "小明"', 'name = "小明"\n', "name = '小明'", "name = '小明'\n"] },
            2: { instruction: '定义两个变量：name赋值为"小红"，age赋值为12，然后打印它们', template: '# 在这里编写代码\nname = \nage = \nprint(name)\nprint(age)', solution: ['name = "小红"\nage = 12', 'name = "小红"\nage = 12\n'] },
            3: { instruction: '修改变量值：先给x赋值5，然后让x增加3，最后打印x', template: '# 在这里编写代码\nx = \nx = \nprint(x)', solution: ['x = 5\nx = x + 3', 'x = 5\nx = x + 3\n', 'x = 5\nx = 8', 'x = 5\nx = 8\n'] }
        };

        levelButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const level = parseInt(btn.dataset.level);
                window.state.currentLevel = level;
                levelButtons.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                instructionText.textContent = levels[level].instruction;
                editor.setValue(levels[level].template);
                outputContent.textContent = '';
            });
        });

        function runCode() {
            const code = editor.getValue();

            try {
                let output = '';
                const lines = code.split('\n');

                const variables = {};
                lines.forEach(function(line) {
                    line = line.trim();
                    if (!line || line.indexOf('#') === 0) return;
                    if (line.indexOf('=') !== -1) {
                        const parts = line.split('=');
                        const varName = parts[0].trim();
                        const varValue = parts.slice(1).join('=').trim();

                        if ((varValue.indexOf('"') === 0 && varValue.lastIndexOf('"') === varValue.length - 1) ||
                            (varValue.indexOf("'") === 0 && varValue.lastIndexOf("'") === varValue.length - 1)) {
                            variables[varName] = varValue.slice(1, -1);
                        } else if (!isNaN(varValue)) {
                            variables[varName] = parseInt(varValue);
                        } else {
                            variables[varName] = varValue;
                        }
                    } else if (line.indexOf('print(') === 0) {
                        const match = line.match(/print\((.*)\)/);
                        if (match) {
                            const name = match[1].trim();
                            if (variables[name] !== undefined) {
                                output += variables[name] + '\n';
                            } else {
                                output += name + '\n';
                            }
                        }
                    }
                });

                outputContent.textContent = output || '无输出';
                outputContent.style.color = 'var(--monokai-output)';
                if (!practiceCompleted) {
                    practiceCompleted = true;
                    window.markModuleCompleted('ch2_practice');
                }
            } catch (e) {
                outputContent.textContent = '错误: ' + e.message;
                outputContent.style.color = 'var(--monokai-error)';
            }
        }

        runBtn.addEventListener('click', runCode);
    }

    // 值追踪挑战模块
    function initTraceModule() {
        const stepBtn = document.getElementById('step-forward');
        const resetBtn = document.getElementById('reset-trace');
        const feedback = document.getElementById('trace-feedback');

        const steps = [
            { x: 5, y: '?', z: '?', line: 0 },
            { x: 5, y: 7, z: '?', line: 1 },
            { x: 10, y: 7, z: '?', line: 2 },
            { x: 10, y: 7, z: 17, line: 3 }
        ];

        function updateDisplay() {
            const current = steps[window.state.traceStep];
            document.getElementById('value-x').textContent = current.x;
            document.getElementById('value-y').textContent = current.y;
            document.getElementById('value-z').textContent = current.z;
        }

        stepBtn.addEventListener('click', function() {
            if (window.state.traceStep < steps.length - 1) {
                window.state.traceStep++;
                updateDisplay();

                const lineTexts = ['x = 5', 'y = x + 2', 'x = 10', 'z = x + y'];
                feedback.textContent = '执行: ' + lineTexts[window.state.traceStep];
                feedback.style.color = 'var(--success)';
            } else {
                feedback.textContent = '🎉 执行完成！最终结果: x=10, y=7, z=17';
                feedback.style.color = 'var(--primary-purple)';
                window.markModuleCompleted('ch2_trace');
            }
        });

        resetBtn.addEventListener('click', function() {
            window.state.traceStep = 0;
            updateDisplay();
            feedback.textContent = '';
        });

        updateDisplay();
    }

    // 错误调试诊所模块
    function initDebugModule() {
        const bugCode = document.getElementById('bug-code');
        const optionsContainer = document.getElementById('debug-options');
        const feedback = document.getElementById('debug-feedback');
        const prevBtn = document.getElementById('prev-bug');
        const nextBtn = document.getElementById('next-bug');
        const medalCount = document.querySelector('#debug-medal span');
        const bugProgress = document.getElementById('bug-progress');

        const fixedBugs = new Set();

        function updateBugProgress() {
            if (bugProgress) {
                bugProgress.textContent = fixedBugs.size + '/' + window.state.bugs.length + ' 已修复';
            }
        }

        function showBug(index) {
            const bug = window.state.bugs[index];
            bugCode.textContent = bug.code;

            optionsContainer.innerHTML = '';

            if (fixedBugs.has(index)) {
                feedback.textContent = '✅ 这个 bug 已修复！';
                feedback.className = 'feedback-correct';
                optionsContainer.innerHTML = '<p style="color: var(--success); font-weight:bold;">✅ 已修复，太棒了！</p>';
                return;
            }

            feedback.textContent = '';
            const hint = document.createElement('p');
            hint.textContent = '请选择正确的修复方案：';
            optionsContainer.appendChild(hint);

            bug.options.forEach(function(option, idx) {
                const btn = document.createElement('button');
                btn.textContent = String.fromCharCode(65 + idx) + '. ' + option.text;
                btn.dataset.index = idx;
                btn.addEventListener('click', function() { checkBugAnswer(option.correct, index); });
                optionsContainer.appendChild(btn);
            });
        }

        function checkBugAnswer(isCorrect, bugIndex) {
            if (fixedBugs.has(bugIndex)) return;

            if (isCorrect) {
                feedback.textContent = '✅ 修复成功！获得一枚勋章！';
                feedback.className = 'feedback-correct';
                window.state.debugMedals++;
                medalCount.textContent = window.state.debugMedals;
                medalCount.parentElement.classList.add('bounce-in');
                setTimeout(function() { medalCount.parentElement.classList.remove('bounce-in'); }, 500);

                fixedBugs.add(bugIndex);
                updateBugProgress();

                if (fixedBugs.size >= window.state.bugs.length) {
                    window.markModuleCompleted('ch2_debug');
                    setTimeout(function() {
                        feedback.textContent = '🎉 全部 bug 修复完毕！你是调试高手！';
                    }, 1000);
                }
            } else {
                feedback.textContent = '❌ 修复失败，再试试吧！';
                feedback.className = 'feedback-wrong';
                const bugDisplay = document.getElementById('bug-code');
                if (bugDisplay) {
                    bugDisplay.classList.add('shake');
                    setTimeout(function() { bugDisplay.classList.remove('shake'); }, 500);
                }
            }

            setTimeout(function() {
                showBug(bugIndex);
            }, 1500);
        }

        function findNextUnfixedBug(currentIndex, direction) {
            const total = window.state.bugs.length;
            if (fixedBugs.size >= total) return currentIndex;

            let next = currentIndex;
            for (let i = 0; i < total; i++) {
                next = (next + direction + total) % total;
                if (!fixedBugs.has(next)) return next;
            }
            return currentIndex;
        }

        prevBtn.addEventListener('click', function() {
            window.state.currentBugIndex = findNextUnfixedBug(window.state.currentBugIndex, -1);
            showBug(window.state.currentBugIndex);
        });

        nextBtn.addEventListener('click', function() {
            window.state.currentBugIndex = findNextUnfixedBug(window.state.currentBugIndex, 1);
            showBug(window.state.currentBugIndex);
        });

        const resetBtn = document.getElementById('debug-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                fixedBugs.clear();
                window.state.debugMedals = 0;
                medalCount.textContent = '0';
                updateBugProgress();
                window.state.currentBugIndex = 0;
                showBug(0);
            });
        }

        updateBugProgress();
        showBug(window.state.currentBugIndex);
    }

    // 扩展思维模块
    function initExtendModule() {
        const challengeButtons = document.querySelectorAll('.challenge-btn');
        const swapChallenge = document.getElementById('swap-challenge');
        const combineChallenge = document.getElementById('combine-challenge');
        const generateSentenceBtn = document.getElementById('generate-sentence');
        const combineOutput = document.getElementById('combine-output');

        if (typeof window.state.extendSwapDone === 'undefined') window.state.extendSwapDone = false;
        if (typeof window.state.extendSentenceDone === 'undefined') window.state.extendSentenceDone = false;

        function checkExtendComplete() {
            if (window.state.extendSwapDone && window.state.extendSentenceDone) {
                window.markModuleCompleted('ch2_extend');
            }
        }

        challengeButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const challenge = btn.dataset.challenge;
                challengeButtons.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');

                if (challenge === 'swap') {
                    swapChallenge.style.display = 'block';
                    combineChallenge.style.display = 'none';
                } else {
                    swapChallenge.style.display = 'none';
                    combineChallenge.style.display = 'block';
                }
            });
        });

        // 挑战1：变量交换
        const swapStepBtn = document.getElementById('swap-step-btn');
        const swapResetBtn = document.getElementById('swap-reset-btn');
        const swapStepText = document.getElementById('swap-step-text');
        const glassASpan = document.querySelector('#glass-a .glass-content');
        const glassBSpan = document.querySelector('#glass-b .glass-content');
        const glassTempSpan = document.querySelector('#glass-temp .glass-content');

        let swapStep = 0;
        const swapData = { a: '🍎', b: '🍊', temp: '' };

        function highlightCodeLine(step) {
            document.querySelectorAll('#swap-code-block .code-line[data-step]').forEach(function(el) {
                el.classList.remove('active');
                if (parseInt(el.dataset.step) === step) {
                    el.classList.add('active');
                }
            });
        }

        function updateSwapDisplay() {
            glassASpan.textContent = swapData.a || '空';
            glassBSpan.textContent = swapData.b || '空';
            glassTempSpan.textContent = swapData.temp || '空';
        }

        if (swapStepBtn) {
            swapStepBtn.addEventListener('click', function() {
                swapStep++;

                if (swapStep === 1) {
                    swapData.temp = swapData.a;
                    swapData.a = '';
                    swapStepText.textContent = '步骤 1/3：temp = a  →  🍎 移到了"临时"杯';
                    highlightCodeLine(1);
                    updateSwapDisplay();
                } else if (swapStep === 2) {
                    swapData.a = swapData.b;
                    swapData.b = '';
                    swapStepText.textContent = '步骤 2/3：a = b  →  🍊 移到了 A 杯';
                    highlightCodeLine(2);
                    updateSwapDisplay();
                } else if (swapStep === 3) {
                    swapData.b = swapData.temp;
                    swapData.temp = '';
                    swapStepText.textContent = '步骤 3/3：b = temp  →  🍎 移到了 B 杯，交换完成！';
                    highlightCodeLine(3);
                    swapStepBtn.disabled = true;
                    swapStepBtn.textContent = '✓ 交换完成';
                    updateSwapDisplay();
                    window.state.extendSwapDone = true;
                    checkExtendComplete();
                }
            });
        }

        if (swapResetBtn) {
            swapResetBtn.addEventListener('click', function() {
                swapStep = 0;
                swapData.a = '🍎';
                swapData.b = '🍊';
                swapData.temp = '';
                swapStepBtn.disabled = false;
                swapStepBtn.textContent = '▶ 开始交换';
                swapStepText.textContent = '点击"开始交换"观察变量交换过程';
                highlightCodeLine(0);
                updateSwapDisplay();
            });
        }

        // 挑战2：句子拼接
        if (generateSentenceBtn) {
            generateSentenceBtn.addEventListener('click', function() {
                const name = document.getElementById('combine-name').value;
                const age = document.getElementById('combine-age').value;
                const hobby = document.getElementById('combine-hobby').value;

                const sentence = '大家好！我叫' + name + '，今年' + age + '岁，我喜欢' + hobby + '。';
                combineOutput.textContent = sentence;
                window.state.extendSentenceDone = true;
                checkExtendComplete();
            });
        }
    }

    // 创意迷你项目模块
    function initProjectModule() {
        const generateCardBtn = document.getElementById('generate-card');

        generateCardBtn.addEventListener('click', function() {
            const name = document.getElementById('card-name').value;
            const age = document.getElementById('card-age').value;
            const hobby = document.getElementById('card-hobby').value;
            const dream = document.getElementById('card-dream').value;

            document.getElementById('preview-name').textContent = name;
            document.getElementById('preview-age').textContent = age;
            document.getElementById('preview-hobby').textContent = hobby;
            document.getElementById('preview-dream').textContent = dream;

            window.markModuleCompleted('ch2_project');
        });
    }

    // ============================================
    //  章节导航系统
    // ============================================

    let currentChapter = null;
    let currentChapterModule = null;

    function renderChapterSidebar() {
        const chapterList = document.getElementById('chapterList');
        if (!chapterList || typeof CHAPTERS === 'undefined') return;

        chapterList.innerHTML = CHAPTERS.map(function(ch) {
            const completed = isChapterCompleted(ch.id);
            return '<li class="chapter-item"><a class="chapter-link ' + (completed ? 'completed' : '') + '" onclick="switchChapter(\'' + ch.id + '\')" data-chapter="' + ch.id + '"><span class="chapter-num">' + ch.num + '</span><span class="chapter-info"><div class="chapter-title">' + ch.icon + ' ' + ch.title + '</div><div class="chapter-desc">' + ch.desc + '</div></span>' + (completed ? '<span class="chapter-badge">✓</span>' : '') + '</a></li>';
        }).join('');
    }

    function isChapterCompleted(chapterId) {
        try {
            const progress = JSON.parse(localStorage.getItem('pv_chapter_progress') || '{}');
            return progress[chapterId] === true;
        } catch (e) {
            return false;
        }
    }

    async function markChapterCompleted(chapterId) {
        try {
            const progress = JSON.parse(localStorage.getItem('pv_chapter_progress') || '{}');
            progress[chapterId] = true;
            localStorage.setItem('pv_chapter_progress', JSON.stringify(progress));
        } catch (e) {
            // ignore
        }

        const currentUser = window.getCurrentUser();
        if (currentUser && window.dbReady) {
            try {
                await window.API.markModuleCompleted(currentUser.username, 'chapter_' + chapterId);
            } catch (e) {
                window.log.warn('同步章节进度失败:', e.message);
            }
        }

        renderChapterSidebar();

        if (currentUser) {
            try {
                const newAch = await window.checkAndAwardAchievements(currentUser.username);
                if (newAch.length > 0) {
                    newAch.forEach(function(ach) { window.showAchievementToast(ach); });
                }
            } catch (e) {
                window.log.error('检查成就失败:', e.message);
            }
        } else {
            window.checkLocalAchievements();
        }
    }

    function toggleSidebar() {
        const sidebar = document.getElementById('chapterSidebar');
        const toggle = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');
        const mainContent = document.querySelector('.main-content');

        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            sidebar.classList.remove('open');
            toggle.classList.remove('shifted');
            overlay.classList.remove('open');
            mainContent.classList.remove('sidebar-open');
            toggle.querySelector('i').className = 'fas fa-chevron-right';
        } else {
            sidebar.classList.add('open');
            toggle.classList.add('shifted');
            overlay.classList.add('open');
            mainContent.classList.add('sidebar-open');
            toggle.querySelector('i').className = 'fas fa-chevron-left';
        }
    }

    // 修复：侧边栏按钮改用 pointerdown 触发。
    // 原 onclick 在按钮开合滑动(left 0→270)或悬停时，浏览器会把 click 派发到 BODY
    // 而非按钮，导致偶发失灵；pointerdown 在按下瞬间即触发，不受几何变化影响。
    (function() {
        var toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.removeAttribute('onclick');
            toggleBtn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                toggleSidebar();
            });
        }
    })();

    async function switchChapter(chapterId) {
        const currentUser = window.getCurrentUser();
        if (!currentUser) {
            window.pendingChapterId = chapterId;
            window.openLoginModal();
            return;
        }

        // 确保已加载章节锁定状态（首次访问时）
        if (typeof window.lockedChapters === 'undefined') {
            await window.loadChapterLocks();
        }

        // 章节锁定检查：老师锁定的章节禁止访问
        if (window.lockedChapters && window.lockedChapters[chapterId]) {
            const lockedChapter = CHAPTERS.find(function(c) { return c.id === chapterId; });
            const lockedName = lockedChapter ? lockedChapter.title : chapterId;
            window.showConfirm('🔒 章节已锁定', '《' + lockedName + '》已被老师锁定，暂时无法学习，请联系老师。', '🔒', '我知道了', null);
            return;
        }

        if (window.innerWidth <= 768) {
            toggleSidebar();
        }

        currentChapter = chapterId;
        currentChapterModule = null;

        const chapterData = CHAPTERS.find(function(c) { return c.id === chapterId; });
        if (chapterData && chapterData.color) {
            document.documentElement.style.setProperty('--chapter-color', chapterData.color);
        } else {
            document.documentElement.style.removeProperty('--chapter-color');
        }

        if (chapterId !== 'ch2') {
            document.body.classList.remove('in-ch2');
        }

        const currentChapterSection = document.querySelector('.chapter-section.active');
        const currentModule = document.querySelector('.module.active');
        const hasCurrentContent = currentChapterSection || currentModule;

        const doSwitch = function() {
            document.querySelectorAll('.module').forEach(function(m) { m.classList.remove('active'); });
            document.querySelectorAll('.chapter-section').forEach(function(c) { c.classList.remove('active'); });

            showSidebarToggle();

            if (chapterId === 'ch2') {
                if (typeof switchToVariableChapterBody === 'function') switchToVariableChapterBody();
                return;
            }

            let chapterContainer = document.getElementById('chapter-' + chapterId);
            if (!chapterContainer) {
                chapterContainer = document.createElement('div');
                chapterContainer.id = 'chapter-' + chapterId;
                chapterContainer.className = 'chapter-section';
                document.querySelector('main').appendChild(chapterContainer);
            }
            chapterContainer.classList.add('active');
            chapterContainer.classList.add('chapter-section-showing');
            setTimeout(function() { chapterContainer.classList.remove('chapter-section-showing'); }, 260);

            renderChapterContent(chapterId, chapterContainer);

            updateSidebarActive(chapterId);
            if (typeof window.updateNavActiveState === 'function') {
                window.updateNavActiveState(chapterId);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(function() { window.stickyChapterNav(); }, 200);

            const targetHash = '#' + chapterId;
            if (window.location.hash === targetHash) {
                history.replaceState(null, '', targetHash);
            } else {
                history.pushState(null, '', targetHash);
            }
        };

        if (hasCurrentContent) {
            if (currentChapterSection) currentChapterSection.classList.add('chapter-section-transitioning');
            if (currentModule) currentModule.classList.add('module-transitioning');
            setTimeout(function() {
                if (currentChapterSection) currentChapterSection.classList.remove('chapter-section-transitioning');
                if (currentModule) currentModule.classList.remove('module-transitioning');
                doSwitch();
            }, 160);
        } else {
            doSwitch();
        }
    }

    function renderChapterContent(chapterId, container) {
        const chapter = CHAPTERS.find(function(c) { return c.id === chapterId; });
        if (!chapter) return;

        const bgColor = chapter.color || '#04AA6D';

        // 匹配第2章布局：nav 在 chapter-landing 外部，position:fixed 吸顶
        container.innerHTML = window.preprocessHTMLForDark(
            '<div class="chapter-module-nav" id="chapterModNav-' + chapterId + '">' +
            '<div class="mod-nav-inner">' +
            chapter.modules.map(function(mod, i) {
                return '<button class="mod-nav-btn" onclick="switchChapterModule(\'' + chapterId + '\', \'' + mod.id + '\', ' + i + ')">' + mod.icon + ' ' + mod.title + '</button>';
            }).join('') +
            '</div></div>' +
            '<div class="chapter-landing">' +
            '<div class="chapter-hero" id="chapterHero-' + chapterId + '"><div class="chapter-badge-tag">' + (chapter.badge || '学习') + '</div><h1>' + chapter.icon + ' ' + chapter.title + '</h1><p class="chapter-subtitle">' + chapter.subtitle + '</p><div class="chapter-cta"><button class="cta-btn cta-primary" onclick="startChapterLearning(\'' + chapterId + '\')">开始学习</button><button class="cta-btn cta-secondary" onclick="toggleSidebar()">浏览章节</button></div></div>' +
            '<div class="chapter-content" id="chapterContent-' + chapterId + '"><div class="ch-module-wrap"><div style="text-align:center;padding:48px 0;"><div style="font-size:48px;margin-bottom:16px;">' + chapter.icon + '</div><h3 style="color:var(--w3-text-color);margin-bottom:8px;">' + chapter.title + ' - ' + chapter.subtitle + '</h3><p style="color:var(--text-secondary);margin-top:8px;">' + chapter.desc + '</p></div></div></div></div>'
        );

        if (chapter.modules && chapter.modules.length > 0) {
            setTimeout(function() {
                switchChapterModule(chapterId, chapter.modules[0].id, 0);
            }, 50);
        }

        setTimeout(function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) window.applyThemeToChapterContent(true);
            window.shuffleDebugButtons();
            window.shuffleQuizOptions();
            setTimeout(function() { window.initCodeMirrorForPractice(); }, 150);
        }, 100);
    }

    function switchChapterModule(chapterId, moduleId, index) {
        const currentUser = window.getCurrentUser();
        if (!currentUser) {
            window.pendingModuleId = moduleId;
            window.pendingChapterId = chapterId;
            window.openLoginModal();
            return;
        }

        currentChapterModule = moduleId;

        const chapter = CHAPTERS.find(function(c) { return c.id === chapterId; });
        if (!chapter) return;

        const module = chapter.modules.find(function(m) { return m.id === moduleId; });
        if (!module) return;

        // 进入子模块时隐藏 hero 区域（匹配第2章行为）
        const hero = document.getElementById('chapterHero-' + chapterId);
        if (hero) hero.style.display = 'none';

        const nav = document.getElementById('chapterModNav-' + chapterId);
        if (nav) {
            nav.querySelectorAll('.mod-nav-btn').forEach(function(btn, i) {
                btn.classList.toggle('active', i === index);
            });
        }

        const contentArea = document.getElementById('chapterContent-' + chapterId);
        if (!contentArea) return;

        if (typeof module.render === 'function') {
            contentArea.innerHTML = '<div class="ch-module-wrap">' + window.preprocessHTMLForDark(module.render()) + '</div>';
        } else if (!window.chaptersContentLoaded) {
            contentArea.innerHTML = '<div class="ch-module-wrap"><div class="module-header"><h2>' + module.icon + ' ' + module.title + '</h2><p>' + (module.desc || '') + '</p></div><div style="text-align:center;padding:60px 40px;"><div class="ch-loading-spinner"></div><p style="color:var(--text-secondary);margin-top:16px;font-size:15px;">内容加载中，请稍候...</p></div></div>';
            const checkInterval = setInterval(function() {
                if (window.chaptersContentLoaded) {
                    clearInterval(checkInterval);
                    switchChapterModule(chapterId, moduleId, index);
                }
            }, 200);
            setTimeout(function() { clearInterval(checkInterval); }, 10000);
            return;
        } else {
            contentArea.innerHTML = '<div class="ch-module-wrap"><div class="module-header"><h2>' + module.icon + ' ' + module.title + '</h2><p>' + (module.desc || '') + '</p></div><div style="text-align:center;color:#aaa;padding:40px;"><p>此模块内容正在建设中...</p></div></div>';
        }

        const existingNextBar = contentArea.querySelector('.ch-next-bar');
        if (existingNextBar) existingNextBar.remove();

        const nextIndex = index + 1;
        const isLast = nextIndex >= chapter.modules.length;
        const nextBtnHTML = '<div class="ch-next-bar">' + (isLast ?
            '<button class="ch-next-btn ch-next-btn-done" onclick="var h=document.getElementById(\'chapterHero-' + chapterId + '\');if(h)h.style.display=\'\';markChapterCompleted(\'' + chapterId + '\');window.scrollTo({top:0,behavior:\'smooth\'})">✓ 本章学习完成，返回顶部</button>' :
            '<button class="ch-next-btn" onclick="switchChapterModule(\'' + chapterId + '\', \'' + chapter.modules[nextIndex].id + '\', ' + nextIndex + ')">下一页：' + chapter.modules[nextIndex].icon + ' ' + chapter.modules[nextIndex].title + ' →</button>'
        ) + '</div>';
        contentArea.insertAdjacentHTML('beforeend', nextBtnHTML);

        contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) window.applyThemeToChapterContent(true);
            window.shuffleDebugButtons();
            window.shuffleQuizOptions();
            if (moduleId.indexOf('_quiz') !== -1 && moduleId !== 'ch2_test') {
                var retryCount = 0;
                function tryInitQuiz() {
                    try {
                        if (typeof window.initChapterQuiz === 'function') {
                            var qt = contentArea.querySelector('#question-text');
                            if (qt) {
                                window.initChapterQuiz(chapterId, contentArea);
                            } else if (retryCount < 5) {
                                retryCount++;
                                setTimeout(tryInitQuiz, 200);
                            } else {
                                console.error('[switchChapterModule] question-text 元素 5 次重试后仍未找到');
                            }
                        }
                    } catch(e) {
                        console.error('[switchChapterModule] initChapterQuiz 失败:', e);
                    }
                }
                tryInitQuiz();
            }
            if (moduleId === 'ch1_project') {
                setTimeout(function() { if (typeof window.loadMyScreenshots === 'function') window.loadMyScreenshots(); }, 150);
            }
            setTimeout(function() { window.initCodeMirrorForPractice(); }, 150);
        }, 100);
    }

    function startChapterLearning(chapterId) {
        const chapter = CHAPTERS.find(function(c) { return c.id === chapterId; });
        if (!chapter || !chapter.modules.length) return;

        switchChapterModule(chapterId, chapter.modules[0].id, 0);
    }

    function updateSidebarActive(chapterId) {
        document.querySelectorAll('.chapter-link').forEach(function(link) {
            link.classList.toggle('active', link.dataset.chapter === chapterId);
        });
    }

    function showSidebarToggle() {
        const toggle = document.getElementById('sidebarToggle');
        if (toggle) {
            const sidebar = document.getElementById('chapterSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const mainContent = document.querySelector('.main-content');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
                mainContent.classList.remove('sidebar-open');
                toggle.querySelector('i').className = 'fas fa-chevron-right';
            }
            toggle.classList.remove('shifted');
            toggle.style.display = 'flex';
        }
    }

    function hideSidebarToggle() {
        const toggle = document.getElementById('sidebarToggle');
        if (toggle) {
            toggle.style.display = 'none';
        }
        const sidebar = document.getElementById('chapterSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const mainContent = document.querySelector('.main-content');
        if (sidebar) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            mainContent.classList.remove('sidebar-open');
        }
    }

    function initChapterSystem() {
        window.log.log('[章节] initChapterSystem 开始');
        if (typeof CHAPTERS === 'undefined') {
            console.warn('[章节] ❌ chapters.js 未加载，章节系统不可用');
            return;
        }

        window.log.log('[章节] ✅ 共加载 ' + CHAPTERS.length + ' 个章节');
        renderChapterSidebar();
        hideSidebarToggle();

        const hash = window.location.hash.replace('#', '');
        window.log.log('[章节] 从 hash 恢复:', hash || '(无)');
        if (hash && hash.indexOf('ch') === 0) {
            setTimeout(function() { switchChapter(hash); }, 100);
        }
    }

    // 处理浏览器前进/后退
    window.addEventListener('popstate', function() {
        let hash = window.location.hash.replace('#', '');
        if (hash === window.state.currentModule) return;
        hash = hash.replace(/^chapter_(ch\d+)$/, '$1');
        const SPECIAL_HASH_MAP = {
            'achievement-wall': 'achievement',
            'leaderboard': 'leaderboard',
            'mistake-book': 'mistakes',
            'discussions': 'discussion'
        };
        hash = SPECIAL_HASH_MAP[hash] || hash;
        if (window.CH2_MODULE_IDS.indexOf(hash) !== -1) {
            switchChapter('ch2');
            if (hash !== 'ch2_intro') {
                setTimeout(function() { if (typeof startVariableModule === 'function') startVariableModule(hash); }, 100);
            }
        } else if (/^ch\d+$/.test(hash)) {
            switchChapter(hash);
        } else if (hash === '') {
            document.querySelectorAll('.chapter-section').forEach(function(c) { c.classList.remove('active'); });
            document.querySelectorAll('.module').forEach(function(m) { m.classList.remove('active'); });
            const welcome = document.getElementById('welcome');
            if (welcome) welcome.classList.add('active');
            updateSidebarActive(null);
            hideSidebarToggle();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (hash) {
            window.switchModule(hash);
        }
    });

    // 页面加载完成后初始化（第3组：章节系统 + 依赖检查）
    document.addEventListener('DOMContentLoaded', function() {
        window.log.log('[DOMReady] initChapterSystem 触发');
        initChapterSystem();
        window.log.log('[DOMReady] initChapterSystem 完成');
        setTimeout(function() {
            if (window._startupCheck) window._startupCheck();
            window.log.log('%c[启动] 所有初始化完成，页面就绪', 'color:#04AA6D;font-weight:bold;font-size:14px');
        }, 500);
    });

    // 启动异步加载章节内容
    window.loadChaptersContent();

    // 暴露到全局
    window.initIntroModule = initIntroModule;
    window.initLessonModule = initLessonModule;
    window.initLabModule = initLabModule;
    window.initJudgeModule = initJudgeModule;
    window.initPracticeModule = initPracticeModule;
    window.initTraceModule = initTraceModule;
    window.initDebugModule = initDebugModule;
    window.initExtendModule = initExtendModule;
    window.initProjectModule = initProjectModule;
    window.startIntroAnimations = startIntroAnimations;
    window.stopIntroAnimations = stopIntroAnimations;
    window.refreshLessonButton = refreshLessonButton;
    window.renderChapterSidebar = renderChapterSidebar;
    window.isChapterCompleted = isChapterCompleted;
    window.markChapterCompleted = markChapterCompleted;
    window.toggleSidebar = toggleSidebar;
    window.switchChapter = switchChapter;
    window.renderChapterContent = renderChapterContent;
    window.switchChapterModule = switchChapterModule;
    window.startChapterLearning = startChapterLearning;
    window.updateSidebarActive = updateSidebarActive;
    window.showSidebarToggle = showSidebarToggle;
    window.hideSidebarToggle = hideSidebarToggle;
    window.initChapterSystem = initChapterSystem;
    window.currentChapter = currentChapter;
    window.currentChapterModule = currentChapterModule;

})();