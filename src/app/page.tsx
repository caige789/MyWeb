/**
 * SPA entry - page switching via Zustand
 */
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSiteStore } from '@/store/use-site-store';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HomePage from '@/components/home/HomePage';
import BlogList from '@/components/blog/BlogList';
import BlogDetail from '@/components/blog/BlogDetail';
import BlogEditor from '@/components/blog/BlogEditor';
import GameHall from '@/components/games/GameHall';
import GamePlayer from '@/components/games/GamePlayer';
import Toolbox from '@/components/tools/Toolbox';
import MessageBoard from '@/components/messages/MessageBoard';
import AdminPanel from '@/components/admin/AdminPanel';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function Page() {
  const { currentPage, isAdmin, setStats } = useSiteStore();

  useEffect(() => {
    fetch('/api/stats', { method: 'POST' });
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => { if (data.code === 200) setStats(data.data); });
  }, [setStats]);

  const isGamePlay = currentPage === 'game-play';

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'blog': return <BlogList />;
      case 'blog-detail': return <BlogDetail />;
      case 'blog-editor':
        if (!isAdmin) return <BlogList />;
        return <BlogEditor />;
      case 'games': return <GameHall />;
      case 'game-play': return <GamePlayer />;
      case 'tools': return <Toolbox />;
      case 'messages': return <MessageBoard />;
      case 'admin':
        if (!isAdmin) return <HomePage />;
        return <AdminPanel />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!isGamePlay && <Navbar />}
      <main className={
        isGamePlay
          ? 'flex-1 w-full px-0 pt-0 pb-0'
          : 'flex-1 max-w-[1200px] mx-auto w-full px-4 pt-20 pb-8'
      }>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
      {!isGamePlay && <Footer />}
      {isGamePlay && (
        <style>{`body{overflow:hidden;margin:0;}`}</style>
      )}
    </div>
  );
}
