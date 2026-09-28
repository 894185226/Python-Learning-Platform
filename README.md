# Python 基础学习平台（含管理后台）

面向中学生的 Python 编程互动学习平台，采用 B/S 架构，内置 19 个学习章节，配套课堂测验、讨论区、成就系统和学习进度追踪。首页采用 W3Schools 风格彩色分栏布局，支持亮色/暗色主题切换，内置打字机动画、滚动渐入等微交互效果。**管理平台**提供完整的教学管理功能。

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | HTML5 + CSS3 + JavaScript（W3.CSS 风格）+ CodeMirror |
| 后端 | Node.js + Express 5 |
| 数据库 | MySQL 5.7 / 8.0 / 8.4 / 9.x |
| 实时通信 | WebSocket |

## 功能模块

- **19 章系统学习**：从认识 Python 到数据类型、条件判断、循环、列表、字典，覆盖初中信息科技核心知识点
- **课堂小测**：每章配套测验，支持前后翻题、进度显示、成绩雷达图
- **讨论区**：学生可发布/回复帖子，按章节筛选
- **排行榜**：按年级/班级筛选，展示完成章节和成就数
- **错题本**：自动记录错题，支持按章节筛选和删除
- **代码收藏夹**：收藏喜欢的代码片段
- **学习报告**：学习日历、连续天数、强项/弱项分析
- **学习目标**：设定目标章节数和完成日期

## 特色功能

- ⚡ **一键启动** — 双击 `start_server.bat`，自动安装 Node.js、MySQL，完成全部配置
- 🔧 **MySQL 全自动配置** — 自动初始化数据目录、创建 Windows 服务、重置 root 密码
- 🛡️ **自动管理员提权** — 脚本自动请求管理员权限，无需手动右键
- 🎨 **W3Schools 风格布局** — 彩色分栏模块导航，入门基础/控制流程/数据结构/进阶拓展四大分组
- 🌓 **亮色/暗色主题** — 一键切换，双主题全面适配，平滑过渡动画
- ✨ **微交互体验** — 滚动渐入动画、卡片悬浮效果、打字机代码演示
- 🏆 **Steam 风格成就弹出** — 完成学习任务获得 24 项成就徽章（19 个章节 + 4 个里程碑 + 1 个终极成就）
- 🔍 **智能搜索** — 模糊关键词匹配 + 实时建议下拉
- 🛡️ **安全防护** — 密码 bcrypt 加密、CSRF 防护、CSP 内容安全策略、CORS 白名单、速率限制
- 📱 **响应式设计** — 适配桌面端、平板端和移动端
- 🎓 **管理后台** — 学生管理、批量操作、数据统计、班级分析、公告发布、CSV 导出、数据备份、章节锁定、注册管理
- 👤 **学生注册** — 支持年级（七/八年级）、班级选择
- 💬 **实时通知** — WebSocket 推送成就解锁、系统通知

## 快速开始

### 一键启动（推荐）

```bash
双击项目中的 start_server.bat
```

脚本分 5 个阶段自动完成全部配置：

| 阶段 | 说明 |
|------|------|
| Phase 1 | 检测 / 安装 Node.js（含镜像回退） |
| Phase 2 | 安装 npm 依赖（失败时自动切换国内镜像） |
| Phase 3 | 检测 / 安装 MySQL（支持 5.7 ~ 9.7 全版本） |
| Phase 4 | 配置 MySQL — 初始化数据目录、创建服务、启动并重置密码 |
| Phase 5 | 启动网站服务器，自动创建数据库和表 |

> 首次启动时弹出 UAC 窗口，点击"是"即可。全新电脑首次启动可能需要几分钟。支持复制到任何电脑直接使用，无需任何手动配置。

启动后浏览器访问 **http://localhost:3000**。

管理后台地址：**http://localhost:3000/admin.html**（默认账号 admin / admin123）

### 手动启动

1. 安装 Node.js 16+ 和 MySQL 5.7+
2. `npm install`
3. `node server.js`
4. 浏览器访问 `http://localhost:3000`

## 项目结构

```
├── index.html              # 网站主页（含第2章变量模块 HTML）
├── admin.html              # 管理后台页面
├── server.js               # Express 主入口（精简后约150行）
├── package.json            # Node.js 配置
├── package-lock.json       # 依赖锁定文件
├── start_server.bat        # 一键启动脚本（Windows CMD）
├── start_server.ps1        # 一键启动脚本（PowerShell）
├── setup_server.bat        # 环境配置脚本（CMD）
├── setup_server.ps1        # 环境配置脚本（PowerShell）
├── database.sql            # 数据库初始化 SQL
├── 使用手册.md              # 详细操作手册
├── README.en.md            # English README
│
├── style.css               # 全局样式（W3Schools风格 + 工具类 + 章节卡片）
├── style-chapters.css      # 章节内容样式（科技感增强、动画、侧边栏）
├── admin.css               # 管理后台样式
│
├── script.js               # 前端核心逻辑（导航、主题、章节切换、API调用）
├── script-ch2.js           # 第2章变量模块交互（拖拽、命名判断、值追踪、调试等）
├── script-extras.js        # 额外功能（打字机动画、粒子背景等）
├── chapter-interactions.js # 章节交互（滚动渐入、代码高亮等）
├── chapters.js             # 章节元数据定义（19章结构、模块列表）
├── chapters-content.js     # 章节内容渲染（知识点、实践题、测验题）
├── admin.js                # 管理后台前端逻辑
├── constants.js            # 共享常量（章节名称、模块列表、成就列表）
│
├── shared/                 # 后端共享模块
│   ├── index.js            # 核心导出（数据库连接、工具函数、会话管理）
│   └── db.js               # 数据库初始化和自动备份
├── middleware/             # 中间件
│   └── index.js            # 认证（sessionAuth, adminAuth）、验证、CORS、安全头
├── routes/                 # 路由模块
│   ├── auth.js             # 用户认证（登录/注册/登出）
│   ├── student.js          # 学生端 API（进度/成就/错题/收藏/报告）
│   ├── admin.js            # 管理端 API（学生管理/统计/公告/备份）
│   └── public.js           # 公开 API（状态/健康检查/公告）
├── ws/                     # WebSocket 模块
│   └── index.js            # 实时通知推送
├── lib/                    # 前端库（CodeMirror、Font Awesome 本地文件）
├── webfonts/               # Font Awesome 字体文件
├── images/                 # 插图资源
└── backups/                # 数据库备份目录
```

## 数据库表结构

| 表名 | 用途 |
|------|------|
| `students` | 学生用户信息（含年级、班级、状态） |
| `admins` | 管理员账号 |
| `learning_progress` | 模块学习进度与得分 |
| `achievements` | 成就获得记录 |
| `login_logs` | 登录日志 |
| `notices` | 系统公告 |
| `mistake_book` | 错题记录 |
| `code_snippets` | 代码收藏 |
| `discussion_posts` | 讨论帖 |
| `discussion_replies` | 讨论回复 |
| `learning_goals` | 学习目标 |

## 仓库

- Gitee: https://gitee.com/fiveubisoft/Python-Learning-Platform
- GitHub: https://github.com/894185226/Python-Learning-Platform
