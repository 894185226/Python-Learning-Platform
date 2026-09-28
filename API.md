# Python 基础学习平台 — API 接口文档

> **Base URL**: `http://localhost:3000/api`（局域网部署时替换为实际 IP）

---

## 一、公开接口（无需认证）

### 1.1 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康检查（含连接池、内存、请求指标） |
| GET | `/api/status` | 数据库状态检查（轻量） |

**GET /api/health 响应示例**：
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-08-10T12:00:00.000Z",
  "memory": { "heapUsed": "45 MB", "heapTotal": "80 MB" },
  "database": { "status": "connected", "ready": true },
  "pool": { "total": 5, "idle": 3, "waiting": 0 },
  "sessions": 12,
  "wsClients": 5,
  "requests": { "currentMinute": 30, "errorRate": 0 }
}
```

### 1.2 错误上报

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/error-report` | 前端错误上报（含去重和误报过滤） |

**请求体**：`{ message, source, line, col, timestamp, userAgent }`

### 1.3 系统公告

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notices` | 获取公告列表（最新10条） |

### 1.4 CSRF Token

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/csrf-token` | 获取 CSRF Token（需携带 x-session-token） |

---

## 二、认证接口

### 2.1 学生注册

| 方法 | 路径 | 限流 |
|------|------|------|
| POST | `/api/register` | 10次/分钟 |

**请求体**：
```json
{
  "username": "zhangsan",
  "password": "abc123",
  "displayName": "张三",
  "grade": "七年级",
  "classNum": 1
}
```

**校验规则**：
- 用户名：至少2位，不超过100字符
- 密码：至少6位，必须包含字母和数字
- 年级：仅限"七年级"或"八年级"
- 班级：1-20

**成功响应**：
```json
{
  "success": true,
  "token": "64位十六进制会话Token",
  "csrfToken": "64位十六进制CSRF Token",
  "user": { "username": "zhangsan", "displayName": "张三", "grade": "七年级", "classNum": 1 }
}
```

### 2.2 学生登录

| 方法 | 路径 | 限流 |
|------|------|------|
| POST | `/api/login` | 10次/分钟 |

**请求体**：`{ username, password }`

**安全机制**：同一用户名15分钟内失败5次锁定

**成功响应**：同注册，返回 token + csrfToken + user

### 2.3 学生登出

| 方法 | 路径 | 认证 |
|------|------|------|
| POST | `/api/logout` | x-session-token |

**请求头**：`x-session-token: <token>`

---

## 三、学生端接口（需认证）

> 所有学生端接口需携带请求头：`x-session-token: <token>`

### 3.1 学习进度

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/progress/:username` | 获取指定用户的学习进度 |
| POST | `/api/progress/mark` | 标记模块完成 |

**POST /api/progress/mark 请求体**：
```json
{ "username": "zhangsan", "moduleId": "ch2_intro", "score": 85 }
```
- `moduleId` 必须在白名单内（见 constants.js 中 VALID_MODULES）
- `score` 范围 0-100

### 3.2 成就系统

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/achievement/award` | 颁发成就 |

**请求体**：`{ username, achievementId }`
- `achievementId` 必须在白名单内（见 constants.js 中 VALID_ACHIEVEMENTS）

### 3.3 错题本

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/mistakes` | 记录错题 |
| GET | `/api/mistakes/:username` | 获取错题列表 |
| DELETE | `/api/mistakes/:id` | 删除单条错题 |

**POST 请求体**：`{ username, chapterId, questionText, correctAnswer, studentAnswer }`

### 3.4 代码收藏

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/snippets` | 收藏代码 |
| GET | `/api/snippets/:username` | 获取收藏列表 |
| DELETE | `/api/snippets/:id` | 删除收藏 |

**POST 请求体**：`{ username, title, code, chapterId }`

### 3.5 学习报告

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/report/:username` | 获取学习报告（章节数、成就数、连续天数、强项/弱项） |

### 3.6 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications/:username` | 获取通知列表（最近50条） |
| PUT | `/api/notifications/:id/read` | 标记单条已读 |
| PUT | `/api/notifications/read-all` | 全部标记已读 |

### 3.7 讨论区

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/discussions?chapterId=ch2` | 获取讨论列表（可选按章节筛选） |
| POST | `/api/discussions` | 发帖 |
| GET | `/api/discussions/:id` | 获取帖子详情（含回复） |
| POST | `/api/discussions/:id/replies` | 回复帖子 |

**POST 发帖**：`{ username, title, content, chapterId }`
**POST 回复**：`{ username, content }`

### 3.8 每日一题

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/daily-question?date=2026-08-10` | 获取指定日期题目（不传则获取最新） |

### 3.9 作业

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/assignments?username=zhangsan` | 获取作业列表（可选查询提交状态） |
| POST | `/api/assignments/:id/submit` | 提交作业 |

**POST 提交**：`{ username, content }`（content 限 10000 字）

### 3.10 章节锁定

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/chapter-locks?grade=七年级&classNum=1` | 获取章节锁定状态 |

---

## 四、管理端接口（需管理员认证）

> 所有管理端接口需携带请求头：`x-admin-token: <token>`

### 4.1 管理员认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| POST | `/api/admin/logout` | 管理员登出 |

**POST /api/admin/login 请求体**：`{ username, password }`

### 4.2 学生管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/students?page=1&pageSize=50` | 分页获取学生列表（含完成模块数、成就数、登录天数） |
| GET | `/api/admin/student/:id` | 获取单个学生详情（含进度、成就、登录日志） |
| DELETE | `/api/admin/student/:id` | 删除学生 |
| POST | `/api/admin/students/import` | 批量导入学生（最多500条） |
| PUT | `/api/admin/students/batch` | 批量操作（转班/毕业/激活/重置密码/删除） |

**POST 批量导入请求体**：
```json
{
  "students": [
    { "username": "stu01", "displayName": "学生01", "password": "abc123", "grade": "七年级", "classNum": 1 }
  ]
}
```

**PUT 批量操作请求体**：
```json
{ "ids": [1, 2, 3], "action": "transfer", "value": { "grade": "八年级", "classNum": 2 } }
```
支持 action：`transfer`（转班）、`graduate`（毕业）、`activate`（激活）、`resetPassword`（重置密码）、`delete`（删除）

### 4.3 数据统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 全局统计数据 |
| GET | `/api/admin/stats/class` | 按班级统计 |
| GET | `/api/admin/stats/class/export` | 班级统计导出 CSV |
| GET | `/api/admin/trends?days=30` | 学习趋势（近N天登录/模块完成） |
| GET | `/api/admin/chapter-completion` | 章节完成率 |
| GET | `/api/admin/quiz-scores` | 测验成绩汇总 |

### 4.4 公告管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/notices` | 获取公告列表 |
| POST | `/api/admin/notices` | 发布公告（自动 WebSocket 推送） |
| PUT | `/api/admin/notices/:id` | 编辑公告 |
| DELETE | `/api/admin/notices/:id` | 删除公告 |

### 4.5 作业管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/assignments` | 获取作业列表 |
| POST | `/api/admin/assignments` | 布置作业 |
| PUT | `/api/admin/assignments/:id` | 编辑作业 |
| DELETE | `/api/admin/assignments/:id` | 删除作业 |
| GET | `/api/admin/assignments/:id/submissions` | 查看提交情况 |

### 4.6 每日一题管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/daily-questions` | 获取题目列表（最近30条） |
| POST | `/api/admin/daily-questions` | 添加题目 |
| DELETE | `/api/admin/daily-questions/:id` | 删除题目 |

### 4.7 讨论区管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/discussions?page=1&pageSize=20` | 分页获取讨论帖 |
| GET | `/api/admin/discussions/:id/replies` | 获取帖子回复 |
| DELETE | `/api/admin/discussions/:id` | 删除帖子 |
| DELETE | `/api/admin/discussions/replies/:id` | 删除回复 |

### 4.8 章节锁定管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/chapter-locks` | 获取锁定状态 |
| PUT | `/api/admin/chapter-locks` | 更新锁定状态 |

**PUT 请求体**：`{ locks: [{ chapter_id: "ch3", locked: true, grade: "七年级", class_num: 1 }] }`

### 4.9 数据备份与恢复

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/backup` | 导出完整数据备份（JSON 下载） |
| POST | `/api/admin/backup/trigger` | 手动触发服务器端自动备份 |
| GET | `/api/admin/backup/list` | 查看备份文件列表 |
| GET | `/api/admin/backup/download/:filename` | 下载指定备份文件 |
| POST | `/api/admin/restore` | 从备份恢复数据 |

### 4.10 系统管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/logs` | 操作日志（最近100条） |
| PUT | `/api/admin/password` | 修改管理员密码 |
| GET | `/api/admin/monitor` | 系统监控数据（请求量、错误率、内存、CPU） |
| GET | `/api/admin/export` | 导出学生数据 CSV |

---

## 五、通用说明

### 认证方式
- **学生端**：Header `x-session-token: <token>`（注册/登录后获取）
- **管理端**：Header `x-admin-token: <token>`（管理员登录后获取）
- **CSRF**：写操作（POST/PUT/DELETE）需携带 `x-csrf-token: <token>`

### 速率限制
- 普通 API：60 次/分钟/IP
- 登录/注册：10 次/分钟/IP
- 登录失败锁定：同用户名 15 分钟内失败 5 次锁定

### 错误响应格式
```json
{ "success": false, "error": "错误描述" }
```
- HTTP 401：未登录或登录过期
- HTTP 403：CSRF 验证失败或无权访问
- HTTP 429：请求过于频繁
- HTTP 404：接口不存在
- HTTP 500：服务器内部错误