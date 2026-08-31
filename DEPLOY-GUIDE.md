# 个人数字花园 - 完整部署指南

## 概述

这是一个基于 Next.js 16 的全栈个人网站，包含博客、13款游戏、工具箱、留言板等功能。
数据库使用 PostgreSQL (Neon 免费版)，部署到 Cloudflare Pages (免费)。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **数据库**: PostgreSQL via Prisma ORM
- **数据库托管**: Neon (免费, 无限连接)
- **部署平台**: Cloudflare Pages (免费)
- **样式**: Tailwind CSS 4 + shadcn/ui

## 第一步: 准备账号

### 1.1 注册 Neon 数据库 (免费)

1. 打开 https://console.neon.tech/signup
2. 用 GitHub 或 Google 账号登录
3. 点击 **Create Project**
4. 填写:
   - Project name: `my-garden` (随便填)
   - Region: **Singapore** (离中国最近, 延迟低)
   - 选择 Free 计划
5. 等待创建完成 (约10秒)
6. 在 Dashboard 页面找到 **Connection string**
7. 复制连接字符串, 格式如:
   ```
   postgres://neondb_owner:xxxxxxxx@ep-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 1.2 注册 Cloudflare (免费)

1. 打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册 (或用 Google/GitHub 登录)
3. 完成注册

## 第二步: 本地开发

### 2.1 安装依赖

需要安装:
- **Node.js** >= 18: https://nodejs.org/ (选 LTS 版本)
- **Bun** (推荐): 打开 PowerShell 运行 `powershell -c "irm bun.sh/install.ps1|iex"`

### 2.2 配置数据库

在项目根目录创建 `.env` 文件, 内容:

```
DATABASE_URL=postgres://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require
```

把上面第一步复制的连接字符串粘贴到这里。

### 2.3 初始化数据库

```bash
npm install --legacy-peer-deps
npx prisma db push
npx tsx seed.ts
```

### 2.4 启动开发服务器

```bash
bun run dev
```

或者 Windows 双击 `start.bat`

打开 http://localhost:3000 查看网站。

### 2.5 登录管理后台

- 网站右上角有盾牌图标 (管理员登录)
- 默认管理密码: `admin123`
- 登录后可以: 管理文章、编辑站点信息(昵称/简介/头像/社交链接/技能)

## 第三步: 部署到 Cloudflare Pages

### 方式A: 使用 deploy.bat (Windows 一键部署)

双击 `deploy.bat`, 按提示操作:
1. 检查 Node.js
2. 安装依赖
3. 登录 Cloudflare (会打开浏览器)
4. 粘贴 Neon 连接字符串
5. 自动建表 + 初始化数据
6. 构建 + 部署

### 方式B: 手动部署 (所有平台)

```bash
# 1. 安装依赖
npm install --legacy-peer-deps

# 2. 登录 Cloudflare
npx wrangler login

# 3. 设置数据库连接
export DATABASE_URL="postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
export CF_PAGES=1

# 4. 推送数据库表结构
npx prisma db push --accept-data-loss
npx tsx seed.ts

# 5. 构建
npx @cloudflare/next-on-pages

# 6. 创建 Cloudflare Pages 项目 (首次)
npx wrangler pages project create digital-garden --production-branch main

# 7. 部署
npx wrangler pages deploy .vercel/output/static --project-name digital-garden --branch main
```

### 方式C: 通过 Cloudflare Dashboard 连接 Git 仓库

1. 把代码推到 GitHub/GitLab
2. 打开 https://dash.cloudflare.com/ → Workers & Pages → Create
3. 选择 "Pages" → "Connect to Git"
4. 选择你的仓库
5. 构建设置:
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
   - **Environment variables**:
     - `DATABASE_URL` = 你的 Neon 连接字符串
     - `CF_PAGES` = `1`
6. 点击 "Save and Deploy"

## 第四步: 配置 Cloudflare 环境变量 (重要!)

部署成功后, 必须在 Cloudflare 控制台设置环境变量, 否则 API 会报错:

1. 打开 https://dash.cloudflare.com/
2. Workers & Pages → 你的项目 → Settings → Environment variables
3. 添加:
   - `DATABASE_URL` = `postgres://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require`
   - `CF_PAGES` = `1`
4. 保存后, 重新部署一次 (Deployments → Retry deployment)

## 第五步: 自定义域名 (可选)

1. Cloudflare Pages 项目 → Settings → Custom domains
2. 点击 "Set up a custom domain"
3. 输入你的域名 (需要域名已托管在 Cloudflare DNS)
4. 等待 SSL 证书自动签发 (约15分钟)

## 常见问题

### Q: 部署后页面空白/API 报错?
A: 检查环境变量 `DATABASE_URL` 是否在 Cloudflare 控制台正确设置。没有设置的话, 数据库连接会失败。

### Q: 构建报错 "module not found"?
A: 确保使用 `npm install --legacy-peer-deps` 安装依赖。

### Q: 如何更新网站?
A: 如果用 Git 方式部署, 直接 push 代码即可自动部署。如果用 deploy.bat, 重新双击即可。

### Q: 数据库数据会丢吗?
A: Neon 免费版的数据持久保存在云端, 不会丢失。但如果超过 7 天没有活动, 数据库会自动休眠 (下次访问时自动唤醒, 约几秒)。

### Q: 如何修改管理员密码?
A: 登录管理后台 → 站点设置 → 修改 admin_password。

### Q: 访客注册登录怎么用?
A: 网站右上角有"登录"按钮, 访客可以注册账号。登录后游戏分数会关联到个人账号。

## 项目文件说明

```
├── deploy.bat          # Cloudflare Pages 一键部署脚本 (Windows)
├── start.bat           # 本地一键启动脚本 (Windows)
├── wrangler.toml       # Cloudflare Workers 配置
├── prisma/schema.prisma # 数据库模型定义
├── seed.ts             # 初始化种子数据
├── src/
│   ├── app/            # Next.js App Router (API路由)
│   ├── components/     # React 组件
│   │   ├── games/      # 13个游戏组件
│   │   ├── tools/      # 8个工具组件
│   │   ├── admin/      # 后台管理
│   │   ├── blog/       # 博客系统
│   │   ├── home/       # 首页
│   │   ├── layout/     # 导航栏+页脚
│   │   └── messages/   # 留言板
│   ├── store/          # Zustand 状态管理
│   └── lib/            # 工具函数
└── .env                # 环境变量 (不提交到Git)
```
