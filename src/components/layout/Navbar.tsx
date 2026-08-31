'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useSiteStore, type PageType } from '@/store/use-site-store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Flower2, Sun, Moon, Home, BookOpen, Gamepad2, Wrench, MessageSquare, ShieldCheck, Menu, X, LayoutDashboard, User, LogOut, Pencil
} from 'lucide-react';
import { PwaInstallButton } from '@/components/PwaInstallPrompt';
import { useToast } from '@/hooks/use-toast';

const navItems: { key: PageType; label: string; icon: React.ReactNode }[] = [
  { key: 'home', label: '\u9996\u9875', icon: <Home className="h-4 w-4" /> },
  { key: 'blog', label: '\u535a\u5ba2', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'games', label: '\u6e38\u620f\u5927\u5385', icon: <Gamepad2 className="h-4 w-4" /> },
  { key: 'tools', label: '\u5de5\u5177\u7bb1', icon: <Wrench className="h-4 w-4" /> },
  { key: 'messages', label: '\u7559\u8a00\u677f', icon: <MessageSquare className="h-4 w-4" /> },
];

export default function Navbar() {
  const { currentPage, setCurrentPage, isAdmin, setAdmin, adminPassword, setAdminPassword, user, setUser } = useSiteStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [profileOpen, setProfileOpen] = useState(false);
  const [editNick, setEditNick] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('user-token');
    if (saved) {
      fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + saved }
      })
        .then(r => r.json())
        .then(data => {
          if (data.code === 200 && data.data) {
            setUser({ ...data.data, token: saved });
          } else {
            localStorage.removeItem('user-token');
          }
        })
        .catch(() => localStorage.removeItem('user-token'));
    }
  }, [setUser]);

  const handleAdminLogin = async () => {
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'X-Admin-Password': pwInput }
      });
      const data = await res.json();
      if (data.code === 200) {
        setAdmin(true);
        setAdminPassword(pwInput);
        setAdminDialogOpen(false);
        setPwInput('');
        toast({ title: '\u7ba1\u7406\u5458\u767b\u5f55\u6210\u529f' });
      } else {
        toast({ title: '\u5bc6\u7801\u9519\u8bef', variant: 'destructive' });
      }
    } catch {
      toast({ title: '\u8bf7\u6c42\u5931\u8d25', variant: 'destructive' });
    }
  };

  const handleUserLogin = async () => {
    if (!loginUser || !loginPass) {
      toast({ title: '\u8bf7\u586b\u5199\u7528\u6237\u540d\u548c\u5bc6\u7801', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setUser(data.data);
        localStorage.setItem('user-token', data.data.token);
        setAuthOpen(false);
        setLoginUser('');
        setLoginPass('');
        toast({ title: '\u767b\u5f55\u6210\u529f\uff0c\u6b22\u8fce ' + data.data.nickname });
      } else {
        toast({ title: data.message || '\u767b\u5f55\u5931\u8d25', variant: 'destructive' });
      }
    } catch {
      toast({ title: '\u8bf7\u6c42\u5931\u8d25', variant: 'destructive' });
    }
  };

  const handleUserLogout = () => {
    setUser(null);
    localStorage.removeItem('user-token');
    toast({ title: '\u5df2\u9000\u51fa\u767b\u5f55' });
  };

  const handleAdminLogout = () => {
    setAdmin(false);
    setAdminPassword('');
    toast({ title: '\u5df2\u9000\u51fa\u7ba1\u7406\u5458' });
  };

  const navigate = (page: PageType) => {
    setCurrentPage(page);
    setMobileOpen(false);
  };

  const openProfileDialog = () => {
    if (user) {
      setEditNick(user.nickname);
      setEditAvatar(user.avatar);
    }
    setProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('user-token');
    if (!token) return;
    try {
      const body: Record<string, string> = {};
      if (editNick) body.nickname = editNick;
      if (editAvatar) body.avatar = editAvatar;
      if (Object.keys(body).length === 0) return;

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 200) {
        setUser({ ...data.data, token });
        setProfileOpen(false);
        toast({ title: '\u4fdd\u5b58\u6210\u529f' });
      } else {
        toast({ title: data.message || '\u4fdd\u5b58\u5931\u8d25', variant: 'destructive' });
      }
    } catch {
      toast({ title: '\u4fdd\u5b58\u5931\u8d25', variant: 'destructive' });
    }
  };

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Flower2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold hidden sm:inline">\u6570\u5b57\u82b1\u56ed</span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <Button
              key={item.key}
              variant={currentPage === item.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate(item.key)}
              className="gap-1.5"
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <PwaInstallButton />
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-green-600"
              onClick={() => { useSiteStore.getState().setCurrentPage('admin'); setMobileOpen(false); }}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">\u7ba1\u7406</span>
            </Button>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 max-w-[120px] truncate"
                onClick={openProfileDialog}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="truncate">{user.nickname}</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleUserLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={() => { setAuthOpen(true); }}>
              <User className="h-4 w-4 mr-1.5" />
              \u767b\u5f55
            </Button>
          )}

          {!isAdmin && !user && (
            <Button variant="ghost" size="icon" onClick={() => setAdminDialogOpen(true)}>
              <ShieldCheck className="h-4 w-4" />
            </Button>
          )}

          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={handleAdminLogout}>
              <ShieldCheck className="h-4 w-4 text-green-600" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto flex flex-col gap-1 p-2">
            {navItems.map(item => (
              <Button
                key={item.key}
                variant={currentPage === item.key ? 'default' : 'ghost'}
                className="justify-start gap-2"
                onClick={() => navigate(item.key)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
            {isAdmin && (
              <Button
                variant="ghost"
                className="justify-start gap-2 text-green-600"
                onClick={() => { useSiteStore.getState().setCurrentPage('admin'); setMobileOpen(false); }}
              >
                <LayoutDashboard className="h-4 w-4" />
                \u7ba1\u7406
              </Button>
            )}
          </nav>
        </div>
      )}

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>\u7ba1\u7406\u5458\u767b\u5f55</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="\u8bf7\u8f93\u5165\u7ba1\u7406\u5458\u5bc6\u7801"
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <Button className="w-full" onClick={handleAdminLogin} disabled={!pwInput}>
              \u9a8c\u8bc1
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>\u7528\u6237\u767b\u5f55</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="login-user">\u7528\u6237\u540d</Label>
              <Input id="login-user" placeholder="\u7528\u6237\u540d" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-pass">\u5bc6\u7801</Label>
              <Input id="login-pass" type="password" placeholder="\u5bc6\u7801" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUserLogin()} />
            </div>
            <Button className="w-full" onClick={handleUserLogin} disabled={!loginUser || !loginPass}>\u767b\u5f55</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>\u7f16\u8f91\u8d44\u6599</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nick">\u6635\u79f0</Label>
              <Input id="edit-nick" placeholder="\u6635\u79f0" value={editNick} onChange={e => setEditNick(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-avatar">\u5934\u50cf\u94fe\u63a5</Label>
              <Input id="edit-avatar" placeholder="https://example.com/avatar.jpg" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} />
            </div>
            {editAvatar && (
              <div className="flex justify-center">
                <img src={editAvatar} alt="preview" className="h-16 w-16 rounded-full object-cover border" />
              </div>
            )}
            <Button className="w-full" onClick={handleSaveProfile} disabled={!editNick && !editAvatar}>
              <Pencil className="h-4 w-4 mr-1.5" />
              \u4fdd\u5b58
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
