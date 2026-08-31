import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';
import { createHash, randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return err('用户名和密码不能为空');
    }

    const user = await db.user.findUnique({ where: { username } });
    if (!user) {
      return err('用户名或密码错误');
    }

    const [salt, storedHash] = user.password.split(':');
    const hash = createHash('sha256').update(salt + password).digest('hex');

    if (hash !== storedHash) {
      return err('用户名或密码错误');
    }

    const newToken = randomBytes(32).toString('hex');
    await db.user.update({
      where: { id: user.id },
      data: { token: newToken },
    });

    return ok({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      token: newToken,
    });
  } catch {
    return err('登录失败');
  }
}
