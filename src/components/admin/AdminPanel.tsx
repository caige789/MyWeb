'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSiteStore, SocialLink, SiteConfigData } from '@/store/use-site-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Eye, FileText, LayoutDashboard, Settings, X, Save, Link2, Tag, User, Users, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminArticle {
  id: number;
  title: string;
  summary: string;
  category: string;
  status: string;
  viewCount: number;
  createdAt: string;
}

interface SiteFormState {
  site_name: string;
  site_description: string;
  owner_name: string;
  owner_bio: string;
  owner_avatar: string;
  social_links: SocialLink[];
  skills: string[];
}

interface AdminUser {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  role: string;
  createdAt: string;
}

const EMPTY_SOCIAL: SocialLink = { name: '', url: '', icon: '' };

const INITIAL_FORM: SiteFormState = {
  site_name: '',
  site_description: '',
  owner_name: '',
  owner_bio: '',
  owner_avatar: '',
  social_links: [],
  skills: [],
};

export default function AdminPanel() {
  const { setCurrentPage, setEditingArticleId, setCurrentArticleId, adminPassword, config, setConfig } = useSiteStore();
  const { toast } = useToast();

  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [articleLoading, setArticleLoading] = useState(true);

  const [form, setForm] = useState<SiteFormState>(INITIAL_FORM);
  const [configLoading, setConfigLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  // User management state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editNicknameVal, setEditNicknameVal] = useState('');
  const [editPasswordVal, setEditPasswordVal] = useState('');

  const loadArticles = useCallback(async () => {
    const res = await fetch('/api/articles/admin-list', {
      headers: { 'X-Admin-Password': adminPassword },
    });
    const data = await res.json();
    if (data.code === 200) setArticles(data.data.list || data.data);
    else toast({ title: '\u52a0\u8f7d\u5931\u8d25', variant: 'destructive' });
    setArticleLoading(false);
  }, [adminPassword, toast]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch('/api/admin/users', {
      headers: { 'X-Admin-Password': adminPassword },
    });
    const data = await res.json();
    if (data.code === 200) setUsers(data.data || []);
    else toast({ title: '\u52a0\u8f7d\u5931\u8d25', variant: 'destructive' });
    setUsersLoading(false);
  }, [adminPassword, toast]);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const loadConfig = useCallback(async () => {
    if (configLoaded) return;
    setConfigLoading(true);
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.code === 200) {
      const c = data.data;
      setForm({
        site_name: c.site_name || '',
        site_description: c.site_description || '',
        owner_name: c.owner_name || '',
        owner_bio: c.owner_bio || '',
        owner_avatar: c.owner_avatar || '',
        social_links: Array.isArray(c.social_links) ? c.social_links : [],
        skills: Array.isArray(c.skills) ? c.skills : [],
      });
      setConfigLoaded(true);
    } else {
      toast({ title: '\u52a0\u8f7d\u5931\u8d25', variant: 'destructive' });
    }
    setConfigLoading(false);
  }, [configLoaded, toast]);

  const handleCreate = () => {
    setEditingArticleId(null);
    setCurrentPage('blog-editor');
  };

  const handleEdit = (id: number) => {
    setEditingArticleId(id);
    setCurrentPage('blog-editor');
  };

  const handleView = (id: number) => {
    setCurrentArticleId(id);
    setCurrentPage('blog-detail');
  };

  const handleDelete = async (id: number) => {
    await fetch('/api/articles/' + id, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': adminPassword },
    });
    loadArticles();
    toast({ title: '\u5df2\u5220\u9664' });
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    const fields: Array<{ key: string; value: string }> = [
      { key: 'site_name', value: form.site_name },
      { key: 'site_description', value: form.site_description },
      { key: 'owner_name', value: form.owner_name },
      { key: 'owner_bio', value: form.owner_bio },
      { key: 'owner_avatar', value: form.owner_avatar },
      { key: 'social_links', value: JSON.stringify(form.social_links) },
      { key: 'skills', value: JSON.stringify(form.skills) },
    ];
    let allOk = true;
    for (const field of fields) {
      const res = await fetch('/api/config/' + field.key, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ value: field.value }),
      });
      const data = await res.json();
      if (data.code !== 200) {
        allOk = false;
        toast({ title: `\u4fdd\u5b58\u5931\u8d25: ${field.key}`, variant: 'destructive' });
      }
    }
    if (allOk) {
      toast({ title: '\u4fdd\u5b58\u6210\u529f' });
      const newConfig: SiteConfigData = {
        site_name: form.site_name, site_description: form.site_description,
        owner_name: form.owner_name, owner_bio: form.owner_bio,
        owner_avatar: form.owner_avatar, social_links: form.social_links, skills: form.skills,
      };
      setConfig(newConfig);
    }
    setSaving(false);
  };

  // User management handlers
  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      toast({ title: '\u8bf7\u586b\u5199\u7528\u6237\u540d\u548c\u5bc6\u7801', variant: 'destructive' });
      return;
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
      body: JSON.stringify({ username: newUsername, password: newPassword, nickname: newNickname || newUsername }),
    });
    const data = await res.json();
    if (data.code === 200) {
      toast({ title: '\u521b\u5efa\u6210\u529f' });
      setAddUserOpen(false);
      setNewUsername(''); setNewNickname(''); setNewPassword('');
      loadUsers();
    } else {
      toast({ title: data.message || '\u521b\u5efa\u5931\u8d25', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    const res = await fetch('/api/admin/users/' + id, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': adminPassword },
    });
    const data = await res.json();
    if (data.code === 200) {
      toast({ title: '\u5df2\u5220\u9664' });
      loadUsers();
    } else {
      toast({ title: data.message || '\u5220\u9664\u5931\u8d25', variant: 'destructive' });
    }
  };

  const openEditUser = (u: AdminUser) => {
    setEditingUser(u);
    setEditNicknameVal(u.nickname);
    setEditPasswordVal('');
    setEditUserOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    const body: Record<string, string> = { nickname: editNicknameVal };
    if (editPasswordVal) body.password = editPasswordVal;
    const res = await fetch('/api/admin/users/' + editingUser.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.code === 200) {
      toast({ title: '\u4fdd\u5b58\u6210\u529f' });
      setEditUserOpen(false);
      loadUsers();
    } else {
      toast({ title: data.message || '\u4fdd\u5b58\u5931\u8d25', variant: 'destructive' });
    }
  };

  const addSocialLink = () => setForm((prev) => ({ ...prev, social_links: [...prev.social_links, { ...EMPTY_SOCIAL }] }));
  const removeSocialLink = (index: number) => setForm((prev) => ({ ...prev, social_links: prev.social_links.filter((_, i) => i !== index) }));
  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    setForm((prev) => { const links = [...prev.social_links]; links[index] = { ...links[index], [field]: value }; return { ...prev, social_links: links }; });
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (form.skills.includes(trimmed)) { toast({ title: '\u6280\u80fd\u5df2\u5b58\u5728', variant: 'destructive' }); return; }
    setForm((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setSkillInput('');
  };
  const removeSkill = (skill: string) => setForm((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  const updateField = (field: keyof SiteFormState, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" /> \u540e\u53f0\u7ba1\u7406
        </h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> \u7528\u6237\u7ba1\u7406
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> \u6587\u7ae0\u7ba1\u7406
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5" onSelect={() => loadConfig()}>
            <Settings className="h-4 w-4" /> \u7ad9\u70b9\u8bbe\u7f6e
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" /> \u7528\u6237\u7ba1\u7406
                </span>
                <Button size="sm" onClick={() => setAddUserOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> \u6dfb\u52a0\u7528\u6237
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : users.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">\u6682\u65e0\u7528\u6237</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{u.nickname}</span>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="shrink-0">
                            {u.role === 'admin' ? '\u7ba1\u7406\u5458' : '\u666e\u901a\u7528\u6237'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {u.username} \u00b7 {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(u)} title="\u7f16\u8f91">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {u.role !== 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="\u5220\u9664">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>\u786e\u8ba4\u5220\u9664\uff1f</AlertDialogTitle>
                                <AlertDialogDescription>\u5220\u9664\u7528\u6237 {u.nickname}\uff08{u.username}\uff09\uff0c\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>\u53d6\u6d88</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(u.id)}>\u786e\u8ba4\u5220\u9664</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add user dialog */}
          <AlertDialog open={addUserOpen} onOpenChange={setAddUserOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>\u6dfb\u52a0\u7528\u6237</AlertDialogTitle>
                <AlertDialogDescription>\u65b0\u5efa\u4e00\u4e2a\u7528\u6237\u8d26\u53f7</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>\u7528\u6237\u540d</Label>
                  <Input placeholder="\u7528\u6237\u540d" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>\u6635\u79f0\uff08\u53ef\u9009\uff09</Label>
                  <Input placeholder="\u6635\u79f0" value={newNickname} onChange={e => setNewNickname(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>\u5bc6\u7801</Label>
                  <Input type="password" placeholder="\u5bc6\u7801" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>\u53d6\u6d88</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddUser} disabled={!newUsername || !newPassword}>\u786e\u8ba4\u6dfb\u52a0</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Edit user dialog */}
          <AlertDialog open={editUserOpen} onOpenChange={setEditUserOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>\u7f16\u8f91\u7528\u6237 - {editingUser?.username}</AlertDialogTitle>
                <AlertDialogDescription>\u4fee\u6539\u6635\u79f0\u6216\u91cd\u7f6e\u5bc6\u7801</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>\u6635\u79f0</Label>
                  <Input value={editNicknameVal} onChange={e => setEditNicknameVal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>\u65b0\u5bc6\u7801\uff08\u7559\u7a7a\u5219\u4e0d\u4fee\u6539\uff09</Label>
                  <Input type="password" placeholder="\u65b0\u5bc6\u7801" value={editPasswordVal} onChange={e => setEditPasswordVal(e.target.value)} />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>\u53d6\u6d88</AlertDialogCancel>
                <AlertDialogAction onClick={handleSaveUser}>\u4fdd\u5b58</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="articles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" /> \u6587\u7ae0\u7ba1\u7406
                </span>
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-1" /> \u65b0\u5efa\u6587\u7ae0
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {articleLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : articles.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">\u6682\u65e0\u6587\u7ae0</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {articles.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{a.title}</span>
                          <Badge variant={a.status === 'published' ? 'default' : 'secondary'} className="shrink-0">
                            {a.status === 'published' ? '\u5df2\u53d1\u5e03' : '\u8349\u7a3f'}
                          </Badge>
                          <Badge variant="outline" className="shrink-0 text-xs">{a.category}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(a.createdAt).toLocaleDateString('zh-CN')} \u00b7 {a.viewCount} \u6b21\u9605\u8bfb
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(a.id)} title="\u67e5\u770b"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(a.id)} title="\u7f16\u8f91"><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="\u5220\u9664"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>\u786e\u8ba4\u5220\u9664\uff1f</AlertDialogTitle>
                              <AlertDialogDescription>\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\u3002</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>\u53d6\u6d88</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(a.id)}>\u786e\u8ba4\u5220\u9664</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          {configLoading ? (
            <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><User className="h-5 w-5" /> \u57fa\u672c\u4fe1\u606f</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="site_name">\u7ad9\u70b9\u540d\u79f0</Label>
                    <Input id="site_name" value={form.site_name} onChange={(e) => updateField('site_name', e.target.value)} placeholder="\u4f60\u7684\u7f51\u7ad9\u540d\u79f0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site_description">\u7ad9\u70b9\u63cf\u8ff0</Label>
                    <Textarea id="site_description" value={form.site_description} onChange={(e) => updateField('site_description', e.target.value)} placeholder="\u7f51\u7ad9\u7b80\u4ecb" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">\u6635\u79f0</Label>
                    <Input id="owner_name" value={form.owner_name} onChange={(e) => updateField('owner_name', e.target.value)} placeholder="\u4f60\u7684\u540d\u5b57" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner_bio">\u4e2a\u4eba\u7b80\u4ecb</Label>
                    <Textarea id="owner_bio" value={form.owner_bio} onChange={(e) => updateField('owner_bio', e.target.value)} placeholder="\u4ecb\u7ecd\u4e00\u4e0b\u81ea\u5df1" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner_avatar">\u5934\u50cf\u94fe\u63a5</Label>
                    <Input id="owner_avatar" value={form.owner_avatar} onChange={(e) => updateField('owner_avatar', e.target.value)} placeholder="https://example.com/avatar.jpg" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base"><Link2 className="h-5 w-5" /> \u793e\u4ea4\u94fe\u63a5</span>
                    <Button variant="outline" size="sm" onClick={addSocialLink}><Plus className="h-4 w-4 mr-1" /> \u6dfb\u52a0</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {form.social_links.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">\u6682\u65e0\u793e\u4ea4\u94fe\u63a5</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {form.social_links.map((link, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                            <Input placeholder="\u540d\u79f0" value={link.name} onChange={(e) => updateSocialLink(index, 'name', e.target.value)} />
                            <Input placeholder="\u94fe\u63a5" value={link.url} onChange={(e) => updateSocialLink(index, 'url', e.target.value)} />
                            <Input placeholder="\u56fe\u6807" value={link.icon} onChange={(e) => updateSocialLink(index, 'icon', e.target.value)} />
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => removeSocialLink(index)}><X className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Tag className="h-5 w-5" /> \u6280\u80fd\u6807\u7b7e</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="\u8f93\u5165\u6280\u80fd\u540d\u79f0\uff0c\u6309 Enter \u6dfb\u52a0" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
                    <Button variant="outline" onClick={addSkill} disabled={!skillInput.trim()}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {form.skills.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">\u6682\u65e0\u6280\u80fd\u6807\u7b7e</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {form.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="pl-3 pr-1 py-1.5 gap-1.5 text-sm">
                          {skill}
                          <button type="button" className="rounded-full hover:bg-muted-foreground/20 p-0.5" onClick={() => removeSkill(skill)} aria-label={"\u79fb\u9664 " + skill}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={saving} className="min-w-[120px]">
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? '\u4fdd\u5b58\u4e2d...' : '\u4fdd\u5b58\u8bbe\u7f6e'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
