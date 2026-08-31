import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { ok, err } from '@/lib/response';

/** 删除留言（需要管理员密码） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isValid = await verifyAdmin(request);
  if (!isValid) {
    return err('密码错误', 401);
  }

  const { id } = await params;
  const messageId = Number(id);
  if (isNaN(messageId)) {
    return err('无效的留言ID');
  }

  await db.message.delete({ where: { id: messageId } });
  return ok(null);
}
