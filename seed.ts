/**
 * Database seed script - initializes default data on first run
 * Run: bun run seed
 */
import { db } from './src/lib/db';
import { createHash, randomBytes } from 'crypto';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return salt + ':' + hash;
}

async function seed() {
  console.log('Starting seed...');

  // ========== 1. Site config ==========
  const configs = [
    { key: 'admin_password', value: 'admin888' },
    { key: 'site_name', value: '个人数字花园' },
    { key: 'site_description', value: '一个集博客、游戏、工具于一体的个人网站' },
    { key: 'owner_name', value: '张三' },
    { key: 'owner_bio', value: '全栈开发者 / 开源爱好者 / 终身学习者' },
    { key: 'owner_avatar', value: 'https://api.dicebear.com/9.x/notionists/svg?seed=garden' },
    { key: 'social_links', value: JSON.stringify([
      { name: 'GitHub', url: 'https://github.com', icon: 'github' },
      { name: 'B站', url: 'https://bilibili.com', icon: 'video' },
      { name: '微博', url: 'https://weibo.com', icon: 'at-sign' },
      { name: '邮箱', url: 'mailto:hello@example.com', icon: 'mail' },
    ]) },
    { key: 'skills', value: JSON.stringify([
      'TypeScript', 'React', 'Next.js', 'Node.js', 'Vue',
      'Python', 'Docker', 'PostgreSQL', 'Redis', 'Linux',
      'TailwindCSS', 'Prisma', 'Git', 'GraphQL'
    ]) },
  ];

  for (const c of configs) {
    await db.siteConfig.upsert({
      where: { key: c.key },
      update: { value: c.value },
      create: { key: c.key, value: c.value },
    });
  }
  console.log('Site config initialized');

  // ========== 2. Admin user ==========
  const adminExists = await db.user.findUnique({ where: { username: 'admin' } });
  if (!adminExists) {
    await db.user.create({
      data: {
        username: 'admin',
        password: hashPassword('admin888'),
        nickname: '管理员',
        role: 'admin',
        token: randomBytes(32).toString('hex'),
      },
    });
    console.log('Admin user created: admin / admin888');
  } else {
    await db.user.update({
      where: { username: 'admin' },
      data: { role: 'admin' },
    });
    console.log('Admin user role updated');
  }

  // ========== 3. Test users ==========
  const testUsers = [];
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, '0');
    const username = `test${num}`;
    const nickname = `内测${num}号`;
    testUsers.push({ username, nickname });
  }

  for (const tu of testUsers) {
    const exists = await db.user.findUnique({ where: { username: tu.username } });
    if (!exists) {
      await db.user.create({
        data: {
          username: tu.username,
          password: hashPassword('test1234'),
          nickname: tu.nickname,
          role: 'user',
          token: randomBytes(32).toString('hex'),
        },
      });
    }
  }
  console.log('Test users created: test01-test10 / test1234');

  // ========== 4. Sample articles ==========
  const articleCount = await db.article.count();
  if (articleCount === 0) {
    const art1Content = '# 用 Next.js 搭建个人数字花园\n\n## 前言\n\n一直想拥有一个属于自己的个人网站，不仅能写博客、展示作品，还能集成一些实用的小工具和有趣的消遣游戏。';
    const articles = [
      { title: '用 Next.js 搭建个人数字花园', summary: '从零开始搭建一个功能丰富的个人网站', content: art1Content, category: '技术', status: 'published' },
      { title: 'Tailwind CSS 4 新特性速览', summary: 'Tailwind CSS 4 带来了许多令人兴奋的新变化', content: '# Tailwind CSS 4 \n\n新特性介绍', category: '技术', status: 'published' },
    ];
    for (const a of articles) {
      await db.article.create({ data: a });
    }
    console.log('Sample articles created');
  }

  // ========== 5. Game scores ==========
  const games = ['snake', '2048', 'gomoku'];
  for (const g of games) {
    await db.gameScore.upsert({
      where: { game: g },
      update: {},
      create: { game: g, score: 0 },
    });
  }
  console.log('Game scores initialized');

  // ========== 6. Stats ==========
  await db.siteStat.upsert({
    where: { key: 'total_visits' },
    update: {},
    create: { key: 'total_visits', value: 0 },
  });
  console.log('Stats initialized');

  console.log('Seed completed!');
}

seed()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => { process.exit(0); });
