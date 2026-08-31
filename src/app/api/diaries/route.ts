// 日记列表和创建接口
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';
import { NextRequest } from 'next/server';

// 获取日记列表（按日期倒序）
export async function GET() {
  try {
    const diaries = await db.diary.findMany({
      orderBy: { date: 'desc' },
    });
    return ok(diaries);
  } catch {
    return err('获取失败');
  }
}

// 创建日记
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, date } = body;
    if (!title?.trim() || !content?.trim()) return err('标题和内容不能为空');
    const today = date || new Date().toISOString().split('T')[0];
    const diary = await db.diary.create({
      data: { title: title.trim(), content: content.trim(), date: today },
    });
    return ok(diary);
  } catch {
    return err('创建失败');
  }
}