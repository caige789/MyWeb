import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game');
  if (!game) return err('game is required');

  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

  const entries = await db.leaderboardEntry.findMany({
    where: { game },
    orderBy: { score: 'desc' },
    take: limit,
  });

  return ok(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { game, score, nickname } = body;
  if (!game || score === undefined) return err('game and score required');

  const numScore = Number(score);
  if (isNaN(numScore) || numScore < 0) return err('invalid score');

  // check auth token for userId
  let userId: number | undefined;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const user = await db.user.findUnique({ where: { token } });
    if (user) userId = user.id;
  }

  const entry = await db.leaderboardEntry.create({
    data: {
      game,
      score: numScore,
      nickname: nickname || (userId ? '' : '游客'),
      userId,
    },
  });

  // also update GameScore global high
  const existing = await db.gameScore.findUnique({ where: { game } });
  if (!existing || numScore > existing.score) {
    await db.gameScore.upsert({
      where: { game },
      update: { score: numScore },
      create: { game, score: numScore },
    });
  }

  // also update UserScore if logged in
  if (userId) {
    const diff = '';
    const existingUS = await db.userScore.findUnique({
      where: { userId_game_difficulty: { userId, game, difficulty: diff } },
    });
    if (!existingUS || numScore > existingUS.score) {
      await db.userScore.upsert({
        where: { userId_game_difficulty: { userId, game, difficulty: diff } },
        update: { score: numScore },
        create: { userId, game, score: numScore, difficulty: diff },
      });
    }
  }

  // get rank
  const rank = await db.leaderboardEntry.count({
    where: { game, score: { gt: numScore } },
  });

  return ok({ ...entry, rank: rank + 1 });
}
