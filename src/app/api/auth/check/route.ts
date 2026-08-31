import { NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { ok, err } from '@/lib/response';

/** 管理员密码验证接口 */
export async function POST(request: NextRequest) {
  const isValid = await verifyAdmin(request);
  if (!isValid) {
    return err('密码错误', 401);
  }
  return ok(null);
}
