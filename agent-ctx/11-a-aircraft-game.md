# Task 11-a: 飞机大战游戏 AircraftGame

## 完成内容

在 `/home/z/my-project/src/components/games/AircraftGame.tsx` 创建了完整的飞机大战 Canvas 游戏。

### 游戏功能
- **玩家控制**：蓝白色飞机，带尾焰动画，桌面端鼠标移动 + 点击/空格发射，移动端触摸滑动 + 自动发射
- **三种敌机**：小型红色三角形(+10分)、中型橙色菱形(+30分)、大型紫色六边形(+50分)
- **难度系统**：每击落15架敌机升级，敌机速度加快、大型敌机概率增加
- **道具系统**：双发子弹(蓝色D)、护盾(绿色S)，击落敌机12%概率掉落
- **爆炸粒子效果**：击中敌机和拾取道具时产生彩色粒子
- **深蓝色星空背景**：80颗闪烁星星

### 技术实现
- 纯 Canvas 绘制，requestAnimationFrame 60fps 游戏循环
- 高DPI适配（devicePixelRatio 缩放）
- Canvas 逻辑尺寸 480x640，移动端自适应宽度保持4:5.33比例
- 碰撞检测（矩形AABB）、粒子系统、血条显示
- API 集成：GET/POST `/api/games/scores` 读取和更新最高分
- 所有注释使用中文，无 JSX 中文注释

### 验证结果
- ESLint 检查通过（0 error, 0 warning）
- dev.log 中的错误为 GamePlayer.tsx 引用尚未创建的 BreakoutGame/AdventureGame，与本项目无关

### 文件变更
- 新增：`src/components/games/AircraftGame.tsx` (约570行)
