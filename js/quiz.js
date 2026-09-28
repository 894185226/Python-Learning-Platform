// ===== PythonVariableLesson - quiz.js (测验模块) =====
(function() {
    'use strict';

    // 课堂小测模块
    function initTestModule() {
        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');
        const submitBtn = document.getElementById('submit-test');
        const progressDisplay = document.getElementById('test-progress');
        const testResult = document.getElementById('test-result');
        const questionContainer = document.getElementById('question-container');
        const testControls = document.querySelector('.test-controls');
        const finalScore = document.getElementById('final-score');
        const finalGrade = document.getElementById('final-grade');

        let currentQuestion = 0;

        function showQuestion(index) {
            const question = window.state.questions[index];
            questionText.textContent = question.question;
            progressDisplay.textContent = index + 1;

            optionsContainer.innerHTML = '';

            question.options.forEach(function(option, idx) {
                const btn = document.createElement('button');
                btn.textContent = option;
                btn.dataset.index = idx;
                btn.classList.add('quiz-option');

                if (window.state.testAnswers[index] === idx) {
                    btn.classList.add('selected');
                }

                btn.addEventListener('click', function() {
                    window.state.testAnswers[index] = idx;
                    optionsContainer.querySelectorAll('button').forEach(function(b) { b.classList.remove('selected'); });
                    btn.classList.add('selected');
                });

                optionsContainer.appendChild(btn);
            });
        }

        prevBtn.addEventListener('click', function() {
            if (currentQuestion > 0) {
                currentQuestion--;
                showQuestion(currentQuestion);
            }
        });

        nextBtn.addEventListener('click', function() {
            if (currentQuestion < window.state.questions.length - 1) {
                currentQuestion++;
                showQuestion(currentQuestion);
            }
        });

        submitBtn.addEventListener('click', function() {
            let score = 0;
            window.state.questions.forEach(function(q, idx) {
                if (window.state.testAnswers[idx] === q.correct) {
                    score++;
                }
            });

            finalScore.textContent = score;

            const percentage = (score / window.state.questions.length) * 100;
            let grade;
            if (percentage >= 90) grade = '🏆 优秀';
            else if (percentage >= 70) grade = '👍 良好';
            else if (percentage >= 60) grade = '✅ 及格';
            else grade = '📚 继续加油';
            finalGrade.textContent = grade;

            questionContainer.style.display = 'none';
            testControls.style.display = 'none';
            testResult.style.display = 'block';

            window.markModuleCompleted('ch2_test');

            drawRadarChart(score);
        });

        showQuestion(currentQuestion);
    }

    // 雷达图绘制函数（独立函数，可供所有章节小测使用）
    function drawRadarChart(score, container) {
        const root = container || document;
        const canvas = root.querySelector('#radar-canvas');
        if (!canvas) return;
        // 设置画布尺寸为 300×300，确保雷达图完整显示（默认 300×150 会裁切下半部分）
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        const rootStyle = getComputedStyle(document.documentElement);
        const radarAxis = rootStyle.getPropertyValue('--radar-axis').trim();
        const primaryPurple = rootStyle.getPropertyValue('--primary-purple').trim();
        const textPrimary = rootStyle.getPropertyValue('--text-primary').trim();

        const hexToRgba = function(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
        };
        const fillColor = hexToRgba(primaryPurple, 0.3);

        const centerX = 150;
        const centerY = 150;
        const radius = 100;
        const labels = ['变量定义', '命名规则', '赋值操作', '调试能力', '综合应用'];

        const values = [];
        for (let i = 0; i < 5; i++) {
            if (score >= 5) values.push(3);
            else if (score >= 4) values.push(i < 4 ? 3 : 2);
            else if (score >= 3) values.push(i < 3 ? 3 : i < 4 ? 2 : 1);
            else if (score >= 2) values.push(i < 2 ? 2 : 1);
            else values.push(i === 0 ? 1 : 0);
        }

        for (let r = radius / 3; r <= radius; r += radius / 3) {
            ctx.beginPath();
            for (let i2 = 0; i2 < labels.length; i2++) {
                const angle = (Math.PI * 2 * i2) / labels.length - Math.PI / 2;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                if (i2 === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = radarAxis;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        for (let i3 = 0; i3 < labels.length; i3++) {
            const angle2 = (Math.PI * 2 * i3) / labels.length - Math.PI / 2;
            const x2 = centerX + radius * Math.cos(angle2);
            const y2 = centerY + radius * Math.sin(angle2);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = radarAxis;
            ctx.stroke();

            ctx.fillStyle = textPrimary;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            const labelX = centerX + (radius + 20) * Math.cos(angle2);
            const labelY = centerY + (radius + 20) * Math.sin(angle2);
            ctx.fillText(labels[i3], labelX, labelY);
        }

        ctx.beginPath();
        for (let i4 = 0; i4 < labels.length; i4++) {
            const angle3 = (Math.PI * 2 * i4) / labels.length - Math.PI / 2;
            const value = values[i4];
            const r2 = (value / 3) * radius;
            const x3 = centerX + r2 * Math.cos(angle3);
            const y3 = centerY + r2 * Math.sin(angle3);
            if (i4 === 0) ctx.moveTo(x3, y3);
            else ctx.lineTo(x3, y3);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = primaryPurple;
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let i5 = 0; i5 < labels.length; i5++) {
            const angle4 = (Math.PI * 2 * i5) / labels.length - Math.PI / 2;
            const value2 = values[i5];
            const r3 = (value2 / 3) * radius;
            const x4 = centerX + r3 * Math.cos(angle4);
            const y4 = centerY + r3 * Math.sin(angle4);
            ctx.beginPath();
            ctx.arc(x4, y4, 5, 0, Math.PI * 2);
            ctx.fillStyle = primaryPurple;
            ctx.fill();
        }
    }

    // 通用章节课堂小测初始化函数
    function initChapterQuiz(chapterId, container) {
        const root = container || document;
		console.log('[initChapterQuiz] 开始初始化，章节:', chapterId);
	        console.log('[initChapterQuiz] window.state 是否存在:', !!window.state);
	        if (window.state) {
	            console.log('[initChapterQuiz] chQuizQuestions 是否存在:', !!window.state.chQuizQuestions);
	            console.log('[initChapterQuiz] chQuizQuestions[' + chapterId + '] 是否存在:', !!window.state.chQuizQuestions[chapterId]);
	        }
	        const questions = window.state && window.state.chQuizQuestions ? window.state.chQuizQuestions[chapterId] : null;
	        if (!questions) {
	            console.warn('[initChapterQuiz] 未找到' + chapterId + '的题目数据，chQuizQuestions keys:', window.state && window.state.chQuizQuestions ? Object.keys(window.state.chQuizQuestions) : '(state不可用)');
	            return;
	        }
	        console.log('[initChapterQuiz] 题目数量:', questions.length);

        const questionText = root.querySelector('#question-text');
        const optionsContainer = root.querySelector('#options-container');
        const prevBtn = root.querySelector('#prev-question');
        const nextBtn = root.querySelector('#next-question');
        const submitBtn = root.querySelector('#submit-test');
        const progressDisplay = root.querySelector('#test-progress');
        const testResult = root.querySelector('#test-result');
        const questionContainer = root.querySelector('#question-container');
        const testControls = root.querySelector('.test-controls');
        const finalScore = root.querySelector('#final-score');
        const finalGrade = root.querySelector('#final-grade');

	        console.log('[initChapterQuiz] questionText 元素:', !!questionText);
	        if (!questionText) {
	            console.warn('[initChapterQuiz] 未找到 question-text 元素，DOM可能尚未渲染');
	            return;
	        }

        let currentQuestion = 0;
        const answers = new Array(questions.length).fill(-1);

        function showQuestion(index) {
            const q = questions[index];
            questionText.textContent = q.question;
            if (progressDisplay) progressDisplay.textContent = index + 1;
            optionsContainer.innerHTML = '';

            q.options.forEach(function(option, idx) {
                const btn = document.createElement('button');
                btn.textContent = option;
                btn.dataset.index = idx;
                btn.classList.add('quiz-option');
                if (answers[index] === idx) btn.classList.add('selected');
                btn.addEventListener('click', function() {
                    answers[index] = idx;
                    optionsContainer.querySelectorAll('button').forEach(function(b) { b.classList.remove('selected'); });
                    btn.classList.add('selected');
                });
                optionsContainer.appendChild(btn);
            });
        }

        if (prevBtn) prevBtn.addEventListener('click', function() {
            if (currentQuestion > 0) { currentQuestion--; showQuestion(currentQuestion); }
        });

        if (nextBtn) nextBtn.addEventListener('click', function() {
            if (currentQuestion < questions.length - 1) { currentQuestion++; showQuestion(currentQuestion); }
        });

        if (submitBtn) submitBtn.addEventListener('click', function() {
            let score = 0;
            questions.forEach(function(q, idx) { if (answers[idx] === q.correct) score++; });
            if (finalScore) finalScore.textContent = score;
            const percentage = (score / questions.length) * 100;
            let grade;
            if (percentage >= 90) grade = '🏆 优秀';
            else if (percentage >= 70) grade = '👍 良好';
            else if (percentage >= 60) grade = '✅ 及格';
            else grade = '📚 继续加油';
            if (finalGrade) finalGrade.textContent = grade;
            if (questionContainer) questionContainer.style.display = 'none';
            if (testControls) testControls.style.display = 'none';
            if (testResult) testResult.style.display = 'block';

            window.markModuleCompleted(chapterId + '_quiz');
            drawRadarChart(score, root);
        });

        showQuestion(0);
    }

    // 打乱测验选项
    function shuffleQuizOptions() {
        const containers = document.querySelectorAll('.quiz-options-shuffle');
        containers.forEach(function(container) {
            const options = Array.from(container.children);
            // Fisher-Yates 洗牌
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                container.appendChild(options[j]);
            }
        });
    }

    // 打乱调试按钮
    function shuffleDebugButtons() {
        const containers = document.querySelectorAll('.debug-options-shuffle');
        containers.forEach(function(container) {
            const buttons = Array.from(container.children);
            for (let i = buttons.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                container.appendChild(buttons[j]);
            }
        });
    }

    // 暴露到全局
    window.initTestModule = initTestModule;
    window.drawRadarChart = drawRadarChart;
    window.initChapterQuiz = initChapterQuiz;
    window.shuffleQuizOptions = shuffleQuizOptions;
    window.shuffleDebugButtons = shuffleDebugButtons;

})();