/**
 * 待办事项 - 增删改查，存后端
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TodoItem {
  id: number;
  content: string;
  completed: boolean;
  createdAt: string;
}

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const { toast } = useToast();

  /** 加载待办列表 */
  const loadTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    const data = await res.json();
    if (data.code === 200) setTodos(data.data);
  }, []);

  useEffect(() => { loadTodos(); }, [loadTodos]);

  /** 新增待办 */
  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    setNewTodo('');
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    loadTodos();
  };

  /** 切换完成状态 */
  const toggleTodo = async (id: number) => {
    await fetch('/api/todos/' + id, { method: 'PUT' });
    loadTodos();
  };

  /** 删除待办 */
  const deleteTodo = async (id: number) => {
    await fetch('/api/todos/' + id, { method: 'DELETE' });
    loadTodos();
  };

  const pending = todos.filter((t) => !t.completed).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" /> 待办事项
          <span className="text-sm font-normal text-muted-foreground">{pending} 项待完成</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="添加新待办..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          />
          <Button onClick={addTodo} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-72 custom-scrollbar">
          {todos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无待办事项，添加一个吧
            </div>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                  />
                  <span
                    className={`flex-1 text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {todo.content}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
