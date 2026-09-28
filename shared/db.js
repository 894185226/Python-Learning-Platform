// ===================================================
// 共享模块 - 数据库初始化、迁移、备份
// ===================================================
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const shared = require('../shared');

const {
    DB_HOST,
    DB_ROOT_USER,
    DB_ROOT_PASSWORD,
    DB_APP_USER,
    DB_APP_PASSWORD,
    DB_NAME,
    pool,
} = shared;

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// ===================================================
// 数据库初始化
// ===================================================
async function initializeDatabase() {
    // 1. 使用 root 凭据连接（不指定数据库）
    const initPool = mysql.createPool({
        host: DB_HOST,
        user: DB_ROOT_USER,
        password: DB_ROOT_PASSWORD,
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 3,
    });

    console.log('[数据库] 正在创建数据库...');
    await initPool.execute(
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[数据库] 数据库 ${DB_NAME} 已就绪`);

    // 2. 创建应用用户（如果设置了密码）
    if (DB_APP_PASSWORD) {
        try {
            console.log('[数据库] 正在创建应用用户...');
            await initPool.execute(
                `CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'%' IDENTIFIED BY '${DB_APP_PASSWORD}'`
            );
            await initPool.execute(
                `CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${DB_APP_PASSWORD}'`
            );
            await initPool.execute(
                `GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_APP_USER}'@'%'`
            );
            await initPool.execute(
                `GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_APP_USER}'@'localhost'`
            );
            await initPool.execute('FLUSH PRIVILEGES');
            console.log(`[数据库] 应用用户 ${DB_APP_USER} 已创建并授权`);
        } catch (err) {
            // 用户已存在不是错误，继续执行
            if (err.code !== 'ER_CANNOT_USER') {
                console.warn('[数据库] 创建应用用户时出现警告:', err.message);
            }
        }
    }

    // 3. 关闭 root 连接池
    await initPool.end();

    // 4. 使用应用凭据创建所有表
    console.log('[数据库] 正在创建数据表...');

    await pool.execute(`CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(60) NOT NULL,
        display_name VARCHAR(50) DEFAULT '',
        grade VARCHAR(20) DEFAULT '七年级',
        class_num INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_grade_class (grade, class_num)
    ) ENGINE=InnoDB COMMENT='学生用户表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS learning_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        module_id VARCHAR(50) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        score INT DEFAULT 0,
        UNIQUE KEY uk_student_module (student_id, module_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB COMMENT='学习进度表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        achievement_id VARCHAR(50) NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_student_ach (student_id, achievement_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB COMMENT='成就记录表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS login_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45) DEFAULT '',
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_date (student_id, login_time)
    ) ENGINE=InnoDB COMMENT='登录日志表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(60) NOT NULL,
        display_name VARCHAR(50) NOT NULL DEFAULT '管理员',
        role VARCHAR(20) DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB COMMENT='管理员账号表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_name VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        detail VARCHAR(500) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB COMMENT='管理员操作日志表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS notices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB COMMENT='系统公告表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS discussion_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        chapter_id VARCHAR(10) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_chapter (chapter_id),
        INDEX idx_student_id (student_id)
    ) ENGINE=InnoDB COMMENT='讨论帖表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS discussion_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        student_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES discussion_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_post_id (post_id)
    ) ENGINE=InnoDB COMMENT='讨论回复表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        chapter_id VARCHAR(10) DEFAULT '',
        due_date DATE,
        created_by VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_due (due_date)
    ) ENGINE=InnoDB COMMENT='作业表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS assignment_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        student_id INT NOT NULL,
        content TEXT,
        score INT DEFAULT 0,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY uk_assignment_student (assignment_id, student_id)
    ) ENGINE=InnoDB COMMENT='作业提交表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS daily_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        options JSON COMMENT '选项列表JSON',
        answer VARCHAR(10) NOT NULL,
        explanation TEXT,
        question_date DATE NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB COMMENT='每日一题表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS chapter_locks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chapter_id VARCHAR(10) NOT NULL,
        locked TINYINT(1) DEFAULT 1,
        grade VARCHAR(20) DEFAULT '',
        class_num INT DEFAULT 0,
        UNIQUE KEY uk_chapter_grade_class (chapter_id, grade, class_num)
    ) ENGINE=InnoDB COMMENT='章节锁定表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        type VARCHAR(30) DEFAULT 'system',
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_read (student_id, is_read)
    ) ENGINE=InnoDB COMMENT='通知表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS code_snippets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        code TEXT NOT NULL,
        chapter_id VARCHAR(10) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_id (student_id)
    ) ENGINE=InnoDB COMMENT='代码收藏表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS screenshot_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        chapter_id VARCHAR(10) DEFAULT '',
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_id (student_id),
        INDEX idx_chapter_id (chapter_id)
    ) ENGINE=InnoDB COMMENT='截图提交表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(64) PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        student_id INT NOT NULL,
        csrf_token VARCHAR(64) DEFAULT '',
        created_at BIGINT NOT NULL,
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB COMMENT='用户会话表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS mistake_book (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        chapter_id VARCHAR(10) NOT NULL,
        question_text TEXT NOT NULL,
        correct_answer VARCHAR(500) NOT NULL,
        student_answer VARCHAR(500) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_chapter (student_id, chapter_id)
    ) ENGINE=InnoDB COMMENT='错题本表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS study_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        chapter_id VARCHAR(10) NOT NULL,
        module_id VARCHAR(30) DEFAULT '',
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_chapter (student_id, chapter_id)
    ) ENGINE=InnoDB COMMENT='学习笔记表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS student_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        goal_text VARCHAR(500) NOT NULL,
        target_chapters INT DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        completed TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student (student_id)
    ) ENGINE=InnoDB COMMENT='学习目标表'`);

    // ===== 注册管理系统表 =====
    await pool.execute(`CREATE TABLE IF NOT EXISTS registration_settings (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50)  NOT NULL UNIQUE COMMENT '配置键',
        setting_value TEXT       COMMENT '配置值',
        updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
    ) ENGINE=InnoDB COMMENT='注册管理配置表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS registration_logs (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        username        VARCHAR(50)  NOT NULL COMMENT '尝试注册的用户名',
        display_name    VARCHAR(50)  DEFAULT '' COMMENT '显示名称',
        grade           VARCHAR(20)  DEFAULT '' COMMENT '年级',
        class_num       INT          DEFAULT 0 COMMENT '班级',
        student_id      VARCHAR(30)  DEFAULT '' COMMENT '学号',
        ip_address      VARCHAR(45)  DEFAULT '' COMMENT 'IP地址',
        user_agent      VARCHAR(500) DEFAULT '' COMMENT '浏览器UA',
        result          VARCHAR(20)  NOT NULL COMMENT '结果: success/failed/blocked',
        reason          VARCHAR(200) DEFAULT '' COMMENT '失败/阻止原因',
        created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
        INDEX idx_username (username),
        INDEX idx_ip (ip_address),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB COMMENT='注册审计日志表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS student_identifiers (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        student_id      INT          NOT NULL COMMENT '学生编号（外键）',
        identifier_type VARCHAR(20)  NOT NULL COMMENT '标识类型: student_id/email/phone',
        identifier_value VARCHAR(100) NOT NULL COMMENT '标识值',
        created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY uk_identifier (identifier_type, identifier_value),
        INDEX idx_student_type (student_id, identifier_type)
    ) ENGINE=InnoDB COMMENT='学生唯一标识表'`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS merge_records (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        source_student_id INT        NOT NULL COMMENT '被合并的源账号ID',
        target_student_id INT        NOT NULL COMMENT '合并到的目标账号ID',
        admin_name      VARCHAR(50)  NOT NULL COMMENT '操作管理员',
        merged_at       DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '合并时间',
        INDEX idx_source (source_student_id),
        INDEX idx_target (target_student_id)
    ) ENGINE=InnoDB COMMENT='账号合并记录表'`);

    // 初始化注册管理默认配置
    try {
        await pool.execute(
            `INSERT IGNORE INTO registration_settings (setting_key, setting_value) VALUES
             ('registration_enabled', 'true'),
             ('require_student_id', 'false'),
             ('max_accounts_per_ip', '3'),
             ('registration_cooldown_minutes', '5'),
             ('max_accounts_per_student_id', '1'),
             ('profile_edit_enabled', 'true')`
        );
    } catch (err) {
        console.warn('[数据库] 初始化注册配置时出现警告:', err.message);
    }

    console.log('[数据库] 所有数据表已就绪');

    // 5. 插入默认管理员账号
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    try {
        const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', ['admin']);
        if (existing.length === 0) {
            await pool.execute(
                'INSERT INTO admins (username, password, display_name, role) VALUES (?, ?, ?, ?)',
                ['admin', adminHash, '系统管理员', 'admin']
            );
            console.log('[数据库] 默认管理员账号已创建 (admin)');
        } else {
            console.log('[数据库] 管理员账号已存在，跳过创建');
        }
    } catch (err) {
        console.warn('[数据库] 创建管理员账号时出现警告:', err.message);
    }

    // 6. 插入测试账号
    if (process.env.SEED_TEST_DATA === 'true') {
        const testPassword = process.env.TEST_ACCOUNT_PASSWORD || 'test1234';
        const testNamesStr = process.env.TEST_ACCOUNT_NAMES || 'test001,test002';
        const testNames = testNamesStr.split(',').map(n => n.trim()).filter(Boolean);

        if (testNames.length > 0) {
            const testHash = await bcrypt.hash(testPassword, 10);
            let created = 0;

            for (const name of testNames) {
                try {
                    const [existing] = await pool.query('SELECT id FROM students WHERE username = ?', [name]);
                    if (existing.length === 0) {
                        await pool.execute(
                            'INSERT INTO students (username, password, display_name, grade, class_num) VALUES (?, ?, ?, ?, ?)',
                            [name, testHash, name, '七年级', 1]
                        );
                        created++;
                    }
                } catch (err) {
                    if (err.code !== 'ER_DUP_ENTRY') {
                        console.warn(`[数据库] 创建测试账号 ${name} 失败:`, err.message);
                    }
                }
            }

            if (created > 0) {
                console.log(`[数据库] 已创建 ${created} 个测试账号`);
            } else {
                console.log('[数据库] 测试账号已存在，跳过创建');
            }
        }
    }

    console.log('[数据库] 初始化完成');
}

// ===================================================
// 数据库迁移
// ===================================================
async function runMigrations() {
    console.log('[迁移] 正在检查数据库迁移...');

    try {
        // ch2 模块 ID 迁移：将旧版模块 ID 映射到新版
        const ch2Migrations = {
            // 旧版 ch2 子模块 ID -> 新版标准化 ID
            'ch2_knowledge': 'ch2_lesson',
            'ch2_quiz': 'ch2_test',
            'ch2_intro_v2': 'ch2_intro',
            'ch2_lab_v2': 'ch2_lab',
            'ch2_practice_v2': 'ch2_practice',
        };

        let migrated = 0;
        for (const [oldId, newId] of Object.entries(ch2Migrations)) {
            const [result] = await pool.execute(
                'UPDATE IGNORE learning_progress SET module_id = ? WHERE module_id = ?',
                [newId, oldId]
            );
            if (result.affectedRows > 0) {
                console.log(`[迁移] 已将 ${result.affectedRows} 条记录的模块ID从 ${oldId} 更新为 ${newId}`);
                migrated += result.affectedRows;
            }
        }

        if (migrated > 0) {
            console.log(`[迁移] 共迁移 ${migrated} 条学习进度记录`);
        } else {
            console.log('[迁移] 无需迁移，数据库已是最新版本');
        }

        // P5: 性能优化 - 添加缺失索引
        const perfIndexes = [
            { table: 'discussion_replies', name: 'idx_post_id', col: 'post_id' },
            { table: 'discussion_posts', name: 'idx_student_id', col: 'student_id' },
            { table: 'code_snippets', name: 'idx_student_id', col: 'student_id' },
        ];

        for (const idx of perfIndexes) {
            try {
                await pool.execute(
                    `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} (${idx.col})`
                );
                console.log(`[迁移] 索引 ${idx.table}.${idx.name} 已就绪`);
            } catch (err) {
                // MySQL 5.7 不支持 IF NOT EXISTS 语法，忽略重复索引错误
                if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_INDEX') {
                    // 索引已存在，跳过
                } else {
                    try {
                        await pool.execute(
                            `CREATE INDEX ${idx.name} ON ${idx.table} (${idx.col})`
                        );
                        console.log(`[迁移] 索引 ${idx.table}.${idx.name} 已创建`);
                    } catch (err2) {
                        if (err2.code !== 'ER_DUP_KEYNAME' && err2.code !== 'ER_DUP_INDEX') {
                            console.warn(`[迁移] 创建索引 ${idx.table}.${idx.name} 失败:`, err2.message);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[迁移] 迁移过程出现警告:', err.message);
    }
}

// ===================================================
// 自动备份
// ===================================================
async function autoBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const tables = [
        'students', 'learning_progress', 'achievements', 'login_logs',
        'admins', 'admin_logs', 'notices', 'discussion_posts',
        'discussion_replies', 'assignments', 'assignment_submissions',
        'daily_questions', 'chapter_locks', 'notifications',
        'code_snippets', 'mistake_book', 'study_notes', 'student_goals'
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {};

    try {
        for (const table of tables) {
            try {
                const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
                backupData[table] = rows;
            } catch (err) {
                // 表可能不存在，跳过
                backupData[table] = [];
            }
        }

        const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`[备份] 数据库已备份到 ${backupFile}`);

        // 清理旧备份（保留最近 7 天）
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
            .sort()
            .reverse();

        const maxBackups = 7;
        for (let i = maxBackups; i < files.length; i++) {
            fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
            console.log(`[备份] 已删除旧备份: ${files[i]}`);
        }
    } catch (err) {
        console.warn('[备份] 备份失败:', err.message);
    }
}

// ===================================================
// 定时备份（每天凌晨 2 点）
// ===================================================
function scheduleBackup() {
    const now = new Date();
    const next2am = new Date(now);
    next2am.setHours(2, 0, 0, 0);

    // 如果当前时间已过今天凌晨 2 点，则设置为明天凌晨 2 点
    if (now >= next2am) {
        next2am.setDate(next2am.getDate() + 1);
    }

    const msUntil2am = next2am.getTime() - now.getTime();

    console.log(`[备份] 定时备份已设置，将在每天凌晨 2:00 自动执行`);

    // 首次延迟到下一个凌晨 2 点，之后每 24 小时执行一次
    setTimeout(() => {
        autoBackup();
        // 之后每 24 小时执行一次
        setInterval(autoBackup, 24 * 60 * 60 * 1000);
    }, msUntil2am);
}

module.exports = {
    initializeDatabase,
    runMigrations,
    autoBackup,
    scheduleBackup,
};