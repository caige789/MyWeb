/**
 * 粘性页脚 - 始终贴在视口底部
 */
'use client';

import { Flower2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Flower2 className="h-4 w-4 text-primary" />
          <span>个人数字花园</span>
        </div>
        <div>© {new Date().getFullYear()} All rights reserved.</div>
      </div>
    </footer>
  );
}
