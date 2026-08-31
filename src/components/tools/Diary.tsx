/**
 * 日记本 - 增删改查，存后端
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BookOpen, Plus, Edit, Trash2, CalendarDays } from 'lucide-react';

interface DiaryItem {
  id: number;
  title: string;
  content: string;
  date: string;
  createdAt: string;
}

export default function Diary() {
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const loadDiaries = useCallback(async () => {
    const res = await fetch('/api/diaries');
    const data = await res.json();
    if (data.code === 200) setDiaries(data.data);
  }, []);

  useEffect(() => { loadDiaries(); }, [loadDiaries]);

  // 打开新建
  const openNew = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setDate(new Date().toISOString().split('T')[0]);
    setOpen(true);
  };

  // 打开编辑
  const openEdit = (d: DiaryItem) => {
    setEditing(d);
    setTitle(d.title);
    setContent(d.content);
    setDate(d.date);
    setOpen(true);
  };

  // 保存
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch('/api/diaries/' + editing.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, date }),
      });
    } else {
      await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, date }),
      });
    }
    setOpen(false);
    setSaving(false);
    loadDiaries();
  };

  // 删除
  const handleDelete = async (id: number) => {
    await fetch('/api/diaries/' + id, { method: 'DELETE' });
    loadDiaries();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> 日记本
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> 写日记
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="max-h-72 custom-scrollbar">
          {diaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              还没有日记，开始记录吧
            </div>
          ) : (
            <div className="space-y-2">
              {diaries.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group"
                >
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(d)}>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">{d.date}</span>
                      <span className="font-medium text-sm truncate">{d.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>删除日记？</AlertDialogTitle>
                          <AlertDialogDescription>删除后无法恢复。</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(d.id)}>删除</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? '编辑日记' : '写新日记'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <div className="flex gap-3">
                <Input placeholder="日期" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
                <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
              </div>
              <Textarea placeholder="今天发生了什么..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                <Button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}