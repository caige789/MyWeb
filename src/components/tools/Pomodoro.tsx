/**
 * 番茄钟 - 25分钟工作 + 5分钟休息，纯前端
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completed, setCompleted] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const start = () => {
    if (running) {
      clearTimer();
      setRunning(false);
      return;
    }
    setRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          if (isBreak) {
            setIsBreak(false);
            return WORK_TIME;
          } else {
            setIsBreak(true);
            setCompleted((c) => c + 1);
            return BREAK_TIME;
          }
        }
        return prev - 1;
      });
    }, 1000);
  };

  const reset = () => {
    clearTimer();
    setRunning(false);
    setIsBreak(false);
    setTimeLeft(WORK_TIME);
  };

  useEffect(() => { return () => clearTimer(); }, [clearTimer]);

  const progress = isBreak
    ? ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100
    : ((WORK_TIME - timeLeft) / WORK_TIME) * 100;

  const totalTime = isBreak ? BREAK_TIME : WORK_TIME;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" /> 番茄钟
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            已完成 {completed} 个番茄
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5">
        <div className={`text-sm font-medium px-3 py-1 rounded-full ${isBreak ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-primary/10 text-primary'}`}>
          {isBreak ? '休息中' : '专注工作中'}
        </div>

        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`} strokeLinecap="round" className={isBreak ? 'text-green-500' : 'text-primary'} style={{ transition: 'stroke-dashoffset 0.5s' }} />
          </svg>
          <span className="text-4xl font-bold tabular-nums">{formatTime(timeLeft)}</span>
        </div>

        <div className="flex gap-3">
          <Button onClick={reset} variant="outline" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button onClick={start} size="lg" className="min-w-[120px]">
            {running ? <><Pause className="h-4 w-4 mr-1" /> 暂停</> : <><Play className="h-4 w-4 mr-1" /> {timeLeft < totalTime ? '继续' : '开始'}</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
