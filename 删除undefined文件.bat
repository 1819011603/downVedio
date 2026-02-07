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
echo   删除 undefined_1770477545995.mp4
echo ========================================
echo.

set "filepath=H:\Downloads\ai\bվ\undefined_1770477545995.mp4"

if not exist "%filepath%" (
    echo 文件不存在或已被删除！
    echo.
    pause
    exit /b
)

echo 目标文件: %filepath%
echo.
echo 正在尝试删除...
echo.

:: 步骤 1: 查找并结束可能占用的进程
echo [1/6] 查找占用进程...
tasklist | findstr /i "player media video chrome edge firefox explorer" >nul
if %errorlevel% equ 0 (
    echo 发现可能占用文件的进程，尝试结束...
    taskkill /f /im "potplayer.exe" >nul 2>&1
    taskkill /f /im "potplayermini64.exe" >nul 2>&1
    taskkill /f /im "vlc.exe" >nul 2>&1
    taskkill /f /im "wmplayer.exe" >nul 2>&1
    taskkill /f /im "mpc-hc64.exe" >nul 2>&1
    timeout /t 2 >nul
    echo 完成
) else (
    echo 未发现常见播放器进程
)

:: 步骤 2: 移除属性
echo [2/6] 移除文件属性...
attrib -r -s -h "%filepath%" >nul 2>&1
echo 完成

:: 步骤 3: 获取所有权
echo [3/6] 获取所有权...
takeown /f "%filepath%" >nul 2>&1
echo 完成

:: 步骤 4: 设置权限
echo [4/6] 设置权限...
icacls "%filepath%" /grant Administrators:F /c /q >nul 2>&1
icacls "%filepath%" /grant Everyone:F /c /q >nul 2>&1
echo 完成

:: 步骤 5: 尝试删除
echo [5/6] 删除文件...
del /f /q "%filepath%" >nul 2>&1

if not exist "%filepath%" (
    echo 成功！
    goto :success
)

:: 步骤 6: 使用 PowerShell 强制删除
echo [6/6] 使用 PowerShell 强制删除...
powershell -Command "Remove-Item -Path '%filepath%' -Force -ErrorAction SilentlyContinue"

if not exist "%filepath%" (
    echo 成功！
    goto :success
)

:: 如果还是失败
echo 失败
echo.
echo ========================================
echo 删除失败！
echo ========================================
echo.
echo 文件可能正在被使用，建议:
echo 1. 重启电脑后再运行此脚本
echo 2. 或运行"查找并关闭占用文件的进程.bat"
echo.
pause
exit /b

:success
echo.
echo ========================================
echo 文件删除成功！
echo ========================================
echo.
pause
