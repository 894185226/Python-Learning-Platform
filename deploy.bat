@echo off
REM ===================================================
REM Python 基础学习平台 - 快速部署脚本 (Windows)
REM 支持一键部署、回滚、诊断和版本管理
REM ===================================================

setlocal

echo ===========================================
echo   Python 基础学习平台 - 部署工具
echo ===========================================
echo.

if "%1"=="" goto :usage

if "%1"=="docker" goto :docker_deploy
if "%1"=="build" goto :docker_build
if "%1"=="stop" goto :docker_stop
if "%1"=="logs" goto :docker_logs
if "%1"=="clean" goto :docker_clean
if "%1"=="local" goto :local_deploy
if "%1"=="test" goto :run_tests
if "%1"=="status" goto :status
if "%1"=="rollback" goto :rollback
if "%1"=="diag" goto :diag
goto :usage

:docker_build
echo [1/2] 构建 Docker 镜像...
docker build -t python-var-lesson:latest .
if %ERRORLEVEL% neq 0 (
    echo [错误] 镜像构建失败！
    echo.
    echo --- 构建失败诊断 ---
    echo 磁盘空间:
    dir %SystemDrive%\ 2>nul | find "可用字节"
    echo.
    echo Docker 磁盘使用:
    docker system df 2>nul
    exit /b 1
)
echo [2/2] 构建完成！
echo   镜像: python-var-lesson:latest
goto :eof

:docker_deploy
echo [1/4] 检查环境...
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    exit /b 1
)
echo [2/4] 备份当前版本...
REM 如果存在当前版本，先备份
docker image inspect python-var-lesson:current >nul 2>&1
if %ERRORLEVEL% equ 0 (
    docker tag python-var-lesson:current python-var-lesson:previous 2>nul
    echo   已备份当前版本为 previous
)
echo [3/4] 启动服务...
docker-compose up -d --build
if %ERRORLEVEL% neq 0 (
    echo.
    echo ============================================
    echo   启动失败！正在收集诊断信息...
    echo ============================================
    echo.
    echo [诊断] 容器状态（含已停止的）:
    docker ps -a --filter "name=pyvar_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul
    echo.
    echo [诊断] App 容器日志（最后 30 行）:
    docker logs pyvar_app --tail=30 2>nul
    echo.
    echo [诊断] MySQL 容器日志（最后 20 行）:
    docker logs pyvar_mysql --tail=20 2>nul
    echo.
    echo [诊断] 最近 5 分钟 Docker 事件:
    docker events --since "5m" --until "0s" --format "{{.Time}} {{.Action}} {{.Actor.Attributes.name}}" 2>nul
    echo.
    echo [操作] 回滚到上一个版本:
    echo   %0 rollback
    echo.
    exit /b 1
)
echo [4/4] 等待服务就绪...
REM 等待健康检查通过（最多 30 秒）
set /a COUNT=0
:wait_health
timeout /t 2 /nobreak >nul
set /a COUNT+=2
docker inspect pyvar_app --format="{{.State.Health.Status}}" 2>nul | find "healthy" >nul
if %ERRORLEVEL% equ 0 goto :deploy_ok
if %COUNT% lss 30 goto :wait_health
echo [警告] 健康检查超时，但容器已启动
echo   查看日志: %0 logs
goto :deploy_done

:deploy_ok
echo.
echo ============================================
echo   部署成功！
echo ============================================
echo   网站: http://localhost:3000
echo   管理: http://localhost:3000/admin.html
echo   监控: http://localhost:3000/monitor.html
echo.
echo   查看日志: %0 logs
echo   回滚命令: %0 rollback
echo.

REM 显示版本信息
echo --- 版本历史 ---
docker images --filter "reference=python-var-lesson" --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" 2>nul
goto :eof

:deploy_done
echo.
echo 服务已启动：
echo   网站: http://localhost:3000
echo   管理: http://localhost:3000/admin.html
echo   监控: http://localhost:3000/monitor.html
echo.
echo 查看日志: %0 logs
goto :eof

:docker_stop
echo 停止所有服务...
docker-compose down
echo 服务已停止
goto :eof

:docker_logs
echo 查看日志（Ctrl+C 退出）...
docker-compose logs -f --tail=50
goto :eof

:docker_clean
echo 清理所有容器、镜像和数据卷...
docker-compose down -v
docker system prune -f
echo 清理完成
goto :eof

:local_deploy
echo [1/3] 安装依赖...
call npm ci --omit=dev
if %ERRORLEVEL% neq 0 (
    echo [错误] 依赖安装失败！
    exit /b 1
)
echo [2/3] 运行测试...
call npm test
if %ERRORLEVEL% neq 0 (
    echo [警告] 测试未全部通过，但继续部署...
)
echo [3/3] 启动服务...
echo 请手动运行: node server.js
goto :eof

:run_tests
echo 运行单元测试...
call npm test
goto :eof

:status
echo --- 容器状态 ---
docker ps -a --filter "name=pyvar_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul
echo.
echo --- 镜像版本 ---
docker images --filter "reference=python-var-lesson" --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" 2>nul
echo.
echo --- 健康状态 ---
docker inspect pyvar_app --format="App:  {{.State.Health.Status}}" 2>nul
docker inspect pyvar_mysql --format="MySQL: {{.State.Health.Status}}" 2>nul
goto :eof

:rollback
echo ============================================
echo   回滚 - 恢复到上一个版本
echo ============================================
echo.
REM 委托给 PowerShell 脚本执行完整回滚流程
powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -Rollback
goto :eof

:diag
echo ============================================
echo   诊断信息收集
echo ============================================
echo.
echo --- 容器状态（含已停止的）---
docker ps -a --filter "name=pyvar_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul
echo.
echo --- App 容器日志（最后 40 行）---
docker logs pyvar_app --tail=40 2>nul
echo.
echo --- MySQL 容器日志（最后 20 行）---
docker logs pyvar_mysql --tail=20 2>nul
echo.
echo --- 镜像列表 ---
docker images --filter "reference=python-var-lesson" --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" 2>nul
echo.
echo --- Docker 磁盘使用 ---
docker system df 2>nul
echo.
echo --- 最近 5 分钟 Docker 事件 ---
docker events --since "5m" --until "0s" --format "{{.Time}} {{.Action}} {{.Actor.Attributes.name}}" 2>nul
echo.
echo --- docker-compose 配置验证 ---
docker-compose config 2>nul | findstr /C:"image" /C:"container_name" /C:"ports"
echo.
goto :eof

:usage
echo 用法: %0 ^<命令^>
echo.
echo 部署命令:
echo   docker    - 一键部署（构建+启动+验证）
echo   build     - 仅构建 Docker 镜像
echo   stop      - 停止 Docker 服务
echo   restart   - 重启服务（docker-compose restart）
echo.
echo 运维命令:
echo   status    - 查看容器状态和版本信息
echo   logs      - 查看服务日志（实时）
echo   diag      - 收集诊断信息（排查故障用）
echo   rollback  - 一键回滚到上一个版本
echo   clean     - 清理所有容器和镜像
echo.
echo 开发命令:
echo   local     - 本地部署（npm ci + test）
echo   test      - 运行单元测试
echo.
echo 示例:
echo   %0 docker        # 一键部署
echo   %0 status        # 查看运行状态
echo   %0 rollback      # 回滚到上一个版本
echo   %0 diag          # 收集诊断信息
echo   %0 logs          # 查看运行日志
goto :eof