'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Trophy,
  Clock,
  Footprints,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  Info,
} from 'lucide-react';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const mazeControlsInfo: GameControlsInfo = {
  gameName: '迷宫探险',
  desktop: [
    { action: '方向键', keys: ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'], description: '上下左右移动' },
    { action: 'WASD', keys: ['KeyW','KeyA','KeyS','KeyD'], description: '备选方向控制' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续游戏' },
  ],
  mobile: [
    { action: '滑动', keys: [], description: '在迷宫上滑动手指移动' },
    { action: '虚拟方向键', keys: [], description: '屏幕下方的方向按钮(手机端显示)' },
  ],
  rules: ['从左上角出发，到达右下角旗帜即获胜','迷雾模式下只能看到周围有限范围','用时越短分数越高','简单/普通/困难三种难度影响迷宫大小和迷雾范围'],
  tips: ['沿墙壁一侧走(右手法则)可保证不迷路','困难模式下优先探索分支少的路径'],
};

interface MazeGameProps {
  onBack: () => void;
}

// Game name for API
const GAME_NAME = 'maze';

// Difficulty settings: maze size and max time for scoring
const DIFFICULTY_CONFIG = {
  easy:   { rows: 11, cols: 11, label: '简单',   maxTime: 60,  maxScore: 1000, fogRadius: 4 },
  normal: { rows: 15, cols: 15, label: '普通', maxTime: 120, maxScore: 2000, fogRadius: 3 },
  hard:   { rows: 21, cols: 21, label: '困难',   maxTime: 240, maxScore: 3000, fogRadius: 2 },
} as const;

const LOGIC_SIZE = 500;

type Difficulty = keyof typeof DIFFICULTY_CONFIG;
type GamePhase = 'settings' | 'playing' | 'won';

// Wall = 0, Path = 1
const WALL = 0;
const PATH = 1;

// Generate maze using recursive backtracking (iterative stack to avoid stack overflow)
function generateMaze(rows: number, cols: number): number[][] {
  // Initialize grid with all walls
  const grid: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => WALL)
  );

  // Mark starting cell as path
  const startR = 1;
  const startC = 1;
  grid[startR][startC] = PATH;

  // Stack-based DFS
  const stack: [number, number][] = [[startR, startC]];
  const directions = [
    [-2, 0], // up
    [2, 0],  // down
    [0, -2], // left
    [0, 2],  // right
  ];

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];

    // Shuffle directions
    const shuffled = [...directions].sort(() => Math.random() - 0.5);

    let found = false;
    for (const [dr, dc] of shuffled) {
      const nr = cr + dr;
      const nc = cc + dc;

      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid[nr][nc] === WALL) {
        // Carve the wall between current and neighbor
        grid[cr + dr / 2][cc + dc / 2] = PATH;
        // Mark neighbor as path
        grid[nr][nc] = PATH;
        stack.push([nr, nc]);
        found = true;
        break;
      }
    }

    if (!found) {
      stack.pop();
    }
  }

  // Ensure start and end are open
  grid[1][1] = PATH;
  grid[rows - 2][cols - 2] = PATH;

  return grid;
}

export default function MazeGame({ onBack }: MazeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // Game data refs (mutable to avoid re-renders during gameplay)
  const mazeRef = useRef<number[][]>([]);
  const playerRef = useRef({ r: 1, c: 1 });
  const visitedRef = useRef<Set<string>>(new Set());
  const trailRef = useRef<[number, number][]>([]);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const stepsRef = useRef<number>(0);
  const gamePhaseRef = useRef<GamePhase>('settings');
  const difficultyRef = useRef<Difficulty>('normal');
  const fogEnabledRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dprRef = useRef(1);
  const scaleRef = useRef(1);

  // UI state
  const [phase, setPhase] = useState<GamePhase>('settings');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [fogEnabled, setFogEnabled] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Fetch high score
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/games/scores');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            const mazeScore = data.data.find(
              (item: { game: string; score: number }) => item.game === GAME_NAME
            );
            if (mazeScore) setHighScore(mazeScore.score);
          }
        }
      } catch { /* silent */ }
    })();
  }, []);

  // --- Drawing ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maze = mazeRef.current;
    if (maze.length === 0) return;

    const rows = maze.length;
    const cols = maze[0].length;
    ctx.setTransform(dprRef.current * scaleRef.current, 0, 0, dprRef.current * scaleRef.current, 0, 0);
    const size = LOGIC_SIZE;
    const cellSize = LOGIC_SIZE / cols;
    const player = playerRef.current;
  
    const config = DIFFICULTY_CONFIG[difficultyRef.current];
  
    const exitR = rows - 2;
    const exitC = cols - 2;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Draw cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        const y = r * cellSize;

        // Fog of war check
        if (fogEnabledRef.current) {
          const dist = Math.abs(r - player.r) + Math.abs(c - player.c);
          if (dist > config.fogRadius) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x, y, cellSize, cellSize);
            continue;
          }
          // Partial fog at the edge
          if (dist === config.fogRadius) {
            ctx.globalAlpha = 0.4;
          }
        }

        const isVisited = visitedRef.current.has(`${r},${c}`);

        if (maze[r][c] === WALL) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, cellSize, cellSize);
          // Wall highlight
          ctx.fillStyle = '#334155';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        } else {
          // Path cell
          if (isVisited) {
            ctx.fillStyle = '#1a3a2a';
          } else {
            ctx.fillStyle = '#162032';
          }
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        ctx.globalAlpha = 1;
      }
    }

    // Draw trail (visited path with gradient)
    const trail = trailRef.current;
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const [pr, pc] = trail[i];
        const x = pc * cellSize + cellSize / 2;
        const y = pr * cellSize + cellSize / 2;
        const prevR = trail[i - 1][0];
        const prevC = trail[i - 1][1];
        const px = prevC * cellSize + cellSize / 2;
        const py = prevR * cellSize + cellSize / 2;

        // Fog check for trail
        if (fogEnabledRef.current) {
          const dist = Math.abs(pr - player.r) + Math.abs(pc - player.c);
          if (dist > config.fogRadius) continue;
          if (dist === config.fogRadius) ctx.globalAlpha = 0.4;
        }

        // Trail line with gradient from dim to bright
        const alpha = 0.2 + 0.6 * (i / trail.length);
        ctx.strokeStyle = `rgba(74, 222, 128, ${alpha})`;
        ctx.lineWidth = Math.max(cellSize * 0.3, 2);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.globalAlpha = 1;
      }
    }

    // Draw exit flag
    if (!fogEnabledRef.current || Math.abs(exitR - player.r) + Math.abs(exitC - player.c) <= config.fogRadius) {
      const fx = exitC * cellSize;
      const fy = exitR * cellSize;
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 300);
      ctx.fillStyle = `rgba(250, 204, 21, ${pulse * 0.3})`;
      ctx.fillRect(fx, fy, cellSize, cellSize);

      // Flag icon (triangle)
      const flagX = fx + cellSize * 0.3;
      const flagY = fy + cellSize * 0.2;
      const flagW = cellSize * 0.45;
      const flagH = cellSize * 0.35;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(flagX, flagY);
      ctx.lineTo(flagX + flagW, flagY + flagH / 2);
      ctx.lineTo(flagX, flagY + flagH);
      ctx.closePath();
      ctx.fill();

      // Flag pole
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = Math.max(1, cellSize * 0.08);
      ctx.beginPath();
      ctx.moveTo(flagX, flagY);
      ctx.lineTo(flagX, fy + cellSize * 0.85);
      ctx.stroke();
    }

    // Draw player
    const px = player.c * cellSize + cellSize / 2;
    const py = player.r * cellSize + cellSize / 2;
    const radius = Math.max(cellSize * 0.35, 3);

    // Player glow
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Player inner circle
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Combined game loop ref to avoid self-referencing callback
  const gameLoopFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    gameLoopFnRef.current = () => {
      if (gamePhaseRef.current !== 'playing') return;
      if (pausedRef.current) {
        draw();
        animFrameRef.current = requestAnimationFrame(gameLoopFnRef.current);
        return;
      }
      elapsedRef.current = (Date.now() - startTimeRef.current) / 1000;
      setElapsed(Math.floor(elapsedRef.current * 10) / 10);
      draw();
      animFrameRef.current = requestAnimationFrame(gameLoopFnRef.current);
    };
  }, [draw]);

  // Start game
  const startGame = useCallback((diff: Difficulty) => {
    const config = DIFFICULTY_CONFIG[diff];
    const maze = generateMaze(config.rows, config.cols);

    mazeRef.current = maze;
    playerRef.current = { r: 1, c: 1 };
    visitedRef.current = new Set(['1,1']);
    trailRef.current = [[1, 1]];
    stepsRef.current = 0;
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;
    gamePhaseRef.current = 'playing';
    pausedRef.current = false;
    setPaused(false);
    difficultyRef.current = diff;

    setDifficulty(diff);
    setSteps(0);
    setElapsed(0);
    setPhase('playing');

    // Cancel any previous animation frame
    cancelAnimationFrame(animFrameRef.current);

    // Start game loop
    gameLoopFnRef.current();
  }, []);

  // Move player
  const movePlayer = useCallback((dr: number, dc: number) => {
    if (gamePhaseRef.current !== 'playing') return;
    if (pausedRef.current) return;

    const maze = mazeRef.current;
    const player = playerRef.current;
    const nr = player.r + dr;
    const nc = player.c + dc;

    // Bounds check
    if (nr < 0 || nr >= maze.length || nc < 0 || nc >= maze[0].length) return;
    // Wall check
    if (maze[nr][nc] === WALL) return;

    player.r = nr;
    player.c = nc;
    stepsRef.current += 1;
    setSteps(stepsRef.current);

    const key = `${nr},${nc}`;
    visitedRef.current.add(key);
    trailRef.current.push([nr, nc]);

    // Check win condition
    const rows = maze.length;
    const cols = maze[0].length;
    if (nr === rows - 2 && nc === cols - 2) {
      // Win!
      gamePhaseRef.current = 'won';
      cancelAnimationFrame(animFrameRef.current);

      const finalTime = (Date.now() - startTimeRef.current) / 1000;
      elapsedRef.current = finalTime;
      setElapsed(Math.floor(finalTime * 10) / 10);

      // Calculate score
      const config = DIFFICULTY_CONFIG[difficultyRef.current];
      const timeRatio = Math.min(finalTime / config.maxTime, 1);
      const score = Math.round(config.maxScore * (1 - timeRatio));
      setFinalScore(Math.max(score, 10));

      setPhase('won');

      // Submit score
      const submitScore = Math.max(score, 10);
      fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_NAME, score: submitScore }),
      }).then((res) => {
        if (res.ok) return res.json();
      }).then((data) => {
        if (data?.data?.score !== undefined) {
          setHighScore(data.data.score);
        }
      }).catch(() => { /* silent */ });

      // Draw final frame
      draw();
    }
  }, [draw]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhaseRef.current !== 'playing') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        draw();
        return;
      }
      if (pausedRef.current) return;

      let dr = 0;
      let dc = 0;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': dr = -1; break;
        case 'ArrowDown': case 's': case 'S': dr = 1; break;
        case 'ArrowLeft': case 'a': case 'A': dc = -1; break;
        case 'ArrowRight': case 'd': case 'D': dc = 1; break;
        default: return;
      }
      e.preventDefault();
      movePlayer(dr, dc);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, draw]);

  // Swipe controls on canvas
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (gamePhaseRef.current !== 'playing') return;
    const start = touchStartRef.current;
    if (!start) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const minDist = 15;

    if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      movePlayer(0, dx > 0 ? 1 : -1);
    } else {
      movePlayer(dy > 0 ? 1 : -1, 0);
    }
    touchStartRef.current = null;
  }, [movePlayer]);

  // Canvas size setup (high DPI)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const update = () => {
      const dw = canvas.clientWidth;
      if (dw <= 0) return;
      const displaySize = Math.min(dw, LOGIC_SIZE);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = displaySize / LOGIC_SIZE;

      canvas.width = displaySize * dpr;
      canvas.height = displaySize * dpr;

      dprRef.current = dpr;
      scaleRef.current = scale;
      draw();
    };

    const ro = new ResizeObserver(update);
    ro.observe(container);
    const onVis = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVis);

    update();
    return () => { ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [draw]);

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // GamePlayer pause/resume events
  useEffect(() => {
    const onPause = () => { pausedRef.current = true; setPaused(true); };
    const onResume = () => { pausedRef.current = false; setPaused(false); };
    window.addEventListener('game-pause', onPause);
    window.addEventListener('game-resume', onResume);
    return () => {
      window.removeEventListener('game-pause', onPause);
      window.removeEventListener('game-resume', onResume);
    };
  }, []);

  // Toggle fog
  const toggleFog = useCallback(() => {
    fogEnabledRef.current = !fogEnabledRef.current;
    setFogEnabled(fogEnabledRef.current);
    if (gamePhaseRef.current === 'playing') draw();
  }, [draw]);

  // --- Format time display ---
  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== SETTINGS PHASE ====================
  if (phase === 'settings') {
    return (
      <div className="flex flex-col items-center w-full max-w-xl mx-auto">
        <div className="flex items-center justify-between w-full px-2 pt-2 pb-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h2 className="text-lg font-bold tracking-wide">迷宫探险</h2>
          <div className="w-16" />
        </div>

        <div className="w-full px-2 py-3 flex flex-col gap-6">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 flex flex-col gap-4">
              <h3 className="text-base font-semibold text-center">选择难度</h3>
              <div className="flex flex-col gap-3">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  const isSelected = difficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={
                        `w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5'
                        }`
                      }
                    >
                      <div className="flex flex-col gap-1">
                        <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{
                          { easy: '简单  11x11', normal: '普通  15x15', hard: '困难  21x21' }[d]
                        }</span>
                        <span className="text-xs text-muted-foreground">
                          最高分: {cfg.maxScore} | 时间限制: {cfg.maxTime}s
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Fog of war toggle */}
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {fogEnabled ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">战争迷雾</span>
                  <span className="text-xs text-muted-foreground">只显示附近格子</span>
                </div>
              </div>
              <button
                onClick={toggleFog}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  fogEnabled ? 'bg-primary' : 'bg-muted'
                }`}
                aria-label="切换迷雾模式"
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    fogEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </CardContent>
          </Card>

          {/* Instructions button */}
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setShowInstructions(!showInstructions)}>
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">操作说明</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
            </CardContent>
            {showInstructions && (
              <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground space-y-2">
                <p><strong className="text-foreground">电脑:</strong> 方向键或WASD移动</p>
                <p><strong className="text-foreground">手机:</strong> 在迷宫上滑动或使用下方虚拟方向键</p>
                <p>到达右下角的<Flag className="inline h-3 w-3 text-yellow-500" />旗帜即可获胜!</p>
                <p>用的时间越短，分数越高，加油!</p>
              </div>
            )}
          </Card>

          {/* High score display */}
          {highScore > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>最高分: <strong className="text-foreground">{highScore}</strong></span>
            </div>
          )}

          {/* Start button */}
          <Button
            onClick={() => startGame(difficulty)}
            size="lg"
            className="w-full text-base font-semibold"
          >
            <Play className="h-5 w-5 mr-2" />
            开始游戏
          </Button>
        </div>
      </div>
    );
  }

  // ==================== WON PHASE ====================
  if (phase === 'won') {
    const config = DIFFICULTY_CONFIG[difficulty];
    return (
      <div className="flex flex-col items-center w-full max-w-xl mx-auto">
        <div className="flex items-center justify-between w-full px-2 pt-2 pb-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h2 className="text-lg font-bold tracking-wide">迷宫探险</h2>
          <div className="w-16" />
        </div>

        <div className="w-full px-2 py-3 flex flex-col items-center gap-6">
          <div className="text-4xl">🎉</div>
          <h3 className="text-2xl font-bold">恭喜通关!</h3>
          <p className="text-muted-foreground">你逃出了{config.label}难度的迷宫!</p>

          <Card className="w-full border-border/50 bg-card/80">
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">用时</span>
                  </div>
                  <span className="text-xl font-bold tabular-nums">{formatTime(elapsed)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Footprints className="h-4 w-4" />
                    <span className="text-xs">步数</span>
                  </div>
                  <span className="text-xl font-bold tabular-nums">{steps}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs">分数</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-500 tabular-nums">{finalScore}</span>
                </div>
              </div>

              {finalScore >= highScore && finalScore > 0 && (
                <p className="text-sm font-semibold text-yellow-500 text-center animate-pulse">
                  新纪录!
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => startGame(difficulty)}
              size="lg"
              className="w-full text-base font-semibold"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              再来一局
            </Button>
            <Button variant="outline" onClick={() => setPhase('settings')} className="w-full">
              换个难度
            </Button>
            <Button variant="ghost" onClick={onBack} className="w-full">
              返回大厅
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PLAYING PHASE ====================
  const config = DIFFICULTY_CONFIG[difficulty];
  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      <div className="flex items-center justify-between w-full px-2 pt-2 pb-1">
        <Button variant="ghost" size="sm" onClick={() => {
          cancelAnimationFrame(animFrameRef.current);
          gamePhaseRef.current = 'settings';
          setPhase('settings');
        }} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <h2 className="text-lg font-bold tracking-wide">迷宫 - {config.label}</h2>
        <div className="w-16" />
      </div>

      {/* Stats bar */}
      <div className="w-full px-2 mb-2">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold tabular-nums">{formatTime(elapsed)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Footprints className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold tabular-nums">{steps}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold tabular-nums text-yellow-500">{highScore}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full flex justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-border/30 shadow-lg"
          style={{ width: '100%', maxWidth: LOGIC_SIZE, aspectRatio: '1/1', touchAction: 'none' }}
        />
      </div>

      {/* Mobile D-pad */}
      <div className="grid grid-cols-3 gap-2 w-40 mt-4 md:hidden">
        <div />
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => { e.stopPropagation(); movePlayer(-1, 0); }}
          onMouseDown={() => movePlayer(-1, 0)}
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
        <div />
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => { e.stopPropagation(); movePlayer(0, -1); }}
          onMouseDown={() => movePlayer(0, -1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => { e.stopPropagation(); movePlayer(1, 0); }}
          onMouseDown={() => movePlayer(1, 0)}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => { e.stopPropagation(); movePlayer(0, 1); }}
          onMouseDown={() => movePlayer(0, 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
