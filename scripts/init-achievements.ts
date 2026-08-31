import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ACHIEVEMENTS = [
  { code: 'first_game', name: '初次游玩', description: '完成任意一局游戏', icon: '🎮' },
  { code: 'game_collector', name: '游戏收藏家', description: '游玩10款不同游戏', icon: '🏆' },
  { code: 'high_scorer', name: '高分选手', description: '任意游戏单局得分超过5000', icon: '⭐' },
  { code: 'perfect_score', name: '完美表现', description: '任意游戏单局得分超过10000', icon: '💎' },
  { code: 'streak_3', name: '三日连续', description: '连续3天访问网站', icon: '🔥' },
  { code: 'streak_7', name: '七日之约', description: '连续7天访问网站', icon: '🌈' },
  { code: 'blog_author', name: '博客达人', description: '发布第一篇博客', icon: '✍️' },
  { code: 'explorer', name: '探索者', description: '访问过所有页面', icon: '🧭' },
]

async function main() {
  for (const a of ACHIEVEMENTS) {
    await db.achievement.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    })
  }
  console.log('Achievements seeded successfully!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
