'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { KeyRound, Copy, RefreshCw, Check } from 'lucide-react';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function getStrength(pwd: string): { label: string; color: string; percent: number } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 20) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { label: '弱', color: 'bg-red-500', percent: 25 };
  if (score <= 4) return { label: '中等', color: 'bg-amber-500', percent: 50 };
  if (score <= 5) return { label: '强', color: 'bg-emerald-500', percent: 75 };
  return { label: '非常强', color: 'bg-green-500', percent: 100 };
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSpecial, setUseSpecial] = useState(true);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let pool = '';
    if (useUpper) pool += UPPER;
    if (useLower) pool += LOWER;
    if (useNumbers) pool += NUMBERS;
    if (useSpecial) pool += SPECIAL;
    if (!pool) {
      pool = LOWER;
      setUseLower(true);
    }
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    const pwd = Array.from(arr, (v) => pool[v % pool.length]).join('');
    setPassword(pwd);
    setCopied(false);
  }, [length, useUpper, useLower, useNumbers, useSpecial]);

  const copyPassword = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = password ? getStrength(password) : null;

  // Generate initial password
  if (!password) {
    generate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" /> 密码生成器
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Password display */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
          <code className="flex-1 text-sm font-mono break-all select-all leading-relaxed">
            {password || '点击生成按钮创建密码'}
          </code>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={copyPassword} disabled={!password}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Strength indicator */}
        {strength && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">强度</span>
              <span className="font-medium">{strength.label}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Length slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-sm">长度</Label>
            <span className="text-sm font-mono font-medium text-primary">{length}</span>
          </div>
          <Slider
            value={[length]}
            onValueChange={([v]) => setLength(v)}
            min={8}
            max={64}
            step={1}
          />
        </div>

        {/* Character options */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="pg-upper" checked={useUpper} onCheckedChange={(v) => setUseUpper(!!v)} />
            <Label htmlFor="pg-upper" className="text-sm cursor-pointer">大写字母 (A-Z)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pg-lower" checked={useLower} onCheckedChange={(v) => setUseLower(!!v)} />
            <Label htmlFor="pg-lower" className="text-sm cursor-pointer">小写字母 (a-z)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pg-numbers" checked={useNumbers} onCheckedChange={(v) => setUseNumbers(!!v)} />
            <Label htmlFor="pg-numbers" className="text-sm cursor-pointer">数字 (0-9)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pg-special" checked={useSpecial} onCheckedChange={(v) => setUseSpecial(!!v)} />
            <Label htmlFor="pg-special" className="text-sm cursor-pointer">特殊字符 (!@#$)</Label>
          </div>
        </div>

        {/* Generate button */}
        <Button className="w-full" onClick={generate}>
          <RefreshCw className="h-4 w-4 mr-2" /> 生成密码
        </Button>
      </CardContent>
    </Card>
  );
}
