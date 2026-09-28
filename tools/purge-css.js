/**
 * CSS Tree Shaking 工具 - 使用 PurgeCSS 移除未使用的 CSS
 *
 * 使用方法:
 * 1. 安装依赖: npm install --save-dev purgecss
 * 2. 运行脚本: node tools/purge-css.js
 * 3. 优化后的 CSS 文件将输出到 css/ 目录
 *
 * 注意: 本项目没有构建工具（Webpack/Vite），
 * PurgeCSS 需要手动运行此脚本。
 */

const { PurgeCSS } = require('purgecss');
const path = require('path');
const fs = require('fs');

// 项目根目录
const ROOT = path.resolve(__dirname, '..');

// 需要分析的内容文件（HTML 和 JS）
const contentFiles = [
    'index.html',
    'admin.html',
    'monitor.html',
    'script.js',
    'script-ch2.js',
    'script-extras.js',
    'admin.js',
    'chapters.js',
    'chapters-content.js',
    'chapter-interactions.js',
    'constants.js',
    'js/achievements.js',
    'js/api.js',
    'js/auth.js',
    'js/chapters.js',
    'js/discussions.js',
    'js/lab.js',
    'js/quiz.js',
    'js/router.js',
    'js/search.js',
    'js/ui.js',
    'js/utils.js',
].map(f => path.join(ROOT, f));

// 需要处理的 CSS 文件
const cssFiles = [
    'style.css',
    'style-chapters.css',
].map(f => path.join(ROOT, f));

// 安全列表 - 这些类名即使不在 HTML/JS 中出现也要保留
const safelist = {
    // 标准选择器模式
    standard: [
        // W3.CSS 框架类名
        /^w3-/,
        // Font Awesome 图标类名
        /^fa-/,
        /^fas/,
        /^far/,
        /^fab/,
        // CodeMirror 编辑器类名
        /^CodeMirror/,
        /^cm-/,
        // 主题相关
        /^\[data-theme/,
        // 伪类和伪元素
        /^::/,
        /^:/,
    ],
    // 深度选择器 - 用于匹配包含特定前缀的复合选择器
    deep: [
        /^chapter-/,
        /^module-/,
        /^achievement-/,
        /^quiz-/,
        /^ch-/,
        /^ws-/,
        /^test-/,
        /^debug-/,
        /^practice-/,
        /^lab-/,
        /^knowledge-/,
        /^extend-/,
        /^project-/,
        /^intro-/,
        /^error-/,
        /^success-/,
        /^warn-/,
        /^info-/,
        /^tip-/,
        /^feedback-/,
        /^progress-/,
        /^score-/,
        /^option-/,
        /^question-/,
        /^result-/,
        /^review-/,
        /^step-/,
        /^map-/,
        /^stats-/,
        /^signin-/,
        /^login-/,
        /^register-/,
        /^form-/,
        /^toast-/,
        /^confirm-/,
        /^loader-/,
        /^sidebar-/,
        /^search-/,
        /^hero-/,
        /^card-/,
        /^code-/,
        /^nav-/,
        /^logo-/,
        /^footer-/,
        /^menu-/,
        /^dropdown-/,
        /^theme-/,
        /^digital-/,
        /^scan-/,
        /^data-/,
        /^border-/,
        /^gradient-/,
        /^glow-/,
        /^float-/,
        /^pulse-/,
        /^shake-/,
        /^bounce-/,
        /^reveal-/,
        /^skeleton-/,
        /^scroll-/,
        /^snippet-/,
        /^mistake-/,
        /^notification-/,
        /^radar-/,
        /^monokai-/,
        /^typing-/,
        /^btn-/,
        /^cta-/,
        /^kbd-/,
        /^shortcuts-/,
        /^spinner-/,
        /^modal-/,
        /^tag-/,
        /^badge-/,
        /^counter-/,
        /^table-/,
        /^grid-/,
        /^row-/,
        /^col-/,
        /^split-/,
        /^box-/,
        /^wrap-/,
        /^inner-/,
        /^container-/,
        /^content-/,
        /^header-/,
        /^body-/,
        /^title-/,
        /^desc-/,
        /^icon-/,
        /^label-/,
        /^input-/,
        /^output-/,
        /^text-/,
        /^link-/,
        /^btn-/,
        /^primary-/,
        /^secondary-/,
        /^dark-/,
        /^light-/,
        /^green-/,
        /^yellow-/,
        /^pink-/,
        /^cyan-/,
        /^red-/,
        /^blue-/,
        /^purple-/,
        /^orange-/,
    ],
    // 贪婪模式 - 匹配包含这些字符串的任意选择器
    greedy: [
        /chapter/,
        /module/,
        /achievement/,
        /quiz/,
        /test/,
        /debug/,
        /practice/,
        /knowledge/,
        /extend/,
        /project/,
        /intro/,
        /CodeMirror/,
        /font-awesome/,
        /w3-/,
    ],
};

async function runPurgeCSS() {
    console.log('🔍 开始 CSS Tree Shaking...\n');
    console.log(`   内容文件: ${contentFiles.length} 个`);
    console.log(`   CSS 文件: ${cssFiles.length} 个`);
    console.log(`   安全模式: ${safelist.standard.length + safelist.deep.length + safelist.greedy.length} 条规则\n`);

    const startTime = Date.now();

    try {
        const results = await new PurgeCSS().purge({
            content: contentFiles,
            css: cssFiles,
            safelist: safelist,
            // 输出到 css/ 目录
            output: path.join(ROOT, 'css'),
            // 保留原文件名
            rejected: true,  // 同时输出被移除的 CSS（用于调试）
            // 关键帧动画保留
            keyframes: true,
            // 字体保留
            fontFace: true,
            // 变量保留
            variables: true,
        });

        const totalSaved = [];

        results.forEach(result => {
            const fileName = path.basename(result.file);
            const outputPath = path.join(ROOT, 'css', `purged-${fileName}`);

            // 写入优化后的 CSS
            fs.writeFileSync(outputPath, result.css, 'utf-8');

            const originalSize = fs.statSync(result.file).size;
            const purgedSize = Buffer.byteLength(result.css, 'utf-8');
            const saved = originalSize - purgedSize;
            const percent = ((saved / originalSize) * 100).toFixed(1);

            totalSaved.push({ file: fileName, original: originalSize, purged: purgedSize, saved: saved, percent: percent });

            console.log(`   ✅ ${fileName}:`);
            console.log(`      原始: ${(originalSize / 1024).toFixed(1)} KB`);
            console.log(`      优化: ${(purgedSize / 1024).toFixed(1)} KB`);
            console.log(`      节省: ${(saved / 1024).toFixed(1)} KB (${percent}%)`);
            console.log(`      输出: css/purged-${fileName}`);

            // 输出被移除的 CSS 选择器（用于调试）
            if (result.rejected && result.rejected.length > 0) {
                const rejectedPath = path.join(ROOT, 'css', `rejected-${fileName.replace('.css', '.json')}`);
                fs.writeFileSync(rejectedPath, JSON.stringify(result.rejected.slice(0, 100), null, 2), 'utf-8');
                console.log(`      移除: ${result.rejected.length} 个选择器 (详情见 css/rejected-*.json)`);
            }

            console.log('');
        });

        // 汇总
        const totalOriginal = totalSaved.reduce((sum, r) => sum + r.original, 0);
        const totalPurged = totalSaved.reduce((sum, r) => sum + r.purged, 0);
        const totalSavedBytes = totalSaved.reduce((sum, r) => sum + r.saved, 0);
        const totalPercent = ((totalSavedBytes / totalOriginal) * 100).toFixed(1);

        console.log('📊 汇总:');
        console.log(`   原始总大小: ${(totalOriginal / 1024).toFixed(1)} KB`);
        console.log(`   优化总大小: ${(totalPurged / 1024).toFixed(1)} KB`);
        console.log(`   总节省: ${(totalSavedBytes / 1024).toFixed(1)} KB (${totalPercent}%)`);
        console.log(`   耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    } catch (error) {
        console.error('❌ PurgeCSS 运行失败:', error.message);
        console.error('   请确保已安装: npm install --save-dev purgecss');
        process.exit(1);
    }
}

// 运行
runPurgeCSS();