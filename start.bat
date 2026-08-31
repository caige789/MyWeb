@echo off
chcp 65001 >nul 2>&1
title 个人数字花园 - 本地启动

echo.
echo  ========================================
echo    个人数字花园 - 本地启动 (SQLite)
echo  ========================================
echo.

where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] 没有找到 bun，请先安装:
    echo.
    echo     打开 PowerShell 运行:
    echo     powershell -c "irm bun.sh/install.ps1|iex"
    echo.
    echo     或访问 https://bun.sh/
echo.
    pause
    exit /b 1
)
echo  [OK] bun 已安装

REM Make sure .env uses SQLite
if not exist "db" mkdir db
if not exist ".env" (
    echo DATABASE_URL=file:./db/custom.db > .env
) else (
    findstr /C:"postgres" .env >nul 2>&1
    if %errorlevel% equ 0 (
        echo  [i] 检测到 PostgreSQL 配置，本地模式切换为 SQLite...
        echo DATABASE_URL=file:./db/custom.db > .env
    )
)

echo.
echo  [1/3] 安装依赖...
call bun install --frozen-lockfile 2>nul || call bun install

echo.
echo  [2/3] 同步数据库...
if not exist "prisma\schema.sqlite.prisma" (
    copy /Y "prisma\schema.prisma" "prisma\schema.sqlite.prisma" >nul
)
findstr /C:"provider = \"sqlite\"" prisma\schema.prisma >nul 2>&1
if %errorlevel% neq 0 (
    copy /Y "prisma\schema.sqlite.prisma" "prisma\schema.prisma" >nul
    echo  [i] 已切换到 SQLite 模式
)
call bun run db:push
if %errorlevel% neq 0 (
    echo  [X] 数据库同步失败!
    pause
    exit /b 1
)

echo.
echo  [3/3] 初始化数据...
call bun run seed.ts 2>nul

echo.
echo  ========================================
echo    启动成功! http://localhost:3000
echo    手机访问: 同WiFi下用 电脑IP:3000
echo    按 Ctrl+C 停止
echo  ========================================
echo.

call bun run dev
pause
