'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RotateCcw, Circle } from 'lucide-react';
import GameControlsHelp from '@/components/games/GameControlsHelp';
import type { GameControlsInfo } from '@/components/games/GameControlsHelp';

const gomokuControlsInfo: GameControlsInfo = {
  gameName: '五子棋',
  desktop: [
    { action: '鼠标点击', keys: [], description: '点击棋盘交叉点放置棋子' },
  ],
  mobile: [
    { action: '触摸', keys: [], description: '点击棋盘交叉点放置棋子' },
  ],
  rules: ['黑白双方轮流落子', '先在横/竖/斜方向连成五子者获胜', '棋盘下满无人获胜则为平局'],
  tips: ['注意攻守平衡，不要只顾进攻', '占据中心位置有更多发展空间'],
};

interface GomokuGameProps {
  onBack: () => void;
}

/** 棋盘尺寸（15x15） */
const BOARD_SIZE = 15;
/** Canvas 最大像素尺寸 */
const MAX_CANVAS_SIZE = 480;
/** 棋盘边距（留出坐标标注空间） */
const PADDING = 20;
/** 星位坐标（天元和四个星位） */
const STAR_POINTS = [
  { row: 3, col: 3 },
  { row: 3, col: 11 },
  { row: 11, col: 3 },
  { row: 11, col: 11 },
  { row: 7, col: 7 },
];

/** 棋子类型 */
type Piece = 'black' | 'white';
/** 棋盘格子值 */
type Cell = Piece | null;
/** 游戏状态 */
type GameStatus = 'playing' | 'win' | 'draw';
/** 胜利连线坐标 */
interface WinLine {
  row: number;
  col: number;
}

/** 创建空棋盘 */
function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<Cell>(BOARD_SIZE).fill(null)
  );
}

export default function GomokuGame({ onBack }: GomokuGameProps) {
  /** Canvas 引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 容器引用（用于响应式计算） */
  const containerRef = useRef<HTMLDivElement>(null);
  /** 棋盘数据（初始化空棋盘） */
  const boardRef = useRef<Cell[][]>(createEmptyBoard());
  /** 当前轮次 */
  const currentPlayerRef = useRef<Piece>('black');
  /** 游戏状态 */
  const gameStatusRef = useRef<GameStatus>('playing');
  /** 胜利连线坐标 */
  const winLineRef = useRef<WinLine[]>([]);
  /** 落子总数 */
  const moveCountRef = useRef<number>(0);
  /** Canvas 逻辑尺寸 */
  const dprRef = useRef(1);
  const scaleRef = useRef(1);
  /** 悬停坐标 */
  const hoverPosRef = useRef<{ row: number; col: number } | null>(null);

  /** 当前轮次（UI渲染） */
  const [currentPlayer, setCurrentPlayer] = useState<Piece>('black');
  /** 游戏状态（UI渲染） */
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  /** 胜利者 */
  const [winner, setWinner] = useState<Piece | null>(null);
  /** 落子步数（UI渲染） */
  const [moveCount, setMoveCount] = useState<number>(0);

  /** 计算网格间距 */
  const getCellSize = useCallback(() => {
    return (MAX_CANVAS_SIZE - PADDING * 2) / (BOARD_SIZE - 1);
  }, []);

  /** 将像素坐标转换为棋盘行列 */
  const pixelToBoard = useCallback(
    (x: number, y: number): { row: number; col: number } | null => {
      const cellSize = getCellSize();
      const col = Math.round((x - PADDING) / cellSize);
      const row = Math.round((y - PADDING) / cellSize);

      // 超出棋盘范围
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return null;
      }

      // 判断点击是否足够接近交叉点（容差为格子大小的40%）
      const targetX = PADDING + col * cellSize;
      const targetY = PADDING + row * cellSize;
      const distance = Math.sqrt(
        (x - targetX) ** 2 + (y - targetY) ** 2
      );
      if (distance > cellSize * 0.45) {
        return null;
      }

      return { row, col };
    },
    [getCellSize]
  );

  /** 检测是否五子连珠，返回连线坐标或 null */
  const checkWin = useCallback(
    (row: number, col: number, piece: Piece): WinLine[] | null => {
      // 四个方向：横、竖、左上到右下、右上到左下
      const directions = [
        { dr: 0, dc: 1 },  // 横向
        { dr: 1, dc: 0 },  // 纵向
        { dr: 1, dc: 1 },  // 主对角线
        { dr: 1, dc: -1 }, // 副对角线
      ];

      for (const { dr, dc } of directions) {
        const line: WinLine[] = [{ row, col }];

        // 正方向延伸
        for (let i = 1; i < 5; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
          if (boardRef.current[r][c] !== piece) break;
          line.push({ row: r, col: c });
        }

        // 反方向延伸
        for (let i = 1; i < 5; i++) {
          const r = row - dr * i;
          const c = col - dc * i;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
          if (boardRef.current[r][c] !== piece) break;
          line.push({ row: r, col: c });
        }

        // 连续五子及以上即获胜
        if (line.length >= 5) {
          return line.slice(0, 5);
        }
      }

      return null;
    },
    []
  );

  /** 绘制棋盘和棋子 */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dprRef.current * scaleRef.current, 0, 0, dprRef.current * scaleRef.current, 0, 0);
    const size = MAX_CANVAS_SIZE;
    const cellSize = getCellSize();

    // ---- 绘制木色棋盘背景 ----
    // 基础木色
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, 0, size, size);

    // 木纹效果（半透明横线模拟）
    ctx.strokeStyle = 'rgba(160, 120, 60, 0.12)';
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y * 0.05) * 2);
      ctx.lineTo(size, y + Math.cos(y * 0.03) * 2);
      ctx.stroke();
    }

    // 棋盘边框
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.strokeRect(PADDING - cellSize * 0.02, PADDING - cellSize * 0.02,
      (BOARD_SIZE - 1) * cellSize + cellSize * 0.04,
      (BOARD_SIZE - 1) * cellSize + cellSize * 0.04);

    // ---- 绘制网格线 ----
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = PADDING + i * cellSize;

      // 横线
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * cellSize, pos);
      ctx.stroke();

      // 竖线
      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + (BOARD_SIZE - 1) * cellSize);
      ctx.stroke();
    }

    // ---- 绘制星位（天元和四个星位点） ----
    const starRadius = Math.max(cellSize * 0.1, 2);
    ctx.fillStyle = '#5C4033';
    for (const sp of STAR_POINTS) {
      const sx = PADDING + sp.col * cellSize;
      const sy = PADDING + sp.row * cellSize;
      ctx.beginPath();
      ctx.arc(sx, sy, starRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- 绘制所有棋子 ----
    const board = boardRef.current;
    const winLine = winLineRef.current;
    const winSet = new Set(winLine.map((p) => `${p.row},${p.col}`));
    const pieceRadius = Math.max(cellSize * 0.42, 2);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (!piece) continue;

        const cx = PADDING + col * cellSize;
        const cy = PADDING + row * cellSize;
        const isWinPiece = winSet.has(`${row},${col}`);

        // 棋子阴影
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        if (piece === 'black') {
          // ---- 黑棋：径向渐变模拟光泽 ----
          const gradient = ctx.createRadialGradient(
            cx - pieceRadius * 0.3, cy - pieceRadius * 0.3, pieceRadius * 0.1,
            cx, cy, pieceRadius
          );
          gradient.addColorStop(0, '#636363');
          gradient.addColorStop(0.5, '#2a2a2a');
          gradient.addColorStop(1, '#0a0a0a');
          ctx.fillStyle = gradient;
        } else {
          // ---- 白棋：径向渐变模拟光泽 ----
          const gradient = ctx.createRadialGradient(
            cx - pieceRadius * 0.3, cy - pieceRadius * 0.3, pieceRadius * 0.1,
            cx, cy, pieceRadius
          );
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.6, '#f0f0f0');
          gradient.addColorStop(1, '#c8c8c8');
          ctx.fillStyle = gradient;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 白棋边框（增强对比）
        if (piece === 'white') {
          ctx.strokeStyle = '#a0a0a0';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ---- 胜利高亮标记 ----
        if (isWinPiece && gameStatusRef.current === 'win') {
          ctx.save();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pieceRadius + 3, 0, Math.PI * 2);
          ctx.stroke();

          // 内部小红点标记
          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(pieceRadius * 0.2, 1.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // ---- 绘制悬停预览（半透明棋子） ----
    const hoverPos = hoverPosRef.current;
    if (hoverPos && gameStatusRef.current === 'playing') {
      const { row, col } = hoverPos;
      if (!board[row][col]) {
        const cx = PADDING + col * cellSize;
        const cy = PADDING + row * cellSize;
        const currentPiece = currentPlayerRef.current;

        ctx.save();
        ctx.globalAlpha = 0.35;

        if (currentPiece === 'black') {
          ctx.fillStyle = '#1a1a1a';
        } else {
          ctx.fillStyle = '#e8e8e8';
        }

        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ---- 游戏结束遮罩提示 ----
    if (gameStatusRef.current === 'win' || gameStatusRef.current === 'draw') {
      // 半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, size, size);

      // 提示文字
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (gameStatusRef.current === 'win') {
        // 胜利文字
        ctx.font = `bold ${Math.round(cellSize * 1.4)}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        const winnerText = winner === 'black' ? '● 黑棋' : '○ 白棋';
        ctx.fillText(`${winnerText} 获胜！`, size / 2, size / 2);
      } else {
        // 平局文字
        ctx.font = `bold ${Math.round(cellSize * 1.4)}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('平局！棋盘已满', size / 2, size / 2);
      }
      ctx.restore();
    }
  }, [getCellSize, winner]);

  /** 处理落子 */
  const handlePlacePiece = useCallback(
    (row: number, col: number) => {
      // 游戏已结束则忽略
      if (gameStatusRef.current !== 'playing') return;

      // 该位置已有棋子则忽略
      if (boardRef.current[row][col]) return;

      // 放置棋子
      boardRef.current[row][col] = currentPlayerRef.current;
      moveCountRef.current += 1;
      setMoveCount(moveCountRef.current);

      // 检测胜负
      const result = checkWin(row, col, currentPlayerRef.current);
      if (result) {
        // 有人获胜
        gameStatusRef.current = 'win';
        winLineRef.current = result;
        setGameStatus('win');
        setWinner(currentPlayerRef.current);
      } else if (moveCountRef.current >= BOARD_SIZE * BOARD_SIZE) {
 // 棋盘已满，平局
        gameStatusRef.current = 'draw';
        setGameStatus('draw');
      } else {
        // 切换玩家
        currentPlayerRef.current = currentPlayerRef.current === 'black' ? 'white' : 'black';
        setCurrentPlayer(currentPlayerRef.current);
      }

      draw();
    },
    [checkWin, draw]
  );

  /** 处理 Canvas 点击事件 */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * MAX_CANVAS_SIZE;
      const y = (e.clientY - rect.top) / rect.height * MAX_CANVAS_SIZE;

      const pos = pixelToBoard(x, y);
      if (pos) {
        handlePlacePiece(pos.row, pos.col);
      }
    },
    [pixelToBoard, handlePlacePiece]
  );

  /** 处理 Canvas 触摸事件 */
  const handleCanvasTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / rect.width * MAX_CANVAS_SIZE;
      const y = (touch.clientY - rect.top) / rect.height * MAX_CANVAS_SIZE;

      const pos = pixelToBoard(x, y);
      if (pos) {
        handlePlacePiece(pos.row, pos.col);
      }
    },
    [pixelToBoard, handlePlacePiece]
  );

  /** 处理鼠标移动（悬停预览） */
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * MAX_CANVAS_SIZE;
      const y = (e.clientY - rect.top) / rect.height * MAX_CANVAS_SIZE;

      const pos = pixelToBoard(x, y);
      const prevHover = hoverPosRef.current;

      // 只在悬停位置变化时重绘
      if (!pos && !prevHover) return;
      if (pos && prevHover && pos.row === prevHover.row && pos.col === prevHover.col) return;

      hoverPosRef.current = pos;
      draw();
    },
    [pixelToBoard, draw]
  );

  /** 鼠标离开时清除悬停预览 */
  const handleCanvasMouseLeave = useCallback(() => {
    if (hoverPosRef.current) {
      hoverPosRef.current = null;
      draw();
    }
  }, [draw]);

  /** 初始化/重置游戏 */
  const resetGame = useCallback(() => {
    // 重置棋盘
    boardRef.current = createEmptyBoard();
    // 黑先
    currentPlayerRef.current = 'black';
    setCurrentPlayer('black');
    // 游戏进行中
    gameStatusRef.current = 'playing';
    setGameStatus('playing');
    // 清空胜利连线
    winLineRef.current = [];
    setWinner(null);
    // 重置步数
    moveCountRef.current = 0;
    setMoveCount(0);
    // 清除悬停
    hoverPosRef.current = null;

    draw();
  }, [draw]);

  /** 响应式 Canvas 尺寸调整 */
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const update = () => {
      const dw = canvas.clientWidth;
      if (dw <= 0) return;
      const displaySize = Math.min(dw, MAX_CANVAS_SIZE);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = displaySize / MAX_CANVAS_SIZE;

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

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto py-2 gap-2">
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
        <h2 className="text-lg font-bold tracking-wide">⚫ 五子棋</h2>
        <GameControlsHelp info={gomokuControlsInfo} variant="button" />
      </div>

      <Card className="w-full border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">当前轮次</span>
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-5 h-5 rounded-full border border-border shadow-sm"
                style={{
                  background:
                    currentPlayer === 'black'
                      ? 'radial-gradient(circle at 35% 35%, #636363, #0a0a0a)'
                      : 'radial-gradient(circle at 35% 35%, #ffffff, #c8c8c8)',
                }}
              />
              <span className="text-base font-semibold">
                {currentPlayer === 'black' ? '黑棋' : '白棋'}
              </span>
            </div>
          </div>

          <div className="h-10 w-px bg-border" />

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Circle className="h-3 w-3" />
              已落子
            </span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {moveCount}
            </span>
          </div>
        </CardContent>
      </Card>

      {gameStatus === 'win' && (
        <div className="w-full">
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <span className="text-yellow-600 dark:text-yellow-400 font-bold text-base">
              🎉 {winner === 'black' ? '● 黑棋' : '○ 白棋'} 获胜！
            </span>
          </div>
        </div>
      )}

      {gameStatus === 'draw' && (
        <div className="w-full">
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-muted border border-border">
            <span className="text-muted-foreground font-bold text-base">
              🤝 平局！棋盘已满
            </span>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full flex justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-border/30 shadow-lg cursor-pointer"
          style={{ width: '100%', maxWidth: MAX_CANVAS_SIZE, aspectRatio: '1/1', touchAction: 'none' }}
          onClick={handleCanvasClick}
          onTouchEnd={handleCanvasTouch}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
        />
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <Button
          onClick={resetGame}
          size="lg"
          className="w-full max-w-xs text-base font-semibold"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          新游戏
        </Button>
      </div>
    </div>
  );
}
