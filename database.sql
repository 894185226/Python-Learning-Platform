-- ===================================================
-- Python 基础学习平台 - 数据库初始化脚本
-- 适用：MySQL 8.0+
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
    password    VARCHAR(60)  NOT NULL COMMENT '密码（bcrypt 哈希，兼容旧 SHA256）',
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
    module_id   VARCHAR(30)  NOT NULL COMMENT '模块标识（如 intro, lesson, lab）',
    completed   TINYINT(1)   DEFAULT 1 COMMENT '是否完成（1=完成）',
    score       INT          DEFAULT 0 COMMENT '得分（如小测分数，0表示无得分模块）',
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
    achievement_id  VARCHAR(30)  NOT NULL COMMENT '成就标识（如 beginner, judge）',
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
-- 9. 插入测试数据（可选）
-- ===================================================
INSERT IGNORE INTO students (username, password, display_name, grade, class_num, status) VALUES
  ('test001', SHA2('1234', 256), '张三', '七年级', 3, 'active'),
  ('test002', SHA2('1234', 256), '李四', '七年级', 3, 'active');

-- ===================================================
-- 10. 插入默认管理员账号
-- ===================================================
INSERT IGNORE INTO admins (username, password, display_name) VALUES
  ('admin', SHA2('admin123', 256), '教师管理员');