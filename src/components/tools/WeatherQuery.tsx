/**
 * 天气查询 - 调用 wttr.in 获取天气信息
 */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, Search, Loader2 } from 'lucide-react';

interface WeatherData {
  temp: string;
  desc: string;
  humidity: string;
  wind: string;
  feelsLike: string;
  city: string;
}

export default function WeatherQuery() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** 查询天气 */
  const queryWeather = async () => {
    const queryCity = city.trim() || 'Beijing';
    setLoading(true);
    setError('');
    setWeather(null);

    try {
      // 调用 wttr.in 的 JSON 接口，lang=zh 获取中文
      const res = await fetch('https://wttr.in/' + encodeURIComponent(queryCity) + '?format=j1&lang=zh');
      if (!res.ok) throw new Error('查询失败');
      const data = await res.json();
      const current = data.current_condition[0];
      const area = data.nearest_area[0];

      setWeather({
        temp: current.temp_C + '°C',
        desc: current.lang_zh?.[0]?.value || current.weatherDesc[0].value,
        humidity: current.humidity + '%',
        wind: current.windspeedKmph + ' km/h',
        feelsLike: current.FeelsLikeC + '°C',
        city: area.areaName[0].value,
      });
    } catch {
      setError('天气查询失败，请检查城市名称或稍后重试');
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" /> 天气查询
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入城市名（如：Beijing、Tokyo）"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && queryWeather()}
          />
          <Button onClick={queryWeather} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {weather && (
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{weather.city}</h3>
              <span className="text-3xl font-bold text-primary">{weather.temp}</span>
            </div>
            <p className="text-muted-foreground">{weather.desc}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-background/60 rounded-lg p-2 text-center">
                <div className="text-muted-foreground">体感温度</div>
                <div className="font-medium">{weather.feelsLike}</div>
              </div>
              <div className="bg-background/60 rounded-lg p-2 text-center">
                <div className="text-muted-foreground">湿度</div>
                <div className="font-medium">{weather.humidity}</div>
              </div>
              <div className="bg-background/60 rounded-lg p-2 text-center col-span-2">
                <div className="text-muted-foreground">风速</div>
                <div className="font-medium">{weather.wind}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
