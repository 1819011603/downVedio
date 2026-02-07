@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 需要管理员权限，正在请求提升...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cls
echo ========================================
echo    查找并关闭占用文件的进程
echo ========================================
echo.

:: 获取文件路径
set /p "filepath=请输入文件完整路径（或拖拽文件到此窗口）: "

:: 去除引号
set filepath=%filepath:"=%

:: 检查文件是否存在
if not exist "%filepath%" (
    echo.
    echo 错误: 文件不存在！
    echo.
    pause
    exit /b
)

echo.
echo 目标文件: %filepath%
echo.
echo 正在查找占用此文件的进程...
echo.

:: 启用 openfiles 功能（需要重启才能生效，但我们先尝试）
openfiles /local on >nul 2>&1

:: 创建临时文件存储结果
set "tempfile=%temp%\filehandles_%random%.txt"
set "processfile=%temp%\processes_%random%.txt"

:: 方法1: 使用 openfiles 命令
echo [方法 1] 使用 openfiles 查询...
openfiles /query /fo csv /v 2>nul | findstr /i "%filepath%" > "%tempfile%"

if %errorlevel% equ 0 (
    echo 找到占用文件的进程！
    echo.
    type "%tempfile%"
    echo.
) else (
    echo 未通过 openfiles 找到占用进程
    echo.
)

:: 方法2: 使用 WMIC 查找可能的进程
echo [方法 2] 使用 WMIC 查询进程...
echo.

:: 获取文件名
for %%F in ("%filepath%") do set "filename=%%~nxF"

:: 查找可能打开该文件的进程
wmic process where "name like '%%player%%' or name like '%%media%%' or name like '%%video%%' or name='explorer.exe' or name='chrome.exe' or name='msedge.exe' or name='firefox.exe'" get ProcessId,Name,ExecutablePath /format:csv 2>nul | findstr /v "^$" > "%processfile%"

echo 可能占用文件的进程:
echo.
echo PID    进程名称
echo --------------------------------

set "foundprocess=0"
for /f "tokens=2,3 delims=," %%a in ('type "%processfile%" ^| findstr /v "Node,Name"') do (
    if not "%%a"=="" (
        echo %%b    %%a
        set "foundprocess=1"
    )
)

if "%foundprocess%"=="0" (
    echo 未找到常见的媒体播放器进程
)

echo.
echo ================================
echo.

:: 方法3: 使用 handle 命令（如果系统有的话）
where handle.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [方法 3] 使用 Handle 工具...
    handle.exe "%filepath%" 2>nul
    echo.
)

:: 询问是否要查看所有进程并手动选择
echo.
set /p "showmore=是否显示所有正在运行的进程? (Y/N): "
if /i "%showmore%"=="Y" (
    echo.
    echo 正在列出所有进程...
    echo.
    tasklist /fo table /nh
    echo.
)

:: 询问是否要结束进程
echo.
set /p "killprocess=是否要结束某个进程? (Y/N): "
if /i not "%killprocess%"=="Y" goto :end

:killloop
echo.
set /p "pid=请输入要结束的进程 PID (输入 0 退出): "

if "%pid%"=="0" goto :end

:: 验证输入是否为数字
echo %pid%| findstr /r "^[0-9][0-9]*$" >nul
if %errorlevel% neq 0 (
    echo 错误: 请输入有效的进程 PID
    goto :killloop
)

:: 获取进程名称
for /f "tokens=1" %%a in ('tasklist /fi "PID eq %pid%" /fo csv /nh 2^>nul ^| findstr /v "INFO:"') do (
    set "procname=%%~a"
)

if not defined procname (
    echo 错误: 找不到 PID 为 %pid% 的进程
    goto :killloop
)

echo.
echo 即将结束进程: !procname! (PID: %pid%)
set /p "confirm=确认结束此进程? (Y/N): "

if /i "%confirm%"=="Y" (
    echo 正在结束进程...
    taskkill /PID %pid% /F >nul 2>&1
    if %errorlevel% equ 0 (
        echo 成功: 进程已结束
    ) else (
        echo 失败: 无法结束进程
    )
) else (
    echo 已取消
)

echo.
set /p "continue=是否继续结束其他进程? (Y/N): "
if /i "%continue%"=="Y" goto :killloop

:end
:: 清理临时文件
if exist "%tempfile%" del "%tempfile%" >nul 2>&1
if exist "%processfile%" del "%processfile%" >nul 2>&1

echo.
echo ========================================
echo 操作完成
echo ========================================
echo.
echo 提示: 如果进程已结束，现在可以尝试操作文件了
echo.
pause
