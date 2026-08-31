import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { ok, err } from '@/lib/response';

/** 获取已发布文章列表（支持分页和分类筛选） */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(searchParams.get('pageSize')) || 10));
  const category = searchParams.get('category') || undefined;

  // 构建查询条件：只查已发布文章
  const where: any = { status: 'published' };
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

/** 创建新文章（需要管理员密码） */
export async function POST(request: NextRequest) {
  const isValid = await verifyAdmin(request);
  if (!isValid) {
    return err('密码错误', 401);
  }

  const body = await request.json();
  const { title, summary, content, category, status } = body;

  if (!title || !content) {
    return err('标题和内容不能为空');
  }

  const article = await db.article.create({
    data: {
      title,
      summary: summary || '',
      content,
      category: category || '未分类',
      status: status || 'draft',
    },
  });

  return ok(article);
}
