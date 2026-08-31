@echo off
chcp 65001 >nul 2>&1
title 数字花园 - Cloudflare Pages 一键部署


echo.
echo  ============================================================
echo     个人数字花园 - Cloudflare Pages 一键云部署
echo     Cloudflare Pages (免费) + Neon PostgreSQL (免费)
echo  ============================================================
echo.
echo  前提:
echo    1. Cloudflare 账号 (免费): https://dash.cloudflare.com/sign-up
echo    2. Neon 数据库账号 (免费): https://console.neon.tech/signup
echo.
pause

REM ========================
REM Step 1: Check Node.js
REM ========================
echo.
echo  [1/7] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [X] 没有找到 Node.js!
    echo  请先安装: https://nodejs.org/ (LTS版本)
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  [OK] Node.js %%v

REM ========================
REM Step 2: Install dependencies
REM ========================
echo.
echo  [2/7] 安装项目依赖...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo  [X] 依赖安装失败
    pause
    exit /b 1
)
echo  [OK] 依赖安装完成

REM ========================
REM Step 3: Login Cloudflare
REM ========================
echo.
echo  [3/7] 登录 Cloudflare...

REM Check if wrangler is installed
where wrangler >nul 2>&1
if %errorlevel% neq 0 (
    call npx wrangler login
) else (
    call wrangler whoami >nul 2>&1
    if %errorlevel% neq 0 (
        call wrangler login
    )
)
echo  [OK] Cloudflare 登录成功

REM ========================
REM Step 4: Get Neon database URL
REM ========================
echo.
echo  [4/7] 设置数据库...
echo.
echo  --------------------------------------------------------
echo  如果还没有数据库，按以下步骤创建:
echo.
echo  1. 打开 https://console.neon.tech/signup
echo  2. 用 GitHub 或 Google 登录
echo  3. 点击 Create Project
echo  4. 区域选 Singapore (离中国最近)
echo  5. 创建完成后，在 Dashboard 复制连接字符串
echo.
echo  格式: postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
echo  --------------------------------------------------------
echo.
set /p NEON_URL=
if "%NEON_URL%"=="" (
    echo  [X] 连接字符串不能为空!
    pause
    exit /b 1
)
echo  %NEON_URL% | findstr /C:"postgres" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] 格式不对! 应该以 postgres:// 开头
    pause
    exit /b 1
)
set DATABASE_URL=%NEON_URL%
echo  [OK] 数据库连接已获取

REM ========================
REM Step 5: Push schema + seed
REM ========================
echo.
echo  [5/7] 创建数据库表和初始数据...
set DATABASE_URL=%NEON_URL%
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo  [X] 表结构推送失败! 检查连接字符串
    pause
    exit /b 1
)
echo  [OK] 表结构已创建

echo  正在初始化数据...
set DATABASE_URL=%NEON_URL%
where bun >nul 2>&1
if %errorlevel% equ 0 (
    call bun run seed.ts
) else (
    call npx tsx seed.ts
)
echo  [OK] 数据初始化完成

REM ========================
REM Step 6: Build
REM ========================
echo.
echo  [6/7] 构建项目...
set DATABASE_URL=%NEON_URL%
set CF_PAGES=1
call npx @cloudflare/next-on-pages
if %errorlevel% neq 0 (
    echo.
    echo  [X] 构建失败! 请检查上面的错误信息
    echo  常见原因:
    echo    - 连接字符串格式不对
    echo    - 某些npm包不兼容Cloudflare Workers
    pause
    exit /b 1
)
echo  [OK] 构建成功

REM ========================
REM Step 7: Deploy
REM ========================
echo.
echo  [7/7] 部署到 Cloudflare Pages...
echo.
echo  设置环境变量...
echo %NEON_URL% | call npx wrangler pages project create digital-garden --production-branch main 2>nul
echo  [OK] 项目已创建

set DATABASE_URL=%NEON_URL%
call npx wrangler pages deploy .vercel/output/static --project-name digital-garden --branch main
if %errorlevel% neq 0 (
    echo  [X] 部署失败!
    echo  你也可以手动执行: npx wrangler pages deploy .vercel/output/static --project-name digital-garden
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo.
echo     部署成功! 网站已上线!
echo.
echo  ============================================================
echo.
echo  提示:
echo    - Cloudflare 面板: https://dash.cloudflare.com/
echo    - 在 Pages 项目设置中添加环境变量:
echo      DATABASE_URL = %NEON_URL%
echo      CF_PAGES = 1
    - 数据库管理: https://console.neon.tech
echo    - 后台管理: 你的域名/admin (密码: admin123)
echo.
echo  以后更新代码后，直接双击 deploy.bat 即可

echo.
echo  ============================================================
pause
