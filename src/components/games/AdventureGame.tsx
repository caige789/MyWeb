'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const adventureControlsInfo: GameControlsInfo = {
  gameName: '冒险勇士',
  desktop: [
    { action: 'A/D/←→', keys: ['KeyA','KeyD','ArrowLeft','ArrowRight'], description: '左右移动' },
    { action: 'W/空格/↑', keys: ['KeyW','Space','ArrowUp'], description: '跳跃' },
    { action: 'J/鼠标', keys: ['KeyJ'], description: '攻击' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续游戏' },
  ],
  mobile: [
    { action: '虚拟按钮', keys: [], description: '屏幕下方的方向和动作按钮(手机端显示)' },
  ],
  rules: ['自动横向卷轴，需要跳跃和攻击前进','踩在怪物头上可以消灭它们','收集金币获得额外分数','掉入深渊或碰到怪物侧面会损失生命'],
  tips: ['保持跑动不要停留在边缘','跳跃攻击比地面攻击更安全','注意平台间距提前起跳'],
};

/** 组件属性接口 */
interface AdventureGameProps {
  onBack: () => void;
}

/** 画布逻辑宽度 */
const CANVAS_W = 640;
/** 画布逻辑高度 */
const CANVAS_H = 400;
/** 重力加速度 */
const GRAVITY = 0.38;
/** 跳跃力 */
const JUMP_FORCE = -9.8;
/** 移动速度 */
const MOVE_SPEED = 3;
/** 最大下落速度 */
const MAX_FALL = 12;
/** 地面Y坐标 */
const GROUND_Y = 340;
/** 玩家宽度 */
const PLAYER_W = 28;
/** 玩家高度 */
const PLAYER_H = 40;
/** 无敌时间(毫秒) */
const INVINCIBLE_TIME = 1500;
/** 攻击持续帧数 */
const ATTACK_DURATION = 18;
/** 攻击范围 */
const ATTACK_RANGE = 38;
/** 地图自动滚动速度 */
const SCROLL_SPEED = 0.8;
/** 分块宽度 */
const CHUNK_W = 640;
/** 游戏标识 */
const GAME_NAME = 'adventure';

/** 平台 */
interface Platform { x: number; y: number; w: number; h: number }
/** 金币 */
interface Coin { x: number; y: number; collected: boolean; phase: number }
/** 怪物种类 */
type MonsterKind = 'slime' | 'skeleton';
/** 怪物 */
interface Monster {
  x: number; y: number; w: number; h: number;
  kind: MonsterKind; hp: number; vx: number;
  alive: boolean; phase: number;
}
/** 飘字 */
interface FloatText { x: number; y: number; text: string; color: string; life: number }
/** 玩家 */
interface PlayerState {
  x: number; y: number; vx: number; vy: number;
  onGround: boolean; facing: number;
  attacking: boolean; atkTimer: number;
  invincible: boolean; invTimer: number;
  frame: number; frameTimer: number;
}
/** 游戏状态 */
type Status = 'idle' | 'playing' | 'over';

/** 创建玩家初始状态 */
function makePlayer(): PlayerState {
  return {
    x: 100, y: GROUND_Y - PLAYER_H,
    vx: 0, vy: 0, onGround: false, facing: 1,
    attacking: false, atkTimer: 0,
    invincible: false, invTimer: 0,
    frame: 0, frameTimer: 0,
  };
}

/** 创建怪物 */
function makeMonster(kind: MonsterKind, x: number, groundY: number): Monster {
  const isSlime = kind === 'slime';
  return {
    x, y: groundY - (isSlime ? 22 : 36),
    w: isSlime ? 28 : 26, h: isSlime ? 22 : 36,
    kind, hp: isSlime ? 1 : 2,
    vx: (isSlime ? 0.8 : 1.5) * (Math.random() < 0.5 ? 1 : -1),
    alive: true, phase: Math.random() * Math.PI * 2,
  };
}

/** 在[fromX, toX)区间程序化生成地图 */
function generateChunk(
  platforms: Platform[], coins: Coin[], monsters: Monster[],
  fromX: number, toX: number
): number {
  let x = fromX;
  while (x < toX) {
    const r = Math.random();
    if (r < 0.35) {
      /* 地面段 */
      const w = 120 + Math.random() * 200;
      platforms.push({ x, y: GROUND_Y, w, h: 60 });
      if (Math.random() < 0.5) {
        monsters.push(makeMonster(Math.random() < 0.6 ? 'slime' : 'skeleton', x + 30, GROUND_Y));
      }
      const nc = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < nc; i++) {
        coins.push({ x: x + 20 + i * 30, y: GROUND_Y - 40, collected: false, phase: Math.random() * 6.28 });
      }
      x += w + 30 + Math.random() * 50;
    } else if (r < 0.65) {
      /* 浮空平台 */
      const w = 80 + Math.random() * 100;
      const py = GROUND_Y - 60 - Math.random() * 80;
      platforms.push({ x, y: py, w, h: 20 });
      coins.push({ x: x + w / 2, y: py - 35, collected: false, phase: Math.random() * 6.28 });
      if (Math.random() < 0.3) monsters.push(makeMonster('slime', x + 10, py));
      x += w + 50 + Math.random() * 80;
    } else if (r < 0.8) {
      /* 阶梯 */
      const steps = 2 + Math.floor(Math.random() * 2);
      let sx = x;
      for (let s = 0; s < steps; s++) {
        const sw = 60 + Math.random() * 40;
        const py = GROUND_Y - 50 - s * 38;
        platforms.push({ x: sx, y: py, w: sw, h: 18 });
        coins.push({ x: sx + sw / 2, y: py - 30, collected: false, phase: Math.random() * 6.28 });
        sx += sw + 20;
      }
      x = sx + 40;
    } else {
      /* 深渊+地面 */
      x += 60 + Math.random() * 60;
      const w = 150 + Math.random() * 200;
      platforms.push({ x, y: GROUND_Y, w, h: 60 });
      if (Math.random() < 0.6) {
        monsters.push(makeMonster(Math.random() < 0.6 ? 'slime' : 'skeleton', x + 20, GROUND_Y));
      }
      const nc = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < nc; i++) {
        coins.push({ x: x + 30 + i * 35, y: GROUND_Y - 40, collected: false, phase: Math.random() * 6.28 });
      }
      x += w + 30 + Math.random() * 50;
    }
  }
  return x;
}

/** 绘制云朵 */
function drawClouds(ctx: CanvasRenderingContext2D, cam: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const off = cam * 0.15;
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 250 + 100 - off) % (CANVAS_W + 300)) - 100;
    const cy = 30 + (i % 3) * 35;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy - 8, 20, 0, Math.PI * 2);
    ctx.arc(cx + 40, cy, 22, 0, Math.PI * 2);
    ctx.arc(cx + 18, cy + 5, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 绘制平台 */
function drawPlatform(ctx: CanvasRenderingContext2D, pl: Platform, cam: number) {
  const x = pl.x - cam;
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(x, pl.y, pl.w, pl.h);
  const gh = pl.h > 30 ? 8 : 5;
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(x, pl.y, pl.w, gh);
  ctx.fillStyle = '#86efac';
  ctx.fillRect(x, pl.y, pl.w, 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, pl.y, pl.w, pl.h);
}

/** 绘制金币 */
function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const sx = Math.cos(t * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(-2, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  const sp = Math.sin(t * 5) * 0.5 + 0.5;
  ctx.globalAlpha = sp * 0.6;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(3, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** 绘制史莱姆 */
function drawSlime(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, vx: number) {
  const bounce = Math.abs(Math.sin(phase)) * 4;
  const sy = y - bounce;
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, sy + h - 4, w / 2 + 2, h / 2 + bounce * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 - 4, sy + h / 2 - 2, 6, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  const eo = vx > 0 ? 3 : -3;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + w / 2 - 5, sy + h / 2 - 2, 4, 0, Math.PI * 2);
  ctx.arc(x + w / 2 + 5, sy + h / 2 - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x + w / 2 - 5 + eo, sy + h / 2 - 1, 2, 0, Math.PI * 2);
  ctx.arc(x + w / 2 + 5 + eo, sy + h / 2 - 1, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** 绘制骷髅 */
function drawSkeleton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, hp: number) {
  const fl = Math.sin(phase * 0.7) * 3;
  const sy = y - fl;
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(x + 6, sy + 14, w - 12, h - 18);
  ctx.fillStyle = '#f5f5f4';
  ctx.beginPath();
  ctx.arc(x + w / 2, sy + 10, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + w / 2 - 8, sy + 16, 16, 5);
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x + w / 2 - 4, sy + 9, 3, 0, Math.PI * 2);
  ctx.arc(x + w / 2 + 4, sy + 9, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(x + w / 2 - 4, sy + 9, 1.5, 0, Math.PI * 2);
  ctx.arc(x + w / 2 + 4, sy + 9, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, sy + 12);
  ctx.lineTo(x + w / 2 - 2, sy + 15);
  ctx.lineTo(x + w / 2 + 2, sy + 15);
  ctx.fill();
  ctx.fillStyle = '#f5f5f4';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + w / 2 - 6 + i * 3, sy + 18, 2, 2);
  /* 血条 */
  const bx = x + (w - 20) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(bx, sy - 6, 20, 3);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(bx, sy - 6, 20 * (hp / 2), 3);
}

/** 绘制剑和挥砍效果 */
function drawSword(ctx: CanvasRenderingContext2D, x: number, y: number, timer: number) {
  const progress = 1 - timer / ATTACK_DURATION;
  const angle = -Math.PI / 2 + progress * Math.PI * 1.2;
  ctx.save();
  ctx.translate(x, y + 3);
  ctx.rotate(angle);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-2, -2, 6, 4);
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(1, -18, 3, 16);
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.moveTo(1, -18);
  ctx.lineTo(2.5, -23);
  ctx.lineTo(4, -18);
  ctx.fill();
  if (timer > ATTACK_DURATION * 0.3) {
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, angle - 0.5, angle + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 绘制玩家角色 */
function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, cam: number) {
  if (p.invincible && Math.sin(performance.now() / 60) > 0) return;
  const x = p.x - cam;
  const y = p.y;
  const running = Math.abs(p.vx) > 0.5;
  const air = !p.onGround;
  ctx.save();
  ctx.translate(x + PLAYER_W / 2, y + PLAYER_H / 2);
  ctx.scale(p.facing, 1);
  ctx.translate(-PLAYER_W / 2, -PLAYER_H / 2);
  /* 腿 */
  const ls = running && !air ? Math.sin(p.frame * Math.PI / 2) * 6 : 0;
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(6, 30, 6, 10 + (air ? -3 : ls));
  ctx.fillRect(16, 30, 6, 10 + (air ? 3 : -ls));
  ctx.fillStyle = '#78350f';
  ctx.fillRect(4, 38 + (air ? -3 : ls), 9, 3);
  ctx.fillRect(15, 38 + (air ? 3 : -ls), 9, 3);
  /* 身体 */
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(5, 16, 18, 16);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(5, 28, 18, 3);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(12, 27, 5, 5);
  /* 手臂 */
  const as = running && !air ? Math.sin(p.frame * Math.PI / 2) * 8 : 0;
  if (p.attacking) {
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(18, 18, 16, 5);
    drawSword(ctx, 34, 16, p.atkTimer);
  } else {
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(18, 18, 5, 12 + as);
  }
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(0, 18, 5, 12 - as);
  /* 头 */
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(5, 2, 18, 15);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(4, 0, 20, 5);
  ctx.fillRect(3, 2, 4, 8);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(16, 6, 3, 3);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(15, 12, 5, 1);
  ctx.restore();
}

/** 游戏核心状态（全部存ref，避免闭包问题） */
interface GameCore {
  status: Status;
  player: PlayerState;
  platforms: Platform[];
  coins: Coin[];
  monsters: Monster[];
  floats: FloatText[];
  score: number;
  lives: number;
  cam: number;
  genUpTo: number;
  distance: number;
  lastTime: number;
  keys: Set<string>;
  touchL: boolean;
  touchR: boolean;
  touchJ: boolean;
  touchA: boolean;
  jumpHeld: boolean;
  scale: number;
}

export default function AdventureGame({ onBack }: AdventureGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStatus, setGameStatus] = useState<Status>('idle');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [distance, setDistance] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const uiUpdateRef = useRef(0);
  /* 使用ref保存所有游戏状态，避免闭包和immutability问题 */
  const gRef = useRef<GameCore>({
    status: 'idle', player: makePlayer(),
    platforms: [], coins: [], monsters: [], floats: [],
    score: 0, lives: 3, cam: 0, genUpTo: 0, distance: 0,
    lastTime: 0, keys: new Set(),
    touchL: false, touchR: false, touchJ: false, touchA: false,
    jumpHeld: false, scale: 1,
  });

  /* 检测移动端 */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* 获取最高分 */
  useEffect(() => {
    fetch('/api/games/scores')
      .then(r => r.json())
      .then(res => {
        if (res.code === 0 && res.data) {
          const found = res.data.find((s: { game: string; score: number }) => s.game === GAME_NAME);
          if (found) setHighScore(found.score);
        }
      })
      .catch(() => {})
  }, []);

  /* 提交分数 */
  const submitScore = (finalScore: number) => {
    fetch('/api/games/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_NAME, score: finalScore }),
    })
      .then(r => r.json())
      .then(res => {
        if (res.code === 0 && res.data && finalScore >= res.data.score) {
          setIsNewRecord(true);
          setHighScore(finalScore);
        }
      })
      .catch(() => {})
  };

  /* 初始化游戏数据 */
  const initGameData = () => {
    const g = gRef.current;
    g.player = makePlayer();
    g.platforms = [];
    g.coins = [];
    g.monsters = [];
    g.floats = [];
    g.score = 0;
    g.lives = 3;
    g.cam = 0;
    g.genUpTo = 0;
    g.distance = 0;
    g.lastTime = 0;
    g.status = 'playing';
    pausedRef.current = false;
    setPaused(false);
    /* starting ground */
    g.platforms.push({ x: 0, y: GROUND_Y, w: 400, h: 60 });
    for (let i = 0; i < 5; i++) {
      g.coins.push({ x: 200 + i * 40, y: GROUND_Y - 40, collected: false, phase: Math.random() * 6.28 });
    }
    g.genUpTo = generateChunk(g.platforms, g.coins, g.monsters, 400, 400 + CHUNK_W * 3);
    setScore(0);
    setLives(3);
    setIsNewRecord(false);
    setGameStatus('playing');
  };

  /* 游戏结束 */
  const endGame = (g: GameCore) => {
    g.status = 'over';
    setGameStatus('over');
    submitScore(g.score);
  };

  /* 玩家受伤 */
  const hurtPlayer = (g: GameCore) => {
    if (g.player.invincible) return;
    g.lives--;
    setLives(g.lives);
    if (g.lives <= 0) {
      endGame(g);
    } else {
      g.player.invincible = true;
      g.player.invTimer = INVINCIBLE_TIME;
    }
  };

  /* 重生 */
  const respawn = (g: GameCore) => {
    let best: Platform | null = null;
    let bd = Infinity;
    for (const pl of g.platforms) {
      if (pl.x + pl.w > g.cam && pl.x < g.cam + CANVAS_W) {
        const d = Math.abs(pl.x + pl.w / 2 - (g.cam + CANVAS_W / 3));
        if (d < bd) { bd = d; best = pl; }
      }
    }
    if (best) {
      g.player.x = best.x + best.w / 2 - PLAYER_W / 2;
      g.player.y = best.y - PLAYER_H;
    } else {
      g.player.x = g.cam + 100;
      g.player.y = GROUND_Y - PLAYER_H;
    }
    g.player.vx = 0;
    g.player.vy = 0;
    g.player.onGround = false;
    g.player.invincible = true;
    g.player.invTimer = INVINCIBLE_TIME;
  };

  /* Core update logic (pure function, receives g as param) */
  const tick = (g: GameCore, dt: number) => {
    if (pausedRef.current) return;
    const p = g.player;
    const k = g.keys;

    /* 读取输入 */
    const ml = k.has('ArrowLeft') || k.has('a') || k.has('A') || g.touchL;
    const mr = k.has('ArrowRight') || k.has('d') || k.has('D') || g.touchR;
    const wj = k.has('ArrowUp') || k.has('w') || k.has('W') || k.has(' ') || g.touchJ;
    const wa = k.has('j') || k.has('J') || g.touchA;

    /* 移动 */
    if (ml) { p.vx = -MOVE_SPEED; p.facing = -1; }
    else if (mr) { p.vx = MOVE_SPEED; p.facing = 1; }
    else { p.vx *= 0.7; if (Math.abs(p.vx) < 0.3) p.vx = 0; }

    /* 跳跃 */
    if (wj && !g.jumpHeld && p.onGround) {
      p.vy = JUMP_FORCE;
      p.onGround = false;
      g.jumpHeld = true;
    }
    if (!wj) g.jumpHeld = false;

    /* 攻击 */
    if (wa && !p.attacking) { p.attacking = true; p.atkTimer = ATTACK_DURATION; }
    if (p.attacking) { p.atkTimer--; if (p.atkTimer <= 0) p.attacking = false; }

    /* 无敌计时 */
    if (p.invincible) { p.invTimer -= dt; if (p.invTimer <= 0) p.invincible = false; }

    /* 动画 */
    p.frameTimer += dt;
    if (p.frameTimer > 120) { p.frameTimer = 0; p.frame = (p.frame + 1) % 4; }

    /* 重力 */
    p.vy += GRAVITY;
    if (p.vy > MAX_FALL) p.vy = MAX_FALL;

    /* 水平移动+碰撞 */
    p.x += p.vx;
    for (const pl of g.platforms) {
      if (pl.x + pl.w <= g.cam - 50 || pl.x >= g.cam + CANVAS_W + 50) continue;
      if (p.x + PLAYER_W > pl.x && p.x < pl.x + pl.w && p.y + PLAYER_H > pl.y + 4 && p.y < pl.y + pl.h) {
        if (p.vx > 0) p.x = pl.x - PLAYER_W;
        else if (p.vx < 0) p.x = pl.x + pl.w;
        p.vx = 0;
      }
    }

    /* 垂直移动+碰撞 */
    p.y += p.vy;
    p.onGround = false;
    for (const pl of g.platforms) {
      if (pl.x + pl.w <= g.cam - 50 || pl.x >= g.cam + CANVAS_W + 50) continue;
      if (p.x + PLAYER_W > pl.x + 2 && p.x < pl.x + pl.w - 2 && p.y + PLAYER_H > pl.y && p.y + PLAYER_H < pl.y + pl.h + 10 && p.vy >= 0) {
        p.y = pl.y - PLAYER_H;
        p.vy = 0;
        p.onGround = true;
      }
    }

    /* 相机跟随 */
    if (p.x - g.cam > CANVAS_W * 0.65) g.cam = p.x - CANVAS_W * 0.65;
    if (g.cam < 0) g.cam = 0;
    if (g.cam < p.x - 50) g.cam += SCROLL_SPEED * 0.5;
    g.distance = Math.floor(p.x / 100);

    /* 程序化生成 */
    const threshold = g.cam + CANVAS_W + CHUNK_W;
    if (g.genUpTo < threshold) {
      g.genUpTo = generateChunk(g.platforms, g.coins, g.monsters, g.genUpTo, threshold + CHUNK_W);
    }

    /* 清理远处物体 */
    const cx = g.cam - 300;
    g.platforms = g.platforms.filter(pl => pl.x + pl.w > cx);
    g.coins = g.coins.filter(c => c.x > cx);
    g.monsters = g.monsters.filter(m => m.x + m.w > cx);

    /* 收集金币 */
    const pcx = p.x + PLAYER_W / 2;
    const pcy = p.y + PLAYER_H / 2;
    for (const c of g.coins) {
      if (c.collected) continue;
      const dx = pcx - c.x;
      const dy = pcy - c.y;
      if (dx * dx + dy * dy < 500) {
        c.collected = true;
        g.score += 10;
        g.floats.push({ x: c.x, y: c.y, text: '+10', color: '#fbbf24', life: 60 });
      }
    }

    /* 怪物AI */
    for (const m of g.monsters) {
      if (!m.alive) continue;
      m.phase += 0.08;
      /* 找脚下平台 */
      let onPlat: Platform | null = null;
      for (const pl of g.platforms) {
        if (m.x + m.w > pl.x && m.x < pl.x + pl.w && Math.abs(m.y + m.h - pl.y) < 5) { onPlat = pl; break; }
      }
      m.x += m.vx;
      /* 边缘转向 */
      if (onPlat) {
        if (m.x <= onPlat.x + 5) { m.x = onPlat.x + 5; m.vx = Math.abs(m.vx); }
        else if (m.x + m.w >= onPlat.x + onPlat.w - 5) { m.x = onPlat.x + onPlat.w - m.w - 5; m.vx = -Math.abs(m.vx); }
      }
      /* 攻击判定 */
      if (p.attacking && p.atkTimer > ATTACK_DURATION - 10) {
        const ax = p.x + (p.facing > 0 ? PLAYER_W : 0);
        const ay = p.y + PLAYER_H / 2;
        const mdx = (m.x + m.w / 2) - ax;
        const mdy = (m.y + m.h / 2) - ay;
        if (Math.sqrt(mdx * mdx + mdy * mdy) < ATTACK_RANGE && p.facing * mdx >= -10) {
          m.hp--;
          if (m.hp <= 0) {
            m.alive = false;
            const pts = m.kind === 'slime' ? 20 : 50;
            g.score += pts;
            g.floats.push({ x: m.x + m.w / 2, y: m.y, text: `+${pts}`, color: m.kind === 'slime' ? '#4ade80' : '#f87171', life: 60 });
          }
        }
      }
      /* 踩怪判定 */
      if (m.alive && !p.invincible) {
        const pb = p.y + PLAYER_H;
        const prevB = pb - p.vy;
        if (p.vy > 0 && prevB <= m.y + 5 && pb >= m.y && p.x + PLAYER_W > m.x + 3 && p.x < m.x + m.w - 3) {
          m.hp--;
          p.vy = JUMP_FORCE * 0.6;
          if (m.hp <= 0) {
            m.alive = false;
            const pts = m.kind === 'slime' ? 20 : 50;
            g.score += pts;
            g.floats.push({ x: m.x + m.w / 2, y: m.y, text: `+${pts}`, color: m.kind === 'slime' ? '#4ade80' : '#f87171', life: 60 });
          }
          continue;
        }
      }
      /* 碰撞伤害 */
      if (m.alive && !p.invincible) {
        if (p.x + PLAYER_W > m.x + 2 && p.x < m.x + m.w - 2 && p.y + PLAYER_H > m.y + 2 && p.y < m.y + m.h - 2) {
          hurtPlayer(g);
        }
      }
    }

    /* 坠落 */
    if (p.y > CANVAS_H + 50) {
      g.lives--;
      setLives(g.lives);
      if (g.lives <= 0) { endGame(g); }
      else { respawn(g); }
    }

    /* 防止跑出左边界 */
    if (p.x < g.cam - 20) p.x = g.cam - 20;

    /* 更新飘字 */
    g.floats = g.floats.filter(ft => { ft.life--; ft.y -= 1.2; return ft.life > 0; });
  };

  /* 绘制完整画面 */
  const render = (g: GameCore) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.scale;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    /* 天空 */
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, '#87ceeb');
    sky.addColorStop(0.6, '#b0e0f6');
    sky.addColorStop(1, '#d4f0fc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawClouds(ctx, g.cam);
    /* 平台 */
    for (const pl of g.platforms) {
      if (pl.x + pl.w < g.cam - 10 || pl.x > g.cam + CANVAS_W + 10) continue;
      drawPlatform(ctx, pl, g.cam);
    }
    /* 金币 */
    const t = performance.now() / 1000;
    for (const c of g.coins) {
      if (c.collected || c.x < g.cam - 20 || c.x > g.cam + CANVAS_W + 20) continue;
      drawCoin(ctx, c.x - g.cam, c.y, t + c.phase);
    }
    /* 怪物 */
    for (const m of g.monsters) {
      if (!m.alive || m.x + m.w < g.cam - 20 || m.x > g.cam + CANVAS_W + 20) continue;
      const mx = m.x - g.cam;
      if (m.kind === 'slime') drawSlime(ctx, mx, m.y, m.w, m.h, m.phase, m.vx);
      else drawSkeleton(ctx, mx, m.y, m.w, m.h, m.phase, m.hp);
    }
    /* 玩家 */
    drawPlayer(ctx, g.player, g.cam);
    /* Float text */
    for (const ft of g.floats) {
      ctx.globalAlpha = ft.life / 60;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x - g.cam, ft.y);
      ctx.globalAlpha = 1;
    }
    /* Paused overlay */
    if (pausedRef.current) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('已暂停', CANVAS_W / 2, CANVAS_H / 2 - 10);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('按 Esc 继续', CANVAS_W / 2, CANVAS_H / 2 + 20);
      ctx.textAlign = 'start';
    }
  };

  /* Game loop */
  const loop = (timestamp: number) => {
    const g = gRef.current;
    if (g.status !== 'playing') return;
    if (pausedRef.current) {
      g.lastTime = 0;
      render(g);
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(g.lastTime ? timestamp - g.lastTime : 16, 50);
    g.lastTime = timestamp;
    tick(g, dt);
    render(g);
    /* 低频更新React状态 */
    uiUpdateRef.current++;
    if (uiUpdateRef.current % 6 === 0) {
      setScore(g.score);
      setDistance(g.distance);
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  /* 开始游戏 */
  const startGame = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    initGameData();
    rafRef.current = requestAnimationFrame(loop);
  };

  /* Keyboard events */
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gRef.current.status === 'playing') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      if (pausedRef.current) return;
      gRef.current.keys.add(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => { gRef.current.keys.delete(e.key); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  /* Mouse attack */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onClick = () => { if (gRef.current.status === 'playing' && !pausedRef.current) { const p = gRef.current.player; if (!p.attacking) { p.attacking = true; p.atkTimer = ATTACK_DURATION; } } };
    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, []);

  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const dw = canvas.clientWidth;
      if (dw <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      canvas.width = dw * dpr;
      canvas.height = (dw / CANVAS_W) * CANVAS_H * dpr;
      gRef.current.scale = (dw * dpr) / CANVAS_W;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    const onVis = () => { if (document.visibilityState === 'visible') resize(); };
    document.addEventListener('visibilitychange', onVis);
    resize();
    return () => { ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  /* 清理 */
  useEffect(() => { return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }; }, []);

  /* 绘制待机画面 */
  useEffect(() => {
    if (gameStatus !== 'idle') return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const s = gRef.current.scale;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      sky.addColorStop(0, '#87ceeb');
      sky.addColorStop(1, '#d4f0fc');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 8);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(0, GROUND_Y + 8, CANVAS_W, 52);
      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('勇者冒险', CANVAS_W / 2, CANVAS_H / 2 - 40);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('横版跑酷闯关游戏', CANVAS_W / 2, CANVAS_H / 2 - 10);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(isMobile ? '点击下方按钮开始游戏' : '点击「?」查看操作说明', CANVAS_W / 2, CANVAS_H / 2 + 30);
    }, 100);
    return () => clearTimeout(timer);
  }, [gameStatus, isMobile]);

  /* 距离用state显示 */

  /* 触摸处理函数 */
  const tb = {
    left: {
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchL = true; },
      onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchL = false; },
      onTouchCancel: () => { gRef.current.touchL = false; },
    },
    right: {
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchR = true; },
      onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchR = false; },
      onTouchCancel: () => { gRef.current.touchR = false; },
    },
    jump: {
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchJ = true; },
      onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchJ = false; },
      onTouchCancel: () => { gRef.current.touchJ = false; },
    },
    attack: {
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchA = true; },
      onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); gRef.current.touchA = false; },
      onTouchCancel: () => { gRef.current.touchA = false; },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-2 sm:py-3">
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
              {gameStatus === 'playing' && <GameControlsHelp info={adventureControlsInfo} variant="button" />}
            </div>
            <CardTitle className="text-base sm:text-lg">勇者冒险</CardTitle>
            <span className="text-amber-500 font-bold text-sm">
              <Trophy className="h-3.5 w-3.5 inline mr-0.5" />
              {highScore}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm px-1">
            <span className="font-bold">分数: {score}</span>
            <span className="text-xs text-muted-foreground">距离: {distance}m</span>
            <span className="text-base">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>
              ))}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div ref={containerRef} className="w-full relative" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              className="rounded-lg border border-border block"
              style={{ width: '100%', maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W}/${CANVAS_H}`, touchAction: 'none' }}
            />
            {gameStatus === 'over' && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center gap-3">
                <div className="text-2xl font-bold text-white">游戏结束</div>
                <div className="text-amber-400 text-lg font-bold">得分: {score}</div>
                {isNewRecord && (
                  <div className="text-yellow-300 text-sm font-bold animate-bounce">
                    🎉 新纪录！
                  </div>
                )}
                <div className="text-gray-300 text-xs">最高分: {highScore}</div>
                <Button onClick={startGame} className="mt-2" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  再来一局
                </Button>
              </div>
            )}
            {gameStatus === 'idle' && (
              <div className="absolute inset-0 bg-black/30 rounded-lg flex flex-col items-center justify-center gap-2">
                <Button onClick={startGame} size="lg">
                  开始游戏
                </Button>
              </div>
            )}
          </div>
          {isMobile && gameStatus === 'playing' && !paused && (
            <div className="relative w-full mt-3 flex items-center justify-between" style={{ height: '64px', touchAction: 'none' }}>
              <button
                {...tb.left}
                className="rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-xl w-20 h-14 flex items-center justify-center shadow-lg select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              >◀</button>
              <button
                {...tb.jump}
                className="rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm w-20 h-14 flex items-center justify-center shadow-lg select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              >跳跃</button>
              <button
                {...tb.attack}
                className="rounded-xl bg-red-600 active:bg-red-700 text-white font-bold text-sm w-16 h-14 flex items-center justify-center shadow-lg select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              >攻击</button>
              <button
                {...tb.right}
                className="rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-xl w-20 h-14 flex items-center justify-center shadow-lg select-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              >▶</button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
