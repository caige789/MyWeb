#!/bin/bash
#
# 一键启动脚本 - 本地开发
# 用法: chmod +x start.sh && ./start.sh
#

set -e

echo "========================================"
echo "  个人数字花园 - 一键启动"
echo "========================================"

# 检查 bun 是否安装
if ! command -v bun &> /dev/null; then
    echo "[错误] 没有安装 bun，请先安装:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo ""
echo "[1/4] 安装依赖..."
bun install

echo ""
echo "[2/4] 初始化数据库..."
if [ ! -f "db/dev.db" ]; then
    bun run db:push
    echo "[3/4] 导入种子数据..."
    bun run db:seed
else
    echo "[3/4] 数据库已存在，跳过初始化"
fi

echo ""
echo "[4/4] 启动开发服务器..."
echo "----------------------------------------"
echo "  地址: http://localhost:3000"
echo "  手机: 在同一WiFi下用手机浏览器访问电脑的IP:3000"
echo "  管理员密码: admin123"
echo "  按 Ctrl+C 停止"
echo "========================================"
echo ""

# 后台运行 dev server 并把日志写到文件
bun run dev > dev.log 2>&1 &
DEV_PID=$!
echo "进程ID: $DEV_PID"

# 等待启动
sleep 3

# 检查是否启动成功
if kill -0 $DEV_PID 2>/dev/null; then
    echo "启动成功!"
    echo ""
    # 实时显示日志
    tail -f dev.log
else
    echo "[错误] 启动失败，查看 dev.log 获取详情"
    cat dev.log
    exit 1
fi
