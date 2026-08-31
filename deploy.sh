#!/bin/bash
#
# 一键部署到 Vercel (免费)
# 用法: chmod +x deploy.sh && ./deploy.sh
#
# 前提: 
#   1. 代码已推送到 GitHub
#   2. 已注册 Vercel 账号 (https://vercel.com)
#
set -e

echo "========================================"
echo "  个人数字花园 - 一键部署到 Vercel"
echo "========================================"

# 检查是否登录
echo ""
echo "[1/5] 检查 Vercel 登录状态..."
if ! npx vercel whoami &>/dev/null; then
    echo "未登录，正在打开浏览器登录..."
    npx vercel login
fi
echo "已登录"

# 确认部署
echo ""
echo "[2/5] 即将部署到 Vercel (免费)"
echo "  - 会自动检测 Next.js 项目"
echo "  - 使用 SQLite 文件数据库(重启后数据可能丢失)"
echo "  - 免费额度: 100GB流量/月"
echo ""
read -p "确认部署? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "已取消"
    exit 0
fi

# 安装 vercel cli
echo ""
echo "[3/5] 安装 Vercel CLI..."
npm i -g vercel 2>/dev/null || true

# 部署
echo ""
echo "[4/5] 开始部署 (可能需要几分钟)..."
npx vercel --yes --prod

# 显示结果
echo ""
echo "[5/5] 部署完成!"
echo "========================================"
echo "  你的网站已经上线了!"
echo "  打开 Vercel 面板查看地址: https://vercel.com/dashboard"
echo ""
echo "  注意:"
echo "  - Vercel 免费版的 SQLite 数据在函数重启后可能丢失"
echo "  - 如需持久化数据，建议使用 Turso (云SQLite):"
echo "    1. 注册 https://turso.tech"
echo "    2. 创建数据库，获取连接URL"
echo "    3. 在 Vercel 环境变量设置 DATABASE_URL"
echo "========================================"
