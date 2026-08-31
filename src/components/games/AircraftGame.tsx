'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, ShoppingCart } from 'lucide-react';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const aircraftControlsInfo: GameControlsInfo = {
  gameName: '\u98de\u673a\u5927\u6218',
  desktop: [
    { action: '\u9f20\u6807\u79fb\u52a8 / WASD / \u65b9\u5411\u952e', keys: ['W', 'A', 'S', 'D', '\u2190', '\u2191', '\u2192', '\u2193'], description: '\u79fb\u52a8\u98de\u673a\u4f4d\u7f6e(\u4e0a\u4e0b\u5de6\u53f3)' },
    { action: '\u7a7a\u683c / \u9f20\u6807\u70b9\u51fb', keys: ['Space'], description: '\u53d1\u5c04\u5b50\u5f39' },
    { action: '\u6682\u505c', keys: ['Escape'], description: '\u6682\u505c/\u7ee7\u7eed\u6e38\u620f' },
  ],
  mobile: [
    { action: '\u89e6\u6478\u6ed1\u52a8', keys: [], description: '\u62d6\u52a8\u624b\u6307\u63a7\u5236\u98de\u673a\u79fb\u52a8(\u4e0a\u4e0b\u5de6\u53f3)' },
    { action: '\u81ea\u52a8\u53d1\u5c04', keys: [], description: '\u89e6\u6478\u5c4f\u5e55\u65f6\u81ea\u52a8\u8fde\u7eed\u53d1\u5c04\u5b50\u5f39' },
  ],
  rules: [
    '\u517110\u4e2a\u5173\u5361\uff0c\u6bcf\u5173\u51fb\u843d20\u4e2a\u654c\u4eba\u540e\u6311\u6218Boss',
    '\u51fb\u8d25Boss\u8fdb\u5165\u4e0b\u4e00\u5173\uff0cBoss\u67095\u79cd\u4e0d\u540c\u7c7b\u578b',
    '\u88ab\u654c\u673a\u3001\u5b50\u5f39\u78b0\u5230\u635f\u59311\u751f\u547d\u5e76\u964d\u7ea7\u6b66\u5668',
    '\u6536\u96c6\u6389\u843d\u9053\u5177\uff1a\u6b66\u5668\u5347\u7ea7\u3001\u56de\u8840\u3001\u70b8\u5f39\u3001\u62a4\u76fe',
    '\u51fb\u6740\u654c\u4eba\u83b7\u5f97\u91d1\u5e01\uff0c\u7528\u4e8e\u5546\u5e97\u8d2d\u4e70\u76ae\u80a4',
  ],
  tips: [
    '\u6ce8\u610fBoss\u9884\u8b66\uff0c\u63d0\u524d\u51c6\u5907\u95ea\u907f',
    '\u62a4\u76feBoss\u9700\u5148\u7834\u76fe\u518d\u8f93\u51fa',
    '\u62fe\u53d6\u6b66\u5668\u5347\u7ea7\u9053\u5177\u63d0\u5347\u706b\u529b',
    '\u7b2c7\u5173\u8d77\u654c\u4eba\u4f1a\u53cd\u51fb\uff0c\u6ce8\u610f\u8d70\u4f4d',
    '\u4e0d\u540c\u76ae\u80a4\u6709\u4e0d\u540c\u7684\u5b50\u5f39\u7279\u6548\u548c\u5c5e\u6027\u52a0\u6210',
  ],
};

// ==================== TYPES & CONSTANTS ====================

interface AircraftGameProps {
  onBack: () => void;
}

const LOGIC_W = 480;
const LOGIC_H = 640;
const GAME_NAME = 'aircraft';
const PLAYER_W = 40;
const PLAYER_H = 48;
const BASE_PLAYER_SPEED = 6;
const BULLET_W = 4;
const BULLET_H = 14;
const BASE_SHOOT_INTERVAL = 10;
const POWERUP_CHANCE = 0.20;
const SHIELD_DURATION = 300;
const INVINCIBLE_DURATION = 90;
const STAGE_INVINCIBLE_DURATION = 180;
const MAX_WEAPON_LEVEL = 4;
const BASE_MAX_LIVES = 5;
const BASE_INITIAL_LIVES = 3;
const BOSS_W = 64;
const BOSS_H = 56;
const BOSS_BULLET_SPEED = 3.5;
const BOSS_SPREAD_ANGLE = Math.PI / 6;
const BOSS_SHOOT_INTERVAL = 80;
const SCREEN_FLASH_FRAMES = 15;
const TICK_MS = 1000 / 60;

// Stage system constants
const STAGE_KILLS_NEEDED = 35;
const TOTAL_STAGES = 10;
const WARNING_THRESHOLD = 18;
const WARNING_DURATION = 120;
const STAGE_TRANSITION_DURATION = 180;
const ENEMY_SHOOT_STAGE = 7;
const ENEMY_SHOOT_CHANCE = 0.10;
const ENEMY_SHOOT_INTERVAL = 120;

// ==================== SKIN DEFINITIONS ====================

interface SkinDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  bonusDesc: string;
  attackType: string;
  desc: string;
  speedBonus: number;
  lifeBonus: number;
  fireRateBonus: number;
}

const SKINS: SkinDef[] = [
  { id: 'default', name: '\u9ed8\u8ba4\u6218\u673a', emoji: '\u2708\ufe0f', cost: 0, bonusDesc: '\u65e0', attackType: 'Normal', desc: '\u514d\u8d39\u9ed8\u8ba4\u673a\u578b', speedBonus: 0, lifeBonus: 0, fireRateBonus: 0 },
  { id: 'thunder', name: '\u96f7\u7535\u6218\u673a', emoji: '\u26a1', cost: 100, bonusDesc: '+10%\u901f\u5ea6', attackType: 'Lightning', desc: '\u96f7\u7535\u653b\u51fb', speedBonus: 0.1, lifeBonus: 0, fireRateBonus: 0 },
  { id: 'phoenix', name: '\u51e4\u51f0\u6218\u673a', emoji: '\ud83d\udd25', cost: 250, bonusDesc: '+1\u6700\u5927\u751f\u547d', attackType: 'Fire', desc: '\u6d78\u706b\u91cd\u751f', speedBonus: 0, lifeBonus: 1, fireRateBonus: 0 },
  { id: 'ice', name: '\u51b0\u9f99\u6218\u673a', emoji: '\ud83d\udc09', cost: 400, bonusDesc: '+20%\u5c04\u901f', attackType: 'Ice', desc: '\u51b0\u51bb\u4e00\u5207', speedBonus: 0, lifeBonus: 0, fireRateBonus: 0.2 },
  { id: 'star', name: '\u661f\u8212\u6218\u673a', emoji: '\u2b50', cost: 600, bonusDesc: '+2\u6700\u5927\u751f\u547d,+10%\u901f\u5ea6', attackType: 'Star', desc: '\u7ec8\u6781\u529b\u91cf', speedBonus: 0.1, lifeBonus: 2, fireRateBonus: 0 },
  { id: 'shadow', name: '\u6697\u5f71\u6218\u673a', emoji: '\ud83e\udd87', cost: 1000, bonusDesc: '+15%\u901f\u5ea6,+1\u751f\u547d', attackType: 'Shadow', desc: '\u6697\u5f71\u7edf\u6cbb', speedBonus: 0.15, lifeBonus: 1, fireRateBonus: 0 },
];

function getSkinDef(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

// ==================== SKIN STORAGE ====================

interface SkinStorage {
  owned: string[];
  equipped: string;
}

const DEFAULT_SKIN_STORAGE: SkinStorage = { owned: ['default'], equipped: 'default' };

function loadSkins(): SkinStorage {
  try {
    const raw = localStorage.getItem('aircraft-skins');
    if (raw) {
      const parsed = JSON.parse(raw) as SkinStorage;
      if (parsed.owned && parsed.equipped && parsed.owned.includes(parsed.equipped)) {
        return parsed;
      }
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_SKIN_STORAGE };
}

function saveSkins(skins: SkinStorage) {
  localStorage.setItem('aircraft-skins', JSON.stringify(skins));
}

function loadWallet(): number {
  try {
    const raw = localStorage.getItem('aircraft-coins');
    if (raw) return parseInt(raw, 10) || 0;
  } catch {
    // fall through
  }
  return 0;
}

function saveWallet(coins: number) {
  localStorage.setItem('aircraft-coins', String(coins));
}

// ==================== ENEMY TYPES ====================

enum EnemyType {
  Normal = 'normal',
  Fast = 'fast',
  Tank = 'tank',
}

const ENEMY_CONFIG: Record<EnemyType, { w: number; h: number; hp: number; score: number; speed: number; coins: number }> = {
  [EnemyType.Normal]: { w: 30, h: 30, hp: 1, score: 10, speed: 2.0, coins: 1 },
  [EnemyType.Fast]: { w: 22, h: 22, hp: 1, score: 15, speed: 4.0, coins: 2 },
  [EnemyType.Tank]: { w: 48, h: 48, hp: 3, score: 30, speed: 1.0, coins: 3 },
};

const BOSS_EMOJIS = ['', '\ud83d\udc7d', '\ud83d\udef8', '\ud83e\udd81', '\ud83d\udc09', '\ud83d\udc7f'];
const BOSS_TYPE_NAMES = ['', '\u6563\u5c04', '\u8fde\u5c04', '\u62a4\u76fe', '\u53ec\u5524', '\u7ec8\u6781'];

// Power-up types
enum PowerUpType {
  Weapon = 'weapon',
  Heal = 'heal',
  Bomb = 'bomb',
  Shield = 'shield',
}

const POWERUP_EMOJIS: Record<PowerUpType, string> = {
  [PowerUpType.Weapon]: '\ud83d\udd2b',
  [PowerUpType.Heal]: '\ud83d\udc9a',
  [PowerUpType.Bomb]: '\ud83d\udca3',
  [PowerUpType.Shield]: '\ud83d\udee1\ufe0f',
};

const POWERUP_COLORS: Record<PowerUpType, string> = {
  [PowerUpType.Weapon]: '#f59e0b',
  [PowerUpType.Heal]: '#22c55e',
  [PowerUpType.Bomb]: '#ef4444',
  [PowerUpType.Shield]: '#06b6d4',
};

// ==================== GAME OBJECTS ====================

interface Star {
  x: number; y: number; r: number; alpha: number; twinkleSpeed: number; phase: number;
}

interface Player {
  x: number; y: number;
  shieldTimer: number;
  weaponLevel: number;
  lives: number;
  maxLives: number;
  invincibleTimer: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  pierce: number;
  slowFrames: number;
  dmgMul: number;
}

interface EnemyBullet {
  x: number; y: number; vx: number; vy: number;
}

interface Enemy {
  x: number; y: number;
  type: EnemyType;
  hp: number; maxHp: number;
  speed: number;
  baseSpeed: number;
  w: number; h: number;
  score: number;
  coins: number;
  shootTimer: number;
  slowTimer: number;
}

interface Boss {
  x: number; y: number;
  hp: number; maxHp: number;
  bossType: number;
  emoji: string;
  flashTimer: number;
  shootTimer: number;
  dirX: number;
  score: number;
  entered: boolean;
  shieldHp: number;
  shieldMaxHp: number;
  shieldRegenTimer: number;
  summonTimer: number;
  specialTimer: number;
  spiralAngle: number;
  enraged: boolean;
  aimedShotTimer: number;
  shotCount: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; r: number;
}

interface PowerUp {
  x: number; y: number;
  type: PowerUpType;
  phase: number;
}

type GameStatus = 'idle' | 'playing' | 'over' | 'shop';

// ==================== HELPERS ====================

function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * LOGIC_W,
      y: Math.random() * LOGIC_H,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.6 + 0.4,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createExplosion(x: number, y: number, color: string, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: Math.random() * 20 + 15,
      maxLife: 35,
      color,
      r: Math.random() * 3 + 1,
    });
  }
  return particles;
}

function rectCollide(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}

function getBossTypeForStage(stage: number): number {
  if (stage <= 2) return 1;
  if (stage <= 4) return 2;
  if (stage <= 6) return 3;
  if (stage <= 8) return 4;
  return 5;
}

// ==================== DRAWING FUNCTIONS ====================

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, frame: number, skinEmoji: string, skinAttackType: string) {
  ctx.save();
  ctx.translate(p.x, p.y);

  if (p.invincibleTimer > 0 && Math.floor(frame / 3) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  // Tail flame
  let flameColor1 = '#38bdf8';
  let flameColor2 = '#f97316';
  if (skinAttackType === 'Fire') { flameColor1 = '#f97316'; flameColor2 = '#ef4444'; }
  else if (skinAttackType === 'Ice') { flameColor1 = '#06b6d4'; flameColor2 = '#a5f3fc'; }
  else if (skinAttackType === 'Star') { flameColor1 = '#fbbf24'; flameColor2 = '#f472b6'; }
  else if (skinAttackType === 'Shadow') { flameColor1 = '#7c3aed'; flameColor2 = '#1e1b4b'; }
  else if (skinAttackType === 'Lightning') { flameColor1 = '#fbbf24'; flameColor2 = '#fde047'; }

  const flameLen = 12 + Math.sin(frame * 0.5) * 4;
  const flameW = 8 + Math.sin(frame * 0.7) * 2;
  const flameGrad = ctx.createLinearGradient(0, PLAYER_H / 2, 0, PLAYER_H / 2 + flameLen);
  flameGrad.addColorStop(0, flameColor1);
  flameGrad.addColorStop(0.4, flameColor2);
  flameGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-flameW, PLAYER_H / 2 - 2);
  ctx.lineTo(flameW, PLAYER_H / 2 - 2);
  ctx.lineTo(0, PLAYER_H / 2 + flameLen);
  ctx.closePath();
  ctx.fill();

  // Skin emoji
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(skinEmoji, 0, -2);

  // Shield bubble
  if (p.shieldTimer > 0) {
    const shieldAlpha = p.shieldTimer < 60 ? (Math.sin(frame * 0.3) * 0.3 + 0.4) : 0.5;
    ctx.strokeStyle = `rgba(6, 182, 212, ${shieldAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, PLAYER_W / 2 + 8, PLAYER_H / 2 + 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.type === EnemyType.Normal) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, e.h / 2);
    ctx.lineTo(-e.w / 2, -e.h / 2);
    ctx.lineTo(e.w / 2, -e.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, e.h / 2 - 6);
    ctx.lineTo(-e.w / 4, -e.h / 4);
    ctx.moveTo(0, e.h / 2 - 6);
    ctx.lineTo(e.w / 4, -e.h / 4);
    ctx.stroke();
  } else if (e.type === EnemyType.Fast) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, e.h / 2);
    ctx.lineTo(-e.w / 2, -e.h / 3);
    ctx.lineTo(-e.w / 4, -e.h / 2);
    ctx.lineTo(e.w / 4, -e.h / 2);
    ctx.lineTo(e.w / 2, -e.h / 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === EnemyType.Tank) {
    const r = e.w / 2;
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d8b4fe';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * (r * 0.55);
      const py = Math.sin(angle) * (r * 0.55);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Slow indicator
  if (e.slowTimer > 0) {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.w / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // HP bar
  if (e.hp < e.maxHp) {
    const barW = e.w * 0.8;
    const barH = 3;
    const barX = e.x - barW / 2;
    const barY = e.y - e.h / 2 - 6;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, frame: number) {
  ctx.save();
  ctx.translate(boss.x, boss.y);

  if (boss.flashTimer > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(frame) * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 0, BOSS_W / 2 + 4, BOSS_H / 2 + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (boss.enraged) {
    const enrageAlpha = 0.15 + Math.sin(frame * 0.2) * 0.1;
    ctx.fillStyle = `rgba(255, 0, 0, ${enrageAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, BOSS_W / 2 + 12, BOSS_H / 2 + 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = `${BOSS_H}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(boss.emoji, 0, 2);

  ctx.restore();

  // Boss HP bar
  const barW = LOGIC_W * 0.6;
  const barH = 8;
  const barX = (LOGIC_W - barW) / 2;
  const barY = 6;

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = boss.hp / boss.maxHp;
  const hpColor = hpRatio > 0.5 ? '#ef4444' : hpRatio > 0.25 ? '#f97316' : '#fbbf24';
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`\u9996\u9886 - ${BOSS_TYPE_NAMES[boss.bossType]}`, LOGIC_W / 2, barY + barH + 2);

  if (boss.bossType === 3 && boss.shieldMaxHp > 0) {
    const shieldBarY = barY + barH + 16;
    const shieldRatio = boss.shieldHp / boss.shieldMaxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(barX - 1, shieldBarY - 1, barW + 2, 5 + 2);
    ctx.fillStyle = shieldRatio > 0 ? '#3b82f6' : '#1e3a5f';
    ctx.fillRect(barX, shieldBarY, barW * shieldRatio, 5);
    ctx.strokeStyle = 'rgba(100,180,255,0.4)';
    ctx.strokeRect(barX - 1, shieldBarY - 1, barW + 2, 5 + 2);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u62a4\u76fe', LOGIC_W / 2, shieldBarY + 6);
  }
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pw: PowerUp) {
  const glow = 0.3 + Math.sin(pw.phase) * 0.2;
  const color = POWERUP_COLORS[pw.type];

  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pw.x, pw.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pw.x, pw.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(POWERUP_EMOJIS[pw.type], pw.x, pw.y);
}

function drawEnemyBullet(ctx: CanvasRenderingContext2D, b: EnemyBullet) {
  ctx.save();
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 5;
  ctx.fillStyle = '#fca5a5';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawCanvasHUD(
  ctx: CanvasRenderingContext2D,
  p: Player,
  bossActive: boolean,
  stage: number,
  stageKills: number,
  coins: number,
) {
  const topOffset = bossActive ? 32 : 4;
  const extraOffset = bossActive ? 12 : 0;

  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let heartsStr = '';
  for (let i = 0; i < p.lives; i++) heartsStr += '\u2764';
  ctx.fillStyle = '#ef4444';
  ctx.fillText(heartsStr, 6, topOffset + extraOffset);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`\u7b2c${stage}\u5173`, 6, topOffset + extraOffset + 18);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.fillText(`\u51fb\u6740: ${stageKills}/${STAGE_KILLS_NEEDED}`, 6, topOffset + extraOffset + 32);

  // Coin counter
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`\ud83e\ude99 ${coins}`, 6, topOffset + extraOffset + 46);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 12px sans-serif';
  const wpnNames = ['', '\u4e00\u7ea7', '\u4e8c\u7ea7', '\u4e09\u7ea7', '\u56db\u7ea7'];
  ctx.fillText(`\u6b66\u5668 ${wpnNames[p.weaponLevel]}`, LOGIC_W - 6, topOffset + extraOffset);
  ctx.fillStyle = '#ffffff';
}

// ==================== MAIN COMPONENT ====================

export default function AircraftGame({ onBack }: AircraftGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));
  const rafRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>('idle');
  const playerRef = useRef<Player>({ x: LOGIC_W / 2, y: LOGIC_H - 60, shieldTimer: 0, weaponLevel: 1, lives: BASE_INITIAL_LIVES, maxLives: BASE_MAX_LIVES, invincibleTimer: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<EnemyBullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const bossRef = useRef<Boss | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const powerupsRef = useRef<PowerUp[]>([]);
  const starsRef = useRef<Star[]>(createStars(80));
  const scoreRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);
  const killCountRef = useRef<number>(0);
  const stageRef = useRef<number>(1);
  const stageKillsRef = useRef<number>(0);
  const warningRef = useRef<number>(0);
  const stageTransitionRef = useRef<number>(0);
  const victoryRef = useRef<boolean>(false);
  const lastShootRef = useRef<number>(0);
  const inputXRef = useRef<number | null>(null);
  const inputYRef = useRef<number | null>(null);
  const isMobileRef = useRef<boolean>(false);
  const shootRequestRef = useRef<boolean>(false);
  const highScoreRef = useRef<number>(0);
  const screenFlashRef = useRef<number>(0);
  const scoreSubmittedRef = useRef<boolean>(false);
  const keysDownRef = useRef<Set<string>>(new Set());
  const skinIdRef = useRef<string>('default');
  const playerSpeedRef = useRef<number>(BASE_PLAYER_SPEED);
  const maxLivesRef = useRef<number>(BASE_MAX_LIVES);
  const initialLivesRef = useRef<number>(BASE_INITIAL_LIVES);
  const shootIntervalMulRef = useRef<number>(1);

  // UI state
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [stage, setStage] = useState<number>(1);
  const [loadingHighScore, setLoadingHighScore] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const lastTsRef = useRef<number>(0);
  const accumRef = useRef<number>(0);
  const [lives, setLives] = useState<number>(BASE_INITIAL_LIVES);
  const [weaponLevel, setWeaponLevel] = useState<number>(1);
  const [victory, setVictory] = useState<boolean>(false);
  const [sessionCoins, setSessionCoins] = useState<number>(0);
  const [walletCoins, setWalletCoins] = useState<number>(0);
  const [skinStorage, setSkinStorage] = useState<SkinStorage>(loadSkins);

  const equippedSkin = skinStorage.equipped;

  // Damage the player
  const damagePlayer = useCallback(() => {
    const p = playerRef.current;
    if (p.shieldTimer > 0 || p.invincibleTimer > 0) return;

    p.lives--;
    p.weaponLevel = Math.max(1, p.weaponLevel - 1);
    p.invincibleTimer = INVINCIBLE_DURATION;

    setLives(p.lives);
    setWeaponLevel(p.weaponLevel);

    particlesRef.current.push(...createExplosion(p.x, p.y, '#38bdf8', 12));

    if (p.lives <= 0) {
      statusRef.current = 'over';
      setGameStatus('over');
      setVictory(victoryRef.current);
      particlesRef.current.push(...createExplosion(p.x, p.y, '#f97316', 25));
    }
  }, []);

  // Spawn a regular enemy
  const spawnEnemy = useCallback(() => {
    const stg = stageRef.current;
    const rand = Math.random();
    let type: EnemyType;

    const tankChance = stg >= 4 ? Math.min(0.15 + (stg - 4) * 0.04, 0.40) : Math.min(0.08 + stg * 0.03, 0.25);
    const fastChance = Math.min(0.15 + stg * 0.03, 0.40);

    if (rand < tankChance) {
      type = EnemyType.Tank;
    } else if (rand < tankChance + fastChance) {
      type = EnemyType.Fast;
    } else {
      type = EnemyType.Normal;
    }

    const cfg = ENEMY_CONFIG[type];
    const speedMul = 1 + (stg - 1) * 0.1;
    const x = Math.random() * (LOGIC_W - cfg.w - 20) + cfg.w / 2 + 10;

    enemiesRef.current.push({
      x, y: -cfg.h,
      type,
      hp: cfg.hp,
      maxHp: cfg.hp,
      speed: cfg.speed * speedMul,
      baseSpeed: cfg.speed * speedMul,
      w: cfg.w,
      h: cfg.h,
      score: cfg.score,
      coins: cfg.coins,
      shootTimer: 0,
      slowTimer: 0,
    });
  }, []);

  // Spawn boss
  const spawnBoss = useCallback(() => {
    const stg = stageRef.current;
    const bossType = getBossTypeForStage(stg);
    const emoji = BOSS_EMOJIS[bossType];

    let hp: number;
    let bossScore: number;
    let moveSpeed: number;
    let shootInterval: number;
    let shieldHp = 0;
    let shieldMaxHp = 0;

    switch (bossType) {
      case 1:
        hp = 30 + stg * 10; bossScore = 200 + stg * 50; moveSpeed = 1.5; shootInterval = BOSS_SHOOT_INTERVAL; break;
      case 2:
        hp = 50 + stg * 15; bossScore = 350 + stg * 60; moveSpeed = 2.5; shootInterval = 50; break;
      case 3:
        hp = 60 + stg * 15; bossScore = 400 + stg * 70; moveSpeed = 1.2; shootInterval = 70;
        shieldMaxHp = 20 + stg * 5; shieldHp = shieldMaxHp; break;
      case 4:
        hp = 80 + stg * 20; bossScore = 500 + stg * 80; moveSpeed = 0.8; shootInterval = 60; break;
      case 5:
      default:
        hp = 100 + stg * 25; bossScore = 700 + stg * 100; moveSpeed = 3.0; shootInterval = 60; break;
    }

    bossRef.current = {
      x: LOGIC_W / 2, y: -BOSS_H, hp, maxHp: hp, bossType, emoji,
      flashTimer: 0, shootTimer: 0, dirX: moveSpeed, score: bossScore,
      entered: false, shieldHp, shieldMaxHp, shieldRegenTimer: 0,
      summonTimer: 0, specialTimer: 0, spiralAngle: 0,
      enraged: false, aimedShotTimer: 0, shotCount: 0,
    };
  }, []);

  // Fire player bullets based on weapon level and skin
  const shoot = useCallback(() => {
    const p = playerRef.current;
    const speed = 8;
    const bx = p.x;
    const by = p.y - PLAYER_H / 2;
    const bullets = bulletsRef.current;
    const skin = getSkinDef(skinIdRef.current);

    const basePierce = skin.attackType === 'Fire' ? 1 : 0;
    const baseSlow = skin.attackType === 'Ice' ? 60 : 0;
    const baseDmgMul = skin.attackType === 'Star' ? 2 : 1;

    const makeBullet = (x: number, y: number, vx: number, vy: number): Bullet => ({
      x, y, vx, vy, pierce: basePierce, slowFrames: baseSlow, dmgMul: baseDmgMul,
    });

    // Shadow skin: fan pattern at weapon level 1
    if (skin.attackType === 'Shadow' && p.weaponLevel === 1) {
      const fanAngle = 15 * Math.PI / 180;
      bullets.push(
        makeBullet(bx, by, Math.sin(-fanAngle) * speed, -Math.cos(fanAngle) * speed),
        makeBullet(bx, by, 0, -speed),
        makeBullet(bx, by, Math.sin(fanAngle) * speed, -Math.cos(fanAngle) * speed),
      );
      return;
    }

    switch (p.weaponLevel) {
      case 1:
        bullets.push(makeBullet(bx, by, 0, -speed));
        break;
      case 2:
        bullets.push(
          makeBullet(bx - 8, by, 0, -speed),
          makeBullet(bx + 8, by, 0, -speed),
        );
        break;
      case 3: {
        const a = Math.PI / 12;
        const svx = Math.sin(a) * speed;
        const svy = -Math.cos(a) * speed;
        bullets.push(
          makeBullet(bx, by, 0, -speed),
          makeBullet(bx, by, svx, svy),
          makeBullet(bx, by, -svx, svy),
        );
        break;
      }
      case 4: {
        const a1 = Math.PI / 18;
        const a2 = Math.PI / 9;
        bullets.push(
          makeBullet(bx, by, 0, -speed),
          makeBullet(bx, by, Math.sin(a1) * speed, -Math.cos(a1) * speed),
          makeBullet(bx, by, -Math.sin(a1) * speed, -Math.cos(a1) * speed),
          makeBullet(bx, by, Math.sin(a2) * speed, -Math.cos(a2) * speed),
          makeBullet(bx, by, -Math.sin(a2) * speed, -Math.cos(a2) * speed),
        );
        break;
      }
      default:
        break;
    }
  }, []);

  const getShootInterval = useCallback(() => {
    const base = Math.max(BASE_SHOOT_INTERVAL - playerRef.current.weaponLevel + 1, 6);
    return Math.max(Math.floor(base / shootIntervalMulRef.current), 4);
  }, []);

  const getSpawnInterval = useCallback(() => {
    const stg = stageRef.current;
    return Math.max(40 - (stg - 1) * 3, 18);
  }, []);

  // Activate bomb
  const activateBomb = useCallback(() => {
    screenFlashRef.current = SCREEN_FLASH_FRAMES;

    for (const e of enemiesRef.current) {
      scoreRef.current += e.score;
      coinsRef.current += e.coins;
      const expColor = e.type === EnemyType.Fast ? '#f59e0b'
        : e.type === EnemyType.Tank ? '#a855f7' : '#ef4444';
      particlesRef.current.push(...createExplosion(e.x, e.y, expColor, 10));
    }
    setScore(scoreRef.current);
    setSessionCoins(coinsRef.current);
    enemiesRef.current = [];
    enemyBulletsRef.current = [];

    const boss = bossRef.current;
    if (boss) {
      const dmg = Math.ceil(boss.maxHp * 0.3);
      boss.hp = Math.max(1, boss.hp - dmg);
      boss.flashTimer = 10;
      particlesRef.current.push(...createExplosion(boss.x, boss.y, '#fbbf24', 20));

      if (boss.hp <= 1) {
        scoreRef.current += boss.score;
        coinsRef.current += stageRef.current * 10;
        setScore(scoreRef.current);
        setSessionCoins(coinsRef.current);
        particlesRef.current.push(...createExplosion(boss.x, boss.y, '#f97316', 30));
        const dropTypes = [PowerUpType.Weapon, PowerUpType.Heal, PowerUpType.Shield];
        for (const dt of dropTypes) {
          powerupsRef.current.push({
            x: boss.x + (Math.random() - 0.5) * 60,
            y: boss.y + (Math.random() - 0.5) * 30,
            type: dt,
            phase: Math.random() * Math.PI * 2,
          });
        }
        stageTransitionRef.current = STAGE_TRANSITION_DURATION;
        scoreRef.current += stageRef.current * 100;
        coinsRef.current += stageRef.current * 5;
        setScore(scoreRef.current);
        setSessionCoins(coinsRef.current);
        bossRef.current = null;
      }
    }
  }, []);

  // Submit score and coins on game over
  const submitOnGameOver = useCallback(() => {
    const totalCoins = coinsRef.current;

    // Save coins to wallet
    const currentWallet = loadWallet();
    const newWallet = currentWallet + totalCoins;
    saveWallet(newWallet);
    setWalletCoins(newWallet);

    // Submit score
    if (scoreRef.current > highScoreRef.current) {
      setIsNewRecord(true);
      fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_NAME, score: scoreRef.current }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.data?.score !== undefined) {
            setHighScore(data.data.score);
            highScoreRef.current = data.data.score;
          }
        })
        .catch(() => {});
    }

    // Submit coins to server if logged in
    const token = localStorage.getItem('user-token');
    if (token && totalCoins > 0) {
      fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'aircraft-coins', score: newWallet }),
      }).catch(() => {});
    }
  }, []);

  // Main game loop (fixed-timestep 60fps for cross-device consistency)
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dprRef.current * scaleRef.current, 0, 0, dprRef.current * scaleRef.current, 0, 0);

    if (lastTsRef.current === 0) lastTsRef.current = timestamp;
    let dt = timestamp - lastTsRef.current;
    lastTsRef.current = timestamp;
    if (dt > 200) dt = 200;
    accumRef.current += dt;

    starsRef.current.forEach((s) => { s.phase += s.twinkleSpeed; });

    while (accumRef.current >= TICK_MS) {
      accumRef.current -= TICK_MS;

      const frame = frameRef.current;
      frameRef.current++;
      const p = playerRef.current;
      const boss = bossRef.current;
      const stg = stageRef.current;
      const skin = getSkinDef(skinIdRef.current);

      if (statusRef.current === 'playing' && !pausedRef.current) {
      // Keyboard movement
      const keys = keysDownRef.current;
      const spd = playerSpeedRef.current;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) p.x -= spd;
      if (keys.has('ArrowRight') || keys.has('KeyD')) p.x += spd;
      if (keys.has('ArrowUp') || keys.has('KeyW')) p.y -= spd;
      if (keys.has('ArrowDown') || keys.has('KeyS')) p.y += spd;

      // Mouse/touch movement (smooth follow)
      if (inputXRef.current !== null) {
        const targetX = inputXRef.current;
        const diffX = targetX - p.x;
        if (Math.abs(diffX) > 2) {
          p.x += diffX * 0.15;
        } else {
          p.x = targetX;
        }
      }
      if (inputYRef.current !== null) {
        const targetY = inputYRef.current;
        const diffY = targetY - p.y;
        if (Math.abs(diffY) > 2) {
          p.y += diffY * 0.15;
        } else {
          p.y = targetY;
        }
      }

      // Clamp position
      p.x = Math.max(PLAYER_W / 2, Math.min(LOGIC_W - PLAYER_W / 2, p.x));
      p.y = Math.max(PLAYER_H / 2, Math.min(LOGIC_H - PLAYER_H / 2, p.y));

      // Update timers
      if (p.shieldTimer > 0) p.shieldTimer--;
      if (p.invincibleTimer > 0) p.invincibleTimer--;
      if (screenFlashRef.current > 0) screenFlashRef.current--;

      // === STAGE TRANSITION ===
      if (stageTransitionRef.current > 0) {
        stageTransitionRef.current--;
        if (stageTransitionRef.current <= 0) {
          if (stg >= TOTAL_STAGES) {
            victoryRef.current = true;
            statusRef.current = 'over';
            setGameStatus('over');
            setVictory(true);
          } else {
            stageRef.current = stg + 1;
            stageKillsRef.current = 0;
            setStage(stageRef.current);
            p.invincibleTimer = STAGE_INVINCIBLE_DURATION;
          }
        }
      }
      else if (warningRef.current > 0) {
        warningRef.current--;
        if (warningRef.current <= 0) {
          spawnBoss();
        }
      }
      else if (!boss) {
        const isMobile = isMobileRef.current;
        const interval = getShootInterval();
        if (isMobile) {
          if (frame - lastShootRef.current >= interval) {
            shoot();
            lastShootRef.current = frame;
          }
        } else {
          if (shootRequestRef.current) {
            if (frame - lastShootRef.current >= interval) {
              shoot();
              lastShootRef.current = frame;
            }
          }
        }
        shootRequestRef.current = false;

        const spawnInterval = getSpawnInterval();
        if (frame % Math.round(spawnInterval) === 0) {
          spawnEnemy();
        }

        if (stageKillsRef.current >= WARNING_THRESHOLD && warningRef.current <= 0) {
          warningRef.current = WARNING_DURATION;
        }
      }
      else {
        const isMobile = isMobileRef.current;
        const interval = getShootInterval();
        if (isMobile) {
          if (frame - lastShootRef.current >= interval) {
            shoot();
            lastShootRef.current = frame;
          }
        } else {
          if (shootRequestRef.current) {
            if (frame - lastShootRef.current >= interval) {
              shoot();
              lastShootRef.current = frame;
            }
          }
        }
        shootRequestRef.current = false;
      }

      // Update player bullets
      bulletsRef.current = bulletsRef.current.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;
        return b.y > -BULLET_H && b.x > -BULLET_W && b.x < LOGIC_W + BULLET_W;
      });

      // Update enemy bullets
      enemyBulletsRef.current = enemyBulletsRef.current.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;
        return b.y < LOGIC_H + 10 && b.x > -10 && b.x < LOGIC_W + 10;
      });

      // Update regular enemies
      enemiesRef.current = enemiesRef.current.filter((e) => {
        // Slow effect
        if (e.slowTimer > 0) {
          e.slowTimer--;
          e.speed = e.baseSpeed * 0.5;
        } else {
          e.speed = e.baseSpeed;
        }
        e.y += e.speed;

        if (stageRef.current >= ENEMY_SHOOT_STAGE && statusRef.current === 'playing') {
          e.shootTimer++;
          if (e.shootTimer >= ENEMY_SHOOT_INTERVAL) {
            e.shootTimer = 0;
            if (Math.random() < ENEMY_SHOOT_CHANCE) {
              const dx = p.x - e.x;
              const dy = p.y - e.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                enemyBulletsRef.current.push({
                  x: e.x, y: e.y + e.h / 2,
                  vx: (dx / dist) * 2.5, vy: (dy / dist) * 2.5,
                });
              }
            }
          }
        }

        return e.y < LOGIC_H + e.h;
      });

      // Update boss
      if (boss) {
        if (!boss.entered) {
          boss.y += 1.5;
          if (boss.y >= 80) { boss.y = 80; boss.entered = true; }
        } else {
          boss.x += boss.dirX;
          if (boss.x > LOGIC_W - BOSS_W / 2 - 10) boss.dirX = -Math.abs(boss.dirX);
          if (boss.x < BOSS_W / 2 + 10) boss.dirX = Math.abs(boss.dirX);

          boss.shootTimer++;
          boss.shotCount++;

          switch (boss.bossType) {
            case 1: {
              if (boss.shootTimer >= BOSS_SHOOT_INTERVAL) {
                boss.shootTimer = 0;
                for (let i = -1; i <= 1; i++) {
                  const angle = Math.PI / 2 + i * BOSS_SPREAD_ANGLE;
                  enemyBulletsRef.current.push({
                    x: boss.x, y: boss.y + BOSS_H / 2,
                    vx: Math.cos(angle) * BOSS_BULLET_SPEED, vy: Math.sin(angle) * BOSS_BULLET_SPEED,
                  });
                }
              }
              break;
            }
            case 2: {
              const interval2 = boss.enraged ? 35 : 50;
              if (boss.shootTimer >= interval2) {
                boss.shootTimer = 0;
                boss.specialTimer++;
                if (boss.specialTimer % 3 === 0) {
                  const dx = p.x - boss.x;
                  const dy = p.y - boss.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > 0) {
                    enemyBulletsRef.current.push({
                      x: boss.x, y: boss.y + BOSS_H / 2,
                      vx: (dx / dist) * (BOSS_BULLET_SPEED * 1.3), vy: (dy / dist) * (BOSS_BULLET_SPEED * 1.3),
                    });
                  }
                } else {
                  const narrowAngle = Math.PI / 12;
                  for (let i = -2; i <= 2; i++) {
                    const angle = Math.PI / 2 + i * narrowAngle;
                    enemyBulletsRef.current.push({
                      x: boss.x, y: boss.y + BOSS_H / 2,
                      vx: Math.cos(angle) * BOSS_BULLET_SPEED, vy: Math.sin(angle) * BOSS_BULLET_SPEED,
                    });
                  }
                }
              }
              break;
            }
            case 3: {
              if (boss.shotCount % 30 === 0) {
                const numBullets = 8;
                for (let i = 0; i < numBullets; i++) {
                  const angle = boss.spiralAngle + (Math.PI * 2 / numBullets) * i;
                  enemyBulletsRef.current.push({
                    x: boss.x, y: boss.y + BOSS_H / 2,
                    vx: Math.cos(angle) * (BOSS_BULLET_SPEED * 0.9), vy: Math.sin(angle) * (BOSS_BULLET_SPEED * 0.9),
                  });
                }
                boss.spiralAngle += Math.PI / 8;
              }
              if (boss.shotCount % 90 === 0) {
                const dx = p.x - boss.x;
                const dy = p.y - boss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                  enemyBulletsRef.current.push({
                    x: boss.x, y: boss.y + BOSS_H / 2,
                    vx: (dx / dist) * BOSS_BULLET_SPEED, vy: (dy / dist) * BOSS_BULLET_SPEED,
                  });
                }
              }
              if (boss.shieldHp < boss.shieldMaxHp) {
                boss.shieldRegenTimer++;
                if (boss.shieldRegenTimer >= 300) {
                  boss.shieldHp = Math.min(boss.shieldMaxHp, boss.shieldHp + Math.ceil(boss.shieldMaxHp * 0.3));
                  boss.shieldRegenTimer = 0;
                }
              } else {
                boss.shieldRegenTimer = 0;
              }
              break;
            }
            case 4: {
              const summonInterval = boss.enraged ? 120 : 180;
              if (boss.shootTimer >= 60) {
                boss.shootTimer = 0;
                const dx = p.x - boss.x;
                const dy = p.y - boss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                  enemyBulletsRef.current.push({
                    x: boss.x, y: boss.y + BOSS_H / 2,
                    vx: (dx / dist) * (BOSS_BULLET_SPEED * 1.1), vy: (dy / dist) * (BOSS_BULLET_SPEED * 1.1),
                  });
                }
              }
              boss.summonTimer++;
              if (boss.summonTimer >= summonInterval) {
                boss.summonTimer = 0;
                const minionCount = boss.enraged ? 3 : 2;
                for (let i = 0; i < minionCount; i++) {
                  enemiesRef.current.push({
                    x: boss.x + (Math.random() - 0.5) * 60, y: boss.y + BOSS_H / 2,
                    type: EnemyType.Normal, hp: 1, maxHp: 1,
                    speed: 2.0 + Math.random() * 0.5, baseSpeed: 2.0 + Math.random() * 0.5,
                    w: 20, h: 20, score: 5, coins: 1, shootTimer: 0, slowTimer: 0,
                  });
                }
              }
              break;
            }
            case 5: {
              if (!boss.enraged && boss.hp <= boss.maxHp * 0.5) {
                boss.enraged = true;
                boss.dirX = boss.dirX > 0 ? 3.5 : -3.5;
                boss.flashTimer = 20;
                particlesRef.current.push(...createExplosion(boss.x, boss.y, '#ff0000', 25));
              }
              const spreadInt = boss.enraged ? 35 : 60;
              const aimedInt = boss.enraged ? 50 : 90;
              const summonInt = boss.enraged ? 120 : 180;

              if (boss.shotCount % spreadInt === 0) {
                for (let i = -1; i <= 1; i++) {
                  const angle = Math.PI / 2 + i * BOSS_SPREAD_ANGLE;
                  enemyBulletsRef.current.push({
                    x: boss.x, y: boss.y + BOSS_H / 2,
                    vx: Math.cos(angle) * BOSS_BULLET_SPEED, vy: Math.sin(angle) * BOSS_BULLET_SPEED,
                  });
                }
              }

              boss.aimedShotTimer++;
              if (boss.aimedShotTimer >= aimedInt) {
                boss.aimedShotTimer = 0;
                const dx = p.x - boss.x;
                const dy = p.y - boss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                  enemyBulletsRef.current.push({
                    x: boss.x, y: boss.y + BOSS_H / 2,
                    vx: (dx / dist) * (BOSS_BULLET_SPEED * 1.2), vy: (dy / dist) * (BOSS_BULLET_SPEED * 1.2),
                  });
                }
              }

              boss.summonTimer++;
              if (boss.summonTimer >= summonInt) {
                boss.summonTimer = 0;
                const minionCount = boss.enraged ? 3 : 1;
                for (let i = 0; i < minionCount; i++) {
                  enemiesRef.current.push({
                    x: boss.x + (Math.random() - 0.5) * 60, y: boss.y + BOSS_H / 2,
                    type: EnemyType.Normal, hp: 1, maxHp: 1,
                    speed: 2.5 + Math.random() * 0.5, baseSpeed: 2.5 + Math.random() * 0.5,
                    w: 20, h: 20, score: 5, coins: 1, shootTimer: 0, slowTimer: 0,
                  });
                }
              }
              break;
            }
            default:
              break;
          }
        }
        if (boss.flashTimer > 0) boss.flashTimer--;
      }

      // Update powerups
      powerupsRef.current = powerupsRef.current.filter((pw) => {
        pw.y += 2;
        pw.phase += 0.1;
        return pw.y < LOGIC_H + 20;
      });

      // === COLLISION: player bullets vs enemies ===
      const bullets = bulletsRef.current;
      const enemies = enemiesRef.current;
      const hitBullets = new Set<number>();

      for (let bi = 0; bi < bullets.length; bi++) {
        const b = bullets[bi];
        for (let ei = 0; ei < enemies.length; ei++) {
          const e = enemies[ei];
          if (e.hp <= 0) continue;
          if (rectCollide(b.x, b.y, BULLET_W, BULLET_H, e.x, e.y, e.w, e.h)) {
            // Apply damage
            const dmg = b.dmgMul >= 2 ? 2 : 1;
            e.hp -= dmg;

            // Apply slow
            if (b.slowFrames > 0) {
              e.slowTimer = b.slowFrames;
            }

            // Handle pierce
            if (b.pierce > 0) {
              b.pierce--;
              if (b.pierce <= 0) hitBullets.add(bi);
            } else {
              hitBullets.add(bi);
            }

            if (e.hp <= 0) {
              scoreRef.current += e.score;
              coinsRef.current += e.coins;
              killCountRef.current++;
              stageKillsRef.current++;
              setScore(scoreRef.current);
              setSessionCoins(coinsRef.current);

              const expColor = e.type === EnemyType.Fast ? '#f59e0b'
                : e.type === EnemyType.Tank ? '#a855f7' : '#ef4444';
              const expCount = e.type === EnemyType.Tank ? 18 : e.type === EnemyType.Normal ? 8 : 6;
              particlesRef.current.push(...createExplosion(e.x, e.y, expColor, expCount));

              if (Math.random() < POWERUP_CHANCE) {
                const types = [PowerUpType.Weapon, PowerUpType.Heal, PowerUpType.Bomb, PowerUpType.Shield];
                const weights = [0.35, 0.25, 0.15, 0.25];
                let r = Math.random();
                let chosen = PowerUpType.Shield;
                for (let ti = 0; ti < types.length; ti++) {
                  r -= weights[ti];
                  if (r <= 0) { chosen = types[ti]; break; }
                }
                powerupsRef.current.push({ x: e.x, y: e.y, type: chosen, phase: 0 });
              }
            } else {
              particlesRef.current.push(...createExplosion(b.x, b.y, '#fbbf24', 3));
            }
            if (!hitBullets.has(bi) || b.pierce <= 0) break;
          }
        }
      }

      bulletsRef.current = bullets.filter((_, i) => !hitBullets.has(i));
      enemiesRef.current = enemies.filter((e) => e.hp > 0);

      // === COLLISION: player bullets vs boss ===
      const currentBoss = bossRef.current;
      if (currentBoss && statusRef.current === 'playing') {
        const bossBullets = bulletsRef.current;
        const bossHitBullets = new Set<number>();
        for (let bi = 0; bi < bossBullets.length; bi++) {
          const b = bossBullets[bi];
          if (rectCollide(b.x, b.y, BULLET_W, BULLET_H, currentBoss.x, currentBoss.y, BOSS_W, BOSS_H)) {
            bossHitBullets.add(bi);

            if (currentBoss.bossType === 3 && currentBoss.shieldHp > 0) {
              currentBoss.shieldHp--;
              currentBoss.shieldRegenTimer = 0;
              particlesRef.current.push(...createExplosion(b.x, b.y, '#3b82f6', 2));
            } else {
              const dmg = b.dmgMul >= 2 ? 2 : 1;
              currentBoss.hp -= dmg;
              currentBoss.flashTimer = 4;
              particlesRef.current.push(...createExplosion(b.x, b.y, '#fbbf24', 2));
            }

            if (currentBoss.hp <= 0) {
              scoreRef.current += currentBoss.score;
              coinsRef.current += stageRef.current * 10;
              setScore(scoreRef.current);
              setSessionCoins(coinsRef.current);
              particlesRef.current.push(...createExplosion(currentBoss.x, currentBoss.y, '#f97316', 35));

              const dropTypes = [PowerUpType.Weapon, PowerUpType.Heal, PowerUpType.Shield];
              for (const dt of dropTypes) {
                powerupsRef.current.push({
                  x: currentBoss.x + (Math.random() - 0.5) * 80,
                  y: currentBoss.y + (Math.random() - 0.5) * 30,
                  type: dt, phase: Math.random() * Math.PI * 2,
                });
              }

              const clearBonus = stageRef.current * 100;
              const coinBonus = stageRef.current * 5;
              scoreRef.current += clearBonus;
              coinsRef.current += coinBonus;
              setScore(scoreRef.current);
              setSessionCoins(coinsRef.current);
              stageTransitionRef.current = STAGE_TRANSITION_DURATION;
              stageKillsRef.current = 0;
              bossRef.current = null;
              break;
            }
          }
        }
        bulletsRef.current = bossBullets.filter((_, i) => !bossHitBullets.has(i));
      }

      // === COLLISION: enemy bullets vs player ===
      if (statusRef.current === 'playing') {
        for (const eb of enemyBulletsRef.current) {
          if (rectCollide(p.x, p.y, PLAYER_W * 0.5, PLAYER_H * 0.5, eb.x, eb.y, 8, 8)) {
            damagePlayer();
            break;
          }
        }
      }

      // === COLLISION: enemies vs player ===
      if (statusRef.current === 'playing') {
        for (const e of enemiesRef.current) {
          if (rectCollide(p.x, p.y, PLAYER_W * 0.6, PLAYER_H * 0.6, e.x, e.y, e.w, e.h)) {
            damagePlayer();
            e.hp = 0;
            break;
          }
        }
        enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
      }

      // === COLLISION: boss vs player ===
      if (bossRef.current && statusRef.current === 'playing') {
        if (rectCollide(p.x, p.y, PLAYER_W * 0.6, PLAYER_H * 0.6, bossRef.current.x, bossRef.current.y, BOSS_W, BOSS_H)) {
          damagePlayer();
        }
      }

      // === COLLISION: powerups vs player ===
      if (statusRef.current === 'playing') {
        powerupsRef.current = powerupsRef.current.filter((pw) => {
          if (rectCollide(p.x, p.y, PLAYER_W, PLAYER_H, pw.x, pw.y, 24, 24)) {
            switch (pw.type) {
              case PowerUpType.Weapon:
                if (p.weaponLevel < MAX_WEAPON_LEVEL) {
                  p.weaponLevel++;
                  setWeaponLevel(p.weaponLevel);
                }
                break;
              case PowerUpType.Heal:
                if (p.lives < p.maxLives) {
                  p.lives++;
                  setLives(p.lives);
                }
                break;
              case PowerUpType.Bomb:
                activateBomb();
                break;
              case PowerUpType.Shield:
                p.shieldTimer = SHIELD_DURATION;
                break;
            }
            const pColor = POWERUP_COLORS[pw.type];
            particlesRef.current.push(...createExplosion(pw.x, pw.y, pColor, 10));
            return false;
          }
          return true;
        });
      }
    }
    } // end while (fixed-timestep)

    // Submit on game over
    if (statusRef.current === 'over' && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      submitOnGameOver();
    }

    // Update particles
    particlesRef.current = particlesRef.current.filter((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      pt.vx *= 0.97;
      pt.vy *= 0.97;
      return pt.life > 0;
    });

    // ==== DRAW LOGIC ====
    const frame = frameRef.current;
    const p = playerRef.current;
    const skin = getSkinDef(skinIdRef.current);

    const stgBg = stageRef.current % 10 || 10;
    const BG_THEMES = [
      ['#0a0e27', '#0f1638'],
      ['#1a0a0a', '#2d1010'],
      ['#0a1a0a', '#102d10'],
      ['#1a1a0a', '#2d2d10'],
      ['#0a0a1a', '#10102d'],
      ['#1a0a1a', '#2d102d'],
      ['#0a1a1a', '#102d2d'],
      ['#1a100a', '#2d1a10'],
      ['#100a1a', '#1a102d'],
      ['#0a1a10', '#102d1a'],
    ];
    const [c1, c2] = BG_THEMES[(stgBg - 1) % BG_THEMES.length];
    const bgGrad = ctx.createLinearGradient(0, 0, 0, LOGIC_H);
    bgGrad.addColorStop(0, c1);
    bgGrad.addColorStop(0.5, c2);
    bgGrad.addColorStop(1, c1);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

    starsRef.current.forEach((s) => {
      const alpha = s.alpha * (0.5 + Math.sin(s.phase) * 0.5);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    powerupsRef.current.forEach((pw) => drawPowerUp(ctx, pw));

    // Draw player bullets based on skin
    const at = skin.attackType;
    if (at === 'Lightning') {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#fde047';
      bulletsRef.current.forEach((b) => {
        ctx.fillRect(b.x - 3, b.y - BULLET_H / 2, 6, BULLET_H);
      });
      ctx.shadowBlur = 0;
    } else if (at === 'Fire') {
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#fb923c';
      bulletsRef.current.forEach((b) => {
        ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
      });
      ctx.shadowBlur = 0;
    } else if (at === 'Ice') {
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#67e8f9';
      bulletsRef.current.forEach((b) => {
        ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
      });
      ctx.shadowBlur = 0;
    } else if (at === 'Star') {
      ctx.shadowBlur = 6;
      const hue = (frame * 4) % 360;
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
      bulletsRef.current.forEach((b) => {
        ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
      });
      ctx.shadowBlur = 0;
    } else if (at === 'Shadow') {
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#a78bfa';
      bulletsRef.current.forEach((b) => {
        ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
      });
      ctx.shadowBlur = 0;
    } else {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#7dd3fc';
      bulletsRef.current.forEach((b) => {
        ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
      });
      ctx.shadowBlur = 0;
    }

    enemyBulletsRef.current.forEach((b) => drawEnemyBullet(ctx, b));
    enemiesRef.current.forEach((e) => drawEnemy(ctx, e));

    if (bossRef.current) {
      drawBoss(ctx, bossRef.current, frame);
    }

    particlesRef.current.forEach((pt) => {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (statusRef.current !== 'over') {
      drawPlayer(ctx, p, frame, skin.emoji, skin.attackType);
    }

    if (statusRef.current === 'playing' || statusRef.current === 'over') {
      drawCanvasHUD(ctx, p, !!bossRef.current, stageRef.current, stageKillsRef.current, coinsRef.current);
    }

    // Warning effect
    if (warningRef.current > 0) {
      const flash = Math.floor(frame / 6) % 2 === 0;
      if (flash) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.12)';
        ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
      }
      ctx.strokeStyle = flash ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 100, 100, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, LOGIC_W - 4, LOGIC_H - 4);

      ctx.fillStyle = flash ? '#ff0000' : '#ff6666';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u8b66\u544a', LOGIC_W / 2, LOGIC_H / 2 - 50);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`\u7b2c${stageRef.current}\u5173 \u9996\u9886 \u5373\u5c06\u767b\u573a`, LOGIC_W / 2, LOGIC_H / 2 - 10);
    }

    // Stage transition
    if (stageTransitionRef.current > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

      const pulse = 0.8 + Math.sin(frame * 0.1) * 0.2;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`\u7b2c${stageRef.current}\u5173 \u901a\u8fc7\uff01`, LOGIC_W / 2, LOGIC_H / 2 - 25);

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      ctx.fillText(`+${stageRef.current * 100}`, LOGIC_W / 2, LOGIC_H / 2 + 20);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '14px sans-serif';
      ctx.fillText(`\ud83e\ude99 +${stageRef.current * 5}`, LOGIC_W / 2, LOGIC_H / 2 + 48);

      if (stageRef.current < TOTAL_STAGES) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(`\u4e0b\u4e00\u5173: \u7b2c${stageRef.current + 1}\u5173`, LOGIC_W / 2, LOGIC_H / 2 + 75);
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '16px sans-serif';
        ctx.fillText('\u6240\u6709\u5173\u5361\u901a\u5173\uff01', LOGIC_W / 2, LOGIC_H / 2 + 75);
      }
    }

    // Screen flash
    if (screenFlashRef.current > 0) {
      const flashAlpha = (screenFlashRef.current / SCREEN_FLASH_FRAMES) * 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
    }

    // Overlay: idle screen
    if (statusRef.current === 'idle') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${skin.emoji} \u98de\u673a\u5927\u6218`, LOGIC_W / 2, LOGIC_H / 2 - 90);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`\u5171${TOTAL_STAGES}\u4e2a\u5173\u5361\uff0c\u6bcf\u5173\u51fb\u843d${STAGE_KILLS_NEEDED}\u4e2a\u654c\u4eba\u540e\u6311\u6218Boss`, LOGIC_W / 2, LOGIC_H / 2 - 50);
      ctx.fillText('\u6bcf\u4e2aBoss\u90fd\u6709\u72ec\u7279\u7684\u653b\u51fb\u6a21\u5f0f', LOGIC_W / 2, LOGIC_H / 2 - 28);
      ctx.fillText('\u6536\u96c6\u9053\u5177\u5347\u7ea7\u6b66\u5668\u548c\u56de\u8840\uff0c\u51fb\u6740\u654c\u4eba\u83b7\u5f97\u91d1\u5e01', LOGIC_W / 2, LOGIC_H / 2 - 6);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '13px sans-serif';
      ctx.fillText(`\ud83e\ude99 \u94b1\u5305: ${walletCoins}`, LOGIC_W / 2, LOGIC_H / 2 + 22);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u5f00\u59cb', LOGIC_W / 2, LOGIC_H / 2 + 55);
    }

    // Overlay: paused
    if (pausedRef.current && statusRef.current === 'playing') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u5df2\u6682\u505c', LOGIC_W / 2, LOGIC_H / 2 - 10);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('\u6309 Esc \u7ee7\u7eed', LOGIC_W / 2, LOGIC_H / 2 + 25);
    }

    // Overlay: game over
    if (statusRef.current === 'over') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

      if (victoryRef.current) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u5168\u90e8\u901a\u5173\uff01', LOGIC_W / 2, LOGIC_H / 2 - 65);

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`\u6700\u7ec8\u5f97\u5206: ${scoreRef.current}`, LOGIC_W / 2, LOGIC_H / 2 - 25);

        ctx.fillStyle = '#fbbf24';
        ctx.font = '16px sans-serif';
        ctx.fillText(`\ud83e\ude99 +${coinsRef.current}`, LOGIC_W / 2, LOGIC_H / 2 + 5);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('\u70b9\u51fb\u91cd\u65b0\u5f00\u59cb', LOGIC_W / 2, LOGIC_H / 2 + 40);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u6e38\u620f\u7ed3\u675f', LOGIC_W / 2, LOGIC_H / 2 - 65);

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`\u5f97\u5206: ${scoreRef.current}`, LOGIC_W / 2, LOGIC_H / 2 - 28);

        ctx.fillStyle = '#fbbf24';
        ctx.font = '16px sans-serif';
        ctx.fillText(`\ud83e\ude99 +${coinsRef.current}`, LOGIC_W / 2, LOGIC_H / 2 + 0);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`\u5230\u8fbe\u5173\u5361: ${stageRef.current}/${TOTAL_STAGES}`, LOGIC_W / 2, LOGIC_H / 2 + 30);
        ctx.fillText('\u70b9\u51fb\u91cd\u65b0\u5f00\u59cb', LOGIC_W / 2, LOGIC_H / 2 + 55);
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [shoot, spawnEnemy, spawnBoss, getShootInterval, getSpawnInterval, damagePlayer, activateBomb, submitOnGameOver, walletCoins]);

  // Start / restart game
  const startGame = useCallback(() => {
    const skin = getSkinDef(equippedSkin);
    const effectiveMaxLives = Math.min(BASE_MAX_LIVES + skin.lifeBonus, 7);
    const effectiveInitialLives = Math.min(BASE_INITIAL_LIVES + skin.lifeBonus, effectiveMaxLives);
    const effectiveSpeed = BASE_PLAYER_SPEED * (1 + skin.speedBonus);
    const effectiveFireRate = 1 + skin.fireRateBonus;

    skinIdRef.current = equippedSkin;
    playerSpeedRef.current = effectiveSpeed;
    maxLivesRef.current = effectiveMaxLives;
    initialLivesRef.current = effectiveInitialLives;
    shootIntervalMulRef.current = effectiveFireRate;

    playerRef.current = {
      x: LOGIC_W / 2, y: LOGIC_H - 60,
      shieldTimer: 0, weaponLevel: 1,
      lives: effectiveInitialLives, maxLives: effectiveMaxLives, invincibleTimer: 0,
    };
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    enemiesRef.current = [];
    bossRef.current = null;
    particlesRef.current = [];
    powerupsRef.current = [];
    scoreRef.current = 0;
    coinsRef.current = 0;
    killCountRef.current = 0;
    stageRef.current = 1;
    stageKillsRef.current = 0;
    warningRef.current = 0;
    stageTransitionRef.current = 0;
    victoryRef.current = false;
    frameRef.current = 0;
    lastTsRef.current = 0;
    accumRef.current = 0;
    lastShootRef.current = 0;
    inputXRef.current = null;
    inputYRef.current = null;
    shootRequestRef.current = false;
    screenFlashRef.current = 0;
    scoreSubmittedRef.current = false;
    keysDownRef.current = new Set();

    setScore(0);
    setSessionCoins(0);
    setStage(1);
    setLives(effectiveInitialLives);
    setWeaponLevel(1);
    setIsNewRecord(false);
    setVictory(false);
    pausedRef.current = false;
    setPaused(false);
    statusRef.current = 'playing';
    setGameStatus('playing');
  }, [equippedSkin]);

  const handleCanvasClick = useCallback(() => {
    if (statusRef.current === 'over') {
      startGame();
    }
  }, [startGame]);

  // Skin shop actions
  const buySkin = useCallback((skinId: string) => {
    const skin = getSkinDef(skinId);
    const current = loadSkins();
    const currentWallet = loadWallet();

    if (current.owned.includes(skinId)) {
      // Equip
      const updated = { ...current, equipped: skinId };
      saveSkins(updated);
      setSkinStorage(updated);
      return;
    }

    if (currentWallet < skin.cost) return;

    const newWallet = currentWallet - skin.cost;
    saveWallet(newWallet);
    setWalletCoins(newWallet);

    const updated = { ...current, owned: [...current.owned, skinId], equipped: skinId };
    saveSkins(updated);
    setSkinStorage(updated);
  }, []);

  const openShop = useCallback(() => {
    statusRef.current = 'shop';
    setGameStatus('shop');
  }, []);

  const closeShop = useCallback(() => {
    statusRef.current = 'idle';
    setGameStatus('idle');
  }, []);

  // Detect touch device
  useEffect(() => {
    isMobileRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Mouse / keyboard events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (statusRef.current !== 'playing' || pausedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = LOGIC_W / rect.width;
      const scaleY = LOGIC_H / rect.height;
      inputXRef.current = (e.clientX - rect.left) * scaleX;
      inputYRef.current = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseLeave = () => {
      inputXRef.current = null;
      inputYRef.current = null;
    };

    const handleMouseDown = () => {
      if (statusRef.current === 'playing' && !pausedRef.current) {
        shootRequestRef.current = true;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current.add(e.code);
      if (e.code === 'Escape' && statusRef.current === 'playing') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      if (e.code === 'Space' && statusRef.current === 'playing' && !pausedRef.current) {
        e.preventDefault();
        shootRequestRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.code);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (statusRef.current !== 'playing' || pausedRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = LOGIC_W / rect.width;
      const scaleY = LOGIC_H / rect.height;
      inputXRef.current = (touch.clientX - rect.left) * scaleX;
      inputYRef.current = (touch.clientY - rect.top) * scaleY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (statusRef.current === 'over') {
        startGame();
        return;
      }
      if (statusRef.current === 'playing') {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = LOGIC_W / rect.width;
        const scaleY = LOGIC_H / rect.height;
        inputXRef.current = (touch.clientX - rect.left) * scaleX;
        inputYRef.current = (touch.clientY - rect.top) * scaleY;
      }
    };

    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => {
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
    };
  }, [startGame]);

  const resizeCanvasRef = useRef<() => void>(null!);

  // Canvas setup and render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      dprRef.current = Math.min(window.devicePixelRatio || 1, 2);
      const containerW = canvas.clientWidth;
      if (containerW <= 0) return;
      const displayW = Math.min(containerW, LOGIC_W);
      const displayH = displayW * (LOGIC_H / LOGIC_W);
      const scale = displayW / LOGIC_W;
      scaleRef.current = scale;
      canvas.width = displayW * dprRef.current;
      canvas.height = displayH * dprRef.current;
    };

    resizeCanvasRef.current = resizeCanvas;
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(container);
    resizeCanvas();

    const onVisibilityChange = () => {
      if (document.hidden) {
        pausedRef.current = true;
        setPaused(true);
        lastTsRef.current = 0;
        accumRef.current = 0;
      } else if (statusRef.current === 'playing') {
        pausedRef.current = false;
        setPaused(false);
        lastTsRef.current = 0;
        accumRef.current = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Fetch high score and server coins on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/games/scores');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            const s = data.data.find(
              (item: { game: string; score: number }) => item.game === GAME_NAME,
            );
            if (s) {
              setHighScore(s.score);
              highScoreRef.current = s.score;
            }
            const cs = data.data.find(
              (item: { game: string; score: number }) => item.game === 'aircraft-coins',
            );
            if (cs) {
              const serverCoins = cs.score;
              const localCoins = loadWallet();
              const finalCoins = Math.max(serverCoins, localCoins);
              saveWallet(finalCoins);
              setWalletCoins(finalCoins);
            } else {
              setWalletCoins(loadWallet());
            }
          }
        }
      } catch {
        // silent
      } finally {
        setLoadingHighScore(false);
      }
    };
    fetchData();
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

  // ==================== JSX ====================

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto py-2 gap-3">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {'\u8fd4\u56de\u5927\u5385'}
          </Button>
          {gameStatus === 'playing' && <GameControlsHelp info={aircraftControlsInfo} variant="button" />}
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-base font-bold tracking-wide">
            {getSkinDef(equippedSkin).emoji} {'\u98de\u673a\u5927\u6218'}
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {'\u5f97\u5206'}: {score} | {'\u5173\u5361'}: {stage}/{TOTAL_STAGES} | {'\u2764'} {lives} | {'\u6b66\u5668'} {weaponLevel} | {'\ud83e\ude99'} {sessionCoins}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm font-semibold text-amber-500 tabular-nums">{'\ud83e\ude99'}{walletCoins}</span>
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold text-yellow-500 tabular-nums">
            {loadingHighScore ? '...' : highScore}
          </span>
        </div>
      </div>

      {gameStatus === 'shop' ? (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{'\u76ae\u80a4\u5546\u5e97'}</h3>
            <span className="text-sm font-semibold text-amber-500">{'\ud83e\ude99'} {walletCoins}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {SKINS.map((s) => {
              const owned = skinStorage.owned.includes(s.id);
              const equipped = skinStorage.equipped === s.id;
              const canBuy = walletCoins >= s.cost;
              return (
                <div key={s.id} className="rounded-lg border border-border/50 p-3 bg-card flex flex-col items-center gap-1.5">
                  <span className="text-4xl">{s.emoji}</span>
                  <span className="text-sm font-bold">{s.name}</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">{s.desc}</span>
                  <span className="text-[10px] text-muted-foreground">{s.bonusDesc}</span>
                  {owned ? (
                    <Button
                      size="sm"
                      variant={equipped ? 'default' : 'outline'}
                      className={`min-h-[36px] w-full text-xs ${equipped ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      disabled={equipped}
                      onClick={() => buySkin(s.id)}
                    >
                      {equipped ? '\u2713 \u5df2\u88c5\u5907' : '\u88c5\u5907'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`min-h-[36px] w-full text-xs ${!canBuy ? 'opacity-40' : ''}`}
                      disabled={!canBuy}
                      onClick={() => buySkin(s.id)}
                    >
                      {'\ud83e\ude99'} {s.cost} {'\u8d2d\u4e70'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={closeShop}
          >
            {'\u8fd4\u56de'}
          </Button>
        </div>
      ) : (
        <>
          <div ref={containerRef} className="w-full flex justify-center">
            <canvas
              ref={canvasRef}
              className="rounded-lg border border-border/30 shadow-lg cursor-crosshair"
              style={{ width: '100%', maxWidth: LOGIC_W, aspectRatio: `${LOGIC_W}/${LOGIC_H}`, touchAction: 'none' }}
              onClick={handleCanvasClick}
            />
          </div>

          <div className="flex flex-col items-center gap-2 w-full">
            {gameStatus === 'over' && isNewRecord && (
              <p className="text-sm font-semibold text-yellow-500 animate-pulse">
                {'\ud83c\udf89 \u65b0\u7eaa\u5f55\uff01'}
              </p>
            )}

            {gameStatus === 'over' && victory && (
              <p className="text-sm font-semibold text-yellow-500 animate-pulse">
                {'\ud83c\udfc6 \u5168\u90e8\u901a\u5173\uff01'}
              </p>
            )}

            {gameStatus === 'over' && sessionCoins > 0 && (
              <p className="text-sm font-semibold text-amber-500">
                {'\ud83e\ude99'} +{sessionCoins} {'\u5df2\u52a0\u5165\u94b1\u5305'}
              </p>
            )}

            <div className="flex gap-2 w-full max-w-xs">
              <Button
                onClick={startGame}
                size="lg"
                className="flex-1 text-base font-semibold min-h-[44px]"
                disabled={gameStatus === 'playing'}
              >
                {gameStatus === 'playing'
                  ? (paused ? '\u5df2\u6682\u505c...' : '\u6e38\u620f\u4e2d...')
                  : '\u5f00\u59cb\u6e38\u620f'
                }
              </Button>
              {gameStatus !== 'playing' && (
                <Button
                  onClick={openShop}
                  size="lg"
                  variant="outline"
                  className="min-h-[44px] min-w-[44px] px-3"
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  商店
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
