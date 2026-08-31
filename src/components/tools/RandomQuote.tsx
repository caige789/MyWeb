/**
 * 随机名言 - 内置名言库，点击刷新
 */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Quote, RefreshCw } from 'lucide-react';

/** 内置中文名言库 */
const quotes = [
  { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
  { text: '千里之行，始于足下。', author: '老子' },
  { text: '知之者不如好之者，好之者不如乐之者。', author: '孔子' },
  { text: '天行健，君子以自强不息。', author: '《周易》' },
  { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', author: '荀子' },
  { text: '业精于勤，荒于嬉；行成于思，毁于随。', author: '韩愈' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来。', author: '古训' },
  { text: '生活不是等待风暴过去，而是学会在雨中起舞。', author: '维维安·格林' },
  { text: '代码是写给人看的，附带能在机器上运行。', author: 'Harold Abelson' },
  { text: '简单是可靠的先决条件。', author: 'Edsger Dijkstra' },
  { text: '任何你写的代码，超过六个月不去看，就像别人写的一样。', author: 'Eagleson 定律' },
  { text: '好的代码本身就是最好的文档。', author: 'Steve McConnell' },
  { text: '先让它工作，再让它正确，最后让它快速。', author: 'Kent Beck' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游' },
];

export default function RandomQuote() {
  const [quote, setQuote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  /** 换一条名言 */
  const refresh = () => {
    let next: typeof quote;
    do {
      next = quotes[Math.floor(Math.random() * quotes.length)];
    } while (next.text === quote.text && quotes.length > 1);
    setQuote(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Quote className="h-5 w-5 text-primary" /> 随机名言
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-[100px] flex flex-col justify-center">
          <blockquote className="text-lg md:text-xl font-medium italic text-center leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <p className="text-right text-muted-foreground mt-3 text-sm">—— {quote.author}</p>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> 换一条
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
