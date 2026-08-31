#!/bin/bash
#
# 停止开发服务器
# 用法: chmod +x stop.sh && ./stop.sh
#

echo "正在停止开发服务器..."

# 杀掉所有 bun run dev 进程
pkill -f "bun run dev" 2>/dev/null && echo "已停止" || echo "没有运行中的服务"

# 也可以通过 PID 文件停止
if [ -f ".dev.pid" ]; then
    PID=$(cat .dev.pid)
    kill $PID 2>/dev/null && echo "已停止进程 $PID"
    rm -f .dev.pid
fi

echo "完成"
