'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Clock, Play, Pause, RotateCcw, Flag } from 'lucide-react';

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio not available
  }
}

function formatTime(totalMs: number) {
  const totalSec = Math.ceil(totalMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Countdown() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> 计时器
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="countdown">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="countdown">倒计时</TabsTrigger>
            <TabsTrigger value="stopwatch">秒表</TabsTrigger>
          </TabsList>
          <TabsContent value="countdown">
            <CountdownTimer />
          </TabsContent>
          <TabsContent value="stopwatch">
            <Stopwatch />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CountdownTimer() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const totalSetMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

  const start = useCallback(() => {
    if (running) {
      clearTimer();
      setRunning(false);
      return;
    }

    let endTime: number;
    if (!started) {
      const totalMs = totalSetMs;
      if (totalMs <= 0) return;
      endTime = Date.now() + totalMs;
      endTimeRef.current = endTime;
      setRemaining(totalMs);
      setStarted(true);
      setFinished(false);
    } else {
      endTime = endTimeRef.current;
    }

    setRunning(true);
    timerRef.current = setInterval(() => {
      const left = endTime - Date.now();
      if (left <= 0) {
        clearTimer();
        setRunning(false);
        setRemaining(0);
        setFinished(true);
        beep();
      } else {
        setRemaining(left);
      }
    }, 50);
  }, [running, started, totalSetMs, clearTimer]);

  const reset = () => {
    clearTimer();
    setRunning(false);
    setStarted(false);
    setFinished(false);
    setRemaining(0);
  };

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const displayTime = started || running ? remaining : totalSetMs;

  return (
    <div className="flex flex-col items-center gap-5 pt-2">
      {!started ? (
        // Input mode
        <div className="flex items-center gap-2">
          <TimeInput label="时" value={hours} max={23} onChange={setHours} />
          <span className="text-2xl font-bold text-muted-foreground">:</span>
          <TimeInput label="分" value={minutes} max={59} onChange={setMinutes} />
          <span className="text-2xl font-bold text-muted-foreground">:</span>
          <TimeInput label="秒" value={seconds} max={59} onChange={setSeconds} />
        </div>
      ) : (
        // Display mode
        <div className="relative">
          <span className={`text-5xl font-bold tabular-nums ${finished ? 'text-red-500 animate-pulse' : ''}`}>
            {formatTime(displayTime)}
          </span>
        </div>
      )}

      {finished && (
        <p className="text-sm font-medium text-red-500">时间到！</p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" size="icon" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={start} size="lg" className="min-w-[120px]" disabled={!started && totalSetMs <= 0}>
          {running ? <><Pause className="h-4 w-4 mr-1" /> 暂停</> : <><Play className="h-4 w-4 mr-1" /> {started ? '继续' : '开始'}</>}
        </Button>
      </div>
    </div>
  );
}

function TimeInput({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value) || 0;
          onChange(Math.min(Math.max(0, v), max));
        }}
        className="w-16 text-center text-2xl font-bold tabular-nums h-14"
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (running) {
      clearTimer();
      accumulatedRef.current += Date.now() - startTimeRef.current;
      setRunning(false);
      return;
    }

    startTimeRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(accumulatedRef.current + (Date.now() - startTimeRef.current));
    }, 10);
  }, [running, clearTimer]);

  const reset = () => {
    clearTimer();
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    accumulatedRef.current = 0;
  };

  const lap = () => {
    if (!running) return;
    setLaps((prev) => [elapsed, ...prev]);
  };

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return (
    <div className="flex flex-col items-center gap-5 pt-2">
      <span className="text-5xl font-bold tabular-nums">{formatTime(elapsed)}</span>

      <div className="flex gap-3">
        <Button variant="outline" size="icon" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={lap} variant="outline" size="lg" disabled={!running}>
          <Flag className="h-4 w-4 mr-1" /> 计次
        </Button>
        <Button onClick={start} size="lg" className="min-w-[120px]">
          {running ? <><Pause className="h-4 w-4 mr-1" /> 暂停</> : <><Play className="h-4 w-4 mr-1" /> 开始</>}
        </Button>
      </div>

      {/* Lap list */}
      {laps.length > 0 && (
        <div className="w-full max-h-48 overflow-y-auto rounded-lg border">
          <div className="divide-y">
            {laps.map((lapTime, i) => {
              const lapNum = laps.length - i;
              const prev = laps[i + 1] ?? 0;
              const diff = lapTime - prev;
              return (
                <div key={lapNum} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-muted-foreground">计次 {lapNum}</span>
                  <span className="font-mono">+{formatTime(diff)}</span>
                  <span className="font-mono font-medium w-24 text-right">{formatTime(lapTime)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
