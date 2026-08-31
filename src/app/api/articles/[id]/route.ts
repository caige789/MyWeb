import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { ok, err } from '@/lib/response';

/** 获取单篇文章详情（阅读量+1，无需密码） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const articleId = Number(id);
  if (isNaN(articleId)) {
    return err('无效的文章ID');
  }

  // 查找文章并增加阅读量
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) {
    return err('文章不存在', 404);
  }

  // 阅读量+1
  await db.article.update({
    where: { id: articleId },
    data: { viewCount: { increment: 1 } },
  });

  return ok({ ...article, viewCount: article.viewCount + 1 });
}

/** 更新文章（需要管理员密码） */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isValid = await verifyAdmin(request);
  if (!isValid) {
    return err('密码错误', 401);
  }

  const { id } = await params;
  const articleId = Number(id);
  if (isNaN(articleId)) {
    return err('无效的文章ID');
  }

  const body = await request.json();
  const { title, summary, content, category, status } = body;

  // 构建更新数据
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (summary !== undefined) data.summary = summary;
  if (content !== undefined) data.content = content;
  if (category !== undefined) data.category = category;
  if (status !== undefined) data.status = status;

  const article = await db.article.update({
    where: { id: articleId },
    data,
  });

  return ok(article);
}

/** 删除文章（需要管理员密码） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isValid = await verifyAdmin(request);
  if (!isValid) {
    return err('密码错误', 401);
  }

  const { id } = await params;
  const articleId = Number(id);
  if (isNaN(articleId)) {
    return err('无效的文章ID');
  }

  await db.article.delete({ where: { id: articleId } });
  return ok(null);
}
