import { db } from './db';
import { NextRequest } from 'next/server';

/** 从请求头验证管理员密码 */
export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const inputPassword = request.headers.get('X-Admin-Password');
  if (!inputPassword) return false;
  const config = await db.siteConfig.findUnique({ where: { key: 'admin_password' } });
  return config?.value === inputPassword;
}
