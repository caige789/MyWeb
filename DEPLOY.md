# 部署指南

## Windows 用户（推荐）

直接双击运行脚本：

| 脚本 | 用途 |
|------|------|
| `start.bat` | 一键启动本地开发服务器 |
| `stop.bat` | 一键停止服务器 |
| `deploy.bat` | 一键部署到 Vercel 云端 |

## Mac / Linux 用户

```bash
chmod +x start.sh stop.sh deploy.sh
./start.sh    # 启动
./stop.sh     # 停止
./deploy.sh   # 部署
```

## 本地启动

1. 安装 [Bun](https://bun.sh/)
2. 双击 `start.bat` 或运行 `./start.sh`
3. 浏览器打开 http://localhost:3000
4. 管理员密码：`admin123`

## 云端部署（Vercel 免费）

1. 注册 [Vercel](https://vercel.com) 账号
2. 双击 `deploy.bat` 或运行 `./deploy.sh`
3. 按提示在浏览器中登录 Vercel
4. 等待部署完成，会自动给你一个网址

> 游戏和工具箱功能在云端完全可用。博客和留言数据在服务器重启后可能重置（免费版限制）。