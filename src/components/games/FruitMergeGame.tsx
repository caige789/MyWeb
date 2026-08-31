'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

const GAME_NAME = 'fruit-merge';
const W = 400, H = 600;
const DANGER_Y = 100;
const DROP_Y = 60;
const GRAVITY = 0.3;
const WALL_LEFT = 0;
const WALL_RIGHT = W;
const WALL_BOTTOM = H;
const FRICTION = 0.98;
const BOUNCE = 0.3;
const MERGE_BOUNCE = -3;
const SETTLE_THRESHOLD = 0.5;

const FRUIT_TYPES = [
  { emoji: '🍒', name: 'Cherry',   radius: 10 },
  { emoji: '🍇', name: 'Grape',    radius: 14 },
  { emoji: '🍊', name: 'Orange',   radius: 18 },
  { emoji: '🍋', name: 'Lemon',    radius: 22 },
  { emoji: '🍑', name: 'Peach',    radius: 26 },
  { emoji: '🍅', name: 'Tomato',   radius: 30 },
  { emoji: '🥝', name: 'Kiwi',     radius: 34 },
  { emoji: '🍎', name: 'Apple',    radius: 38 },
  { emoji: '🍐', name: 'Pear',     radius: 42 },
  { emoji: '🥥', name: 'Coconut',  radius: 46 },
  { emoji: '🍉', name: 'Watermelon', radius: 50 },
];

const FRUIT_COLORS = [
  '#ef4444', '#8b5cf6', '#f97316', '#facc15', '#fb923c',
  '#dc2626', '#84cc16', '#22c55e', '#a3e635', '#92400e', '#16a34a',
];

interface Fruit {
  x: number; y: number; vx: number; vy: number;
  radius: number; type: number; settled: boolean;
  mergeAnim: number; // countdown for merge pop animation
}

interface FloatText {
  x: number; y: number; text: string; color: string; life: number;
}

interface Props { onBack: () => void; }

type Phase = 'idle' | 'playing' | 'over';

const fruitMergeControlsInfo: GameControlsInfo = {
  gameName: '合成大西瓜',
  desktop: [
    { action: '移动', keys: ['Mouse'], description: '移动鼠标控制水果水平位置' },
    { action: '投放', keys: ['Click'], description: '点击鼠标投放水果' },
  ],
  mobile: [
    { action: '移动', keys: [], description: '在画布上滑动手指控制水果水平位置' },
    { action: '投放', keys: [], description: '抬起手指释放水果' },
  ],
  rules: [
    '从顶部投放水果，相同水果碰撞会合成更大的水果',
    '合成序列: 樱桃→葡萄→橙子→柠檬→桃子→番茄→猕猴桃→苹果→梨→椰子→西瓜',
    '每次合成得分 = 水果等级 × 10',
    '水果超过顶部危险线则游戏结束',
  ],
  tips: [
    '尽量把相同的水果堆在一起，提高合成效率',
    '大水果很占空间，避免过早产生',
    '利用小水果填缝，保持堆叠稳定',
  ],
};

function randomLowFruit(): number {
  // Random fruit from the first 5 types (cherry to peach)
  return Math.floor(Math.random() * 5);
}

export default function FruitMergeGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [nextFruitType, setNextFruitType] = useState(randomLowFruit);

  const g = useRef({
    fruits: [] as Fruit[],
    floats: [] as FloatText[],
    currentType: randomLowFruit(),
    nextType: randomLowFruit(),
    dropX: W / 2,
    canDrop: true,
    score: 0,
    frame: 0,
    phase: 'idle' as Phase,
    gameOverChecked: false,
  }).current;

  const fetchBest = useCallback(async () => {
    try {
      const r = await fetch('/api/games/scores');
      const d = await r.json();
      if (d.data) {
        const e = d.data.find((s: { game: string; score: number }) => s.game === GAME_NAME);
        setBestScore(e ? e.score : 0);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { fetchBest(); }, [fetchBest]);

  const submitScore = useCallback(async (s: number) => {
    try {
      await fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_NAME, score: s }),
      });
    } catch { /* ignore */ }
    fetchBest();
  }, [fetchBest]);

  const startGame = useCallback(() => {
    g.fruits = [];
    g.floats = [];
    g.currentType = randomLowFruit();
    g.nextType = randomLowFruit();
    g.dropX = W / 2;
    g.canDrop = true;
    g.score = 0;
    g.frame = 0;
    g.phase = 'playing';
    g.gameOverChecked = false;
    setPhase('playing');
    setScore(0);
    setNextFruitType(g.nextType);
  }, []);

  const endGame = useCallback(() => {
    g.phase = 'over';
    setPhase('over');
    submitScore(g.score);
  }, [submitScore]);

  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    g.floats.push({ x, y, text, color, life: 50 });
  }, []);

  const dropFruit = useCallback(() => {
    if (!g.canDrop || g.phase !== 'playing') return;
    const r = FRUIT_TYPES[g.currentType].radius;
    const fruit: Fruit = {
      x: Math.max(r, Math.min(W - r, g.dropX)),
      y: DROP_Y,
      vx: 0, vy: 0,
      radius: r,
      type: g.currentType,
      settled: false,
      mergeAnim: 0,
    };
    g.fruits.push(fruit);
    g.currentType = g.nextType;
    g.nextType = randomLowFruit();
    setNextFruitType(g.nextType);
    g.canDrop = false;
    // Allow next drop after a short delay
    setTimeout(() => { g.canDrop = true; }, 300);
  }, []);

  const getCanvasPos = useCallback((clientX: number): number => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return W / 2;
    return ((clientX - rect.left) / rect.width) * W;
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    function physicsStep() {
      const fruits = g.fruits;

      // Update positions
      for (const f of fruits) {
        if (f.settled) continue;
        if (f.mergeAnim > 0) { f.mergeAnim--; continue; }

        f.vy += GRAVITY;
        f.vx *= FRICTION;
        f.x += f.vx;
        f.y += f.vy;

        // Wall collisions
        if (f.x - f.radius < WALL_LEFT) {
          f.x = WALL_LEFT + f.radius;
          f.vx = -f.vx * BOUNCE;
        }
        if (f.x + f.radius > WALL_RIGHT) {
          f.x = WALL_RIGHT - f.radius;
          f.vx = -f.vx * BOUNCE;
        }
        if (f.y + f.radius > WALL_BOTTOM) {
          f.y = WALL_BOTTOM - f.radius;
          f.vy = -f.vy * BOUNCE;
          f.vx *= 0.95;
        }
      }

      // Fruit-to-fruit collision
      const mergePairs: [number, number][] = [];
      for (let i = 0; i < fruits.length; i++) {
        for (let j = i + 1; j < fruits.length; j++) {
          const a = fruits[i];
          const b = fruits[j];
          if (a.mergeAnim > 0 || b.mergeAnim > 0) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          if (dist < minDist && dist > 0.01) {
            if (a.type === b.type && a.type < 10) {
              // Same type: merge
              mergePairs.push([i, j]);
            } else {
              // Different type: push apart
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = minDist - dist;

              const aSettled = a.settled;
              const bSettled = b.settled;

              if (aSettled && bSettled) continue;

              if (aSettled) {
                b.x += nx * overlap;
                b.y += ny * overlap;
                b.vx = nx * 2;
                b.vy = ny * 2;
                b.settled = false;
              } else if (bSettled) {
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                a.vx = -nx * 2;
                a.vy = -ny * 2;
                a.settled = false;
              } else {
                const half = overlap / 2;
                a.x -= nx * half;
                a.y -= ny * half;
                b.x += nx * half;
                b.y += ny * half;
                // Simple elastic response
                const relVx = a.vx - b.vx;
                const relVy = a.vy - b.vy;
                const dot = relVx * nx + relVy * ny;
                if (dot > 0) {
                  a.vx -= nx * dot * 0.5;
                  a.vy -= ny * dot * 0.5;
                  b.vx += nx * dot * 0.5;
                  b.vy += ny * dot * 0.5;
                }
              }
            }
          }
        }
      }

      // Process merges (reverse order to keep indices valid)
      const merged = new Set<number>();
      for (const [i, j] of mergePairs) {
        if (merged.has(i) || merged.has(j)) continue;
        merged.add(i);
        merged.add(j);
        const a = fruits[i];
        const b = fruits[j];
        const newType = a.type + 1;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const newFruit: Fruit = {
          x: mx, y: my, vx: 0, vy: MERGE_BOUNCE,
          radius: FRUIT_TYPES[newType].radius,
          type: newType, settled: false, mergeAnim: 12,
        };
        g.fruits.push(newFruit);
        const pts = (newType) * 10;
        g.score += pts;
        setScore(g.score);
        addFloat(mx, my, `+${pts}`, FRUIT_COLORS[newType]);
      }
      // Remove merged fruits (reverse order)
      const toRemove = Array.from(merged).sort((a, b) => b - a);
      for (const idx of toRemove) {
        g.fruits.splice(idx, 1);
      }

      // Settle check
      for (const f of fruits) {
        if (f.settled || f.mergeAnim > 0) continue;
        if (Math.abs(f.vy) < SETTLE_THRESHOLD && Math.abs(f.vx) < SETTLE_THRESHOLD) {
          // Check if resting on bottom or another fruit
          const onBottom = f.y + f.radius >= WALL_BOTTOM - 2;
          let onFruit = false;
          if (!onBottom) {
            for (const other of fruits) {
              if (other === f || other.mergeAnim > 0) continue;
              const dx = other.x - f.x;
              const dy = other.y - f.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < f.radius + other.radius + 2) {
                if (other.y > f.y) { onFruit = true; break; }
              }
            }
          }
          if (onBottom || onFruit) {
            f.vy = 0; f.vx = 0;
            f.settled = true;
          }
        }
      }

      // Wake up settled fruits if something above pushes them
      // (simplified: just check if a non-settled fruit is pushing on settled ones)
    }

    function checkGameOver() {
      for (const f of g.fruits) {
        if (f.mergeAnim > 0) continue;
        // Give newly dropped fruits a grace period
        if (f.y - f.radius < DANGER_Y && g.frame > 30) {
          // Make sure it's not just passing through
          if (f.settled || Math.abs(f.vy) < 2) {
            return true;
          }
        }
      }
      return false;
    }

    function draw() {
      if (!ctx) return;
      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#fef9c3');
      bgGrad.addColorStop(1, '#fefce8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Container walls
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, DANGER_Y);
      ctx.lineTo(0, H);
      ctx.lineTo(W, H);
      ctx.lineTo(W, DANGER_Y);
      ctx.stroke();

      // Danger line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, DANGER_Y);
      ctx.lineTo(W, DANGER_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Danger zone fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
      ctx.fillRect(0, 0, W, DANGER_Y);

      // Drop preview line
      if (g.canDrop) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(g.dropX, DROP_Y);
        ctx.lineTo(g.dropX, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current fruit at drop position
        const cType = FRUIT_TYPES[g.currentType];
        const cRadius = cType.radius;
        const cx = Math.max(cRadius, Math.min(W - cRadius, g.dropX));
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = FRUIT_COLORS[g.currentType];
        ctx.beginPath();
        ctx.arc(cx, DROP_Y, cRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = `${cRadius}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cType.emoji, cx, DROP_Y);
      }

      // Fruits
      for (const f of g.fruits) {
        if (f.mergeAnim > 0) {
          // Merge pop animation
          const progress = 1 - f.mergeAnim / 12;
          const scale = 0.5 + progress * 0.5;
          const alpha = 0.6 + progress * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = FRUIT_COLORS[f.type];
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.font = `${f.radius * scale}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(FRUIT_TYPES[f.type].emoji, f.x, f.y);
        } else {
          // Normal fruit draw
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.arc(f.x + 2, f.y + 2, f.radius, 0, Math.PI * 2);
          ctx.fill();

          // Body
          const grad = ctx.createRadialGradient(
            f.x - f.radius * 0.3, f.y - f.radius * 0.3, f.radius * 0.1,
            f.x, f.y, f.radius
          );
          grad.addColorStop(0, FRUIT_COLORS[f.type]);
          grad.addColorStop(1, adjustColor(FRUIT_COLORS[f.type], -30));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.fill();

          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(f.x - f.radius * 0.25, f.y - f.radius * 0.25, f.radius * 0.35, 0, Math.PI * 2);
          ctx.fill();

          // Emoji
          ctx.font = `${f.radius * 1.2}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(FRUIT_TYPES[f.type].emoji, f.x, f.y + 1);
        }
      }

      // Float texts
      for (const ft of g.floats) {
        ctx.globalAlpha = ft.life / 50;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, 32);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`分数: ${g.score}`, 10, 16);

      // Next fruit preview in HUD
      ctx.textAlign = 'right';
      ctx.font = '12px sans-serif';
      ctx.fillText('下一个:', W - 50, 10);
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.fillText(FRUIT_TYPES[g.nextType].emoji, W - 20, 20);
    }

    function loop() {
      if (g.phase !== 'playing') return;
      g.frame++;

      physicsStep();
      draw();

      // Update floats
      for (const ft of g.floats) { ft.y -= 1; ft.life--; }
      g.floats = g.floats.filter(ft => ft.life > 0);

      // Game over check (after grace period)
      if (g.frame > 60 && checkGameOver()) {
        draw(); // one last draw
        endGame();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, endGame, addFloat]);

  // Mouse/touch handlers for aiming and dropping
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (g.phase !== 'playing') return;
    e.preventDefault();
    let clientX: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? 0;
    } else {
      clientX = e.clientX;
    }
    g.dropX = getCanvasPos(clientX);
  }, [getCanvasPos]);

  const handleDrop = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (g.phase !== 'playing') return;
    e.preventDefault();
    dropFruit();
  }, [dropFruit]);

  const handleTouchEnd = useCallback(() => {
    if (g.phase !== 'playing') return;
    dropFruit();
  }, [dropFruit]);

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-2 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2 self-start w-full">
          <Button variant="ghost" size="icon" onClick={onBack} className="min-h-[44px] min-w-[44px]"><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-lg sm:text-xl font-bold">🍉 合成大西瓜</h2>
          <div className="ml-auto"><GameControlsHelp info={fruitMergeControlsInfo} /></div>
        </div>
        <div className="w-full bg-card border rounded-xl p-3 sm:p-4 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-4xl sm:text-5xl">🍉</p>
            <p className="text-xs sm:text-sm text-muted-foreground">投放水果，相同水果碰撞合成更大的水果！</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span>最高分: {bestScore}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1 text-xl sm:text-2xl">
            {FRUIT_TYPES.map(ft => (
              <span key={ft.name} title={ft.emoji}>{ft.emoji}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">🍒 → 🍇 → 🍊 → 🍋 → 🍑 → 🍅 → 🥝 → 🍎 → 🍐 → 🥥 → 🍉</p>
          <Button onClick={startGame} className="w-full min-h-[44px]" size="lg">开始游戏</Button>
        </div>
      </div>
    );
  }

  if (phase === 'over') {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-2 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2 self-start w-full">
          <Button variant="ghost" size="icon" onClick={onBack} className="min-h-[44px] min-w-[44px]"><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-lg sm:text-xl font-bold">游戏结束</h2>
        </div>
        <div className="w-full bg-card border rounded-xl p-4 flex flex-col items-center gap-3">
          <p className="text-4xl sm:text-5xl">{score > bestScore ? '🎉' : '🍈'}</p>
          <p className="text-2xl sm:text-3xl font-bold">{score}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">分数</p>
          <p className="text-xs sm:text-sm">最高: {bestScore}</p>
          {score > bestScore && score > 0 && <p className="text-yellow-500 font-bold text-sm sm:text-base">新纪录!</p>}
          <div className="flex gap-2 w-full mt-2">
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onBack}>返回</Button>
            <Button className="flex-1 min-h-[44px]" onClick={startGame}><RotateCcw className="h-4 w-4 mr-1" />重试</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 py-2 w-full max-w-lg mx-auto">
      <div className="flex items-center gap-2 w-full">
        <Button variant="ghost" size="icon" onClick={onBack} className="min-h-[44px] min-w-[44px] shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-sm sm:text-lg font-bold truncate">🍉 合成大西瓜</h2>
        <span className="ml-auto text-xs sm:text-sm font-medium tabular-nums shrink-0">{score}分</span>
        <div className="shrink-0"><GameControlsHelp info={fruitMergeControlsInfo} /></div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', maxWidth: W, aspectRatio: `${W}/${H}`, touchAction: 'none' }}
        className="rounded-lg border"
        onMouseMove={handlePointerMove}
        onMouseDown={handleDrop}
        onTouchMove={handlePointerMove}
        onTouchStart={handlePointerMove}
        onTouchEnd={handleTouchEnd}
      />
      <div className="flex items-center justify-center gap-3 text-sm">
        <span className="text-muted-foreground text-xs sm:text-sm">下一个:</span>
        <span className="text-xl sm:text-2xl">{FRUIT_TYPES[nextFruitType].emoji}</span>
      </div>
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}
