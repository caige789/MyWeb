# 任务2 - 后端API开发代理 工作记录

## 任务概述
创建个人数字花园项目全部后端API路由，共12个API文件 + 2个辅助工具文件。

## 创建的文件

### 辅助工具
| 文件 | 说明 |
|------|------|
| `src/lib/auth.ts` | 管理员密码验证辅助函数 `verifyAdmin()` |
| `src/lib/response.ts` | 统一响应格式辅助函数 `ok()` / `err()` |

### API路由
| 文件 | 方法 | 说明 |
|------|------|------|
| `src/app/api/auth/check/route.ts` | POST | 管理员密码验证 |
| `src/app/api/articles/route.ts` | GET/POST | 文章列表(分页) / 创建文章 |
| `src/app/api/articles/[id]/route.ts` | GET/PUT/DELETE | 文章详情(viewCount+1) / 更新 / 删除 |
| `src/app/api/articles/admin-list/route.ts` | GET | 管理员文章列表(含草稿) |
| `src/app/api/messages/route.ts` | GET/POST | 留言列表 / 创建留言 |
| `src/app/api/messages/[id]/route.ts` | DELETE | 删除留言 |
| `src/app/api/games/scores/route.ts` | GET/POST | 游戏最高分列表 / 提交分数 |
| `src/app/api/todos/route.ts` | GET/POST | 待办列表 / 创建待办 |
| `src/app/api/todos/[id]/route.ts` | PUT/DELETE | 切换完成状态 / 删除待办 |
| `src/app/api/config/route.ts` | GET | 获取站点配置(排除密码) |
| `src/app/api/config/[key]/route.ts` | PUT | 更新配置项(upsert) |
| `src/app/api/stats/route.ts` | GET/POST | 统计信息 / 增加访问量 |

## 关键设计
- **统一响应格式**: 所有接口返回 `{ code, message, data? }`
- **密码验证**: 写操作通过 `X-Admin-Password` Header 验证，读取 `SiteConfig` 中的 `admin_password`
- **分页**: 文章列表支持 `page`、`pageSize`、`category` 查询参数
- **游戏分数**: POST 时仅当新分数 > 当前最高分才更新
- **配置项**: GET 接口自动排除 `admin_password`，对 `social_links`/`skills` 做 JSON 解析
- **统计**: 使用 `upsert` + `increment` 确保原子性访问量计数
- **Next.js 16**: 动态路由参数使用 `params: Promise<>` 异步解构
- **ESLint**: 全部通过，无报错

## 状态: ✅ 完成
