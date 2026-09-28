// ===== PythonVariableLesson - script.js (入口文件) =====
// 所有模块已按依赖顺序在 HTML 中加载：
//   utils.js → ui.js → api.js → auth.js → router.js → chapters.js
//   → lab.js → quiz.js → achievements.js → discussions.js → search.js

// 本文件作为入口，仅负责：
// 1. 确保 modules 目录加载完成后打印启动信息
// 2. 协调跨模块初始化（如需要）

console.log('%c[script.js] 入口文件已加载 %c' + new Date().toISOString(), 'color:#04AA6D;font-weight:bold', 'color:#888');
console.log('%c[script.js] 所有模块加载完成，等待 DOMContentLoaded 触发初始化...', 'color:#04AA6D');