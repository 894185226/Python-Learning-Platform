/* ===================================================
   管理后台 JS - 完整版
   =================================================== */

const API_BASE = '/api/admin';

// ===== 模块/成就名称映射 =====
const MODULE_NAMES = {
    'intro': '情境导入', 'lab': '类比实验室', 'lesson': '知识讲解',
    'judge': '命名小法官', 'practice': '实践操作', 'trace': '值追踪',
    'debug': '错误调试', 'extend': '拓展延伸', 'project': '创意项目', 'test': '综合测试'
};
const ACHIEVEMENT_NAMES = {
    'beginner': '入门之星', 'judge': '公正小法官', 'debugger': '调试能手',
    'creator': '创意达人', 'champion': '全能学霸', 'tracer': '追踪大师',
    'explorer': '实验先锋', 'coder': '编程新星'
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

// ===== 页面导航 =====
function switchPage(name) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === name));
    document.querySelectorAll('.page-content').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    const titles = { 'dashboard': '数据概览', 'students': '学生管理', 'import': '批量导入', 'class-stats': '班级统计', 'notices': '公告管理', 'settings': '系统设置' };
    document.getElementById('pageTitle').textContent = titles[name] || name;
    if (name === 'dashboard') loadDashboard();
    if (name === 'students') loadStudents();
    if (name === 'class-stats') loadClassStats();
    if (name === 'notices') loadNotices();
    if (name === 'settings') loadSettings();
    // 隐藏转班弹窗
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
            <td>${s.completed_modules}/10</td>
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
            const pct = Math.min((avgVal / 10 * 100), 100);
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
        document.getElementById('detailTitle').textContent = s.display_name + ' 的详情';
        document.getElementById('detailBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>用户名</label><span>${esc(s.username)}</span></div>
                <div class="detail-item"><label>年级</label><span>${esc(s.grade || '-')}</span></div>
                <div class="detail-item"><label>班级</label><span>${s.class_num ? s.class_num + '班' : '-'}</span></div>
                <div class="detail-item"><label>状态</label><span class="status-tag ${s.status}">${s.status === 'graduated' ? '已毕业' : '在读'}</span></div>
                <div class="detail-item"><label>注册时间</label><span>${fmt(s.created_at)}</span></div>
            </div>
            <h4 style="margin-top:20px;">模块进度</h4>
            <div class="detail-modules">${data.modules.length > 0 ? data.modules.map(m => `<span class="module-chip">${MODULE_NAMES[m.module_id] || m.module_id} (${m.score}分)</span>`).join('') : '<span class="empty-state">暂无</span>'}</div>
            <h4 style="margin-top:20px;">成就</h4>
            <div class="detail-modules">${data.achievements.length > 0 ? data.achievements.map(a => `<span class="module-chip achievement">${ACHIEVEMENT_NAMES[a.achievement_id] || a.achievement_id}</span>`).join('') : '<span class="empty-state">暂无</span>'}</div>
            <h4 style="margin-top:20px;">最近登录</h4>
            <div class="detail-logins">${data.loginLogs.length > 0 ? data.loginLogs.slice(0, 10).map(l => `<div class="login-item"><span>${fmt(l.login_time)}</span><span class="login-ip">${esc(l.ip_address || '')}</span></div>`).join('') : '<span class="empty-state">暂无</span>'}</div>
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
        const data = await apiFetch(API_BASE + '/notices/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content })
        });
        if (data.success) {
            closeNoticeEdit();
            loadNotices();
        } else alert('保存失败: ' + data.error);
    } catch (e) { alert('保存失败: ' + e.message); }
}

// ===== CSV 导出 =====
function exportCSV() {
    window.open(API_BASE + '/export', '_blank');
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