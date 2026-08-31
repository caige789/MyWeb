import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';

/** 切换待办事项的完成状态 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const todoId = Number(id);
  if (isNaN(todoId)) {
    return err('无效的待办ID');
  }

  // 查找当前待办
  const todo = await db.todo.findUnique({ where: { id: todoId } });
  if (!todo) {
    return err('待办事项不存在', 404);
  }

  // 切换完成状态
  const updated = await db.todo.update({
    where: { id: todoId },
    data: { completed: !todo.completed },
  });

  return ok(updated);
}

/** 删除待办事项 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const todoId = Number(id);
  if (isNaN(todoId)) {
    return err('无效的待办ID');
  }

  await db.todo.delete({ where: { id: todoId } });
  return ok(null);
}
