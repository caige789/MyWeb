'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const tetrisControlsInfo: GameControlsInfo = {
  gameName: '俄罗斯方块',
  desktop: [
    { action: '← →', keys: ['ArrowLeft','ArrowRight'], description: '左右移动方块' },
    { action: '↑', keys: ['ArrowUp'], description: '旋转方块' },
    { action: '↓', keys: ['ArrowDown'], description: '加速下落(软降)' },
    { action: '空格', keys: ['Space'], description: '硬降(直接落底)' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续游戏' },
  ],
  mobile: [
    { action: '虚拟按钮', keys: [], description: '屏幕底部5个操作按钮(手机端显示)' },
  ],
  rules: ['方块从顶部下落，填满一行即消除','消除多行获得更多分数','方块堆到顶部则游戏结束','可切换3种速度'],
  tips: ['尽量把方块铺平，避免高低不平','留一列给长条(I形)方块','提前观察下一个方块预览'],
};

/* ==================== 类型定义 ==================== */

interface TetrisGameProps {
  onBack: () => void;
}

/** 棋盘列数 */
const COLS = 10;
/** 棋盘行数 */
const ROWS = 20;
/** 单元格像素大小 */
const CELL = 30;
/** 下一个预览区域单元格大小 */
const PREVIEW_CELL = 22;
/** 游戏名称（用于API） */
const GAME_NAME = 'tetris';

/** 速度档位配置 */
const SPEED_CONFIG = {
  slow: { label: '慢速', base: 800 },
  normal: { label: '正常', base: 500 },
  fast: { label: '快速', base: 300 },
} as const;

/** 速度档位类型 */
type SpeedKey = keyof typeof SPEED_CONFIG;

/** 7种标准方块形状定义 */
const SHAPES: Record<string, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

/** 方块颜色映射 */
const COLORS: Record<string, string> = {
  I: '#00e5ff',
  O: '#ffea00',
  T: '#d500f9',
  S: '#00e676',
  Z: '#ff1744',
  J: '#2979ff',
  L: '#ff9100',
};

/** 方块描边颜色（更深） */
const STROKE_COLORS: Record<string, string> = {
  I: '#00b8d4',
  O: '#f9a825',
  T: '#aa00ff',
  S: '#00c853',
  Z: '#d50000',
  J: '#2962ff',
  L: '#e65100',
};

/** 方块高光颜色（更亮） */
const HIGHLIGHT_COLORS: Record<string, string> = {
  I: '#80f0ff',
  O: '#fff59d',
  T: '#ea80fc',
  S: '#69f0ae',
  Z: '#ff8a80',
  J: '#82b1ff',
  L: '#ffcc80',
};

/** 方块类型列表 */
const PIECE_TYPES = Object.keys(SHAPES);

/** 消行得分规则 */
const LINE_SCORES: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

/** 当前方块信息 */
interface Piece {
  type: string;
  shape: number[][];
  x: number;
  y: number;
}

/** 游戏状态类型 */
type GameStatus = 'idle' | 'playing' | 'over';

/* ==================== 工具函数 ==================== */

/** 随机生成一个方块类型 */
function randomType(): string {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

/** 深拷贝二维数组 */
function cloneShape(shape: number[][]): number[][] {
  return shape.map(row => [...row]);
}

/** 顺时针旋转矩阵90度 */
function rotateShape(shape: number[][]): number[][] {
  const n = shape.length;
  const rotated: number[][] = [];
  for (let i = 0; i < n; i++) {
    rotated[i] = [];
    for (let j = 0; j < n; j++) {
      rotated[i][j] = shape[n - 1 - j][i];
    }
  }
  return rotated;
}

/** 创建新方块 */
function createPiece(type: string): Piece {
  return {
    type,
    shape: cloneShape(SHAPES[type]),
    x: Math.floor((COLS - SHAPES[type][0].length) / 2),
    y: 0,
  };
}

/** 碰撞检测：检查方块在指定位置是否合法 */
function isValid(
  shape: number[][],
  board: (string | null)[][],
  px: number,
  py: number
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const nx = px + c;
        const ny = py + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && board[ny][nx] !== null) return false;
      }
    }
  }
  return true;
}

/* ==================== 主组件 ==================== */

export default function TetrisGame({ onBack }: TetrisGameProps) {
  const isMobile = useIsMobile();

  /* --- Refs --- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const boardRef = useRef<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const currentRef = useRef<Piece | null>(null);
  const nextRef = useRef<string>(randomType());
  const scoreRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const linesRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>('idle');
  const lastDropRef = useRef<number>(0);
  const speedRef = useRef<SpeedKey>('normal');
  const flashRowsRef = useRef<number[]>([]);
  const flashStartRef = useRef<number>(0);
  const gameOverCheckedRef = useRef<boolean>(false);
  const scaleRef = useRef<number>(1);
  const displayWidthRef = useRef<number>(COLS * CELL);

  /* --- React状态（用于UI渲染） --- */
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [speed, setSpeed] = useState<SpeedKey>('normal');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [loadingHighScore, setLoadingHighScore] = useState(true);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  /* ==================== 计算Canvas缩放比例 ==================== */
  const computeScale = useCallback(() => {
    const maxW = isMobile ? 360 : COLS * CELL;
    const boardW = COLS * CELL;
    // 总宽度 = 主棋盘 + 预览区 + 间距，手机端按总宽适配，避免横向溢出
    const totalW = boardW + 4 * PREVIEW_CELL + 40;
    const s = Math.min(maxW / totalW, 1);
    scaleRef.current = s;
    displayWidthRef.current = boardW * s;
    return s;
  }, [isMobile]);

  /* ==================== 获取当前下落间隔 ==================== */
  const getDropInterval = useCallback((): number => {
    const base = SPEED_CONFIG[speedRef.current].base;
    const lv = levelRef.current;
    // 每升一级减少10%，最低不低于80ms
    return Math.max(80, base * Math.pow(0.9, lv - 1));
  }, []);

  /* ==================== 初始化空棋盘 ==================== */
  const resetBoard = useCallback(() => {
    boardRef.current = Array.from({ length: ROWS }, () =>
      Array(COLS).fill(null)
    );
  }, []);

  /* ==================== 生成新方块 ==================== */
  const spawnPiece = useCallback(() => {
    const type = nextRef.current;
    nextRef.current = randomType();
    const piece = createPiece(type);
    currentRef.current = piece;
    // 检查是否能放置新方块，若不能则游戏结束
    if (!isValid(piece.shape, boardRef.current, piece.x, piece.y)) {
      statusRef.current = 'over';
      setGameStatus('over');
      gameOverCheckedRef.current = false;
    }
  }, []);

  /* ==================== 固定方块到棋盘 ==================== */
  const lockPiece = useCallback(() => {
    const piece = currentRef.current;
    if (!piece) return;
    const board = boardRef.current;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const ny = piece.y + r;
          const nx = piece.x + c;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            board[ny][nx] = piece.type;
          }
        }
      }
    }
  }, []);

  /* ==================== 消行检测与处理 ==================== */
  const clearLines = useCallback((): number => {
    const board = boardRef.current;
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }
    if (fullRows.length === 0) return 0;
    // 触发闪白动画
    flashRowsRef.current = fullRows;
    flashStartRef.current = performance.now();
    // 实际消除行（动画结束后由主循环处理）
    return fullRows.length;
  }, []);

  /** 实际移除已满行并添加空行到顶部 */
  const removeLines = useCallback(() => {
    const board = boardRef.current;
    const fullRows = flashRowsRef.current;
    // 从下往上移除满行
    const newBoard = board.filter((_, idx) => !fullRows.includes(idx));
    // 顶部补空行
    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(null));
    }
    boardRef.current = newBoard;
    flashRowsRef.current = [];
  }, []);

  /* ==================== 方块下移 ==================== */
  const moveDown = useCallback(() => {
    const piece = currentRef.current;
    if (!piece || statusRef.current !== 'playing') return;
    const board = boardRef.current;
    if (isValid(piece.shape, board, piece.x, piece.y + 1)) {
      piece.y += 1;
    } else {
      // 方块触底，固定并处理消行
      lockPiece();
      const cleared = clearLines();
      if (cleared > 0) {
        const pts = LINE_SCORES[cleared] || cleared * 100;
        scoreRef.current += pts;
        linesRef.current += cleared;
        // 每10行升一级
        const newLv = Math.floor(linesRef.current / 10) + 1;
        levelRef.current = newLv;
        setScore(scoreRef.current);
        setLevel(newLv);
      }
      // 如果没有消行动画，直接生成新方块
      if (cleared === 0) {
        spawnPiece();
      }
      // 消行动画中会在主循环的渲染阶段处理
    }
  }, [lockPiece, clearLines, spawnPiece]);

  /* ==================== 左移 ==================== */
  const moveLeft = useCallback(() => {
    const piece = currentRef.current;
    if (!piece || statusRef.current !== 'playing') return;
    if (isValid(piece.shape, boardRef.current, piece.x - 1, piece.y)) {
      piece.x -= 1;
    }
  }, []);

  /* ==================== 右移 ==================== */
  const moveRight = useCallback(() => {
    const piece = currentRef.current;
    if (!piece || statusRef.current !== 'playing') return;
    if (isValid(piece.shape, boardRef.current, piece.x + 1, piece.y)) {
      piece.x += 1;
    }
  }, []);

  /* ==================== 旋转 ==================== */
  const rotate = useCallback(() => {
    const piece = currentRef.current;
    if (!piece || statusRef.current !== 'playing') return;
    if (piece.type === 'O') return; // O方块不需要旋转
    const rotated = rotateShape(piece.shape);
    // 尝试基本旋转
    if (isValid(rotated, boardRef.current, piece.x, piece.y)) {
      piece.shape = rotated;
      return;
    }
    // 墙踢：尝试左右偏移
    const kicks = [1, -1, 2, -2];
    for (const kick of kicks) {
      if (isValid(rotated, boardRef.current, piece.x + kick, piece.y)) {
        piece.shape = rotated;
        piece.x += kick;
        return;
      }
    }
  }, []);

  /* ==================== 硬降 ==================== */
  const hardDrop = useCallback(() => {
    const piece = currentRef.current;
    if (!piece || statusRef.current !== 'playing') return;
    const board = boardRef.current;
    const originalY = piece.y;
    let dropY = piece.y;
    while (isValid(piece.shape, board, piece.x, dropY + 1)) {
      dropY += 1;
    }
    piece.y = dropY;
    // 加上硬降距离的额外分数
    scoreRef.current += (dropY - originalY) * 2;
    setScore(scoreRef.current);
    // 直接触底固定
    lockPiece();
    const cleared = clearLines();
    if (cleared > 0) {
      const pts = LINE_SCORES[cleared] || cleared * 100;
      scoreRef.current += pts;
      linesRef.current += cleared;
      const newLv = Math.floor(linesRef.current / 10) + 1;
      levelRef.current = newLv;
      setScore(scoreRef.current);
      setLevel(newLv);
    }
    if (cleared === 0) {
      spawnPiece();
    }
  }, [lockPiece, clearLines, spawnPiece]);

  /* ==================== 计算Ghost位置 ==================== */
  const getGhostY = useCallback((): number => {
    const piece = currentRef.current;
    if (!piece) return 0;
    const board = boardRef.current;
    let ghostY = piece.y;
    while (isValid(piece.shape, board, piece.x, ghostY + 1)) {
      ghostY += 1;
    }
    return ghostY;
  }, []);

  /* ==================== Canvas rendering ==================== */
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, now: number) => {
      const s = scaleRef.current;
      const cw = COLS * CELL;
      const ch = ROWS * CELL;
      const board = boardRef.current;
      const piece = currentRef.current;

      // 清空画布
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.scale(s, s);

      // 深色背景
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, cw, ch);

      // 网格线
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(cw, r * CELL);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, ch);
        ctx.stroke();
      }

      // 绘制已固定的方块
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] !== null) {
            drawCell(ctx, c, r, board[r][c]!, 1);
          }
        }
      }

      // 消行闪白动画
      if (flashRowsRef.current.length > 0) {
        const elapsed = now - flashStartRef.current;
        const flashDuration = 300; // 300ms闪白
        if (elapsed < flashDuration) {
          const alpha = 0.5 + 0.5 * Math.sin((elapsed / flashDuration) * Math.PI * 4);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          for (const row of flashRowsRef.current) {
            ctx.fillRect(0, row * CELL, cw, CELL);
          }
        } else {
          // 动画结束，执行实际消行
          removeLines();
          spawnPiece();
        }
      }

      // 绘制Ghost方块
      if (piece && statusRef.current === 'playing' && flashRowsRef.current.length === 0) {
        const ghostY = getGhostY();
        if (ghostY !== piece.y) {
          for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
              if (piece.shape[r][c]) {
                const px = (piece.x + c) * CELL;
                const py = (ghostY + r) * CELL;
                ctx.strokeStyle = COLORS[piece.type];
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
                ctx.globalAlpha = 0.08;
                ctx.fillStyle = COLORS[piece.type];
                ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
                ctx.globalAlpha = 1;
              }
            }
          }
        }
      }

      // 绘制当前方块
      if (piece && statusRef.current === 'playing') {
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
              drawCell(ctx, piece.x + c, piece.y + r, piece.type, 1);
            }
          }
        }
      }

      ctx.restore();

      /* --- 绘制下一个方块预览（在主Canvas右侧） --- */
      const previewX = cw + 16;
      const previewY = 8;
      const nType = nextRef.current;
      const nShape = SHAPES[nType];
      const pw = 4 * PREVIEW_CELL;
      const ph = 4 * PREVIEW_CELL;

      // 预览区背景
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(previewX - 8, previewY - 4, pw + 16, ph + 24, 8);
      ctx.fill();

      // "NEXT" 标签
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `${11 * s}px sans-serif`;
      ctx.fillText('\u4e0b\u4e00\u4e2a', previewX, previewY + 10);

      // 计算居中偏移
      const ox = previewX + (pw - nShape[0].length * PREVIEW_CELL) / 2;
      const oy = previewY + 20 + (ph - nShape.length * PREVIEW_CELL) / 2;
      for (let r = 0; r < nShape.length; r++) {
        for (let c = 0; c < nShape[r].length; c++) {
          if (nShape[r][c]) {
            const px = ox + c * PREVIEW_CELL;
            const py = oy + r * PREVIEW_CELL;
            ctx.fillStyle = COLORS[nType];
            ctx.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
            ctx.strokeStyle = STROKE_COLORS[nType];
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
            // 高光效果
            ctx.fillStyle = HIGHLIGHT_COLORS[nType];
            ctx.globalAlpha = 0.4;
            ctx.fillRect(px + 2, py + 2, PREVIEW_CELL - 6, 4);
            ctx.globalAlpha = 1;
          }
        }
      }

      /* --- Paused overlay --- */
      if (pausedRef.current && statusRef.current === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${28 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', ctx.canvas.width / 2, ctx.canvas.height / 2 - 10 * s);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `${14 * s}px sans-serif`;
        ctx.fillText('按 Esc 继续', ctx.canvas.width / 2, ctx.canvas.height / 2 + 16 * s);
        ctx.textAlign = 'start';
      }
      /* --- Game over overlay --- */
      if (statusRef.current === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#ff4757';
        ctx.font = `bold ${28 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('\u6e38\u620f\u7ed3\u675f', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20 * s);
        ctx.fillStyle = '#ffffff';
        ctx.font = `${16 * s}px sans-serif`;
        ctx.fillText(`得分: ${scoreRef.current}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 16 * s);
        if (isNewRecord) {
          ctx.fillStyle = '#ffd700';
          ctx.font = `bold ${14 * s}px sans-serif`;
          ctx.fillText('🎉 新纪录！', ctx.canvas.width / 2, ctx.canvas.height / 2 + 44 * s);
        }
        ctx.textAlign = 'start';
      }
    },
    [getGhostY, removeLines, spawnPiece, isNewRecord]
  );

  /** 绘制单个方块单元格（带高光和描边效果） */
  function drawCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: string,
    alpha: number
  ) {
    const px = x * CELL;
    const py = y * CELL;
    ctx.globalAlpha = alpha;
    // 主体填充
    ctx.fillStyle = COLORS[type];
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    // 描边
    ctx.strokeStyle = STROKE_COLORS[type];
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    // 顶部高光条
    ctx.fillStyle = HIGHLIGHT_COLORS[type];
    ctx.globalAlpha = alpha * 0.45;
    ctx.fillRect(px + 3, py + 3, CELL - 6, 5);
    // 左侧高光条
    ctx.fillRect(px + 3, py + 3, 3, CELL - 6);
    ctx.globalAlpha = 1;
  }

  /* ==================== Main game loop ==================== */
  const gameLoop = useCallback(
    (now: number) => {
      if (statusRef.current === 'playing' && !pausedRef.current) {
        // 处理自动下落（消行动画期间暂停下落）
        if (flashRowsRef.current.length === 0) {
          if (now - lastDropRef.current >= getDropInterval()) {
            moveDown();
            lastDropRef.current = now;
          }
        }
      }

      // Submit score on game over
      if (
        statusRef.current === 'over' &&
        !gameOverCheckedRef.current
      ) {
        gameOverCheckedRef.current = true;
        submitScore(scoreRef.current);
      }

      // 绘制
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx, now);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [draw, getDropInterval, moveDown]
  );

  /* ==================== 提交分数到API ==================== */
  const submitScore = useCallback(async (finalScore: number) => {
    try {
      const res = await fetch('/api/games/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_NAME, score: finalScore }),
      });
      const data = await res.json();
      if (data.data) {
        const newHigh = data.data.score;
        setHighScore(newHigh);
        if (newHigh === finalScore && finalScore > 0) {
          setIsNewRecord(true);
        }
      }
    } catch {
      // 静默处理
    }
  }, []);

  /* ==================== 加载最高分 ==================== */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/games/scores');
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          const entry = data.data.find(
            (e: { game: string; score: number }) => e.game === GAME_NAME
          );
          if (entry) setHighScore(entry.score);
        }
      } catch {
        // 静默处理
      } finally {
        setLoadingHighScore(false);
      }
    }
    load();
  }, []);

  /* ==================== Canvas尺寸设置（高DPI） ==================== */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = computeScale();
    const dpr = window.devicePixelRatio || 1;
    // 主区域宽度 + 预览区宽度
    const logicW = COLS * CELL + 4 * PREVIEW_CELL + 40;
    const logicH = ROWS * CELL;
    canvas.width = logicW * s * dpr;
    canvas.height = logicH * s * dpr;
    canvas.style.width = `${logicW * s}px`;
    canvas.style.height = `${logicH * s}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [computeScale, isMobile, gameStatus]);

  /* ==================== 游戏循环启停 ==================== */
  useEffect(() => {
    if (gameStatus === 'playing') {
      lastDropRef.current = performance.now();
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [gameStatus, gameLoop]);

  /* ==================== Keyboard events ==================== */
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        return;
      }
      if (pausedRef.current) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          lastDropRef.current = performance.now();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, moveLeft, moveRight, moveDown, rotate, hardDrop]);

  /* ==================== 开始游戏 ==================== */
  const startGame = useCallback(() => {
    resetBoard();
    scoreRef.current = 0;
    levelRef.current = 1;
    linesRef.current = 0;
    speedRef.current = speed;
    flashRowsRef.current = [];
    gameOverCheckedRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setIsNewRecord(false);
    setScore(0);
    setLevel(1);
    nextRef.current = randomType();
    spawnPiece();
    statusRef.current = 'playing';
    setGameStatus('playing');
  }, [speed, resetBoard, spawnPiece]);

  /* ==================== 重新开始 ==================== */
  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  /* ==================== 设置面板 ==================== */
  if (gameStatus === 'idle') {
    return (
      <div className="flex flex-col items-center w-full min-h-[70vh] gap-4 py-2">
        <div className="w-full max-w-md">
          <Button variant="ghost" onClick={onBack} className="mb-2">
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回
          </Button>
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                  <span className="text-2xl">🟦</span> 俄罗斯方块
                </h2>
                {!loadingHighScore && highScore > 0 && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    最高分: {highScore}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">速度设置</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(SPEED_CONFIG) as [SpeedKey, { label: string; base: number }][]).map(
                    ([key, cfg]) => (
                      <Button
                        key={key}
                        variant={speed === key ? 'default' : 'outline'}
                        size="sm"
                        className="w-full"
                        onClick={() => setSpeed(key)}
                      >
                        {cfg.label}
                      </Button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">操作说明</p>
                  <GameControlsHelp info={tetrisControlsInfo} variant="text" />
                </div>
              </div>

              <Button onClick={startGame} className="w-full" size="lg">
                开始游戏
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ==================== 游戏进行中/结束界面 ==================== */
  return (
    <div className="flex flex-col items-center w-full min-h-[70vh] gap-3">
      {/* Top status bar */}
      <div className="w-full max-w-md flex items-center justify-between px-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold flex items-center gap-1.5">
            <span>🟦</span> 俄罗斯方块
          </h2>
          <GameControlsHelp info={tetrisControlsInfo} variant="button" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {score}
          </span>
          <span className="text-muted-foreground">\u7b49\u7ea7{level}</span>
        </div>
      </div>

      {/* Canvas game area */}
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-border/50"
        style={{
          width: '100%',
          touchAction: 'none',
        }}
      />

      {/* Mobile virtual buttons */}
      {isMobile && (
        <div className="w-full max-w-md px-2">
          <div className="flex items-center justify-center gap-2 mt-1">
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 min-w-14 text-xl font-bold"
              onTouchStart={(e) => {
                e.preventDefault();
                if (!pausedRef.current) moveLeft();
              }}
              disabled={gameStatus === 'over' || paused}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 min-w-14 text-xl font-bold"
              onTouchStart={(e) => {
                e.preventDefault();
                if (!pausedRef.current) {
                  moveDown();
                  lastDropRef.current = performance.now();
                }
              }}
              disabled={gameStatus === 'over' || paused}
            >
              ↓
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 min-w-14 text-xl font-bold"
              onTouchStart={(e) => {
                e.preventDefault();
                if (!pausedRef.current) moveRight();
              }}
              disabled={gameStatus === 'over' || paused}
            >
              →
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 min-w-14 text-base font-bold"
              onTouchStart={(e) => {
                e.preventDefault();
                if (!pausedRef.current) rotate();
              }}
              disabled={gameStatus === 'over' || paused}
            >
              旋转
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 min-w-14 text-base font-bold"
              onTouchStart={(e) => {
                e.preventDefault();
                if (!pausedRef.current) hardDrop();
              }}
              disabled={gameStatus === 'over' || paused}
            >
              硬降
            </Button>
          </div>
        </div>
      )}

      {/* Restart button on game over */}
      {gameStatus === 'over' && (
        <div className="flex gap-3 mt-2">
          <Button
            variant="outline"
            onClick={restartGame}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            再来一局
          </Button>
        </div>
      )}
    </div>
  );
}
