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
echo   一键修复 H:\Downloads 权限
echo ========================================
echo.
echo 此工具将修复 H:\Downloads 目录的权限问题
echo.
echo 按任意键继续，或关闭窗口取消...
pause >nul

echo.
echo 正在修复权限，请稍候...
echo.

:: 获取当前用户
for /f "tokens=*" %%i in ('whoami') do set CURRENT_USER=%%i

echo 当前用户: %CURRENT_USER%
echo.

:: 步骤 1: 移除所有文件的只读属性
echo [1/4] 移除只读和隐藏属性...
attrib -r -s -h "H:\Downloads\*.*" /s /d >nul 2>&1
echo 完成

:: 步骤 2: 获取所有权
echo [2/4] 获取所有权...
takeown /f "H:\Downloads" /r /d y >nul 2>&1
echo 完成

:: 步骤 3: 设置当前用户权限
echo [3/4] 设置用户权限...
icacls "H:\Downloads" /grant:r "%CURRENT_USER%:(OI)(CI)F" /t /c /q >nul 2>&1
echo 完成

:: 步骤 4: 设置管理员组权限
echo [4/4] 设置管理员权限...
icacls "H:\Downloads" /grant:r "Administrators:(OI)(CI)F" /t /c /q >nul 2>&1
echo 完成

echo.
echo ========================================
echo 权限修复完成！
echo ========================================
echo.
echo 说明:
echo - (OI) = 对象继承 - 文件继承此权限
echo - (CI) = 容器继承 - 文件夹继承此权限
echo - F = 完全控制
echo.
echo 如果仍有个别文件无法访问，请使用:
echo "查找并关闭占用文件的进程.bat" 或 "强制删除文件.bat"
echo.
pause
