# chapters-content.js 按章节拆分方案

## 概述
- **文件路径**: `chapters-content.js`
- **当前大小**: ~207KB (原777行, 含注释后约977行)
- **模块总数**: 144个 render 函数
- **章节数**: 19章 (ch1-ch19, 无 ch2)
- **加载方式**: 文件通过 IIFE 包裹，在 `window.CHAPTERS` 存在时自动注册 render 函数

## 当前章节分布

| 章节 | 内容 | 模块数 | 说明 |
|------|------|--------|------|
| ch1 | 认识Python | 8 | 完整实现 (intro/knowledge/lab/practice/debug/quiz/extend/project) |
| ch3 | 条件判断 | 8 | 完整实现 |
| ch4 | if进阶 | 8 | 完整实现 |
| ch5 | while循环 | 8 | stub (单行返回) |
| ch6 | while拓展 | 8 | stub |
| ch7 | 循环嵌套 | 8 | stub |
| ch8 | 综合应用 | 8 | stub |
| ch9 | 排列小星星 | 8 | stub (quiz=3题) |
| ch10 | 排列小星星 | 8 | stub |
| ch11 | 初识列表 | 8 | stub |
| ch12 | 列表的使用 | 8 | stub |
| ch13 | 元组与集合 | 8 | stub |
| ch14 | 神奇的字典 | 8 | stub |
| ch15 | 再遇字符串 | 8 | stub |
| ch16 | 公共语法 | 8 | stub |
| ch17 | 二进制 | 8 | stub |
| ch18 | 编程思维 | 8 | stub |
| ch19 | 各种各样的数 | 8 | stub |

> 注：ch2 (变量) 的 render 函数可能在 `script-ch2.js` 中单独实现。

## 拆分方案

### 方案A：按章节拆分（推荐）

创建 `chapters-content/` 目录，每个章节一个文件：

```
chapters-content/
  ch1.js    - 第1章: 认识Python (8 modules)
  ch3.js    - 第3章: 条件判断 (8 modules)
  ch4.js    - 第4章: if进阶 (8 modules)
  ch5.js    - 第5章: while循环 (8 modules)
  ...
  ch19.js   - 第19章: 各种各样的数 (8 modules)
  loader.js  - 章节加载器
```

每个文件使用相同的 IIFE + findModule 模式，但只包含该章节的 render 函数。

**加载器 (loader.js)**:
```javascript
(function() {
  if (typeof CHAPTERS === 'undefined') return;

  var loadedChapters = {};

  function findModule(chapterId, moduleId) {
    // ... 同上
  }

  window.loadChapterContent = function(chapterId) {
    if (loadedChapters[chapterId]) return Promise.resolve();
    return new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = 'chapters-content/' + chapterId + '.js';
      script.onload = function() {
        loadedChapters[chapterId] = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };
})();
```

**优点**:
- 按需加载，减少初始加载体积
- 只加载当前访问的章节内容
- 初始加载从 ~207KB 降至 ~0KB（只加载 loader）

**缺点**:
- 需要修改 `chapters.js` 中的模块渲染逻辑
- 在章节切换时需要等待异步加载
- 需要确保 loadChapterContent 在 render 前调用

### 方案B：按chunk分组（体积均衡）

将 19 个章节分成 4-5 个 chunk：

```
chapters-content/
  chunk-1.js   - ch1, ch3, ch4 (24 modules)
  chunk-2.js   - ch5, ch6, ch7, ch8 (32 modules)
  chunk-3.js   - ch9, ch10, ch11, ch12 (32 modules)
  chunk-4.js   - ch13, ch14, ch15, ch16 (32 modules)
  chunk-5.js   - ch17, ch18, ch19 (24 modules)
```

### 方案C：仅精简 stub 章节

将 ch5-ch19 的 stub 函数合并为更紧凑的格式，ch1/ch3/ch4 保持不变。

## 实施步骤

1. 创建 `chapters-content/` 目录
2. 编写 `loader.js` 加载器
3. 将各章节 render 函数拆分到独立文件
4. 修改 `chapters.js` 在渲染模块前调用 `loadChapterContent(chapterId)`
5. 更新 `index.html` 引用 `loader.js` 替代 `chapters-content.js`
6. 测试所有章节的模块渲染

## 行号参考（已添加边界注释）

各章节边界已在 `chapters-content.js` 中通过 `// ==== CHAPTER chX BEGIN ====` 和 `// ==== CHAPTER chX END ====` 注释标记。