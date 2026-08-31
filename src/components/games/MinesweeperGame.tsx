'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Trophy } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

interface MinesweeperGameProps {
  onBack: () => void;
}

type Difficulty = 'easy' | 'normal' | 'hard';
type Phase = 'settings' | 'playing' | 'won' | 'lost';

const DIFFICULTIES = {
  easy:   { rows: 9,  cols: 9,  mines: 10, label: '\u7B80\u5355',   sub: '9\u00D79 \u00B7 10\u4E2A\u96F7' },
  normal: { rows: 16, cols: 16, mines: 40, label: '\u666E\u901A', sub: '16\u00D716 \u00B7 40\u4E2A\u96F7' },
  hard:   { rows: 16, cols: 30, mines: 99, label: '\u56F0\u96BE',   sub: '16\u00D730 \u00B7 99\u4E2A\u96F7' },
} as const;

const NUM_COLORS: Record<number, string> = {
  1: 'text-blue-600', 2: 'text-green-600', 3: 'text-red-600',
  4: 'text-purple-600', 5: 'text-amber-800', 6: 'text-teal-600',
};

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };

type Grid = Cell[][];

function createGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );
}

function placeMines(grid: Grid, rows: number, cols: number, totalMines: number, safeR: number, safeC: number) {
  const safeZone = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      safeZone.add(`${safeR + dr},${safeC + dc}`);
    }
  }
  let placed = 0;
  while (placed < totalMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!grid[r][c].mine && !safeZone.has(`${r},${c}`)) {
      grid[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) count++;
        }
      }
      grid[r][c].adjacent = count;
    }
  }
}

function floodReveal(grid: Grid, rows: number, cols: number, r: number, c: number) {
  const stack = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    const cell = grid[cr][cc];
    if (cell.revealed || cell.flagged || cell.mine) continue;
    cell.revealed = true;
    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) stack.push([nr, nc]);
        }
      }
    }
  }
}

function checkWin(grid: Grid, rows: number, cols: number, totalMines: number): boolean {
  let revealed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].revealed) revealed++;
    }
  }
  return revealed === rows * cols - totalMines;
}

const minesweeperControlsInfo: GameControlsInfo = {
  gameName: '扫雷',
  desktop: [
    { action: '左键点击', keys: [], description: '翻开格子' },
    { action: '右键点击', keys: [], description: '标记/取消标记地雷' },
  ],
  mobile: [
    { action: '点击', keys: [], description: '翻开格子' },
    { action: '长按 (0.5秒)', keys: [], description: '标记/取消标记地雷' },
  ],
  rules: [
    '数字表示周围8格中地雷的数量',
    '左键点击翻开格子，右键(长按)标记地雷',
    '第一次点击绝对安全，不会踩雷',
    '翻开空白格会自动展开相邻区域',
    '翻开所有非地雷格子即获胜',
    '用时越短分数越高',
  ],
  tips: [
    '从边角开始，初始展开面积大',
    '数字等于周围旗帜数时，可以双击快速展开',
    '标记不确定的格子比猜测更安全',
  ],
};

export default function MinesweeperGame({ onBack }: MinesweeperGameProps) {
  const [phase, setPhase] = useState<Phase>('settings');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const [grid, setGrid] = useState<Grid>([]);
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [totalMines, setTotalMines] = useState(10);
  const [flags, setFlags] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [lostCell, setLostCell] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/games/scores?game=minesweeper')
      .then(res => res.json())
      .then(data => {
        if (data?.code === 200 && Array.isArray(data.data)) {
          const map: Record<string, number> = {};
          data.data.forEach((s: { difficulty?: string; score: number }) => {
            const d = s.difficulty || 'easy';
            if (!map[d] || s.score < map[d]) map[d] = s.score;
          });
          setBestScores(map);
        }
      }).catch(() => {});
  }, []);

  // Timer
  useEffect(() => {
    if (!started || phase !== 'playing') return;
    const id = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [started, phase]);

  const submitScore = useCallback(async (score: number, diff: string) => {
    try {
      await fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'minesweeper', score, difficulty: diff }),
      });
    } catch {}
  }, []);

  const startGame = useCallback((diff: Difficulty) => {
    const cfg = DIFFICULTIES[diff];
    setRows(cfg.rows);
    setCols(cfg.cols);
    setTotalMines(cfg.mines);
    setFlags(0);
    setTime(0);
    setStarted(false);
    setLostCell(null);
    setGrid(createGrid(cfg.rows, cfg.cols));
    setDifficulty(diff);
    setPhase('playing');
  }, []);

  const handleReveal = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const g = prev.map(row => row.map(cell => ({ ...cell })));
      if (!started) {
        placeMines(g, rows, cols, totalMines, r, c);
        setStarted(true);
      }
      const cell = g[r][c];
      if (cell.revealed || cell.flagged) return prev;
      if (cell.mine) {
        cell.revealed = true;
        setLostCell(`${r},${c}`);
        // Reveal all mines
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            if (g[rr][cc].mine) g[rr][cc].revealed = true;
          }
        }
        setPhase('lost');
        return g;
      }
      floodReveal(g, rows, cols, r, c);
      if (checkWin(g, rows, cols, totalMines)) {
        setPhase('won');
      }
      return g;
    });
  }, [started, rows, cols, totalMines]);

  const handleFlag = useCallback((r: number, c: number) => {
    if (!started) return;
    setGrid(prev => {
      const g = prev.map(row => row.map(cell => ({ ...cell })));
      const cell = g[r][c];
      if (cell.revealed) return prev;
      if (cell.flagged) {
        cell.flagged = false;
        setFlags(f => f - 1);
      } else {
        cell.flagged = true;
        setFlags(f => f + 1);
      }
      return g;
    });
  }, [started]);

  // End game score submission (only submit on win, lost games must not overwrite record)
  useEffect(() => {
    if (phase === 'won') {
      submitScore(time, difficulty);
    }
  }, [phase, time, difficulty, submitScore]);

  const handleTouchStart = useCallback((r: number, c: number) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      handleFlag(r, c);
    }, 500);
  }, [handleFlag]);

  const handleTouchEnd = useCallback((r: number, c: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!isLongPress.current) handleReveal(r, c);
  }, [handleReveal]);

  const handleContextMenu = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    handleFlag(r, c);
  }, [handleFlag]);

  // Settings phase
  if (phase === 'settings') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-2 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />返回</Button>
            <GameControlsHelp info={minesweeperControlsInfo} />
          </div>
          <Card className="p-4"><CardContent className="p-0 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-2">💣</div>
              <h2 className="text-2xl font-bold">扫雷</h2>
            </div>
            <div className="space-y-3">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => {
                const cfg = DIFFICULTIES[d];
                const best = bestScores[d];
                return (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      difficulty === d ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-primary/40'
                    }`}>
                    <div className="font-semibold">{cfg.label}</div>
                    <div className="text-sm text-muted-foreground">{cfg.sub}</div>
                    {best != null && <div className="text-sm mt-1 flex items-center gap-1 text-amber-600"><Trophy className="h-3 w-3" />最快: {best}秒</div>}
                  </button>
                );
              })}
            </div>
            <Button className="w-full" size="lg" onClick={() => startGame(difficulty)}>开始游戏</Button>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  // Playing / won / lost phase
  const cellSize = cols > 20 ? 'w-7 h-7 text-xs' : cols > 12 ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  const remaining = totalMines - flags;

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <div className="w-full max-w-5xl py-2 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />返回</Button>
          <div className="text-lg font-bold">💣 扫雷</div>
          <div className="w-16" />
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-6 mb-4 text-lg font-mono font-bold">
          <div className="flex items-center gap-1">
            <span>🚩</span>
            <span className={remaining < 0 ? 'text-red-600' : ''}>{remaining}</span>
          </div>
          <div className="text-xl">{phase === 'won' ? '😊' : phase === 'lost' ? '😵' : '🙂'}</div>
          <div className="flex items-center gap-1">
            <span>⏱</span>
            <span>{time}</span>
          </div>
        </div>

        {/* Grid */}
        <div ref={gridRef} className={`overflow-x-auto max-w-full pb-2 ${phase !== 'playing' ? 'pointer-events-none opacity-90' : ''}`}>
          <div className="inline-grid gap-px bg-gray-400 border-2 border-gray-500 shadow-lg"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {grid.map((row, r) => row.map((cell, c) => {
              const isLost = lostCell === `${r},${c}`;
              if (cell.revealed && cell.mine) {
                return (
                  <div key={`${r}-${c}`} className={`${cellSize} flex items-center justify-center select-none font-bold ${
                    isLost ? 'bg-red-500' : 'bg-gray-300'
                  }`}>💣</div>
                );
              }
              if (cell.revealed) {
                if (cell.adjacent === 0) {
                  return <div key={`${r}-${c}`} className={`${cellSize} bg-gray-100`} />;
                }
                return (
                  <div key={`${r}-${c}`} className={`${cellSize} bg-gray-100 flex items-center justify-center select-none font-bold ${NUM_COLORS[cell.adjacent] || 'text-gray-800'}`}>
                    {cell.adjacent}
                  </div>
                );
              }
              if (cell.flagged) {
                return (
                  <div key={`${r}-${c}`} className={`${cellSize} flex items-center justify-center select-none bg-gray-300 border-l-[3px] border-t-[3px] border-l-white border-t-white border-r-[3px] border-b-[3px] border-r-gray-400 border-b-gray-400`}>🚩</div>
                );
              }
              return (
                <div key={`${r}-${c}`} className={`${cellSize} flex items-center justify-center select-none bg-gray-300 border-l-[3px] border-t-[3px] border-l-white border-t-white border-r-[3px] border-b-[3px] border-r-gray-400 border-b-gray-400 cursor-pointer active:bg-gray-400`}
                  onClick={() => handleReveal(r, c)}
                  onContextMenu={e => handleContextMenu(e, r, c)}
                  onTouchStart={() => handleTouchStart(r, c)}
                  onTouchEnd={() => handleTouchEnd(r, c)}
                />
              );
            }))}
          </div>
        </div>

        {/* Game over overlay */}
        {(phase === 'won' || phase === 'lost') && (
          <div className="mt-6 text-center space-y-4 animate-in fade-in duration-300">
            <Card className="p-4 inline-block"><CardContent className="p-0 space-y-4">
              <div className="text-4xl">{phase === 'won' ? '🎉' : '💥'}</div>
              <h3 className="text-2xl font-bold">{phase === 'won' ? '胜利！' : '游戏结束'}</h3>
              <p className="text-muted-foreground">用时: {time}秒 · {DIFFICULTIES[difficulty].label}</p>
              <div className="flex gap-3">
                <Button onClick={() => startGame(difficulty)}>再来一局</Button>
                <Button variant="outline" onClick={onBack}>返回大厅</Button>
              </div>
            </CardContent></Card>
          </div>
        )}
      </div>
    </div>
  );
}
