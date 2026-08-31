import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return err('未登录', 401);
  }

  const user = await db.user.findUnique({ where: { token } });
  if (!user) {
    return err('登录已过期', 401);
  }

  try {
    const { game, score, difficulty } = await request.json();
    if (!game || score === undefined) {
      return err('参数不完整');
    }

    const diff = difficulty || '';
    const numScore = Number(score);
    if (isNaN(numScore)) {
      return err('分数必须是数字');
    }

    const existing = await db.userScore.findUnique({
      where: { userId_game_difficulty: { userId: user.id, game, difficulty: diff } },
    });

    if (existing && numScore > existing.score) {
      const updated = await db.userScore.update({
        where: { id: existing.id },
        data: { score: numScore },
      });
      return ok(updated);
    }

    if (!existing) {
      const created = await db.userScore.create({
        data: { userId: user.id, game, score: numScore, difficulty: diff },
      });
      return ok(created);
    }

    return ok(existing);
  } catch {
    return err('提交失败');
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return err('未登录', 401);
  }

  const user = await db.user.findUnique({ where: { token } });
  if (!user) {
    return err('登录已过期', 401);
  }

  const scores = await db.userScore.findMany({
    where: { userId: user.id },
    orderBy: { score: 'desc' },
  });

  return ok(scores);
}
