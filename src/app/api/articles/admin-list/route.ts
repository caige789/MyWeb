import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { ok, err } from '@/lib/response';

/** 管理员文章列表（含草稿，需要密码验证） */
export async function GET(request: NextRequest) {
  const isValid = await verifyAdmin(request);
  if (!isValid) {
    return err('密码错误', 401);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(searchParams.get('pageSize')) || 10));
  const category = searchParams.get('category') || undefined;

  // 构建查询条件：包含所有状态
  const where: any = {};
  if (category) {
    where.category = category;
  }

  const [total, list] = await Promise.all([
    db.article.count({ where }),
    db.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return ok({ list, total, page, pageSize });
}
