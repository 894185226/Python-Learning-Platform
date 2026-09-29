# ===================================================
# Python 基础学习平台 - 一键更新脚本
# 从 Gitee/GitHub 拉取最新代码并覆盖本地文件，然后重启网站
# 用法：双击 update.bat
# ===================================================
Set-Location $PSScriptRoot

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  Python 基础学习平台 - 一键更新" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# ----- 1. 检查 Git -----
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[1/3] 未检测到 Git，正在尝试自动安装..." -ForegroundColor Cyan
    $installed = $false
    try {
        winget install Git.Git --accept-package-agreements --accept-source-agreements --silent 2>&1 | Out-Null
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        if (Get-Command git -ErrorAction SilentlyContinue) { $installed = $true }
    } catch { }
    if (-not $installed) {
        Write-Host "[ERROR] 无法自动安装 Git，请手动下载安装后重试：" -ForegroundColor Red
        Write-Host "  https://git-scm.com/download/win" -ForegroundColor White
        Read-Host "按回车退出"
        exit 1
    }
    Write-Host "[OK] Git 安装完成" -ForegroundColor Green
}

# ----- 2. 判断是否 git 仓库 -----
if (-not (Test-Path ".git")) {
    Write-Host "[ERROR] 当前目录不是 git 仓库，无法自动更新。" -ForegroundColor Red
    Write-Host ""
    Write-Host "请用以下任一方式做一次初始化：" -ForegroundColor Yellow
    Write-Host "  1. 把你电脑（开发机）上带 .git 的整个项目文件夹复制过来替换；或" -ForegroundColor White
    Write-Host "  2. 在本目录执行： git clone 你的仓库地址 ." -ForegroundColor White
    Write-Host ""
    Write-Host "完成后再双击 update.bat 即可一键更新。" -ForegroundColor Gray
    Read-Host "按回车退出"
    exit 1
}

# ----- 3. 确定更新源（优先 gitee，其次 github，最后 origin） -----
$remotes = @(git remote 2>&1)
$target = $null
foreach ($r in @("gitee","github","origin")) {
    if ($remotes -contains $r) { $target = $r; break }
}
if (-not $target) {
    Write-Host "[ERROR] 未找到可用的远程仓库（remote）" -ForegroundColor Red
    Read-Host "按回车退出"
    exit 1
}

# ----- 4. 拉取并强制覆盖本地文件 -----
Write-Host "[1/3] 正在从 $target 获取最新代码..." -ForegroundColor Cyan
git fetch $target 2>&1 | Out-Null
git reset --hard "$target/master" 2>&1 | Out-Null

Write-Host "[OK] 本地文件已更新到最新版" -ForegroundColor Green
Write-Host ""

# ----- 5. 重启网站 -----
Write-Host "[2/3] 正在关闭旧服务器..." -ForegroundColor Cyan
$portInUse = & netstat -ano 2>$null | Select-String ":3000 .*LISTENING"
if ($portInUse) {
    $portInUse | ForEach-Object {
        $procId = ($_ -split '\s+')[-1]
        & taskkill /f /pid $procId 2>$null | Out-Null
    }
    Start-Sleep -Seconds 2
}

Write-Host "[3/3] 正在启动网站（保持本窗口打开即是运行中）..." -ForegroundColor Cyan
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  更新完成，网站已启动！" -ForegroundColor Green
Write-Host "  本机访问:   http://localhost:3000" -ForegroundColor White
Write-Host "  管理后台:   http://localhost:3000/admin.html" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动服务器（前台运行）
node server.js

Write-Host ""
Read-Host "服务器已停止，按回车退出"