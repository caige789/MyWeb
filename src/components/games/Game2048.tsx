'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const game2048ControlsInfo: GameControlsInfo = {
  gameName: '2048',
  desktop: [
    { action: '方向键', keys: ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'], description: '滑动方块，相同数字合并' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续游戏' },
  ],
  mobile: [
    { action: '滑动', keys: [], description: '在游戏区域滑动手指' },
  ],
  rules: ['相同数字碰撞后合并为两倍', '每次操作后随机出现新方块(2或4)', '合并到2048即获胜，可继续挑战更高分'],
  tips: ['把最大数字固定在角落', '优先合并大数字，避免小数字散乱'],
};

interface Game2048Props {
  onBack: () => void;
}

/** 游戏名称（用于API） */
const GAME_NAME = '2048';
/** 网格尺寸 */
const GRID_SIZE = 4;
/** 出现动画时长（毫秒） */
const APPEAR_DURATION = 200;
/** 合并动画时长（毫秒） */
const MERGE_DURATION = 150;

/** 数字方块颜色映射表 */
const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  2:    { bg: '#eee4da', text: '#776e65' },
  4:    { bg: '#ede0c8', text: '#776e65' },
  8:    { bg: '#f2b179', text: '#f9f6f2' },
  16:   { bg: '#f59563', text: '#f9f6f2' },
  32:   { bg: '#f67c5f', text: '#f9f6f2' },
  64:   { bg: '#f65e3b', text: '#f9f6f2' },
  128:  { bg: '#edcf72', text: '#f9f6f2' },
  256:  { bg: '#edcc61', text: '#f9f6f2' },
  512:  { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2', glow: '0 0 30px 10px rgba(237,194,46,0.6)' },
};

/** 超过2048的方块颜色 */
const SUPER_TILE = { bg: '#3c3a32', text: '#f9f6f2' };

/** 获取方块样式 */
function getTileStyle(value: number): { background: string; color: string; boxShadow?: string } {
  const color = TILE_COLORS[value] || SUPER_TILE;
  return {
    background: color.bg,
    color: color.text,
    boxShadow: color.glow,
  };
}

/** 根据数字位数决定字体大小 */
function getTileFontSize(value: number): string {
  if (value < 100) return '2rem';
  if (value < 1000) return '1.6rem';
  if (value < 10000) return '1.3rem';
  return '1rem';
}

/** 生成一个4x4的空网格 */
function createEmptyGrid(): number[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

/** 在空位随机生成一个新数字（90%概率为2，10%概率为4） */
function addRandomTile(grid: number[][]): { grid: number[][]; row: number; col: number } {
  const emptyCells: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) emptyCells.push([r, c]);
    }
  }
  if (emptyCells.length === 0) return { grid, row: -1, col: -1 };

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newGrid = grid.map((r) => [...r]);
  newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
  return { grid: newGrid, row, col };
}

/** 向左滑动一行并合并，返回新行、得分增量和合并位置索引 */
function slideAndMergeRow(row: number[]): { newRow: number[]; score: number; mergedIndices: number[] } {
  // 过滤掉空格
  const filtered = row.filter((v) => v !== 0);
  const mergedIndices: number[] = [];
  const newRow: number[] = [];
  let score = 0;
  let i = 0;

  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      // 合并相邻相同的两个数字
      const merged = filtered[i] * 2;
      newRow.push(merged);
      mergedIndices.push(newRow.length - 1);
      score += merged;
      i += 2;
    } else {
      newRow.push(filtered[i]);
      i++;
    }
  }

  // 用0补齐到4位
  while (newRow.length < GRID_SIZE) newRow.push(0);
  return { newRow, score, mergedIndices };
}

/** 将网格顺时针旋转90度 */
function rotateGridCW(grid: number[][]): number[][] {
  const n = grid.length;
  const rotated: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = grid[r][c];
    }
  }
  return rotated;
}


/** 将坐标逆时针旋转90度 */
function rotateCoordCCW(r: number, c: number): [number, number] {
  return [GRID_SIZE - 1 - c, r];
}

/** 执行一次移动操作（使用旋转统一方向） */
function moveGrid(
  grid: number[][],
  direction: 'left' | 'right' | 'up' | 'down'
): { grid: number[][]; score: number; moved: boolean; mergedCells: Set<string> } {
  let rotations = 0;
  let currentGrid = grid.map((r) => [...r]);

  // 统一转换为向左移动，通过旋转网格实现
  switch (direction) {
    case 'left':  rotations = 0; break;
    case 'down':  rotations = 1; break;
    case 'right': rotations = 2; break;
    case 'up':    rotations = 3; break;
  }

  // 顺时针旋转到「向左」方向
  for (let i = 0; i < rotations; i++) {
    currentGrid = rotateGridCW(currentGrid);
  }

  // 逐行向左滑动合并
  let totalScore = 0;
  const mergedCells = new Set<string>();
  let moved = false;
  const processedGrid = currentGrid.map((row, rowIndex) => {
    const { newRow, score, mergedIndices } = slideAndMergeRow(row);
    totalScore += score;

    // 检查是否有变化
    if (row.some((v, i) => v !== newRow[i])) moved = true;

    // 记录合并位置，逆旋转回原始坐标
    mergedIndices.forEach((col) => {
      let r = rowIndex;
      let c = col;
      for (let i = 0; i < rotations; i++) {
        [r, c] = rotateCoordCCW(r, c);
      }
      mergedCells.add(`${r},${c}`);
    });

    return newRow;
  });

  // 旋转回原始方向
  let resultGrid = processedGrid;
  const backRotations = (4 - rotations) % 4;
  for (let i = 0; i < backRotations; i++) {
    resultGrid = rotateGridCW(resultGrid);
  }

  return { grid: resultGrid, score: totalScore, moved, mergedCells };
}

/** 检查游戏是否结束（无法再移动） */
function isGameOver(grid: number[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) return false;
      const val = grid[r][c];
      if (c + 1 < GRID_SIZE && grid[r][c + 1] === val) return false;
      if (r + 1 < GRID_SIZE && grid[r + 1][c] === val) return false;
    }
  }
  return true;
}

export default function Game2048({ onBack }: Game2048Props) {
  /** 游戏网格状态 */
  const [grid, setGrid] = useState<number[][]>(createEmptyGrid);
  /** 当前分数（用于UI渲染） */
  const [score, setScore] = useState<number>(0);
  /** 最高分 */
  const [highScore, setHighScore] = useState<number>(0);
  /** 是否正在加载最高分 */
  const [loadingHighScore, setLoadingHighScore] = useState<boolean>(true);
  /** 游戏是否结束 */
  const [gameOver, setGameOver] = useState<boolean>(false);
  /** 是否达到2048（胜利） */
  const [won, setWon] = useState<boolean>(false);
  /** 新出现的方块位置 */
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());
  /** 刚合并的方块位置 */
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set());
  /** 是否为新纪录 */
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const pausedRef = useRef<boolean>(false);

  /** 防止动画期间重复操作 */
  const isMovingRef = useRef<boolean>(false);
  /** 触摸起始坐标 */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  /** 分数引用（避免闭包陈旧值） */
  const scoreRef = useRef<number>(0);
  /** 最高分引用 */
  const highScoreRef = useRef<number>(0);
  /** 上一次提交的分数（避免重复提交） */
  const submittedScoreRef = useRef<number>(0);

  /** 初始化/重置游戏 */
  const initGame = useCallback(() => {
    let g = createEmptyGrid();
    const r1 = addRandomTile(g);
    g = r1.grid;
    const r2 = addRandomTile(g);
    g = r2.grid;

    const initialNewTiles = new Set<string>();
    if (r1.row >= 0) initialNewTiles.add(`${r1.row},${r1.col}`);
    if (r2.row >= 0) initialNewTiles.add(`${r2.row},${r2.col}`);

    setGrid(g);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setIsNewRecord(false);
    setNewTiles(initialNewTiles);
    setMergedTiles(new Set());
    scoreRef.current = 0;
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const handleMove = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      if (pausedRef.current) return;
      if (isMovingRef.current) return;

      // 使用函数式更新获取最新网格
      setGrid((prevGrid) => {
        if (isGameOver(prevGrid)) return prevGrid;

        const result = moveGrid(prevGrid, direction);
        if (!result.moved) return prevGrid; // 没有变化，不更新

        isMovingRef.current = true;

        // 添加新方块
        const { grid: newGrid, row, col } = addRandomTile(result.grid);

        // 更新分数
        const newScore = scoreRef.current + result.score;
        scoreRef.current = newScore;
        setScore(newScore);

        // 设置动画标记
        setNewTiles(new Set(row >= 0 ? [`${row},${col}`] : []));
        setMergedTiles(result.mergedCells);

        // 检查是否达到2048
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (newGrid[r][c] === 2048) setWon(true);
          }
        }

        // 检查游戏是否结束
        const over = isGameOver(newGrid);
        if (over) {
          setGameOver(true);
          // 延迟提交分数（等动画结束）
          const finalScore = newScore;
          setTimeout(async () => {
            if (finalScore > submittedScoreRef.current && finalScore > highScoreRef.current) {
              setIsNewRecord(true);
              try {
                const res = await fetch('/api/games/scores', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ game: GAME_NAME, score: finalScore }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.data?.score !== undefined) {
                    setHighScore(data.data.score);
                    highScoreRef.current = data.data.score;
                  }
                }
              } catch {
                // 网络异常时静默处理
              }
              submittedScoreRef.current = finalScore;
            }
          }, 300);
        }

        // 动画结束后清除标记
        setTimeout(() => {
          setNewTiles(new Set());
          setMergedTiles(new Set());
          isMovingRef.current = false;
        }, MERGE_DURATION + 30);

        return newGrid;
      });
    },
    [] // 不依赖任何状态，全部通过 ref 获取最新值
  );

  /** 获取最高分 */
  useEffect(() => {
    const fetchHighScore = async () => {
      try {
        const res = await fetch('/api/games/scores');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            const gameScore = data.data.find(
              (item: { game: string; score: number }) => item.game === GAME_NAME
            );
            if (gameScore) {
              setHighScore(gameScore.score);
              highScoreRef.current = gameScore.score;
              submittedScoreRef.current = gameScore.score;
            }
          }
        }
      } catch {
        // 网络异常时静默处理
      } finally {
        setLoadingHighScore(false);
      }
    };
    fetchHighScore();
  }, []);

  /** 初始化游戏 */
  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !gameOver) {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      if (pausedRef.current) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleMove('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleMove('right');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, gameOver]);

  /** 触摸开始事件 */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  /** 触摸结束事件，判断滑动方向 */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (pausedRef.current) return;
      const touchStart = touchStartRef.current;
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;

      // 最小滑动距离阈值
      const minSwipe = 30;
      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        handleMove(dx > 0 ? 'right' : 'left');
      } else {
        handleMove(dy > 0 ? 'down' : 'up');
      }

      touchStartRef.current = null;
    },
    [handleMove]
  );

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto py-2 gap-2">
      <div className="flex items-center justify-between w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回大厅
        </Button>
        <h2 className="text-lg font-bold tracking-wide">2048</h2>
        <GameControlsHelp info={game2048ControlsInfo} variant="button" />
      </div>

      <Card className="w-full border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">当前分数</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{score}</span>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" />
              最高分
            </span>
            <span className="text-2xl font-bold text-yellow-500 tabular-nums">
              {loadingHighScore ? '...' : highScore}
            </span>
          </div>
        </CardContent>
      </Card>

      <div
        className="relative w-full aspect-square max-w-[400px] rounded-xl overflow-hidden select-none"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 grid gap-3 p-3 rounded-xl"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            background: '#bbada0',
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-lg"
              style={{ background: 'rgba(238, 228, 218, 0.35)' }}
            />
          ))}
        </div>

        <div
          className="absolute inset-0 grid gap-3 p-3 rounded-xl"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}
        >
          {grid.map((row, r) =>
            row.map((value, c) => {
              const key = `${r},${c}`;
              const isNew = newTiles.has(key);
              const isMerged = mergedTiles.has(key);

              if (value === 0) {
                // 空格，渲染透明占位
                return <div key={key} />;
              }

              const style = getTileStyle(value);

              return (
                <div
                  key={key}
                  className="rounded-lg flex items-center justify-center font-bold"
                  style={{
                    ...style,
                    fontSize: getTileFontSize(value),
                    transition: `transform ${MERGE_DURATION}ms ease-in-out`,
                    transform: isMerged
                      ? 'scale(1.15)'
                      : isNew
                        ? 'scale(0)'
                        : 'scale(1)',
                    animation: isNew
                      ? `tile-appear ${APPEAR_DURATION}ms ease-out forwards`
                      : undefined,
                  }}
                >
                  {value}
                </div>
              );
            })
          )}
        </div>

        {gameOver && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center gap-3 z-10 animate-in fade-in duration-300">
            <p className="text-white text-2xl font-bold">游戏结束</p>
            {isNewRecord && (
              <p className="text-yellow-400 text-sm font-semibold animate-pulse">
                🎉 新纪录！
              </p>
            )}
            <p className="text-white/80 text-lg">得分: {score}</p>
            <Button
              onClick={initGame}
              size="lg"
              className="mt-2 font-semibold"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              再来一局
            </Button>
          </div>
        )}

        {won && !gameOver && (
          <div className="absolute inset-0 bg-yellow-400/30 rounded-xl flex flex-col items-center justify-center gap-3 z-10 animate-in fade-in duration-300">
            <p className="text-3xl font-black text-yellow-900">🎉 2048!</p>
            <p className="text-yellow-800 font-medium">恭喜你达成目标！</p>
            <Button
              onClick={() => setWon(false)}
              variant="secondary"
              size="sm"
              className="font-semibold"
            >
              继续挑战
            </Button>
          </div>
        )}

        {paused && !gameOver && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center gap-3 z-10 animate-in fade-in duration-300">
            <p className="text-white text-2xl font-bold">已暂停</p>
            <p className="text-white/70 text-sm">按 Esc 继续</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <Button
          onClick={initGame}
          size="lg"
          className="w-full max-w-xs text-base font-semibold"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          新游戏
        </Button>
      </div>

      <style jsx>{`
        @keyframes tile-appear {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
