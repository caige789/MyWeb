'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, RotateCcw, Play } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

interface FlappyBirdGameProps {
  onBack: () => void;
}

type Phase = 'settings' | 'playing' | 'gameover';
type Difficulty = 'easy' | 'normal' | 'hard';
type PowerUpType = 'magnet' | 'shield' | 'feather';
type PipeType = 'normal' | 'moving' | 'narrow';

const GAME_NAME = 'flappy';
const CANVAS_W = 360;
const CANVAS_H = 520;
const GROUND_H = 60;
const BIRD_X = 80;
const BIRD_R = 16;
const PIPE_W = 52;
const PIPE_GAP_EASY = 180;
const PIPE_GAP_NORMAL = 140;
const PIPE_GAP_HARD = 100;
const PIPE_SPEED_EASY = 2;
const PIPE_SPEED_NORMAL = 2.8;
const PIPE_SPEED_HARD = 3.8;
const BASE_GRAVITY = 0.28;
const FLAP_VEL = -7;
const PIPE_INTERVAL_EASY = 180;
const PIPE_INTERVAL_NORMAL = 130;
const PIPE_INTERVAL_HARD = 95;
const MIN_GAP = 90;
const COIN_R = 10;
const POWERUP_R = 14;
const MAGNET_DURATION = 300; // frames (~5s at 60fps)
const FEATHER_DURATION = 300;
const MAGNET_RANGE = 100;
const LEVEL_UP_INTERVAL = 10; // pipes per level

const POWERUP_EMOJI: Record<PowerUpType, string> = {
  magnet: '\u2B50',
  shield: '\uD83D\uDEE1\uFE0F',
  feather: '\uD83E\uDDAB',
};

const POWERUP_LABEL: Record<PowerUpType, string> = {
  magnet: '\u78c1\u94c1',
  shield: '\u62a4\u76fe',
  feather: '\u7fbd\u6bdb',
};

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
  pipeType: PipeType;
  moveDir: number;
  moveSpeed: number;
  moveMin: number;
  moveMax: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  collected: boolean;
}

const DIFF_CONFIG: Record<Difficulty, { gap: number; speed: number; interval: number; label: string }> = {
  easy: { gap: PIPE_GAP_EASY, speed: PIPE_SPEED_EASY, interval: PIPE_INTERVAL_EASY, label: '\u7B80\u5355' },
  normal: { gap: PIPE_GAP_NORMAL, speed: PIPE_SPEED_NORMAL, interval: PIPE_INTERVAL_NORMAL, label: '\u666E\u901A' },
  hard: { gap: PIPE_GAP_HARD, speed: PIPE_SPEED_HARD, interval: PIPE_INTERVAL_HARD, label: '\u56F0\u96BE' },
};

function getSkyGradient(ctx: CanvasRenderingContext2D, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#87CEEB');
  g.addColorStop(0.7, '#B0E0F6');
  g.addColorStop(1, '#E0F4FF');
  return g;
}

const flappyControlsInfo: GameControlsInfo = {
  gameName: '\u50cf\u7d20\u9e1f',
  desktop: [
    { action: 'Space', keys: ['Space'], description: '\u6309\u7a7a\u683c\u952e\u98de\u884c' },
    { action: '\u9f20\u6807\u70b9\u51fb', keys: [], description: '\u70b9\u51fb\u5c4f\u5e55\u98de\u884c' },
    { action: '\u6682\u505c', keys: ['Escape'], description: '\u6682\u505c/\u7ee7\u7eed\u6e38\u620f' },
  ],
  mobile: [
    { action: '\u89e6\u6478', keys: [], description: '\u70b9\u51fb\u5c4f\u5e55\u4efb\u610f\u4f4d\u7f6e\u98de\u884c' },
  ],
  rules: [
    '\u63a7\u5236\u5c0f\u9e1f\u7a7f\u8fc7\u7ba1\u9053\u95f4\u9699\u5f97\u5206',
    '\u6bcf\u7a7f\u8fc7\u4e00\u5bf9\u7ba1\u9053\u5f97 1 \u5206',
    '\u6536\u96c6\u91d1\u5e01\u6bcf\u4e2a +5 \u5206',
    '\u62fe\u53d6\u9053\u5177: \u78c1\u94c1(\u5438\u5f15\u91d1\u5e01)\u3001\u62a4\u76fe(\u514d\u6b7b\u4e00\u6b21)\u3001\u7fbd\u6bdb(\u964d\u4f4e\u91cd\u529b)',
    '\u6bcf 10 \u4e2a\u7ba1\u9053\u5347\u4e00\u7ea7, \u95f4\u9699\u7f29\u5c0f\u901f\u5ea6\u52a0\u5feb',
    '\u79fb\u52a8\u7ba1\u9053(\u6a59\u8272)\u4f1a\u4e0a\u4e0b\u79fb\u52a8, \u7a84\u7ba1\u9053(\u7ea2\u8272)\u5f97 3 \u5206',
    '\u649e\u5230\u7ba1\u9053\u3001\u5730\u9762\u6216\u5929\u82b1\u677f\u5219\u6e38\u620f\u7ed3\u675f',
  ],
  tips: [
    '\u8f7b\u8f7b\u70b9\u51fb, \u4e0d\u8981\u957f\u6309',
    '\u4fdd\u6301\u7a33\u5b9a\u7684\u98de\u884c\u9ad8\u5ea6',
    '\u62a4\u76fe\u9002\u5408\u96be\u5ea6\u5927\u7684\u5730\u6bb5\u4f7f\u7528',
    '\u7fbd\u6bdb\u80fd\u8ba9\u7a84\u95f4\u9699\u66f4\u5bb9\u6613\u901a\u8fc7',
  ],
};

export default function FlappyBirdGame({ onBack }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('settings');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [loadingBest, setLoadingBest] = useState(true);

  // game refs
  const birdYRef = useRef(CANVAS_H / 2);
  const velRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerupsRef = useRef<PowerUp[]>([]);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const diffRef = useRef<Difficulty>('normal');
  const phaseRef = useRef<Phase>('settings');
  const passedCountRef = useRef(0); // total pipes passed
  const levelRef = useRef(1);
  const currentGapRef = useRef(0);
  const currentSpeedRef = useRef(0);
  // power-up state
  const magnetTimerRef = useRef(0);
  const shieldActiveRef = useRef(false);
  const featherTimerRef = useRef(0);
  // floating text effects
  const floatTextsRef = useRef<Array<{ x: number; y: number; text: string; life: number; color: string }>>([]);

  const cloudsRef = useRef<Array<{ x: number; y: number; r: number }>>([
    { x: 50, y: 60, r: 30 }, { x: 180, y: 40, r: 25 }, { x: 300, y: 80, r: 35 },
  ]);

  const fetchBestScore = useCallback(async () => {
    try {
      const res = await fetch('/api/games/scores');
      const json = await res.json();
      if (json.data) {
        const entry = json.data.find((s: { game: string; score: number }) => s.game === GAME_NAME);
        setBestScore(entry ? entry.score : 0);
      }
    } catch { /* ignore */ }
    setLoadingBest(false);
  }, []);

  useEffect(() => { fetchBestScore(); }, [fetchBestScore]);

  const submitScore = useCallback(async (s: number) => {
    try {
      await fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_NAME, score: s }),
      });
    } catch { /* ignore */ }
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    velRef.current = FLAP_VEL;
  }, []);

  const addFloatText = useCallback((x: number, y: number, text: string, color: string) => {
    floatTextsRef.current.push({ x, y, text, life: 40, color });
  }, []);

  const initGame = useCallback((diff: Difficulty) => {
    diffRef.current = diff;
    const cfg = DIFF_CONFIG[diff];
    birdYRef.current = CANVAS_H / 2;
    velRef.current = 0;
    pipesRef.current = [];
    coinsRef.current = [];
    powerupsRef.current = [];
    scoreRef.current = 0;
    frameRef.current = 0;
    passedCountRef.current = 0;
    levelRef.current = 1;
    currentGapRef.current = cfg.gap;
    currentSpeedRef.current = cfg.speed;
    magnetTimerRef.current = 0;
    shieldActiveRef.current = false;
    featherTimerRef.current = 0;
    floatTextsRef.current = [];
    setScore(0);
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  // game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      const dw = canvas.clientWidth;
      if (dw <= 0) return;
      dprRef.current = Math.min(window.devicePixelRatio || 1, 2);
      scaleRef.current = dw / CANVAS_W;
      canvas.width = dw * dprRef.current;
      canvas.height = (dw / CANVAS_W * CANVAS_H) * dprRef.current;
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    const onVis = () => { if (!document.hidden) resize(); };
    document.addEventListener('visibilitychange', onVis);

    const playH = CANVAS_H - GROUND_H;

    function loop() {
      if (!ctx) return;
      if (pausedRef.current) { rafRef.current = requestAnimationFrame(loop); return; }
      if (phaseRef.current !== 'playing') return;
      frameRef.current++;
      ctx.setTransform(dprRef.current * scaleRef.current, 0, 0, dprRef.current * scaleRef.current, 0, 0);

      const curGap = currentGapRef.current;
      const curSpeed = currentSpeedRef.current;
      const gravity = featherTimerRef.current > 0 ? BASE_GRAVITY * 0.5 : BASE_GRAVITY;

      // decrement power-up timers
      if (magnetTimerRef.current > 0) magnetTimerRef.current--;
      if (featherTimerRef.current > 0) featherTimerRef.current--;

      // physics
      velRef.current += gravity;
      birdYRef.current += velRef.current;

      // spawn pipe
      const cfg = DIFF_CONFIG[diffRef.current];
      if (frameRef.current % cfg.interval === 0) {
        // determine pipe type: 20% special
        const roll = Math.random();
        let pipeType: PipeType = 'normal';
        if (roll < 0.12) {
          pipeType = 'moving';
        } else if (roll < 0.20) {
          pipeType = 'narrow';
        }

        let gap = curGap;
        if (pipeType === 'narrow') {
          gap = Math.max(MIN_GAP, curGap - 20);
        }

        const minGapY = gap / 2 + 30;
        const maxGapY = playH - gap / 2 - 30;
        const gapY = minGapY + Math.random() * (maxGapY - minGapY);

        pipesRef.current.push({
          x: CANVAS_W + PIPE_W,
          gapY,
          passed: false,
          pipeType,
          moveDir: 1,
          moveSpeed: 0.5 + Math.random() * 0.5,
          moveMin: gap / 2 + 30,
          moveMax: playH - gap / 2 - 30,
        });

        // spawn coins in the gap area (1-3 coins)
        const coinCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < coinCount; i++) {
          const coinX = CANVAS_W + PIPE_W / 2 + (Math.random() - 0.5) * 10;
          const coinYRange = gap - 20;
          const coinY = gapY - coinYRange / 2 + (coinCount === 1
            ? coinYRange / 2
            : (i / (coinCount - 1)) * coinYRange);
          coinsRef.current.push({ x: coinX, y: coinY, collected: false });
        }

        // spawn power-up (12% chance)
        if (Math.random() < 0.12) {
          const types: PowerUpType[] = ['magnet', 'shield', 'feather'];
          const puType = types[Math.floor(Math.random() * types.length)];
          const puY = gapY + (Math.random() - 0.5) * (gap * 0.4);
          powerupsRef.current.push({
            x: CANVAS_W + PIPE_W / 2 + 30 + Math.random() * 20,
            y: puY,
            type: puType,
            collected: false,
          });
        }
      }

      // move pipes and handle moving pipe animation
      for (const p of pipesRef.current) {
        p.x -= curSpeed;

        // moving pipes oscillate
        if (p.pipeType === 'moving') {
          p.gapY += p.moveDir * p.moveSpeed;
          if (p.gapY >= p.moveMax) { p.moveDir = -1; p.gapY = p.moveMax; }
          if (p.gapY <= p.moveMin) { p.moveDir = 1; p.gapY = p.moveMin; }
        }

        // scoring
        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true;
          let pts = 1;
          if (p.pipeType === 'narrow') pts = 3;
          scoreRef.current += pts;
          passedCountRef.current++;
          setScore(scoreRef.current);

          if (pts > 1) {
            addFloatText(BIRD_X, birdYRef.current - 20, `+${pts}`, '#FF6B6B');
          }

          // level up check
          if (passedCountRef.current % LEVEL_UP_INTERVAL === 0) {
            levelRef.current++;
            const newGap = Math.max(MIN_GAP, DIFF_CONFIG[diffRef.current].gap - (levelRef.current - 1) * 5);
            const newSpeed = DIFF_CONFIG[diffRef.current].speed + (levelRef.current - 1) * 0.3;
            currentGapRef.current = newGap;
            currentSpeedRef.current = newSpeed;
            addFloatText(CANVAS_W / 2, CANVAS_H / 2 - 30, `\u7b2c${levelRef.current}\u7ea7!`, '#FFD700');
          }
        }
      }
      pipesRef.current = pipesRef.current.filter(p => p.x + PIPE_W > -10);

      // move coins
      for (const c of coinsRef.current) {
        c.x -= curSpeed;

        // magnet attraction
        if (!c.collected && magnetTimerRef.current > 0) {
          const dx = BIRD_X - c.x;
          const dy = birdYRef.current - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAGNET_RANGE && dist > 1) {
            c.x += (dx / dist) * 4;
            c.y += (dy / dist) * 4;
          }
        }

        // coin collection
        if (!c.collected) {
          const dx = BIRD_X - c.x;
          const dy = birdYRef.current - c.y;
          if (dx * dx + dy * dy < (BIRD_R + COIN_R) * (BIRD_R + COIN_R)) {
            c.collected = true;
            scoreRef.current += 5;
            setScore(scoreRef.current);
            addFloatText(c.x, c.y - 10, '+5', '#FFD700');
          }
        }
      }
      coinsRef.current = coinsRef.current.filter(c => c.x > -20);

      // move and collect power-ups
      for (const pu of powerupsRef.current) {
        pu.x -= curSpeed;

        if (!pu.collected) {
          const dx = BIRD_X - pu.x;
          const dy = birdYRef.current - pu.y;
          if (dx * dx + dy * dy < (BIRD_R + POWERUP_R) * (BIRD_R + POWERUP_R)) {
            pu.collected = true;
            switch (pu.type) {
              case 'magnet':
                magnetTimerRef.current = MAGNET_DURATION;
                addFloatText(pu.x, pu.y - 15, POWERUP_LABEL.magnet, '#FFD700');
                break;
              case 'shield':
                shieldActiveRef.current = true;
                addFloatText(pu.x, pu.y - 15, POWERUP_LABEL.shield, '#00E5FF');
                break;
              case 'feather':
                featherTimerRef.current = FEATHER_DURATION;
                addFloatText(pu.x, pu.y - 15, POWERUP_LABEL.feather, '#E040FB');
                break;
            }
          }
        }
      }
      powerupsRef.current = powerupsRef.current.filter(pu => pu.x > -20);

      // update floating texts
      for (const ft of floatTextsRef.current) {
        ft.y -= 1;
        ft.life--;
      }
      floatTextsRef.current = floatTextsRef.current.filter(ft => ft.life > 0);

      // collision: ground / ceiling
      if (birdYRef.current + BIRD_R > playH || birdYRef.current - BIRD_R < 0) {
        endGame(); return;
      }
      // collision: pipes
      for (const p of pipesRef.current) {
        const pipeGap = p.pipeType === 'narrow'
          ? Math.max(MIN_GAP, currentGapRef.current - 20)
          : currentGapRef.current;
        if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
          const topPipeBottom = p.gapY - pipeGap / 2;
          const botPipeTop = p.gapY + pipeGap / 2;
          if (birdYRef.current - BIRD_R < topPipeBottom || birdYRef.current + BIRD_R > botPipeTop) {
            if (shieldActiveRef.current) {
              shieldActiveRef.current = false;
              addFloatText(BIRD_X, birdYRef.current - 25, '\u62a4\u76fe!', '#00E5FF');
              // push bird back to safe position
              const midY = (topPipeBottom + botPipeTop) / 2;
              birdYRef.current = midY;
              velRef.current = 0;
            } else {
              endGame(); return;
            }
          }
        }
      }

      // ===== DRAWING =====
      // sky
      ctx.fillStyle = getSkyGradient(ctx, CANVAS_H);
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const c of cloudsRef.current) {
        c.x -= 0.3;
        if (c.x + c.r * 2 < 0) c.x = CANVAS_W + c.r;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x - c.r * 0.6, c.y + 5, c.r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x + c.r * 0.7, c.y + 3, c.r * 0.65, 0, Math.PI * 2); ctx.fill();
      }

      // pipes
      for (const p of pipesRef.current) {
        const pipeGap = p.pipeType === 'narrow'
          ? Math.max(MIN_GAP, currentGapRef.current - 20)
          : currentGapRef.current;
        const topBottom = p.gapY - pipeGap / 2;
        const botTop = p.gapY + pipeGap / 2;

        let pipeColor = '#2E8B57';
        let capColor = '#3CB371';
        if (p.pipeType === 'moving') {
          pipeColor = '#E67E22';
          capColor = '#F39C12';
        } else if (p.pipeType === 'narrow') {
          pipeColor = '#C0392B';
          capColor = '#E74C3C';
        }

        // top pipe
        ctx.fillStyle = pipeColor;
        ctx.fillRect(p.x, 0, PIPE_W, topBottom);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, 0, PIPE_W, topBottom);
        // bottom pipe
        ctx.fillStyle = pipeColor;
        ctx.fillRect(p.x, botTop, PIPE_W, playH - botTop);
        ctx.strokeRect(p.x, botTop, PIPE_W, playH - botTop);
        // pipe caps
        ctx.fillStyle = capColor;
        ctx.fillRect(p.x - 4, topBottom - 20, PIPE_W + 8, 20);
        ctx.strokeRect(p.x - 4, topBottom - 20, PIPE_W + 8, 20);
        ctx.fillStyle = capColor;
        ctx.fillRect(p.x - 4, botTop, PIPE_W + 8, 20);
        ctx.strokeRect(p.x - 4, botTop, PIPE_W + 8, 20);

        // moving pipe indicator arrows
        if (p.pipeType === 'moving') {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2195', p.x + PIPE_W / 2, topBottom - 35);
          ctx.fillText('\u2195', p.x + PIPE_W / 2, botTop + 35);
        }

        // narrow pipe bonus indicator
        if (p.pipeType === 'narrow') {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('x3', p.x + PIPE_W / 2, topBottom - 35);
        }
      }

      // coins
      for (const c of coinsRef.current) {
        if (c.collected) continue;
        ctx.beginPath();
        ctx.arc(c.x, c.y, COIN_R, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // inner shine
        ctx.beginPath();
        ctx.arc(c.x - 2, c.y - 2, COIN_R * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
      }

      // power-ups
      for (const pu of powerupsRef.current) {
        if (pu.collected) continue;
        // glow
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, POWERUP_R + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        // bg circle
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, POWERUP_R, 0, Math.PI * 2);
        ctx.fillStyle = pu.type === 'magnet' ? '#FFD700' : pu.type === 'shield' ? '#00BCD4' : '#CE93D8';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // emoji
        ctx.font = `${POWERUP_R}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWERUP_EMOJI[pu.type], pu.x, pu.y);
      }

      // ground
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(0, playH, CANVAS_W, GROUND_H);
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, playH, CANVAS_W, 12);

      // magnet range indicator
      if (magnetTimerRef.current > 0) {
        ctx.beginPath();
        ctx.arc(BIRD_X, birdYRef.current, MAGNET_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,215,0,0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // bird
      ctx.font = `${BIRD_R * 2}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\uD83D\uDC26', BIRD_X, birdYRef.current);

      // shield aura
      if (shieldActiveRef.current) {
        ctx.beginPath();
        ctx.arc(BIRD_X, birdYRef.current, BIRD_R + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(BIRD_X, birdYRef.current, BIRD_R + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,0.15)';
        ctx.fill();
      }

      // feather indicator (small wings effect)
      if (featherTimerRef.current > 0) {
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2728', BIRD_X - 18, birdYRef.current - 8);
        ctx.fillText('\u2728', BIRD_X + 18, birdYRef.current - 8);
      }

      // floating texts
      for (const ft of floatTextsRef.current) {
        const alpha = Math.min(1, ft.life / 20);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
      }

      // HUD
      // score
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(scoreRef.current), CANVAS_W / 2, 50);

      // level
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`\u7b49\u7ea7${levelRef.current}`, 10, 24);

      // active power-up timers (top-right)
      let hudY = 16;
      if (magnetTimerRef.current > 0) {
        const pct = magnetTimerRef.current / MAGNET_DURATION;
        ctx.fillStyle = 'rgba(255,215,0,0.8)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`\u2B50 ${Math.ceil(magnetTimerRef.current / 60)}s`, CANVAS_W - 10, hudY);
        // timer bar
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(CANVAS_W - 70, hudY + 4, 60, 4);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(CANVAS_W - 70, hudY + 4, 60 * pct, 4);
        hudY += 22;
      }
      if (shieldActiveRef.current) {
        ctx.fillStyle = 'rgba(0,229,255,0.8)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('\uD83D\uDEE1\uFE0F \u751f\u6548', CANVAS_W - 10, hudY);
        hudY += 22;
      }
      if (featherTimerRef.current > 0) {
        const pct = featherTimerRef.current / FEATHER_DURATION;
        ctx.fillStyle = 'rgba(206,147,216,0.8)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`\uD83E\uDDAB ${Math.ceil(featherTimerRef.current / 60)}s`, CANVAS_W - 10, hudY);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(CANVAS_W - 70, hudY + 4, 60, 4);
        ctx.fillStyle = '#CE93D8';
        ctx.fillRect(CANVAS_W - 70, hudY + 4, 60 * pct, 4);
        hudY += 22;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    function endGame() {
      phaseRef.current = 'gameover';
      setPhase('gameover');
      submitScore(scoreRef.current);
      fetchBestScore();
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [phase, submitScore, fetchBestScore, addFloatText]);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); flap(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flap]);

  // touch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    flap();
  }, [flap]);

  // GamePlayer pause/resume events
  useEffect(() => {
    const onPause = () => { pausedRef.current = true; };
    const onResume = () => { pausedRef.current = false; };
    window.addEventListener('game-pause', onPause);
    window.addEventListener('game-resume', onResume);
    return () => {
      window.removeEventListener('game-pause', onPause);
      window.removeEventListener('game-resume', onResume);
    };
  }, []);

  const handleClick = useCallback(() => { flap(); }, [flap]);

  if (phase === 'settings') {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-2 max-w-md mx-auto w-full">
        <div className="flex items-center gap-2 self-start">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <GameControlsHelp info={flappyControlsInfo} />
          <h2 className="text-xl font-bold">\uD83D\uDC26 \u50cf\u7d20\u9e1f</h2>
        </div>
        <Card className="w-full">
          <CardHeader className="pb-3"><CardTitle className="text-center">\u8bbe\u7f6e</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">\u96be\u5ea6</span>
              <div className="flex gap-2">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'default' : 'outline'}
                    className="flex-1 min-h-[44px]"
                    onClick={() => setDifficulty(d)}
                  >{DIFF_CONFIG[d].label}</Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 justify-center text-sm">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>\u6700\u9ad8: {loadingBest ? '...' : bestScore}</span>
            </div>
            <Button className="w-full min-h-[44px]" size="lg" onClick={() => initGame(difficulty)}>
              <Play className="h-4 w-4 mr-2" /> \u5f00\u59cb\u6e38\u620f
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'gameover') {
    const isNew = score > bestScore;
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-2 max-w-md mx-auto w-full">
        <div className="flex items-center gap-2 self-start">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-bold">\uD83D\uDC26 \u6e38\u620f\u7ed3\u675f</h2>
        </div>
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="text-5xl">{isNew ? '\uD83C\uDF89' : '\uD83D\uDE22'}</div>
            <div className="text-center">
              <p className="text-3xl font-bold">{score}</p>
              <p className="text-sm text-muted-foreground">\u5f97\u5206</p>
            </div>
            {isNew && <p className="text-yellow-500 font-semibold">\u65b0\u7eaa\u5f55\uff01</p>}
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>\u6700\u9ad8\u5206: {bestScore}</span>
            </div>
            <div className="flex gap-2 w-full">
              <Button className="flex-1 min-h-[44px]" variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> \u8fd4\u56de</Button>
              <Button className="flex-1 min-h-[44px]" onClick={() => initGame(difficulty)}><RotateCcw className="h-4 w-4 mr-1" /> \u91cd\u8bd5</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // playing
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-2 w-full max-w-md mx-auto">
      <div className="flex items-center gap-2 self-start">
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">\uD83D\uDC26 \u50cf\u7d20\u9e1f</h2>
      </div>
      <div ref={containerRef}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', maxWidth: CANVAS_W, aspectRatio: `${CANVAS_W}/${CANVAS_H}`, touchAction: 'none' }}
          className="rounded-lg border border-border"
          onClick={handleClick}
          onTouchStart={handleTouchStart}
        />
      </div>
    </div>
  );
}
