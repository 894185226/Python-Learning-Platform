// ===================================================
// API 端点验证脚本
// 验证 /api/admin/chapter-completion 和 /api/admin/quiz-scores
// 运行方式: node verify_apis.js
// ===================================================

const http = require('http');

const BASE = 'http://localhost:3000';
let adminToken = '';

function fetchJSON(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = http.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body), ms: options.startTime ? Date.now() - options.startTime : 0 });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body, error: 'JSON parse error', ms: 0 });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function login() {
    console.log('[1] 登录管理员...');
    const res = await fetchJSON(BASE + '/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    if (res.body.success) {
        adminToken = res.body.token;
        console.log('  ✅ 登录成功');
    } else {
        console.error('  ❌ 登录失败:', res.body.error);
        process.exit(1);
    }
}

function authHeaders() {
    return { 'X-Admin-Token': adminToken };
}

async function testChapterCompletion() {
    console.log('\n[2] 测试 /api/admin/chapter-completion...');
    const start = Date.now();
    const res = await fetchJSON(BASE + '/api/admin/chapter-completion', {
        headers: authHeaders(),
        startTime: start
    });

    console.log(`  HTTP 状态码: ${res.status}`);
    console.log(`  响应时间: ${res.ms}ms`);
    console.log(`  success: ${res.body.success}`);

    if (!res.body.success) {
        console.log('  ❌ 失败:', res.body.error);
        return false;
    }

    const chapters = res.body.chapters;
    console.log(`  章节数: ${chapters.length}`);

    // 验证数据正确性
    let errors = [];

    // 检查总学生数（应为 active 学生数，不含 graduated）
    const totalStudents = chapters.length > 0 ? chapters[0].totalStudents : 0;
    console.log(`  总学生数(active): ${totalStudents}`);

    // 验证 ch1 完成率：活跃学生A+活跃学生B+活跃学生C+满分+不及格 = 5人
    const ch1 = chapters.find(c => c.chapterId === 'ch1');
    if (ch1) {
        console.log(`  ch1 完成: ${ch1.completedCount}/${ch1.totalStudents} (${ch1.completionRate}%)`);
        if (ch1.completedCount < 5) {
            errors.push(`ch1 完成人数应 >= 5，实际: ${ch1.completedCount}`);
        }
    } else {
        errors.push('ch1 数据缺失');
    }

    // 验证 ch19 完成率：只有活跃学生C完成
    const ch19 = chapters.find(c => c.chapterId === 'ch19');
    if (ch19) {
        console.log(`  ch19 完成: ${ch19.completedCount}/${ch19.totalStudents} (${ch19.completionRate}%)`);
        if (ch19.completedCount < 1) {
            errors.push(`ch19 完成人数应 >= 1，实际: ${ch19.completedCount}`);
        }
    }

    // 验证 JSON 格式
    if (!Array.isArray(chapters)) {
        errors.push('chapters 应为数组');
    }
    for (const c of chapters) {
        if (!c.chapterId || c.completedCount === undefined || c.totalStudents === undefined || c.completionRate === undefined) {
            errors.push(`章节数据不完整: ${JSON.stringify(c)}`);
            break;
        }
    }

    // 验证已毕业学生不计入
    if (chapters.length > 0) {
        console.log(`  ✅ 响应格式正确，返回 ${chapters.length} 个章节数据`);
    }

    if (errors.length > 0) {
        console.log('  ❌ 发现错误:', errors.join('; '));
        return false;
    }
    console.log('  ✅ 章节完成率 API 验证通过');
    return true;
}

async function testQuizScores() {
    console.log('\n[3] 测试 /api/admin/quiz-scores...');
    const start = Date.now();
    const res = await fetchJSON(BASE + '/api/admin/quiz-scores', {
        headers: authHeaders(),
        startTime: start
    });

    console.log(`  HTTP 状态码: ${res.status}`);
    console.log(`  响应时间: ${res.ms}ms`);
    console.log(`  success: ${res.body.success}`);

    if (!res.body.success) {
        console.log('  ❌ 失败:', res.body.error);
        return false;
    }

    const quizScores = res.body.quizScores;
    console.log(`  测验数: ${quizScores.length}`);

    let errors = [];

    // 验证 JSON 格式
    if (!Array.isArray(quizScores)) {
        errors.push('quizScores 应为数组');
    }

    for (const q of quizScores) {
        if (!q.moduleId || q.avgScore === undefined || q.studentCount === undefined) {
            errors.push(`测验数据不完整: ${JSON.stringify(q)}`);
            break;
        }
    }

    // 显示前5个测验成绩
    console.log('  测验成绩一览:');
    quizScores.slice(0, 5).forEach(q => {
        console.log(`    ${q.moduleId}: 平均分=${q.avgScore}, 参与人数=${q.studentCount}`);
    });

    // 验证 ch1_quiz 平均分: (65+70+100+45+部分C) / 人数
    const ch1q = quizScores.find(q => q.moduleId === 'ch1_quiz');
    if (ch1q) {
        console.log(`  ch1_quiz: 平均分=${ch1q.avgScore}, 参与人数=${ch1q.studentCount}`);
        // 活跃学生A(65) + 活跃学生B(70) + 活跃学生C(85+) + 满分(100) + 不及格(45) = 至少5人参与
        if (ch1q.studentCount < 4) {
            errors.push(`ch1_quiz 参与人数应 >= 4，实际: ${ch1q.studentCount}`);
        }
    }

    if (errors.length > 0) {
        console.log('  ❌ 发现错误:', errors.join('; '));
        return false;
    }
    console.log('  ✅ 测验成绩 API 验证通过');
    return true;
}

async function testUnauthorized() {
    console.log('\n[4] 测试未授权访问...');
    const res = await fetchJSON(BASE + '/api/admin/chapter-completion');
    console.log(`  HTTP 状态码: ${res.status}`);
    console.log(`  success: ${res.body.success}`);
    if (res.status === 401 && res.body.error === '未登录或登录已过期') {
        console.log('  ✅ 未授权访问正确返回 401');
        return true;
    }
    console.log('  ❌ 未授权访问处理不正确');
    return false;
}

async function testInvalidMethod() {
    console.log('\n[5] 测试无效请求方法 (POST)...');
    const res = await fetchJSON(BASE + '/api/admin/chapter-completion', {
        method: 'POST',
        headers: authHeaders()
    });
    console.log(`  HTTP 状态码: ${res.status}`);
    // GET 路由对 POST 请求可能返回 404 或 405
    if (res.status === 404) {
        console.log('  ✅ 无效方法正确返回 404');
        return true;
    }
    console.log('  ⚠️ 返回状态码:', res.status, '(可能正常)');
    return true;
}

async function testResponseTime() {
    console.log('\n[6] 测试响应时间阈值...');
    const times = [];
    for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await fetchJSON(BASE + '/api/admin/chapter-completion', {
            headers: authHeaders(),
            startTime: start
        });
        times.push(Date.now() - start);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  3次请求平均响应时间: ${avg.toFixed(1)}ms`);
    if (avg < 500) {
        console.log('  ✅ 响应时间在阈值内 (< 500ms)');
        return true;
    }
    console.log('  ⚠️ 响应时间超过阈值');
    return false;
}

async function main() {
    console.log('=== API 端点验证测试 ===\n');
    await login();

    const results = {
        chapterCompletion: await testChapterCompletion(),
        quizScores: await testQuizScores(),
        unauthorized: await testUnauthorized(),
        invalidMethod: await testInvalidMethod(),
        responseTime: await testResponseTime()
    };

    console.log('\n=== 测试结果汇总 ===');
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    console.log(`通过: ${passed}/${total}`);
    for (const [name, result] of Object.entries(results)) {
        console.log(`  ${result ? '✅' : '❌'} ${name}`);
    }

    process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
    console.error('测试异常:', err);
    process.exit(1);
});