import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { ok, err } from '@/lib/response';

/** 更新指定配置项（需要管理员密码） */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const isValid = await verifyAdmin(request);
  if (!isValid) {
    return err('密码错误', 401);
  }

  const { key } = await params;
  const body = await request.json();
  const { value } = body;

  if (value === undefined) {
    return err('配置值不能为空');
  }

  // 将值转为字符串存储
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);

  // 使用 upsert：存在则更新，不存在则创建
  const config = await db.siteConfig.upsert({
    where: { key },
    update: { value: strValue },
    create: { key, value: strValue },
  });

  return ok(config);
}
