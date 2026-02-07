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
echo       强制删除文件工具
echo ========================================
echo.
echo 警告: 此工具会强制删除指定的文件！
echo.

:: 获取文件路径
set /p "filepath=请输入要删除的文件路径（或拖拽文件到此窗口）: "

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

:: 显示文件信息
for %%F in ("%filepath%") do (
    echo 文件名: %%~nxF
    echo 文件大小: %%~zF 字节
    echo 文件路径: %%~dpF
)

echo.
set /p "confirm=确定要删除此文件吗? (输入 YES 确认): "

if /i not "%confirm%"=="YES" (
    echo.
    echo 操作已取消
    echo.
    pause
    exit /b
)

echo.
echo 正在尝试删除文件...
echo.

:: 步骤 1: 移除只读属性
echo [1/5] 移除只读属性...
attrib -r -s -h "%filepath%" >nul 2>&1
if %errorlevel% equ 0 (
    echo 成功
) else (
    echo 失败或不需要
)

:: 步骤 2: 获取所有权
echo [2/5] 获取文件所有权...
takeown /f "%filepath%" >nul 2>&1
if %errorlevel% equ 0 (
    echo 成功
) else (
    echo 失败
)

:: 步骤 3: 设置完全控制权限
echo [3/5] 设置完全控制权限...
for /f "tokens=*" %%i in ('whoami') do set CURRENT_USER=%%i
icacls "%filepath%" /grant "%CURRENT_USER%:F" /c /q >nul 2>&1
if %errorlevel% equ 0 (
    echo 成功
) else (
    echo 失败
)

:: 步骤 4: 尝试使用 del 命令删除
echo [4/5] 尝试删除文件...
del /f /q "%filepath%" >nul 2>&1
if not exist "%filepath%" (
    echo 成功
    goto :success
) else (
    echo 失败，尝试其他方法...
)

:: 步骤 5: 使用 erase 命令
echo [5/5] 使用 erase 命令...
erase /f /q "%filepath%" >nul 2>&1
if not exist "%filepath%" (
    echo 成功
    goto :success
) else (
    echo 失败
)

:: 如果所有方法都失败
echo.
echo ========================================
echo       删除失败！
echo ========================================
echo.
echo 可能的原因:
echo 1. 文件正在被其他程序使用
echo 2. 文件系统错误
echo 3. 磁盘保护
echo.
echo 建议:
echo 1. 运行"查找并关闭占用文件的进程.bat"找到并关闭占用进程
echo 2. 重启电脑后再试
echo 3. 在安全模式下删除
echo.
pause
exit /b

:success
echo.
echo ========================================
echo       文件删除成功！
echo ========================================
echo.
pause
