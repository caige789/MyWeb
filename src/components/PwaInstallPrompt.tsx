'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download } from 'lucide-react';

const STORAGE_KEY = 'pwa-installed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, '1');
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!canInstall) return null;

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Install App"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">{'\u5b89\u88c5\u5e94\u7528'}</span>
    </button>
  );
}
