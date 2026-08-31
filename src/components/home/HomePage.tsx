/**
 * 首页 - 个人名片展示
 * 包含：头像、姓名、简介、社交链接、技能标签、网站统计
 */
'use client';

import { useEffect, useState } from 'react';
import { useSiteStore } from '@/store/use-site-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Gamepad2, MessageSquare, Eye, BookCheck, Github, Video, AtSign, Mail, ExternalLink, Trophy } from 'lucide-react';
import AchievementPanel from '@/components/AchievementPanel';

/** 图标映射 */
const iconMap: Record<string, React.ReactNode> = {
  github: <Github className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  'at-sign': <AtSign className="h-5 w-5" />,
  mail: <Mail className="h-5 w-5" />,
};

export default function HomePage() {
  const { config, stats, setConfig, setStats } = useSiteStore();
  const [loading, setLoading] = useState(true);
  const [achOpen, setAchOpen] = useState(false);

  useEffect(() => {
    // 并行加载配置和统计
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json()),
    ])
      .then(([cfgRes, statRes]) => {
        if (cfgRes.code === 200) setConfig(cfgRes.data);
        if (statRes.code === 200) setStats(statRes.data);
      })
      .finally(() => setLoading(false));
  }, [setConfig, setStats]);

  // 加载骨架屏
  if (loading || !config) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2 max-w-md">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8 md:py-12">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <img
            src={config.owner_avatar}
            alt={config.owner_name}
            className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-primary/20 shadow-lg object-cover"
          />
          <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold">{config.owner_name}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm md:text-base">{config.owner_bio}</p>
        </div>
      </div>

      <div className="flex gap-3">
        {config.social_links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-sm"
          >
            {iconMap[link.icon] || <ExternalLink className="h-4 w-4" />}
            <span className="hidden sm:inline">{link.name}</span>
          </a>
        ))}
      </div>

      <Card className="w-full max-w-2xl">
        <CardContent className="p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-primary">⚡</span> 技能标签
          </h2>
          <div className="flex flex-wrap gap-2">
            {config.skills.map((skill) => {
              // 根据技能名给不同色调
              const hue = (skill.charCodeAt(0) * 37) % 360;
              return (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-3 py-1 text-sm cursor-default hover:scale-105 transition-transform"
                  style={{ borderColor: `hsl(${hue}, 70%, 60%)`, color: `hsl(${hue}, 60%, 35%)` }}
                >
                  {skill}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 w-full max-w-2xl">
          {[
            { icon: <BookOpen className="h-5 w-5" />, label: '文章数', value: stats.articleCount },
            { icon: <Gamepad2 className="h-5 w-5" />, label: '游戏数', value: stats.gameCount },
            { icon: <MessageSquare className="h-5 w-5" />, label: '留言数', value: stats.messageCount },
            { icon: <BookCheck className="h-5 w-5" />, label: '日记数', value: stats.diaryCount },
            { icon: <Eye className="h-5 w-5" />, label: '总访问', value: stats.totalVisits },
            { icon: <Trophy className="h-5 w-5" />, label: '成就', value: '🏅', onClick: () => setAchOpen(true) },
          ].map((item) => (
            <Card
              key={item.label}
              className={"text-center hover:shadow-md transition-shadow" + (item.onClick ? ' cursor-pointer hover:border-amber-400/50' : '')}
              onClick={item.onClick}
            >
              <CardContent className="p-4 flex flex-col items-center gap-1.5">
                <div className="text-primary">{item.icon}</div>
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="w-full max-w-2xl bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 md:p-6 text-center">
          <p className="text-muted-foreground text-sm">{config.site_description}</p>
        </CardContent>
      </Card>
      <AchievementPanel open={achOpen} onClose={() => setAchOpen(false)} />
    </div>
  );
}
