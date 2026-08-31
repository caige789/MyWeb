import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';

/** 获取所有游戏最高分 */
export async function GET() {
  const scores = await db.gameScore.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return ok(scores);
}

/** 提交游戏分数（更新全局最高分 + 写入排行榜） */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { game, score, nickname } = body;

  if (!game || score === undefined) {
    return err('游戏名称和分数不能为空');
  }

  const numScore = Number(score);
  if (isNaN(numScore)) {
    return err('分数必须是数字');
  }

  // auth
  let userId: number | undefined;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const user = await db.user.findUnique({ where: { token } });
    if (user) userId = user.id;
  }

  // update GameScore global high
  const existing = await db.gameScore.findUnique({ where: { game } });
  if (!existing || numScore > existing.score) {
    await db.gameScore.upsert({
      where: { game },
      update: { score: numScore },
      create: { game, score: numScore },
    });
  }

  // write leaderboard entry
  const entry = await db.leaderboardEntry.create({
    data: {
      game,
      score: numScore,
      nickname: nickname || (userId ? '' : '游客'),
      userId,
    },
  });

  // get rank
  const rank = await db.leaderboardEntry.count({
    where: { game, score: { gt: numScore } },
  });

  return ok({ ...entry, rank: rank + 1 });
}
