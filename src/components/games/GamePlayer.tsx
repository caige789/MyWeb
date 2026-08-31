/*
 * Game container with zoom-based fullscreen and pause/save dialog
 */
'use client';

import { useSiteStore } from '@/store/use-site-store';
import { useCallback, useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, ArrowLeft, Loader2, Trophy, Pause } from 'lucide-react';
import GameLeaderboard from './GameLeaderboard';

const SnakeGame = dynamic(() => import('./SnakeGame'), { ssr: false, loading: GameLoader });
const Game2048 = dynamic(() => import('./Game2048'), { ssr: false, loading: GameLoader });
const GomokuGame = dynamic(() => import('./GomokuGame'), { ssr: false, loading: GameLoader });
const AircraftGame = dynamic(() => import('./AircraftGame'), { ssr: false, loading: GameLoader });
const BreakoutGame = dynamic(() => import('./BreakoutGame'), { ssr: false, loading: GameLoader });
const AdventureGame = dynamic(() => import('./AdventureGame'), { ssr: false, loading: GameLoader });
const TetrisGame = dynamic(() => import('./TetrisGame'), { ssr: false, loading: GameLoader });
const Match3Game = dynamic(() => import('./Match3Game'), { ssr: false, loading: GameLoader });
const MazeGame = dynamic(() => import('./MazeGame'), { ssr: false, loading: GameLoader });
const PvzGame = dynamic(() => import('./PvzGame'), { ssr: false, loading: GameLoader });
const FlappyBirdGame = dynamic(() => import('./FlappyBirdGame'), { ssr: false, loading: GameLoader });
const MinesweeperGame = dynamic(() => import('./MinesweeperGame'), { ssr: false, loading: GameLoader });
const MemoryGame = dynamic(() => import('./MemoryGame'), { ssr: false, loading: GameLoader });
const ParkourGame = dynamic(() => import('./ParkourGame'), { ssr: false, loading: GameLoader });
const TowerDefenseGame = dynamic(() => import('./TowerDefenseGame'), { ssr: false, loading: GameLoader });
const RacingGame = dynamic(() => import('./RacingGame'), { ssr: false, loading: GameLoader });
const ChineseChessGame = dynamic(() => import('./ChineseChessGame'), { ssr: false, loading: GameLoader });

const doBack = () => {
  const { setCurrentGame, previousPage, setCurrentPage } = useSiteStore.getState();
  const backTo = previousPage === 'game-play' ? 'games' : previousPage;
  setCurrentGame(null);
  setCurrentPage(backTo);
};

function GameLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  );
}

export default function GamePlayer() {
  const { currentGame } = useSiteStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const naturalSize = useRef({ w: 0, h: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v);
  }, []);

  const handleBackClick = useCallback(() => {
    setShowPauseMenu(true);
    window.dispatchEvent(new CustomEvent('game-pause'));
  }, []);

  const resumeGame = useCallback(() => {
    setShowPauseMenu(false);
    window.dispatchEvent(new CustomEvent('game-resume'));
  }, []);

  const confirmBack = useCallback(() => {
    setShowPauseMenu(false);
    window.dispatchEvent(new CustomEvent('game-resume'));
    doBack();
  }, []);

  const saveAndBack = useCallback(() => {
    try { window.dispatchEvent(new CustomEvent('game-save-request')); } catch { /* */ }
    setShowPauseMenu(false);
    window.dispatchEvent(new CustomEvent('game-resume'));
    setTimeout(doBack, 80);
  }, []);

  useEffect(() => {
    if (!isFullscreen || !contentRef.current) {
      if (contentRef.current) contentRef.current.style.zoom = '1';
      naturalSize.current = { w: 0, h: 0 };
      return;
    }

    const el = contentRef.current;
    let ro: ResizeObserver | null = null;
    function onResize() {
      if (naturalSize.current.w > 0) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const z = Math.min(vw / naturalSize.current.w, vh / naturalSize.current.h, 3);
        if (el) el.style.zoom = String(z);
      }
    }
    const raf = requestAnimationFrame(() => {
      el.style.zoom = '1';
      void el.offsetWidth;
      const cw = el.scrollWidth;
      const ch = el.scrollHeight;
      if (cw > 0 && ch > 0) {
        naturalSize.current = { w: cw, h: ch };
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const z = Math.min(vw / cw, vh / ch, 3);
        el.style.zoom = String(z);
      }
      ro = new ResizeObserver(onResize);
      ro.observe(el);
      window.addEventListener('resize', onResize);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
      if (el) el.style.zoom = '1';
      naturalSize.current = { w: 0, h: 0 };
    };
  }, [isFullscreen]);

  if (!currentGame) return null;

  const props = { onBack: handleBackClick };

  let game: React.ReactNode;
  switch (currentGame) {
    case 'snake': game = <SnakeGame {...props} />; break;
    case '2048': game = <Game2048 {...props} />; break;
    case 'gomoku': game = <GomokuGame {...props} />; break;
    case 'aircraft': game = <AircraftGame {...props} />; break;
    case 'breakout': game = <BreakoutGame {...props} />; break;
    case 'adventure': game = <AdventureGame {...props} />; break;
    case 'tetris': game = <TetrisGame {...props} />; break;
    case 'match3': game = <Match3Game {...props} />; break;
    case 'maze': game = <MazeGame {...props} />; break;
    case 'pvz': game = <PvzGame {...props} />; break;
    case 'flappy': game = <FlappyBirdGame {...props} />; break;
    case 'minesweeper': game = <MinesweeperGame {...props} />; break;
    case 'memory': game = <MemoryGame {...props} />; break;
    case 'parkour': game = <ParkourGame {...props} />; break;
    case 'tower-defense': game = <TowerDefenseGame {...props} />; break;
    case 'racing': game = <RacingGame {...props} />; break;
    case 'chess': game = <ChineseChessGame {...props} />; break;
    default: return null;
  }

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden'
          : 'relative w-full'
      }
      style={isFullscreen ? { touchAction: 'none' } : undefined}
    >
      {isFullscreen && (
        <div className="absolute top-2 left-2 z-[60]">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBackClick}
            className="min-h-[44px] min-w-[44px] rounded-full bg-background/80 backdrop-blur border-border/50 shadow-lg active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className={isFullscreen ? 'absolute top-2 right-2 z-[60] flex items-center gap-2' : 'fixed top-2 right-2 z-50 flex items-center gap-2'}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowLeaderboard(true)}
          className="min-h-[44px] min-w-[44px] rounded-full bg-background/80 backdrop-blur border-border/50 shadow-lg active:scale-95 transition-transform"
        >
          <Trophy className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          className={`min-h-[44px] min-w-[44px] rounded-full bg-background/80 backdrop-blur border-border/50 shadow-lg active:scale-95 transition-transform ${isFullscreen ? 'bg-red-500/80 border-red-500/50 text-white' : ''}`}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>

      <div ref={contentRef} className="origin-center">
        {game}
      </div>

      {showPauseMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={resumeGame}>
          <div className="bg-card border rounded-2xl p-6 mx-4 flex flex-col items-center gap-4 w-full max-w-xs animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Pause className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold">暂停游戏</h3>
            <p className="text-sm text-muted-foreground text-center">确定要返回游戏大厅吗？</p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Button onClick={resumeGame} className="w-full min-h-[48px] text-base font-semibold">
                ▶ 继续游戏
              </Button>
              <Button onClick={saveAndBack} variant="outline" className="w-full min-h-[48px] text-base">
                💾 保存并返回
              </Button>
              <Button onClick={confirmBack} variant="ghost" className="w-full min-h-[44px] text-muted-foreground">
                直接返回
              </Button>
            </div>
          </div>
        </div>
      )}

      <GameLeaderboard game={currentGame} open={showLeaderboard} onOpenChange={setShowLeaderboard} />
    </div>
  );
}
