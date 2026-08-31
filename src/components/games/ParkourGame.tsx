'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

const GAME_NAME = 'parkour';
const W = 800, H = 400;
const GROUND_Y = 340;
const GRAVITY = 0.42;
const JUMP_V = -9.5;
const PLAYER_W = 30, PLAYER_H = 44;

interface PowerUp {
  x: number; y: number; type: 'coin' | 'magnet' | 'shield' | 'double';
  collected: boolean; phase: number;
}

interface Obstacle {
  x: number; y: number; w: number; h: number; type: 'spike' | 'box' | 'bird'; phase: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string; size: number;
}

interface FloatText { x: number; y: number; text: string; color: string; life: number; }

const parkourControlsInfo: GameControlsInfo = {
  gameName: '跑酷达人',
  desktop: [
    { action: '空格 / 上', keys: ['Space', 'ArrowUp'], description: '跳跃（空中按两次二段跳）' },
    { action: '下', keys: ['ArrowDown'], description: '下滑 / 快速下落' },
    { action: '暂停', keys: ['Escape'], description: '暂停' },
  ],
  mobile: [
    { action: '跳跃按钮', keys: [], description: '点击橙色跳跃按钮（或画布上半部分）' },
    { action: '下滑按钮', keys: [], description: '点击蓝色下滑按钮（或画布下半部分)' },
  ],
  rules: ['自动向前奔跑，点击/空格跳跃', '空中可二段跳', '收集金币得分', '道具: 磁铁、护盾、双倍分数', '躲避尖刺和障碍物'],
  tips: ['掌握好跳跃时机', '二段跳可以帮你跨过大坑', '护盾可以抵挡一次伤害'],
};

interface Props { onBack: () => void; }

type Phase = 'idle' | 'playing' | 'over';

export default function ParkourGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));
  const rafRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [paused, setPaused] = useState(false);

  const g = useRef({
    px: 120, py: GROUND_Y - PLAYER_H, vy: 0, onGround: true, jumps: 0,
    speed: 5, distance: 0, score: 0, coinCount: 0,
    shield: false, shieldTimer: 0, magnet: false, magnetTimer: 0, double: false, doubleTimer: 0,
    obstacles: [] as Obstacle[], powerups: [] as PowerUp[], particles: [] as Particle[], floats: [] as FloatText[],
    spawnTimer: 0, coinTimer: 0, puTimer: 0, frame: 0,
    phase: 'idle' as Phase, paused: false,
    bgOffset: 0,
  }).current;

  const fetchBest = useCallback(async () => {
    try {
      const r = await fetch('/api/games/scores');
      const d = await r.json();
      if (d.data) { const e = d.data.find((s: { game: string; score: number }) => s.game === GAME_NAME); setBestScore(e ? e.score : 0); }
    } catch { /* */ }
  }, []);
  useEffect(() => { fetchBest(); }, [fetchBest]);

  const submitScore = useCallback(async (s: number) => {
    try { await fetch('/api/games/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_NAME, score: s }) }); } catch { /* */ }
    fetchBest();
  }, [fetchBest]);

  const jump = useCallback(() => {
    if (g.phase !== 'playing' || g.paused) return;
    if (g.onGround) { g.vy = JUMP_V; g.onGround = false; g.jumps = 1; }
    else if (g.jumps < 2) { g.vy = JUMP_V * 0.85; g.jumps = 2; }
  }, []);

  const slide = useCallback(() => {
    if (g.phase !== 'playing' || g.paused) return;
    if (!g.onGround) g.vy = 12;
  }, []);

  const startGame = useCallback(() => {
    g.px = 120; g.py = GROUND_Y - PLAYER_H; g.vy = 0; g.onGround = true; g.jumps = 0;
    g.speed = 3.5; g.distance = 0; g.score = 0; g.coinCount = 0;
    g.shield = false; g.shieldTimer = 0; g.magnet = false; g.magnetTimer = 0;
    g.double = false; g.doubleTimer = 0;
    g.obstacles = []; g.powerups = []; g.particles = []; g.floats = [];
    g.spawnTimer = 0; g.coinTimer = 0; g.puTimer = 0; g.frame = 0; g.bgOffset = 0;
    g.phase = 'playing'; g.paused = false;
    setPhase('playing'); setScore(0); setCoins(0); setPaused(false);
  }, []);

  const endGame = useCallback(() => {
    g.phase = 'over'; setPhase('over');
    submitScore(g.score);
  }, [submitScore]);

  const addParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      g.particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 2, life: 30 + Math.random() * 20, color, size: 2 + Math.random() * 3 });
    }
  }, []);

  // Always-active ResizeObserver for canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      dprRef.current = Math.min(window.devicePixelRatio || 1, 2);
      const containerW = canvas.clientWidth;
      if (containerW <= 0) return;
      const displayW = Math.min(containerW, W);
      const displayH = displayW * (H / W);
      const scale = displayW / W;
      scaleRef.current = scale;
      canvas.width = displayW * dprRef.current;
      canvas.height = displayH * dprRef.current;
    };
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(container);
    resizeCanvas();
    return () => ro.disconnect();
  }, [phase]);

  // Game loop (only during playing phase)
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const onVisibilityChange = () => {
      if (document.hidden) { g.paused = true; setPaused(true); }
      else if (g.phase === 'playing') { g.paused = false; setPaused(false); }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    function loop() {
      if (!ctx) return;
      if (g.phase !== 'playing') return;
      if (g.paused) { rafRef.current = requestAnimationFrame(loop); return; }
      ctx.setTransform(dprRef.current * scaleRef.current, 0, 0, dprRef.current * scaleRef.current, 0, 0);
      g.frame++;

      // speed ramp
      g.speed = 3.5 + g.distance / 4000;
      if (g.speed > 9) g.speed = 9;
      g.distance += g.speed;
      g.score = Math.floor(g.distance / 10) + g.coinCount * 10;
      setScore(g.score); setCoins(g.coinCount);
      g.bgOffset = (g.bgOffset + g.speed * 0.3) % 200;

      // timers
      if (g.shield) { g.shieldTimer--; if (g.shieldTimer <= 0) g.shield = false; }
      if (g.magnet) { g.magnetTimer--; if (g.magnetTimer <= 0) g.magnet = false; }
      if (g.double) { g.doubleTimer--; if (g.doubleTimer <= 0) g.double = false; }

      // physics
      g.vy += GRAVITY;
      if (g.vy > 15) g.vy = 15;
      g.py += g.vy;
      if (g.py >= GROUND_Y - PLAYER_H) { g.py = GROUND_Y - PLAYER_H; g.vy = 0; g.onGround = true; g.jumps = 0; }

      // spawn obstacles
      g.spawnTimer--;
      if (g.spawnTimer <= 0) {
        const types: Array<{ type: Obstacle['type']; w: number; h: number; yOffset: number }> = [
          { type: 'spike', w: 25, h: 30, yOffset: 0 },
          { type: 'box', w: 35, h: 40, yOffset: 0 },
          { type: 'bird', w: 30, h: 20, yOffset: -60 - Math.random() * 40 },
        ];
        const t = types[Math.floor(Math.random() * types.length)];
        g.obstacles.push({ x: W + 50, y: GROUND_Y - t.h + t.yOffset, w: t.w, h: t.h, type: t.type, phase: Math.random() * 6.28 });
        g.spawnTimer = 60 + Math.random() * 80 - g.speed * 3;
        if (g.spawnTimer < 30) g.spawnTimer = 30;
      }

      // spawn coins
      g.coinTimer--;
      if (g.coinTimer <= 0) {
        const cy = GROUND_Y - 40 - Math.random() * 80;
        for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
          g.powerups.push({ x: W + 50 + i * 30, y: cy, type: 'coin', collected: false, phase: Math.random() * 6.28 });
        }
        g.coinTimer = 80 + Math.random() * 60;
      }

      // spawn powerups
      g.puTimer--;
      if (g.puTimer <= 0) {
        const types: PowerUp['type'][] = ['magnet', 'shield', 'double'];
        const t = types[Math.floor(Math.random() * types.length)];
        g.powerups.push({ x: W + 50, y: GROUND_Y - 60 - Math.random() * 60, type: t, collected: false, phase: 0 });
        g.puTimer = 300 + Math.random() * 400;
      }

      // move obstacles
      for (const o of g.obstacles) { o.x -= g.speed; o.phase += 0.1; }
      g.obstacles = g.obstacles.filter(o => o.x + o.w > -50);

      // move/collect powerups
      for (const p of g.powerups) {
        p.x -= g.speed; p.phase += 0.08;
        if (p.collected) continue;

        // magnet pull
        if (g.magnet && p.type === 'coin') {
          const dx = (g.px + PLAYER_W / 2) - p.x;
          const dy = (g.py + PLAYER_H / 2) - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) { p.x += dx / dist * 5; p.y += dy / dist * 5; }
        }

        const pcx = g.px + PLAYER_W / 2, pcy = g.py + PLAYER_H / 2;
        const dx = pcx - p.x, dy = pcy - p.y;
        if (dx * dx + dy * dy < 600) {
          p.collected = true;
          if (p.type === 'coin') { g.coinCount++; if (g.double) g.coinCount++; addParticles(p.x, p.y, '#fbbf24', 5); g.floats.push({ x: p.x, y: p.y, text: g.double ? '+20' : '+10', color: '#fbbf24', life: 40 }); }
          else if (p.type === 'magnet') { g.magnet = true; g.magnetTimer = 300; addParticles(p.x, p.y, '#3b82f6', 8); g.floats.push({ x: p.x, y: p.y, text: '磁铁!', color: '#3b82f6', life: 50 }); }
          else if (p.type === 'shield') { g.shield = true; g.shieldTimer = 360; addParticles(p.x, p.y, '#22c55e', 8); g.floats.push({ x: p.x, y: p.y, text: '护盾!', color: '#22c55e', life: 50 }); }
          else if (p.type === 'double') { g.double = true; g.doubleTimer = 300; addParticles(p.x, p.y, '#f97316', 8); g.floats.push({ x: p.x, y: p.y, text: '双倍!', color: '#f97316', life: 50 }); }
        }
      }
      g.powerups = g.powerups.filter(p => p.x > -50);

      // collision with obstacles
      for (const o of g.obstacles) {
        if (g.px + PLAYER_W > o.x + 4 && g.px < o.x + o.w - 4 && g.py + PLAYER_H > o.y + 4 && g.py < o.y + o.h - 4) {
          if (g.shield) { g.shield = false; g.shieldTimer = 0; addParticles(g.px + PLAYER_W / 2, g.py + PLAYER_H / 2, '#22c55e', 12); g.floats.push({ x: g.px, y: g.py - 10, text: '挡住了!', color: '#22c55e', life: 40 }); g.obstacles = g.obstacles.filter(ob => ob !== o); break; }
          else { addParticles(g.px + PLAYER_W / 2, g.py + PLAYER_H / 2, '#ef4444', 15); endGame(); return; }
        }
      }

      // particles
      for (const p of g.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; }
      g.particles = g.particles.filter(p => p.life > 0);
      for (const f of g.floats) { f.y -= 1; f.life--; }
      g.floats = g.floats.filter(f => f.life > 0);

      // DRAW
      // sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#1e3a5f'); skyGrad.addColorStop(0.6, '#f97316'); skyGrad.addColorStop(1, '#fbbf24');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);

      // bg mountains
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i < 3; i++) {
        const ox = (g.bgOffset * (i + 1) * 0.5) % (W + 200) - 100;
        ctx.beginPath(); ctx.moveTo(ox, GROUND_Y);
        ctx.lineTo(ox + 80, GROUND_Y - 60 - i * 20); ctx.lineTo(ox + 160, GROUND_Y);
        ctx.fill();
      }

      // ground
      ctx.fillStyle = '#5a3e1b'; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(0, GROUND_Y, W, 4);
      // ground lines
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const lx = ((i * 50 - g.bgOffset * 2) % (W + 50) + W + 50) % (W + 50) - 25;
        ctx.beginPath(); ctx.moveTo(lx, GROUND_Y + 8); ctx.lineTo(lx + 20, GROUND_Y + 8); ctx.stroke();
      }

      // powerups
      for (const p of g.powerups) {
        if (p.collected) continue;
        const bob = Math.sin(p.phase) * 3;
        if (p.type === 'coin') { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 5, 0, Math.PI * 2); ctx.fill(); }
        else if (p.type === 'magnet') { ctx.fillStyle = '#3b82f6'; ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('🧲', p.x, p.y + bob + 6); }
        else if (p.type === 'shield') { ctx.fillStyle = '#22c55e'; ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('🛡️', p.x, p.y + bob + 6); }
        else if (p.type === 'double') { ctx.fillStyle = '#f97316'; ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('⭐', p.x, p.y + bob + 6); }
      }

      // obstacles
      for (const o of g.obstacles) {
        if (o.type === 'spike') { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x + o.w / 2, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.fill(); }
        else if (o.type === 'box') { ctx.fillStyle = '#78716c'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.strokeStyle = '#57534e'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, o.w, o.h); }
        else if (o.type === 'bird') { const wingY = Math.sin(o.phase) * 5; ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('🦅', o.x + o.w / 2, o.y + o.h / 2 + wingY + 6); }
      }

      // player
      const runFrame = Math.floor(g.frame / 6) % 4;
      if (g.shield) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.px + PLAYER_W / 2, g.py + PLAYER_H / 2, PLAYER_W * 0.8, 0, Math.PI * 2); ctx.stroke(); }
      if (g.magnet) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(g.px + PLAYER_W / 2, g.py + PLAYER_H / 2, 75, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      // body
      ctx.fillStyle = '#f97316';
      ctx.fillRect(g.px + 4, g.py + 8, PLAYER_W - 8, PLAYER_H - 16);
      // head
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(g.px + PLAYER_W / 2, g.py + 8, 10, 0, Math.PI * 2); ctx.fill();
      // eyes
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(g.px + PLAYER_W / 2 + 2, g.py + 5, 3, 4);
      // legs
      ctx.fillStyle = '#1e3a5f';
      const legOff = g.onGround ? Math.sin(runFrame * 1.57) * 4 : 2;
      ctx.fillRect(g.px + 6, g.py + PLAYER_H - 10, 6, 10 + legOff);
      ctx.fillRect(g.px + PLAYER_W - 12, g.py + PLAYER_H - 10, 6, 10 - legOff);

      // particles
      for (const p of g.particles) { ctx.globalAlpha = p.life / 50; ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      ctx.globalAlpha = 1;

      // float texts
      for (const f of g.floats) { ctx.globalAlpha = f.life / 50; ctx.fillStyle = f.color; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y); }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 36);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`分数: ${g.score}`, 10, 24);
      ctx.fillText(`金币: ${g.coinCount}`, 150, 24);
      ctx.textAlign = 'right';
      const speedText = `速度: ${g.speed.toFixed(1)}`;
      ctx.fillText(speedText, W - 10, 24);
      // powerup indicators
      let indicators = '';
      if (g.shield) indicators += '🛡️' + Math.ceil(g.shieldTimer / 60) + 's ';
      if (g.magnet) indicators += '🧲' + Math.ceil(g.magnetTimer / 60) + 's ';
      if (g.double) indicators += '⭐x2 ' + Math.ceil(g.doubleTimer / 60) + 's';
      if (indicators) { ctx.textAlign = 'center'; ctx.fillText(indicators.trim(), W / 2, 24); }

      if (g.paused) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('已暂停', W / 2, H / 2); }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase, endGame, addParticles]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.code === 'ArrowDown') { e.preventDefault(); slide(); }
      if (e.code === 'Escape' && g.phase === 'playing') { e.preventDefault(); g.paused = !g.paused; setPaused(g.paused); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [jump, slide]);

  // GamePlayer pause/resume events
  useEffect(() => {
    const onPause = () => { g.paused = true; setPaused(true); };
    const onResume = () => { g.paused = false; setPaused(false); };
    window.addEventListener('game-pause', onPause);
    window.addEventListener('game-resume', onResume);
    return () => {
      window.removeEventListener('game-pause', onPause);
      window.removeEventListener('game-resume', onResume);
    };
  }, []);

  const handleCanvasInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (g.phase !== 'playing') return;
    e.preventDefault();
    let clientY: number;
    if ('touches' in e) { clientY = e.touches[0]?.clientY ?? 0; }
    else { clientY = e.clientY; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relY = clientY - rect.top;
    if (relY < rect.height * 0.5) jump(); else slide();
  }, [jump, slide]);

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-4 py-2 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2 self-start w-full"><Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">🏃 跑酷达人</h2></div>
        <div className="w-full bg-card border rounded-xl p-4 space-y-4">
          <div className="text-center space-y-2"><p className="text-4xl">🏃</p><p className="text-sm text-muted-foreground">自动奔跑，点击跳跃，空中可二段跳</p></div>
          <div className="flex items-center justify-center gap-2 text-sm"><Trophy className="h-4 w-4 text-yellow-500" /><span>最高: {bestScore}</span></div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="bg-muted rounded-lg p-3 text-center"><span className="text-lg">🧲</span><p className="mt-1">磁铁</p></div>
            <div className="bg-muted rounded-lg p-3 text-center"><span className="text-lg">🛡️</span><p className="mt-1">护盾</p></div>
            <div className="bg-muted rounded-lg p-3 text-center"><span className="text-lg">⭐</span><p className="mt-1">双倍分</p></div>
            <div className="bg-muted rounded-lg p-3 text-center"><span className="text-lg">🦅</span><p className="mt-1">飞鸟</p></div>
          </div>
          <Button onClick={startGame} className="w-full" size="lg">开始</Button>
        </div>
      </div>
    );
  }

  if (phase === 'over') {
    return (
      <div className="flex flex-col items-center gap-4 py-2 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2 self-start w-full"><Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">游戏结束</h2></div>
        <div className="w-full bg-card border rounded-xl p-4 flex flex-col items-center gap-3">
          <p className="text-5xl">{score > bestScore ? '🎉' : '💀'}</p>
          <p className="text-3xl font-bold">{score}</p><p className="text-sm text-muted-foreground">分数</p>
          <p className="text-sm">金币: {coins} | 最高: {bestScore}</p>
          {score > bestScore && score > 0 && <p className="text-yellow-500 font-bold">新纪录!</p>}
          <div className="flex gap-2 w-full mt-2"><Button variant="outline" className="flex-1" onClick={onBack}>返回</Button><Button className="flex-1" onClick={startGame}><RotateCcw className="h-4 w-4 mr-1" />重试</Button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2 w-full max-w-lg mx-auto">
      <div ref={containerRef} className="w-full flex justify-center">
        <canvas ref={canvasRef} style={{ width: '100%', maxWidth: W, aspectRatio: `${W}/${H}`, touchAction: 'none' }} className="rounded-lg border" onClick={handleCanvasInteraction} onTouchStart={handleCanvasInteraction} />
      </div>
      <div className="md:hidden flex items-center justify-center gap-4 w-full max-w-xs">
        <button
          className="flex-1 min-h-14 rounded-xl bg-orange-500/20 border-2 border-orange-500/50 text-orange-400 text-base font-bold active:bg-orange-500/40 transition select-none"
          style={{ touchAction: 'none', userSelect: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); jump(); }}
          onMouseDown={() => jump()}
        >
          ↑ 跳跃
        </button>
        <button
          className="flex-1 min-h-14 rounded-xl bg-blue-500/20 border-2 border-blue-500/50 text-blue-400 text-base font-bold active:bg-blue-500/40 transition select-none"
          style={{ touchAction: 'none', userSelect: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); slide(); }}
          onMouseDown={() => slide()}
        >
          ↓ 下滑
        </button>
      </div>
    </div>
  );
}
