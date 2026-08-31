'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';

const GAME_NAME = 'racing';
const LOGIC_W = 400;
const LOGIC_H = 700;
const LANE_COUNT = 3;
const CAR_W = 40;
const CAR_H = 70;
const ROAD_L = LOGIC_W / 2 - (LANE_COUNT * 60) / 2;
const ROAD_R = ROAD_L + LANE_COUNT * 60;
const TICK_MS = 1000 / 60;

function laneX(lane: number): number {
  return ROAD_L + 60 * lane + 30;
}

interface TrafficCar {
  x: number; y: number; lane: number; speed: number; color: string; w: number; h: number;
}
interface PowerUp {
  x: number; y: number; lane: number; type: 'fuel' | 'boost'; active: boolean;
}

interface Props { onBack: () => void; }
type Phase = 'idle' | 'playing' | 'over';

const CAR_COLORS = ['#ef4444', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

export default function RacingGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));
  const rafRef = useRef(0);
  const pausedRef = useRef(false);
  const lastTsRef = useRef(0);
  const accumRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const phaseRef = useRef<Phase>('idle');
  const stateRef = useRef({
    playerLane: 1, playerX: laneX(1), targetX: laneX(1),
    baseSpeed: 3, score: 0, distance: 0,
    traffic: [] as TrafficCar[], powerups: [] as PowerUp[],
    boostTimer: 0, fuel: 100, roadOffset: 0, spawnTimer: 0, powerupTimer: 0, invincible: 0, frame: 0,
  });
  const bestRef = useRef(0);

  useEffect(() => {
    fetch('/api/games/scores')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.data)) {
          const s = d.data.find((item: { game: string; score: number }) => item.game === GAME_NAME);
          if (s) { setBestScore(s.score); bestRef.current = s.score; }
        }
      }).catch(() => {});
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = dprRef.current;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(container);

    const s = stateRef.current;
    s.playerLane = 1; s.playerX = laneX(1); s.targetX = laneX(1);
    s.baseSpeed = 3; s.score = 0; s.distance = 0;
    s.traffic = []; s.powerups = [];
    s.boostTimer = 0; s.fuel = 100; s.roadOffset = 0;
    s.spawnTimer = 0; s.powerupTimer = 0; s.invincible = 0; s.frame = 0;
    lastTsRef.current = 0; accumRef.current = 0;

    function spawnTraffic() {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
      s.traffic.push({ x: laneX(lane), y: -CAR_H, lane, speed: s.baseSpeed * 0.3 * (0.5 + Math.random() * 1.5), color, w: CAR_W, h: CAR_H });
    }
    function spawnPowerup() {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      s.powerups.push({ x: laneX(lane), y: -30, lane, type: Math.random() < 0.5 ? 'fuel' : 'boost', active: true });
    }

    function drawCar(cx: number, cy: number, color: string, w: number, h: number, isPlayer: boolean, ctx: CanvasRenderingContext2D) {
      const x = cx - w / 2;
      const y = cy - h / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();
      if (isPlayer) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.roundRect(x + 5, y + 5, w - 10, 18, 3); ctx.fill();
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath(); ctx.roundRect(x + 5, y + h - 22, w - 10, 14, 3); ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.roundRect(x - 3, y + 12, 4, 10, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + w - 1, y + 12, 4, 10, 2); ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.roundRect(x - 3, y + h - 24, 4, 10, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + w - 1, y + h - 24, 4, 10, 2); ctx.fill();
        if (s.boostTimer > 0) {
          ctx.fillStyle = '#f97316';
          ctx.globalAlpha = 0.5 + Math.sin(s.frame * 0.4) * 0.3;
          for (let fi = 0; fi < 3; fi++) {
            const fy = cy + h / 2 + 5 + fi * 8;
            const fw = 8 - fi * 2;
            ctx.beginPath(); ctx.ellipse(cx, fy, fw, 5, 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.roundRect(x + 5, y + h - 20, w - 10, 12, 3); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.roundRect(x + 5, y + 5, w - 10, 12, 3); ctx.fill();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.ellipse(cx, cy - h / 2 - 3, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function drawPowerup(p: PowerUp, ctx: CanvasRenderingContext2D) {
      ctx.save();
      if (p.type === 'fuel') {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('\u6cb9', p.x, p.y);
      } else {
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('\u901f', p.x, p.y);
      }
      ctx.restore();
    }

    function update() {
      if (phaseRef.current !== 'playing') return;
      s.frame++;
      const sp = s.boostTimer > 0 ? s.baseSpeed * 1.8 : s.baseSpeed;
      s.distance += sp; s.score = Math.floor(s.distance / 10);
      s.roadOffset = (s.roadOffset + sp) % 40;
      if (s.boostTimer > 0) s.boostTimer--;
      if (s.invincible > 0) s.invincible--;
      s.playerX += (s.targetX - s.playerX) * 0.2;
      s.spawnTimer++;
      const spawnRate = Math.max(20, 60 - s.score / 50);
      if (s.spawnTimer >= spawnRate) {
        s.spawnTimer = 0; spawnTraffic();
        if (s.score > 200 && Math.random() < 0.4) {
          const lane2 = Math.floor(Math.random() * 3);
          if (s.traffic.length > 0 && s.traffic[s.traffic.length - 1].lane !== lane2) {
            s.traffic.push({ x: laneX(lane2), y: -CAR_H - 40, lane: lane2, speed: s.baseSpeed * 0.3 * (0.5 + Math.random() * 1.5), color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], w: CAR_W, h: CAR_H });
          }
        }
      }
      s.powerupTimer++;
      if (s.powerupTimer >= 180) { s.powerupTimer = 0; spawnPowerup(); }
      s.traffic.forEach(t => { t.y += sp - t.speed; });
      s.traffic = s.traffic.filter(t => t.y < LOGIC_H + 100);
      s.powerups.forEach(p => { p.y += sp; });
      s.powerups = s.powerups.filter(p => p.y < LOGIC_H + 50 && p.active);
      if (s.invincible <= 0) {
        for (const t of s.traffic) {
          if (Math.abs(t.x - s.playerX) < (t.w + CAR_W) / 2 - 4 && Math.abs(t.y - (LOGIC_H - 80)) < (t.h + CAR_H) / 2 - 4) {
            phaseRef.current = 'over'; setPhase('over'); setScore(s.score); setSpeed(Math.floor(sp * 20));
            if (s.score > bestRef.current) {
              setNewRecord(true); setBestScore(s.score); bestRef.current = s.score;
              fetch('/api/games/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_NAME, score: s.score }) }).catch(() => {});
            }
            return;
          }
        }
      }
      for (const p of s.powerups) {
        if (!p.active) continue;
        if (Math.abs(p.x - s.playerX) < 28 && Math.abs(p.y - (LOGIC_H - 80)) < 28) {
          p.active = false;
          if (p.type === 'fuel') s.fuel = Math.min(100, s.fuel + 30);
          else s.boostTimer = 120;
        }
      }
      s.baseSpeed = 3 + s.score / 100;
      setScore(s.score); setSpeed(Math.floor(sp * 20));
    }

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const displayW = canvas.width;
      const displayH = canvas.height;
      const scaleX = displayW / LOGIC_W;
      const scaleY = displayH / LOGIC_H;
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      ctx.fillStyle = '#4ade80'; ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
      ctx.fillStyle = '#374151'; ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, LOGIC_H);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ROAD_L, 0); ctx.lineTo(ROAD_L, LOGIC_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ROAD_R, 0); ctx.lineTo(ROAD_R, LOGIC_H); ctx.stroke();
      ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2; ctx.setLineDash([20, 20]); ctx.lineDashOffset = -s.roadOffset;
      for (let i = 1; i < LANE_COUNT; i++) { const lx = ROAD_L + 60 * i; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, LOGIC_H); ctx.stroke(); }
      ctx.setLineDash([]);

      s.powerups.forEach(p => { if (p.active) drawPowerup(p, ctx); });
      s.traffic.forEach(t => drawCar(t.x, t.y, t.color, t.w, t.h, false, ctx));

      if (s.invincible > 0 && s.invincible % 6 < 3) { /* blink */ }
      else { drawCar(s.playerX, LOGIC_H - 80, '#fbbf24', CAR_W, CAR_H, true, ctx); }

      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, LOGIC_W, 36);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`\u5f97\u5206: ${s.score}`, 10, 18);
      ctx.textAlign = 'center';
      ctx.fillText(`\u901f\u5ea6: ${Math.floor((s.boostTimer > 0 ? s.baseSpeed * 1.8 : s.baseSpeed) * 20)}`, LOGIC_W / 2, 18);
      if (s.boostTimer > 0) {
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(`\u52a0\u901f ${Math.ceil(s.boostTimer / 60)}s`, LOGIC_W - 10, 18);
      }
    }

    function gameLoop(timestamp: number) {
      if (lastTsRef.current === 0) lastTsRef.current = timestamp;
      let dt = timestamp - lastTsRef.current;
      lastTsRef.current = timestamp;
      if (dt > 200) dt = 200;
      accumRef.current += dt;
      while (accumRef.current >= TICK_MS) { accumRef.current -= TICK_MS; update(); }
      draw();
      rafRef.current = requestAnimationFrame(gameLoop);
    }

    rafRef.current = requestAnimationFrame(gameLoop);
    return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, [phase, resizeCanvas]);

  const moveLeft = useCallback(() => {
    const s = stateRef.current;
    if (s.playerLane > 0) { s.playerLane--; s.targetX = laneX(s.playerLane); }
  }, []);
  const moveRight = useCallback(() => {
    const s = stateRef.current;
    if (s.playerLane < LANE_COUNT - 1) { s.playerLane++; s.targetX = laneX(s.playerLane); }
  }, []);

  const startGame = useCallback(() => { phaseRef.current = 'playing'; setPhase('playing'); setNewRecord(false); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); moveLeft(); }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); moveRight(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveLeft, moveRight]);

  useEffect(() => {
    const onPause = () => { pausedRef.current = true; };
    const onResume = () => { pausedRef.current = false; };
    window.addEventListener('game-pause', onPause);
    window.addEventListener('game-resume', onResume);
    return () => { window.removeEventListener('game-pause', onPause); window.removeEventListener('game-resume', onResume); };
  }, []);

  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    if (x < rect.width / 2) moveLeft(); else moveRight();
  }, [moveLeft, moveRight]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 2) moveLeft(); else moveRight();
  }, [moveLeft, moveRight]);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto py-2 gap-2">
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />\u8fd4\u56de
        </Button>
        <h2 className="text-lg font-bold">\u8d5b\u8f66\u72c2\u98d9</h2>
        <div className="w-16" />
      </div>

      <Card className="w-full border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">\u901f\u5ea6</span>
            <span className="text-xl font-bold text-primary tabular-nums">{speed}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">\u5f97\u5206</span>
            <span className="text-xl font-bold tabular-nums">{score}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" />\u6700\u9ad8\u5206
            </span>
            <span className="text-xl font-bold text-yellow-500 tabular-nums">{bestScore}</span>
          </div>
        </CardContent>
      </Card>

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="w-16 h-28 rounded-lg bg-yellow-400 flex items-center justify-center relative">
            <div className="w-12 h-20 rounded-md bg-gray-800" />
            <div className="absolute top-2 left-1 w-3 h-4 rounded-sm bg-yellow-300" />
            <div className="absolute top-2 right-1 w-3 h-4 rounded-sm bg-yellow-300" />
          </div>
          <p className="text-muted-foreground text-sm text-center">\u70b9\u51fb\u5c4f\u5e55\u5de6\u534a\u90e8\u5206\u5411\u5de6\u53d8\u9053<br />\u70b9\u51fb\u53f3\u534a\u90e8\u5206\u5411\u53f3\u53d8\u9053</p>
          <Button size="lg" onClick={startGame} className="min-h-12 text-base font-semibold">\u5f00\u59cb</Button>
        </div>
      )}

      {(phase === 'playing' || phase === 'over') && (
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            style={{ aspectRatio: `${LOGIC_W}/${LOGIC_H}`, touchAction: 'none' }}
            onTouchStart={handleTouch}
            onClick={handleCanvasClick}
          />
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1 min-h-12 text-base font-semibold" onTouchStart={(e) => { e.preventDefault(); moveLeft(); }} onClick={moveLeft}>\u5de6\u79fb</Button>
            <Button variant="outline" className="flex-1 min-h-12 text-base font-semibold" onTouchStart={(e) => { e.preventDefault(); moveRight(); }} onClick={moveRight}>\u53f3\u79fb</Button>
          </div>
        </div>
      )}

      {phase === 'over' && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-50">
          <div className="bg-card rounded-xl p-6 flex flex-col items-center gap-3 max-w-xs w-full mx-4">
            <p className="text-2xl font-bold">\u78b0\u649e!</p>
            <p className="text-xl">\u5f97\u5206: {score}</p>
            {newRecord && <p className="text-yellow-400 font-bold animate-pulse">\u65b0\u7eaa\u5f55!</p>}
            <Button size="lg" onClick={startGame} className="min-h-12 w-full font-semibold"><RotateCcw className="h-4 w-4 mr-2" />\u91cd\u8bd5</Button>
            <Button variant="outline" onClick={onBack} className="min-h-11 w-full">\u8fd4\u56de</Button>
          </div>
        </div>
      )}
    </div>
  );
}
