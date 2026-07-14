-- ===================================================
-- Python 基础学习平台 - 数据库初始化脚本（参考文档）
-- 适用：MySQL 8.0+
-- 注意：server.js 启动时会自动创建数据库和所有表，
--       此文件仅作为参考文档，无需手动执行。
-- ===================================================

-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS python_var_lesson
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE python_var_lesson;

-- ===================================================
-- 2. 学生用户表
-- ===================================================
CREATE TABLE IF NOT EXISTS students (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '学生唯一编号',
    username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '登录用户名',
    password    VARCHAR(60)  NOT NULL COMMENT '密码（bcrypt 哈希）',
    display_name VARCHAR(50) NOT NULL COMMENT '真实姓名/显示名称',
    grade       VARCHAR(20)  DEFAULT '' COMMENT '年级',
    class_num   INT          DEFAULT 0 COMMENT '班级编号',
    status      VARCHAR(20)  DEFAULT 'active' COMMENT '状态: active/graduated',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    INDEX idx_username (username),
    INDEX idx_grade_class (grade, class_num)
) ENGINE=InnoDB COMMENT='学生用户信息表';

-- ===================================================
-- 3. 学习模块进度表
-- ===================================================
CREATE TABLE IF NOT EXISTS learning_progress (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
    student_id  INT          NOT NULL COMMENT '学生编号（外键）',
    module_id   VARCHAR(30)  NOT NULL COMMENT '模块标识',
    completed   TINYINT(1)   DEFAULT 1 COMMENT '是否完成',
    score       INT          DEFAULT 0 COMMENT '得分',
    completed_at DATETIME    DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_module (student_id, module_id)
) ENGINE=InnoDB COMMENT='学生学习进度表';

-- ===================================================
-- 4. 成就记录表
-- ===================================================
CREATE TABLE IF NOT EXISTS achievements (
    id              INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
    student_id      INT          NOT NULL COMMENT '学生编号（外键）',
    achievement_id  VARCHAR(30)  NOT NULL COMMENT '成就标识',
    earned_at       DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_ach (student_id, achievement_id)
) ENGINE=InnoDB COMMENT='学生成就记录表';

-- ===================================================
-- 5. 登录记录表
-- ===================================================
CREATE TABLE IF NOT EXISTS login_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
    student_id  INT      NOT NULL COMMENT '学生编号（外键）',
    login_time  DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
    ip_address  VARCHAR(45) DEFAULT '' COMMENT 'IP 地址',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_date (student_id, login_time)
) ENGINE=InnoDB COMMENT='学生登录日志表';

-- ===================================================
-- 6. 管理员账号表
-- ===================================================
CREATE TABLE IF NOT EXISTS admins (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '管理员编号',
    username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '登录用户名',
    password    VARCHAR(60)  NOT NULL COMMENT '密码（bcrypt 哈希）',
    display_name VARCHAR(50) NOT NULL DEFAULT '管理员' COMMENT '显示名称',
    role        VARCHAR(20)  DEFAULT 'admin' COMMENT '角色',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB COMMENT='管理员账号表';

-- ===================================================
-- 7. 系统公告表
-- ===================================================
CREATE TABLE IF NOT EXISTS notices (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '公告编号',
    title       VARCHAR(200) NOT NULL COMMENT '公告标题',
    content     TEXT         NOT NULL COMMENT '公告内容',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB COMMENT='系统公告表';

-- ===================================================
-- 8. 操作日志表
-- ===================================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    admin_name  VARCHAR(50)  NOT NULL COMMENT '管理员用户名',
    action      VARCHAR(50)  NOT NULL COMMENT '操作类型',
    detail      VARCHAR(500) DEFAULT '' COMMENT '操作详情',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='管理员操作日志表';

-- ===================================================
-- 9. 错题本
-- ===================================================
CREATE TABLE IF NOT EXISTS mistake_book (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    chapter_id VARCHAR(10) NOT NULL COMMENT '章节ID',
    question_text TEXT NOT NULL COMMENT '题目内容',
    correct_answer VARCHAR(500) NOT NULL COMMENT '正确答案',
    student_answer VARCHAR(500) NOT NULL COMMENT '学生答案',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_chapter (student_id, chapter_id)
) ENGINE=InnoDB COMMENT='错题本';

-- ===================================================
-- 10. 学习笔记
-- ===================================================
CREATE TABLE IF NOT EXISTS study_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    chapter_id VARCHAR(10) NOT NULL,
    module_id VARCHAR(30) DEFAULT '',
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_chapter (student_id, chapter_id)
) ENGINE=InnoDB COMMENT='学习笔记';

-- ===================================================
-- 11. 代码收藏
-- ===================================================
CREATE TABLE IF NOT EXISTS code_snippets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    code TEXT NOT NULL,
    chapter_id VARCHAR(10) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='代码收藏';

-- ===================================================
-- 12. 作业表
-- ===================================================
CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    chapter_id VARCHAR(10) DEFAULT '',
    due_date DATE,
    created_by VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_due (due_date)
) ENGINE=InnoDB COMMENT='作业';

-- ===================================================
-- 13. 作业提交
-- ===================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    content TEXT,
    score INT DEFAULT 0,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_assignment_student (assignment_id, student_id)
) ENGINE=InnoDB COMMENT='作业提交';

-- ===================================================
-- 14. 每日一题
-- ===================================================
CREATE TABLE IF NOT EXISTS daily_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    options JSON COMMENT '选项列表JSON',
    answer VARCHAR(10) NOT NULL COMMENT '正确答案',
    explanation TEXT COMMENT '解析',
    question_date DATE NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='每日一题';

-- ===================================================
-- 15. 学习目标
-- ===================================================
CREATE TABLE IF NOT EXISTS student_goals (
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
) ENGINE=InnoDB COMMENT='学习目标';

-- ===================================================
-- 16. 通知
-- ===================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    type VARCHAR(30) DEFAULT 'system' COMMENT 'system/achievement/assignment',
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_read (student_id, is_read)
) ENGINE=InnoDB COMMENT='通知';

-- ===================================================
-- 17. 讨论帖
-- ===================================================
CREATE TABLE IF NOT EXISTS discussion_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    chapter_id VARCHAR(10) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_chapter (chapter_id)
) ENGINE=InnoDB COMMENT='讨论帖';

-- ===================================================
-- 18. 讨论回复
-- ===================================================
CREATE TABLE IF NOT EXISTS discussion_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    student_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES discussion_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='讨论回复';