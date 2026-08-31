import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';
import { verifyAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  const achievements = await db.achievement.findMany({
    orderBy: { id: 'asc' },
  });

  let unlockedIds: number[] = [];
  let unlockedMap: Record<number, string> = {};

  if (token) {
    const user = await db.user.findUnique({
      where: { token },
      select: { id: true },
    });
    if (user) {
      const userAch = await db.userAchievement.findMany({
        where: { userId: user.id },
        select: { achievementId: true, unlockedAt: true },
      });
      unlockedIds = userAch.map((a) => a.achievementId);
      unlockedMap = Object.fromEntries(
        userAch.map((a) => [a.achievementId, a.unlockedAt.toISOString()])
      );
    }
  }

  const list = achievements.map((a) => ({
    ...a,
    unlocked: unlockedIds.includes(a.id),
    unlockedAt: unlockedMap[a.id] ?? null,
  }));

  return ok({ list, total: achievements.length, unlocked: unlockedIds.length });
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return err('无权限', 403);
  }

  try {
    const { userId, code } = await request.json();
    if (!userId || !code) {
      return err('参数不完整');
    }

    const achievement = await db.achievement.findUnique({
      where: { code },
    });
    if (!achievement) {
      return err('成就不存在');
    }

    const existing = await db.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: Number(userId),
          achievementId: achievement.id,
        },
      },
    });

    if (existing) {
      return ok(existing);
    }

    const created = await db.userAchievement.create({
      data: {
        userId: Number(userId),
        achievementId: achievement.id,
      },
    });

    return ok(created);
  } catch {
    return err('解锁失败');
  }
}
