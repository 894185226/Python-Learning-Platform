# CLAUDE.md — Python 变量学习平台（Claude Code 用）

本文件供 Claude Code 使用。完整开发约定见 `AGENTS.md`，以下为必须掌握的关键要点。

## 技术栈与启动

- Node.js 24 LTS（CommonJS），Express 5 + MySQL（`mysql2/promise`），前端原生 HTML/CSS/JS。
- `npm install` → 复制 `.env.example` 为 `.env` 填数据库凭据 → `npm start`（监听 `0.0.0.0:3000`）。
- 数据库 `python_var_lesson` 启动时自动建库 + 建表 + 迁移。
- 评分引擎统一在 `shared/scoring.js` 的 `computeScore()`，前后端排行榜必须复用同一引擎。

## 协作工作流程（务必遵守）

1. 完成功能/修复后：语法检查 → 功能验证 → 全量回归测试。
2. 验证通过后**主动询问**是否提交推送，不擅自 commit/push，等用户明确回复「提交推送」再执行。
3. 确认后：`git add` 指定文件 → 中文 commit（前缀 `feat:`/`fix:`/`chore:`）→ 依次 push `github` 与 `gitee`（分支 `master`）。
4. 推送后确认工作树干净并汇报结果。
5. Windows PowerShell 不支持 `&&`/heredoc：链式命令用 `;`，commit 用单行 `-m "..."`。

## 关键硬约束

- W3Schools 绿色主题、首页无侧边栏、对称美观、层次感；子模块导航激活态 `rgba(4,170,109,0.15)`。
- 章节五段式递进解锁：情境导入 → 知识讲解 → 案例分析 → 互动练习 → 课堂小测；前序未完成后续禁用。
- 排行榜六维权重合计 100%、数据源互不重叠（任务20% / 测评25% / 作业20% / 参与15% / 成就10% / 课堂表现10%）。
- 课堂小测仅记录首次得分、重测不覆盖；模块 ID `ch2_test` / `chX_quiz`。
- 服务端 `VALID_MODULES` 白名单必须含每个模块（含 `ch1_extend`、`ch1_project`）。
- 限流勿同时作用于前缀和单条路由；429 返回真实错误消息。

> 其余设计、功能、安全、工程约定详见 `AGENTS.md`。