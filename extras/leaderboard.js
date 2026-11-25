// ===== 学习排行榜 + 班级综合排行（从 script-extras.js 拆分） =====
// 依赖：script.js 核心函数（getCurrentUser / API / escHtml）

// ================================================================
//   新功能模块 - 学习排行榜
// ================================================================
// 动态填充班级筛选下拉（根据所选年级加载对应班级）
async function populateLeaderboardClassFilter() {
    const sel = document.getElementById('lbClassFilter');
    if (!sel) return;
    const grade = document.getElementById('lbGradeFilter')?.value || '';
    const previous = sel.value;
    try {
        const data = await API.getLeaderboardClasses(grade);
        const classes = (data.success && Array.isArray(data.classes)) ? data.classes : [];
        sel.innerHTML = '<option value="">全部班级</option>' +
            classes.map(c => `<option value="${c}">${c}班</option>`).join('');
        // 若之前选中的班级仍在新列表中，则保留原选择
        if (previous && classes.some(c => String(c) === previous)) {
            sel.value = previous;
        }
    } catch (e) {
        sel.innerHTML = '<option value="">全部班级</option>';
    }
}

// 年级切换：先刷新班级选项，再刷新排行榜
async function onLeaderboardGradeChange() {
    await populateLeaderboardClassFilter();
    renderLeaderboard();
}

async function renderLeaderboard() {
    renderClassLeaderboard();
    const currentUser = getCurrentUser();
    const body = document.getElementById('leaderboardBody');
    const empty = document.getElementById('leaderboardEmpty');
    const loginHint = document.getElementById('leaderboardLoginHint');
    const table = document.getElementById('leaderboardTable');

    if (!currentUser) {
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (loginHint) loginHint.style.display = 'block';
        return;
    }

    if (loginHint) loginHint.style.display = 'none';

    // 首次进入排行榜时动态填充班级筛选
    const classFilter = document.getElementById('lbClassFilter');
    if (classFilter && classFilter.options.length <= 1) {
        await populateLeaderboardClassFilter();
    }

    const grade = document.getElementById('lbGradeFilter')?.value || '';
    const classNum = document.getElementById('lbClassFilter')?.value || '';

    try {
        const data = await API.getLeaderboard(grade, classNum);
        if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (table) table.style.display = '';
        if (empty) empty.style.display = 'none';

        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        body.innerHTML = data.leaderboard.map((item, i) => {
            const rank = i + 1;
            const isMe = item.username === currentUser.username;
            const rankStyle = rank <= 3 ? `style="background:${rankColors[rank-1]};color:#000;font-weight:700;border-radius:50%;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;"` : '';
            const rowStyle = isMe ? 'style="background:rgba(4,170,109,0.1);font-weight:600;"' : '';
            const d = item.dimensions || {};
            const n = v => (v === null || v === undefined ? 0 : v);
            const breakdown = '完成率 ' + n(d.taskCompletion) + ' | 知识测评 ' + n(d.assessment) + ' | 作业 ' + n(d.assignment) + ' | 参与 ' + n(d.participation) + ' | 成就 ' + n(d.achievement) + ' | 课堂表现 ' + n(d.classPerformance);
            return `
                <tr ${rowStyle}>
                    <td>${rank <= 3 ? `<span ${rankStyle}>${rank}</span>` : rank}</td>
                    <td>${escHtml(item.display_name || item.username)}${isMe ? ' (我)' : ''}</td>
                    <td>${escHtml(item.grade || '')}${item.class_num ? item.class_num + '班' : ''}</td>
                    <td>${item.chapter_count || 0}</td>
                    <td>${item.achievement_count || 0}</td>
                    <td title="${escHtml(breakdown)}"><strong>${n(item.score)}</strong></td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        if (table) table.style.display = 'none';
        if (empty) { empty.style.display = 'block'; empty.innerHTML = '<p>⚠️ 加载排行榜失败，请稍后重试</p>'; }
    }
}

// ================================================================
//   新功能模块 - 班级综合排行
//   计分方式：班内所有在读学生「六维综合得分」的平均分（与学生榜同一评分引擎）
// ================================================================
async function renderClassLeaderboard() {
    const body = document.getElementById('classRankBody');
    if (!body) return;
    const table = document.getElementById('classRankTable');
    const empty = document.getElementById('classRankEmpty');
    const loginHint = document.getElementById('classRankLoginHint');
    const currentUser = getCurrentUser();

    if (!currentUser) {
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';
        if (loginHint) loginHint.style.display = 'block';
        return;
    }
    if (loginHint) loginHint.style.display = 'none';

    const grade = document.getElementById('lbGradeFilter')?.value || '';
    try {
        const data = await API.getClassLeaderboard(grade);
        if (!data.success || !data.ranking || data.ranking.length === 0) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (table) table.style.display = '';
        if (empty) empty.style.display = 'none';

        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        body.innerHTML = data.ranking.map((c, i) => {
            const rank = i + 1;
            const isMine = String(c.grade) === String(currentUser.grade) &&
                String(c.class_num) === String(currentUser.classNum);
            const rankStyle = rank <= 3
                ? `style="background:${rankColors[rank - 1]};color:#1f2937;font-weight:700;border-radius:50%;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;"`
                : '';
            const rowStyle = isMine ? 'style="background:rgba(4,170,109,0.1);font-weight:600;"' : '';
            const tip = `平均作业得分 ${c.avg_assignment} · 班内最高分：${c.top_student}（${c.score} 分）`;
            return `
                <tr ${rowStyle}>
                    <td>${rank <= 3 ? `<span ${rankStyle}>${rank}</span>` : rank}</td>
                    <td>${escHtml(c.grade || '')}${escHtml(String(c.class_num))}班${isMine ? ' <span style="color:#04AA6D;font-size:12px;">(我的班级)</span>' : ''}</td>
                    <td>${c.student_count} 人</td>
                    <td title="${escHtml(tip)}"><strong>${c.score}</strong></td>
                    <td>${c.avg_assessment}</td>
                    <td>${c.avg_task}%</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        if (table) table.style.display = 'none';
        if (empty) { empty.style.display = 'block'; empty.innerHTML = '<p>⚠️ 加载班级排行失败，请稍后重试</p>'; }
    }
}
