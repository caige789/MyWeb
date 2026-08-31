import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';
import { createHash, randomBytes } from 'crypto';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const isAdminUser = await verifyAdmin(request);
    if (!isAdminUser) {
      return err('不开放自助注册，请联系管理员', 403);
    }

    const { username, password, nickname } = await request.json();

    if (!username || !password) {
      return err('用户名和密码不能为空');
    }
    if (username.length < 2 || username.length > 20) {
      return err('用户名长度2-20个字符');
    }
    if (password.length < 4 || password.length > 50) {
      return err('密码长度4-50个字符');
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return err('用户名已存在');
    }

    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    const token = randomBytes(32).toString('hex');

    const user = await db.user.create({
      data: {
        username,
        password: salt + ':' + hash,
        nickname: nickname || username,
        token,
      },
    });

    return ok({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      token: user.token,
    });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return err('用户名已存在');
    }
    return err('创建用户失败');
  }
}
