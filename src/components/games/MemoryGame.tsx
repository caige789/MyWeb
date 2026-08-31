'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

interface GridOption {
  label: string;
  cols: number;
  rows: number;
  pairs: number;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type Phase = 'settings' | 'playing' | 'won';

const GRID_OPTIONS: GridOption[] = [
  { label: '4×3', cols: 4, rows: 3, pairs: 6 },
  { label: '4×4', cols: 4, rows: 4, pairs: 8 },
  { label: '6×4', cols: 6, rows: 4, pairs: 12 },
];

const EMOJI_POOL = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
  '🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦅','🦆',
  '🦉','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🌸','🌺',
  '🌻','🌹','🍀','🌈','⭐','🌙','💎','🎸','🎯','🏀',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function getStars(moves: number, pairs: number): number {
  if (moves <= pairs * 1.5) return 3;
  if (moves <= pairs * 2.5) return 2;
  return 1;
}

function CardFlip({ card, onClick }: { card: Card; onClick: () => void }) {
  const showFront = card.isFlipped || card.isMatched;
  return (
    <motion.div
      className="cursor-pointer w-full"
      style={{ perspective: '800px' }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <motion.div
        className="relative w-full"
        style={{
          aspectRatio: '3/4',
          transformStyle: 'preserve-3d',
          rotateY: showFront ? 180 : 0,
          minHeight: '48px',
        }}
        transition={{ type: 'tween', duration: 0.4, ease: 'easeInOut' }}
        animate={card.isMatched ? {
          scale: [1, 1.15, 0.95, 1.02, 0.95],
          transition: { duration: 0.5 },
        } : {}}
      >
        {/* Back face */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center
            text-2xl sm:text-3xl font-bold bg-primary text-primary-foreground
            shadow-md select-none"
          style={{ backfaceVisibility: 'hidden' }}
        >
          ❓
        </div>
        {/* Front face */}
        <div
          className={`absolute inset-0 rounded-xl flex items-center justify-center
            text-3xl sm:text-4xl bg-white shadow-md select-none
            ${card.isMatched ? 'border-2 border-green-400' : ''}`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {card.emoji}
        </div>
      </motion.div>
    </motion.div>
  );
}

const memoryControlsInfo: GameControlsInfo = {
  gameName: '记忆翻牌',
  desktop: [
    { action: '鼠标点击', keys: [], description: '翻开卡片' },
  ],
  mobile: [
    { action: '触摸点击', keys: [], description: '翻开卡片' },
  ],
  rules: [
    '每次翻开两张卡片',
    '如果两张图案相同则配对成功',
    '图案不同则自动翻回',
    '找到所有配对即获胜',
    '步数越少星级越高 (1-3星)',
  ],
  tips: [
    '先翻开边角的卡片，容易记忆位置',
    '记住已经翻过的卡片位置',
    '有目标地翻牌，不要随机点',
  ],
};

export default function MemoryGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('settings');
  const [selectedGrid, setSelectedGrid] = useState<GridOption>(GRID_OPTIONS[0]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [time, setTime] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Fetch best score
  useEffect(() => {
    fetch('/api/games/scores?game=memory')
      .then(r => r.json())
      .then(res => {
        if (res.code === 0 && res.data?.bestScore != null) {
          setBestScore(res.data.bestScore);
        }
      })
      .catch(() => {});
  }, [selectedGrid.pairs]);

  // Init game board
  const initGame = useCallback((grid: GridOption) => {
    const picked = shuffle(EMOJI_POOL).slice(0, grid.pairs);
    const deck = shuffle([...picked, ...picked]);
    setCards(deck.map((emoji, i) => ({
      id: i, emoji, isFlipped: false, isMatched: false,
    })));
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setTime(0);
    setIsLocked(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startGame = () => {
    initGame(selectedGrid);
    setPhase('playing');
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCardClick = (id: number) => {
    if (isLocked) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedIds.length >= 2) return;

    const newFlipped = [...flippedIds, id];
    setCards(prev => prev.map(c =>
      c.id === id ? { ...c, isFlipped: true } : c
    ));
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      const c1 = cards.find(c => c.id === first)!;
      const c2 = cards.find(c => c.id === second)!;

      if (c1.emoji === c2.emoji) {
        setMatches(m => m + 1);
        setCards(prev => prev.map(c =>
          c.id === first || c.id === second
            ? { ...c, isMatched: true }
            : c
        ));
        setFlippedIds([]);
      } else {
        setIsLocked(true);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second
              ? { ...c, isFlipped: false }
              : c
          ));
          setFlippedIds([]);
          setIsLocked(false);
        }, 800);
      }
    }
  };

  // Check win
  useEffect(() => {
    if (phase === 'playing' && matches > 0 && matches === selectedGrid.pairs) {
      stopTimer();
      setPhase('won');
      fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'memory', score: moves }),
      }).catch(() => {});
    }
  }, [matches, selectedGrid.pairs, phase, moves]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goSettings = () => { stopTimer(); setPhase('settings'); };

  const retry = () => {
    initGame(selectedGrid);
    setPhase('playing');
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  };

  // === Settings ===
  if (phase === 'settings') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-2">
        <div className="w-full max-w-md space-y-6 text-center">
          <div>
            <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold">🃏 记忆翻牌</h1>
            <GameControlsHelp info={memoryControlsInfo} />
          </div>
            <p className="text-muted-foreground mt-1">
              翻开卡片，找到相同的配对！
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">选择难度</p>
            <div className="grid grid-cols-3 gap-3">
              {GRID_OPTIONS.map(opt => (
                <button
                  key={opt.pairs}
                  onClick={() => setSelectedGrid(opt)}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer
                    ${selectedGrid.pairs === opt.pairs
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border hover:border-primary/50'
                    }`}
                >
                  <div className="text-lg">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {opt.pairs}对卡片
                  </div>
                </button>
              ))}
            </div>
          </div>
          {bestScore != null && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Trophy className="w-4 h-4 text-yellow-500" />
              最少步数: {bestScore}
            </div>
          )}
          <Button onClick={startGame} size="lg" className="w-full text-lg">
            开始游戏
          </Button>
        </div>
      </div>
    );
  }

  // === Won ===
  if (phase === 'won') {
    const stars = getStars(moves, selectedGrid.pairs);
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <h2 className="text-3xl font-bold">🎉 恭喜通关！</h2>
          <div className="flex justify-center gap-1 text-4xl">
            {[1, 2, 3].map(i => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.2, type: 'spring', stiffness: 200 }}
                className={i <= stars ? '' : 'opacity-20 grayscale'}
              >
                ⭐
              </motion.span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-2xl font-bold">{moves}</div>
              <div className="text-xs text-muted-foreground">步数</div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-2xl font-bold">{formatTime(time)}</div>
              <div className="text-xs text-muted-foreground">用时</div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={retry} className="flex-1">
              再来一局
            </Button>
            <Button variant="outline" onClick={goSettings} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // === Playing ===
  return (
    <div className="min-h-[80vh] flex flex-col px-2 py-2">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={goSettings}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <div className="flex gap-3 sm:gap-4 text-sm font-medium">
          <span>步数: {moves}</span>
          <span className="hidden sm:inline">⏱ {formatTime(time)}</span>
          <span>{matches}/{selectedGrid.pairs}</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className="grid gap-2 sm:gap-3 w-full max-w-lg"
          style={{
            gridTemplateColumns: `repeat(${selectedGrid.cols}, minmax(0, 1fr))`,
          }}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.03 },
            },
          }}
        >
          {cards.map(card => (
            <motion.div
              key={card.id}
              variants={{
                hidden: { opacity: 0, scale: 0.5 },
                visible: { opacity: 1, scale: 1 },
              }}
            >
              <CardFlip
                card={card}
                onClick={() => handleCardClick(card.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
