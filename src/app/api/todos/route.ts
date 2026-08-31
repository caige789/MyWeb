import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';

/** 获取所有待办事项（按创建时间倒序） */
export async function GET() {
  const list = await db.todo.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return ok(list);
}

/** 创建新待办事项 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content } = body;

  if (!content) {
    return err('待办内容不能为空');
  }

  const todo = await db.todo.create({
    data: { content },
  });

  return ok(todo);
}
