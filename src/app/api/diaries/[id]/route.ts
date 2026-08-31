// 日记更新和删除接口
import { db } from '@/lib/db';
import { ok, err } from '@/lib/response';
import { NextRequest } from 'next/server';

// 更新日记
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, date } = body;
    await db.diary.update({
      where: { id: parseInt(id) },
      data: { title: title?.trim(), content: content?.trim(), date },
    });
    return ok(null);
  } catch {
    return err('更新失败');
  }
}

// 删除日记
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.diary.delete({ where: { id: parseInt(id) } });
    return ok(null);
  } catch {
    return err('删除失败');
  }
}
