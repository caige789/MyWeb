'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Copy, Check, Trash2 } from 'lucide-react';

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

// Convert RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Get color harmonies
function getHarmonies(hex: string) {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const toHex = (h: number, s: number, l: number) => {
    const c = hslToRgb(((h % 360) + 360) % 360, s, l);
    return rgbToHex(c.r, c.g, c.b);
  };

  return {
    complementary: [
      toHex(hsl.h, hsl.s, hsl.l),
      toHex(hsl.h + 180, hsl.s, hsl.l),
    ],
    analogous: [
      toHex(hsl.h - 30, hsl.s, hsl.l),
      toHex(hsl.h, hsl.s, hsl.l),
      toHex(hsl.h + 30, hsl.s, hsl.l),
    ],
    triadic: [
      toHex(hsl.h, hsl.s, hsl.l),
      toHex(hsl.h + 120, hsl.s, hsl.l),
      toHex(hsl.h + 240, hsl.s, hsl.l),
    ],
  };
}

const STORAGE_KEY = 'color-picker-history';

export default function ColorPicker() {
  const [color, setColor] = useState('#6366f1');
  const [history, setHistory] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = useCallback((hex: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== hex.toLowerCase());
      const next = [hex, ...filtered].slice(0, 12);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleColorChange = (hex: string) => {
    setColor(hex);
  };

  const handleColorCommit = () => {
    saveHistory(color);
  };

  const selectColor = (hex: string) => {
    setColor(hex);
  };

  const copyText = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const rgb = hexToRgb(color);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const harmonies = getHarmonies(color);

  const isLight = hsl.l > 60;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" /> 颜色选择器
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Color input + preview */}
        <div className="flex items-center gap-4">
          <div
            className="relative w-20 h-20 rounded-xl border-2 border-border shadow-inner cursor-pointer overflow-hidden"
            style={{ backgroundColor: color }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(e.target.value)}
              onMouseUp={handleColorCommit}
              onTouchEnd={handleColorCommit}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="选择颜色"
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <span className="text-xs text-muted-foreground">HEX</span>
              <div className="flex items-center gap-1.5">
                <code className="text-sm font-mono font-medium">{color.toUpperCase()}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(color.toUpperCase(), 'hex')}>
                  {copiedField === 'hex' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <span className="text-xs text-muted-foreground">RGB</span>
              <div className="flex items-center gap-1.5">
                <code className="text-sm font-mono font-medium">{rgb.r}, {rgb.g}, {rgb.b}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}>
                  {copiedField === 'rgb' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <span className="text-xs text-muted-foreground">HSL</span>
              <div className="flex items-center gap-1.5">
                <code className="text-sm font-mono font-medium">{hsl.h}, {hsl.s}%, {hsl.l}%</code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}>
                  {copiedField === 'hsl' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Color harmonies */}
        <div className="space-y-3">
          <p className="text-sm font-medium">色彩和谐</p>
          <div className="grid grid-cols-3 gap-3">
            <HarmonyRow label="互补色" colors={harmonies.complementary} onSelect={selectColor} />
            <HarmonyRow label="类似色" colors={harmonies.analogous} onSelect={selectColor} />
            <HarmonyRow label="三角色" colors={harmonies.triadic} onSelect={selectColor} />
          </div>
        </div>

        {/* Preview swatch */}
        <div
          className="w-full h-16 rounded-lg border border-border transition-colors duration-300"
          style={{ backgroundColor: color }}
        >
          <p
            className="text-center text-sm font-medium leading-[4rem] transition-colors duration-300"
            style={{ color: isLight ? '#000' : '#fff' }}
          >
            {color.toUpperCase()}
          </p>
        </div>

        {/* Recent colors */}
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">最近使用</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearHistory}>
                <Trash2 className="h-3 w-3 mr-1" /> 清空
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((c) => (
                <button
                  key={c}
                  className="w-8 h-8 rounded-lg border-2 border-border hover:scale-110 transition-transform cursor-pointer shadow-sm"
                  style={{ backgroundColor: c }}
                  onClick={() => selectColor(c)}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HarmonyRow({ label, colors, onSelect }: { label: string; colors: string[]; onSelect: (c: string) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground text-center">{label}</p>
      <div className="flex gap-1 justify-center">
        {colors.map((c) => (
          <button
            key={c}
            className="w-8 h-8 rounded-md border border-border/50 hover:scale-110 transition-transform cursor-pointer shadow-sm"
            style={{ backgroundColor: c }}
            onClick={() => onSelect(c)}
            aria-label={`选择${label} ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
