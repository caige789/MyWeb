import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return err('未登录', 401);
  }

  const user = await db.user.findUnique({
    where: { token },
    select: { id: true, username: true, nickname: true, avatar: true, createdAt: true },
  });

  if (!user) {
    return err('登录已过期，请重新登录', 401);
  }

  const scores = await db.userScore.findMany({
    where: { userId: user.id },
    orderBy: { score: 'desc' },
  });

  return ok({ ...user, scores });
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return err('未登录', 401);
  }

  const user = await db.user.findUnique({ where: { token } });
  if (!user) {
    return err('登录已过期', 401);
  }

  const body = await request.json();
  const { nickname, avatar } = body;

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(nickname !== undefined ? { nickname } : {}),
      ...(avatar !== undefined ? { avatar } : {}),
    },
    select: { id: true, username: true, nickname: true, avatar: true },
  });

  return ok(updated);
}
