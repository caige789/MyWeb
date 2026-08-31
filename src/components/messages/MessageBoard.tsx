/**
 * 留言板 - 所有人可查看、发表留言，管理员可删除
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useSiteStore } from '@/store/use-site-store';
import { useToast } from '@/hooks/use-toast';

interface Msg {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
}

export default function MessageBoard() {
  const { isAdmin, adminPassword } = useSiteStore();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  /** 加载留言列表 */
  const loadMessages = useCallback(async () => {
    const res = await fetch('/api/messages');
    const data = await res.json();
    if (data.code === 200) setMessages(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  /** 发表留言 */
  const handleSend = async () => {
    if (!nickname.trim()) { toast({ title: '请输入昵称' }); return; }
    if (!content.trim()) { toast({ title: '请输入留言内容' }); return; }

    setSending(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: nickname.trim(), content: content.trim() }),
    });
    setContent('');
    setSending(false);
    loadMessages();
    toast({ title: '留言成功！' });
  };

  /** 管理员删除留言 */
  const handleDelete = async (id: number) => {
    await fetch('/api/messages/' + id, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': adminPassword },
    });
    loadMessages();
    toast({ title: '已删除' });
  };

  /** 格式化时间 */
  const formatTime = (d: string) => {
    return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // 根据昵称生成头像颜色
  const avatarColor = (name: string) => {
    const hue = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) || 0) * 17) % 360;
    return `hsl(${hue}, 60%, 55%)`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-primary" /> 留言板
      </h1>

      <Card>
        <CardContent className="p-4 md:p-6 space-y-3">
          <div className="flex gap-3">
            <Input
              placeholder="你的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-32 shrink-0"
            />
            <Textarea
              placeholder="说点什么..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              rows={2}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={sending} className="shrink-0 self-end">
              <Send className="h-4 w-4 mr-1" /> {sending ? '...' : '发送'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            还没有留言，来抢沙发吧！
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className="group">
              <CardContent className="p-4 flex gap-3">
                <div
                  className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: avatarColor(msg.nickname) }}
                >
                  {msg.nickname[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{msg.nickname}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDelete(msg.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
