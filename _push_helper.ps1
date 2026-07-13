$files = @(
    @{path="lib/python.min.js"; file="lib\python.min.js"},
    @{path="lib/comment.min.js"; file="lib\comment.min.js"},
    @{path="lib/closebrackets.min.js"; file="lib\closebrackets.min.js"},
    @{path="lib/monokai.min.css"; file="lib\monokai.min.css"},
    @{path="lib/codemirror.min.css"; file="lib\codemirror.min.css"},
    @{path="lib/all.min.css"; file="lib\all.min.css"},
    @{path="start_server.ps1"; file="start_server.ps1"},
    @{path="setup_server.ps1"; file="setup_server.ps1"},
    @{path="index.html"; file="index.html"},
    @{path="admin.html"; file="admin.html"},
    @{path="admin.js"; file="admin.js"},
    @{path="server.js"; file="server.js"},
    @{path="chapters.js"; file="chapters.js"},
    @{path="script.js"; file="script.js"},
    @{path="style.css"; file="style.css"},
    @{path="lib/codemirror.min.js"; file="lib\codemirror.min.js"}
)

$baseDir = "c:\Users\89418\Desktop\PythonVariableLesson"

foreach ($f in $files) {
    $fullPath = Join-Path $baseDir $f.file
    if (Test-Path $fullPath) {
        $content = Get-Content -Path $fullPath -Raw
        $size = $content.Length
        Write-Output "OK: $($f.path) - $size chars"
    } else {
        Write-Output "MISSING: $($f.path)"
    }
}