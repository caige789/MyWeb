'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

const GAME_NAME = 'dungeon';
const W = 480, H = 480;
const GRID = 20;
const CELL = W / GRID; // 24px
const VISION = 3;

const WALL = 0;
const FLOOR = 1;

type MonsterType = 'slime' | 'skeleton' | 'ghost' | 'dragon';
type ItemType = 'health' | 'sword' | 'shield' | 'key';
type Phase = 'idle' | 'playing' | 'over';

interface Monster {
  x: number; y: number; type: MonsterType;
  hp: number; maxHp: number; atk: number; def: number;
  emoji: string;
}

interface DItem {
  x: number; y: number; type: ItemType; emoji: string;
}

interface FloatText {
  x: number; y: number; text: string; color: string; life: number; maxLife: number;
}

const dungeonControlsInfo: GameControlsInfo = {
  gameName: '地牢探险',
  desktop: [
    { action: '方向键', keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], description: '上下左右移动' },
    { action: 'WASD', keys: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], description: '备选方向控制' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续游戏' },
  ],
  mobile: [
    { action: '虚拟方向键', keys: [], description: '屏幕下方的方向按钮' },
  ],
  rules: [
    '找到钥匙🔑打开门🚪进入下一层',
    '走进怪物即可发起攻击，也会受到反击',
    '收集道具提升属性：药水回血、剑加攻击、盾加防御',
    '共5层地牢，每层难度递增',
    '战争迷雾：只能看到已探索的区域',
  ],
  tips: [
    '先探索收集道具再去打强力怪物',
    '药水要留到关键时刻使用',
    '龙🐉是Boss，攻击力和血量都很高，小心应对',
  ],
};

// Create monster with floor-scaled stats
function makeMonster(type: MonsterType, x: number, y: number, floor: number): Monster {
  const f = floor;
  const s = {
    slime:    { hp: 6 + f * 2,  atk: 1 + f,  def: 0,                 emoji: '🟢' },
    skeleton: { hp: 8 + f * 3,  atk: 2 + f,  def: Math.floor(f / 2), emoji: '💀' },
    ghost:    { hp: 7 + f * 2,  atk: 3 + f,  def: 0,                 emoji: '👻' },
    dragon:   { hp: 20 + f * 5, atk: 5 + f,  def: 1,                 emoji: '🐉' },
  }[type];
  return { x, y, type, ...s, maxHp: s.hp };
}

// Generate dungeon for a given floor
function generateDungeon(floor: number) {
  const grid: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(WALL));
  const targetRooms = Math.min(4 + Math.floor((floor + 1) / 2), 7);
  const rooms: { x: number; y: number; w: number; h: number }[] = [];

  // Place rooms with no overlap (1-tile padding)
  for (let attempt = 0; attempt < 300 && rooms.length < targetRooms; attempt++) {
    const w = 3 + Math.floor(Math.random() * 4);
    const h = 3 + Math.floor(Math.random() * 4);
    const x = 1 + Math.floor(Math.random() * (GRID - w - 2));
    const y = 1 + Math.floor(Math.random() * (GRID - h - 2));
    let ok = true;
    for (const r of rooms) {
      if (x - 1 < r.x + r.w && x + w + 1 > r.x && y - 1 < r.y + r.h && y + h + 1 > r.y) {
        ok = false; break;
      }
    }
    if (ok) rooms.push({ x, y, w, h });
  }

  if (rooms.length < 2) return generateDungeon(floor);

  // Carve rooms into the grid
  for (const r of rooms) {
    for (let ry = r.y; ry < r.y + r.h; ry++)
      for (let rx = r.x; rx < r.x + r.w; rx++)
        grid[ry][rx] = FLOOR;
  }

  // Connect consecutive rooms with L-shaped corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2), ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);
    if (Math.random() > 0.5) {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grid[ay][x] = FLOOR;
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grid[y][bx] = FLOOR;
    } else {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grid[y][ax] = FLOOR;
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grid[by][x] = FLOOR;
    }
  }

  // Player start: center of first room
  const sr = rooms[0];
  const px = Math.floor(sr.x + sr.w / 2);
  const py = Math.floor(sr.y + sr.h / 2);

  // Door: center of last room
  const lr = rooms[rooms.length - 1];
  const doorX = Math.floor(lr.x + lr.w / 2);
  const doorY = Math.floor(lr.y + lr.h / 2);

  // Collect available floor tiles (excluding start room, player pos, door pos)
  const available: { x: number; y: number }[] = [];
  for (let cy = 0; cy < GRID; cy++) {
    for (let cx = 0; cx < GRID; cx++) {
      if (grid[cy][cx] !== FLOOR) continue;
      if (cx === px && cy === py) continue;
      if (cx === doorX && cy === doorY) continue;
      if (cx >= sr.x && cx < sr.x + sr.w && cy >= sr.y && cy < sr.y + sr.h) continue;
      available.push({ x: cx, y: cy });
    }
  }

  // Shuffle available tiles
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  let idx = 0;

  // Place key
  const keyPos = available[idx++];
  const items: DItem[] = [
    { x: keyPos.x, y: keyPos.y, type: 'key', emoji: '🔑' },
  ];

  // Place other items (health potions, swords, shields)
  const numItems = 2 + Math.floor(floor / 2);
  const itemPool: ItemType[] = ['health', 'sword', 'shield'];
  for (let i = 0; i < numItems && idx < available.length; i++) {
    const type = itemPool[Math.floor(Math.random() * itemPool.length)];
    const pos = available[idx++];
    const emoji = type === 'health' ? '❤️' : type === 'sword' ? '⚔️' : '🛡️';
    items.push({ x: pos.x, y: pos.y, type, emoji });
  }

  // Place monsters
  const monsters: Monster[] = [];
  const numMonsters = 3 + floor * 2;
  for (let i = 0; i < numMonsters && idx < available.length; i++) {
    const pos = available[idx++];
    const r = Math.random();
    let type: MonsterType;
    if (floor >= 3 && r < 0.1) type = 'dragon';
    else if (floor >= 3 && r < 0.3) type = 'ghost';
    else if (floor >= 2 && r < 0.55) type = 'skeleton';
    else type = 'slime';
    monsters.push(makeMonster(type, pos.x, pos.y, floor));
  }

  // Guarantee at least 1 dragon on floor 3+
  if (floor >= 3 && !monsters.some(m => m.type === 'dragon')) {
    const ri = monsters.findIndex(m => m.type === 'slime' || m.type === 'skeleton');
    if (ri >= 0) {
      monsters[ri] = makeMonster('dragon', monsters[ri].x, monsters[ri].y, floor);
    }
  }

  return { grid, px, py, doorX, doorY, monsters, items };
}

export default function DungeonGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [floor, setFloor] = useState(1);
  const [hp, setHp] = useState(30);
  const [maxHp, setMaxHp] = useState(30);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [paused, setPaused] = useState(false);
  const [victory, setVictory] = useState(false);
  const [monstersKilled, setMonstersKilled] = useState(0);

  const g = useRef({
    grid: [] as number[][],
    floor: 1,
    px: 1, py: 1,
    hp: 30, maxHp: 30, atk: 5, def: 1,
    hasKey: false,
    monsters: [] as Monster[],
    items: [] as DItem[],
    doorX: 1, doorY: 1,
    seen: new Set<string>(),
    monstersKilled: 0,
    score: 0,
    phase: 'idle' as Phase,
    paused: false,
    victory: false,
    floats: [] as FloatText[],
  }).current;

  const fetchBest = useCallback(async () => {
    try {
      const r = await fetch('/api/games/scores');
      const d = await r.json();
      if (d.data) {
        const e = d.data.find((s: { game: string; score: number }) => s.game === GAME_NAME);
        setBestScore(e ? e.score : 0);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchBest(); }, [fetchBest]);

  const submitScore = useCallback(async (s: number) => {
    try {
      await fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_NAME, score: s }),
      });
    } catch { /* */ }
    fetchBest();
  }, [fetchBest]);

  const addFloat = useCallback((x: number, y: number, text: string, color: string, life = 40) => {
    g.floats.push({ x: x * CELL + CELL / 2, y: y * CELL, text, color, life, maxLife: life });
  }, []);

  const endGame = useCallback((win: boolean) => {
    g.phase = 'over'; g.victory = win;
    const s = g.floor * 100 + g.monstersKilled * 10;
    g.score = s;
    setPhase('over'); setScore(s); setVictory(win);
    submitScore(s);
  }, [submitScore]);

  const initFloor = useCallback((fl: number, keepStats: boolean) => {
    const d = generateDungeon(fl);
    g.grid = d.grid; g.px = d.px; g.py = d.py;
    g.doorX = d.doorX; g.doorY = d.doorY;
    g.monsters = d.monsters; g.items = d.items;
    g.seen = new Set<string>();

    if (!keepStats) {
      g.hp = 30; g.maxHp = 30; g.atk = 5; g.def = 1;
      g.hasKey = false; g.monstersKilled = 0; g.victory = false;
    } else {
      g.hasKey = false;
      const heal = Math.floor(g.maxHp * 0.3);
      g.hp = Math.min(g.hp + heal, g.maxHp);
    }

    g.floor = fl;
    // Reveal area around player start
    for (let dy = -VISION; dy <= VISION; dy++)
      for (let dx = -VISION; dx <= VISION; dx++) {
        const nx = g.px + dx, ny = g.py + dy;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) g.seen.add(`${nx},${ny}`);
      }
    g.floats.push({ x: W / 2, y: H / 2, text: `第 ${fl} 层`, color: '#fbbf24', life: 60, maxLife: 60 });

    setFloor(fl); setHp(g.hp); setMaxHp(g.maxHp); setHasKey(false);
    setScore(g.floor * 100 + g.monstersKilled * 10);
  }, []);

  const startGame = useCallback(() => {
    g.phase = 'playing'; g.paused = false; g.floats = [];
    setPhase('playing'); setPaused(false); setVictory(false);
    initFloor(1, false);
  }, [initFloor]);

  // Main movement and interaction logic
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (g.phase !== 'playing' || g.paused) return;
    const nx = g.px + dx, ny = g.py + dy;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return;
    if (g.grid[ny][nx] === WALL) return;

    // Check for monster at target position
    const mi = g.monsters.findIndex(m => m.x === nx && m.y === ny);
    if (mi >= 0) {
      const m = g.monsters[mi];
      const dmg = Math.max(1, g.atk - m.def);
      m.hp -= dmg;
      addFloat(nx, ny, `-${dmg}`, '#fbbf24');

      if (m.hp <= 0) {
        g.monsters.splice(mi, 1);
        g.monstersKilled++;
        setMonstersKilled(g.monstersKilled);
        addFloat(nx, ny - 0.5, '击杀!', '#22c55e', 50);
        setScore(g.floor * 100 + g.monstersKilled * 10);
      } else {
        const cd = Math.max(1, m.atk - g.def);
        g.hp -= cd;
        addFloat(g.px, g.py, `-${cd}`, '#ef4444');
        setHp(g.hp);
        if (g.hp <= 0) { g.hp = 0; setHp(0); endGame(false); return; }
      }
      return;
    }

    // Move player to new position
    g.px = nx; g.py = ny;
    for (let ddy = -VISION; ddy <= VISION; ddy++)
      for (let ddx = -VISION; ddx <= VISION; ddx++) {
        const rrx = nx + ddx, rry = ny + ddy;
        if (rrx >= 0 && rrx < GRID && rry >= 0 && rry < GRID) g.seen.add(`${rrx},${rry}`);
      }

    // Check for items at new position
    const ii = g.items.findIndex(it => it.x === nx && it.y === ny);
    if (ii >= 0) {
      const item = g.items[ii];
      g.items.splice(ii, 1);
      if (item.type === 'key') {
        g.hasKey = true; setHasKey(true);
        addFloat(nx, ny, '获得钥匙!', '#fbbf24', 50);
      } else if (item.type === 'health') {
        const heal = 15;
        g.hp = Math.min(g.hp + heal, g.maxHp);
        setHp(g.hp);
        addFloat(nx, ny, `+${heal} 生命`, '#22c55e');
      } else if (item.type === 'sword') {
        g.atk += 2;
        addFloat(nx, ny, '+2 攻击', '#f97316');
      } else if (item.type === 'shield') {
        g.def += 1;
        addFloat(nx, ny, '+1 防御', '#3b82f6');
      }
    }

    // Check for door at new position
    if (nx === g.doorX && ny === g.doorY) {
      if (g.hasKey) {
        if (g.floor >= 5) {
          endGame(true);
        } else {
          initFloor(g.floor + 1, true);
        }
      } else {
        addFloat(nx, ny, '需要钥匙!', '#ef4444', 50);
      }
    }
  }, [addFloat, endGame, initFloor]);

  // Canvas buffer resize for high-DPI and responsive sizing
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); };
  }, [phase]);

  // Canvas render loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function isVis(x: number, y: number) {
      return Math.abs(x - g.px) <= VISION && Math.abs(y - g.py) <= VISION;
    }

    function loop() {
      if (g.phase !== 'playing') return;
      if (!ctx || !canvas) return;

      // Scale logical W x H to canvas buffer
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Draw all seen tiles
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const k = `${x},${y}`;
          if (!g.seen.has(k)) continue;
          const sx = x * CELL, sy = y * CELL;
          const vis = isVis(x, y);
          const v = ((x * 7 + y * 13) % 5) * 3;

          if (g.grid[y][x] === WALL) {
            ctx.fillStyle = vis ? `rgb(${58 + v},${58 + v},${72 + v})` : `rgb(${38 + v},${38 + v},${48 + v})`;
            ctx.fillRect(sx, sy, CELL, CELL);
            ctx.strokeStyle = vis ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx + 0.5, sy + 0.5, CELL - 1, CELL - 1);
          } else {
            ctx.fillStyle = vis ? `rgb(${120 + v},${108 + v},${88 + v})` : `rgb(${80 + v},${70 + v},${55 + v})`;
            ctx.fillRect(sx, sy, CELL, CELL);
            ctx.strokeStyle = vis ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx + 0.5, sy + 0.5, CELL - 1, CELL - 1);
          }
        }
      }

      // Draw door (if seen)
      if (g.seen.has(`${g.doorX},${g.doorY}`)) {
        const vis = isVis(g.doorX, g.doorY);
        ctx.globalAlpha = vis ? 1 : 0.5;
        ctx.font = `${CELL - 6}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🚪', g.doorX * CELL + CELL / 2, g.doorY * CELL + CELL / 2);
        ctx.globalAlpha = 1;
      }

      // Draw items (if seen)
      for (const item of g.items) {
        if (!g.seen.has(`${item.x},${item.y}`)) continue;
        const vis = isVis(item.x, item.y);
        ctx.globalAlpha = vis ? 1 : 0.5;
        ctx.font = `${CELL - 6}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, item.x * CELL + CELL / 2, item.y * CELL + CELL / 2);
        ctx.globalAlpha = 1;
      }

      // Draw monsters (visible only)
      for (const m of g.monsters) {
        if (!isVis(m.x, m.y)) continue;
        const mx = m.x * CELL, my = m.y * CELL;
        ctx.font = `${CELL - 4}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(m.emoji, mx + CELL / 2, my + CELL / 2);
        if (m.hp < m.maxHp) {
          const bw = CELL - 4, bh = 3;
          ctx.fillStyle = '#333';
          ctx.fillRect(mx + 2, my + 1, bw, bh);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(mx + 2, my + 1, bw * (m.hp / m.maxHp), bh);
        }
      }

      // Draw player
      {
        const ppx = g.px * CELL, ppy = g.py * CELL;
        ctx.fillStyle = 'rgba(251,191,36,0.2)';
        ctx.fillRect(ppx, ppy, CELL, CELL);
        ctx.font = `${CELL - 2}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⚔️', ppx + CELL / 2, ppy + CELL / 2 + 1);
      }

      // Fog overlay: darken seen-but-not-visible tiles
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          if (g.seen.has(`${x},${y}`) && !isVis(x, y)) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }

      // Draw floating texts
      for (let i = g.floats.length - 1; i >= 0; i--) {
        const f = g.floats[i];
        f.y -= 0.8; f.life--;
        if (f.life <= 0) { g.floats.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, f.life / (f.maxLife * 0.3));
        ctx.fillStyle = f.color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }

      // Pause overlay
      if (g.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('已暂停', W / 2, H / 2);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // Keyboard controls
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (g.phase !== 'playing') return;
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': e.preventDefault(); movePlayer(0, -1); break;
        case 'ArrowDown': case 'KeyS': e.preventDefault(); movePlayer(0, 1); break;
        case 'ArrowLeft': case 'KeyA': e.preventDefault(); movePlayer(-1, 0); break;
        case 'ArrowRight': case 'KeyD': e.preventDefault(); movePlayer(1, 0); break;
        case 'Escape': e.preventDefault(); g.paused = !g.paused; setPaused(g.paused); break;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [movePlayer]);

  // --- IDLE SCREEN ---
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-2 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2 self-start w-full">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-sm sm:text-xl font-bold">⚔️ 地牢探险</h2>
          <div className="ml-auto"><GameControlsHelp info={dungeonControlsInfo} /></div>
        </div>
        <div className="w-full bg-card border rounded-xl p-3 sm:p-4 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-3xl sm:text-4xl">🏰</p>
            <p className="text-sm text-muted-foreground">探索地牢，打败怪物，找到钥匙逃生天</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span>最高分: {bestScore}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">🟢</span><p className="mt-1">史莱姆</p></div>
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">💀</span><p className="mt-1">骷髅</p></div>
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">👻</span><p className="mt-1">幽灵</p></div>
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">🐉</span><p className="mt-1">巨龙</p></div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">❤️</span><p className="mt-1">药水</p></div>
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">⚔️</span><p className="mt-1">攻击</p></div>
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">🛡️</span><p className="mt-1">防御</p></div>
            <div className="bg-muted rounded-lg p-2 text-center"><span className="text-lg">🔑</span><p className="mt-1">钥匙</p></div>
          </div>
          <Button onClick={startGame} className="w-full min-h-[44px]" size="lg">开始游戏</Button>
        </div>
      </div>
    );
  }

  // --- GAME OVER SCREEN ---
  if (phase === 'over') {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-2 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2 self-start w-full">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-lg sm:text-xl font-bold">{victory ? '通关胜利!' : '游戏结束'}</h2>
        </div>
        <div className="w-full bg-card border rounded-xl p-3 sm:p-4 flex flex-col items-center gap-3">
          <p className="text-4xl sm:text-5xl">{victory ? '🏆' : '💀'}</p>
          <p className="text-3xl font-bold">{score}</p>
          <p className="text-sm text-muted-foreground">分数</p>
          <p className="text-sm">到达第 {floor} 层 | 击杀 {monstersKilled} 只怪物 | 最高: {bestScore}</p>
          {score > bestScore && score > 0 && <p className="text-yellow-500 font-bold">新纪录!</p>}
          <div className="flex gap-2 w-full mt-2">
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onBack}>返回</Button>
            <Button className="flex-1 min-h-[44px]" onClick={startGame}><RotateCcw className="h-4 w-4 mr-1" />重试</Button>
          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING SCREEN ---
  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const hpCol = hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center gap-2 px-2 py-2 w-full max-w-lg mx-auto">
      <div className="flex items-center gap-1 w-full min-h-[44px]">
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs sm:text-sm font-bold truncate">⚔️ 地牢探险</span>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">第{floor}层</span>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {hasKey && <span className="text-xs sm:text-sm" title="持有钥匙">🔑</span>}
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs">❤️</span>
            <div className="w-12 sm:w-16 h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${hpCol} rounded-full transition-all duration-300`} style={{ width: `${hpPct}%` }} />
            </div>
            <span className="text-[10px] sm:text-xs tabular-nums w-5 text-right">{hp}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Trophy className="h-3 w-3 text-yellow-500" />
            <span className="text-[10px] sm:text-xs tabular-nums">{score}</span>
          </div>
          <div className="hidden sm:block">
            <GameControlsHelp info={dungeonControlsInfo} />
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', maxWidth: W, aspectRatio: `${W}/${H}`, touchAction: 'none' }}
        className="rounded-lg border"
      />

      <div className="md:hidden flex flex-col items-center gap-1">
        <button
          className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-xl flex items-center justify-center active:bg-primary/25 select-none"
          style={{ touchAction: 'none', userSelect: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); movePlayer(0, -1); }}
          onMouseDown={() => movePlayer(0, -1)}
        >↑</button>
        <div className="flex gap-1">
          <button
            className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-xl flex items-center justify-center active:bg-primary/25 select-none"
            style={{ touchAction: 'none', userSelect: 'none' }}
            onTouchStart={(e) => { e.preventDefault(); movePlayer(-1, 0); }}
            onMouseDown={() => movePlayer(-1, 0)}
          >←</button>
          <div className="w-14 h-14" />
          <button
            className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-xl flex items-center justify-center active:bg-primary/25 select-none"
            style={{ touchAction: 'none', userSelect: 'none' }}
            onTouchStart={(e) => { e.preventDefault(); movePlayer(1, 0); }}
            onMouseDown={() => movePlayer(1, 0)}
          >→</button>
        </div>
        <button
          className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-xl flex items-center justify-center active:bg-primary/25 select-none"
          style={{ touchAction: 'none', userSelect: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); movePlayer(0, 1); }}
          onMouseDown={() => movePlayer(0, 1)}
        >↓</button>
      </div>
    </div>
  );
}
