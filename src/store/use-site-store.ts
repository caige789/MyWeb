/**
 * 全局状态管理 - 管理当前页面、管理员登录状态、站点配置
 */
import { create } from 'zustand';

/** 页面/标签类型 */
export type PageType = 'home' | 'blog' | 'blog-detail' | 'blog-editor' | 'games' | 'game-play' | 'tools' | 'messages' | 'admin';

/** 社交链接类型 */
export interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

/** 站点配置类型 */
export interface SiteConfigData {
  site_name: string;
  site_description: string;
  owner_name: string;
  owner_bio: string;
  owner_avatar: string;
  social_links: SocialLink[];
  skills: string[];
}

/** 站点统计类型 */
export interface SiteStats {
  totalVisits: number;
  articleCount: number;
  gameCount: number;
  messageCount: number;
  diaryCount: number;
}

interface SiteStore {
  // 当前页面
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;

  // 进入游戏前的页面（用于返回导航）
  previousPage: PageType;
  setPreviousPage: (page: PageType) => void;

  // 博客详情页的文章ID
  currentArticleId: number | null;
  setCurrentArticleId: (id: number | null) => void;

  // 博客编辑器的文章ID（null=新建，有值=编辑）
  editingArticleId: number | null;
  setEditingArticleId: (id: number | null) => void;

  // 游戏大厅当前游戏名
  currentGame: string | null;
  setCurrentGame: (game: string | null) => void;

  // 管理员登录状态
  isAdmin: boolean;
  setAdmin: (val: boolean) => void;
  adminPassword: string;
  setAdminPassword: (pw: string) => void;

  // 站点配置（从后端加载）
  config: SiteConfigData | null;
  setConfig: (cfg: SiteConfigData) => void;

  // 统计数据
  stats: SiteStats | null;
  setStats: (s: SiteStats) => void;

  // 用户登录状态
  user: { id: number; username: string; nickname: string; avatar: string; token: string } | null;
  setUser: (u: { id: number; username: string; nickname: string; avatar: string; token: string } | null) => void;
}

export const useSiteStore = create<SiteStore>((set) => ({
  currentPage: 'home' as PageType,
  previousPage: 'home' as PageType,
  setCurrentPage: (page) => set((state) => {
    if (state.currentPage !== page) {
      return { previousPage: state.currentPage, currentPage: page };
    }
    return { currentPage: page };
  }),
  setPreviousPage: (page) => set({ previousPage: page }),

  currentArticleId: null,
  setCurrentArticleId: (id) => set({ currentArticleId: id }),

  editingArticleId: null,
  setEditingArticleId: (id) => set({ editingArticleId: id }),

  currentGame: null,
  setCurrentGame: (game) => set({ currentGame: game }),

  isAdmin: false,
  setAdmin: (val) => set({ isAdmin: val }),
  adminPassword: '',
  setAdminPassword: (pw) => set({ adminPassword: pw }),

  config: null,
  setConfig: (cfg) => set({ config: cfg }),

  stats: null,
  setStats: (s) => set({ stats: s }),

  user: null,
  setUser: (u) => set({ user: u }),
}));
