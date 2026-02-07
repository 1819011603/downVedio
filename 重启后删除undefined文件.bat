@echo off
chcp 65001 >nul

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 需要管理员权限，正在请求提升...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cls
echo ========================================
echo   重启后删除 undefined 文件
echo ========================================
echo.

set "filepath=H:\Downloads\ai\bվ\undefined_1770477545995.mp4"

echo 此工具将在下次重启时自动删除文件
echo.
echo 目标文件: %filepath%
echo.
echo 按任意键继续...
pause >nul

:: 使用 PendingFileRenameOperations 在重启时删除
echo.
echo 正在设置重启后删除...

reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager" /v PendingFileRenameOperations /t REG_MULTI_SZ /d "\??\%filepath%\0" /f >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 设置成功！
    echo ========================================
    echo.
    echo 文件将在下次重启后自动删除
    echo.
    echo 现在重启电脑吗? (Y/N)
    set /p "reboot="
    
    if /i "!reboot!"=="Y" (
        echo 正在重启...
        shutdown /r /t 10 /c "重启以删除锁定的文件"
        echo.
        echo 10秒后将重启，按任意键取消...
        pause >nul
        shutdown /a
        echo 重启已取消
    )
) else (
    echo.
    echo 设置失败，请尝试其他方法
)

echo.
pause
