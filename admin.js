/* ===================================================
   管理后台 JS - 完整版
   =================================================== */

const API_BASE = '/api/admin';

// ===== 模块/成就名称映射 =====
// 全部模块总数：10(变量模块) + 19(章节完成) + 142(各章子模块) = 171
const TOTAL_MODULES = 171;
const MODULE_NAMES = {
    // 变量模块（第2章）子模块
    'intro': '情境导入', 'lab': '类比实验室', 'lesson': '知识讲解',
    'judge': '命名小法官', 'practice': '实践操作', 'trace': '值追踪',
    'debug': '错误调试', 'extend': '拓展延伸', 'project': '创意项目', 'test': '综合测试',
    // 章节完成标记
    'chapter_ch1': '第1章完成', 'chapter_ch2': '第2章完成', 'chapter_ch3': '第3章完成',
    'chapter_ch4': '第4章完成', 'chapter_ch5': '第5章完成', 'chapter_ch6': '第6章完成',
    'chapter_ch7': '第7章完成', 'chapter_ch8': '第8章完成', 'chapter_ch9': '第9章完成',
    'chapter_ch10': '第10章完成', 'chapter_ch11': '第11章完成', 'chapter_ch12': '第12章完成',
    'chapter_ch13': '第13章完成', 'chapter_ch14': '第14章完成', 'chapter_ch15': '第15章完成',
    'chapter_ch16': '第16章完成', 'chapter_ch17': '第17章完成', 'chapter_ch18': '第18章完成',
    'chapter_ch19': '第19章完成',
    // 第1章 认识Python
    'ch1_intro': 'Ch1-情境导入', 'ch1_knowledge': 'Ch1-知识讲解', 'ch1_lab': 'Ch1-类比实验室',
    'ch1_practice': 'Ch1-实践操作', 'ch1_debug': 'Ch1-错误调试', 'ch1_quiz': 'Ch1-综合测试',
    // 第3章 变量类型
    'ch3_intro': 'Ch3-情境导入', 'ch3_knowledge': 'Ch3-知识讲解', 'ch3_lab': 'Ch3-类比实验室',
    'ch3_practice': 'Ch3-实践操作', 'ch3_debug': 'Ch3-错误调试', 'ch3_extend': 'Ch3-拓展延伸',
    'ch3_project': 'Ch3-创意项目', 'ch3_quiz': 'Ch3-综合测试',
    // 第4章 条件判断
    'ch4_intro': 'Ch4-情境导入', 'ch4_knowledge': 'Ch4-知识讲解', 'ch4_lab': 'Ch4-类比实验室',
    'ch4_practice': 'Ch4-实践操作', 'ch4_debug': 'Ch4-错误调试', 'ch4_extend': 'Ch4-拓展延伸',
    'ch4_project': 'Ch4-创意项目', 'ch4_quiz': 'Ch4-综合测试',
    // 第5章 if进阶
    'ch5_intro': 'Ch5-情境导入', 'ch5_knowledge': 'Ch5-知识讲解', 'ch5_lab': 'Ch5-类比实验室',
    'ch5_practice': 'Ch5-实践操作', 'ch5_debug': 'Ch5-错误调试', 'ch5_extend': 'Ch5-拓展延伸',
    'ch5_project': 'Ch5-创意项目', 'ch5_quiz': 'Ch5-综合测试',
    // 第6章 while循环
    'ch6_intro': 'Ch6-情境导入', 'ch6_knowledge': 'Ch6-知识讲解', 'ch6_lab': 'Ch6-类比实验室',
    'ch6_practice': 'Ch6-实践操作', 'ch6_debug': 'Ch6-错误调试', 'ch6_extend': 'Ch6-拓展延伸',
    'ch6_project': 'Ch6-创意项目', 'ch6_quiz': 'Ch6-综合测试',
    // 第7章 while拓展
    'ch7_intro': 'Ch7-情境导入', 'ch7_knowledge': 'Ch7-知识讲解', 'ch7_lab': 'Ch7-类比实验室',
    'ch7_practice': 'Ch7-实践操作', 'ch7_debug': 'Ch7-错误调试', 'ch7_extend': 'Ch7-拓展延伸',
    'ch7_project': 'Ch7-创意项目', 'ch7_quiz': 'Ch7-综合测试',
    // 第8章 循环嵌套
    'ch8_intro': 'Ch8-情境导入', 'ch8_knowledge': 'Ch8-知识讲解', 'ch8_lab': 'Ch8-类比实验室',
    'ch8_practice': 'Ch8-实践操作', 'ch8_debug': 'Ch8-错误调试', 'ch8_extend': 'Ch8-拓展延伸',
    'ch8_project': 'Ch8-创意项目', 'ch8_quiz': 'Ch8-综合测试',
    // 第9章 综合应用一
    'ch9_intro': 'Ch9-情境导入', 'ch9_knowledge': 'Ch9-知识讲解', 'ch9_lab': 'Ch9-类比实验室',
    'ch9_practice': 'Ch9-实践操作', 'ch9_debug': 'Ch9-错误调试', 'ch9_extend': 'Ch9-拓展延伸',
    'ch9_project': 'Ch9-创意项目', 'ch9_quiz': 'Ch9-综合测试',
    // 第10章 排列小星星
    'ch10_intro': 'Ch10-情境导入', 'ch10_knowledge': 'Ch10-知识讲解', 'ch10_lab': 'Ch10-类比实验室',
    'ch10_practice': 'Ch10-实践操作', 'ch10_debug': 'Ch10-错误调试', 'ch10_extend': 'Ch10-拓展延伸',
    'ch10_project': 'Ch10-创意项目', 'ch10_quiz': 'Ch10-综合测试',
    // 第11章 初识列表
    'ch11_intro': 'Ch11-情境导入', 'ch11_knowledge': 'Ch11-知识讲解', 'ch11_lab': 'Ch11-类比实验室',
    'ch11_practice': 'Ch11-实践操作', 'ch11_debug': 'Ch11-错误调试', 'ch11_extend': 'Ch11-拓展延伸',
    'ch11_project': 'Ch11-创意项目', 'ch11_quiz': 'Ch11-综合测试',
    // 第12章 列表的使用
    'ch12_intro': 'Ch12-情境导入', 'ch12_knowledge': 'Ch12-知识讲解', 'ch12_lab': 'Ch12-类比实验室',
    'ch12_practice': 'Ch12-实践操作', 'ch12_debug': 'Ch12-错误调试', 'ch12_extend': 'Ch12-拓展延伸',
    'ch12_project': 'Ch12-创意项目', 'ch12_quiz': 'Ch12-综合测试',
    // 第13章 元组与集合
    'ch13_intro': 'Ch13-情境导入', 'ch13_knowledge': 'Ch13-知识讲解', 'ch13_lab': 'Ch13-类比实验室',
    'ch13_practice': 'Ch13-实践操作', 'ch13_debug': 'Ch13-错误调试', 'ch13_extend': 'Ch13-拓展延伸',
    'ch13_project': 'Ch13-创意项目', 'ch13_quiz': 'Ch13-综合测试',
    // 第14章 神奇的字典
    'ch14_intro': 'Ch14-情境导入', 'ch14_knowledge': 'Ch14-知识讲解', 'ch14_lab': 'Ch14-类比实验室',
    'ch14_practice': 'Ch14-实践操作', 'ch14_debug': 'Ch14-错误调试', 'ch14_extend': 'Ch14-拓展延伸',
    'ch14_project': 'Ch14-创意项目', 'ch14_quiz': 'Ch14-综合测试',
    // 第15章 再遇字符串
    'ch15_intro': 'Ch15-情境导入', 'ch15_knowledge': 'Ch15-知识讲解', 'ch15_lab': 'Ch15-类比实验室',
    'ch15_practice': 'Ch15-实践操作', 'ch15_debug': 'Ch15-错误调试', 'ch15_extend': 'Ch15-拓展延伸',
    'ch15_project': 'Ch15-创意项目', 'ch15_quiz': 'Ch15-综合测试',
    // 第16章 公共语法
    'ch16_intro': 'Ch16-情境导入', 'ch16_knowledge': 'Ch16-知识讲解', 'ch16_lab': 'Ch16-类比实验室',
    'ch16_practice': 'Ch16-实践操作', 'ch16_debug': 'Ch16-错误调试', 'ch16_extend': 'Ch16-拓展延伸',
    'ch16_project': 'Ch16-创意项目', 'ch16_quiz': 'Ch16-综合测试',
    // 第17章 轻松搞定二进制
    'ch17_intro': 'Ch17-情境导入', 'ch17_knowledge': 'Ch17-知识讲解', 'ch17_lab': 'Ch17-类比实验室',
    'ch17_practice': 'Ch17-实践操作', 'ch17_debug': 'Ch17-错误调试', 'ch17_extend': 'Ch17-拓展延伸',
    'ch17_project': 'Ch17-创意项目', 'ch17_quiz': 'Ch17-综合测试',
    // 第18章 编程思维实践
    'ch18_intro': 'Ch18-情境导入', 'ch18_knowledge': 'Ch18-知识讲解', 'ch18_lab': 'Ch18-类比实验室',
    'ch18_practice': 'Ch18-实践操作', 'ch18_debug': 'Ch18-错误调试', 'ch18_extend': 'Ch18-拓展延伸',
    'ch18_project': 'Ch18-创意项目', 'ch18_quiz': 'Ch18-综合测试',
    // 第19章 各种各样的数
    'ch19_intro': 'Ch19-情境导入', 'ch19_knowledge': 'Ch19-知识讲解', 'ch19_lab': 'Ch19-类比实验室',
    'ch19_practice': 'Ch19-实践操作', 'ch19_debug': 'Ch19-错误调试', 'ch19_extend': 'Ch19-拓展延伸',
    'ch19_project': 'Ch19-创意项目', 'ch19_quiz': 'Ch19-综合测试'
};
const ACHIEVEMENT_NAMES = {
    // 章节成就（与 script.js ACHIEVEMENTS 保持一致）
    'ch1_done': 'Python初识', 'ch2_done': '变量大师', 'ch3_done': '类型专家',
    'ch4_done': '判断达人', 'ch5_done': '逻辑高手', 'ch6_done': '循环入门',
    'ch7_done': '控制大师', 'ch8_done': '嵌套高手', 'ch9_done': '综合应用',
    'ch10_done': '星星画家', 'ch11_done': '列表新手', 'ch12_done': '列表达人',
    'ch13_done': '集合探索者', 'ch14_done': '字典大师', 'ch15_done': '字符串达人',
    'ch16_done': '语法通才', 'ch17_done': '二进制解码', 'ch18_done': '思维达人',
    'ch19_done': '数字专家',
    // 里程碑成就
    'milestone_beginner': '入门先锋', 'milestone_flow': '控制流大师',
    'milestone_data': '数据结构达人', 'milestone_advance': '拓展探索者',
    'champion': '全能学霸',
    // 兼容旧版成就ID
    'beginner': '入门之星', 'judge': '公正小法官', 'debugger': '调试能手',
    'creator': '创意达人', 'tracer': '追踪大师', 'explorer': '实验先锋', 'coder': '编程新星'
};

// ===== 会话管理 =====
function getAdminUser() {
    const data = sessionStorage.getItem('pv_admin_user');
    return data ? JSON.parse(data) : null;
}
function getAdminToken() {
    return sessionStorage.getItem('pv_admin_token') || '';
}
function checkAuth() {
    const admin = getAdminUser();
    if (!admin) { window.location.href = 'index.html'; return null; }
    document.getElementById('adminInfo').querySelector('span').textContent = admin.displayName;
    return admin;
}
async function handleLogout() {
    try {
        await apiFetch(API_BASE + '/logout', { method: 'POST' });
    } catch (e) { /* ignore */ }
    sessionStorage.removeItem('pv_admin_user');
    sessionStorage.removeItem('pv_admin_token');
    window.location.href = 'index.html';
}

// ===== API 封装 =====
async function apiFetch(url, options = {}) {
    const token = getAdminToken();
    if (!options.headers) options.headers = {};
    options.headers['X-Admin-Token'] = token;
    const res = await fetch(url, options);
    if (res.status === 401) {
        sessionStorage.removeItem('pv_admin_user');
        sessionStorage.removeItem('pv_admin_token');
        window.location.href = 'index.html';
        throw new Error('登录已过期');
    }
    if (!res.ok) throw new Error(`服务器错误 (${res.status})`);
    return await res.json();
}

// ===== 章节名称映射 =====
const CHAPTER_NAMES = {
    'ch1': '第1章 认识Python', 'ch2': '第2章 变量', 'ch3': '第3章 变量类型',
    'ch4': '第4章 条件判断', 'ch5': '第5章 if进阶', 'ch6': '第6章 while循环',
    'ch7': '第7章 while拓展', 'ch8': '第8章 循环嵌套', 'ch9': '第9章 综合应用一',
    'ch10': '第10章 排列小星星', 'ch11': '第11章 初识列表', 'ch12': '第12章 列表的使用',
    'ch13': '第13章 元组与集合', 'ch14': '第14章 神奇的字典', 'ch15': '第15章 再遇字符串',
    'ch16': '第16章 公共语法', 'ch17': '第17章 轻松搞定二进制', 'ch18': '第18章 编程思维实践',
    'ch19': '第19章 各种各样的数'
};

// ===== 页面导航 =====
function switchPage(name) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === name));
    document.querySelectorAll('.page-content').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    const titles = {
        'dashboard': '数据概览', 'students': '学生管理', 'import': '批量导入',
        'class-stats': '班级统计', 'notices': '公告管理', 'assignments': '作业管理',
        'activity': '活跃度监控', 'daily-questions': '每日一题', 'settings': '系统设置'
    };
    document.getElementById('pageTitle').textContent = titles[name] || name;
    if (name === 'dashboard') loadDashboard();
    if (name === 'students') loadStudents();
    if (name === 'class-stats') loadClassStats();
    if (name === 'notices') loadNotices();
    if (name === 'assignments') loadAssignments();
    if (name === 'activity') loadInactiveStudents();
    if (name === 'daily-questions') loadDailyQuestions();
    if (name === 'settings') loadSettings();
    // 隐藏弹窗
    document.getElementById('transferModal').style.display = 'none';
}
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => switchPage(item.dataset.page)));

function refreshCurrentPage() {
    const active = document.querySelector('.page-content.active');
    if (!active) return;
    switchPage(active.id.replace('page-', ''));
}

// ===== 数据概览 =====
async function loadDashboard() {
    try {
        const data = await apiFetch(API_BASE + '/stats');
        if (!data.success) return;
        const { stats } = data;
        document.getElementById('statStudents').textContent = stats.totalStudents;
        document.getElementById('statCompleted').textContent = stats.totalCompleted;
        document.getElementById('statAchievements').textContent = stats.totalAchievements;
        document.getElementById('statLogins').textContent = stats.totalLogins;

        const chartEl = document.getElementById('moduleChart');
        if (stats.moduleStats && stats.moduleStats.length > 0) {
            const total = stats.totalStudents || 1;
            chartEl.innerHTML = stats.moduleStats.map(m => {
                const pct = Math.min((m.count / total * 100), 100).toFixed(0);
                return `<div class="chart-bar-row"><span class="chart-label">${MODULE_NAMES[m.module_id] || m.module_id}</span><div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%">${m.count}</div></div></div>`;
            }).join('');
        } else chartEl.innerHTML = '<div class="empty-state">暂无数据</div>';

        const loginsEl = document.getElementById('recentLogins');
        if (stats.recentLogins && stats.recentLogins.length > 0) {
            loginsEl.innerHTML = stats.recentLogins.map(l =>
                `<div class="login-item"><span class="login-user"><i class="fas fa-user"></i>${esc(l.display_name)} (${esc(l.username)})</span><span class="login-time">${fmt(l.login_time)}</span></div>`
            ).join('');
        } else loginsEl.innerHTML = '<div class="empty-state">暂无数据</div>';

        // 加载新图表
        loadTrends();
        loadChapterCompletion();
        loadQuizScores();
    } catch (e) { console.error(e); }
}

// ===== 学生管理 =====
let allStudents = [];
let selectedIds = new Set();
let studentPage = 1;
let studentTotal = 0;
const PAGE_SIZE = 50;

async function loadStudents(page = 1) {
    try {
        studentPage = page;
        const data = await apiFetch(API_BASE + '/students?page=' + page + '&pageSize=' + PAGE_SIZE);
        if (!data.success) return;
        allStudents = data.students;
        studentTotal = data.total;
        selectedIds.clear();
        updateSelectAllCheckbox();
        updateSelectedCount();
        renderStudentTable();
        renderPagination();
    } catch (e) {
        document.getElementById('studentTableBody').innerHTML = `<tr><td colspan="11" class="empty-state">加载失败：${e.message}</td></tr>`;
    }
}

function renderPagination() {
    const totalPages = Math.ceil(studentTotal / PAGE_SIZE);
    let html = `<span style="color:#666;font-size:13px;">共 ${studentTotal} 名学生，${totalPages} 页</span>`;
    html += `<button class="btn-sm btn-outline" onclick="loadStudents(1)" ${studentPage <= 1 ? 'disabled' : ''}>首页</button>`;
    html += `<button class="btn-sm btn-outline" onclick="loadStudents(${studentPage - 1})" ${studentPage <= 1 ? 'disabled' : ''}>上一页</button>`;
    html += `<span style="font-size:13px;">第 ${studentPage}/${totalPages} 页</span>`;
    html += `<button class="btn-sm btn-outline" onclick="loadStudents(${studentPage + 1})" ${studentPage >= totalPages ? 'disabled' : ''}>下一页</button>`;
    html += `<button class="btn-sm btn-outline" onclick="loadStudents(${totalPages})" ${studentPage >= totalPages ? 'disabled' : ''}>末页</button>`;
    document.getElementById('paginationBar').innerHTML = html;
}

function getFilteredStudents() {
    const keyword = document.getElementById('studentSearch').value.toLowerCase();
    const grade = document.getElementById('filterGrade').value;
    const cls = document.getElementById('filterClass').value;
    const status = document.getElementById('filterStatus').value;
    return allStudents.filter(s => {
        if (keyword && !s.display_name.toLowerCase().includes(keyword) && !s.username.toLowerCase().includes(keyword)) return false;
        if (grade && s.grade !== grade) return false;
        if (cls && s.class_num != cls) return false;
        if (status && s.status !== status) return false;
        return true;
    });
}

function renderStudentTable() {
    const filtered = getFilteredStudents();
    const tbody = document.getElementById('studentTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-state">暂无匹配的学生</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(s => `
        <tr onclick="openStudentDetail(${s.id})" style="cursor:pointer;">
            <td onclick="event.stopPropagation()"><input type="checkbox" class="student-checkbox" data-id="${s.id}" ${selectedIds.has(s.id) ? 'checked' : ''} onchange="toggleStudent(${s.id})"></td>
            <td><strong>${esc(s.display_name)}</strong></td>
            <td>${esc(s.username)}</td>
            <td>${esc(s.grade || '-')}</td>
            <td>${s.class_num ? s.class_num + '班' : '-'}</td>
            <td><span class="status-tag ${s.status}">${s.status === 'graduated' ? '已毕业' : '在读'}</span></td>
            <td>${s.completed_modules}</td>
            <td>${s.achievement_count}</td>
            <td>${s.login_days}</td>
            <td>${s.last_login ? fmt(s.last_login) : '从未登录'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="event.stopPropagation();resetSinglePassword(${s.id},'${esc(s.display_name)}')" title="重置密码"><i class="fas fa-key"></i></button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteSingle(${s.id},'${esc(s.display_name)}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    updateSelectAllCheckbox();
}

function toggleStudent(id) {
    selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
    updateSelectedCount();
    updateSelectAllCheckbox();
}

function toggleSelectAll() {
    const checked = document.getElementById('selectAllCheckbox').checked;
    const filtered = getFilteredStudents();
    if (checked) filtered.forEach(s => selectedIds.add(s.id));
    else filtered.forEach(s => selectedIds.delete(s.id));
    renderStudentTable();
    updateSelectedCount();
}

function selectAll() {
    getFilteredStudents().forEach(s => selectedIds.add(s.id));
    renderStudentTable();
    updateSelectedCount();
}

function clearSelection() {
    selectedIds.clear();
    renderStudentTable();
    updateSelectedCount();
}

function updateSelectAllCheckbox() {
    const filtered = getFilteredStudents();
    const cb = document.getElementById('selectAllCheckbox');
    if (filtered.length === 0) cb.checked = false;
    else cb.checked = filtered.every(s => selectedIds.has(s.id));
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = `已选 ${selectedIds.size} 人`;
}

function getSelectedIds() { return Array.from(selectedIds); }

async function deleteSingle(id, name) {
    if (!confirm(`确定要删除学生「${name}」吗？`)) return;
    try {
        const data = await apiFetch(API_BASE + '/student/' + id, { method: 'DELETE' });
        if (data.success) { loadStudents(); loadDashboard(); }
        else alert('删除失败：' + data.error);
    } catch (e) { alert('删除失败：' + e.message); }
}

async function resetSinglePassword(id, name) {
    const pwd = prompt(`请输入「${name}」的新密码（默认 123456）：`, '123456');
    if (!pwd) return;
    try {
        const data = await apiFetch(API_BASE + '/students/batch', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id], action: 'resetPassword', value: pwd })
        });
        if (data.success) { alert(`「${name}」的密码已重置为「${pwd}」`); }
        else alert('重置失败: ' + data.error);
    } catch (e) { alert('重置失败: ' + e.message); }
}

// ===== 批量操作 =====
async function batchAction(action, value, confirmMsg) {
    const ids = getSelectedIds();
    if (ids.length === 0) { alert('请先选择学生'); return; }
    if (!confirm(confirmMsg.replace('{n}', ids.length))) return;
    try {
        const data = await apiFetch(API_BASE + '/students/batch', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, action, value })
        });
        if (data.success) { alert(`操作成功，已影响 ${data.affected} 名学生`); loadStudents(); loadDashboard(); }
        else alert('操作失败：' + data.error);
    } catch (e) { alert('操作失败：' + e.message); }
}

function batchGraduate() { batchAction('graduate', null, '确定将 {n} 名学生设为「已毕业」？\n\n毕业后将无法登录。'); }
function batchActivate() { batchAction('activate', null, '确定将 {n} 名学生设为「在读」？'); }
function batchResetPassword() {
    const pwd = prompt('请输入新密码（默认 123456）：', '123456');
    if (!pwd) return;
    batchAction('resetPassword', pwd, `确定重置 {n} 名学生的密码为「${pwd}」？`);
}

// ===== 转班弹窗 =====
function batchTransfer() {
    const ids = getSelectedIds();
    if (ids.length === 0) { alert('请先选择学生'); return; }
    document.getElementById('transferInfo').textContent = `正在为 ${ids.length} 名学生转班`;
    // 初始化班级下拉
    const sel = document.getElementById('transferClass');
    sel.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = i + '班'; sel.appendChild(opt);
    }
    document.getElementById('transferModal').style.display = 'flex';
}
function closeTransferModal() { document.getElementById('transferModal').style.display = 'none'; }
function confirmTransfer() {
    const grade = document.getElementById('transferGrade').value;
    const classNum = parseInt(document.getElementById('transferClass').value);
    batchAction('transfer', { grade, classNum }, `确定将 {n} 名学生转到「${grade}${classNum}班」？`);
    closeTransferModal();
}

// ===== 批量导入 =====
async function doImport() {
    const text = document.getElementById('importText').value.trim();
    if (!text) { alert('请输入导入数据'); return; }

    const lines = text.split('\n').filter(l => l.trim());
    const students = [];
    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 2) continue;
        students.push({
            displayName: parts[0],
            username: parts[1],
            password: parts[2] || '123456',
            grade: parts[3] || '七年级',
            classNum: parseInt(parts[4]) || 1
        });
    }

    if (students.length === 0) { alert('未能解析任何数据，请检查格式'); return; }

    const resultEl = document.getElementById('importResult');
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在导入...';

    try {
        const data = await apiFetch(API_BASE + '/students/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students })
        });
        if (data.success) {
            const cls = data.results.failed === 0 ? 'success' : 'partial';
            resultEl.className = 'import-result ' + cls;
            resultEl.innerHTML = `
                <strong>导入完成！</strong> 成功 ${data.results.success} 条，失败 ${data.results.failed} 条
                ${data.results.errors.length > 0 ? '<br><small>' + data.results.errors.slice(0, 10).map(e => esc(e)).join('<br>') + '</small>' : ''}
            `;
            if (data.results.success > 0) { loadStudents(); loadDashboard(); }
        } else {
            resultEl.className = 'import-result partial';
            resultEl.innerHTML = '导入失败：' + data.error;
        }
    } catch (e) {
        resultEl.className = 'import-result partial';
        resultEl.innerHTML = '导入失败：' + e.message;
    }
}

function downloadTemplate() {
    const BOM = '\uFEFF';
    const csv = BOM + '姓名,用户名,密码,年级,班级\n' +
        '张三,zhangsan,123456,七年级,3\n' +
        '李四,lisi,123456,七年级,1\n' +
        '王五,wangwu,123456,八年级,5';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function exportClassStats() {
    window.open(API_BASE + '/stats/class/export', '_blank');
}

// ===== 班级统计 =====
async function loadClassStats() {
    try {
        const data = await apiFetch(API_BASE + '/stats/class');
        if (!data.success) return;
        const tbody = document.getElementById('classStatsBody');
        if (data.classStats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无数据</td></tr>';
            return;
        }
        tbody.innerHTML = data.classStats.map(c => {
            const avgVal = Number(c.avg_modules) || 0;
            const pct = Math.min((avgVal / TOTAL_MODULES * 100), 100).toFixed(1);
            return `
            <tr>
                <td>${esc(c.grade)}</td>
                <td><strong>${c.class_num}班</strong></td>
                <td>${c.total}</td>
                <td>${c.active}</td>
                <td>${c.graduated}</td>
                <td>${avgVal.toFixed(1)}</td>
                <td>
                    <div class="class-progress-bar">
                        <div class="class-progress-fill" style="width:${pct}%"></div>
                    </div>
                </td>
            </tr>
        `;}).join('');
    } catch (e) { console.error(e); }
}

// ===== 学生详情弹窗 =====
async function openStudentDetail(id) {
    try {
        const data = await apiFetch(API_BASE + '/student/' + id);
        if (!data.success) { alert('获取详情失败: ' + data.error); return; }
        const s = data.student;
        const pct = s.completed_modules ? Math.min((s.completed_modules / TOTAL_MODULES * 100), 100).toFixed(1) : 0;
        document.getElementById('detailTitle').textContent = s.display_name + ' 的详情';
        document.getElementById('detailBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>用户名</label><span>${esc(s.username)}</span></div>
                <div class="detail-item"><label>姓名</label><span>${esc(s.display_name)}</span></div>
                <div class="detail-item"><label>年级</label><span>${esc(s.grade || '-')}</span></div>
                <div class="detail-item"><label>班级</label><span>${s.class_num ? s.class_num + '班' : '-'}</span></div>
                <div class="detail-item"><label>状态</label><span class="status-tag ${s.status}">${s.status === 'graduated' ? '已毕业' : '在读'}</span></div>
                <div class="detail-item"><label>注册时间</label><span>${fmt(s.created_at)}</span></div>
            </div>
            <h4 style="margin-top:20px;">学习进度</h4>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
                <span class="progress-bar-text">${pct}% (${s.completed_modules || 0}/${TOTAL_MODULES})</span>
            </div>
            <div class="detail-modules" style="margin-top:10px;">${data.modules.length > 0 ? data.modules.map(m => `<span class="module-chip">${MODULE_NAMES[m.module_id] || m.module_id} <small>${fmt(m.completed_at)}</small></span>`).join('') : '<span class="empty-state">暂无</span>'}</div>
            <h4 style="margin-top:20px;">成就列表</h4>
            <div class="detail-modules">${data.achievements.length > 0 ? data.achievements.map(a => `<span class="module-chip achievement">${ACHIEVEMENT_NAMES[a.achievement_id] || a.achievement_id} <small>${fmt(a.earned_at)}</small></span>`).join('') : '<span class="empty-state">暂无</span>'}</div>
            <h4 style="margin-top:20px;">测验成绩</h4>
            <div class="detail-modules">${data.quizScores && data.quizScores.length > 0 ? data.quizScores.map(q => `<span class="module-chip" style="background:rgba(16,185,129,0.1);color:var(--success);">${CHAPTER_NAMES[q.module_id] || q.module_id}: ${q.score}分</span>`).join('') : '<span class="empty-state">暂无</span>'}</div>
            <h4 style="margin-top:20px;">最近登录记录</h4>
            <div class="detail-logins">${data.loginLogs && data.loginLogs.length > 0 ? data.loginLogs.slice(0, 20).map(l => `<div class="login-item"><span>${fmt(l.login_time)}</span><span class="login-ip">${esc(l.ip_address || '')}</span></div>`).join('') : '<span class="empty-state">暂无</span>'}</div>
        `;
        document.getElementById('studentDetailModal').style.display = 'flex';
    } catch (e) { alert('获取详情失败: ' + e.message); }
}
function closeStudentDetail() { document.getElementById('studentDetailModal').style.display = 'none'; }

// ===== 批量删除 =====
async function batchDelete() {
    const ids = getSelectedIds();
    if (ids.length === 0) { alert('请先选择学生'); return; }
    if (!confirm(`确定删除 ${ids.length} 名学生吗？此操作不可恢复！`)) return;
    try {
        const data = await apiFetch(API_BASE + '/students/batch', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, action: 'delete' })
        });
        if (data.success) { alert(`已删除 ${data.affected} 名学生`); loadStudents(); loadDashboard(); }
        else alert('删除失败: ' + data.error);
    } catch (e) { alert('删除失败: ' + e.message); }
}

// ===== 公告管理 =====
async function loadNotices() {
    try {
        const data = await apiFetch(API_BASE + '/notices');
        if (!data.success) return;
        const el = document.getElementById('noticeList');
        if (data.notices.length === 0) {
            el.innerHTML = '<div class="empty-notices"><i class="fas fa-bullhorn"></i><p>暂无公告，点击左侧发布第一条公告</p></div>';
            return;
        }
        el.innerHTML = data.notices.map(n => `
            <div class="notice-item">
                <div class="notice-header">
                    <span class="notice-title">${esc(n.title)}</span>
                    <span class="notice-time">${fmt(n.created_at)}</span>
                </div>
                <div class="notice-body">${esc(n.content)}</div>
                <div class="notice-actions">
                    <button class="btn btn-sm btn-info" onclick="openNoticeEdit(${n.id},'${esc(n.title)}','${esc(n.content)}')"><i class="fas fa-edit"></i> 编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteNotice(${n.id})"><i class="fas fa-trash"></i> 删除</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}
async function publishNotice() {
    const title = document.getElementById('noticeTitle').value.trim();
    const content = document.getElementById('noticeContent').value.trim();
    if (!title) { alert('请输入标题'); return; }
    if (!content) { alert('请输入内容'); return; }
    try {
        const data = await apiFetch(API_BASE + '/notices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content })
        });
        if (data.success) {
            document.getElementById('noticeTitle').value = '';
            document.getElementById('noticeContent').value = '';
            loadNotices();
        } else alert('发布失败: ' + data.error);
    } catch (e) { alert('发布失败: ' + e.message); }
}
async function deleteNotice(id) {
    if (!confirm('确定删除此公告？')) return;
    try {
        const data = await apiFetch(API_BASE + '/notices/' + id, { method: 'DELETE' });
        if (data.success) loadNotices();
        else alert('删除失败: ' + data.error);
    } catch (e) { alert('删除失败: ' + e.message); }
}

function openNoticeEdit(id, title, content) {
    document.getElementById('editNoticeId').value = id;
    document.getElementById('editNoticeTitle').value = title;
    document.getElementById('editNoticeContent').value = content;
    document.getElementById('noticeEditModal').style.display = 'flex';
}
function closeNoticeEdit() {
    document.getElementById('noticeEditModal').style.display = 'none';
}
async function saveNoticeEdit() {
    const id = document.getElementById('editNoticeId').value;
    const title = document.getElementById('editNoticeTitle').value.trim();
    const content = document.getElementById('editNoticeContent').value.trim();
    if (!title) { alert('请输入标题'); return; }
    if (!content) { alert('请输入内容'); return; }
    try {
        const body = { title, content };
        const data = await apiFetch(API_BASE + '/notices/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (data.success) {
            closeNoticeEdit();
            loadNotices();
        } else alert('保存失败: ' + data.error);
    } catch (e) { alert('保存失败: ' + e.message); }
}

// ===== 学习趋势图表 =====
async function loadTrends() {
    try {
        const data = await apiFetch(API_BASE + '/trends?days=30');
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = 280;

        if (!data.success || !data.trends || data.trends.length === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据', width / 2, height / 2);
            return;
        }

        renderTrendChart(ctx, data.trends, width, height);
    } catch (e) { console.error('加载趋势失败:', e); }
}

function renderTrendChart(ctx, trends, width, height) {
    const padding = { top: 30, right: 30, bottom: 50, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxModules = Math.max(...trends.map(t => t.newModules || 0), 1);
    const maxLogins = Math.max(...trends.map(t => t.newLogins || 0), 1);
    const maxVal = Math.max(maxModules, maxLogins, 1);

    // 背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // 网格线
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        const val = Math.round(maxVal - (maxVal / gridLines) * i);
        ctx.fillText(val, padding.left - 8, y + 4);
    }

    // X轴标签
    const step = Math.max(1, Math.floor(trends.length / 8));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    for (let i = 0; i < trends.length; i += step) {
        const x = padding.left + (chartW / (trends.length - 1)) * i;
        const label = trends[i].date ? trends[i].date.slice(5) : '';
        ctx.fillText(label, x, height - padding.bottom + 20);
    }

    // 折线 - 新增模块
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trends.forEach((t, i) => {
        const x = padding.left + (chartW / (trends.length - 1)) * i;
        const y = padding.top + chartH - ((t.newModules || 0) / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 折线 - 新增登录
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    trends.forEach((t, i) => {
        const x = padding.left + (chartW / (trends.length - 1)) * i;
        const y = padding.top + chartH - ((t.newLogins || 0) / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 图例
    const legendY = 15;
    ctx.fillStyle = '#667eea';
    ctx.fillRect(padding.left, legendY - 6, 12, 12);
    ctx.fillStyle = '#1e293b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('新增模块', padding.left + 18, legendY + 4);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(padding.left + 90, legendY - 6, 12, 12);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('新增登录', padding.left + 108, legendY + 4);
}

// ===== 章节完成率 =====
async function loadChapterCompletion() {
    try {
        const data = await apiFetch(API_BASE + '/chapter-completion');
        const el = document.getElementById('chapterCompletion');
        if (!el) return;
        if (!data.success || !data.chapters || data.chapters.length === 0) {
            el.innerHTML = '<div class="empty-state">暂无数据</div>';
            return;
        }
        const sorted = [...data.chapters].sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0));
        el.innerHTML = sorted.map(c => {
            const rate = (c.completionRate || 0).toFixed(1);
            const name = CHAPTER_NAMES[c.chapterId] || c.chapterName || c.chapterId;
            return `<div class="chart-bar-row" style="margin-bottom:8px;">
                <span class="chart-label" style="width:130px;">${esc(name)}</span>
                <div class="chart-bar-track" style="flex:1;">
                    <div class="chart-bar-fill" style="width:${rate}%;background:linear-gradient(90deg,#10b981,#34d399);">${c.completedCount || 0}/${c.totalStudents || 0}</div>
                </div>
                <span style="width:45px;font-size:12px;color:var(--text-secondary);text-align:right;">${rate}%</span>
            </div>`;
        }).join('');
    } catch (e) { console.error('加载章节完成率失败:', e); }
}

// ===== 测验成绩 =====
async function loadQuizScores() {
    try {
        const data = await apiFetch(API_BASE + '/quiz-scores');
        const tbody = document.getElementById('quizScoresBody');
        if (!tbody) return;
        if (!data.success || !data.quizScores || data.quizScores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">暂无数据</td></tr>';
            return;
        }
        const sorted = [...data.quizScores].sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0));
        tbody.innerHTML = sorted.map(s => {
            const name = CHAPTER_NAMES[s.moduleId] || s.moduleId;
            const avg = (s.avgScore || 0).toFixed(1);
            const lowScore = parseFloat(avg) < 60;
            return `<tr>
                <td>${esc(name)}</td>
                <td><span class="${lowScore ? 'score-low' : 'score-normal'}">${avg}</span></td>
                <td>${s.studentCount || 0}</td>
            </tr>`;
        }).join('');
    } catch (e) { console.error('加载测验成绩失败:', e); }
}

// ===== 作业管理 =====
async function loadAssignments() {
    try {
        const data = await apiFetch(API_BASE + '/assignments');
        const el = document.getElementById('assignmentList');
        if (!data.success || !data.assignments || data.assignments.length === 0) {
            el.innerHTML = '<div class="empty-notices"><i class="fas fa-tasks"></i><p>暂无作业，点击左侧发布第一条作业</p></div>';
            return;
        }
        el.innerHTML = data.assignments.map(a => {
            const chapterName = CHAPTER_NAMES[a.chapter_id] || a.chapter_id || '-';
            const status = new Date(a.due_date) < new Date() ? '<span class="status-tag graduated">已截止</span>' : '<span class="status-tag active">进行中</span>';
            return `<div class="notice-item">
                <div class="notice-header">
                    <span class="notice-title">${esc(a.title)} ${status}</span>
                    <span class="notice-time">截止: ${fmt(a.due_date)}</span>
                </div>
                <div class="notice-body">${esc(a.description || '')}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
                    关联章节: ${esc(chapterName)} | 提交: ${a.submission_count || 0}
                </div>
                <div class="notice-actions">
                    <button class="btn btn-sm btn-info" onclick="viewSubmissions(${a.id})"><i class="fas fa-eye"></i> 查看提交</button>
                    <button class="btn btn-sm btn-info" onclick="editAssignment(${a.id})"><i class="fas fa-edit"></i> 编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAssignment(${a.id})"><i class="fas fa-trash"></i> 删除</button>
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error('加载作业失败:', e); }
}

async function publishAssignment() {
    const title = document.getElementById('assignmentTitle').value.trim();
    const description = document.getElementById('assignmentDesc').value.trim();
    const chapterId = document.getElementById('assignmentChapter').value;
    const dueDate = document.getElementById('assignmentDueDate').value;
    if (!title) { alert('请输入作业标题'); return; }
    if (!chapterId) { alert('请选择关联章节'); return; }
    try {
        const body = { title, description, chapterId: chapterId };
        if (dueDate) body.dueDate = dueDate;
        const data = await apiFetch(API_BASE + '/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (data.success) {
            document.getElementById('assignmentTitle').value = '';
            document.getElementById('assignmentDesc').value = '';
            document.getElementById('assignmentChapter').value = '';
            document.getElementById('assignmentDueDate').value = '';
            loadAssignments();
        } else alert('发布失败: ' + data.error);
    } catch (e) { alert('发布失败: ' + e.message); }
}

async function editAssignment(id) {
    try {
        const data = await apiFetch(API_BASE + '/assignments');
        if (!data.success) return;
        const a = data.assignments.find(x => x.id === id);
        if (!a) { alert('未找到该作业'); return; }
        document.getElementById('editAssignmentId').value = a.id;
        document.getElementById('editAssignmentTitle').value = a.title || '';
        document.getElementById('editAssignmentDesc').value = a.description || '';
        document.getElementById('editAssignmentChapter').value = a.chapter_id || '';
        if (a.due_date) {
            document.getElementById('editAssignmentDueDate').value = a.due_date.replace(' ', 'T').slice(0, 16);
        }
        document.getElementById('assignmentEditModal').style.display = 'flex';
    } catch (e) { alert('获取作业信息失败: ' + e.message); }
}

function closeAssignmentEdit() { document.getElementById('assignmentEditModal').style.display = 'none'; }

async function saveAssignmentEdit() {
    const id = document.getElementById('editAssignmentId').value;
    const title = document.getElementById('editAssignmentTitle').value.trim();
    const description = document.getElementById('editAssignmentDesc').value.trim();
    const chapterId = document.getElementById('editAssignmentChapter').value;
    const dueDate = document.getElementById('editAssignmentDueDate').value;
    if (!title) { alert('请输入标题'); return; }
    try {
        const body = { title, description, chapterId: chapterId };
        if (dueDate) body.dueDate = dueDate;
        const data = await apiFetch(API_BASE + '/assignments/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (data.success) {
            closeAssignmentEdit();
            loadAssignments();
        } else alert('保存失败: ' + data.error);
    } catch (e) { alert('保存失败: ' + e.message); }
}

async function deleteAssignment(id) {
    if (!confirm('确定删除此作业？')) return;
    try {
        const data = await apiFetch(API_BASE + '/assignments/' + id, { method: 'DELETE' });
        if (data.success) loadAssignments();
        else alert('删除失败: ' + data.error);
    } catch (e) { alert('删除失败: ' + e.message); }
}

async function viewSubmissions(id) {
    try {
        const data = await apiFetch(API_BASE + '/assignments/' + id + '/submissions');
        const body = document.getElementById('submissionsBody');
        if (!data.success) { body.innerHTML = '<div class="empty-state">加载失败</div>'; }
        else if (!data.submissions || data.submissions.length === 0) {
            body.innerHTML = '<div class="empty-state">暂无提交记录</div>';
        } else {
            body.innerHTML = `<table class="data-table" style="width:100%;">
                <thead><tr><th>学生</th><th>提交状态</th><th>内容</th><th>提交时间</th></tr></thead>
                <tbody>${data.submissions.map(s => `<tr>
                    <td>${esc(s.display_name || s.student_name || '')}</td>
                    <td><span class="status-tag ${s.status === 'submitted' ? 'active' : 'graduated'}">${s.status === 'submitted' ? '已提交' : '未提交'}</span></td>
                    <td style="max-width:250px;white-space:normal;">${esc(s.content || '-')}</td>
                    <td>${fmt(s.submitted_at)}</td>
                </tr>`).join('')}</tbody>
            </table>`;
        }
        document.getElementById('submissionsModal').style.display = 'flex';
    } catch (e) { alert('获取提交详情失败: ' + e.message); }
}

function closeSubmissions() { document.getElementById('submissionsModal').style.display = 'none'; }

// ===== 活跃度监控 =====
async function loadInactiveStudents(days) {
    if (!days) days = document.getElementById('inactiveDays')?.value || 7;
    try {
        const data = await apiFetch(API_BASE + '/inactive-students?days=' + days);
        const tbody = document.getElementById('inactiveBody');
        if (!tbody) return;
        if (!data.success || !data.inactiveStudents || data.inactiveStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">没有不活跃的学生，太棒了！</td></tr>';
            return;
        }
        const now = new Date();
        tbody.innerHTML = data.inactiveStudents.map(s => {
            const lastLogin = s.last_login ? new Date(s.last_login) : null;
            const daysAgo = lastLogin ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : '从未';
            return `<tr>
                <td><strong>${esc(s.displayName || s.display_name)}</strong></td>
                <td>${esc(s.grade || '-')}</td>
                <td>${s.classNum ? s.classNum + '班' : (s.class_num ? s.class_num + '班' : '-')}</td>
                <td>${lastLogin ? fmt(s.last_login) : '从未登录'}</td>
                <td><span class="days-ago">${daysAgo}天</span></td>
                <td><button class="btn btn-sm btn-warning" onclick="sendReminder(${s.id},'${esc(s.displayName || s.display_name)}')"><i class="fas fa-bell"></i> 提醒</button></td>
            </tr>`;
        }).join('');
    } catch (e) { console.error('加载活跃度失败:', e); }
}

function sendReminder(id, name) {
    alert(`已向「${name}」发送提醒通知（功能预留，需后端支持）`);
}

// ===== 每日一题管理 =====
async function loadDailyQuestions() {
    try {
        const data = await apiFetch(API_BASE + '/daily-questions');
        const el = document.getElementById('dailyQuestionList');
        if (!data.success || !data.questions || data.questions.length === 0) {
            el.innerHTML = '<div class="empty-notices"><i class="fas fa-calendar-check"></i><p>暂无题目，点击左侧发布第一道题</p></div>';
            return;
        }
        el.innerHTML = data.questions.map(q => {
            const options = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
            return `<div class="notice-item">
            <div class="notice-header">
                <span class="notice-title">${esc(q.question)}</span>
                <span class="notice-time">${q.question_date || ''}</span>
            </div>
            <div class="notice-body">
                A. ${esc(options[0] || '')} &nbsp; B. ${esc(options[1] || '')} &nbsp; C. ${esc(options[2] || '')} &nbsp; D. ${esc(options[3] || '')}<br>
                <span style="color:var(--success);">答案: ${esc(q.answer || '')}</span>
            </div>
            <div class="notice-actions">
                <button class="btn btn-sm btn-danger" onclick="deleteDailyQuestion(${q.id})"><i class="fas fa-trash"></i> 删除</button>
            </div>
        </div>`;}).join('');
    } catch (e) { console.error('加载每日一题失败:', e); }
}

async function addDailyQuestion() {
    const question = document.getElementById('dqQuestion').value.trim();
    const optionA = document.getElementById('dqOptionA').value.trim();
    const optionB = document.getElementById('dqOptionB').value.trim();
    const optionC = document.getElementById('dqOptionC').value.trim();
    const optionD = document.getElementById('dqOptionD').value.trim();
    const answer = document.getElementById('dqAnswer').value;
    const date = document.getElementById('dqDate').value;
    const explanation = document.getElementById('dqExplanation').value.trim();
    if (!question) { alert('请输入题目'); return; }
    if (!optionA || !optionB || !optionC || !optionD) { alert('请填写所有选项'); return; }
    try {
        const body = { question, options: [optionA, optionB, optionC, optionD], answer, explanation, questionDate: date };
        const data = await apiFetch(API_BASE + '/daily-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (data.success) {
            document.getElementById('dqQuestion').value = '';
            document.getElementById('dqOptionA').value = '';
            document.getElementById('dqOptionB').value = '';
            document.getElementById('dqOptionC').value = '';
            document.getElementById('dqOptionD').value = '';
            document.getElementById('dqExplanation').value = '';
            document.getElementById('dqDate').value = '';
            loadDailyQuestions();
        } else alert('发布失败: ' + data.error);
    } catch (e) { alert('发布失败: ' + e.message); }
}

async function deleteDailyQuestion(id) {
    if (!confirm('确定删除此题目？')) return;
    try {
        const data = await apiFetch(API_BASE + '/daily-questions/' + id, { method: 'DELETE' });
        if (data.success) loadDailyQuestions();
        else alert('删除失败: ' + data.error);
    } catch (e) { alert('删除失败: ' + e.message); }
}

// 覆盖 loadNotices 以兼容覆盖版
const _origLoadNotices = loadNotices;
loadNotices = async function() {
    try {
        const data = await apiFetch(API_BASE + '/notices');
        if (!data.success) return;
        const el = document.getElementById('noticeList');
        if (data.notices.length === 0) {
            el.innerHTML = '<div class="empty-notices"><i class="fas fa-bullhorn"></i><p>暂无公告，点击左侧发布第一条公告</p></div>';
            return;
        }
        el.innerHTML = data.notices.map(n => {
            return `<div class="notice-item">
                <div class="notice-header">
                    <span class="notice-title">${esc(n.title)}</span>
                    <span class="notice-time">${fmt(n.created_at)}</span>
                </div>
                <div class="notice-body">${esc(n.content)}</div>
                <div class="notice-actions">
                    <button class="btn btn-sm btn-info" onclick="openNoticeEdit(${n.id},'${esc(n.title)}','${esc(n.content)}')"><i class="fas fa-edit"></i> 编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteNotice(${n.id})"><i class="fas fa-trash"></i> 删除</button>
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error(e); }
};

// 覆盖 openNoticeEdit 以兼容覆盖版
const _origOpenNoticeEdit = openNoticeEdit;
openNoticeEdit = function(id, title, content) {
    document.getElementById('editNoticeId').value = id;
    document.getElementById('editNoticeTitle').value = title;
    document.getElementById('editNoticeContent').value = content;
    document.getElementById('noticeEditModal').style.display = 'flex';
};

// ===== 数据导出增强 =====
function exportCSV() {
    window.open(API_BASE + '/export', '_blank');
}

async function exportDetailedReport() {
    try {
        const data = await apiFetch(API_BASE + '/export/excel');
        if (!data.success) { alert('导出失败: ' + data.error); return; }
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `详细报告_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) { alert('导出失败: ' + e.message); }
}

// ===== 系统设置增强 =====
const _origLoadSettings = loadSettings;
loadSettings = function() {
    _origLoadSettings();
    loadAdminList();
};

async function loadAdminList() {
    try {
        const data = await apiFetch(API_BASE + '/admins');
        const tbody = document.getElementById('adminListBody');
        if (!tbody) return;
        if (!data.success || !data.admins || data.admins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无数据</td></tr>';
            return;
        }
        tbody.innerHTML = data.admins.map(a => {
            const roleName = a.role === 'super' ? '超级管理员' : (a.role === 'sub' ? '子管理员' : (a.role || '-'));
            return `<tr>
                <td>${esc(a.username)}</td>
                <td>${esc(a.display_name)}</td>
                <td><span class="status-tag ${a.role === 'super' ? 'active' : ''}">${roleName}</span></td>
                <td>${fmt(a.created_at)}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        // 接口可能不存在，静默处理
        const tbody = document.getElementById('adminListBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无数据</td></tr>';
    }
}

function createSubAdmin() {
    alert('创建子管理员功能即将上线，敬请期待！');
}

// ===== 工具函数 =====
function fmt(d) {
    if (!d) return '-';
    const dt = new Date(d);
    const pad = n => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function esc(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ===== 文件导入 =====
function handleFileImport() {
    const file = document.getElementById('csvFileInput').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        // 跳过BOM和空行
        const lines = text.split('\n').filter(l => l.trim());
        // 跳过标题行（如果第一行包含"姓名"）
        let start = 0;
        if (lines[0] && lines[0].includes('姓名')) start = 1;
        const data = lines.slice(start).join('\n');
        document.getElementById('importText').value = data;
    };
    reader.readAsText(file, 'UTF-8');
    document.getElementById('csvFileInput').value = '';
}

// ===== 系统设置 =====
function loadSettings() {
    loadOperationLogs();
}

async function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (!oldPassword) { alert('请输入当前密码'); return; }
    if (!newPassword) { alert('请输入新密码'); return; }
    if (newPassword.length < 4) { alert('新密码至少4位'); return; }
    if (newPassword !== confirmPassword) { alert('两次密码不一致'); return; }
    try {
        const data = await apiFetch(API_BASE + '/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        if (data.success) {
            alert('密码修改成功！');
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else alert('修改失败: ' + data.error);
    } catch (e) { alert('修改失败: ' + e.message); }
}

function backupDatabase() {
    window.open(API_BASE + '/backup', '_blank');
}

async function restoreDatabase() {
    const file = document.getElementById('restoreFile').files[0];
    if (!file) return;
    if (!confirm('恢复数据将覆盖所有现有数据，确定继续？')) {
        document.getElementById('restoreFile').value = '';
        return;
    }
    const el = document.getElementById('restoreResult');
    el.classList.remove('success', 'error');
    el.style.display = 'block';
    el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在恢复...';
    try {
        const text = await file.text();
        const backupData = JSON.parse(text);
        const data = await apiFetch(API_BASE + '/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupData)
        });
        if (data.success) {
            el.classList.add('success');
            el.classList.remove('error');
            el.innerHTML = '<i class="fas fa-check"></i> 数据恢复成功！';
            loadStudents(); loadDashboard();
        } else {
            el.classList.add('error');
            el.classList.remove('success');
            el.innerHTML = '<i class="fas fa-times"></i> 恢复失败: ' + data.error;
        }
    } catch (e) {
        el.classList.add('error');
        el.classList.remove('success');
        el.innerHTML = '<i class="fas fa-times"></i> 恢复失败: ' + (e.message || '文件格式错误');
    }
    setTimeout(() => {
        document.getElementById('restoreFile').value = '';
        el.style.display = 'none';
    }, 3000);
}

async function loadOperationLogs() {
    try {
        const data = await apiFetch(API_BASE + '/logs');
        if (!data.success) return;
        const tbody = document.getElementById('operationLogsBody');
        if (data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="logs-empty"><i class="fas fa-history"></i><p>暂无操作日志</p></td></tr>';
            return;
        }
        tbody.innerHTML = data.logs.map(l => `
            <tr>
                <td>${fmt(l.created_at)}</td>
                <td><span class="log-action">${esc(l.action)}</span></td>
                <td>${esc(l.detail)}</td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// ===== 初始化班级筛选下拉 =====
(function initClassFilters() {
    function fillSelect(sel) {
        if (!sel) return;
        for (let i = 1; i <= 20; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.textContent = i + '班'; sel.appendChild(opt);
        }
    }
    fillSelect(document.getElementById('filterClass'));
})();

// ===== 启动 =====
(function init() {
    const admin = checkAuth();
    if (!admin) return;
    switchPage('dashboard');
})();