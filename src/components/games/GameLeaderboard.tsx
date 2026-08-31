'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  id: number;
  game: string;
  score: number;
  nickname: string;
  createdAt: string;
}

interface Props {
  game: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MEDAL_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];
const MEDAL_EMOJI = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

export default function GameLeaderboard({ game, open, onOpenChange }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/games/leaderboard?game=${game}&limit=20`)
      .then(r => r.json())
      .then(d => setEntries(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [game, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            排行榜
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">暂无记录，快来挑战吧！</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {entries.map((e, i) => (
              <div key={e.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${i < 3 ? 'bg-muted/50' : ''}`}>
                <span className={`w-8 text-center font-bold text-sm ${i < 3 ? MEDAL_COLORS[i] : 'text-muted-foreground'}`}>{i < 3 ? MEDAL_EMOJI[i] : i + 1}</span>
                <span className="flex-1 truncate text-sm">{e.nickname || '游客'}</span>
                <span className={`font-mono font-bold text-sm ${i === 0 ? 'text-yellow-500' : ''}`}>{e.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
