'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';

const GAME_NAME = 'match3';
const GRID = 8;
const GEM_COUNT = 6;
const DURATION = 90;

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316'];
const GLOW_COLORS = ['rgba(239,68,68,0.5)', 'rgba(34,197,94,0.5)', 'rgba(59,130,246,0.5)', 'rgba(234,179,8,0.5)', 'rgba(168,85,247,0.5)', 'rgba(249,115,22,0.5)'];

interface Props { onBack: () => void; }
type Phase = 'idle' | 'playing' | 'over';

function randGem(): number {
  return Math.floor(Math.random() * GEM_COUNT);
}

function createBoard(): number[][] {
  const b: number[][] = [];
  for (let r = 0; r < GRID; r++) {
    b[r] = [];
    for (let c = 0; c < GRID; c++) {
      let v: number;
      do {
        v = randGem();
      } while (
        (c >= 2 && b[r][c - 1] === v && b[r][c - 2] === v) ||
        (r >= 2 && b[r - 1][c] === v && b[r - 2][c] === v)
      );
      b[r][c] = v;
    }
  }
  return b;
}

function findMatches(board: number[][]): Set<string> {
  const m = new Set<string>();
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID - 2; c++) {
      const v = board[r][c];
      if (v >= 0 && board[r][c + 1] === v && board[r][c + 2] === v) {
        let end = c + 2;
        while (end + 1 < GRID && board[r][end + 1] === v) end++;
        for (let i = c; i <= end; i++) m.add(`${r},${i}`);
      }
    }
  }
  for (let c = 0; c < GRID; c++) {
    for (let r = 0; r < GRID - 2; r++) {
      const v = board[r][c];
      if (v >= 0 && board[r + 1][c] === v && board[r + 2][c] === v) {
        let end = r + 2;
        while (end + 1 < GRID && board[end + 1][c] === v) end++;
        for (let i = r; i <= end; i++) m.add(`${i},${c}`);
      }
    }
  }
  return m;
}

function applyGravity(board: number[][]): number[][] {
  const nb = board.map(r => [...r]);
  for (let c = 0; c < GRID; c++) {
    let wp = GRID - 1;
    for (let r = GRID - 1; r >= 0; r--) {
      if (nb[r][c] >= 0) {
        nb[wp][c] = nb[r][c];
        if (wp !== r) nb[r][c] = -1;
        wp--;
      }
    }
    for (let r = wp; r >= 0; r--) {
      nb[r][c] = randGem();
    }
  }
  return nb;
}

export default function Match3Game({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [bestScore, setBestScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [matchedCells, setMatchedCells] = useState<Set<string>>(new Set());
  const [newRecord, setNewRecord] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const boardRef = useRef(board);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('idle');

  boardRef.current = board;
  scoreRef.current = score;

  useEffect(() => {
    fetch('/api/games/scores')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.data)) {
          const s = d.data.find((item: { game: string; score: number }) => item.game === GAME_NAME);
          if (s) {
            setBestScore(s.score);
            bestRef.current = s.score;
          }
        }
      })
      .catch(() => {});
  }, []);

  const submitScore = useCallback((s: number) => {
    if (s > bestRef.current) {
      setNewRecord(true);
      setBestScore(s);
      bestRef.current = s;
      fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_NAME, score: s }),
      }).catch(() => {});
    }
  }, []);

  const clearMatches = useCallback((b: number[][]): Promise<number[][]> => {
    return new Promise(resolve => {
      let matches = findMatches(b);
      let cb = b;
      let comboCount = 0;

      const step = () => {
        if (matches.size === 0) {
          resolve(cb);
          return;
        }
        comboCount++;
        const pts = matches.size * 10 * comboCount;
        setMatchedCells(new Set(matches));
        setCombo(comboCount);

        setTimeout(() => {
          const nb = cb.map(r => [...r]);
          matches.forEach(k => {
            const [rr, cc] = k.split(',').map(Number);
            nb[rr][cc] = -1;
          });
          const filled = applyGravity(nb);
          cb = filled;
          setBoard([...filled]);
          setScore(prev => prev + pts);
          scoreRef.current += pts;

          setTimeout(() => {
            setMatchedCells(new Set());
            matches = findMatches(cb);
            step();
          }, 150);
        }, 200);
      };
      step();
    });
  }, []);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (phaseRef.current !== 'playing' || swapping) return;

    const key = `${r},${c}`;
    const cur = boardRef.current;

    if (!selected) {
      setSelected(key);
      return;
    }

    if (selected === key) {
      setSelected(null);
      return;
    }

    const [sr, sc] = selected.split(',').map(Number);
    const dr = Math.abs(r - sr);
    const dc = Math.abs(c - sc);

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      setSwapping(true);
      setSelected(null);

      const nb = cur.map(row => [...row]);
      const tmp = nb[sr][sc];
      nb[sr][sc] = nb[r][c];
      nb[r][c] = tmp;
      setBoard(nb);

      setTimeout(async () => {
        const m = findMatches(nb);
        if (m.size === 0) {
          setBoard(cur);
          setSwapping(false);
          return;
        }
        boardRef.current = nb;
        await clearMatches(nb);
        setSwapping(false);
      }, 200);
    } else {
      setSelected(key);
    }
  }, [selected, swapping, clearMatches]);

  const startGame = useCallback(() => {
    const b = createBoard();
    setBoard(b);
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(DURATION);
    setSelected(null);
    setCombo(0);
    setMatchedCells(new Set());
    setNewRecord(false);
    setSwapping(false);
    setPhase('playing');
    phaseRef.current = 'playing';

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          phaseRef.current = 'over';
          setPhase('over');
          submitScore(scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [submitScore]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const comboText = combo > 1 ? `${combo}x 连击!` : '';

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto py-2 gap-2">
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <h2 className="text-lg font-bold">三消达人</h2>
        <div className="w-16" />
      </div>

      <Card className="w-full border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">分数</span>
            <span className="text-xl font-bold text-primary tabular-nums">{score}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">时间</span>
            <span className={`text-xl font-bold tabular-nums ${timeLeft <= 10 ? 'text-red-500' : ''}`}>{timeLeft}s</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" />最高
            </span>
            <span className="text-xl font-bold text-yellow-500 tabular-nums">{bestScore}</span>
          </div>
        </CardContent>
      </Card>

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="grid grid-cols-3 gap-2">
            {COLORS.map((color, i) => (
              <div key={i} className="w-10 h-10 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${GLOW_COLORS[i]}` }} />
            ))}
          </div>
          <p className="text-muted-foreground text-sm text-center">交换相邻宝石，消除三个以上相同颜色</p>
          <Button size="lg" onClick={startGame} className="min-h-12 text-base font-semibold">
            开始游戏
          </Button>
        </div>
      )}

      {(phase === 'playing' || phase === 'over') && (
        <div className="w-full">
          <div className="grid gap-1 p-1 rounded-xl bg-muted/50" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
            {board.map((row, r) =>
              row.map((gem, c) => {
                const key = `${r},${c}`;
                const isSel = selected === key;
                const isMatch = matchedCells.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleCellClick(r, c)}
                    className="aspect-square rounded-lg flex items-center justify-center transition-all duration-150 active:scale-90"
                    style={{
                      minWidth: 0,
                      minHeight: 0,
                      padding: 0,
                      background: isSel ? 'rgba(255,255,255,0.3)' : 'transparent',
                      border: isSel ? '2px solid white' : '2px solid transparent',
                      outline: 'none',
                    }}
                  >
                    <div
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: '80%',
                        height: '80%',
                        background: COLORS[gem],
                        boxShadow: isSel
                          ? `0 0 16px ${GLOW_COLORS[gem]}`
                          : `0 2px 6px ${GLOW_COLORS[gem]}`,
                        transform: isMatch ? 'scale(0)' : 'scale(1)',
                        opacity: isMatch ? 0 : 1,
                      }}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {combo > 1 && phase === 'playing' && (
        <div className="text-lg font-bold text-orange-400 animate-bounce">
          {comboText}
        </div>
      )}

      {phase === 'over' && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-50">
          <div className="bg-card rounded-xl p-6 flex flex-col items-center gap-3 max-w-xs w-full mx-4">
            <p className="text-2xl font-bold">时间到!</p>
            <p className="text-xl">得分: {score}</p>
            {newRecord && (
              <p className="text-yellow-400 font-bold animate-pulse">新纪录!</p>
            )}
            <Button size="lg" onClick={startGame} className="min-h-12 w-full font-semibold">
              <RotateCcw className="h-4 w-4 mr-2" />再来一局
            </Button>
            <Button variant="outline" onClick={onBack} className="min-h-11 w-full">
              返回
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
