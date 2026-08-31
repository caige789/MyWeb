import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';

/** 获取所有留言（按时间倒序） */
export async function GET() {
  const list = await db.message.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return ok(list);
}

/** 创建新留言 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nickname, content } = body;

  if (!nickname || !content) {
    return err('昵称和内容不能为空');
  }

  const message = await db.message.create({
    data: { nickname, content },
  });

  return ok(message);
}
