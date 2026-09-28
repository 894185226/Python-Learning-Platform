// ===================================================
// 测试数据插入脚本
// 用于验证 /api/admin/chapter-completion 和 /api/admin/quiz-scores 端点
// 运行方式: node insert_test_data.js
// ===================================================

const shared = require('./shared');
const bcrypt = require('bcryptjs');

async function insertTestData() {
    const pool = shared.pool;

    console.log('=== 开始插入测试数据 ===\n');

    // 1. 清理旧的测试数据（保留原有数据）
    console.log('[1/5] 清理旧的测试学生...');
    await pool.query("DELETE FROM learning_progress WHERE student_id IN (SELECT id FROM students WHERE username LIKE 'test_api_%')");
    await pool.query("DELETE FROM login_logs WHERE student_id IN (SELECT id FROM students WHERE username LIKE 'test_api_%')");
    await pool.query("DELETE FROM students WHERE username LIKE 'test_api_%'");
    console.log('  清理完成');

    // 2. 创建测试学生
    console.log('\n[2/5] 创建测试学生...');
    const students = [
        { username: 'test_api_active1', display_name: '测试活跃学生A', grade: '七年级', class_num: 1, status: 'active' },
        { username: 'test_api_active2', display_name: '测试活跃学生B', grade: '七年级', class_num: 2, status: 'active' },
        { username: 'test_api_active3', display_name: '测试活跃学生C', grade: '八年级', class_num: 1, status: 'active' },
        { username: 'test_api_inactive', display_name: '测试未活跃学生', grade: '七年级', class_num: 3, status: 'active' },
        { username: 'test_api_graduated', display_name: '测试已毕业学生', grade: '九年级', class_num: 1, status: 'graduated' },
        { username: 'test_api_perfect', display_name: '测试满分学生', grade: '八年级', class_num: 2, status: 'active' },
        { username: 'test_api_failing', display_name: '测试不及格学生', grade: '七年级', class_num: 1, status: 'active' },
    ];

    const testPassword = bcrypt.hashSync('test1234', 10);

    const studentIds = {};
    for (const s of students) {
        const [result] = await pool.query(
            'INSERT INTO students (username, password, display_name, grade, class_num, status) VALUES (?, ?, ?, ?, ?, ?)',
            [s.username, testPassword, s.display_name, s.grade, s.class_num, s.status]
        );
        studentIds[s.username] = result.insertId;
        console.log(`  创建学生: ${s.display_name} (${s.username}, ID=${result.insertId})`);
    }

    // 3. 插入章节完成记录 (module_id LIKE 'chapter_ch%')
    console.log('\n[3/5] 插入章节完成记录...');

    // 生成章节完成数据
    const chapterModules = [
        'chapter_ch1', 'chapter_ch2', 'chapter_ch3', 'chapter_ch4', 'chapter_ch5',
        'chapter_ch6', 'chapter_ch7', 'chapter_ch8', 'chapter_ch9', 'chapter_ch10',
        'chapter_ch11', 'chapter_ch12', 'chapter_ch13', 'chapter_ch14', 'chapter_ch15',
        'chapter_ch16', 'chapter_ch17', 'chapter_ch18', 'chapter_ch19'
    ];

    // 活跃学生A: 完成前10章
    for (let i = 0; i < 10; i++) {
        const daysAgo = 10 - i;
        const completedAt = new Date(Date.now() - daysAgo * 86400000);
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, ?, 100) ON DUPLICATE KEY UPDATE completed=TRUE, completed_at=VALUES(completed_at), score=VALUES(score)',
            [studentIds['test_api_active1'], chapterModules[i], completedAt]
        );
    }
    console.log(`  活跃学生A: 完成 ${10} 章 (ch1-ch10)`);

    // 活跃学生B: 完成前5章
    for (let i = 0; i < 5; i++) {
        const completedAt = new Date(Date.now() - (5 - i) * 86400000);
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, ?, 100) ON DUPLICATE KEY UPDATE completed=TRUE, completed_at=VALUES(completed_at), score=VALUES(score)',
            [studentIds['test_api_active2'], chapterModules[i], completedAt]
        );
    }
    console.log(`  活跃学生B: 完成 ${5} 章 (ch1-ch5)`);

    // 活跃学生C: 完成全部19章
    for (let i = 0; i < 19; i++) {
        const completedAt = new Date(Date.now() - (19 - i) * 86400000);
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, ?, 100) ON DUPLICATE KEY UPDATE completed=TRUE, completed_at=VALUES(completed_at), score=VALUES(score)',
            [studentIds['test_api_active3'], chapterModules[i], completedAt]
        );
    }
    console.log(`  活跃学生C: 完成全部 ${19} 章 (ch1-ch19)`);

    // 满分学生: 完成3章
    for (let i = 0; i < 3; i++) {
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), 100) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
            [studentIds['test_api_perfect'], chapterModules[i]]
        );
    }
    console.log(`  满分学生: 完成 ${3} 章 (ch1-ch3)`);

    // 不及格学生: 完成1章
    await pool.query(
        'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), 100) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
        [studentIds['test_api_failing'], 'chapter_ch1']
    );
    console.log(`  不及格学生: 完成 ${1} 章 (ch1)`);

    // 已毕业学生: 完成5章 (不应计入active统计)
    for (let i = 0; i < 5; i++) {
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), 100) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
            [studentIds['test_api_graduated'], chapterModules[i]]
        );
    }
    console.log(`  已毕业学生: 完成 ${5} 章 (不计入active统计)`);

    // 未活跃学生: 0章完成 (边界情况)
    console.log(`  未活跃学生: 完成 ${0} 章 (边界情况)`);

    // 4. 插入测验成绩记录 (module_id LIKE '%_quiz' OR '%_test')
    console.log('\n[4/5] 插入测验成绩记录...');

    const quizModules = [
        'ch1_quiz', 'ch2_test', 'ch3_quiz', 'ch4_quiz', 'ch5_quiz',
        'ch6_quiz', 'ch7_quiz', 'ch8_quiz', 'ch9_quiz', 'ch10_quiz',
        'ch11_quiz', 'ch12_quiz', 'ch13_quiz', 'ch14_quiz', 'ch15_quiz'
    ];

    // 活跃学生A: 完成前5个测验，分数逐渐提高
    const scoresA = [65, 72, 80, 88, 95];
    for (let i = 0; i < 5; i++) {
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), ?) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
            [studentIds['test_api_active1'], quizModules[i], scoresA[i]]
        );
    }
    console.log(`  活跃学生A: 完成 ${5} 个测验 (分数: ${scoresA.join(', ')})`);

    // 活跃学生B: 完成3个测验，中等分数
    const scoresB = [70, 75, 82];
    for (let i = 0; i < 3; i++) {
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), ?) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
            [studentIds['test_api_active2'], quizModules[i], scoresB[i]]
        );
    }
    console.log(`  活跃学生B: 完成 ${3} 个测验 (分数: ${scoresB.join(', ')})`);

    // 活跃学生C: 完成10个测验，高分
    for (let i = 0; i < 10; i++) {
        const score = 85 + Math.floor(Math.random() * 16);
        await pool.query(
            'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), ?) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
            [studentIds['test_api_active3'], quizModules[i], score]
        );
    }
    console.log(`  活跃学生C: 完成 ${10} 个测验 (高分)`);

    // 满分学生: 完成2个测验，都是100分
    await pool.query(
        'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), 100) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
        [studentIds['test_api_perfect'], 'ch1_quiz']
    );
    await pool.query(
        'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), 100) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
        [studentIds['test_api_perfect'], 'ch2_test']
    );
    console.log(`  满分学生: 完成 ${2} 个测验 (分数: 100, 100)`);

    // 不及格学生: 完成2个测验，但都不及格
    await pool.query(
        'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), 45) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
        [studentIds['test_api_failing'], 'ch1_quiz']
    );
    await pool.query(
        'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, TRUE, NOW(), 38) ON DUPLICATE KEY UPDATE completed=TRUE, score=VALUES(score)',
        [studentIds['test_api_failing'], 'ch2_test']
    );
    console.log(`  不及格学生: 完成 ${2} 个测验 (分数: 45, 38 - 不及格)`);

    // 边界情况: 未完成的测验记录 (completed=FALSE, 但有score)
    await pool.query(
        'INSERT INTO learning_progress (student_id, module_id, completed, completed_at, score) VALUES (?, ?, FALSE, NULL, 30) ON DUPLICATE KEY UPDATE completed=FALSE, score=VALUES(score)',
        [studentIds['test_api_inactive'], 'ch1_quiz']
    );
    console.log(`  未活跃学生: 有1个未完成的测验 (completed=FALSE, score=30)`);

    // 5. 插入登录日志
    console.log('\n[5/5] 插入登录日志...');

    const activeStudents = ['test_api_active1', 'test_api_active2', 'test_api_active3'];
    for (const username of activeStudents) {
        for (let i = 0; i < 5; i++) {
            const loginTime = new Date(Date.now() - i * 86400000);
            await pool.query(
                'INSERT INTO login_logs (student_id, login_time, ip_address) VALUES (?, ?, ?)',
                [studentIds[username], loginTime, '10.20.30.' + (100 + i)]
            );
        }
    }
    console.log(`  为3个活跃学生各插入5条登录日志`);

    console.log('\n=== 测试数据插入完成 ===');
    console.log(`\n总结:`);
    console.log(`  学生: ${Object.keys(studentIds).length} 人`);
    console.log(`  章节完成: 活跃学生A(10章) + B(5章) + C(19章) + 满分(3章) + 不及格(1章) + 已毕业(5章-不计入) = 38条`);
    console.log(`  测验成绩: 活跃学生A(5) + B(3) + C(10) + 满分(2) + 不及格(2) = 22条`);
    console.log(`  边界情况: 未活跃学生(0章)、未完成测验(1条)、已毕业学生(不计入)`);

    process.exit(0);
}

insertTestData().catch(err => {
    console.error('插入测试数据失败:', err);
    process.exit(1);
});