@echo off
chcp 65001 >nul 2>&1
title 个人数字花园 - 停止服务器

echo 正在停止开发服务器...

REM 杀掉所有 bun 相关的 Next.js 进程
taskkill /f /im bun.exe >nul 2>&1

REM 也尝试杀掉 node 进程（以防万一）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
echo.
echo 已停止所有服务！
pause
