'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const breakoutControlsInfo: GameControlsInfo = {
  gameName: '打砖块',
  desktop: [
    { action: '方向键 ← →', keys: ['ArrowLeft','ArrowRight'], description: '移动挡板左右' },
    { action: 'A / D', keys: ['KeyA','KeyD'], description: '备选挡板控制' },
    { action: '鼠标移动', keys: [], description: '挡板跟随鼠标水平位置' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续游戏' },
    { action: '磁力发射', keys: ['Space'], description: '磁力挡板粘球后点击或空格发射' },
  ],
  mobile: [
    { action: '触摸滑动', keys: [], description: '触摸并滑动控制挡板位置' },
    { action: '点击', keys: [], description: '磁力挡板粘球后点击发射' },
  ],
  rules: [
    '用挡板反弹弹球击碎上方砖块',
    '5种道具: 加长挡板、加速球、额外生命、火球穿透、磁力挡板',
    '连续击中砖块不掉落可累积连击倍率',
    '消灭所有砖块进入下一关，共5关',
    '弹球落到底部失去一条命',
  ],
  tips: ['弹球角度由挡板碰撞位置决定', '火球期间尽量向上打清砖', '连击倍率越高得分越多，保持球不落地'],
};

interface BreakoutGameProps {
  onBack: () => void;
}

const GAME_NAME = 'breakout';
const CANVAS_MAX_W = 480;
const CANVAS_H = 600;
const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y_OFFSET = 30;
const BALL_RADIUS = 6;
const BALL_SPEED = 4.5;
const BRICK_COLS = 8;
const BRICK_H = 22;
const BRICK_GAP = 3;
const BRICK_TOP_OFFSET = 60;
const MAX_LIVES = 3;
const MAX_LEVEL = 5;
const POWERUP_CHANCE = 0.25;
const POWERUP_SPEED = 2.5;
const POWERUP_SIZE = 24;

const BRICK_TYPES = [
  { color: '#ef4444', score: 10, gradient: ['#f87171', '#dc2626'] },
  { color: '#f97316', score: 20, gradient: ['#fb923c', '#ea580c'] },
  { color: '#eab308', score: 30, gradient: ['#facc15', '#ca8a04'] },
  { color: '#22c55e', score: 40, gradient: ['#4ade80', '#16a34a'] },
  { color: '#a855f7', score: 50, gradient: ['#c084fc', '#9333ea'] },
];

enum PowerUpType {
  Extend = 'E',    // Widen paddle
  Speed = 'F',      // Speed up ball
  Life = '+',       // Extra life
  Fireball = 'X',   // Piercing fireball
  Magnet = 'M',     // Magnet paddle
}

const POWERUP_COLORS: Record<PowerUpType, string> = {
  [PowerUpType.Extend]: '#22c55e',
  [PowerUpType.Speed]: '#f97316',
  [PowerUpType.Life]: '#ef4444',
  [PowerUpType.Fireball]: '#f59e0b',
  [PowerUpType.Magnet]: '#06b6d4',
};

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  typeIndex: number;
  alive: boolean;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
 stuck: boolean;  // Stuck to magnet paddle
  stuckOffset: number;  // Offset from paddle center
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  frame: number;
}

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

type GameStatus = 'idle' | 'playing' | 'levelUp' | 'over';

// Timer entry for effects
interface EffectTimer {
  type: string;
  endTime: number;
}

function generateBricks(level: number, canvasW: number): Brick[] {
  const bricks: Brick[] = [];
  const brickW = (canvasW - (BRICK_COLS + 1) * BRICK_GAP) / BRICK_COLS;

  if (level === 1) {
    // Level 1: 5 rows standard
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: BRICK_GAP + col * (brickW + BRICK_GAP),
          y: BRICK_TOP_OFFSET + row * (BRICK_H + BRICK_GAP),
          w: brickW, h: BRICK_H, typeIndex: row, alive: true,
        });
      }
    }
  } else if (level === 2) {
    // Level 2: 6 rows with diamond cutouts
    for (let row = 0; row < 6; row++) {
      const ti = Math.min(row, BRICK_TYPES.length - 1);
      for (let col = 0; col < BRICK_COLS; col++) {
        if (row === 2 && (col === 0 || col === 7)) continue;
        if (row === 3 && (col === 3 || col === 4)) continue;
        bricks.push({
          x: BRICK_GAP + col * (brickW + BRICK_GAP),
          y: BRICK_TOP_OFFSET + row * (BRICK_H + BRICK_GAP),
          w: brickW, h: BRICK_H, typeIndex: ti, alive: true,
        });
      }
    }
  } else if (level === 3) {
    // Level 3: 7 rows, checkerboard pattern
    for (let row = 0; row < 7; row++) {
      const ti = Math.min(row, BRICK_TYPES.length - 1);
      for (let col = 0; col < BRICK_COLS; col++) {
        if ((row + col) % 2 === 0) continue;
        bricks.push({
          x: BRICK_GAP + col * (brickW + BRICK_GAP),
          y: BRICK_TOP_OFFSET + row * (BRICK_H + BRICK_GAP),
          w: brickW, h: BRICK_H, typeIndex: ti, alive: true,
        });
      }
    }
  } else if (level === 4) {
    // Level 4: 8 rows, X pattern cutout
    for (let row = 0; row < 8; row++) {
      const ti = Math.min(row, BRICK_TYPES.length - 1);
      for (let col = 0; col < BRICK_COLS; col++) {
        // X-shaped cutout
        const diag1 = row - col;
        const diag2 = row - (7 - col);
        if (Math.abs(diag1) <= 0 && row < 8) continue;
        if (Math.abs(diag2) <= 0 && row < 8) continue;
        bricks.push({
          x: BRICK_GAP + col * (brickW + BRICK_GAP),
          y: BRICK_TOP_OFFSET + row * (BRICK_H + BRICK_GAP),
          w: brickW, h: BRICK_H, typeIndex: ti, alive: true,
        });
      }
    }
  } else {
    // Level 5: 8 rows, dense, fortress pattern
    for (let row = 0; row < 8; row++) {
      const ti = Math.min(row, BRICK_TYPES.length - 1);
      for (let col = 0; col < BRICK_COLS; col++) {
        // Arrow cutout
        if (row === 1 && col >= 3 && col <= 4) continue;
        if (row === 2 && col === 3) continue;
        if (row === 3 && col === 2) continue;
        if (row === 3 && col === 5) continue;
        if (row === 4 && col === 2) continue;
        if (row === 4 && col === 5) continue;
        if (row === 5 && col === 3) continue;
        if (row === 6 && col >= 3 && col <= 4) continue;
        bricks.push({
          x: BRICK_GAP + col * (brickW + BRICK_GAP),
          y: BRICK_TOP_OFFSET + row * (BRICK_H + BRICK_GAP),
          w: brickW, h: BRICK_H, typeIndex: ti, alive: true,
        });
      }
    }
  }
  return bricks;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export default function BreakoutGame({ onBack }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));
  const animFrameRef = useRef<number>(0);
  const canvasWRef = useRef<number>(CANVAS_MAX_W);

  const paddleRef = useRef({ x: 0, w: PADDLE_W });
  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<TrailPoint[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const levelRef = useRef(1);
  const gameStatusRef = useRef<GameStatus>('idle');
  const keysRef = useRef<Set<string>>(new Set());

  // Effect timers
  const effectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Combo system
  const comboCountRef = useRef(0);
  // Fireball state
  const isFireballRef = useRef(false);
  // Magnet state
  const isMagnetRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [level, setLevel] = useState(1);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [highScore, setHighScore] = useState(0);
  const [loadingHighScore, setLoadingHighScore] = useState(true);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [combo, setCombo] = useState(0);
  const [activeEffects, setActiveEffects] = useState<string[]>([]);

  const getPaddleY = useCallback(() => CANVAS_H - PADDLE_Y_OFFSET, []);

  const updateEffectsUI = useCallback(() => {
    const now = Date.now();
    const effects: string[] = [];
    if (paddleRef.current.w > PADDLE_W) {
      const ext = effectTimersRef.current.get('extend');
      if (ext) {
        // We can't easily read timeout remaining, just show the label
      }
      effects.push('📏 加长挡板');
    }
    if (isFireballRef.current) effects.push('🔥 火球穿透');
    if (isMagnetRef.current) effects.push('🧲 磁力挡板');
    // Check if any ball is speed-boosted
    const boosted = ballsRef.current.some(b => b.speed > BALL_SPEED + (levelRef.current - 1) * 0.5 + 1);
    if (boosted) effects.push('⚡ 加速球');
    setActiveEffects(effects);
  }, []);

  const clearEffectTimers = useCallback(() => {
    effectTimersRef.current.forEach(t => clearTimeout(t));
    effectTimersRef.current.clear();
  }, []);

  const createBall = useCallback(
    (canvasW: number, stuck?: boolean) => {
      const speed = BALL_SPEED + (levelRef.current - 1) * 0.4;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      return {
        x: canvasW / 2,
        y: getPaddleY() - PADDLE_H / 2 - BALL_RADIUS - 1,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        radius: BALL_RADIUS,
        speed,
        stuck: !!stuck,
        stuckOffset: 0,
      };
    },
    [getPaddleY]
  );

  const spawnParticles = useCallback((brick: Brick) => {
    const brickType = BRICK_TYPES[brick.typeIndex];
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particlesRef.current.push({
        x: cx + (Math.random() - 0.5) * brick.w * 0.6,
        y: cy + (Math.random() - 0.5) * brick.h * 0.6,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: brickType.color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  const trySpawnPowerUp = useCallback((brick: Brick) => {
    if (Math.random() > POWERUP_CHANCE) return;
    const types = [
      PowerUpType.Extend,
      PowerUpType.Speed,
      PowerUpType.Life,
      PowerUpType.Fireball,
      PowerUpType.Magnet,
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUpsRef.current.push({
      x: brick.x + brick.w / 2,
      y: brick.y + brick.h / 2,
      type,
      frame: 0,
    });
  }, []);

  // Launch stuck balls
  const launchStuckBalls = useCallback(() => {
    ballsRef.current.forEach(ball => {
      if (ball.stuck) {
        ball.stuck = false;
        const angle = -Math.PI / 2 + (ball.stuckOffset / (paddleRef.current.w / 2)) * (Math.PI / 3);
        ball.dx = Math.sin(angle) * ball.speed;
        ball.dy = -Math.cos(angle) * ball.speed;
      }
    });
  }, []);

  const applyPowerUp = useCallback(
    (pu: PowerUp) => {
      if (pu.type === PowerUpType.Extend) {
        paddleRef.current.w = Math.min(PADDLE_W * 1.6, canvasWRef.current - 20);
        const oldTimer = effectTimersRef.current.get('extend');
        if (oldTimer) clearTimeout(oldTimer);
        effectTimersRef.current.set('extend', setTimeout(() => {
          paddleRef.current.w = PADDLE_W;
          effectTimersRef.current.delete('extend');
          updateEffectsUI();
        }, 15000));
      } else if (pu.type === PowerUpType.Speed) {
        ballsRef.current.forEach(b => {
          if (!b.stuck) {
            const factor = 1.35;
            b.dx *= factor;
            b.dy *= factor;
            b.speed *= factor;
          }
        });
        // Speed boost doesn't need timer - it's permanent for current balls
      } else if (pu.type === PowerUpType.Life) {
        livesRef.current = Math.min(livesRef.current + 1, 5);
        setLives(livesRef.current);
      } else if (pu.type === PowerUpType.Fireball) {
        isFireballRef.current = true;
        const oldTimer = effectTimersRef.current.get('fireball');
        if (oldTimer) clearTimeout(oldTimer);
        effectTimersRef.current.set('fireball', setTimeout(() => {
          isFireballRef.current = false;
          effectTimersRef.current.delete('fireball');
          updateEffectsUI();
        }, 10000));
      } else if (pu.type === PowerUpType.Magnet) {
        isMagnetRef.current = true;
        const oldTimer = effectTimersRef.current.get('magnet');
        if (oldTimer) clearTimeout(oldTimer);
        effectTimersRef.current.set('magnet', setTimeout(() => {
          isMagnetRef.current = false;
          // Launch any stuck balls
          launchStuckBalls();
          effectTimersRef.current.delete('magnet');
          updateEffectsUI();
        }, 15000));
      }
      updateEffectsUI();
    },
    [updateEffectsUI, launchStuckBalls]
  );

  const initLevel = useCallback(
    (lvl: number) => {
      const canvasW = canvasWRef.current;
      bricksRef.current = generateBricks(lvl, canvasW);
      ballsRef.current = [createBall(canvasW)];
      powerUpsRef.current = [];
      particlesRef.current = [];
      trailsRef.current = [];
      paddleRef.current.w = PADDLE_W;
      paddleRef.current.x = canvasW / 2 - PADDLE_W / 2;
      clearEffectTimers();
      isFireballRef.current = false;
      isMagnetRef.current = false;
      comboCountRef.current = 0;
      setCombo(0);
      levelRef.current = lvl;
      setLevel(lvl);
      updateEffectsUI();
    },
    [createBall, clearEffectTimers, updateEffectsUI]
  );

  const update = useCallback(() => {
    const canvasW = canvasWRef.current;
    const paddle = paddleRef.current;
    const paddleY = getPaddleY();
    const balls = ballsRef.current;
    const bricks = bricksRef.current;
    const powerUps = powerUpsRef.current;
    const particles = particlesRef.current;
    const trails = trailsRef.current;
    const keys = keysRef.current;

    // Paddle keyboard control
    const moveSpeed = 7;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
      paddle.x = Math.max(0, paddle.x - moveSpeed);
    }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
      paddle.x = Math.min(canvasW - paddle.w, paddle.x + moveSpeed);
    }

    // Update stuck balls to follow paddle
    balls.forEach(ball => {
      if (ball.stuck) {
        ball.x = paddle.x + paddle.w / 2 + ball.stuckOffset;
        ball.y = paddleY - PADDLE_H / 2 - ball.radius - 1;
      }
    });

    // Update balls
    const ballsToRemove: number[] = [];
    let hitBrickThisFrame = false;

    balls.forEach((ball, idx) => {
      if (ball.stuck) return;

      trails.push({ x: ball.x, y: ball.y, alpha: 1 });

      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall collisions
      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.dx = Math.abs(ball.dx);
      }
      if (ball.x + ball.radius >= canvasW) {
        ball.x = canvasW - ball.radius;
        ball.dx = -Math.abs(ball.dx);
      }
      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.dy = Math.abs(ball.dy);
      }

      // Bottom out
      if (ball.y - ball.radius > CANVAS_H) {
        ballsToRemove.push(idx);
        // Reset combo
        comboCountRef.current = 0;
        setCombo(0);
        return;
      }

      // Paddle collision
      const pLeft = paddle.x;
      const pRight = paddle.x + paddle.w;
      const pTop = paddleY - PADDLE_H / 2;
      const pBottom = paddleY + PADDLE_H / 2;
      if (
        ball.dy > 0 &&
        ball.y + ball.radius >= pTop &&
        ball.y + ball.radius <= pBottom + 4 &&
        ball.x >= pLeft - ball.radius &&
        ball.x <= pRight + ball.radius
      ) {
        if (isMagnetRef.current) {
          // Magnet: stick ball to paddle
          ball.stuck = true;
          ball.stuckOffset = ball.x - (paddle.x + paddle.w / 2);
          ball.y = pTop - ball.radius - 1;
        } else {
          ball.y = pTop - ball.radius;
          const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          const maxAngle = Math.PI / 3;
          const angle = hitPos * maxAngle;
          const spd = ball.speed;
          ball.dx = Math.sin(angle) * spd;
          ball.dy = -Math.cos(angle) * spd;
        }
      }

      // Brick collision
      bricks.forEach((brick) => {
        if (!brick.alive) return;
        const bLeft = brick.x;
        const bRight = brick.x + brick.w;
        const bTop = brick.y;
        const bBottom = brick.y + brick.h;

        if (
          ball.x + ball.radius > bLeft &&
          ball.x - ball.radius < bRight &&
          ball.y + ball.radius > bTop &&
          ball.y - ball.radius < bBottom
        ) {
          brick.alive = false;
          hitBrickThisFrame = true;

          // Combo system
          comboCountRef.current += 1;
          setCombo(comboCountRef.current);

          // Score with combo multiplier
          const baseScore = BRICK_TYPES[brick.typeIndex].score;
          const comboMultiplier = 1 + Math.floor(comboCountRef.current / 3) * 0.5;
          scoreRef.current += Math.round(baseScore * comboMultiplier);
          setScore(scoreRef.current);

          spawnParticles(brick);
          trySpawnPowerUp(brick);

          // Fireball: no bounce, pierce through
          if (!isFireballRef.current) {
            const overlapLeft = ball.x + ball.radius - bLeft;
            const overlapRight = bRight - (ball.x - ball.radius);
            const overlapTop = ball.y + ball.radius - bTop;
            const overlapBottom = bBottom - (ball.y - ball.radius);
            const minOverlapX = Math.min(overlapLeft, overlapRight);
            const minOverlapY = Math.min(overlapTop, overlapBottom);

            if (minOverlapX < minOverlapY) {
              ball.dx = -ball.dx;
            } else {
              ball.dy = -ball.dy;
            }
          }
        }
      });
    });

    // Remove out-of-bounds balls
    for (let i = ballsToRemove.length - 1; i >= 0; i--) {
      balls.splice(ballsToRemove[i], 1);
    }

    // All balls lost
    if (balls.length === 0) {
      livesRef.current -= 1;
      setLives(livesRef.current);
      comboCountRef.current = 0;
      setCombo(0);
      if (livesRef.current <= 0) {
        gameStatusRef.current = 'over';
        setGameStatus('over');
      } else {
        ballsRef.current = [createBall(canvasW)];
      }
    }

    // Level clear
    if (bricks.every((b) => !b.alive) && gameStatusRef.current === 'playing') {
      if (levelRef.current >= MAX_LEVEL) {
        gameStatusRef.current = 'over';
        setGameStatus('over');
      } else {
        gameStatusRef.current = 'levelUp';
        setGameStatus('levelUp');
        setTimeout(() => {
          initLevel(levelRef.current + 1);
          gameStatusRef.current = 'playing';
          setGameStatus('playing');
        }, 1500);
      }
    }

    // Update power-ups
    const puToRemove: number[] = [];
    powerUps.forEach((pu, idx) => {
      pu.y += POWERUP_SPEED;
      pu.frame += 1;

      if (
        pu.y + POWERUP_SIZE / 2 >= paddleY - PADDLE_H / 2 &&
        pu.y - POWERUP_SIZE / 2 <= paddleY + PADDLE_H / 2 &&
        pu.x + POWERUP_SIZE / 2 >= paddle.x &&
        pu.x - POWERUP_SIZE / 2 <= paddle.x + paddle.w
      ) {
        applyPowerUp(pu);
        puToRemove.push(idx);
      }

      if (pu.y > CANVAS_H + 20) puToRemove.push(idx);
    });
    for (let i = puToRemove.length - 1; i >= 0; i--) {
      powerUps.splice(puToRemove[i], 1);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.dx;
      p.y += p.dy;
      p.dy += 0.08;
      p.life -= 1;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update trails
    for (let i = trails.length - 1; i >= 0; i--) {
      trails[i].alpha -= 0.08;
      if (trails[i].alpha <= 0) trails.splice(i, 1);
    }
  }, [createBall, spawnParticles, trySpawnPowerUp, applyPowerUp, getPaddleY, initLevel]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = dprRef.current;
    const scale = scaleRef.current;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

    const w = canvasWRef.current;
    const h = CANVAS_H;
    const paddle = paddleRef.current;
    const paddleY = getPaddleY();
    const balls = ballsRef.current;
    const bricks = bricksRef.current;
    const powerUps = powerUpsRef.current;
    const particles = particlesRef.current;
    const trails = trailsRef.current;

    // Background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 0; j < h; j += 40) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }

    // Trails
    trails.forEach((t) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, BALL_RADIUS * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = isFireballRef.current
        ? `rgba(245, 158, 11, ${t.alpha * 0.4})`
        : `rgba(255,255,255,${t.alpha * 0.3})`;
      ctx.fill();
    });

    // Bricks
    bricks.forEach((brick) => {
      if (!brick.alive) return;
      const bt = BRICK_TYPES[brick.typeIndex];
      const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
      grad.addColorStop(0, bt.gradient[0]);
      grad.addColorStop(1, bt.gradient[1]);
      ctx.fillStyle = grad;
      roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      roundRect(ctx, brick.x + 1, brick.y + 1, brick.w - 2, brick.h / 2, 3);
      ctx.stroke();
    });

    // Paddle
    const paddleGrad = ctx.createLinearGradient(
      paddle.x, paddleY - PADDLE_H / 2,
      paddle.x, paddleY + PADDLE_H / 2
    );
    if (isMagnetRef.current) {
      paddleGrad.addColorStop(0, '#22d3ee');
      paddleGrad.addColorStop(0.5, '#06b6d4');
      paddleGrad.addColorStop(1, '#0891b2');
    } else {
      paddleGrad.addColorStop(0, '#60a5fa');
      paddleGrad.addColorStop(0.5, '#3b82f6');
      paddleGrad.addColorStop(1, '#2563eb');
    }
    ctx.fillStyle = paddleGrad;
    roundRect(ctx, paddle.x, paddleY - PADDLE_H / 2, paddle.w, PADDLE_H, 6);
    ctx.fill();
    // Paddle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, paddle.x + 4, paddleY - PADDLE_H / 2 + 1, paddle.w - 8, PADDLE_H / 3, 3);
    ctx.fill();
    // Magnet indicator
    if (isMagnetRef.current) {
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 2;
      roundRect(ctx, paddle.x - 2, paddleY - PADDLE_H / 2 - 2, paddle.w + 4, PADDLE_H + 4, 8);
      ctx.stroke();
    }

    // Balls
    balls.forEach((ball) => {
      if (isFireballRef.current && !ball.stuck) {
        // Fire ball rendering
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(ball.x - 1.5, ball.y - 1.5, ball.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    });

    // Power-ups
    powerUps.forEach((pu) => {
      const color = POWERUP_COLORS[pu.type];
      const blink = Math.sin(pu.frame * 0.3) * 0.3 + 0.7;
      ctx.globalAlpha = blink;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      roundRect(ctx, pu.x - POWERUP_SIZE / 2, pu.y - POWERUP_SIZE / 2, POWERUP_SIZE, POWERUP_SIZE, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.type, pu.x, pu.y + 1);
      ctx.globalAlpha = 1;
    });

    // Particles
    particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Combo display
    const comboCount = comboCountRef.current;
    if (comboCount >= 3 && gameStatusRef.current === 'playing') {
      const multiplier = 1 + Math.floor(comboCount / 3) * 0.5;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`${comboCount} 连击! x${multiplier.toFixed(1)}`, w - 10, 10);
    }

    // Level up overlay
    if (gameStatusRef.current === 'levelUp') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`第 ${levelRef.current} 关通过！`, w / 2, h / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText('准备进入下一关...', w / 2, h / 2 + 25);
    }

    // Pause overlay
    if (pausedRef.current && gameStatusRef.current === 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('已暂停', w / 2, h / 2 - 10);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText('按 Esc 继续', w / 2, h / 2 + 25);
    }

    // Idle overlay
    if (gameStatusRef.current === 'idle') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('打砖块', w / 2, h / 2 - 30);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText('按「开始游戏」开始', w / 2, h / 2 + 15);
    }

    // Game over overlay
    if (gameStatusRef.current === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, w, h);
      const isWin = livesRef.current > 0;
      ctx.fillStyle = isWin ? '#4ade80' : '#ef4444';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isWin ? '恭喜通关！' : '游戏结束', w / 2, h / 2 - 40);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`最终得分: ${scoreRef.current}`, w / 2, h / 2 + 10);
      if (isWin) {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '16px sans-serif';
        ctx.fillText('所有关卡已通关！', w / 2, h / 2 + 45);
      }
    }
  }, [getPaddleY]);

  const gameLoop = useCallback(() => {
    if (gameStatusRef.current === 'playing' && !pausedRef.current) {
      update();
    }
    draw();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  const endGame = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (scoreRef.current > highScore) {
      setIsNewRecord(true);
      try {
        const res = await fetch('/api/games/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_NAME, score: scoreRef.current }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.score !== undefined) setHighScore(data.data.score);
        }
      } catch { /* silent */ }
    } else {
      setIsNewRecord(false);
    }
  }, [highScore]);

  useEffect(() => {
    if (gameStatus === 'over') endGame();
  }, [gameStatus, endGame]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    setScore(0);
    setLives(MAX_LIVES);
    setIsNewRecord(false);
    comboCountRef.current = 0;
    setCombo(0);
    initLevel(1);
    gameStatusRef.current = 'playing';
    setGameStatus('playing');

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [initLevel, gameLoop]);

  // Keyboard events
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameStatusRef.current === 'playing') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      // Space to launch stuck balls
      if (e.key === ' ' && gameStatusRef.current === 'playing') {
        e.preventDefault();
        launchStuckBalls();
        return;
      }
      keysRef.current.add(e.key);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [launchStuckBalls]);

  // Mouse control
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseMove = (e: MouseEvent) => {
      if (gameStatusRef.current !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width * CANVAS_MAX_W;
      const paddle = paddleRef.current;
      paddle.x = Math.max(0, Math.min(canvasWRef.current - paddle.w, mouseX - paddle.w / 2));
    };
    canvas.addEventListener('mousemove', onMouseMove);
    return () => canvas.removeEventListener('mousemove', onMouseMove);
  }, []);

  // Touch control
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchMove = (e: TouchEvent) => {
      if (gameStatusRef.current !== 'playing') return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const touchX = (touch.clientX - rect.left) / rect.width * CANVAS_MAX_W;
      const paddle = paddleRef.current;
      paddle.x = Math.max(0, Math.min(canvasWRef.current - paddle.w, touchX - paddle.w / 2));
    };
    const onTouchStart = (e: TouchEvent) => {
      // Tap to launch stuck balls on mobile
      if (gameStatusRef.current === 'playing' && isMagnetRef.current) {
        launchStuckBalls();
      }
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
    };
  }, [launchStuckBalls]);

  // Fetch high score
  useEffect(() => {
    const fetchHighScore = async () => {
      try {
        const res = await fetch('/api/games/scores');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            const found = data.data.find(
              (item: { game: string; score: number }) => item.game === GAME_NAME
            );
            if (found) setHighScore(found.score);
          }
        }
      } catch { /* silent */ }
      finally { setLoadingHighScore(false); }
    };
    fetchHighScore();
  }, []);

  // Canvas sizing
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dw = canvas.clientWidth;
      if (dw <= 0) return;
      dprRef.current = Math.min(window.devicePixelRatio || 1, 2);
      scaleRef.current = dw / CANVAS_MAX_W;
      canvas.width = dw * dprRef.current;
      canvas.height = (dw / CANVAS_MAX_W * CANVAS_H) * dprRef.current;
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    const onVis = () => { if (!document.hidden) updateSize(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearEffectTimers();
    };
  }, [clearEffectTimers]);

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

  const maxDisplayLives = Math.max(lives, MAX_LIVES);
  const heartsDisplay = Array.from({ length: maxDisplayLives }, (_, i) => (
    <span
      key={i}
      className={i < lives ? 'opacity-100' : 'opacity-25'}
    >
      ❤️
    </span>
  ));

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto py-2 gap-2">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回大厅
          </Button>
          {gameStatus === 'playing' && <GameControlsHelp info={breakoutControlsInfo} variant="button" />}
        </div>
        <h2 className="text-lg font-bold tracking-wide">🧱 打砖块</h2>
        <div className="w-8" />
      </div>

      <div className="grid grid-cols-4 gap-2 w-full text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-muted-foreground">分数</span>
          <span className="text-xl font-bold text-primary tabular-nums">{score}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Trophy className="h-3 w-3 text-yellow-500" />
            最高分
          </span>
          <span className="text-xl font-bold text-yellow-500 tabular-nums">
            {loadingHighScore ? '...' : highScore}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-muted-foreground">生命</span>
          <div className="text-base leading-tight">{heartsDisplay}</div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-muted-foreground">关卡</span>
          <span className="text-xl font-bold tabular-nums">
            {level}/{MAX_LEVEL}
          </span>
        </div>
      </div>

      {activeEffects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {activeEffects.map((effect, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
            >
              {effect}
            </span>
          ))}
        </div>
      )}

      {combo >= 3 && gameStatus === 'playing' && (
        <div className="text-center">
          <span className="text-sm font-bold text-yellow-400">
            🔥 {combo} 连击! x{(1 + Math.floor(combo / 3) * 0.5).toFixed(1)}
          </span>
        </div>
      )}

      <div ref={containerRef} className="w-full flex justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-border/30 shadow-lg"
          style={{ width: '100%', maxWidth: CANVAS_MAX_W, aspectRatio: `${CANVAS_MAX_W}/${CANVAS_H}`, touchAction: 'none' }}
        />
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        {gameStatus === 'over' && isNewRecord && (
          <p className="text-sm font-semibold text-yellow-500 animate-pulse">
            🎉 新纪录！
          </p>
        )}

        <Button
          onClick={startGame}
          size="lg"
          className="w-full max-w-xs text-base font-semibold"
          disabled={gameStatus === 'playing' || gameStatus === 'levelUp'}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {gameStatus === 'playing'
            ? '游戏中...'
            : gameStatus === 'levelUp'
              ? '过关中...'
              : '开始游戏'}
        </Button>
      </div>
    </div>
  );
}
