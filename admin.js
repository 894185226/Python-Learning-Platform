/* ===================================================
   管理后台 JS - 完整版
   
   注意：由于 admin.html 使用大量 onclick 内联事件处理器，
   所有函数必须在全局作用域中声明。后续重构时建议：
   1. 将 onclick 改为 addEventListener 事件委托
   2. 使用 AdminApp 命名空间封装所有函数
   3. 拆分为多个模块文件（dashboard.js, students.js 等）
   =================================================== */

// ===== 全局配置 =====
const API_BASE = '/api/admin';

// ===== 通用确认弹窗（替代原生 confirm） =====
let confirmCallback = null;

function showConfirm(title, message, icon, btnText, callback) {
    document.getElementById('confirmTitle').textContent = title || '确认操作';
    document.getElementById('confirmMessage').textContent = message || '确定要执行此操作吗？';
    document.getElementById('confirmIcon').textContent = icon || '⚠️';
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.textContent = btnText || '确定';
    confirmCallback = callback;
    document.getElementById('confirmModal').style.display = 'block';
    setTimeout(() => okBtn.focus(), 100);
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    confirmCallback = null;
}

// 确定按钮点击事件
document.addEventListener('DOMContentLoaded', () => {
    const okBtn = document.getElementById('confirmOkBtn');
    if (okBtn) {
        okBtn.addEventListener('click', () => {
            const cb = confirmCallback;
            closeConfirmModal();
            if (typeof cb === 'function') cb();
        });
    }
});

// ===== 模块/成就名称映射（从 constants.js 加载，统一维护） =====
// 确保 constants.js 已加载（admin.html 在 admin.js 之前加载了 constants.js）
if (typeof TOTAL_MODULES === 'undefined' || typeof MODULE_NAMES === 'undefined' || typeof CHAPTER_NAMES === 'undefined') {
    console.error('[admin.js] 错误：constants.js 未正确加载，请检查页面。缺少:', 
        typeof TOTAL_MODULES === 'undefined' ? 'TOTAL_MODULES' : '',
        typeof MODULE_NAMES === 'undefined' ? 'MODULE_NAMES' : '',
        typeof CHAPTER_NAMES === 'undefined' ? 'CHAPTER_NAMES' : '');
}

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
    if (!admin) {
        // 显示登录表单，不跳转
        document.getElementById('adminLoginOverlay').style.display = 'flex';
        return null;
    }
    // 隐藏登录表单
    document.getElementById('adminLoginOverlay').style.display = 'none';
    document.getElementById('adminInfo').querySelector('span').textContent = admin.displayName;
    return admin;
}
async function handleLogout() {
    try {
        await apiFetch(API_BASE + '/logout', { method: 'POST' });
    } catch (e) { console.warn('[admin] 清除会话存储失败:', e.message); }
    sessionStorage.removeItem('pv_admin_user');
    sessionStorage.removeItem('pv_admin_token');
    window.location.href = 'index.html';
}

// ===== 管理员登录（从登录表单） =====
async function handleAdminLogin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('adminLoginError');
    const btn = document.getElementById('adminLoginBtn');

    if (!username || !password) {
        errorEl.textContent = '请输入用户名和密码';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
    errorEl.style.display = 'none';

    try {
        const data = await apiFetch(API_BASE + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (data.success) {
            sessionStorage.setItem('pv_admin_user', JSON.stringify(data.user));
            sessionStorage.setItem('pv_admin_token', data.token);
            document.getElementById('adminLoginOverlay').style.display = 'none';
            document.getElementById('adminInfo').querySelector('span').textContent = data.user.displayName;
            switchPage('dashboard');
        } else {
            errorEl.textContent = data.error || '登录失败';
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = '登录失败: ' + e.message;
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
    }
}

// 回车键登录
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('adminLoginOverlay');
    if (overlay) {
        const pwdInput = document.getElementById('adminPassword');
        if (pwdInput) {
            pwdInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleAdminLogin();
            });
        }
    }
});

// ===== API 封装 =====
async function apiFetch(url, options = {}) {
    const token = getAdminToken();
    if (!options.headers) options.headers = {};
    options.headers['X-Admin-Token'] = token;
    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            sessionStorage.removeItem('pv_admin_user');
            sessionStorage.removeItem('pv_admin_token');
            window.location.href = 'index.html';
            throw new Error('登录已过期');
        }
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `服务器错误 (${res.status})`);
        }
        return await res.json();
    } catch (err) {
        if (err.message === '登录已过期') throw err;
        console.error(`[API] ${url} 请求失败:`, err.message);
        throw err;
    }
}

// ===== 章节名称映射 =====
// 注：CHAPTER_NAMES 已从 constants.js 加载，此处不再重复声明
// 如需修改章节名称，请更新 constants.js 中的 CHAPTER_NAMES

// ===== 管理后台 Hash 路由映射 =====
// URL-friendly 名称 → 内部页面 ID（与主站 SPECIAL_HASH_MAP 逻辑一致）
const ADMIN_HASH_MAP = {
    'data-overview': 'dashboard',
    'student-management': 'students',
    'batch-import': 'import',
    'class-statistics': 'class-stats',
    'announcements': 'notices',
    'homework': 'assignments',
    'screenshot-submissions': 'screenshots',
    'activity-monitor': 'activity',
    'daily-question': 'daily-questions',
    'discussion-management': 'discussions',
    'chapter-locks': 'chapter-locks',
    'registration': 'registration',
    'system-settings': 'settings'
};

// 当前页面追踪（防止重复导航）
// 初始值必须为空，否则登录/刷新后 switchPage('dashboard') 会因守卫提前 return，导致数据不加载
let currentAdminPage = '';

// 有效的管理后台页面列表
const VALID_ADMIN_PAGES = ['dashboard', 'students', 'import', 'class-stats',
    'notices', 'assignments', 'screenshots', 'activity', 'daily-questions',
    'discussions', 'chapter-locks', 'registration', 'settings'];

// ===== 页面导航 =====
function switchPage(name) {
    // 验证页面名称
    if (!VALID_ADMIN_PAGES.includes(name)) return;
    // 防止重复导航
    if (name === currentAdminPage) return;
    currentAdminPage = name;

    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === name));
    document.querySelectorAll('.page-content').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
    const titles = {
        'dashboard': '数据概览', 'students': '学生管理', 'import': '批量导入',
        'class-stats': '班级统计', 'notices': '公告管理', 'assignments': '作业管理',
        'screenshots': '作品截图', 'activity': '活跃度监控', 'daily-questions': '每日一题',
        'discussions': '讨论区管理', 'chapter-locks': '章节锁定', 'registration': '注册管理', 'settings': '系统设置'
    };
    document.getElementById('pageTitle').textContent = titles[name] || name;
    if (name === 'dashboard') loadDashboard();
    if (name === 'students') loadStudents();
    if (name === 'class-stats') loadClassStats();
    if (name === 'notices') loadNotices();
    if (name === 'assignments') loadAssignments();
    if (name === 'screenshots') loadScreenshots();
    if (name === 'activity') loadInactiveStudents();
    if (name === 'daily-questions') loadDailyQuestions();
    if (name === 'discussions') loadDiscussions();
    if (name === 'chapter-locks') loadChapterLocks();
    if (name === 'registration') loadRegistrationSettings();
    if (name === 'settings') loadSettings();
    // 隐藏弹窗
    document.getElementById('transferModal').style.display = 'none';

    // 同步更新 URL hash（与主站 switchModule 逻辑一致）
    const targetHash = '#' + name;
    if (window.location.hash === targetHash) {
        history.replaceState(null, '', targetHash);
    } else {
        window.location.hash = targetHash;
    }
}
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => switchPage(item.dataset.page)));

function refreshCurrentPage() {
    const active = document.querySelector('.page-content.active');
    if (!active) return;
    switchPage(active.id.replace('page-', ''));
}

// ===== Hash 路由处理（与主站 script.js 逻辑一致） =====
// 浏览器前进/后退 + 直接 URL 访问支持
function handleAdminHash() {
    let hash = window.location.hash.replace('#', '');
    if (!hash) hash = 'dashboard';
    // 特殊映射（URL-friendly 名称 → 内部页面 ID）
    hash = ADMIN_HASH_MAP[hash] || hash;
    // 验证页面有效性（switchPage 内部会设置 currentAdminPage 并更新 hash）
    if (VALID_ADMIN_PAGES.includes(hash) && hash !== currentAdminPage) {
        switchPage(hash);
    }
}

// hashchange 事件（用户手动修改 URL hash 或浏览器前进/后退）
window.addEventListener('hashchange', () => {
    // 未登录时不处理 hash 变化
    if (!getAdminUser()) return;
    let hash = window.location.hash.replace('#', '');
    if (!hash) hash = 'dashboard';
    hash = ADMIN_HASH_MAP[hash] || hash;
    if (VALID_ADMIN_PAGES.includes(hash) && hash !== currentAdminPage) {
        switchPage(hash);
    }
});

// 初始加载：从 URL hash 恢复页面状态（支持书签 / 直接链接）
(function initAdminHashRoute() {
    // 先检查认证状态，未登录则显示登录表单，不触发任何 API 请求
    const admin = getAdminUser();
    if (!admin) {
        // 未登录，等待 DOM 就绪后显示登录表单
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.getElementById('adminLoginOverlay').style.display = 'flex';
            });
        } else {
            document.getElementById('adminLoginOverlay').style.display = 'flex';
        }
        return;
    }
    // 已登录，隐藏登录表单并加载页面
    document.getElementById('adminLoginOverlay').style.display = 'none';
    document.getElementById('adminInfo').querySelector('span').textContent = admin.displayName;

    let initHash = window.location.hash.replace('#', '');
    if (!initHash) initHash = 'dashboard';
    initHash = ADMIN_HASH_MAP[initHash] || initHash;
    if (VALID_ADMIN_PAGES.includes(initHash)) {
        // 延迟执行，等待 DOM 就绪
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => switchPage(initHash));
        } else {
            switchPage(initHash);
        }
    }
})();

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
    showConfirm('删除学生', `确定要删除学生「${name}」吗？`, '🗑️', '删除', async function() {
        try {
            const data = await apiFetch(API_BASE + '/student/' + id, { method: 'DELETE' });
            if (data.success) { loadStudents(); loadDashboard(); }
            else alert('删除失败：' + data.error);
        } catch (e) { alert('删除失败：' + e.message); }
    });
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
    showConfirm('批量操作', confirmMsg.replace('{n}', ids.length), '⚠️', '确定', async () => {
    try {
        const data = await apiFetch(API_BASE + '/students/batch', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, action, value })
        });
        if (data.success) { alert(`操作成功，已影响 ${data.affected} 名学生`); loadStudents(); loadDashboard(); }
        else alert('操作失败：' + data.error);
    } catch (e) { alert('操作失败：' + e.message); }
    });
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
    showConfirm('批量删除', `确定删除 ${ids.length} 名学生吗？此操作不可恢复！`, '🗑️', '删除', async () => {
    try {
        const data = await apiFetch(API_BASE + '/students/batch', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, action: 'delete' })
        });
        if (data.success) { alert(`已删除 ${data.affected} 名学生`); loadStudents(); loadDashboard(); }
        else alert('删除失败: ' + data.error);
    } catch (e) { alert('删除失败: ' + e.message); }
    });
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
    showConfirm('删除公告', '确定删除此公告？', '🗑️', '删除', async () => {
        try {
            const data = await apiFetch(API_BASE + '/notices/' + id, { method: 'DELETE' });
            if (data.success) loadNotices();
            else alert('删除失败: ' + data.error);
        } catch (e) { alert('删除失败: ' + e.message); }
    });
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

// 将测验模块ID（如 ch1_quiz / ch2_test）映射为「第X章 章名 · 综合测试」
function formatQuizChapterName(moduleId) {
    const m = /^(ch\d+)_/.exec(moduleId || '');
    if (m && CHAPTER_NAMES[m[1]]) {
        return CHAPTER_NAMES[m[1]] + ' · 综合测试';
    }
    return MODULE_NAMES[moduleId] || moduleId;
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
            const name = formatQuizChapterName(s.moduleId);
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

// ===== 作品截图查看 =====
async function loadScreenshots() {
    const el = document.getElementById('screenshotList');
    el.innerHTML = '<div class="empty-notices"><i class="fas fa-image"></i><p>加载中...</p></div>';
    try {
        const data = await apiFetch(API_BASE + '/screenshots');
        if (!data.success || !data.screenshots || data.screenshots.length === 0) {
            el.innerHTML = '<div class="empty-notices"><i class="fas fa-image"></i><p>暂无学生提交的截图</p></div>';
            return;
        }
        const fmtTime = function(t) {
            if (!t) return '';
            const d = new Date(t);
            if (isNaN(d.getTime())) return String(t);
            const p = n => String(n).padStart(2, '0');
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
        };
        el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">' +
            data.screenshots.map(function(s) {
                const imgUrl = '/uploads/' + encodeURIComponent(s.file_name);
                const chapterLabel = (s.chapter_id || '').toUpperCase();
                const stuName = s.display_name || s.username;
                const cls = (s.grade || '') + (s.class_num ? ' ' + s.class_num + '班' : '');
                return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">' +
                    '<a href="' + imgUrl + '" target="_blank"><img src="' + imgUrl + '" alt="截图" loading="lazy" style="width:100%;display:block;min-height:120px;background:#f5f5f5;"></a>' +
                    '<div style="padding:10px 12px;">' +
                    '<div style="font-weight:600;font-size:14px;">' + esc(stuName) + '</div>' +
                    '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">' + esc(cls) + ' · ' + esc(chapterLabel) + '</div>' +
                    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + esc(fmtTime(s.created_at)) + '</div>' +
                    '</div></div>';
            }).join('') + '</div>';
    } catch (e) {
        console.error('加载截图失败:', e);
        el.innerHTML = '<div class="empty-notices"><i class="fas fa-exclamation-circle"></i><p>加载截图失败</p></div>';
    }
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
    showConfirm('删除作业', '确定删除此作业？', '🗑️', '删除', async () => {
        try {
            const data = await apiFetch(API_BASE + '/assignments/' + id, { method: 'DELETE' });
            if (data.success) loadAssignments();
            else alert('删除失败: ' + data.error);
        } catch (e) { alert('删除失败: ' + e.message); }
    });
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
                <thead><tr><th>学生</th><th>提交状态</th><th>内容</th><th>评分</th><th>提交时间</th></tr></thead>
                <tbody>${data.submissions.map(s => `<tr>
                    <td>${esc(s.display_name || s.student_name || '')}</td>
                    <td><span class="status-tag ${s.status === 'submitted' ? 'active' : 'graduated'}">${s.status === 'submitted' ? '已提交' : '未提交'}</span></td>
                    <td style="max-width:200px;white-space:normal;">${esc(s.content || '-')}</td>
                    <td>${s.status === 'submitted' ? `<input type="number" id="score_${s.id}" value="${s.score !== null && s.score !== undefined ? s.score : ''}" min="0" max="100" step="0.5" style="width:70px;padding:4px;border:1px solid #ddd;border-radius:4px;" placeholder="0-100"><button onclick="saveScore(${id},${s.id})" style="margin-left:4px;background:#04AA6D;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;">保存</button>` : '-'}</td>
                    <td>${fmt(s.submitted_at)}</td>
                </tr>`).join('')}</tbody>
            </table>`;
        }
        document.getElementById('submissionsModal').style.display = 'flex';
    } catch (e) { alert('获取提交详情失败: ' + e.message); }
}

function closeSubmissions() { document.getElementById('submissionsModal').style.display = 'none'; }

async function saveScore(assignmentId, submissionId) {
    const input = document.getElementById('score_' + submissionId);
    const score = parseFloat(input.value);
    if (isNaN(score) || score < 0 || score > 100) {
        alert('请输入0-100之间的分数');
        return;
    }
    try {
        const resp = await apiFetch(API_BASE + '/assignments/' + assignmentId + '/submissions/' + submissionId + '/score', {
            method: 'PUT',
            body: JSON.stringify({ score: Math.round(score * 10) / 10 })
        });
        const data = await resp.json();
        if (data.success) {
            input.style.borderColor = '#04AA6D';
            setTimeout(() => { input.style.borderColor = '#ddd'; }, 2000);
        } else {
            alert('评分失败: ' + (data.error || '未知错误'));
        }
    } catch (e) { alert('评分失败: ' + e.message); }
}

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
    showConfirm('删除题目', '确定删除此题目？', '🗑️', '删除', async () => {
        try {
            const data = await apiFetch(API_BASE + '/daily-questions/' + id, { method: 'DELETE' });
            if (data.success) loadDailyQuestions();
            else alert('删除失败: ' + data.error);
        } catch (e) { alert('删除失败: ' + e.message); }
    });
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
    return div.innerHTML.replace(/'/g, '&#39;');
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
    loadBackupList();
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

async function triggerBackup() {
    const btn = document.getElementById('btnTriggerBackup');
    const statusEl = document.getElementById('backupStatus');
    
    // 显示进行中状态
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在备份...';
    statusEl.style.display = 'block';
    statusEl.className = 'backup-status backup-progress';
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在备份数据库，请稍候...';
    
    try {
        const data = await apiFetch(API_BASE + '/backup/trigger', { method: 'POST' });
        if (data.success) {
            // 成功
            statusEl.className = 'backup-status backup-success';
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> 备份成功！文件：' + esc(data.backup.filename) + '（' + esc(data.backup.size) + '）';
            btn.innerHTML = '<i class="fas fa-check"></i> 备份完成';
            // 刷新备份列表
            loadBackupList();
            // 3秒后恢复按钮状态
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> 一键备份数据';
                statusEl.style.display = 'none';
            }, 5000);
        } else {
            throw new Error(data.error || '未知错误');
        }
    } catch (e) {
        // 失败
        statusEl.className = 'backup-status backup-error';
        statusEl.innerHTML = '<i class="fas fa-times-circle"></i> 备份失败：' + esc(e.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> 一键备份数据';
        setTimeout(() => { statusEl.style.display = 'none'; }, 8000);
    }
}

async function loadBackupList() {
    const tbody = document.getElementById('backupListBody');
    try {
        const data = await apiFetch(API_BASE + '/backup/list');
        if (!data.success || !data.backups || data.backups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无备份记录</td></tr>';
            return;
        }
        tbody.innerHTML = data.backups.map(b => {
            const date = new Date(b.createdAt);
            const dateStr = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0') + ' ' +
                String(date.getHours()).padStart(2, '0') + ':' +
                String(date.getMinutes()).padStart(2, '0');
            return `<tr>
                <td><code style="font-size:12px;">${esc(b.filename)}</code></td>
                <td>${esc(b.size)}</td>
                <td>${dateStr}</td>
                <td>
                    <a href="${API_BASE}/backup/download/${encodeURIComponent(b.filename)}" class="btn btn-sm btn-outline" download>
                        <i class="fas fa-download"></i> 下载
                    </a>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">加载失败：' + esc(e.message) + '</td></tr>';
    }
}

function backupDatabase() {
    // 保留旧函数兼容性，改为触发服务器端备份
    triggerBackup();
}

async function restoreDatabase() {
    const file = document.getElementById('restoreFile').files[0];
    if (!file) return;
    showConfirm('恢复数据', '恢复数据将覆盖所有现有数据，确定继续？', '⚠️', '恢复', async () => {
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
    });
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
    fillSelect(document.getElementById('lockFilterClass'));
})();

// ===== 讨论区管理 =====
let discPage = 1, discTotal = 0;
async function loadDiscussions(page = 1) {
    discPage = page;
    try {
        const data = await apiFetch(API_BASE + '/discussions?page=' + page + '&pageSize=20');
        if (!data.success) return;
        discTotal = data.total;
        const tbody = document.getElementById('discussionsBody');
        // 每次加载后重置全选框，避免切页后残留勾选状态
        const selectAll = document.getElementById('discSelectAll');
        if (selectAll) selectAll.checked = false;
        if (data.discussions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">暂无讨论帖</td></tr>';
        } else {
            tbody.innerHTML = data.discussions.map(d => `
                <tr>
                    <td><input type="checkbox" class="disc-checkbox" value="${d.id}"></td>
                    <td>${d.id}</td>
                    <td><strong>${esc(d.title)}</strong></td>
                    <td>${esc(d.display_name)} (${esc(d.username)})</td>
                    <td>${esc(d.grade || '')} ${d.class_num ? d.class_num + '班' : ''}</td>
                    <td>${d.reply_count}</td>
                    <td>${fmt(d.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="viewReplies(${d.id})">查看回复</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDiscussion(${d.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
        // 分页
        const totalPages = Math.ceil(discTotal / 20);
        let html = `<span style="color:#666;font-size:13px;">共 ${discTotal} 条</span>`;
        html += `<button class="btn-sm btn-outline" onclick="loadDiscussions(${discPage-1})" ${discPage<=1?'disabled':''}>上一页</button>`;
        html += `<span style="font-size:13px;">${discPage}/${totalPages}</span>`;
        html += `<button class="btn-sm btn-outline" onclick="loadDiscussions(${discPage+1})" ${discPage>=totalPages?'disabled':''}>下一页</button>`;
        document.getElementById('discPaginationBar').innerHTML = html;
    } catch (e) {
        document.getElementById('discussionsBody').innerHTML = `<tr><td colspan="8" class="empty-state">加载失败：${e.message}</td></tr>`;
    }
}

async function viewReplies(postId) {
    try {
        const data = await apiFetch(API_BASE + '/discussions/' + postId + '/replies');
        if (!data.success) return;
        const body = document.getElementById('repliesModalBody');
        if (data.replies.length === 0) {
            body.innerHTML = '<div class="empty-state">暂无回复</div>';
        } else {
            body.innerHTML = data.replies.map(r => `
                <div style="padding:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong>${esc(r.display_name)}</strong>
                        <span style="color:#888;font-size:12px;">${fmt(r.created_at)}</span>
                        <p style="margin:4px 0 0;">${esc(r.content)}</p>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteReply(${r.id}, ${postId})">删除</button>
                </div>
            `).join('');
        }
        document.getElementById('repliesModal').style.display = 'flex';
    } catch (e) { alert('获取回复失败: ' + e.message); }
}

function closeRepliesModal() { document.getElementById('repliesModal').style.display = 'none'; }

async function deleteDiscussion(id) {
    showConfirm('删除讨论', '确定删除此讨论帖及其所有回复？此操作不可恢复！', '🗑️', '删除', async () => {
        try {
            const data = await apiFetch(API_BASE + '/discussions/' + id, { method: 'DELETE' });
            if (data.success) loadDiscussions(discPage);
        } catch (e) { alert('删除失败: ' + e.message); }
    });
}

async function deleteReply(id, postId) {
    showConfirm('删除回复', '确定删除此回复？', '🗑️', '删除', async () => {
        try {
            const data = await apiFetch(API_BASE + '/discussions/replies/' + id, { method: 'DELETE' });
            if (data.success) viewReplies(postId);
        } catch (e) { alert('删除失败: ' + e.message); }
    });
}

// 全选/取消全选本页讨论帖
function toggleAllDiscussions(cb) {
    document.querySelectorAll('.disc-checkbox').forEach(c => { c.checked = cb.checked; });
}

// 批量删除选中的讨论帖
async function batchDeleteDiscussions() {
    const checked = [...document.querySelectorAll('.disc-checkbox:checked')].map(c => parseInt(c.value));
    if (checked.length === 0) {
        alert('请先勾选要删除的讨论帖');
        return;
    }
    showConfirm('批量删除', `确定删除选中的 ${checked.length} 个讨论帖及其所有回复？此操作不可恢复！`, '🗑️', '删除', async () => {
        try {
            const data = await apiFetch(API_BASE + '/discussions/batch-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: checked })
            });
            if (data.success) {
                const all = document.getElementById('discSelectAll');
                if (all) all.checked = false;
                loadDiscussions(discPage);
            } else {
                alert(data.error || '删除失败');
            }
        } catch (e) { alert('删除失败: ' + e.message); }
    });
}

// ===== 章节锁定管理 =====
let chapterLockStates = {};
async function loadChapterLocks() {
    try {
        const data = await apiFetch(API_BASE + '/chapter-locks');
        if (!data.success) return;
        // 初始化所有章节为解锁
        for (const ch in CHAPTER_NAMES) {
            chapterLockStates[ch] = false;
        }
        // 应用已保存的锁定
        const grade = document.getElementById('lockFilterGrade').value;
        const cls = parseInt(document.getElementById('lockFilterClass').value) || 0;
        data.locks.forEach(l => {
            if ((!grade || l.grade === grade) && (!cls || l.class_num === cls)) {
                chapterLockStates[l.chapter_id] = !!l.locked;
            }
        });
        renderChapterLocks();
    } catch (e) { console.error(e); }
}

function renderChapterLocks() {
    const grid = document.getElementById('chapterLocksGrid');
    grid.innerHTML = Object.entries(CHAPTER_NAMES).map(([id, name]) => `
        <div style="padding:10px;border:1px solid #ddd;border-radius:6px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;${chapterLockStates[id]?'background:#fff3f3;border-color:#ff4444;':''}"
             onclick="chapterLockStates['${id}'] = !chapterLockStates['${id}']; renderChapterLocks();">
            <span style="font-size:13px;">${name}</span>
            <i class="fas ${chapterLockStates[id] ? 'fa-lock' : 'fa-unlock'}" 
               style="color:${chapterLockStates[id] ? '#ff4444' : '#04AA6D'};"></i>
        </div>
    `).join('');
}

function toggleAllChapters(lock = false) {
    for (const ch in chapterLockStates) {
        chapterLockStates[ch] = lock;
    }
    renderChapterLocks();
}

async function saveChapterLocks() {
    const grade = document.getElementById('lockFilterGrade').value;
    const cls = parseInt(document.getElementById('lockFilterClass').value) || 0;
    const locks = Object.entries(chapterLockStates).map(([chapter_id, locked]) => ({
        chapter_id, locked, grade, class_num: cls
    }));
    try {
        const data = await apiFetch(API_BASE + '/chapter-locks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locks })
        });
        if (data.success) {
            alert('章节锁定设置已保存！');
        } else {
            alert('保存失败: ' + data.error);
        }
    } catch (e) { alert('保存失败: ' + e.message); }
}

// ===== 注册管理 =====
let regSettings = {};
let regSettingsChanged = false;

async function loadRegistrationSettings() {
    try {
        const data = await apiFetch(API_BASE + '/registration-settings');
        if (!data.success) return;
        regSettings = data.settings;

        // 注册开关
        const toggle = document.getElementById('regEnabledToggle');
        toggle.checked = regSettings.registration_enabled !== 'false';
        updateRegStatusBadge();

        // 配置项
        document.getElementById('requireStudentId').checked = regSettings.require_student_id === 'true';
        document.getElementById('maxAccountsPerIp').value = regSettings.max_accounts_per_ip || '3';
        document.getElementById('regCooldownMinutes').value = regSettings.registration_cooldown_minutes || '5';
        document.getElementById('maxAccountsPerStudentId').value = regSettings.max_accounts_per_student_id || '1';
        document.getElementById('profileEditToggle').checked = regSettings.profile_edit_enabled !== 'false';
        updateProfileEditStatusBadge();

        regSettingsChanged = false;
        updateSaveButton();
        loadRegistrationLogs(1);
    } catch (e) {
        console.error('加载注册配置失败:', e);
    }
}

function updateRegStatusBadge() {
    const badge = document.getElementById('regStatusBadge');
    const enabled = document.getElementById('regEnabledToggle').checked;
    badge.innerHTML = enabled
        ? '<span style="background:#d4edda;color:#155724;padding:4px 12px;border-radius:12px;font-size:13px;">' +
          '<i class="fas fa-check-circle"></i> 注册功能已开启 — 学生可以正常注册</span>'
        : '<span style="background:#f8d7da;color:#721c24;padding:4px 12px;border-radius:12px;font-size:13px;">' +
          '<i class="fas fa-ban"></i> 注册功能已关闭 — 学生无法注册新账号</span>';
}

function markSettingsChanged() {
    regSettingsChanged = true;
    updateSaveButton();
}

function updateSaveButton() {
    const btn = document.getElementById('saveRegSettingsBtn');
    btn.disabled = !regSettingsChanged;
    if (regSettingsChanged) {
        document.getElementById('settingsSavedHint').style.display = 'none';
    }
}

async function toggleRegistration() {
    const enabled = document.getElementById('regEnabledToggle').checked;
    updateRegStatusBadge();

    try {
        const data = await apiFetch(API_BASE + '/registration-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: { registration_enabled: enabled ? 'true' : 'false' } })
        });
        if (data.success) {
            regSettings.registration_enabled = enabled ? 'true' : 'false';
        }
    } catch (e) {
        console.error('切换注册状态失败:', e);
        // 恢复原状态
        document.getElementById('regEnabledToggle').checked = !enabled;
        updateRegStatusBadge();
    }
}

function updateProfileEditStatusBadge() {
    const badge = document.getElementById('profileEditStatusBadge');
    const enabled = document.getElementById('profileEditToggle').checked;
    badge.innerHTML = enabled
        ? '<span style="background:#d4edda;color:#155724;padding:4px 12px;border-radius:12px;font-size:13px;">' +
          '<i class="fas fa-check-circle"></i> 学生可以自行修改资料</span>'
        : '<span style="background:#f8d7da;color:#721c24;padding:4px 12px;border-radius:12px;font-size:13px;">' +
          '<i class="fas fa-ban"></i> 已禁止学生自行修改资料</span>';
}

async function toggleProfileEdit() {
    const enabled = document.getElementById('profileEditToggle').checked;
    updateProfileEditStatusBadge();

    try {
        const data = await apiFetch(API_BASE + '/registration-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: { profile_edit_enabled: enabled ? 'true' : 'false' } })
        });
        if (data.success) {
            regSettings.profile_edit_enabled = enabled ? 'true' : 'false';
        }
    } catch (e) {
        console.error('切换资料编辑开关失败:', e);
        document.getElementById('profileEditToggle').checked = !enabled;
        updateProfileEditStatusBadge();
    }
}

async function saveRegistrationSettings() {
    const settings = {
        require_student_id: document.getElementById('requireStudentId').checked ? 'true' : 'false',
        max_accounts_per_ip: document.getElementById('maxAccountsPerIp').value,
        registration_cooldown_minutes: document.getElementById('regCooldownMinutes').value,
        max_accounts_per_student_id: document.getElementById('maxAccountsPerStudentId').value
    };

    try {
        const data = await apiFetch(API_BASE + '/registration-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });
        if (data.success) {
            regSettings = { ...regSettings, ...settings };
            regSettingsChanged = false;
            updateSaveButton();
            document.getElementById('settingsSavedHint').style.display = 'inline';
            setTimeout(() => {
                document.getElementById('settingsSavedHint').style.display = 'none';
            }, 3000);
        } else {
            alert('保存失败: ' + data.error);
        }
    } catch (e) {
        alert('保存失败: ' + e.message);
    }
}

let regLogPage = 1, regLogTotal = 0;
async function loadRegistrationLogs(page = 1) {
    regLogPage = page;
    try {
        const filter = document.getElementById('regLogFilter').value;
        const data = await apiFetch(API_BASE + '/registration-logs?page=' + page + '&pageSize=50&result=' + filter);
        if (!data.success) return;
        regLogTotal = data.total;

        const tbody = document.getElementById('regLogsBody');
        if (data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">暂无注册记录</td></tr>';
        } else {
            tbody.innerHTML = data.logs.map(l => {
                let resultBadge = '';
                if (l.result === 'success') resultBadge = '<span style="color:#10b981;font-weight:600;">成功</span>';
                else if (l.result === 'blocked') resultBadge = '<span style="color:#f59e0b;font-weight:600;">被阻止</span>';
                else resultBadge = '<span style="color:#ef4444;font-weight:600;">失败</span>';
                return `<tr>
                    <td>${fmt(l.created_at)}</td>
                    <td>${esc(l.username)}</td>
                    <td>${esc(l.display_name)}</td>
                    <td>${esc(l.grade || '')} ${l.class_num ? l.class_num + '班' : ''}</td>
                    <td>${esc(l.student_id || '-')}</td>
                    <td style="font-size:12px;color:var(--text-secondary);">${esc(l.ip_address || '-')}</td>
                    <td>${resultBadge}</td>
                    <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                        title="${esc(l.reason || '')}">${esc(l.reason || '-')}</td>
                </tr>`;
            }).join('');
        }

        // 分页
        const totalPages = Math.ceil(regLogTotal / 50) || 1;
        let html = `<span style="color:#666;font-size:13px;">共 ${regLogTotal} 条</span>`;
        html += `<button class="btn-sm btn-outline" onclick="loadRegistrationLogs(${page-1})" ${page<=1?'disabled':''}>上一页</button>`;
        html += `<span style="font-size:13px;">第 ${page}/${totalPages} 页</span>`;
        html += `<button class="btn-sm btn-outline" onclick="loadRegistrationLogs(${page+1})" ${page>=totalPages?'disabled':''}>下一页</button>`;
        document.getElementById('regLogPagination').innerHTML = html;
    } catch (e) {
        document.getElementById('regLogsBody').innerHTML = `<tr><td colspan="8" class="empty-state">加载失败：${e.message}</td></tr>`;
    }
}

async function loadDuplicateStudents() {
    const el = document.getElementById('duplicateResults');
    el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> 检测中...</div>';
    try {
        const data = await apiFetch(API_BASE + '/duplicate-students');
        if (!data.success) {
            el.innerHTML = '<div class="empty-state">检测失败</div>';
            return;
        }

        let html = '';

        // 同名账号
        if (data.sameNameDuplicates && data.sameNameDuplicates.length > 0) {
            html += '<h4 style="margin-bottom:8px;color:var(--warning);">' +
                '<i class="fas fa-exclamation-triangle"></i> 同名账号（' + data.sameNameDuplicates.length + ' 组）</h4>';
            html += '<div style="max-height:300px;overflow-y:auto;margin-bottom:16px;">';
            data.sameNameDuplicates.forEach(d => {
                html += `<div style="padding:8px;border:1px solid #eee;border-radius:6px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <span style="font-weight:600;">${esc(d.display_name1)}</span>
                        <span style="color:var(--text-secondary);font-size:12px;">
                            账号1: ${esc(d.username1)} (${esc(d.grade1)} ${d.class1}班) |
                            账号2: ${esc(d.username2)} (${esc(d.grade2)} ${d.class2}班)
                        </span>
                    </div>
                    <button class="btn btn-sm btn-warning" onclick="quickMergeSetup(${d.id1},${d.id2},'${esc(d.username1)}','${esc(d.username2)}','${esc(d.display_name1)}')">
                        合并
                    </button>
                </div>`;
            });
            html += '</div>';
        } else {
            html += '<p style="color:var(--text-secondary);font-size:13px;">未发现同名账号</p>';
        }

        // 同IP多账号
        if (data.sameIpGroups && data.sameIpGroups.length > 0) {
            html += '<h4 style="margin-bottom:8px;color:var(--warning);">' +
                '<i class="fas fa-network-wired"></i> 同IP多账号（' + data.sameIpGroups.length + ' 组）</h4>';
            html += '<div style="max-height:300px;overflow-y:auto;">';
            data.sameIpGroups.forEach(g => {
                html += `<div style="padding:8px;border:1px solid #eee;border-radius:6px;margin-bottom:6px;">
                    <span style="font-size:12px;color:var(--text-secondary);">IP: ${esc(g.ip_address)} | ${g.account_count}个账号</span>
                    <div style="font-size:12px;color:var(--text);margin-top:2px;">${esc(g.usernames)}</div>
                    <div style="font-size:11px;color:var(--text-muted);">首次: ${fmt(g.first_reg)} | 最近: ${fmt(g.last_reg)}</div>
                </div>`;
            });
            html += '</div>';
        } else if (!data.sameNameDuplicates || data.sameNameDuplicates.length === 0) {
            html += '<p style="color:var(--text-secondary);font-size:13px;">未发现同IP多账号</p>';
        }

        if ((!data.sameNameDuplicates || data.sameNameDuplicates.length === 0) &&
            (!data.sameIpGroups || data.sameIpGroups.length === 0)) {
            html = '<div class="empty-state" style="color:var(--success);">' +
                '<i class="fas fa-check-circle"></i> 未发现疑似重复账号</div>';
        }

        el.innerHTML = html;
    } catch (e) {
        el.innerHTML = '<div class="empty-state">检测失败: ' + e.message + '</div>';
    }
}

// 快速填充合并表单
function quickMergeSetup(id1, id2, username1, username2, displayName) {
    // 滚动到合并区域
    document.querySelector('#page-registration .card:nth-child(4)').scrollIntoView({ behavior: 'smooth' });

    // 选择较早注册的作为目标账号，较晚的作为源账号
    document.getElementById('mergeSourceId').value = id2;
    document.getElementById('mergeSourceSelected').textContent = '已选择: ' + displayName + ' (' + username2 + ')';
    document.getElementById('mergeSourceSearch').value = '';
    document.getElementById('mergeSourceResults').innerHTML = '';

    document.getElementById('mergeTargetId').value = id1;
    document.getElementById('mergeTargetSelected').textContent = '已选择: ' + displayName + ' (' + username1 + ')';
    document.getElementById('mergeTargetSearch').value = '';
    document.getElementById('mergeTargetResults').innerHTML = '';

    updateMergeButton();
}

let mergeSearchTimer = null;
async function searchMergeStudent(type) {
    clearTimeout(mergeSearchTimer);
    const searchInput = document.getElementById('merge' + (type === 'source' ? 'Source' : 'Target') + 'Search');
    const resultsDiv = document.getElementById('merge' + (type === 'source' ? 'Source' : 'Target') + 'Results');
    const keyword = searchInput.value.trim();

    if (keyword.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }

    mergeSearchTimer = setTimeout(async () => {
        try {
            const data = await apiFetch(API_BASE + '/students?page=1&pageSize=10');
            if (!data.success) return;

            const filtered = data.students.filter(s =>
                s.display_name.toLowerCase().includes(keyword.toLowerCase()) ||
                s.username.toLowerCase().includes(keyword.toLowerCase())
            );

            if (filtered.length === 0) {
                resultsDiv.innerHTML = '<div style="padding:8px;color:var(--text-secondary);">未找到匹配的学生</div>';
            } else {
                resultsDiv.innerHTML = filtered.map(s => `
                    <div style="padding:8px;border-bottom:1px solid #eee;cursor:pointer;hover:bg:#f0f0f0;"
                         onclick="selectMergeStudent('${type}', ${s.id}, '${esc(s.display_name)}', '${esc(s.username)}')">
                        <strong>${esc(s.display_name)}</strong>
                        <span style="color:var(--text-secondary);font-size:12px;">${esc(s.username)} | ${esc(s.grade)} ${s.class_num}班</span>
                    </div>
                `).join('');
            }
        } catch (e) {
            resultsDiv.innerHTML = '<div style="padding:8px;color:var(--danger);">搜索失败</div>';
        }
    }, 300);
}

function selectMergeStudent(type, id, displayName, username) {
    document.getElementById('merge' + (type === 'source' ? 'Source' : 'Target') + 'Id').value = id;
    document.getElementById('merge' + (type === 'source' ? 'Source' : 'Target') + 'Selected').textContent =
        '已选择: ' + displayName + ' (' + username + ')';
    document.getElementById('merge' + (type === 'source' ? 'Source' : 'Target') + 'Search').value = '';
    document.getElementById('merge' + (type === 'source' ? 'Source' : 'Target') + 'Results').innerHTML = '';
    updateMergeButton();
}

function updateMergeButton() {
    const srcId = document.getElementById('mergeSourceId').value;
    const tgtId = document.getElementById('mergeTargetId').value;
    document.getElementById('mergeBtn').disabled = !srcId || !tgtId || srcId === tgtId;
}

async function mergeAccounts() {
    const sourceId = parseInt(document.getElementById('mergeSourceId').value);
    const targetId = parseInt(document.getElementById('mergeTargetId').value);

    if (!sourceId || !targetId) {
        alert('请先选择源账号和目标账号');
        return;
    }
    if (sourceId === targetId) {
        alert('源账号和目标账号不能相同');
        return;
    }

    const srcName = document.getElementById('mergeSourceSelected').textContent;
    const tgtName = document.getElementById('mergeTargetSelected').textContent;

    showConfirm('合并账号',
        `确定要将 ${srcName} 的所有数据合并到 ${tgtName} 吗？\n\n合并后源账号将被删除，此操作不可恢复！`,
        '⚠️', '确认合并', async () => {
            try {
                const data = await apiFetch(API_BASE + '/students/merge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sourceId, targetId })
                });
                const el = document.getElementById('mergeResult');
                if (data.success) {
                    el.innerHTML = '<div style="color:var(--success);padding:8px;background:#d4edda;border-radius:6px;">' +
                        '<i class="fas fa-check-circle"></i> ' + data.message +
                        ' (合并了 ' + data.mergedProgress + ' 条学习进度、' + data.mergedAchievements + ' 个成就)</div>';
                    // 清空表单
                    document.getElementById('mergeSourceId').value = '';
                    document.getElementById('mergeSourceSelected').textContent = '';
                    document.getElementById('mergeTargetId').value = '';
                    document.getElementById('mergeTargetSelected').textContent = '';
                    updateMergeButton();
                } else {
                    el.innerHTML = '<div style="color:var(--danger);padding:8px;background:#f8d7da;border-radius:6px;">' +
                        '<i class="fas fa-times-circle"></i> ' + data.error + '</div>';
                }
            } catch (e) {
                document.getElementById('mergeResult').innerHTML =
                    '<div style="color:var(--danger);">合并失败: ' + e.message + '</div>';
            }
        });
}

// 点击空白处关闭搜索结果
document.addEventListener('click', function(e) {
    if (!e.target.closest('#mergeSourceSearch')) {
        document.getElementById('mergeSourceResults').innerHTML = '';
    }
    if (!e.target.closest('#mergeTargetSearch')) {
        document.getElementById('mergeTargetResults').innerHTML = '';
    }
});

// ===== 启动 =====
(function init() {
    const admin = checkAuth();
    if (!admin) return;
    switchPage('dashboard');
})();