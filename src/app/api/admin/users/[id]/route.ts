import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';
import { verifyAdmin } from '@/lib/auth';
import { createHash, randomBytes } from 'crypto';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const valid = await verifyAdmin(request);
  if (!valid) return err('no auth', 403);

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) return err('bad id');

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return err('not found');
  if (user.role === 'admin') return err('cannot delete admin');

  await db.user.delete({ where: { id: userId } });
  return ok(null);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const valid = await verifyAdmin(request);
  if (!valid) return err('no auth', 403);

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) return err('bad id');

  const body = await request.json();
  const { nickname, password } = body;

  const data: Record<string, string> = {};
  if (nickname !== undefined) data.nickname = nickname;
  if (password) {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    data.password = salt + ':' + hash;
  }

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: { id: true, username: true, nickname: true, avatar: true, role: true, createdAt: true },
  });

  return ok(updated);
}
