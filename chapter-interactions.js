// Python 基础学习平台 - 章节交互函数
function checkQuiz(chapterNum, correctAnswers) {
    const resultEl = document.getElementById('ch' + chapterNum + '-quiz-result');
    let correctCount = 0;
    const totalQuestions = Object.keys(correctAnswers).length;
    for (let i = 1; i <= totalQuestions; i++) {
        const radios = document.getElementsByName('ch' + chapterNum + 'q' + i);
        let selected = null;
        for (const radio of radios) { if (radio.checked) { selected = radio.value; break; } }
        if (selected === String(correctAnswers[i])) correctCount++;
    }
    if (resultEl) {
        const percentage = Math.round((correctCount / totalQuestions) * 100);
        let emoji = '🌟', color = '#04AA6D';
        if (percentage < 60) { emoji = '📚'; color = '#ff9800'; }
        if (percentage < 40) { emoji = '💪'; color = '#ff4d4f'; }
        resultEl.innerHTML = emoji + ' 得分：' + correctCount + '/' + totalQuestions + '（' + percentage + '分）';
        resultEl.style.color = color;
    }
}
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function initDragDrop(items, zones, scoreId) {
    var correctCount = 0, totalItems = items.length;
    items.forEach(function(item) {
        item.addEventListener('dragstart', function(e) { e.dataTransfer.setData('text/plain', item.getAttribute('data-type')); item.style.opacity = '0.5'; });
        item.addEventListener('dragend', function() { item.style.opacity = '1'; });
    });
    zones.forEach(function(zone) {
        zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.background = 'rgba(255,255,255,0.1)'; });
        zone.addEventListener('dragleave', function() { zone.style.background = ''; });
        zone.addEventListener('drop', function(e) {
            e.preventDefault(); zone.style.background = '';
            var dataType = e.dataTransfer.getData('text/plain');
            var acceptType = zone.getAttribute('data-accept');
            if (dataType === acceptType) { correctCount++; zone.style.borderColor = '#04AA6D'; }
            else { zone.style.borderColor = '#ff4d4f'; }
            var scoreEl = document.getElementById(scoreId);
            if (scoreEl) { scoreEl.textContent = '正确: ' + correctCount + '/' + totalItems; scoreEl.style.color = correctCount >= totalItems ? '#04AA6D' : '#ff9800'; }
        });
    });
}
function initBlockAssembly(blocks, assembly) {
    blocks.forEach(function(block) {
        block.addEventListener('dragstart', function(e) { e.dataTransfer.setData('text/plain', block.getAttribute('data-block')); block.style.opacity = '0.5'; });
        block.addEventListener('dragend', function() { block.style.opacity = '1'; });
    });
    assembly.addEventListener('dragover', function(e) { e.preventDefault(); assembly.style.borderColor = '#04AA6D'; });
    assembly.addEventListener('dragleave', function() { assembly.style.borderColor = ''; });
    assembly.addEventListener('drop', function(e) {
        e.preventDefault(); assembly.style.borderColor = '';
        var blockType = e.dataTransfer.getData('text/plain');
        var draggedEl = document.querySelector('[data-block="' + blockType + '"]');
        if (draggedEl) { var clone = draggedEl.cloneNode(true); clone.draggable = false; clone.style.opacity = '1'; assembly.appendChild(clone); }
    });
}