'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';

const GAME_NAME = 'chess';
const LOGIC_SIZE = 500;
const COLS = 9;
const ROWS = 10;

const CELL = LOGIC_SIZE / (COLS - 1);

interface Piece {
  type: 'k' | 'a' | 'e' | 'h' | 'r' | 'c' | 'p';
  side: 'red' | 'black';
  row: number;
  col: number;
  char: string;
}

type Board = (Piece | null)[][];

function createInitialBoard(): Piece[] {
  const pieces: Piece[] = [];
  const redChars: Record<string, string> = { k: '帅', a: '仕', e: '相', h: '馬', r: '車', c: '砲', p: '兵' };
  const blackChars: Record<string, string> = { k: '将', a: '士', e: '象', h: '马', r: '车', c: '炮', p: '卒' };

  const layout = [
    ['r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r'],
  ];
  const blackBackRow = layout[0];
  for (let c = 0; c < 9; c++) {
    pieces.push({ type: blackBackRow[c] as Piece['type'], side: 'black', row: 0, col: c, char: blackChars[blackBackRow[c]] });
  }
  pieces.push({ type: 'c', side: 'black', row: 2, col: 1, char: '炮' });
  pieces.push({ type: 'c', side: 'black', row: 2, col: 7, char: '炮' });
  for (let c = 0; c < 9; c += 2) {
    pieces.push({ type: 'p', side: 'black', row: 3, col: c, char: '卒' });
  }
  for (let c = 0; c < 9; c += 2) {
    pieces.push({ type: 'p', side: 'red', row: 6, col: c, char: '兵' });
  }
  pieces.push({ type: 'c', side: 'red', row: 7, col: 1, char: '砲' });
  pieces.push({ type: 'c', side: 'red', row: 7, col: 7, char: '砲' });
  const redBackRow = layout[0];
  for (let c = 0; c < 9; c++) {
    pieces.push({ type: redBackRow[c] as Piece['type'], side: 'red', row: 9, col: c, char: redChars[redBackRow[c]] });
  }
  return pieces;
}

function boardFromPieces(pieces: Piece[]): Board {
  const b: Board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (const p of pieces) b[p.row][p.col] = p;
  return b;
}

function piecesFromBoard(b: Board): Piece[] {
  const pieces: Piece[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r][c]) pieces.push(b[r][c]!);
    }
  }
  return pieces;
}

function getValidMoves(board: Board, piece: Piece): [number, number][] {
  const moves: [number, number][] = [];
  const { type, side, row, col } = piece;
  const isRed = side === 'red';

  function inBoard(r: number, c: number): boolean {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function canLand(r: number, c: number): boolean {
    if (!inBoard(r, c)) return false;
    const target = board[r][c];
    return !target || target.side !== side;
  }

  function addIfValid(r: number, c: number) {
    if (canLand(r, c)) moves.push([r, c]);
  }

  switch (type) {
    case 'k': {
      const palace = isRed ? [7, 9, 3, 5] : [0, 2, 3, 5];
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = row + dr, nc = col + dc;
        if (nr >= palace[0] && nr <= palace[1] && nc >= palace[2] && nc <= palace[3]) {
          addIfValid(nr, nc);
        }
      }
      break;
    }
    case 'a': {
      const palace = isRed ? [7, 9, 3, 5] : [0, 2, 3, 5];
      for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nr = row + dr, nc = col + dc;
        if (nr >= palace[0] && nr <= palace[1] && nc >= palace[2] && nc <= palace[3]) {
          addIfValid(nr, nc);
        }
      }
      break;
    }
    case 'e': {
      for (const [dr, dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
        const nr = row + dr, nc = col + dc;
        const er = row + dr / 2, ec = col + dc / 2;
        if (isRed && nr < 5) continue;
        if (!isRed && nr > 4) continue;
        if (board[er][ec]) continue;
        addIfValid(nr, nc);
      }
      break;
    }
    case 'h': {
      const jumps: [number,number,number,number][] = [
        [-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],
        [-1,-2,0,-1],[-1,2,0,1],[1,-2,0,-1],[1,2,0,1],
      ];
      for (const [dr, dc, lr, lc] of jumps) {
        if (board[row + lr][col + lc]) continue;
        addIfValid(row + dr, col + dc);
      }
      break;
    }
    case 'r': {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        for (let i = 1; i < 10; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (!inBoard(nr, nc)) break;
          if (board[nr][nc]) {
            if (board[nr][nc]!.side !== side) moves.push([nr, nc]);
            break;
          }
          moves.push([nr, nc]);
        }
      }
      break;
    }
    case 'c': {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let jumped = false;
        for (let i = 1; i < 10; i++) {
          const nr = row + dr * i, nc = col + dc * i;
          if (!inBoard(nr, nc)) break;
          if (!jumped) {
            if (board[nr][nc]) jumped = true;
            else moves.push([nr, nc]);
          } else {
            if (board[nr][nc]) {
              if (board[nr][nc]!.side !== side) moves.push([nr, nc]);
              break;
            }
          }
        }
      }
      break;
    }
    case 'p': {
      const fwd = isRed ? -1 : 1;
      const crossed = isRed ? row <= 4 : row >= 5;
      addIfValid(row + fwd, col);
      if (crossed) {
        addIfValid(row, col - 1);
        addIfValid(row, col + 1);
      }
      break;
    }
  }

  return moves;
}

function isInCheck(board: Board, side: 'red' | 'black'): boolean {
  let kingPos: [number, number] | null = null;
  let oppKingPos: [number, number] | null = null;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.type === 'k') {
        if (p.side === side) kingPos = [r, c];
        else oppKingPos = [r, c];
      }
    }
  }
  if (!kingPos) return true;

  const opp = side === 'red' ? 'black' : 'red';

  if (oppKingPos && kingPos[1] === oppKingPos[1]) {
    let blocked = false;
    const minR = Math.min(kingPos[0], oppKingPos[0]);
    const maxR = Math.max(kingPos[0], oppKingPos[0]);
    for (let r = minR + 1; r < maxR; r++) {
      if (board[r][kingPos[1]]) { blocked = true; break; }
    }
    if (!blocked) return true;
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.side === opp) {
        const moves = getValidMoves(board, p);
        if (moves.some(([mr, mc]) => mr === kingPos[0] && mc === kingPos[1])) return true;
      }
    }
  }
  return false;
}

function getLegalMoves(board: Board, piece: Piece): [number, number][] {
  const raw = getValidMoves(board, piece);
  return raw.filter(([tr, tc]) => {
    const nb = board.map(r => [...r]);
    nb[tr][tc] = nb[piece.row][piece.col];
    nb[piece.row][piece.col] = null;
    if (nb[tr][tc]) nb[tr][tc] = { ...nb[tr][tc]!, row: tr, col: tc };
    return !isInCheck(nb, piece.side);
  });
}

function hasAnyLegalMove(board: Board, side: 'red' | 'black'): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.side === side && getLegalMoves(board, p).length > 0) return true;
    }
  }
  return false;
}

const PIECE_VALUES: Record<string, number> = { k: 10000, r: 1000, c: 500, h: 450, e: 200, a: 200, p: 100 };

function evaluateBoard(board: Board, side: 'red' | 'black'): number {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      let v = PIECE_VALUES[p.type] || 0;
      if (p.type === 'p') {
        if (p.side === 'red' && p.row <= 4) v = 200;
        if (p.side === 'black' && p.row >= 5) v = 200;
      }
      if (p.type === 'h') {
        const centerDist = Math.abs(c - 4);
        v += (4 - centerDist) * 10;
      }
      if (p.type === 'r') {
        if (p.side === 'red' && p.row <= 4) v += 50;
        if (p.side === 'black' && p.row >= 5) v += 50;
      }
      score += p.side === side ? v : -v;
    }
  }
  return score;
}

function aiMove(board: Board, aiSide: 'red' | 'black'): { from: [number, number]; to: [number, number] } | null {
  const allMoves: { piece: Piece; moves: [number, number][] }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.side === aiSide) {
        const legal = getLegalMoves(board, p);
        if (legal.length > 0) allMoves.push({ piece: p, moves: legal });
      }
    }
  }

  if (allMoves.length === 0) return null;

  let bestScore = -Infinity;
  let bestFrom: [number, number] = [0, 0];
  let bestTo: [number, number] = [0, 0];

  for (const { piece, moves } of allMoves) {
    for (const [tr, tc] of moves) {
      const nb = board.map(r => [...r]);
      const captured = nb[tr][tc];
      nb[tr][tc] = { ...piece, row: tr, col: tc };
      nb[piece.row][piece.col] = null;

      let evalScore = evaluateBoard(nb, aiSide);

      if (captured) evalScore += PIECE_VALUES[captured.type] || 0;

      const opp = aiSide === 'red' ? 'black' : 'red';
      if (isInCheck(nb, opp)) evalScore += 300;

      if (evalScore > bestScore) {
        bestScore = evalScore;
        bestFrom = [piece.row, piece.col];
        bestTo = [tr, tc];
      }
    }
  }

  return { from: bestFrom, to: bestTo };
}

interface Props { onBack: () => void; }
type Phase = 'idle' | 'playing' | 'over';

export default function ChineseChessGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));

  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [message, setMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const piecesRef = useRef<Piece[]>([]);
  const turnRef = useRef<'red' | 'black'>('red');
  const modeRef = useRef<'ai' | 'pvp'>('ai');
  const phaseRef = useRef<Phase>('idle');
  const selectedRef = useRef<[number, number] | null>(null);
  const validMovesRef = useRef<[number, number][]>([]);
  const animatingRef = useRef(false);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const displayW = rect.width;
    const dpr = dprRef.current;
    const displayH = displayW * (LOGIC_SIZE / LOGIC_SIZE);
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sc = displayW / LOGIC_SIZE;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pieces = piecesRef.current;
    const board = boardFromPieces(pieces);
    const sel = selectedRef.current;
    const vm = validMovesRef.current;
    const pad = CELL * 0.5;
    const boardW = CELL * 8;
    const boardH = CELL * 9;

    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(pad * sc, pad * sc, boardW * sc, boardH * sc);

    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 1.5 * sc;

    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo((pad + 0 * CELL) * sc, (pad + r * CELL) * sc);
      ctx.lineTo((pad + 8 * CELL) * sc, (pad + r * CELL) * sc);
      ctx.stroke();
    }
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo((pad + c * CELL) * sc, (pad + 0 * CELL) * sc);
      ctx.lineTo((pad + c * CELL) * sc, (pad + 4 * CELL) * sc);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((pad + c * CELL) * sc, (pad + 5 * CELL) * sc);
      ctx.lineTo((pad + c * CELL) * sc, (pad + 9 * CELL) * sc);
      ctx.stroke();
    }

    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.moveTo(pad * sc, (pad + 4 * CELL) * sc);
    ctx.lineTo((pad + 8 * CELL) * sc, (pad + 4 * CELL) * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad * sc, (pad + 5 * CELL) * sc);
    ctx.lineTo((pad + 8 * CELL) * sc, (pad + 5 * CELL) * sc);
    ctx.stroke();

    ctx.fillStyle = '#5c3a1e';
    ctx.font = `bold ${22 * sc}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const riverY = (pad + 4.5 * CELL) * sc;
    ctx.fillText('楚 河', (pad + 2 * CELL) * sc, riverY);
    ctx.fillText('汉 界', (pad + 6 * CELL) * sc, riverY);

    const crossMarks = [
      [2,1],[2,7],[7,1],[7,7],
      [3,0],[3,2],[3,4],[3,6],[3,8],
      [6,0],[6,2],[6,4],[6,6],[6,8],
    ];
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 1 * sc;
    const ml = 6 * sc;
    for (const [mr, mc] of crossMarks) {
      const cx = (pad + mc * CELL) * sc;
      const cy = (pad + mr * CELL) * sc;
      const dirs: [number,number][] = [];
      if (mc > 0) { dirs.push([-1,-1]); dirs.push([-1,1]); }
      if (mc < 8) { dirs.push([1,-1]); dirs.push([1,1]); }
      for (const [dx, dy] of dirs) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * 4 * sc, cy + dy * 4 * sc);
        ctx.lineTo(cx + dx * (4 + ml) * sc, cy + dy * 4 * sc);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + dx * 4 * sc, cy + dy * 4 * sc);
        ctx.lineTo(cx + dx * 4 * sc, cy + dy * (4 + ml) * sc);
        ctx.stroke();
      }
    }

    for (const [mr, mc] of vm) {
      const cx = (pad + mc * CELL) * sc;
      const cy = (pad + mr * CELL) * sc;
      ctx.fillStyle = 'rgba(34,197,94,0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, 14 * sc, 0, Math.PI * 2);
      ctx.fill();
    }

    if (sel) {
      const cx = (pad + sel[1] * CELL) * sc;
      const cy = (pad + sel[0] * CELL) * sc;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3 * sc;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * sc, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const p of pieces) {
      const cx = (pad + p.col * CELL) * sc;
      const cy = (pad + p.row * CELL) * sc;
      const radius = 18 * sc;

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = p.side === 'red' ? '#dc2626' : '#1e293b';
      ctx.lineWidth = 2.5 * sc;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = p.side === 'red' ? '#dc2626' : '#1e293b';
      ctx.lineWidth = 1 * sc;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 4 * sc, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = p.side === 'red' ? '#dc2626' : '#1e293b';
      ctx.font = `bold ${18 * sc}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.char, cx, cy + 1 * sc);
    }
  }, []);

  const doMoveRef = useRef<(fr: number, fc: number, tr: number, tc: number) => void>(() => {});

  const checkGameEnd = useCallback((board: Board, side: 'red' | 'black') => {
    if (!hasAnyLegalMove(board, side)) {
      const winner = side === 'red' ? 'black' : 'red';
      phaseRef.current = 'over';
      setPhase('over');
      if (winner === 'red') {
        setMessage('将杀! 红胜');
      } else {
        setMessage('将杀! 黑胜');
      }
      return true;
    }
    if (isInCheck(board, side)) {
      setMessage('将军!');
    }
    return false;
  }, []);

  const triggerAI = useCallback(() => {
    if (modeRef.current !== 'ai' || turnRef.current !== 'black' || phaseRef.current !== 'playing') return;
    animatingRef.current = true;
    setTimeout(() => {
      const ab = boardFromPieces(piecesRef.current);
      const move = aiMove(ab, 'black');
      if (move) {
        doMoveRef.current(move.from[0], move.from[1], move.to[0], move.to[1]);
      }
      animatingRef.current = false;
    }, 400);
  }, []);

  const doMove = useCallback((fromR: number, fromC: number, toR: number, toC: number) => {
    const pieces = piecesRef.current;
    const board = boardFromPieces(pieces);
    const piece = board[fromR][fromC];
    if (!piece) return;

    const captured = board[toR][toC];

    const newPieces = pieces.map(p => {
      if (p.row === fromR && p.col === fromC) return { ...p, row: toR, col: toC };
      return p;
    }).filter(p => !(p.row === toR && p.col === toC && p.side !== piece.side));

    piecesRef.current = newPieces;

    const moveChar = piece.char;
    const capturedText = captured ? `吃${captured.char}` : '';
    setMoveHistory(prev => [...prev, `${piece.side === 'red' ? '红' : '黑'}${moveChar}(${fromR},${fromC})->(${toR},${toC}) ${capturedText}`]);

    const nextTurn = piece.side === 'red' ? 'black' : 'red';
    turnRef.current = nextTurn;
    setTurn(nextTurn);
    selectedRef.current = null;
    validMovesRef.current = [];
    setSelected(null);
    setValidMoves([]);

    const nb = boardFromPieces(newPieces);
    if (checkGameEnd(nb, nextTurn)) return;
    if (!isInCheck(nb, nextTurn)) setMessage('');

    triggerAI();
  }, [checkGameEnd, triggerAI]);

  useEffect(() => { doMoveRef.current = doMove; }, [doMove]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    if (animatingRef.current) return;
    if (modeRef.current === 'ai' && turnRef.current === 'black') return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const displayW = rect.width;
    const sc = displayW / LOGIC_SIZE;
    const pad = CELL * 0.5;
    const x = (clientX - rect.left) / sc - pad;
    const y = (clientY - rect.top) / sc - pad;

    const col = Math.round(x / CELL);
    const row = Math.round(y / CELL);

    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

    const dist = Math.sqrt(((col * CELL) - x) ** 2 + ((row * CELL) - y) ** 2);
    if (dist > CELL * 0.55) return;

    const board = boardFromPieces(piecesRef.current);
    const clickedPiece = board[row][col];
    const sel = selectedRef.current;

    if (sel) {
      const isVM = validMovesRef.current.some(([vr, vc]) => vr === row && vc === col);
      if (isVM) {
        doMove(sel[0], sel[1], row, col);
        return;
      }
      if (clickedPiece && clickedPiece.side === turnRef.current) {
        selectedRef.current = [row, col];
        setSelected([row, col]);
        const legal = getLegalMoves(board, clickedPiece);
        validMovesRef.current = legal;
        setValidMoves(legal);
        return;
      }
      selectedRef.current = null;
      setSelected(null);
      validMovesRef.current = [];
      setValidMoves([]);
      return;
    }

    if (clickedPiece && clickedPiece.side === turnRef.current) {
      selectedRef.current = [row, col];
      setSelected([row, col]);
      const legal = getLegalMoves(board, clickedPiece);
      validMovesRef.current = legal;
      setValidMoves(legal);
    }
  }, [doMove]);

  const startGame = useCallback((m: 'ai' | 'pvp') => {
 piecesRef.current = createInitialBoard();
    turnRef.current = 'red';
    setTurn('red');
    setMode(m);
    modeRef.current = m;
    setSelected(null);
    setValidMoves([]);
    setMessage('');
    setMoveHistory([]);
    selectedRef.current = null;
    validMovesRef.current = [];
    animatingRef.current = false;
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase === 'idle') return;
    drawBoard();
    const ro = new ResizeObserver(() => drawBoard());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [phase, turn, selected, validMoves, drawBoard]);

  const turnText = turn === 'red' ? '红方' : '黑方';

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto py-2 gap-2">
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <h2 className="text-lg font-bold">中国象棋</h2>
        <div className="w-16" />
      </div>

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 mt-6 w-full px-4">
          <p className="text-2xl font-bold">中国象棋</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <Button size="lg" onClick={() => startGame('ai')} className="min-h-12 text-base font-semibold">
              人机对战
            </Button>
            <Button size="lg" onClick={() => startGame('pvp')} className="min-h-12 text-base font-semibold" variant="outline">
              双人对战
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setShowHelp(!showHelp)} className="text-sm text-muted-foreground">
            走法说明
          </Button>
          {showHelp && (
            <div className="text-xs text-muted-foreground text-center space-y-1 max-w-xs">
              <p>帅/将: 宫内走一步直线</p>
              <p>仕/士: 宫内走一步斜线</p>
              <p>相/象: 走田字，不过河，塞象眼</p>
              <p>馬/马: 走日字，蹩马腿</p>
              <p>車/车: 直线走任意步</p>
              <p>砲/炮: 移动同车，吃子须隔一子</p>
              <p>兵/卒: 过河前只能前进，过河后可左右</p>
            </div>
          )}
        </div>
      )}

      {(phase === 'playing' || phase === 'over') && (
        <>
          <div className="flex items-center justify-between w-full px-2">
            <div className={`text-sm font-semibold ${turn === 'red' ? 'text-red-500' : 'text-gray-800'}`}>
              当前回合: {turnText}
            </div>
            {message && (
              <div className={`text-sm font-bold animate-pulse ${message.includes('将杀') ? 'text-yellow-500' : 'text-red-500'}`}>
                {message}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => startGame(mode)} className="text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-1" />重新开始
            </Button>
          </div>

          <div ref={containerRef} className="w-full">
            <canvas
              ref={canvasRef}
              className="w-full rounded-xl"
              style={{ aspectRatio: '1/1', touchAction: 'none' }}
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasClick}
            />
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => setMoveHistory(prev => [...prev])} className="flex-1 min-h-10 text-sm">
              走法: {moveHistory.length}步
            </Button>
          </div>

          <div className="w-full max-h-24 overflow-y-auto px-2">
            {moveHistory.slice(-6).map((m, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">{m}</p>
            ))}
          </div>

          {phase === 'over' && (
            <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-50">
              <div className="bg-card rounded-xl p-6 flex flex-col items-center gap-3 max-w-xs w-full mx-4">
                <p className="text-2xl font-bold">{message}</p>
                <Button size="lg" onClick={() => startGame(mode)} className="min-h-12 w-full font-semibold">
                  <RotateCcw className="h-4 w-4 mr-2" />重新开始
                </Button>
                <Button variant="outline" onClick={onBack} className="min-h-11 w-full">
                  返回
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
