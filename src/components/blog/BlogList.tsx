/**
 * 博客列表页 - 分页展示已发布文章，支持分类筛选
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSiteStore } from '@/store/use-site-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Eye, Calendar, Plus } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  summary: string;
  category: string;
  viewCount: number;
  createdAt: string;
}

export default function BlogList() {
  const { setCurrentPage, setCurrentArticleId, isAdmin } = useSiteStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const pageSize = 8;

  /** 加载文章列表 */
  const loadArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (activeCategory !== '全部') params.set('category', activeCategory);

    const res = await fetch('/api/articles?' + params);
    const data = await res.json();
    if (data.code === 200) {
      setArticles(data.data.list);
      setTotal(data.data.total);
      // 收集所有分类
      const cats = new Set<string>();
      data.data.list.forEach((a: Article) => cats.add(a.category));
      if (cats.size > 0) {
        setCategories(['全部', ...Array.from(cats)]);
      }
    }
    setLoading(false);
  }, [page, activeCategory]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  const totalPages = Math.ceil(total / pageSize);

  /** 格式化日期 */
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📖 博客</h1>
        {isAdmin && (
          <Button onClick={() => { useSiteStore.getState().setEditingArticleId(null); setCurrentPage('blog-editor'); }}>
            <Plus className="h-4 w-4 mr-1" /> 写文章
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveCategory(cat); setPage(1); }}
          >
            {cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无文章，快去写第一篇吧！
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card
              key={article.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
              onClick={() => {
                setCurrentArticleId(article.id);
                setCurrentPage('blog-detail');
              }}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold hover:text-primary transition-colors line-clamp-1">
                      {article.title}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1.5 line-clamp-2">
                      {article.summary}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {article.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(article.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.viewCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
