'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const snakeControlsInfo: GameControlsInfo = {
  gameName: '贪吃蛇',
  desktop: [
    { action: '方向键 ↑↓←→', keys: ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'], description: '控制蛇的移动方向' },
    { action: 'WASD', keys: ['KeyW','KeyA','KeyS','KeyD'], description: '备选方向控制' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续游戏 (Esc)' },
  ],
  mobile: [
    { action: '滑动', keys: [], description: '在游戏区域滑动手指改变方向' },
    { action: '虚拟方向键', keys: [], description: '使用屏幕下方的方向按钮 (手机端自动显示)' },
  ],
  rules: [
    '吃到食物蛇身变长，得分增加',
    '蛇穿墙不死，从另一边出来',
    '每吃5个食物速度加快一档(共5档)',
    '收集道具获得特殊能力',
    '金色食物+30分，紫色食物蛇缩短2节',
  ],
  tips: [
    '护盾可以让你免死一次',
    '双倍分数期间多吃食物',
    '紫色食物可以缩短蛇身，适合高分长蛇',
  ],
};

interface SnakeGameProps {
  onBack: () => void;
}

// Grid and rendering constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const LOGIC_SIZE = GRID_SIZE * CELL_SIZE;
const BASE_SPEED = 150;
const SCORE_PER_FOOD = 10;
const GAME_NAME = 'snake';
const MAX_DIFFICULTY = 5;
const FOODS_PER_DIFFICULTY = 5;
const SPEED_REDUCTION_PER_LEVEL = 18;

enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

interface Position {
  x: number;
  y: number;
}

// Power-up types
enum PowerUpKind {
  Speed = 'speed',
  Shield = 'shield',
  Slow = 'slow',
  DoubleScore = 'double',
}

interface PowerUp {
  x: number;
  y: number;
  kind: PowerUpKind;
  frame: number;
}

// Special food types
enum FoodType {
  Normal = 'normal',
  Gold = 'gold',
  Purple = 'purple',
}

interface Food {
  x: number;
  y: number;
  type: FoodType;
}

type GameStatus = 'idle' | 'playing' | 'over';

// Power-up visual config
const POWERUP_CONFIG: Record<PowerUpKind, { color: string; glow: string; symbol: string }> = {
  [PowerUpKind.Speed]: { color: '#fbbf24', glow: '#f59e0b', symbol: '⚡' },
  [PowerUpKind.Shield]: { color: '#38bdf8', glow: '#0ea5e9', symbol: '🛡' },
  [PowerUpKind.Slow]: { color: '#a5f3fc', glow: '#67e8f9', symbol: '❄' },
  [PowerUpKind.DoubleScore]: { color: '#facc15', glow: '#eab308', symbol: '★' },
};

// Food visual config
const FOOD_CONFIG: Record<FoodType, { color: string; glow: string; label: string }> = {
  [FoodType.Normal]: { color: '#ef4444', glow: '#ef4444', label: '' },
  [FoodType.Gold]: { color: '#fbbf24', glow: '#f59e0b', label: '+30' },
  [FoodType.Purple]: { color: '#c084fc', glow: '#a855f7', label: '-2' },
};

export default function SnakeGame({ onBack }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const snakeRef = useRef<Position[]>([]);
  const directionRef = useRef<Direction>(Direction.Right);
  const nextDirectionRef = useRef<Direction>(Direction.Right);
  const foodRef = useRef<Food>({ x: 15, y: 10, type: FoodType.Normal });
  const powerUpRef = useRef<PowerUp | null>(null);
  const powerUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef<number>(0);
  const foodsEatenRef = useRef<number>(0);
  const difficultyRef = useRef<number>(0);
  const gameStatusRef = useRef<GameStatus>('idle');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dprRef = useRef(1);
  const scaleRef = useRef(1);
  // Active effects
  const hasShieldRef = useRef<boolean>(false);
  const isDoubleScoreRef = useRef<boolean>(false);
  const isSpeedBoostedRef = useRef<boolean>(false);
  const isSlowedRef = useRef<boolean>(false);
  const currentSpeedRef = useRef<number>(BASE_SPEED);
  // Power-up spawn timer
  const powerUpSpawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [loadingHighScore, setLoadingHighScore] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  // UI for active effects
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(0);

  const updateActiveEffectsUI = useCallback(() => {
    const effects: string[] = [];
    if (hasShieldRef.current) effects.push('🛡 护盾');
    if (isDoubleScoreRef.current) effects.push('★ 双倍分数');
    if (isSpeedBoostedRef.current) effects.push('⚡ 加速');
    if (isSlowedRef.current) effects.push('❄ 减速');
    setActiveEffects(effects);
  }, []);

  const getSpeed = useCallback(() => {
    const base = BASE_SPEED - difficultyRef.current * SPEED_REDUCTION_PER_LEVEL;
    let speed = Math.max(base, BASE_SPEED - SPEED_REDUCTION_PER_LEVEL * MAX_DIFFICULTY);
    if (isSpeedBoostedRef.current) speed = Math.max(speed * 0.55, 40);
    if (isSlowedRef.current) speed = speed * 2;
    return speed;
  }, []);

  const restartGameLoop = useCallback((speed?: number) => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (gameStatusRef.current === 'playing' && !pausedRef.current) {
      gameLoopRef.current = window.setInterval(
        () => { /* noop, actual step called from gameStep */ },
        speed ?? getSpeed()
      );
    }
  }, [getSpeed]);

  const clearAllTimers = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (powerUpTimerRef.current) {
      clearTimeout(powerUpTimerRef.current);
      powerUpTimerRef.current = null;
    }
    if (powerUpSpawnTimerRef.current) {
      clearInterval(powerUpSpawnTimerRef.current);
      powerUpSpawnTimerRef.current = null;
    }
  }, []);

  const applyPowerUpEffect = useCallback((kind: PowerUpKind) => {
    if (kind === PowerUpKind.Shield) {
      hasShieldRef.current = true;
      updateActiveEffectsUI();
      return;
    }

    let duration = 0;
    if (kind === PowerUpKind.Speed) {
      isSpeedBoostedRef.current = true;
      isSlowedRef.current = false;
      duration = 3000;
    } else if (kind === PowerUpKind.Slow) {
      isSlowedRef.current = true;
      isSpeedBoostedRef.current = false;
      duration = 5000;
    } else if (kind === PowerUpKind.DoubleScore) {
      isDoubleScoreRef.current = true;
      duration = 10000;
    }

    updateActiveEffectsUI();

    if (powerUpTimerRef.current) {
      clearTimeout(powerUpTimerRef.current);
    }
    powerUpTimerRef.current = setTimeout(() => {
      if (kind === PowerUpKind.Speed) isSpeedBoostedRef.current = false;
      if (kind === PowerUpKind.Slow) isSlowedRef.current = false;
      if (kind === PowerUpKind.DoubleScore) isDoubleScoreRef.current = false;
      powerUpTimerRef.current = null;
      updateActiveEffectsUI();
      // Restart loop with updated speed
      const newSpeed = getSpeed();
      currentSpeedRef.current = newSpeed;
      if (gameStatusRef.current === 'playing' && !pausedRef.current) {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        gameLoopRef.current = window.setInterval(gameStepRef.current, newSpeed);
      }
    }, duration);
  }, [updateActiveEffectsUI, getSpeed]);

  const initSnake = useCallback(() => {
    const centerX = Math.floor(GRID_SIZE / 2);
    const centerY = Math.floor(GRID_SIZE / 2);
    snakeRef.current = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY },
    ];
  }, []);

  // Check if a position is occupied by snake or power-up
  const isOccupied = useCallback((pos: Position, exclude?: Position) => {
    for (const seg of snakeRef.current) {
      if (seg.x === pos.x && seg.y === pos.y) return true;
    }
    if (powerUpRef.current && powerUpRef.current.x === pos.x && powerUpRef.current.y === pos.y) return true;
    if (exclude && exclude.x === pos.x && exclude.y === pos.y) return false;
    return false;
  }, []);

  const spawnFood = useCallback(() => {
    const snake = snakeRef.current;
    let pos: Position;
    let attempts = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (snake.some((seg) => seg.x === pos.x && seg.y === pos.y) && attempts < 200);

    // Decide food type: 10% gold, 8% purple, 82% normal
    const roll = Math.random();
    let type = FoodType.Normal;
    if (roll < 0.10) type = FoodType.Gold;
    else if (roll < 0.18) type = FoodType.Purple;

    foodRef.current = { x: pos.x, y: pos.y, type };
  }, []);

  const spawnPowerUp = useCallback(() => {
    if (powerUpRef.current) return; // Only one power-up at a time
    if (gameStatusRef.current !== 'playing' || pausedRef.current) return;

    let pos: Position;
    let attempts = 0;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (isOccupied(pos) || (foodRef.current.x === pos.x && foodRef.current.y === pos.y) && attempts < 200);

    if (attempts >= 200) return;

    const kinds = [PowerUpKind.Speed, PowerUpKind.Shield, PowerUpKind.Slow, PowerUpKind.DoubleScore];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    powerUpRef.current = { x: pos.x, y: pos.y, kind, frame: 0 };
  }, [isOccupied]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dprRef.current * scaleRef.current, 0, 0, dprRef.current * scaleRef.current, 0, 0);
    const size = LOGIC_SIZE;
    const cellSize = LOGIC_SIZE / GRID_SIZE;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * cellSize;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke();
    }

    // Draw power-up
    const pu = powerUpRef.current;
    if (pu) {
      const config = POWERUP_CONFIG[pu.kind];
      const cx = pu.x * cellSize + cellSize / 2;
      const cy = pu.y * cellSize + cellSize / 2;
      const radius = Math.max(cellSize / 2 - 1, 1);
      const pulse = Math.sin(pu.frame * 0.15) * 0.25 + 0.75;

      ctx.shadowColor = config.glow;
      ctx.shadowBlur = 10 * pulse;
      ctx.fillStyle = config.color;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(cellSize * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.symbol, cx, cy + 1);
    }

    // Draw food
    const food = foodRef.current;
    const foodCx = food.x * cellSize + cellSize / 2;
    const foodCy = food.y * cellSize + cellSize / 2;
    const foodR = Math.max(cellSize / 2 - 2, 1);
    const fConfig = FOOD_CONFIG[food.type];

    ctx.shadowColor = fConfig.glow;
    ctx.shadowBlur = food.type === FoodType.Gold ? 14 : 8;
    ctx.fillStyle = fConfig.color;
    ctx.beginPath();
    ctx.arc(foodCx, foodCy, foodR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Food label for special foods
    if (food.type !== FoodType.Normal && fConfig.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(cellSize * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fConfig.label, foodCx, foodCy + 1);
    }

    // Draw snake
    const snake = snakeRef.current;
    snake.forEach((seg, index) => {
      const x = seg.x * cellSize;
      const y = seg.y * cellSize;
      const padding = 1;
      const radius = 3;

      if (index === 0) {
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#4ade80';
      } else {
        ctx.shadowBlur = 0;
        const ratio = 1 - (index / snake.length) * 0.5;
        const g = Math.round(180 * ratio + 60);
        ctx.fillStyle = `rgb(34, ${g}, 34)`;
      }

      // Shield glow on head
      if (index === 0 && hasShieldRef.current) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 6;
      }

      const rx = x + padding;
      const ry = y + padding;
      const rw = cellSize - padding * 2;
      const rh = cellSize - padding * 2;
      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      ctx.fill();
    });

    ctx.shadowBlur = 0;

    // Game over overlay
    if (gameStatusRef.current === 'over') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(cellSize * 1.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('游戏结束', size / 2, size / 2 - cellSize);
      ctx.font = `${Math.round(cellSize * 0.9)}px sans-serif`;
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`得分: ${scoreRef.current}`, size / 2, size / 2 + cellSize);
    }

    // Paused overlay
    if (pausedRef.current && gameStatusRef.current === 'playing') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(cellSize * 1.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('已暂停', size / 2, size / 2);
    } else if (gameStatusRef.current === 'idle') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(cellSize * 1.2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('按「开始游戏」', size / 2, size / 2);
    }
  }, []);

  // We need a ref to gameStep for the power-up timer callback
  const gameStepRef = useRef<() => void>(() => {});

  const endGame = useCallback(async () => {
    gameStatusRef.current = 'over';
    setGameStatus('over');
    clearAllTimers();
    draw();

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
  }, [highScore, draw, clearAllTimers]);

  const gameStep = useCallback(() => {
    const snake = snakeRef.current;
    const head = { ...snake[0] };

    directionRef.current = nextDirectionRef.current;
    switch (directionRef.current) {
      case Direction.Up: head.y -= 1; break;
      case Direction.Down: head.y += 1; break;
      case Direction.Left: head.x -= 1; break;
      case Direction.Right: head.x += 1; break;
    }

    // Wall wrap (pass-through mode)
    if (head.x < 0) head.x = GRID_SIZE - 1;
    else if (head.x >= GRID_SIZE) head.x = 0;
    if (head.y < 0) head.y = GRID_SIZE - 1;
    else if (head.y >= GRID_SIZE) head.y = 0;

    // Self collision
    if (snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
      if (hasShieldRef.current) {
        hasShieldRef.current = false;
        updateActiveEffectsUI();
        // Don't move, skip this frame
        draw();
        return;
      }
      endGame();
      return;
    }

    snake.unshift(head);

    // Check power-up collision
    if (powerUpRef.current && head.x === powerUpRef.current.x && head.y === powerUpRef.current.y) {
      applyPowerUpEffect(powerUpRef.current.kind);
      powerUpRef.current = null;
      // Restart loop if speed changed
      if (isSpeedBoostedRef.current || isSlowedRef.current) {
        const newSpeed = getSpeed();
        currentSpeedRef.current = newSpeed;
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        gameLoopRef.current = window.setInterval(gameStepRef.current, newSpeed);
      }
    } else {
      // Update power-up animation frame
      if (powerUpRef.current) powerUpRef.current.frame += 1;
    }

    // Check food collision
    const food = foodRef.current;
    if (head.x === food.x && head.y === food.y) {
      let gained = 0;
      if (food.type === FoodType.Gold) {
        gained = 30;
      } else if (food.type === FoodType.Purple) {
        gained = 10;
        // Shrink snake by 2 segments (min length 1)
        const removeCount = Math.min(2, snake.length - 1);
        for (let i = 0; i < removeCount; i++) snake.pop();
      } else {
        gained = SCORE_PER_FOOD;
      }

      if (isDoubleScoreRef.current) gained *= 2;
      scoreRef.current += gained;
      setScore(scoreRef.current);

      // Difficulty scaling
      if (food.type !== FoodType.Purple) {
        foodsEatenRef.current += 1;
        const newDiff = Math.min(
          Math.floor(foodsEatenRef.current / FOODS_PER_DIFFICULTY),
          MAX_DIFFICULTY
        );
        if (newDiff !== difficultyRef.current) {
          difficultyRef.current = newDiff;
          setDifficulty(newDiff);
          const newSpeed = getSpeed();
          currentSpeedRef.current = newSpeed;
          if (gameLoopRef.current) clearInterval(gameLoopRef.current);
          gameLoopRef.current = window.setInterval(gameStepRef.current, newSpeed);
        }
      }

      spawnFood();
    } else {
      snake.pop();
    }

    draw();
  }, [draw, spawnFood, endGame, applyPowerUpEffect, getSpeed, updateActiveEffectsUI]);

  // Keep gameStepRef updated
  useEffect(() => {
    gameStepRef.current = gameStep;
  }, [gameStep]);

  const startGame = useCallback(() => {
    clearAllTimers();
    initSnake();
    spawnFood();
    directionRef.current = Direction.Right;
    nextDirectionRef.current = Direction.Right;
    scoreRef.current = 0;
    setScore(0);
    foodsEatenRef.current = 0;
    difficultyRef.current = 0;
    setDifficulty(0);
    gameStatusRef.current = 'playing';
    setGameStatus('playing');
    setIsNewRecord(false);
    pausedRef.current = false;
    setPaused(false);
    powerUpRef.current = null;
    hasShieldRef.current = false;
    isDoubleScoreRef.current = false;
    isSpeedBoostedRef.current = false;
    isSlowedRef.current = false;
    currentSpeedRef.current = BASE_SPEED;
    setActiveEffects([]);

    draw();

    const speed = getSpeed();
    currentSpeedRef.current = speed;
    gameLoopRef.current = window.setInterval(gameStep, speed);

    // Spawn power-ups periodically (every 8-15 seconds)
    const spawnPowerUpPeriodic = () => {
      spawnPowerUp();
      // Randomize next spawn: 8-15 seconds
      const nextDelay = 8000 + Math.random() * 7000;
      if (powerUpSpawnTimerRef.current) clearInterval(powerUpSpawnTimerRef.current);
      powerUpSpawnTimerRef.current = setTimeout(() => {
        spawnPowerUpPeriodic();
      }, nextDelay);
    };
    // First power-up after 5-10 seconds
    const firstDelay = 5000 + Math.random() * 5000;
    powerUpSpawnTimerRef.current = setTimeout(spawnPowerUpPeriodic, firstDelay);
  }, [initSnake, spawnFood, draw, gameStep, getSpeed, clearAllTimers, spawnPowerUp]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameStatusRef.current !== 'playing') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        if (pausedRef.current) {
          if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
            gameLoopRef.current = null;
          }
        } else {
          const speed = currentSpeedRef.current;
          gameLoopRef.current = window.setInterval(gameStepRef.current, speed);
        }
        draw();
        return;
      }
      if (pausedRef.current) return;

      const current = directionRef.current;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (current !== Direction.Down) nextDirectionRef.current = Direction.Up;
          e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S':
          if (current !== Direction.Up) nextDirectionRef.current = Direction.Down;
          e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A':
          if (current !== Direction.Right) nextDirectionRef.current = Direction.Left;
          e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D':
          if (current !== Direction.Left) nextDirectionRef.current = Direction.Right;
          e.preventDefault(); break;
      }
    },
    [draw]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (gameStatusRef.current !== 'playing') return;
      if (pausedRef.current) return;

      const touchStart = touchStartRef.current;
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;

      const minSwipeDistance = 20;
      if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) return;

      const current = directionRef.current;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && current !== Direction.Left) nextDirectionRef.current = Direction.Right;
        else if (dx < 0 && current !== Direction.Right) nextDirectionRef.current = Direction.Left;
      } else {
        if (dy > 0 && current !== Direction.Up) nextDirectionRef.current = Direction.Down;
        else if (dy < 0 && current !== Direction.Down) nextDirectionRef.current = Direction.Up;
      }
    },
    []
  );

  useEffect(() => {
    const fetchHighScore = async () => {
      try {
        const res = await fetch('/api/games/scores');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            const snakeScore = data.data.find(
              (item: { game: string; score: number }) => item.game === GAME_NAME
            );
            if (snakeScore) setHighScore(snakeScore.score);
          }
        }
      } catch { /* silent */ }
      finally { setLoadingHighScore(false); }
    };
    fetchHighScore();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    return () => { clearAllTimers(); };
  }, [clearAllTimers]);

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

  // GamePlayer pause/resume events
  useEffect(() => {
    const onPause = () => {
      if (gameStatusRef.current !== 'playing' || pausedRef.current) return;
      pausedRef.current = true;
      setPaused(true);
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      draw();
    };
    const onResume = () => {
      if (gameStatusRef.current !== 'playing' || !pausedRef.current) return;
      pausedRef.current = false;
      setPaused(false);
      const speed = currentSpeedRef.current;
      gameLoopRef.current = window.setInterval(gameStepRef.current, speed);
      draw();
    };
    window.addEventListener('game-pause', onPause);
    window.addEventListener('game-resume', onResume);
    return () => {
      window.removeEventListener('game-pause', onPause);
      window.removeEventListener('game-resume', onResume);
    };
  }, [draw]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto py-2 gap-2">
      <div className="flex items-center justify-between w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回大厅
        </Button>
        <h2 className="text-lg font-bold tracking-wide">🐍 贪吃蛇</h2>
        {gameStatus === 'playing' && <GameControlsHelp info={snakeControlsInfo} variant="button" />}
        {gameStatus !== 'playing' && <div className="w-8" />}
      </div>

      <Card className="w-full border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">分数</span>
            <span className="text-xl font-bold text-primary tabular-nums">{score}</span>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" />
              最高分
            </span>
            <span className="text-xl font-bold text-yellow-500 tabular-nums">
              {loadingHighScore ? '...' : highScore}
            </span>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">难度</span>
            <span className="text-xl font-bold text-orange-400 tabular-nums">
              {difficulty + 1}/{MAX_DIFFICULTY + 1}
            </span>
          </div>
        </CardContent>
      </Card>

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
          disabled={gameStatus === 'playing'}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {gameStatus === 'playing' ? '游戏中...' : '开始游戏'}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 w-40 mt-2 md:hidden">
        <div />
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => {
            e.stopPropagation();
            if (directionRef.current !== Direction.Down) nextDirectionRef.current = Direction.Up;
          }}
          disabled={gameStatus !== 'playing' || paused}
        >
          ↑
        </Button>
        <div />
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => {
            e.stopPropagation();
            if (directionRef.current !== Direction.Right) nextDirectionRef.current = Direction.Left;
          }}
          disabled={gameStatus !== 'playing' || paused}
        >
          ←
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => {
            e.stopPropagation();
            if (directionRef.current !== Direction.Up) nextDirectionRef.current = Direction.Down;
          }}
          disabled={gameStatus !== 'playing' || paused}
        >
          ↓
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-lg active:bg-primary/20"
          onTouchStart={(e) => {
            e.stopPropagation();
            if (directionRef.current !== Direction.Left) nextDirectionRef.current = Direction.Right;
          }}
          disabled={gameStatus !== 'playing' || paused}
        >
          →
        </Button>
      </div>
    </div>
  );
}
