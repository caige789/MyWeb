import { db } from '@/lib/db';
import { ok } from '@/lib/response';

/** 获取站点配置（排除管理员密码） */
export async function GET() {
  const configs = await db.siteConfig.findMany({
    where: {
      key: { not: 'admin_password' },
    },
  });

  // 将键值对数组转为对象
  const configMap: Record<string, any> = {};
  for (const item of configs) {
    // 对 social_links 和 skills 字段尝试 JSON 解析
    if (item.key === 'social_links' || item.key === 'skills') {
      try {
        configMap[item.key] = JSON.parse(item.value);
      } catch {
        configMap[item.key] = item.value;
      }
    } else {
      configMap[item.key] = item.value;
    }
  }

  return ok(configMap);
}