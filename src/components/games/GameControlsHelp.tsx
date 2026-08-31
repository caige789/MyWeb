'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CircleHelp, Monitor, Smartphone } from 'lucide-react';
import { useKeyBindings } from '@/store/use-key-bindings';

export interface ControlItem {
  action: string;
  keys: string[];
  description: string;
}

export interface GameControlsInfo {
  gameName: string;
  desktop: ControlItem[];
  mobile: ControlItem[];
  rules?: string[];
  tips?: string[];
}

interface GameControlsHelpProps {
  info: GameControlsInfo;
  variant?: 'button' | 'text';
  className?: string;
}

function KeyBadge({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 min-w-[2rem] justify-center border-primary/30 bg-primary/5">
      {label}
    </Badge>
  );
}

export default function GameControlsHelp({ info, variant = 'button', className = '' }: GameControlsHelpProps) {
  const [open, setOpen] = useState(false);
  const { getKeyLabel } = useKeyBindings();

  const renderControls = (controls: ControlItem[]) => (
    <div className="space-y-3">
      {controls.map((ctrl, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-wrap gap-1.5 shrink-0 pt-0.5">
            {ctrl.keys.map((k, j) => (
              <KeyBadge key={j} label={getKeyLabel(k)} />
            ))}
          </div>
          <span className="text-sm text-muted-foreground leading-relaxed">{ctrl.description}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'button' ? (
          <Button variant="outline" size="icon" className={`h-8 w-8 shrink-0 ${className}`} title="操作说明">
            <CircleHelp className="h-4 w-4" />
          </Button>
        ) : (
          <button className={`text-muted-foreground hover:text-foreground transition-colors ${className}`}>
            <CircleHelp className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{info.gameName} - 操作说明</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-2">
          <div className="space-y-5 pb-4">
            {/* Desktop controls */}
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Monitor className="h-4 w-4" />
                  <span>电脑操作</span>
                </div>
                {renderControls(info.desktop)}
              </CardContent>
            </Card>

            {/* Mobile controls */}
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Smartphone className="h-4 w-4" />
                  <span>手机操作</span>
                </div>
                {renderControls(info.mobile)}
              </CardContent>
            </Card>

            {/* Rules */}
            {info.rules && info.rules.length > 0 && (
              <Card className="border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-4 space-y-2">
                  <div className="font-semibold">游戏规则</div>
                  <ul className="space-y-1.5">
                    {info.rules.map((rule, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            {info.tips && info.tips.length > 0 && (
              <Card className="border-emerald-300/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-4 space-y-2">
                  <div className="font-semibold">小技巧</div>
                  <ul className="space-y-1.5">
                    {info.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">💡</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
