import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok } from '@/lib/response';

/** 获取站点统计信息 */
export async function GET() {
  const [totalVisitsStat, articleCount, gameCount, messageCount, diaryCount] = await Promise.all([
    db.siteStat.findUnique({ where: { key: 'total_visits' } }),
    db.article.count({ where: { status: 'published' } }),
    db.gameScore.count(),
    db.message.count(),
    db.diary.count(),
  ]);

  return ok({
    totalVisits: totalVisitsStat?.value || 0,
    articleCount,
    gameCount,
    messageCount,
    diaryCount,
  });
}

/** 增加访问量 */
export async function POST() {
  const stat = await db.siteStat.upsert({
    where: { key: 'total_visits' },
    update: { value: { increment: 1 } },
    create: { key: 'total_visits', value: 1 },
  });

  return ok({ totalVisits: stat.value });
}