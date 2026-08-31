/**
 * Game Hall - 15 games in 5 groups, mobile-first layout
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSiteStore } from '@/store/use-site-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trophy, Gamepad2, ChevronRight, ChevronDown, Star, Zap, Brain, Shield, Search, X } from 'lucide-react';
import KeyBindingsPanel from './KeyBindingsPanel';

const gameGroups = [
  {
    title: '经典游戏',
    icon: <Gamepad2 className="h-4 w-4" />,
    accentColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/30',
    headerBg: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5',
    items: [
      { key: 'snake', name: '贪吃蛇', desc: '方向键控制蛇的移动，吃食物变长得分，支持穿墙和道具系统', gradient: 'from-emerald-500 to-teal-600', emoji: '🐍', tags: ['经典', '休闲'], difficulty: 'easy' },
      { key: '2048', name: '2048', desc: '滑动合并相同数字，策略性思考冲击2048高分', gradient: 'from-amber-500 to-orange-600', emoji: '🔢', tags: ['益智', '数字'], difficulty: 'medium' },
      { key: 'tetris', name: '俄罗斯方块', desc: '经典方块下落消除，支持暂存和预览下一个方块', gradient: 'from-cyan-500 to-sky-600', emoji: '🟦', tags: ['经典', '反应'], difficulty: 'medium' },
    ],
  },
  {
    title: '趣味闯关',
    icon: <Zap className="h-4 w-4" />,
    accentColor: 'text-rose-500',
    borderColor: 'border-rose-500/30',
    headerBg: 'bg-gradient-to-r from-rose-500/10 to-pink-500/5',
    items: [
      { key: 'aircraft', name: '飞机大战', desc: '10关卡Boss战+6款皮肤商店+金币系统+上下移动', gradient: 'from-sky-500 to-blue-600', emoji: '✈️', tags: ['射击', '动作'], difficulty: 'hard' },
      { key: 'breakout', name: '打砖块', desc: '控制挡板反弹球消灭砖块，5关+连击+多种道具', gradient: 'from-rose-500 to-red-600', emoji: '🧱', tags: ['动作', '休闲'], difficulty: 'medium' },
      { key: 'adventure', name: '冒险勇士', desc: '横版自动卷轴跑酷，跳跃攻击打败怪物收集金币', gradient: 'from-violet-500 to-purple-600', emoji: '⚔️', tags: ['冒险', '动作'], difficulty: 'hard' },
    ],
  },
  {
    title: '益智休闲',
    icon: <Brain className="h-4 w-4" />,
    accentColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
    headerBg: 'bg-gradient-to-r from-amber-500/10 to-yellow-500/5',
    items: [
      { key: 'gomoku', name: '五子棋', desc: '人机对战/双人联机，先连成五子者获胜', gradient: 'from-purple-500 to-fuchsia-600', emoji: '⚫', tags: ['策略', '对战'], difficulty: 'medium' },
      { key: 'chess', name: '中国象棋', desc: '完整规则象棋，支持人机对战和双人对战', gradient: 'from-red-500 to-rose-600', emoji: '♟', tags: ['策略', '对战'], difficulty: 'hard' },
      { key: 'match3', name: '消消乐', desc: '交换相邻方块，三个相同即消除，连锁得分', gradient: 'from-pink-500 to-rose-600', emoji: '💎', tags: ['益智', '休闲'], difficulty: 'easy' },
      { key: 'maze', name: '迷宫探险', desc: '随机生成迷宫，3种难度，计时评分挑战', gradient: 'from-teal-500 to-emerald-600', emoji: '🏰', tags: ['探险', '解谜'], difficulty: 'hard' },
      { key: 'minesweeper', name: '扫雷', desc: '根据数字推理地雷位置，左键揭开右键标旗', gradient: 'from-gray-500 to-slate-600', emoji: '💣', tags: ['益智', '推理'], difficulty: 'medium' },
    ],
  },
  {
    title: '策略塔防',
    icon: <Shield className="h-4 w-4" />,
    accentColor: 'text-lime-500',
    borderColor: 'border-lime-500/30',
    headerBg: 'bg-gradient-to-r from-lime-500/10 to-green-500/5',
    items: [
      { key: 'pvz', name: '植物大战僵尸', desc: '9种植物+7种僵尸，5波攻击，种植策略塔防', gradient: 'from-lime-500 to-green-600', emoji: '🌻', tags: ['策略', '塔防'], difficulty: 'hard' },
      { key: 'tower-defense', name: '保卫萝卜', desc: '建造防御塔升级强化，15波怪物来袭守卫萝卜', gradient: 'from-orange-500 to-red-500', emoji: '🥕', tags: ['塔防', '策略'], difficulty: 'medium' },
    ],
  },
  {
    title: '休闲挑战',
    icon: <Star className="h-4 w-4" />,
    accentColor: 'text-orange-500',
    borderColor: 'border-orange-500/30',
    headerBg: 'bg-gradient-to-r from-orange-500/10 to-amber-500/5',
    items: [
      { key: 'flappy', name: '像素鸟', desc: '点击屏幕控制小鸟飞行，穿越管道间隙得分', gradient: 'from-sky-400 to-cyan-500', emoji: '🐦', tags: ['反应', '休闲'], difficulty: 'hard' },
      { key: 'racing', name: '赛车狂飙', desc: '三车道闪避赛车，速度越来越快挑战极限', gradient: 'from-red-500 to-orange-500', emoji: '🏎', tags: ['竞速', '反应'], difficulty: 'medium' },
      { key: 'parkour', name: '跑酷达人', desc: '二段跳躲避障碍，收集金币和护盾磁铁等道具', gradient: 'from-orange-400 to-amber-500', emoji: '🏃', tags: ['动作', '跑酷'], difficulty: 'medium' },
      { key: 'memory', name: '记忆翻牌', desc: '翻开卡牌找到配对，考验记忆力，步数越少越好', gradient: 'from-violet-500 to-indigo-500', emoji: '🃏', tags: ['记忆', '休闲'], difficulty: 'easy' },
    ],
  },
];

const difficultyLabel: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case 'easy': return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20';
    case 'medium': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'hard': return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

export default function GameHall() {
  const { setCurrentGame, setCurrentPage } = useSiteStore();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/games/scores')
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 200) {
          const map: Record<string, number> = {};
          data.data.forEach((s: { game: string; score: number }) => { map[s.game] = s.score; });
          setScores(map);
        }
      });
  }, []);

  const enterGame = (gameKey: string) => {
    setCurrentGame(gameKey);
    setCurrentPage('game-play');
  };

  const toggleGroup = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return gameGroups;
    const q = search.toLowerCase();
    return gameGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.desc.toLowerCase().includes(q) ||
            item.tags.some((t) => t.includes(q))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-10 text-white"
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary/80 via-violet-600/70 to-fuchsia-600/80"
          style={{
            backgroundSize: '200% 200%',
            animation: 'game-hall-gradient 8s ease infinite',
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTEydjRoMTJ6TTI0IDI0aDEydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Gamepad2 className="h-7 w-7 sm:h-9 sm:w-9" />
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">游戏大厅</h1>
            <div className="ml-auto">
              <KeyBindingsPanel />
            </div>
          </div>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            15 款精选游戏等你挑战，从经典到策略，总有一款适合你！
          </p>
        </div>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索游戏..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 h-10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-5">
        {filteredGroups.map((group, gi) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: gi * 0.08 }}
            className={`rounded-xl border ${group.borderColor} overflow-hidden`}
          >
            <button
              className={`w-full flex items-center justify-between px-4 py-3 ${group.headerBg} transition-colors hover:brightness-110 cursor-pointer`}
              onClick={() => toggleGroup(group.title)}
            >
              <div className="flex items-center gap-2">
                <span className={group.accentColor}>{group.icon}</span>
                <h2 className={`font-bold text-sm sm:text-base ${group.accentColor}`}>{group.title}</h2>
                <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 h-4">
                  {group.items.length}
                </Badge>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${collapsed[group.title] ? '' : 'rotate-180'}`} />
            </button>

            <AnimatePresence>
              {!collapsed[group.title] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    {group.items.map((game, i) => (
                      <motion.div
                        key={game.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                        whileTap={{ scale: 0.97 }}
                        className="group"
                      >
                        <Card
                          className="cursor-pointer border-border/50 hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
                          onClick={() => enterGame(game.key)}
                        >
                          <div className={`h-1.5 bg-gradient-to-r ${game.gradient}`} />
                          <CardContent className="p-3 sm:p-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300 shrink-0">{game.emoji}</div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors truncate">{game.name}</h3>
                                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-tight">{game.desc}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-wrap">
                              {game.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 font-normal">
                                  {tag}
                                </Badge>
                              ))}
                              <Badge variant="outline" className={`text-[9px] sm:text-[10px] px-1.5 py-0 h-4 font-normal border ${getDifficultyStyle(game.difficulty)}`}>
                                {difficultyLabel[game.difficulty] || game.difficulty}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Trophy className="h-3 w-3 text-amber-500" />
                                <span className="text-[11px] font-medium tabular-nums">{scores[game.key] ?? 0}</span>
                              </div>
                              <div className="flex items-center gap-0.5 text-primary text-[11px] font-medium">
                                <span>开始</span>
                                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {filteredGroups.length === 0 && search && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-1">没有找到匹配的游戏</p>
          <p className="text-sm">试试其他关键词吧</p>
        </div>
      )}
    </div>
  );
}
