# Python 基础学习平台 — 积分/经验值系统设计方案

## 一、概述

在现有成就系统基础上，增加积分/经验值系统，激励学生持续学习。

## 二、积分规则设计

### 2.1 积分获取途径

| 行为 | 积分 | 每日上限 | 说明 |
|------|------|----------|------|
| 完成模块学习 | +10 | 80 | 每完成一个子模块（情境导入/知识讲解/实验室等） |
| 完成章节 | +30 | 无 | 完成整章所有模块 |
| 测验满分 | +20 | 80 | 测验得分 100 分 |
| 测验通过 | +10 | 80 | 测验得分 >= 60 分 |
| 提交作业 | +15 | 30 | 按时提交作业 |
| 连续登录 | +5×N | 35 | N 为连续天数（1-7），第 8 天起固定 5 分 |
| 发帖讨论 | +5 | 25 | 在讨论区发布新帖 |
| 回复讨论 | +3 | 15 | 回复他人帖子 |
| 收藏代码 | +2 | 10 | 收藏代码片段 |
| 记录错题 | +2 | 10 | 记录错题到错题本 |

### 2.2 等级划分

| 等级 | 称号 | 所需积分 | 徽章颜色 |
|------|------|----------|----------|
| Lv.1 | 编程新手 | 0 | 灰色 |
| Lv.2 | 代码学徒 | 100 | 铜色 |
| Lv.3 | 编程爱好者 | 300 | 铜色 |
| Lv.4 | 代码探索者 | 600 | 银色 |
| Lv.5 | 编程达人 | 1000 | 银色 |
| Lv.6 | 算法挑战者 | 1600 | 金色 |
| Lv.7 | 代码工匠 | 2400 | 金色 |
| Lv.8 | 编程高手 | 3500 | 金色 |
| Lv.9 | 技术专家 | 5000 | 钻石 |
| Lv.10 | Python 大师 | 8000 | 钻石 |

## 三、数据库设计

```sql
-- 积分记录表
CREATE TABLE IF NOT EXISTS points_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    action VARCHAR(50) NOT NULL COMMENT '行为类型',
    points INT NOT NULL COMMENT '积分变动（正数为获得，负数为扣除）',
    description VARCHAR(200) COMMENT '描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_time (student_id, created_at),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 在 students 表增加积分字段
ALTER TABLE students ADD COLUMN total_points INT DEFAULT 0;
ALTER TABLE students ADD COLUMN continuous_days INT DEFAULT 0 COMMENT '连续登录天数';
```

## 四、API 设计

### 4.1 获取积分信息
```
GET /api/points
响应: { success: true, totalPoints: 520, level: 3, levelName: "编程爱好者",
        nextLevel: 600, progress: 73.3, todayPoints: 25, todayMax: 80 }
```

### 4.2 积分排行榜
```
GET /api/points/leaderboard?grade=七年级&classNum=1
响应: { success: true, leaderboard: [{ rank, username, displayName, points, level }] }
```

### 4.3 积分记录
```
GET /api/points/log?page=1&pageSize=20
响应: { success: true, logs: [{ action, points, description, createdAt }], total: 50 }
```

### 4.4 授予积分（内部调用）
```
POST /api/points/award
请求体: { username, action, points, description }
响应: { success: true, totalPoints: 530, levelUp: false }
```

## 五、实施优先级

| 阶段 | 内容 | 工作量 |
|------|------|--------|
| P1 | 数据库表 + students 字段 | 0.5天 |
| P1 | 积分 API（获取/记录/排行榜） | 1天 |
| P2 | 前端积分展示（导航栏 + 个人主页） | 1天 |
| P2 | 积分获取逻辑（学习完成/测验/讨论等钩子） | 1.5天 |
| P3 | 等级徽章 + 特效 | 0.5天 |
| P3 | 积分兑换机制 | 1天 |