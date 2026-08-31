/**
 * AchievementPanel - displays all achievements in a grid with locked/unlocked states
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';

interface AchievementItem {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AchievementPanel({ open, onClose }: AchievementPanelProps) {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/achievements')
      .then((r) => r.json())
      .then((res) => {
        if (res.code === 200) {
          setAchievements(res.data.list);
          setTotal(res.data.total);
          setUnlockedCount(res.data.unlocked);
        }
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const pct = total > 0 ? (unlockedCount / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-xl border border-border shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              🏅 成就
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={pct} className="flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {unlockedCount}/{total}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {achievements.map((a) => (
                <AchievementCard key={a.id} item={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AchievementCard({ item }: { item: AchievementItem }) {
  const locked = !item.unlocked;

  const dateStr = item.unlockedAt
    ? new Date(item.unlockedAt).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card
      className={`relative flex flex-col items-center gap-1.5 p-4 transition-all hover:scale-[1.03] ${
        locked
          ? 'opacity-50 grayscale'
          : 'border-amber-400/40 bg-gradient-to-b from-amber-50/80 to-transparent dark:from-amber-950/20'
      }`}
    >
      <span className="text-3xl">{item.icon}</span>
      <span
        className={`text-sm font-semibold text-center leading-tight ${
          locked ? 'text-muted-foreground' : ''
        }`}
      >
        {locked ? '???' : item.name}
      </span>
      <span className="text-xs text-muted-foreground text-center leading-tight line-clamp-2">
        {item.description}
      </span>
      {dateStr && (
        <span className="text-[10px] text-muted-foreground/70 mt-auto pt-1">
          {dateStr}
        </span>
      )}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/30">
          <svg
            className="h-8 w-8 text-muted-foreground/40"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
          </svg>
        </div>
      )}
    </Card>
  );
}
