// ===================================================
// 学生端 API 路由
// ===================================================

const shared = require('../shared');
const { requireDB, sessionAuth } = require('../middleware');
const { VALID_MODULES, VALID_ACHIEVEMENTS } = require('../constants');
const { createLogger } = require('../shared/logger');
const path = require('path');
const fs = require('fs');
const log = createLogger('student');

module.exports = function(app) {
    const { pool } = shared;

    // ===================================================
    // 学生端 API - 学习进度
    // ===================================================

    // ---------- 获取学习进度 ----------
    app.get('/api/progress/:username', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username } = req.params;
            if (username !== req.sessionUser.username) {
                return res.status(403).json({ error: '无权访问' });
            }

            // 查找学生
            const [students] = await pool.query(
                'SELECT id FROM students WHERE username = ?', [username]
            );
            if (students.length === 0) {
                return res.json({ success: true, modules: {}, achievements: {}, loginDates: [], chapters: {} });
            }

            const studentId = students[0].id;

            // 获取模块进度
            const [modules] = await pool.query(
                'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1',
                [studentId]
            );
            const moduleMap = {};
            modules.forEach(m => {
                moduleMap[m.module_id] = m.completed_at;
            });

            // 提取章节进度（module_id 以 chapter_ 开头）
            const chapterMap = {};
            modules.forEach(m => {
                if (m.module_id.startsWith('chapter_')) {
                    const chapterId = m.module_id.replace('chapter_', '');
                    chapterMap[chapterId] = m.completed_at;
                }
            });

            // 获取成就
            const [achievements] = await pool.query(
                'SELECT achievement_id, earned_at FROM achievements WHERE student_id = ?',
                [studentId]
            );
            const achMap = {};
            achievements.forEach(a => {
                achMap[a.achievement_id] = a.earned_at;
            });

            // 获取登录日期
            const [logs] = await pool.query(
                'SELECT DISTINCT DATE(login_time) AS login_date FROM login_logs WHERE student_id = ?',
                [studentId]
            );
            const loginDates = logs.map(l => {
                // MySQL 日期格式化
                const d = new Date(l.login_date);
                return d.toISOString().split('T')[0];
            });

            res.json({ success: true, modules: moduleMap, achievements: achMap, loginDates, chapters: chapterMap });
        } catch (err) {
            log.error('获取进度失败', { error: err.message });
            res.json({ success: false, modules: {}, achievements: {}, loginDates: [], chapters: {} });
        }
    });

    // ---------- 学习排行榜 ----------
    app.get('/api/leaderboard', requireDB, sessionAuth, async (req, res) => {
        try {
            const grade = (req.query.grade || '').toString().trim();
            const classNum = parseInt(req.query.classNum, 10);

            const conditions = ["s.status = 'active'"];
            const params = [];
            if (grade) {
                conditions.push('s.grade = ?');
                params.push(grade);
            }
            if (!isNaN(classNum)) {
                conditions.push('s.class_num = ?');
                params.push(classNum);
            }
            const whereClause = 'WHERE ' + conditions.join(' AND ');

            const [rows] = await pool.query(`
                SELECT
                    s.username, s.display_name, s.grade, s.class_num,
                    COALESCE(lp.chapter_count, 0) AS chapter_count,
                    COALESCE(ach.ach_count, 0) AS achievement_count,
                    (COALESCE(lp.chapter_count, 0) * 100 + COALESCE(ach.ach_count, 0) * 20 + COALESCE(lp.total_score, 0)) AS score
                FROM students s
                LEFT JOIN (
                    SELECT student_id,
                           SUM(CASE WHEN module_id LIKE 'chapter_%' THEN 1 ELSE 0 END) AS chapter_count,
                           SUM(score) AS total_score
                    FROM learning_progress
                    WHERE completed = 1
                    GROUP BY student_id
                ) lp ON s.id = lp.student_id
                LEFT JOIN (
                    SELECT student_id, COUNT(*) AS ach_count
                    FROM achievements
                    GROUP BY student_id
                ) ach ON s.id = ach.student_id
                ${whereClause}
                ORDER BY score DESC, chapter_count DESC, achievement_count DESC
                LIMIT 50
            `, params);

            const leaderboard = rows.map(r => ({
                username: r.username,
                display_name: r.display_name,
                grade: r.grade,
                class_num: r.class_num,
                chapter_count: Number(r.chapter_count),
                achievement_count: Number(r.achievement_count),
                score: Number(r.score)
            }));

            res.json({ success: true, leaderboard });
        } catch (err) {
            log.error('获取排行榜失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 排行榜班级列表 ----------
    app.get('/api/leaderboard/classes', requireDB, sessionAuth, async (req, res) => {
        try {
            const grade = (req.query.grade || '').toString().trim();
            const conditions = ["s.status = 'active'", 's.class_num > 0'];
            const params = [];
            if (grade) {
                conditions.push('s.grade = ?');
                params.push(grade);
            }
            const [rows] = await pool.query(
                `SELECT DISTINCT s.class_num FROM students s
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY s.class_num ASC`,
                params
            );
            res.json({ success: true, classes: rows.map(r => r.class_num) });
        } catch (err) {
            log.error('获取班级列表失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 标记模块完成 ----------
    app.post('/api/progress/mark', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username, moduleId, score } = req.body;
            if (!username || !moduleId) {
                return res.json({ success: false, error: '参数不完整' });
            }
            // 模块ID白名单校验（使用共享常量）
            if (!VALID_MODULES.includes(moduleId)) {
                return res.json({ success: false, error: '无效的模块ID' });
            }
            if (username.length > 50 || moduleId.length > 30) {
                return res.json({ success: false, error: '参数过长' });
            }

            const [students] = await pool.query(
                'SELECT id FROM students WHERE username = ?', [username]
            );
            if (students.length === 0) {
                return res.json({ success: false, error: '用户不存在' });
            }

            const studentId = students[0].id;
            const validScore = Math.min(100, Math.max(0, parseInt(score) || 0));

            await pool.query(
                `INSERT INTO learning_progress (student_id, module_id, completed, score, completed_at)
                 VALUES (?, ?, 1, ?, NOW())
                 ON DUPLICATE KEY UPDATE completed = 1, score = VALUES(score), completed_at = NOW()`,
                [studentId, moduleId, validScore]
            );

            res.json({ success: true });
        } catch (err) {
            log.error('标记模块失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ---------- 颁发成就 ----------
    app.post('/api/achievement/award', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username, achievementId } = req.body;
            if (!username || !achievementId) {
                return res.json({ success: false, error: '参数不完整' });
            }
            // 成就ID白名单校验（使用共享常量）
            if (!VALID_ACHIEVEMENTS.includes(achievementId)) {
                return res.json({ success: false, error: '无效的成就ID' });
            }
            if (username.length > 50 || achievementId.length > 30) {
                return res.json({ success: false, error: '参数过长' });
            }

            const [students] = await pool.query(
                'SELECT id FROM students WHERE username = ?', [username]
            );
            if (students.length === 0) {
                return res.json({ success: false, error: '用户不存在' });
            }

            const studentId = students[0].id;

            await pool.query(
                `INSERT IGNORE INTO achievements (student_id, achievement_id, earned_at)
                 VALUES (?, ?, NOW())`,
                [studentId, achievementId]
            );

            // 通过 WebSocket 实时推送成就通知
            try {
                const ws = require('../ws');
                ws.wsBroadcast(username, {
                    type: 'notification',
                    data: { title: '🏆 新成就解锁！', content: '你获得了新成就！', type: 'achievement' }
                });
            } catch (e) { log.warn('通知推送失败', { error: e.message }); }

            res.json({ success: true });
        } catch (err) {
            log.error('颁发成就失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 错题本
    // ===================================================

    app.post('/api/mistakes', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username, chapterId, questionText, correctAnswer, studentAnswer } = req.body;
            if (!username || !chapterId || !questionText || !correctAnswer || !studentAnswer) {
                return res.json({ success: false, error: '参数不完整' });
            }

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            await pool.query(
                'INSERT INTO mistake_book (student_id, chapter_id, question_text, correct_answer, student_answer) VALUES (?, ?, ?, ?, ?)',
                [students[0].id, chapterId, questionText, correctAnswer, studentAnswer]
            );
            res.json({ success: true });
        } catch (err) {
            log.error('记录错题失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 获取错题列表
    app.get('/api/mistakes/:username', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username } = req.params;
            if (username !== req.sessionUser.username) {
                return res.status(403).json({ error: '无权访问' });
            }
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const [rows] = await pool.query(
                'SELECT id, chapter_id, question_text, correct_answer, student_answer, created_at FROM mistake_book WHERE student_id = ? ORDER BY created_at DESC',
                [students[0].id]
            );
            res.json({ success: true, mistakes: rows });
        } catch (err) {
            log.error('获取错题失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 删除单条错题
    app.delete('/api/mistakes/:id', requireDB, sessionAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

            const { username } = req.body;
            if (!username) return res.json({ success: false, error: '缺少用户名' });

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const [mistake] = await pool.query('SELECT id FROM mistake_book WHERE id = ? AND student_id = ?', [id, students[0].id]);
            if (mistake.length === 0) return res.json({ success: false, error: '错题不存在或无权操作' });

            await pool.query('DELETE FROM mistake_book WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            log.error('删除错题失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 代码收藏
    // ===================================================

    // 收藏代码
    app.post('/api/snippets', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username, title, code, chapterId } = req.body;
            if (!username || !title || !code) {
                return res.json({ success: false, error: '参数不完整' });
            }

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            await pool.query(
                'INSERT INTO code_snippets (student_id, title, code, chapter_id) VALUES (?, ?, ?, ?)',
                [students[0].id, title, code, chapterId || '']
            );
            res.json({ success: true });
        } catch (err) {
            log.error('收藏代码失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 获取收藏列表
    app.get('/api/snippets/:username', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username } = req.params;
            if (username !== req.sessionUser.username) {
                return res.status(403).json({ error: '无权访问' });
            }
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const [rows] = await pool.query(
                'SELECT id, title, code, chapter_id, created_at FROM code_snippets WHERE student_id = ? ORDER BY created_at DESC',
                [students[0].id]
            );
            res.json({ success: true, snippets: rows });
        } catch (err) {
            log.error('获取收藏失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 删除收藏
    app.delete('/api/snippets/:id', requireDB, sessionAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

            const { username } = req.body;
            if (!username) return res.json({ success: false, error: '缺少用户名' });

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const [snippet] = await pool.query('SELECT id FROM code_snippets WHERE id = ? AND student_id = ?', [id, students[0].id]);
            if (snippet.length === 0) return res.json({ success: false, error: '收藏不存在或无权操作' });

            await pool.query('DELETE FROM code_snippets WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            log.error('删除收藏失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 学习报告
    // ===================================================

    app.get('/api/report/:username', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username } = req.params;
            if (username !== req.sessionUser.username) {
                return res.status(403).json({ error: '无权访问' });
            }
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const studentId = students[0].id;

            // P5.5: 合并 3 个 COUNT 查询 + 并行执行，从 7 次往返优化为 4 次
            const [countsResult, allModulesResult, loginDatesResult] = await Promise.all([
                // 合并计数：章节完成数 + 成就数 + 学习天数
                pool.query(`
                    SELECT
                        (SELECT COUNT(*) FROM learning_progress
                         WHERE student_id = ? AND completed = 1 AND module_id LIKE 'chapter_%') AS chapterCount,
                        (SELECT COUNT(*) FROM achievements
                         WHERE student_id = ?) AS achievementCount,
                        (SELECT COUNT(DISTINCT DATE(login_time)) FROM login_logs
                         WHERE student_id = ?) AS totalDays
                `, [studentId, studentId, studentId]),
                // 所有模块完成详情（一次查询，JS 端过滤）
                pool.query(
                    'SELECT module_id, score, completed_at FROM learning_progress WHERE student_id = ? AND completed = 1 ORDER BY module_id',
                    [studentId]
                ),
                // 连续学习天数
                pool.query(
                    'SELECT DISTINCT DATE(login_time) AS login_date FROM login_logs WHERE student_id = ? ORDER BY login_date DESC',
                    [studentId]
                )
            ]);

            const [[counts]] = countsResult;
            const [allModules] = allModulesResult;
            const [loginDates] = loginDatesResult;

            // 从 allModules 中过滤出 chapter_ 开头的记录
            const chapterDetails = allModules.filter(m => m.module_id.startsWith('chapter_'));

            // 连续学习天数计算
            let streakDays = 0;
            if (loginDates.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                const lastLoginDate = new Date(loginDates[0].login_date);
                lastLoginDate.setHours(0, 0, 0, 0);

                if (lastLoginDate.getTime() >= yesterday.getTime()) {
                    streakDays = 1;
                    let current = new Date(lastLoginDate);
                    for (let i = 1; i < loginDates.length; i++) {
                        const prev = new Date(loginDates[i].login_date);
                        const expected = new Date(current);
                        expected.setDate(expected.getDate() - 1);
                        if (prev.getTime() === expected.getTime()) {
                            streakDays++;
                            current = prev;
                        } else {
                            break;
                        }
                    }
                }
            }

            // 强项弱项分析：按章节统计得分
            const chapterScoreMap = {};
            for (const m of allModules) {
                let chId = '';
                if (m.module_id.startsWith('chapter_')) {
                    chId = m.module_id.replace('chapter_', '');
                } else if (m.module_id.startsWith('ch') && m.module_id.includes('_')) {
                    chId = m.module_id.split('_')[0];
                }
                if (chId) {
                    if (!chapterScoreMap[chId]) chapterScoreMap[chId] = { total: 0, count: 0 };
                    chapterScoreMap[chId].total += m.score || 0;
                    chapterScoreMap[chId].count++;
                }
            }

            const strengths = [];
            const weaknesses = [];
            for (const [ch, data] of Object.entries(chapterScoreMap)) {
                const avg = data.count > 0 ? data.total / data.count : 0;
                if (avg >= 80) strengths.push(ch);
                else if (avg < 60 && data.count > 0) weaknesses.push(ch);
            }

            res.json({
                success: true,
                report: {
                    totalChapters: Number(counts.chapterCount),
                    totalAchievements: Number(counts.achievementCount),
                    streakDays,
                    totalDays: Number(counts.totalDays),
                    chapterDetails: chapterDetails.map(m => ({
                        moduleId: m.module_id,
                        score: m.score,
                        completedAt: m.completed_at
                    })),
                    strengths,
                    weaknesses
                }
            });
        } catch (err) {
            log.error('学习报告生成失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 通知
    // ===================================================

    // 获取通知列表
    app.get('/api/notifications/:username', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username } = req.params;
            if (username !== req.sessionUser.username) {
                return res.status(403).json({ error: '无权访问' });
            }
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const [rows] = await pool.query(
                'SELECT id, title, content, type, is_read, created_at FROM notifications WHERE student_id = ? ORDER BY created_at DESC LIMIT 50',
                [students[0].id]
            );
            res.json({ success: true, notifications: rows });
        } catch (err) {
            log.error('获取通知失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 标记已读
    app.put('/api/notifications/:id/read', requireDB, sessionAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [notification] = await pool.query('SELECT id FROM notifications WHERE id = ? AND student_id = ?', [id, students[0].id]);
            if (notification.length === 0) return res.status(403).json({ error: '无权访问' });

            await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            log.error('标记已读失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 全部标记已读
    app.put('/api/notifications/read-all', requireDB, sessionAuth, async (req, res) => {
        try {
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            await pool.query('UPDATE notifications SET is_read = 1 WHERE student_id = ?', [students[0].id]);
            res.json({ success: true });
        } catch (err) {
            log.error('全部标记已读失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 讨论区
    // ===================================================

    // 获取讨论列表
    app.get('/api/discussions', requireDB, async (req, res) => {
        try {
            const { chapterId } = req.query;
            let sql = `
                SELECT dp.id, dp.title, dp.content, dp.chapter_id, dp.created_at,
                       s.display_name, s.username,
                       (SELECT COUNT(*) FROM discussion_replies WHERE post_id = dp.id) AS reply_count
                FROM discussion_posts dp
                JOIN students s ON dp.student_id = s.id
            `;
            const params = [];
            if (chapterId) {
                sql += ' WHERE dp.chapter_id = ?';
                params.push(chapterId);
            }
            sql += ' ORDER BY dp.created_at DESC LIMIT 50';

            const [rows] = await pool.query(sql, params);
            res.json({ success: true, discussions: rows });
        } catch (err) {
            log.error('获取讨论失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 发帖
    app.post('/api/discussions', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username, title, content, chapterId } = req.body;
            if (!username || !title || !content) {
                return res.json({ success: false, error: '参数不完整' });
            }

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const [result] = await pool.query(
                'INSERT INTO discussion_posts (student_id, title, content, chapter_id) VALUES (?, ?, ?, ?)',
                [students[0].id, title, content, chapterId || '']
            );
            res.json({ success: true, id: result.insertId });
        } catch (err) {
            log.error('发帖失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 获取帖子详情（含回复）
    app.get('/api/discussions/:id', requireDB, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.json({ success: false, error: '无效的ID' });

            const [posts] = await pool.query(
                `SELECT dp.id, dp.title, dp.content, dp.chapter_id, dp.created_at,
                        s.display_name, s.username
                 FROM discussion_posts dp
                 JOIN students s ON dp.student_id = s.id
                 WHERE dp.id = ?`,
                [id]
            );
            if (posts.length === 0) return res.json({ success: false, error: '帖子不存在' });

            const [replies] = await pool.query(
                `SELECT dr.id, dr.content, dr.created_at, s.display_name, s.username
                 FROM discussion_replies dr
                 JOIN students s ON dr.student_id = s.id
                 WHERE dr.post_id = ?
                 ORDER BY dr.created_at ASC`,
                [id]
            );

            res.json({ success: true, post: posts[0], replies });
        } catch (err) {
            log.error('获取帖子详情失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 回复帖子
    app.post('/api/discussions/:id/replies', requireDB, sessionAuth, async (req, res) => {
        try {
            const postId = parseInt(req.params.id);
            if (isNaN(postId)) return res.json({ success: false, error: '无效的ID' });

            const { username, content } = req.body;
            if (!username || !content) return res.json({ success: false, error: '参数不完整' });

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            await pool.query(
                'INSERT INTO discussion_replies (post_id, student_id, content) VALUES (?, ?, ?)',
                [postId, students[0].id, content]
            );
            res.json({ success: true });
        } catch (err) {
            log.error('回复失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 每日一题
    // ===================================================

    app.get('/api/daily-question', requireDB, async (req, res) => {
        try {
            const { date } = req.query;
            let sql = 'SELECT id, question, options, answer, explanation, question_date FROM daily_questions';
            let params = [];

            if (date) {
                sql += ' WHERE question_date = ?';
                params.push(date);
            } else {
                sql += ' ORDER BY question_date DESC LIMIT 1';
            }

            const [rows] = await pool.query(sql, params);
            if (rows.length === 0) {
                return res.json({ success: false, error: '暂无题目' });
            }
            res.json({ success: true, question: rows[0] });
        } catch (err) {
            log.error('获取每日一题失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 作业
    // ===================================================

    app.get('/api/assignments', requireDB, async (req, res) => {
        try {
            const { username } = req.query;
            const [rows] = await pool.query(
                `SELECT a.id, a.title, a.description, a.chapter_id, a.due_date, a.created_by, a.created_at
                 FROM assignments a ORDER BY a.created_at DESC`
            );

            // 如果提供了用户名，查询提交状态
            if (username) {
                const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
                if (students.length > 0) {
                    const studentId = students[0].id;
                    const [submissions] = await pool.query(
                        'SELECT assignment_id, score, submitted_at FROM assignment_submissions WHERE student_id = ?',
                        [studentId]
                    );
                    const subMap = {};
                    submissions.forEach(s => {
                        subMap[s.assignment_id] = { score: s.score, submittedAt: s.submitted_at };
                    });
                    rows.forEach(r => {
                        r.submission = subMap[r.id] || null;
                    });
                }
            }

            res.json({ success: true, assignments: rows });
        } catch (err) {
            log.error('获取作业列表失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 提交作业
    app.post('/api/assignments/:id/submit', requireDB, sessionAuth, async (req, res) => {
        try {
            const assignmentId = parseInt(req.params.id);
            if (isNaN(assignmentId)) return res.json({ success: false, error: '无效的作业ID' });

            const { username, content } = req.body;
            if (!username || !content) {
                return res.json({ success: false, error: '参数不完整' });
            }
            if (content.length > 10000) {
                return res.json({ success: false, error: '作业内容过长（最多10000字）' });
            }

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            // 检查作业是否存在
            const [assignments] = await pool.query('SELECT id FROM assignments WHERE id = ?', [assignmentId]);
            if (assignments.length === 0) return res.json({ success: false, error: '作业不存在' });

            await pool.query(
                `INSERT INTO assignment_submissions (assignment_id, student_id, content)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE content = VALUES(content), submitted_at = NOW()`,
                [assignmentId, students[0].id, content]
            );
            res.json({ success: true });
        } catch (err) {
            log.error('提交作业失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 章节锁定
    // ===================================================

    app.get('/api/chapter-locks', requireDB, sessionAuth, async (req, res) => {
        try {
            const { grade, classNum } = req.query;
            const [rows] = await pool.query(
                'SELECT chapter_id, locked FROM chapter_locks WHERE (grade = ? OR grade = ?) AND (class_num = ? OR class_num = 0)',
                [grade || '', '', classNum || 0]
            );
            const lockedChapters = {};
            rows.forEach(r => { lockedChapters[r.chapter_id] = !!r.locked; });
            res.json({ success: true, lockedChapters });
        } catch (err) {
            log.error('获取章节锁定失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 学习笔记
    // ===================================================

    // 获取笔记列表
    app.get('/api/notes', requireDB, sessionAuth, async (req, res) => {
        try {
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const chapterId = req.query.chapterId || '';
            let sql = 'SELECT id, chapter_id, module_id, content, created_at, updated_at FROM study_notes WHERE student_id = ?';
            const params = [students[0].id];
            if (chapterId) {
                sql += ' AND chapter_id = ?';
                params.push(chapterId);
            }
            sql += ' ORDER BY updated_at DESC LIMIT 50';
            const [rows] = await pool.query(sql, params);
            res.json({ success: true, notes: rows });
        } catch (err) {
            log.error('获取笔记失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 创建笔记
    app.post('/api/notes', requireDB, sessionAuth, async (req, res) => {
        try {
            const { content, chapterId, moduleId } = req.body;
            if (!content || !content.trim()) return res.json({ success: false, error: '笔记内容不能为空' });
            if (content.length > 10000) return res.json({ success: false, error: '笔记内容不能超过10000字' });

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [result] = await pool.query(
                'INSERT INTO study_notes (student_id, chapter_id, module_id, content) VALUES (?, ?, ?, ?)',
                [students[0].id, chapterId || '', moduleId || '', content.trim()]
            );
            res.json({ success: true, id: result.insertId });
        } catch (err) {
            log.error('创建笔记失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 更新笔记
    app.put('/api/notes/:id', requireDB, sessionAuth, async (req, res) => {
        try {
            const { content } = req.body;
            if (!content || !content.trim()) return res.json({ success: false, error: '笔记内容不能为空' });

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [result] = await pool.query(
                'UPDATE study_notes SET content = ? WHERE id = ? AND student_id = ?',
                [content.trim(), req.params.id, students[0].id]
            );
            if (result.affectedRows === 0) return res.json({ success: false, error: '笔记不存在或无权编辑' });
            res.json({ success: true });
        } catch (err) {
            log.error('更新笔记失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 删除笔记
    app.delete('/api/notes/:id', requireDB, sessionAuth, async (req, res) => {
        try {
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [result] = await pool.query('DELETE FROM study_notes WHERE id = ? AND student_id = ?', [req.params.id, students[0].id]);
            if (result.affectedRows === 0) return res.json({ success: false, error: '笔记不存在或无权删除' });
            res.json({ success: true });
        } catch (err) {
            log.error('删除笔记失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 学习目标
    // ===================================================

    // 获取目标列表
    app.get('/api/goals', requireDB, sessionAuth, async (req, res) => {
        try {
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [rows] = await pool.query(
                'SELECT id, goal_text, target_chapters, start_date, end_date, completed, created_at FROM student_goals WHERE student_id = ? ORDER BY created_at DESC',
                [students[0].id]
            );
            res.json({ success: true, goals: rows });
        } catch (err) {
            log.error('获取目标失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 创建目标
    app.post('/api/goals', requireDB, sessionAuth, async (req, res) => {
        try {
            const { goalText, targetChapters, startDate, endDate } = req.body;
            if (!goalText || !goalText.trim()) return res.json({ success: false, error: '目标内容不能为空' });
            if (goalText.length > 500) return res.json({ success: false, error: '目标内容不能超过500字' });

            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [result] = await pool.query(
                'INSERT INTO student_goals (student_id, goal_text, target_chapters, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
                [students[0].id, goalText.trim(), targetChapters || 0, startDate || new Date().toISOString().slice(0, 10), endDate || new Date().toISOString().slice(0, 10)]
            );
            res.json({ success: true, id: result.insertId });
        } catch (err) {
            log.error('创建目标失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 更新目标（标记完成）
    app.put('/api/goals/:id', requireDB, sessionAuth, async (req, res) => {
        try {
            const { completed } = req.body;
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [result] = await pool.query(
                'UPDATE student_goals SET completed = ? WHERE id = ? AND student_id = ?',
                [completed ? 1 : 0, req.params.id, students[0].id]
            );
            if (result.affectedRows === 0) return res.json({ success: false, error: '目标不存在或无权编辑' });
            res.json({ success: true });
        } catch (err) {
            log.error('更新目标失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 删除目标
    app.delete('/api/goals/:id', requireDB, sessionAuth, async (req, res) => {
        try {
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [req.sessionUser.username]);
            if (students.length === 0) return res.status(403).json({ error: '无权访问' });

            const [result] = await pool.query('DELETE FROM student_goals WHERE id = ? AND student_id = ?', [req.params.id, students[0].id]);
            if (result.affectedRows === 0) return res.json({ success: false, error: '目标不存在或无权删除' });
            res.json({ success: true });
        } catch (err) {
            log.error('删除目标失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 个人信息
    // ===================================================

    // 获取「是否允许学生自行编辑资料」开关
    app.get('/api/profile-edit-enabled', requireDB, async (req, res) => {
        try {
            const [rows] = await pool.query(
                "SELECT setting_value FROM registration_settings WHERE setting_key = 'profile_edit_enabled'"
            );
            const enabled = rows.length === 0 || rows[0].setting_value !== 'false';
            res.json({ success: true, enabled });
        } catch (err) {
            log.error('获取资料编辑开关错误', { error: err.message });
            res.json({ success: false, enabled: true });
        }
    });

    // 获取个人信息
    app.get('/api/profile', requireDB, sessionAuth, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT username, display_name, grade, class_num, created_at FROM students WHERE username = ?',
                [req.sessionUser.username]
            );
            if (rows.length === 0) return res.json({ success: false, error: '用户不存在' });
            res.json({ success: true, profile: rows[0] });
        } catch (err) {
            log.error('获取个人信息错误', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // 更新个人信息
    app.put('/api/profile', requireDB, sessionAuth, async (req, res) => {
        try {
            // 检查管理员是否允许学生自行编辑资料
            const [editRows] = await pool.query(
                "SELECT setting_value FROM registration_settings WHERE setting_key = 'profile_edit_enabled'"
            );
            const editEnabled = editRows.length === 0 || editRows[0].setting_value !== 'false';
            if (!editEnabled) {
                return res.json({ success: false, error: '管理员已关闭资料编辑功能，请联系老师' });
            }

            const { displayName, grade, classNum } = req.body;
            if (!displayName || !displayName.trim()) return res.json({ success: false, error: '显示名称不能为空' });
            if (displayName.length > 50) return res.json({ success: false, error: '显示名称不能超过50字' });
            if (!['七年级', '八年级'].includes(grade)) return res.json({ success: false, error: '年级仅限七年级或八年级' });
            const cn = parseInt(classNum);
            if (isNaN(cn) || cn < 1 || cn > 20) return res.json({ success: false, error: '班级范围为1-20' });

            await pool.query(
                'UPDATE students SET display_name = ?, grade = ?, class_num = ? WHERE username = ?',
                [displayName.trim(), grade, cn, req.sessionUser.username]
            );
            res.json({ success: true, message: '个人信息更新成功' });
        } catch (err) {
            log.error('更新个人信息错误', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

    // ===================================================
    // 学生端 API - 截图上传
    // ===================================================
    app.post('/api/screenshots/upload', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username, imageData, chapterId, fileName } = req.body;
            if (!username || !imageData) {
                return res.json({ success: false, error: '参数不完整，请提供截图数据' });
            }
            // 限制图片大小（base64编码后约6MB，对应原始图片约4.5MB）
            if (imageData.length > 6 * 1024 * 1024) {
                return res.json({ success: false, error: '截图文件过大，请压缩后再上传' });
            }
            // 验证 base64 格式
            if (!imageData.startsWith('data:image/')) {
                return res.json({ success: false, error: '只支持图片格式（PNG、JPG、GIF等）' });
            }

            const [students] = await pool.query('SELECT id, display_name FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            // 生成唯一文件名
            const ext = imageData.match(/^data:image\/(\w+);/);
            const fileExt = ext ? ext[1] : 'png';
            const safeFileName = (fileName || 'screenshot').replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');
            const timestamp = Date.now();
            const uniqueName = `${timestamp}_${students[0].id}_${safeFileName}.${fileExt}`;
            const uploadPath = path.join(__dirname, '..', 'uploads', uniqueName);

            // 将 base64 数据写入文件
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(uploadPath, buffer);

            // 记录到数据库
            await pool.query(
                `INSERT INTO screenshot_submissions (student_id, chapter_id, file_name, file_path, created_at)
                 VALUES (?, ?, ?, ?, NOW())`,
                [students[0].id, chapterId || '', uniqueName, uploadPath]
            );

            log.info('截图上传成功', { username, fileName: uniqueName, chapterId });
            res.json({ success: true, message: '截图上传成功！', fileName: uniqueName });
        } catch (err) {
            log.error('截图上传失败', { error: err.message });
            res.json({ success: false, error: '上传失败，请重试' });
        }
    });

    // 获取截图列表
    app.get('/api/screenshots/:username', requireDB, sessionAuth, async (req, res) => {
        try {
            const { username } = req.params;
            if (username !== req.sessionUser.username) {
                return res.status(403).json({ error: '无权访问' });
            }
            const [students] = await pool.query('SELECT id FROM students WHERE username = ?', [username]);
            if (students.length === 0) return res.json({ success: false, error: '用户不存在' });

            const [rows] = await pool.query(
                'SELECT id, chapter_id, file_name, created_at FROM screenshot_submissions WHERE student_id = ? ORDER BY created_at DESC LIMIT 50',
                [students[0].id]
            );
            res.json({ success: true, screenshots: rows });
        } catch (err) {
            log.error('获取截图列表失败', { error: err.message });
            res.json({ success: false, error: '服务器错误' });
        }
    });

};