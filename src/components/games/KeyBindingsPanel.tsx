'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings2, RotateCcw } from 'lucide-react';
import { useKeyBindings, GameAction, ACTION_META } from '@/store/use-key-bindings';

const GROUPS: { label: string; actions: GameAction[] }[] = [
  { label: '方向控制', actions: ['up', 'down', 'left', 'right'] },
  { label: '游戏操作', actions: ['action1', 'action2', 'action3'] },
  { label: '系统', actions: ['pause', 'confirm', 'cancel'] },
];

function KeySlot({ code, listening, onListen }: { code: string; listening: boolean; onListen: () => void }) {
  const { getKeyLabel } = useKeyBindings();
  return (
    <button
      onClick={onListen}
      className={`px-3 py-1.5 rounded-md border font-mono text-sm transition-all min-w-[3rem] text-center ${
        listening
          ? 'border-primary bg-primary/10 animate-pulse'
          : 'border-muted bg-muted/30 hover:border-primary/50'
      }`}
    >
      {listening ? '按下按键...' : getKeyLabel(code)}
    </button>
  );
}

export default function KeyBindingsPanel() {
  const [open, setOpen] = useState(false);
  const { bindings, setBinding, resetBinding, resetAll, getKeyLabel } = useKeyBindings();
  const [listeningAction, setListeningAction] = useState<GameAction | null>(null);
  const [listeningSlot, setListeningSlot] = useState<number>(-1);
  const [conflict, setConflict] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (listeningAction === null) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.code === 'Escape') {
      setListeningAction(null);
      setListeningSlot(-1);
      setConflict(null);
      return;
    }

    const code = e.code;

    const currentKeys = [...bindings[listeningAction]];
    currentKeys[listeningSlot] = code;

    setBinding(listeningAction, currentKeys);
    setListeningAction(null);
    setListeningSlot(-1);
    setConflict(null);
  }, [listeningAction, listeningSlot, bindings, setBinding]);

  useEffect(() => {
    if (listeningAction !== null) {
      const handler = (e: KeyboardEvent) => handleKeyDown(e);
      window.addEventListener('keydown', handler, true);
      return () => window.removeEventListener('keydown', handler, true);
    }
  }, [listeningAction, handleKeyDown]);

  const startListening = (action: GameAction, slot: number) => {
    setListeningAction(action);
    setListeningSlot(slot);
  };

  const handleAddSlot = (action: GameAction) => {
    const currentKeys = [...bindings[action], 'Space'];
    setBinding(action, currentKeys);
    setListeningAction(action);
    setListeningSlot(currentKeys.length - 1);
  };

  const handleRemoveSlot = (action: GameAction, slot: number) => {
    if (bindings[action].length <= 1) return;
    const currentKeys = bindings[action].filter((_, i) => i !== slot);
    setBinding(action, currentKeys);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      setListeningAction(null);
      setListeningSlot(-1);
      setConflict(null);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">键位设置</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            自定义键位
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div ref={panelRef} className="space-y-5 pb-4">
            {listeningAction && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-center animate-pulse">
                正在为「{ACTION_META[listeningAction].label}」设置按键... 按下 Esc 取消
              </div>
            )}

            {GROUPS.map((group) => (
              <div key={group.label} className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{group.label}</h3>
                <div className="space-y-2">
                  {group.actions.map((action) => {
                    const meta = ACTION_META[action];
                    const keys = bindings[action];
                    return (
                      <div key={action} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="w-20 shrink-0">
                          <div className="font-medium text-sm">{meta.label}</div>
                          <div className="text-xs text-muted-foreground">{meta.description}</div>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="flex flex-wrap gap-1.5 flex-1 items-center">
                          {keys.map((code, slot) => (
                            <div key={slot} className="flex items-center gap-1">
                              <KeySlot
                                code={code}
                                listening={listeningAction === action && listeningSlot === slot}
                                onListen={() => startListening(action, slot)}
                              />
                              {keys.length > 1 && (
                                <button
                                  onClick={() => handleRemoveSlot(action, slot)}
                                  className="text-muted-foreground hover:text-destructive text-xs ml-0.5"
                                  title="移除"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => handleAddSlot(action)}
                            className="text-xs text-primary hover:text-primary/80 px-2 py-1 border border-dashed border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
                          >
                            + 添加
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => resetBinding(action)}
                          title="恢复默认"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">修改后的键位会自动保存到浏览器</p>
              <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                全部恢复默认
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
