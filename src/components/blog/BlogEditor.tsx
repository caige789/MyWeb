/**
 * 博客编辑器 - 新建/编辑文章，管理员专用
 */
'use client';

import { useEffect, useState } from 'react';
import { useSiteStore } from '@/store/use-site-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ArticleForm {
  title: string;
  summary: string;
  content: string;
  category: string;
  status: string;
}

export default function BlogEditor() {
  const { editingArticleId, setCurrentPage, adminPassword } = useSiteStore();
  const { toast } = useToast();
  const [form, setForm] = useState<ArticleForm>({
    title: '', summary: '', content: '', category: '技术', status: 'draft',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editingArticleId);

  // 编辑模式：加载文章数据
  useEffect(() => {
    if (!editingArticleId) return;
    fetch('/api/articles/' + editingArticleId)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 200) {
          const a = data.data;
          setForm({ title: a.title, summary: a.summary, content: a.content, category: a.category, status: a.status });
        }
      })
      .finally(() => setLoading(false));
  }, [editingArticleId]);

  /** 保存文章 */
  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: '请输入标题' }); return; }
    if (!form.content.trim()) { toast({ title: '请输入内容' }); return; }

    setSaving(true);
    const url = editingArticleId ? '/api/articles/' + editingArticleId : '/api/articles';
    const method = editingArticleId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast({ title: editingArticleId ? '更新成功' : '发布成功' });
        setCurrentPage('blog');
      } else {
        toast({ title: data.message || '操作失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) return <div className="space-y-4"><div className="h-8 w-32 animate-pulse bg-muted rounded" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentPage(editingArticleId ? 'blog-detail' : 'blog')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? '保存中...' : '保存'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingArticleId ? '编辑文章' : '写新文章'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input id="title" placeholder="文章标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">摘要</Label>
            <Textarea id="summary" placeholder="简短描述文章内容（可选）" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="技术">技术</SelectItem>
                  <SelectItem value="生活">生活</SelectItem>
                  <SelectItem value="随笔">随笔</SelectItem>
                  <SelectItem value="教程">教程</SelectItem>
                  <SelectItem value="未分类">未分类</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">已发布</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">正文（支持 Markdown）</Label>
            <Textarea
              id="content"
              placeholder="在此输入 Markdown 内容..."
              rows={16}
              className="font-mono text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
