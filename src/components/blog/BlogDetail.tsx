/**
 * 博客详情页 - Markdown渲染 + 代码高亮
 */
'use client';

import { useEffect, useState } from 'react';
import { useSiteStore } from '@/store/use-site-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Eye, Edit, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ArticleDetail {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  status: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function BlogDetail() {
  const { currentArticleId, setCurrentPage, setEditingArticleId, isAdmin, adminPassword } = useSiteStore();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentArticleId) return;
    setLoading(true);
    fetch('/api/articles/' + currentArticleId)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 200) setArticle(data.data);
        else setCurrentPage('blog');
      })
      .finally(() => setLoading(false));
  }, [currentArticleId, setCurrentPage]);

  /** 删除文章 */
  const handleDelete = async () => {
    if (!currentArticleId) return;
    await fetch('/api/articles/' + currentArticleId, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': adminPassword },
    });
    setCurrentPage('blog');
  };

  /** 编辑文章 */
  const handleEdit = () => {
    setEditingArticleId(currentArticleId);
    setCurrentPage('blog-editor');
  };

  /** 格式化日期 */
  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // 加载中
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-48" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentPage('blog')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回列表
        </Button>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-1" /> 编辑
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" /> 删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除？</AlertDialogTitle>
                  <AlertDialogDescription>
                    删除后无法恢复，确定要删除「{article.title}」吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{article.title}</h1>
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{article.category}</Badge>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {formatDate(article.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {article.viewCount} 次阅读
          </span>
        </div>
      </div>

      <hr className="border-border" />

      <article className="prose-custom">
        <ReactMarkdown
          components={{
            code(props) {
              const { children, className, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              // 如果是代码块（有语言标识）
              if (match) {
                return (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ borderRadius: '0.5rem', margin: '1rem 0' }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              }
              // 行内代码
              return <code className={className} {...rest}>{children}</code>;
            },
          }}
        >
          {article.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
