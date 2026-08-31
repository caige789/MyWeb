'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

interface PvzGameProps {
  onBack: () => void;
}

const GAME_NAME = 'pvz';
const ROWS = 5;
const COLS = 9;

// Full-screen canvas layout constants
const LOGIC_W = 900;
const TOP_BAR_H = 52;
const GRID_H = 250;
const BOT_BAR_H = 90;
const LOGIC_H = TOP_BAR_H + GRID_H + BOT_BAR_H; // 392
const GRID_Y = TOP_BAR_H; // 52
const CELL_W = LOGIC_W / COLS; // 100
const CELL_H = GRID_H / ROWS; // 50

// UI button rectangles in LOGIC space
const BACK_BTN = { x: 5, y: 6, w: 60, h: 40 };
const COLLECT_BTN = { x: 200, y: 6, w: 80, h: 40 };
const SHOVEL_BTN_X = 4;
const SHOVEL_BTN_W = 60;
const CARD_START_X = 68;
const CARD_SLOT_W = 92;
const CARD_DRAW_W = 88;
const CARD_DRAW_H = 80;
const BOT_PAD_Y = 5;

const TOTAL_WAVES = 5;
const WAVE_DURATION = 30;
const SUN_DROP_INTERVAL = 7000;
const SUN_VALUE = 25;
const PEA_SPEED = 4.5;
const PEA_DAMAGE = 25;
const SHOOT_INTERVAL = 1400;
const SUNFLOWER_INTERVAL = 10000;
const SUN_LIFE = 900;
const ICE_SLOW_DURATION = 3000;
const ICE_SLOW_FACTOR = 0.5;
const CHERRY_FUSE_TIME = 1200;
const CHERRY_DAMAGE = 1800;
const CHERRY_RADIUS_CELLS = 1.5;
const CHOMP_DIGEST_TIME = 25000;
const CHOMP_MAX_HP = 300;
const MINE_ARM_TIME = 4000;
const TORCH_EXTRA_DAMAGE = 15;
const SUN_ATTRACT_RADIUS = 90;
const SUN_ATTRACT_SPEED = 10;

type Difficulty = 'easy' | 'normal' | 'hard';

interface DifficultyConfig {
  label: string;
  initSun: number;
  zombieSpeedMul: number;
  zombieCountMul: number;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { label: '\u7b80\u5355', initSun: 200, zombieSpeedMul: 0.6, zombieCountMul: 0.6 },
  normal: { label: '\u666e\u901a', initSun: 150, zombieSpeedMul: 1.0, zombieCountMul: 1.0 },
  hard:   { label: '\u56f0\u96be', initSun: 75,  zombieSpeedMul: 1.3, zombieCountMul: 1.4 },
};

interface PlantDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  hp: number;
  desc: string;
}

const PLANT_DEFS: PlantDef[] = [
  { id: 'sunflower',   name: '\u5411\u65e5\u8475',     emoji: '\u{1f33b}', cost: 50,  hp: 80,  desc: '\u4ea7\u751f\u9633\u5149' },
  { id: 'peashooter',  name: '\u8c4c\u8c46\u5c04\u624b',   emoji: '\u{1f7e2}', cost: 100, hp: 80,  desc: '\u5355\u53d1\u5c04\u51fb' },
  { id: 'wallnut',     name: '\u575a\u679c\u5899',     emoji: '\u{1f95c}', cost: 50,  hp: 800, desc: '\u9ad8\u8840\u91cf\u6321\u8def' },
  { id: 'doubleshoot', name: '\u53cc\u53d1\u5c04\u624b',   emoji: '\u{1f535}', cost: 200, hp: 80,  desc: '\u53cc\u53d1\u5c04\u51fb' },
  { id: 'iceshooter',  name: '\u5bd2\u51b0\u5c04\u624b', emoji: '\u2744\ufe0f', cost: 175, hp: 80,  desc: '\u51b0\u8c4c\u8c46\u51cf\u901f' },
  { id: 'cherrybomb',  name: '\u6a31\u6843\u70b8\u5f39', emoji: '\u{1f4a5}', cost: 150, hp: 80,  desc: '\u8303\u56f4\u7206\u70b8' },
  { id: 'chomper',     name: '\u5927\u5634\u82b1',     emoji: '\u{1f335}', cost: 150, hp: 80,  desc: '\u5403\u6389\u50f5\u5c38' },
  { id: 'potatomine',  name: '\u571f\u8c46\u96f7',     emoji: '\u{1f954}', cost: 25,  hp: 80,  desc: '\u8e29\u7206\u50f5\u5c38' },
  { id: 'torchwood',   name: '\u706b\u70ac\u6811\u6869',   emoji: '\u{1f525}', cost: 175, hp: 200, desc: '\u8c4c\u8c46\u53d8\u706b\u7403' },
];

type ZombieType = 'normal' | 'cone' | 'bucket' | 'flag' | 'newspaper' | 'football' | 'gargantuar';

interface ZombieDef {
  type: ZombieType;
  name: string;
  emoji: string;
  hp: number;
  speed: number;
  score: number;
}

const ZOMBIE_DEFS: Record<ZombieType, ZombieDef> = {
  normal:    { type: 'normal',    name: '\u666e\u901a\u50f5\u5c38',   emoji: '\u{1f9df}',     hp: 100,  speed: 0.3,  score: 10 },
  cone:      { type: 'cone',      name: '\u8def\u969c\u50f5\u5c38',   emoji: '\u{1f9df}\u200d\u2642\ufe0f',  hp: 200,  speed: 0.3,  score: 20 },
  bucket:    { type: 'bucket',    name: '\u94c1\u6876\u50f5\u5c38', emoji: '\u{1f9df}\u200d\u2640\ufe0f', hp: 400,  speed: 0.25, score: 40 },
  flag:      { type: 'flag',      name: '\u65d7\u5e1c\u50f5\u5c38',   emoji: '\u{1f6a9}',     hp: 150,  speed: 0.5,  score: 30 },
  newspaper: { type: 'newspaper', name: '\u62a5\u7eb8\u50f5\u5c38', emoji: '\u{1f4f0}',     hp: 280,  speed: 0.3,  score: 35 },
  football:  { type: 'football',  name: '\u6a44\u6984\u7403\u50f5\u5c38', emoji: '\u{1f3c8}',     hp: 500,  speed: 0.45, score: 50 },
  gargantuar:{ type: 'gargantuar',name: '\u5de8\u4eba\u50f5\u5c38',   emoji: '\u{1f947}',     hp: 1000, speed: 0.15, score: 80 },
};

interface Plant {
  type: string;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  shootTimer: number;
  sunTimer: number;
  fuseTimer: number;
  digestTimer: number;
  digesting: boolean;
  dead: boolean;
  armTimer: number;
  armed: boolean;
}

interface Zombie {
  id: number;
  type: ZombieType;
  name: string;
  emoji: string;
  row: number;
  x: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  speed: number;
  score: number;
  hitFlash: number;
  eating: boolean;
  walkPhase: number;
  slowTimer: number;
  paperBroken: boolean;
  smashed: boolean;
}

interface Pea {
  row: number;
  x: number;
  y: number;
  isIce: boolean;
  isFire: boolean;
  damage: number;
}

interface Sun {
  id: number;
  x: number;
  y: number;
  targetY: number;
  vy: number;
  collected: boolean;
  alpha: number;
  bouncePhase: number;
  lifeTimer: number;
  scale: number;
}

interface Mower {
  row: number;
  x: number;
  active: boolean;
  speed: number;
}

function getWaveZombies(wave: number, countMul: number): { type: ZombieType; delay: number }[] {
  const zombies: { type: ZombieType; delay: number }[] = [];
  let delay = 0;
  const baseCounts: number[][] = [
    [4, 1, 0, 0, 0, 0, 0],
    [3, 2, 0, 1, 1, 0, 0],
    [2, 2, 1, 1, 1, 1, 0],
    [2, 3, 1, 1, 2, 1, 1],
    [1, 3, 2, 2, 2, 2, 2],
  ];
  const counts = baseCounts[Math.min(wave, baseCounts.length - 1)];
  const types: ZombieType[] = ['normal', 'cone', 'bucket', 'flag', 'newspaper', 'football', 'gargantuar'];
  for (let i = 0; i < types.length; i++) {
    const count = Math.round(counts[i] * countMul);
    for (let j = 0; j < count; j++) {
      zombies.push({ type: types[i], delay });
      delay += 2000 + Math.random() * 3000;
    }
  }
  for (let i = zombies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zombies[i], zombies[j]] = [zombies[j], zombies[i]];
  }
  return zombies;
}

const pvzControlsInfo: GameControlsInfo = {
  gameName: '\u690d\u7269\u5927\u6218\u50f5\u5c38',
  desktop: [
    { action: '\u70b9\u51fb\u690d\u7269\u5361', keys: [], description: '\u9009\u4e2d\u8981\u79cd\u690d\u7684\u690d\u7269' },
    { action: '\u70b9\u51fb\u8349\u576a', keys: [], description: '\u5728\u7a7a\u683c\u5b50\u4e0a\u79cd\u690d\u9009\u4e2d\u7684\u690d\u7269' },
    { action: '\u70b9\u51fb\u9633\u5149', keys: [], description: '\u6536\u96c6\u98d8\u843d\u7684\u9633\u5149' },
  ],
  mobile: [
    { action: '\u70b9\u51fb\u690d\u7269\u5361', keys: [], description: '\u9009\u4e2d\u8981\u79cd\u690d\u7684\u690d\u7269' },
    { action: '\u70b9\u51fb\u8349\u576a', keys: [], description: '\u5728\u7a7a\u683c\u5b50\u4e0a\u79cd\u690d\u9009\u4e2d\u7684\u690d\u7269' },
    { action: '\u70b9\u51fb\u9633\u5149', keys: [], description: '\u6536\u96c6\u98d8\u843d\u7684\u9633\u5149' },
    { action: '\u6536\u96c6\u5168\u90e8\u6309\u94ae', keys: [], description: '\u4e00\u952e\u6536\u96c6\u6240\u6709\u573a\u4e0a\u9633\u5149' },
  ],
  rules: [
    '\u9009\u62e9\u690d\u7269\u5361\u7247\uff0c\u70b9\u51fb\u8349\u576a\u7a7a\u683c\u5b50\u79cd\u690d',
    '\u6536\u96c6\u9633\u5149\u83b7\u53d6\u8d44\u6e90\uff0c\u7528\u4e8e\u8d2d\u4e70\u690d\u7269',
    '\u50f5\u5c38\u4ece\u53f3\u4fa7\u51fa\u73b0\uff0c\u690d\u7269\u81ea\u52a8\u653b\u51fb',
    '\u963b\u6b62\u50f5\u5c38\u5230\u8fbe\u5de6\u4fa7\u5373\u53ef\u83b7\u80dc',
    '\u6bcf\u6392\u6709\u4e00\u4e2a\u5272\u8349\u673a\u4f5c\u4e3a\u6700\u540e\u9632\u7ebf',
  ],
  tips: [
    '\u4f18\u5148\u79cd\u5411\u65e5\u8475\uff0c\u5feb\u901f\u79ef\u7d2f\u9633\u5149',
    '\u575a\u679c\u5899\u53ef\u4ee5\u6321\u4f4f\u50f5\u5c38\uff0c\u4e89\u53d6\u65f6\u95f4',
    '\u6a31\u6843\u70b8\u5f39\u4e00\u6b21\u6027\u6d88\u706d\u8303\u56f4\u5185\u6240\u6709\u50f5\u5c38',
    '\u5730\u96f7\u9700\u89814\u79d2\u51c6\u5907\u65f6\u95f4\uff0c\u79cd\u5728\u524d\u65b9\u6548\u679c\u597d',
    '\u706b\u70ac\u6811\u6869\u53ef\u4ee5\u628a\u8c4c\u8c46\u53d8\u6210\u706b\u7403\uff0c\u4f24\u5bb3\u7ffb\u500d',
  ],
};

export default function PvzGame({ onBack }: PvzGameProps) {
  const [phase, setPhase] = useState<'settings' | 'playing' | 'won' | 'lost'>('settings');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [highScore, setHighScore] = useState(0);

  const plantsRef = useRef<Plant[]>([]);
  const zombiesRef = useRef<Zombie[]>([]);
  const peasRef = useRef<Pea[]>([]);
  const sunsRef = useRef<Sun[]>([]);
  const mowersRef = useRef<Mower[]>([]);
  const sunRef = useRef(100);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const waveElapsedRef = useRef(0);
  const waveZombiesRef = useRef<{ type: ZombieType; delay: number }[]>([]);
  const waveSpawnIdxRef = useRef(0);
  const sunDropTimerRef = useRef(0);
  const zombieIdRef = useRef(0);
  const sunIdRef = useRef(0);
  const diffRef = useRef<Difficulty>('normal');
  const overRef = useRef(false);
  const wonRef = useRef(false);
  const selPlantRef = useRef<string | null>(null);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleXRef = useRef(1);
  const scaleYRef = useRef(1);
  const dprRef = useRef(1);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const isShovelRef = useRef(false);
  const loopFnRef = useRef<(timestamp: number) => void>(null!);
  const submitScoreRef = useRef<(s: number) => void>(() => {});
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const collectAllFlagRef = useRef(false);

  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [isShovel, setIsShovel] = useState(false);
  const [displaySun, setDisplaySun] = useState(100);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayWave, setDisplayWave] = useState(1);

  useEffect(() => {
    fetch('/api/games/scores')
      .then(r => r.json())
      .then(data => {
        if (data.code === 200) {
          const pvz = (data.data || []).find((s: { game: string }) => s.game === GAME_NAME);
          if (pvz) setHighScore(pvz.score);
        }
      });
  }, []);

  const doSubmitScore = useCallback((s: number) => {
    fetch('/api/games/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_NAME, score: s }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200 && data.data) setHighScore(data.data.score);
      });
  }, []);

  useEffect(() => { submitScoreRef.current = doSubmitScore; }, [doSubmitScore]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    dprRef.current = Math.min(window.devicePixelRatio || 1, 2);
    const dpr = dprRef.current;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    if (displayW <= 0 || displayH <= 0) return;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    const scaleX = displayW / LOGIC_W;
    const scaleY = displayH / LOGIC_H;
    scaleXRef.current = scaleX;
    scaleYRef.current = scaleY;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr * scaleX, 0, 0, dpr * scaleY, 0, 0);
    }
  }, []);

  const initGame = useCallback((diff: Difficulty) => {
    const cfg = DIFFICULTY_CONFIG[diff];
    plantsRef.current = [];
    zombiesRef.current = [];
    peasRef.current = [];
    sunsRef.current = [];
    const mowers: Mower[] = [];
    for (let r = 0; r < ROWS; r++) {
      mowers.push({ row: r, x: 0, active: false, speed: 3 });
    }
    mowersRef.current = mowers;
    sunRef.current = cfg.initSun;
    scoreRef.current = 0;
    waveRef.current = 1;
    waveElapsedRef.current = 0;
    waveZombiesRef.current = getWaveZombies(0, cfg.zombieCountMul);
    waveSpawnIdxRef.current = 0;
    sunDropTimerRef.current = 0;
    zombieIdRef.current = 0;
    sunIdRef.current = 0;
    diffRef.current = diff;
    overRef.current = false;
    wonRef.current = false;
    selPlantRef.current = null;
    isShovelRef.current = false;
    cursorRef.current = null;
    lastTimeRef.current = 0;
    touchStartRef.current = null;
    hasMovedRef.current = false;
    collectAllFlagRef.current = false;
    setDisplaySun(cfg.initSun);
    setDisplayScore(0);
    setDisplayWave(1);
    setSelectedPlant(null);
    setIsShovel(false);
  }, []);

  const startGame = useCallback(() => {
    initGame(difficulty);
    setPhase('playing');
  }, [difficulty, initGame]);

  const screenToLogic = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scaleXRef.current,
      y: (clientY - rect.top) / scaleYRef.current,
    };
  }, []);

  const collectSun = useCallback((pos: { x: number; y: number }): boolean => {
    const suns = sunsRef.current;
    const tapRadius = CELL_W * 1.5;
    for (let i = suns.length - 1; i >= 0; i--) {
      const s = suns[i];
      if (s.collected) continue;
      const dx = pos.x - s.x;
      const dy = pos.y - s.y;
      if (dx * dx + dy * dy < tapRadius * tapRadius) {
        s.collected = true;
        s.scale = 2.0;
        sunRef.current += SUN_VALUE;
        setDisplaySun(sunRef.current);
        return true;
      }
    }
    return false;
  }, []);

  const handleSelectPlant = useCallback((plantId: string) => {
    if (selPlantRef.current === plantId) {
      selPlantRef.current = null;
      setSelectedPlant(null);
    } else {
      selPlantRef.current = plantId;
      setSelectedPlant(plantId);
      isShovelRef.current = false;
      setIsShovel(false);
    }
  }, []);

  const handleShovel = useCallback(() => {
    if (isShovelRef.current) {
      isShovelRef.current = false;
      setIsShovel(false);
    } else {
      isShovelRef.current = true;
      setIsShovel(true);
      selPlantRef.current = null;
      setSelectedPlant(null);
    }
  }, []);

  const handleTap = useCallback((clientX: number, clientY: number) => {
    if (overRef.current || wonRef.current) return;
    const pos = screenToLogic(clientX, clientY);

    // Zone 1: Top bar
    if (pos.y < TOP_BAR_H) {
      // Back button
      if (
        pos.x >= BACK_BTN.x && pos.x <= BACK_BTN.x + BACK_BTN.w &&
        pos.y >= BACK_BTN.y && pos.y <= BACK_BTN.y + BACK_BTN.h
      ) {
        onBack();
        return;
      }
      // Collect All button
      if (
        pos.x >= COLLECT_BTN.x && pos.x <= COLLECT_BTN.x + COLLECT_BTN.w &&
        pos.y >= COLLECT_BTN.y && pos.y <= COLLECT_BTN.y + COLLECT_BTN.h
      ) {
        collectAllFlagRef.current = true;
        return;
      }
      return;
    }

    // Zone 2: Bottom bar - plant cards and shovel
    if (pos.y > GRID_Y + GRID_H) {
      const relY = pos.y - (GRID_Y + GRID_H);
      // Check shovel button
      if (
        pos.x >= SHOVEL_BTN_X && pos.x <= SHOVEL_BTN_X + SHOVEL_BTN_W &&
        relY >= BOT_PAD_Y && relY <= BOT_PAD_Y + CARD_DRAW_H
      ) {
        handleShovel();
        return;
      }
      // Check plant cards
      const cardIdx = Math.floor((pos.x - CARD_START_X) / CARD_SLOT_W);
      if (cardIdx >= 0 && cardIdx < PLANT_DEFS.length) {
        const cardX = CARD_START_X + cardIdx * CARD_SLOT_W;
        if (
          pos.x >= cardX && pos.x <= cardX + CARD_DRAW_W &&
          relY >= BOT_PAD_Y && relY <= BOT_PAD_Y + CARD_DRAW_H
        ) {
          handleSelectPlant(PLANT_DEFS[cardIdx].id);
        }
      }
      return;
    }

    // Zone 3: Grid area - sun collection and plant placement
    if (collectSun(pos)) return;

    if (isShovelRef.current) {
      const col = Math.floor(pos.x / CELL_W);
      const row = Math.floor((pos.y - GRID_Y) / CELL_H);
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const idx = plantsRef.current.findIndex(p => p.row === row && p.col === col);
        if (idx >= 0) {
          plantsRef.current.splice(idx, 1);
        }
      }
      return;
    }

    const sel = selPlantRef.current;
    if (sel) {
      const col = Math.floor(pos.x / CELL_W);
      const row = Math.floor((pos.y - GRID_Y) / CELL_H);
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const exists = plantsRef.current.some(p => p.row === row && p.col === col);
        if (!exists) {
          const def = PLANT_DEFS.find(d => d.id === sel);
          if (def && sunRef.current >= def.cost) {
            sunRef.current -= def.cost;
            setDisplaySun(sunRef.current);
            plantsRef.current.push({
              type: def.id, row, col,
              hp: def.hp, maxHp: def.hp,
              shootTimer: 0, sunTimer: 0,
              fuseTimer: 0, digestTimer: 0,
              digesting: false, dead: false,
              armTimer: 0, armed: false,
            });
            selPlantRef.current = null;
            setSelectedPlant(null);
          }
        }
      }
    }
  }, [screenToLogic, collectSun, handleShovel, handleSelectPlant, onBack]);

  const handleCanvasMove = useCallback((clientX: number, clientY: number) => {
    if (overRef.current || wonRef.current) return;
    const pos = screenToLogic(clientX, clientY);
    // Only set cursor highlight when in grid area
    if (pos.y >= GRID_Y && pos.y <= GRID_Y + GRID_H) {
      cursorRef.current = pos;
    } else {
      cursorRef.current = null;
    }
  }, [screenToLogic]);

  const handleCanvasLeave = useCallback(() => {
    cursorRef.current = null;
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      handleTap(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      handleCanvasMove(e.clientX, e.clientY);
    };
    const onMouseLeave = () => { handleCanvasLeave(); };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) {
        touchStartRef.current = { x: t.clientX, y: t.clientY };
        hasMovedRef.current = false;
        handleCanvasMove(t.clientX, t.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) {
        const start = touchStartRef.current;
        if (start) {
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (dx * dx + dy * dy > 400) hasMovedRef.current = true;
        }
        handleCanvasMove(t.clientX, t.clientY);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!hasMovedRef.current && touchStartRef.current) {
        handleTap(touchStartRef.current.x, touchStartRef.current.y);
      }
      cursorRef.current = null;
      touchStartRef.current = null;
    };

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [phase, handleTap, handleCanvasMove, handleCanvasLeave]);

  // Main game loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = dprRef.current;
      const sx = scaleXRef.current;
      const sy = scaleYRef.current;
      ctx.setTransform(dpr * sx, 0, 0, dpr * sy, 0, 0);

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const deltaMs = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;
      const dt = deltaMs / 16.667;
      const cfg = DIFFICULTY_CONFIG[diffRef.current];

      // === GAME LOGIC (unchanged from original) ===
      if (!overRef.current && !wonRef.current) {
        waveElapsedRef.current += deltaMs;

        // Sky sun spawning
        sunDropTimerRef.current += deltaMs;
        if (sunDropTimerRef.current >= SUN_DROP_INTERVAL) {
          sunDropTimerRef.current -= SUN_DROP_INTERVAL;
          sunsRef.current.push({
            id: sunIdRef.current++,
            x: 40 + Math.random() * (LOGIC_W - 80),
            y: GRID_Y - 20,
            targetY: GRID_Y + 20 + Math.random() * (GRID_H - 40),
            vy: 0, collected: false, alpha: 1, bouncePhase: 0,
            lifeTimer: SUN_LIFE, scale: 1,
          });
        }

        // Zombie wave spawning
        const wz = waveZombiesRef.current;
        const wsi = waveSpawnIdxRef.current;
        if (wsi < wz.length && waveElapsedRef.current >= wz[wsi].delay) {
          const zType = wz[wsi].type;
          const def = ZOMBIE_DEFS[zType];
          zombiesRef.current.push({
            id: zombieIdRef.current++,
            type: zType, name: def.name, emoji: def.emoji,
            row: Math.floor(Math.random() * ROWS),
            x: LOGIC_W + 10,
            hp: def.hp, maxHp: def.hp,
            baseSpeed: def.speed, speed: def.speed * cfg.zombieSpeedMul,
            score: def.score, hitFlash: 0, eating: false,
            walkPhase: Math.random() * Math.PI * 2,
            slowTimer: 0, paperBroken: false, smashed: false,
          });
          waveSpawnIdxRef.current++;
        }

        // Wave progression
        if (
          waveElapsedRef.current >= WAVE_DURATION * 1000 &&
          waveSpawnIdxRef.current >= wz.length &&
          zombiesRef.current.length === 0
        ) {
          if (waveRef.current >= TOTAL_WAVES) {
            wonRef.current = true;
            submitScoreRef.current(scoreRef.current);
            setDisplayScore(scoreRef.current);
            setPhase('won');
          } else {
            waveRef.current++;
            waveElapsedRef.current = 0;
            waveSpawnIdxRef.current = 0;
            waveZombiesRef.current = getWaveZombies(waveRef.current - 1, cfg.zombieCountMul);
            setDisplayWave(waveRef.current);
          }
        }

        // Plant updates
        const plants = plantsRef.current;
        for (let pi = plants.length - 1; pi >= 0; pi--) {
          const p = plants[pi];
          if (p.dead || p.hp <= 0) { plants.splice(pi, 1); continue; }

          // Cherry bomb
          if (p.type === 'cherrybomb') {
            p.fuseTimer += deltaMs;
            if (p.fuseTimer >= CHERRY_FUSE_TIME) {
              const cx = (p.col + 0.5) * CELL_W;
              const cy = GRID_Y + (p.row + 0.5) * CELL_H;
              const radius = CHERRY_RADIUS_CELLS * Math.max(CELL_W, CELL_H);
              for (const z of zombiesRef.current) {
                const zy = GRID_Y + (z.row + 0.5) * CELL_H;
                const dx = z.x - cx;
                const dy = zy - cy;
                if (dx * dx + dy * dy < radius * radius) {
                  z.hp -= CHERRY_DAMAGE;
                  z.hitFlash = 10;
                }
              }
              p.hp = 0;
            }
            continue;
          }

          // Chomper
          if (p.type === 'chomper') {
            if (p.digesting) {
              p.digestTimer += deltaMs;
              if (p.digestTimer >= CHOMP_DIGEST_TIME) {
                p.digesting = false;
                p.digestTimer = 0;
              }
              continue;
            }
            const chompRange = CELL_W * 1.2;
            const px = (p.col + 0.5) * CELL_W;
            const py = GRID_Y + (p.row + 0.5) * CELL_H;
            for (const z of zombiesRef.current) {
              if (z.hp <= 0 || z.row !== p.row) continue;
              const zy = GRID_Y + (z.row + 0.5) * CELL_H;
              const dx = z.x - px;
              const dy = zy - py;
              if (dx > 0 && dx < chompRange && Math.abs(dy) < CELL_H * 0.5) {
                if (z.hp <= CHOMP_MAX_HP) {
                  z.hp = 0;
                  p.digesting = true;
                  p.digestTimer = 0;
                }
                break;
              }
            }
            continue;
          }

          // Potato mine
          if (p.type === 'potatomine') {
            if (!p.armed) {
              p.armTimer += deltaMs;
              if (p.armTimer >= MINE_ARM_TIME) {
                p.armed = true;
              }
              continue;
            }
            const mx = (p.col + 0.5) * CELL_W;
            const my = GRID_Y + (p.row + 0.5) * CELL_H;
            const mineR = CELL_W * 0.6;
            for (const z of zombiesRef.current) {
              if (z.hp <= 0 || z.row !== p.row) continue;
              const zy = GRID_Y + (z.row + 0.5) * CELL_H;
              const dx = z.x - mx;
              const dy = zy - my;
              if (dx * dx + dy * dy < mineR * mineR) {
                z.hp -= 1800;
                z.hitFlash = 10;
                p.hp = 0;
                break;
              }
            }
            continue;
          }

          // Sunflower sun production
          if (p.type === 'sunflower') {
            p.sunTimer += deltaMs;
            if (p.sunTimer >= SUNFLOWER_INTERVAL) {
              p.sunTimer -= SUNFLOWER_INTERVAL;
              const sx = (p.col + 0.5) * CELL_W;
              const sy = GRID_Y + p.row * CELL_H + CELL_H * 0.2;
              sunsRef.current.push({
                id: sunIdRef.current++,
                x: sx, y: sy,
                targetY: sy + 20 + Math.random() * 30,
                vy: 0, collected: false, alpha: 1,
                bouncePhase: 0, lifeTimer: SUN_LIFE, scale: 1,
              });
            }
          }

          // Shooters
          if (p.type === 'peashooter' || p.type === 'doubleshoot' || p.type === 'iceshooter') {
            const hasZombie = zombiesRef.current.some(
              z => z.row === p.row && z.x > (p.col + 0.5) * CELL_W && z.hp > 0
            );
            if (hasZombie) {
              p.shootTimer += deltaMs;
              if (p.shootTimer >= SHOOT_INTERVAL) {
                p.shootTimer -= SHOOT_INTERVAL;
                const px = (p.col + 0.8) * CELL_W;
                const py = GRID_Y + (p.row + 0.5) * CELL_H;
                const isIce = p.type === 'iceshooter';
                peasRef.current.push({ row: p.row, x: px, y: py, isIce, isFire: false, damage: PEA_DAMAGE });
                if (p.type === 'doubleshoot') {
                  peasRef.current.push({ row: p.row, x: px - 8, y: py - 4, isIce: false, isFire: false, damage: PEA_DAMAGE });
                }
              }
            }
          }
        }

        // Torch wood pea conversion
        for (const plant of plants) {
          if (plant.type !== 'torchwood' || plant.hp <= 0) continue;
          const tx = (plant.col + 0.5) * CELL_W;
          const tr = CELL_W * 0.6;
          for (const pea of peasRef.current) {
            if (pea.isFire) continue;
            if (pea.row === plant.row && Math.abs(pea.x - tx) < tr) {
              pea.isFire = true;
              pea.isIce = false;
              pea.damage = PEA_DAMAGE + TORCH_EXTRA_DAMAGE;
            }
          }
        }

        // Pea movement
        for (let i = peasRef.current.length - 1; i >= 0; i--) {
          peasRef.current[i].x += PEA_SPEED * dt;
        }

        // Pea-zombie collision
        for (let i = peasRef.current.length - 1; i >= 0; i--) {
          const pea = peasRef.current[i];
          let hit = false;
          const hitR = CELL_W * 0.45;
          for (const z of zombiesRef.current) {
            if (z.hp <= 0 || z.row !== pea.row) continue;
            const zy = GRID_Y + (z.row + 0.5) * CELL_H;
            const dx = pea.x - z.x;
            const dy = pea.y - zy;
            if (dx * dx + dy * dy < hitR * hitR) {
              z.hp -= pea.damage;
              z.hitFlash = 6;
              if (pea.isIce) z.slowTimer = ICE_SLOW_DURATION;
              hit = true;
              break;
            }
          }
          if (hit || pea.x > LOGIC_W + 20) {
            peasRef.current.splice(i, 1);
          }
        }

        // Mower updates
        for (const m of mowersRef.current) {
          if (!m.active) continue;
          m.x += m.speed * dt;
          for (const z of zombiesRef.current) {
            if (z.hp <= 0 || z.row !== m.row) continue;
            if (Math.abs(z.x - m.x) < 80) {
              z.hp = 0;
              z.smashed = true;
            }
          }
        }
        mowersRef.current = mowersRef.current.filter(m => !m.active || m.x < LOGIC_W + 50);

        // Zombie updates
        const zombies = zombiesRef.current;
        for (let i = zombies.length - 1; i >= 0; i--) {
          const z = zombies[i];
          if (z.hp <= 0) {
            scoreRef.current += z.score;
            setDisplayScore(scoreRef.current);
            zombies.splice(i, 1);
            continue;
          }
          if (z.hitFlash > 0) z.hitFlash -= dt;
          z.walkPhase += 0.05 * dt;

          if (z.slowTimer > 0) {
            z.slowTimer -= deltaMs;
            z.speed = z.baseSpeed * cfg.zombieSpeedMul * ICE_SLOW_FACTOR;
          } else {
            z.speed = z.baseSpeed * cfg.zombieSpeedMul;
          }

          if (z.type === 'newspaper' && !z.paperBroken && z.hp <= 100) {
            z.paperBroken = true;
            z.baseSpeed = 0.6;
            z.maxHp = 100;
          }

          // Mower trigger
          if (z.x < CELL_W * 0.5) {
            const mower = mowersRef.current.find(m => m.row === z.row && !m.active);
            if (mower) {
              mower.active = true;
              continue;
            }
          }

          z.eating = false;
          const zCol = Math.floor(z.x / CELL_W);
          const target = plants.find(p => p.row === z.row && p.col === zCol && !p.dead && p.hp > 0);
          if (target) {
            z.eating = true;
            const dmg = z.type === 'gargantuar' ? 1.5 : 0.5;
            target.hp -= dmg * dt;
          } else {
            z.x -= z.speed * dt;
          }

          // Game over check
          if (z.x < CELL_W * 0.2) {
            overRef.current = true;
            setDisplayScore(scoreRef.current);
            submitScoreRef.current(scoreRef.current);
            setPhase('lost');
          }
        }

        // Sun updates
        for (let i = sunsRef.current.length - 1; i >= 0; i--) {
          const s = sunsRef.current[i];
          if (s.collected) {
            s.scale = Math.max(s.scale - 0.08 * dt, 0);
            s.alpha -= 0.1 * dt;
            if (s.alpha <= 0) sunsRef.current.splice(i, 1);
            continue;
          }
          s.lifeTimer -= dt;
          if (s.lifeTimer <= 0) { sunsRef.current.splice(i, 1); continue; }
          if (s.y < s.targetY) {
            s.vy += 0.15 * dt;
            s.y += s.vy * dt;
            if (s.y >= s.targetY) {
              s.y = s.targetY;
              s.vy = -s.vy * 0.3;
              s.bouncePhase++;
              if (s.bouncePhase >= 3) { s.y = s.targetY; s.vy = 0; }
            }
          }

          // Cursor-based sun attraction (only when cursor is in grid area)
          const cursor = cursorRef.current;
          if (cursor) {
            const adx = cursor.x - s.x;
            const ady = cursor.y - s.y;
            const adist = Math.sqrt(adx * adx + ady * ady);
            if (adist < SUN_ATTRACT_RADIUS && adist > 0.1) {
              const speed = SUN_ATTRACT_SPEED * dt;
              s.x += (adx / adist) * speed;
              s.y += (ady / adist) * speed;
              if (adist < 10) {
                s.collected = true;
                s.scale = 2.0;
                sunRef.current += SUN_VALUE;
                setDisplaySun(sunRef.current);
              }
            }
          }
        }
      }

      // Collect all suns
      if (collectAllFlagRef.current) {
        collectAllFlagRef.current = false;
        for (const s of sunsRef.current) {
          if (!s.collected) {
            s.collected = true;
            s.scale = 1.8;
            sunRef.current += SUN_VALUE;
          }
        }
        setDisplaySun(sunRef.current);
      }

      // === RENDERING ===
      ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);

      // Grid grass background
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#5cb85c' : '#4cae4c';
          ctx.fillRect(c * CELL_W, GRID_Y + r * CELL_H, CELL_W, CELL_H);
        }
      }

      // Grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, GRID_Y + r * CELL_H); ctx.lineTo(LOGIC_W, GRID_Y + r * CELL_H); ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL_W, GRID_Y); ctx.lineTo(c * CELL_W, GRID_Y + GRID_H); ctx.stroke();
      }

      // Mowers
      for (const m of mowersRef.current) {
        const my = GRID_Y + (m.row + 0.5) * CELL_H;
        ctx.fillStyle = '#666';
        ctx.fillRect(m.x - 12, my - 8, 24, 16);
        ctx.fillStyle = '#f44336';
        ctx.fillRect(m.x + 6, my - 5, 8, 10);
      }

      // Cursor highlight (grid area only)
      const cursor = cursorRef.current;
      const sel = selPlantRef.current;
      if (cursor && (sel || isShovelRef.current)) {
        const hCol = Math.floor(cursor.x / CELL_W);
        const hRow = Math.floor((cursor.y - GRID_Y) / CELL_H);
        if (hRow >= 0 && hRow < ROWS && hCol >= 0 && hCol < COLS) {
          const exists = plantsRef.current.some(p => p.row === hRow && p.col === hCol);
          if (isShovelRef.current) {
            ctx.fillStyle = exists ? 'rgba(244,67,54,0.35)' : 'rgba(255,255,255,0.1)';
          } else {
            ctx.fillStyle = exists ? 'rgba(244,67,54,0.35)' : 'rgba(255,255,255,0.25)';
          }
          ctx.fillRect(hCol * CELL_W, GRID_Y + hRow * CELL_H, CELL_W, CELL_H);
          ctx.strokeStyle = exists ? '#f44336' : '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(hCol * CELL_W + 1, GRID_Y + hRow * CELL_H + 1, CELL_W - 2, CELL_H - 2);

          if (sel && !exists) {
            const pDef = PLANT_DEFS.find(d => d.id === sel);
            if (pDef) {
              const fs = Math.min(CELL_W, CELL_H) * 0.65;
              ctx.globalAlpha = 0.7;
              ctx.font = `${fs}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(pDef.emoji, cursor.x, cursor.y);
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      // Plants
      for (const p of plantsRef.current) {
        const def = PLANT_DEFS.find(d => d.id === p.type);
        if (!def) continue;
        const cx = (p.col + 0.5) * CELL_W;
        const cy = GRID_Y + (p.row + 0.5) * CELL_H;
        const fs = Math.min(CELL_W, CELL_H) * 0.7;
        ctx.font = `${fs}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (p.type === 'cherrybomb' && p.fuseTimer > 0) {
          const flash = Math.sin(p.fuseTimer * 0.02) > 0;
          if (flash) {
            ctx.fillStyle = 'rgba(255,100,0,0.3)';
            ctx.beginPath();
            ctx.arc(cx, cy, CELL_W * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (p.type === 'chomper' && p.digesting) ctx.globalAlpha = 0.5;
        if (p.type === 'potatomine' && !p.armed) ctx.globalAlpha = 0.4;

        ctx.fillText(def.emoji, cx, cy);
        ctx.globalAlpha = 1;

        // Chomper digest bar
        if (p.type === 'chomper' && p.digesting) {
          const bw = CELL_W * 0.7;
          const bx = cx - bw / 2;
          const by = GRID_Y + p.row * CELL_H + CELL_H * 0.15;
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(bx, by, bw, 3);
          ctx.fillStyle = '#9c27b0';
          ctx.fillRect(bx, by, bw * Math.min(1, p.digestTimer / CHOMP_DIGEST_TIME), 3);
        }

        // Potato mine arm bar
        if (p.type === 'potatomine' && !p.armed) {
          const bw = CELL_W * 0.7;
          const bx = cx - bw / 2;
          const by = GRID_Y + p.row * CELL_H + CELL_H * 0.15;
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(bx, by, bw, 3);
          ctx.fillStyle = '#ff9800';
          ctx.fillRect(bx, by, bw * Math.min(1, p.armTimer / MINE_ARM_TIME), 3);
        }

        // Plant HP bar
        if (p.type !== 'cherrybomb' && p.type !== 'potatomine' && p.hp < p.maxHp) {
          const bw = CELL_W * 0.7;
          const bx = cx - bw / 2;
          const by = GRID_Y + p.row * CELL_H + CELL_H * 0.92;
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(bx, by, bw, 4);
          const ratio = Math.max(0, p.hp / p.maxHp);
          ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
          ctx.fillRect(bx, by, bw * ratio, 4);
        }
      }

      // Peas
      for (const pea of peasRef.current) {
        if (pea.isFire) {
          ctx.fillStyle = '#ff5722';
          ctx.beginPath(); ctx.arc(pea.x, pea.y, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffeb3b';
          ctx.beginPath(); ctx.arc(pea.x, pea.y, 3, 0, Math.PI * 2); ctx.fill();
        } else if (pea.isIce) {
          ctx.fillStyle = '#42a5f5';
          ctx.beginPath(); ctx.arc(pea.x, pea.y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#bbdefb';
          ctx.beginPath(); ctx.arc(pea.x - 1, pea.y - 1, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#66bb6a';
          ctx.beginPath(); ctx.arc(pea.x, pea.y, 4, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Suns
      for (const s of sunsRef.current) {
        ctx.save();
        const baseAlpha = s.collected ? Math.max(0, s.alpha) : (s.lifeTimer < 180 ? (Math.sin(s.lifeTimer * 0.15) > 0 ? 1 : 0.4) : 1);
        ctx.globalAlpha = baseAlpha;
        const sc = s.scale || 1;
        const pulse = s.collected ? 0 : Math.sin(Date.now() * 0.004 + s.id) * 0.15;
        const r = (18 + pulse * 5) * sc;

        ctx.fillStyle = 'rgba(255,235,59,0.25)';
        ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,235,59,0.45)';
        ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath(); ctx.arc(s.x - 3 * sc, s.y - 3 * sc, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f57f17';
        ctx.font = `bold ${Math.round(11 * sc)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('25', s.x, s.y + 1);
        ctx.restore();
      }

      // Zombies
      for (const z of zombiesRef.current) {
        if (z.hp <= 0) continue;
        const cy = GRID_Y + (z.row + 0.5) * CELL_H;
        const wobble = Math.sin(z.walkPhase) * 3;
        const fs = Math.min(CELL_W, CELL_H) * 0.7;
        ctx.save();
        if (z.hitFlash > 0) {
          ctx.globalAlpha = 0.5 + Math.sin(z.hitFlash * 2) * 0.5;
        }
        if (z.slowTimer > 0) {
          ctx.fillStyle = 'rgba(66,165,245,0.3)';
          ctx.beginPath(); ctx.arc(z.x + wobble, cy, fs * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.font = `${fs}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(z.emoji, z.x + wobble, cy);
        ctx.restore();

        if (z.hp < z.maxHp) {
          const bw = CELL_W * 0.7;
          const bx = z.x - bw / 2;
          const by = GRID_Y + z.row * CELL_H + CELL_H * 0.92;
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(bx, by, bw, 4);
          const ratio = Math.max(0, z.hp / z.maxHp);
          ctx.fillStyle = ratio > 0.5 ? '#e53935' : '#b71c1c';
          ctx.fillRect(bx, by, bw * ratio, 4);
        }
      }

      // === TOP BAR ===
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, LOGIC_W, TOP_BAR_H);

      // Back button
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u2190', BACK_BTN.x + BACK_BTN.w / 2, BACK_BTN.y + BACK_BTN.h / 2);

      // Sun counter
      ctx.font = '18px serif';
      ctx.textAlign = 'left';
      ctx.fillText('\u2600\ufe0f', 74, TOP_BAR_H / 2 + 2);
      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`${sunRef.current}`, 98, TOP_BAR_H / 2 + 2);

      // Collect All button
      ctx.strokeStyle = 'rgba(255,235,59,0.7)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(COLLECT_BTN.x, COLLECT_BTN.y, COLLECT_BTN.w, COLLECT_BTN.h);
      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u6536\u96c6\u5168\u90e8', COLLECT_BTN.x + COLLECT_BTN.w / 2, COLLECT_BTN.y + COLLECT_BTN.h / 2);

      // Wave info (centered)
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`\u7b2c${waveRef.current}/${TOTAL_WAVES}\u6ce2`, LOGIC_W / 2, TOP_BAR_H / 2 + 2);

      // Score (right side)
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#ccc';
      ctx.fillText(`\u5f97\u5206: ${scoreRef.current}`, LOGIC_W - 10, TOP_BAR_H / 2 + 2);

      // === BOTTOM BAR ===
      const botY = GRID_Y + GRID_H;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, botY, LOGIC_W, BOT_BAR_H);

      // Shovel button
      const shovBtnY = botY + BOT_PAD_Y;
      if (isShovelRef.current) {
        ctx.fillStyle = 'rgba(244,67,54,0.3)';
        ctx.fillRect(SHOVEL_BTN_X, shovBtnY, SHOVEL_BTN_W, CARD_DRAW_H);
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 2.5;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
      }
      ctx.strokeRect(SHOVEL_BTN_X, shovBtnY, SHOVEL_BTN_W, CARD_DRAW_H);
      ctx.fillStyle = '#fff';
      ctx.font = '22px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\ud83d\udd27', SHOVEL_BTN_X + SHOVEL_BTN_W / 2, shovBtnY + CARD_DRAW_H / 2 - 10);
      ctx.font = '9px sans-serif';
      ctx.fillText('\u94f2\u5b50', SHOVEL_BTN_X + SHOVEL_BTN_W / 2, shovBtnY + CARD_DRAW_H - 12);

      // Plant cards
      for (let i = 0; i < PLANT_DEFS.length; i++) {
        const p = PLANT_DEFS[i];
        const cx = CARD_START_X + i * CARD_SLOT_W;
        const cy = shovBtnY;
        const canAfford = sunRef.current >= p.cost;
        const isSel = selPlantRef.current === p.id;

        if (!canAfford) ctx.globalAlpha = 0.4;

        if (isSel) {
          ctx.fillStyle = 'rgba(74,222,128,0.2)';
          ctx.fillRect(cx, cy, CARD_DRAW_W, CARD_DRAW_H);
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
        }
        ctx.strokeRect(cx, cy, CARD_DRAW_W, CARD_DRAW_H);

        ctx.fillStyle = '#fff';
        ctx.font = '24px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, cx + CARD_DRAW_W / 2, cy + 24);

        ctx.font = '9px sans-serif';
        ctx.fillStyle = canAfford ? '#fff' : '#999';
        ctx.fillText(p.name, cx + CARD_DRAW_W / 2, cy + 48);

        ctx.font = '10px sans-serif';
        ctx.fillStyle = canAfford ? '#ffeb3b' : '#888';
        ctx.fillText(`${p.cost}\u2600\ufe0f`, cx + CARD_DRAW_W / 2, cy + 64);

        ctx.globalAlpha = 1;
      }

      // === GAME OVER OVERLAY ===
      if (overRef.current || wonRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (wonRef.current) {
          ctx.fillText('\u80dc\u5229!', LOGIC_W / 2, LOGIC_H / 2 - 20);
        } else {
          ctx.fillText('\u6e38\u620f\u7ed3\u675f', LOGIC_W / 2, LOGIC_H / 2 - 20);
        }
        ctx.font = '18px sans-serif';
        ctx.fillText(`\u5f97\u5206: ${scoreRef.current}`, LOGIC_W / 2, LOGIC_H / 2 + 20);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    loopFnRef.current = loop;
  }, []);

  // Start/stop game loop
  useEffect(() => {
    if (phase === 'playing' || phase === 'won' || phase === 'lost') {
      lastTimeRef.current = 0;
      requestAnimationFrame(() => {
        setupCanvas();
        rafRef.current = requestAnimationFrame(loopFnRef.current);
      });
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, setupCanvas]);

  // Window resize handler for fullscreen canvas
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'won' && phase !== 'lost') return;
    const onResize = () => setupCanvas();
    window.addEventListener('resize', onResize);
    setupCanvas();
    return () => window.removeEventListener('resize', onResize);
  }, [phase, setupCanvas]);

  // Visibility change
  useEffect(() => {
    if (phase !== 'playing') return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } else {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(loopFnRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [phase]);

  // === SETTINGS PHASE ===
  if (phase === 'settings') {
    return (
      <div className="flex flex-col items-center w-full px-2">
        <div className="w-full flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold truncate">\ud83c\udf31 \u690d\u7269\u5927\u6218\u50f5\u5c38</h1>
        </div>
        <div className="w-full bg-card border rounded-lg p-3 space-y-4 overflow-x-hidden">
          <div>
            <h2 className="text-lg font-semibold mb-3">\u96be\u5ea6\u9009\u62e9</h2>
            <div className="flex gap-3">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    difficulty === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted bg-background hover:border-primary/50'
                  }`}
                >
                  {DIFFICULTY_CONFIG[d].label}
                  <span className="block text-xs text-muted-foreground mt-1">
                    \u521d\u59cb\u9633\u5149 {DIFFICULTY_CONFIG[d].initSun}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-3">\u64cd\u4f5c\u8bf4\u660e</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>\u5148\u70b9\u51fb\u5e95\u90e8\u690d\u7269\u5361\u7247\u9009\u62e9\u690d\u7269</li>
              <li>\u79fb\u52a8\u624b\u6307/\u9f20\u6807\u5230\u8349\u576a\u4e0a\u5b9a\u4f4d</li>
              <li>\u70b9\u51fb\u8349\u576a\u653e\u7f6e\u690d\u7269</li>
              <li>\u70b9\u51fb\u6389\u843d\u7684\u9633\u5149\u6536\u96c6</li>
              <li>\u70b9\u201c\u6536\u96c6\u5168\u90e8\u201d\u6309\u94ae\u4e00\u6b21\u6027\u6536\u96c6\u6240\u6709\u9633\u5149</li>
              <li>\u7528\u94f2\u5b50\u53ef\u4ee5\u79fb\u9664\u690d\u7269</li>
              <li>\u6491\u8fc7\u5168\u90e85\u6ce2\u50f5\u5c38\u5373\u53ef\u83b7\u80dc!</li>
            </ol>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-3">\u690d\u7269\u4ecb\u7ecd ({PLANT_DEFS.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLANT_DEFS.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-xs truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.cost}\u9633\u5149</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-3">\u50f5\u5c38\u4ecb\u7ecd ({Object.keys(ZOMBIE_DEFS).length})</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.values(ZOMBIE_DEFS) as ZombieDef[]).map(z => (
                <div key={z.type} className="flex flex-col items-center gap-1 text-sm bg-muted/50 rounded-lg p-2">
                  <span className="text-2xl">{z.emoji}</span>
                  <div className="font-medium text-xs">{z.name}</div>
                  <div className="text-xs text-muted-foreground">\u8840\u91cf {z.hp}</div>
                </div>
              ))}
            </div>
          </div>
          {highScore > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">\u6700\u9ad8\u5206: {highScore}</span>
            </div>
          )}
          <Button className="w-full" size="lg" onClick={startGame}>
            \u5f00\u59cb\u6e38\u620f
          </Button>
        </div>
      </div>
    );
  }

  // === PLAYING / GAME OVER PHASE ===
  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            touchAction: 'none',
            width: '100%',
            maxWidth: 'min(100vw, calc(100dvh * 900 / 392))',
            aspectRatio: '900 / 392',
          }}
        />
      </div>
      {(phase === 'won' || phase === 'lost') && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl p-6 mx-4 flex flex-col items-center gap-4">
            <p className="text-4xl">{phase === 'won' ? '\ud83c\udf89' : '\ud83d\udc80'}</p>
            <p className="text-2xl font-bold">{phase === 'won' ? '\u80dc\u5229\uff01' : '\u6e38\u620f\u7ed3\u675f'}</p>
            <p className="text-sm text-muted-foreground">\u6ce2\u6b21: {displayWave}/{TOTAL_WAVES}</p>
            <p className="text-sm text-muted-foreground">\u5f97\u5206: {displayScore}</p>
            <div className="flex gap-3 w-full">
              <Button className="flex-1" variant="outline" onClick={onBack}>\u8fd4\u56de\u5927\u5385</Button>
              <Button className="flex-1" onClick={() => { setPhase('settings'); }}>\u518d\u6765\u4e00\u5c40</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
