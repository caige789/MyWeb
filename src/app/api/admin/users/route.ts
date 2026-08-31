import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';
import { verifyAdmin } from '@/lib/auth';
import { createHash, randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  const valid = await verifyAdmin(request);
  if (!valid) return err('no auth', 403);

  const users = await db.user.findMany({
    select: { id: true, username: true, nickname: true, avatar: true, role: true, createdAt: true },
    orderBy: { id: 'asc' },
  });
  return ok(users);
}

export async function POST(request: NextRequest) {
  const valid = await verifyAdmin(request);
  if (!valid) return err('no auth', 403);

  try {
    const { username, password, nickname } = await request.json();
    if (!username || !password) return err('need username and password');

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) return err('username taken');

    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    const token = randomBytes(32).toString('hex');

    const user = await db.user.create({
      data: { username, password: salt + ':' + hash, nickname: nickname || username, token },
    });

    return ok({ id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, role: user.role, createdAt: user.createdAt });
  } catch (e: any) {
    if (e.code === 'P2002') return err('username taken');
    return err('create failed');
  }
}
