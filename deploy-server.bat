@echo off
chcp 65001 >nul 2>&1
title 个人数字花园 - 服务器部署 (PostgreSQL)

echo.
echo  ========================================
echo    个人数字花园 - 服务器部署
echo    数据库: PostgreSQL (Neon)
echo  ========================================
echo.

REM ========================
REM Check bun
REM ========================
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] 没有找到 bun，请先安装
    pause
    exit /b 1
)
echo  [OK] bun 已安装

REM ========================
REM Check .env and DATABASE_URL
REM ========================
echo.
echo  [1/5] 检查数据库配置...
if not exist ".env" (
    echo.
    echo  [!] 首次部署需要配置数据库。
    echo.
    echo  操作步骤:
    echo    1. 打开 https://console.neon.tech/signup (免费)
    echo    2. 用 GitHub 或 Google 登录
    echo    3. 创建项目(区域选离你服务器近的)
    echo    4. 复制 Connection string(以 postgres:// 开头)
    echo    5. 编辑 .env 文件，写入:
    echo       DATABASE_URL=你复制的连接字符串
    echo.
    echo  正在创建 .env 模板...
    copy ".env.example" ".env" >nul 2>&1
    echo.
    echo  请先编辑 .env 填入你的 Neon 连接字符串。
    echo  填好后重新运行 deploy-server.bat
    echo.
    pause
    exit /b 0
)

set "DB_URL="
for /f "tokens=1,* delims==" %%a in (.env) do (
    if "%%a"=="DATABASE_URL" set "DB_URL=%%b"
)

if "%DB_URL%"=="" (
    echo  [X] .env 中 DATABASE_URL 为空!
    echo  请编辑 .env 文件填入 Neon 连接字符串。
    pause
    exit /b 1
)

echo %DB_URL% | findstr /B /C:"postgres://" /C:"postgresql://" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] DATABASE_URL 格式不对!
    echo  当前值: %DB_URL%
    echo  必须以 postgres:// 开头。
    pause
    exit /b 1
)

echo %DB_URL% | findstr /C:"user:pass" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [X] DATABASE_URL 还是占位符，请填入真实连接字符串!
    pause
    exit /b 1
)

echo  [OK] 连接字符串格式正确

REM ========================
REM Switch to PostgreSQL schema
REM ========================
echo.
echo  [2/5] 切换到 PostgreSQL 模式...
if not exist "prisma\schema.postgres.prisma" (
    echo  [X] 找不到 prisma/schema.postgres.prisma 文件!
    pause
    exit /b 1
)
copy /Y "prisma\schema.postgres.prisma" "prisma\schema.prisma" >nul
if not exist "prisma\schema.sqlite.prisma" (
    echo DATABASE_URL=file:./db/custom.db > .env.sqlite
)
echo  [OK] 已切换到 PostgreSQL

REM ========================
REM Install deps
REM ========================
echo.
echo  [3/5] 安装依赖...
call bun install
if %errorlevel% neq 0 (
    echo  [X] 依赖安装失败!
    pause
    exit /b 1
)

REM ========================
REM Generate client
REM ========================
echo.
echo  [4/5] 生成数据库客户端...
call bun run db:generate
if %errorlevel% neq 0 (
    echo  [X] Prisma 客户端生成失败!
    pause
    exit /b 1
)

REM ========================
REM Push schema
REM ========================
echo.
echo  [5/5] 同步数据库表结构...
echo  (可能需要 10-30 秒，请等待)
call bun run db:push
if %errorlevel% neq 0 (
    echo.
    echo  [X] 数据库连接失败! 常见原因:
    echo    1. 连接字符串不完整(漏了密码或主机名)
    echo    2. Neon 项目休眠了(去 console.neon.tech 点 Resume)
    echo    3. 网络问题(服务器无法访问外网)
    echo    4. .env 文件编码不对(另存为 UTF-8)
    echo.
    pause
    exit /b 1
)

REM ========================
REM Seed data
REM ========================
echo.
call bun run seed.ts 2>nul

REM ========================
REM Build
REM ========================
echo.
echo  [+] 构建生产版本...
call bun run build
if %errorlevel% neq 0 (
    echo  [X] 构建失败!
    pause
    exit /b 1
)

echo.
echo  ========================================
echo    部署准备完成!
echo.
echo    启动生产服务器:
echo      bun run start
echo.
echo    或者开发模式:
echo      bun run dev
echo.
echo    要切回本地 SQLite 模式:
echo      双击 start.bat
echo  ========================================
echo.

pause
