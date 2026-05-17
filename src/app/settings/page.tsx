'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Settings, User, Shield, Loader2, CheckCircle2, AlertCircle,
  Trash2, UserPlus, Smartphone, MessageCircle, Terminal,
  Activity, Server, RefreshCw, Power, PowerOff, Send, Bell, Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

type Tab = 'profile' | 'users' | 'whatsapp';

const inputCls =
  'w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-shadow';
const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5';

interface ListedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, refresh, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'DATA_ENTRY'>('DATA_ENTRY');
  const [addingUser, setAddingUser] = useState(false);
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Assalam o Alaikum, aap ki case update ki notification hai. Meherbani kar hamare saath rabta karein.');
  const [waCopied, setWaCopied] = useState(false);
  const [autoNotify, setAutoNotify] = useState(false);

  const [waStatus, setWaStatus] = useState<string>('DISCONNECTED');
  const [waMode, setWaMode] = useState<string>('direct');
  const [waLogs, setWaLogs] = useState<string[]>([]);
  const [waQueue, setWaQueue] = useState({ pending: 0, sent: 0, failed: 0 });
  const [waQrImg, setWaQrImg] = useState<string | null>(null);
  const [waConnecting, setWaConnecting] = useState(false);
  const [waCanConnect, setWaCanConnect] = useState(true);
  const [waCanDisconnect, setWaCanDisconnect] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console
  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [waLogs]);

  // Poll WA status every 5s when on whatsapp tab
  useEffect(() => {
    if (tab !== 'whatsapp') return;
    const poll = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setWaStatus(data.status ?? 'DISCONNECTED');
        setWaMode(data.mode ?? 'direct');
        if (data.logs) setWaLogs(data.logs);
        if (data.queueStats) setWaQueue(data.queueStats);
        setWaCanConnect(data.canConnect ?? true);
        setWaCanDisconnect(data.canDisconnect ?? false);
        // Fetch QR image if QR_READY
        if (data.status === 'QR_READY') {
          const qrRes = await fetch('/api/whatsapp/qr');
          const qrData = await qrRes.json();
          setWaQrImg(qrData.qrCode ?? null);
        } else {
          setWaQrImg(null);
        }
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [tab]);

  const connectWhatsApp = async () => {
    setWaConnecting(true);
    try {
      await fetch('/api/whatsapp/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' }),
      });
      setWaStatus('INITIALIZING');
    } finally { setWaConnecting(false); }
  };

  const disconnectWhatsApp = async () => {
    await fetch('/api/whatsapp/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect' }),
    });
    setWaStatus('DISCONNECTED');
    setWaQrImg(null);
  };

  const sendTestMessage = async () => {
    if (!waPhone.trim()) { setTestResult('Enter a phone number first'); return; }
    setSendingTest(true); setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waPhone, message: waMessage }),
      });
      const data = await res.json();
      if (data.success) { setTestResult('✅ Message sent directly via WhatsApp!'); }
      else if (data.link) {
        window.open(data.link, '_blank', 'noopener');
        setTestResult('🔗 Opened wa.me link (WA not connected — click link to send manually)');
      } else { setTestResult(`❌ ${data.error ?? 'Failed'}`); }
    } catch (e: any) { setTestResult(`❌ ${e.message}`); }
    finally { setSendingTest(false); }
  };

  const dispatchReminders = async (dryRun = false) => {
    setReminderLoading(true); setReminderResult(null);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) { setReminderResult(`❌ ${data.error}`); return; }
      const sent = data.results?.filter((r: any) => r.status === 'SENT' || r.status === 'DRY_RUN').length ?? 0;
      const noPhone = data.results?.filter((r: any) => r.status === 'NO_PHONE').length ?? 0;
      setReminderResult(
        dryRun
          ? `🔍 Dry run: ${sent} reminders would be sent, ${noPhone} skipped (no phone)`
          : `✅ ${sent} reminder(s) queued | ${noPhone} skipped (no phone)`
      );
    } catch (e: any) { setReminderResult(`❌ ${e.message}`); }
    finally { setReminderLoading(false); }
  };


  const openWhatsApp = () => {
    const digits = waPhone.replace(/\D/g, '');
    if (!digits) return;
    const intl = digits.startsWith('03') && digits.length === 11 ? '92' + digits.substring(1) : digits;
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyWaLink = () => {
    const digits = waPhone.replace(/\D/g, '');
    if (!digits) return;
    const intl = digits.startsWith('03') && digits.length === 11 ? '92' + digits.substring(1) : digits;
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(waMessage)}`;
    navigator.clipboard.writeText(url);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAutoNotify(localStorage.getItem('autoNotify') === 'true');
    }
  }, []);


  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (user?.avatarUrl) setPreview(user.avatarUrl);
    else setPreview(null);
  }, [user?.avatarUrl]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (tab === 'users' && isAdmin) void loadUsers();
  }, [tab, isAdmin, loadUsers]);

  const saveProfile = async () => {
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      await refresh();
      setProfileMsg('Display name updated.');
    } catch (e: unknown) {
      setProfileMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    setPwMsg(null);
    setSavingPw(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setCurrentPw('');
      setNewPw('');
      setPwMsg('Password updated successfully.');
    } catch (e: unknown) {
      setPwMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingPw(false);
    }
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 600_000) {
      setAvatarMsg('Image too large (max ~600KB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setPreview(dataUrl);
      setAvatarMsg(null);
      setSavingAvatar(true);
      try {
        const res = await fetch('/api/auth/avatar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ avatarUrl: dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed');
        await refresh();
        setAvatarMsg('Profile picture saved.');
      } catch (err: unknown) {
        setAvatarMsg(err instanceof Error ? err.message : 'Error');
      } finally {
        setSavingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = async () => {
    setSavingAvatar(true);
    setAvatarMsg(null);
    try {
      const res = await fetch('/api/auth/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ avatarUrl: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setPreview(null);
      await refresh();
      setAvatarMsg('Picture removed.');
    } catch (e: unknown) {
      setAvatarMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingAvatar(false);
    }
  };

  const addUser = async () => {
    setUserMsg(null);
    setAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim(),
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setNewEmail('');
      setNewName('');
      setNewUserPassword('');
      setUserMsg('User created.');
      await loadUsers();
    } catch (e: unknown) {
      setUserMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setAddingUser(false);
    }
  };

  const removeUser = async (id: string, email: string) => {
    if (!confirm(`Remove user ${email}? This cannot be undone.`)) return;
    setUserMsg(null);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setUserMsg('User removed.');
      await loadUsers();
    } catch (e: unknown) {
      setUserMsg(e instanceof Error ? e.message : 'Error');
    }
  };

  const avatarSrc =
    preview && preview.startsWith('data:')
      ? preview
      : user?.email
        ? `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`
        : undefined;

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary shrink-0" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profile, security, and administrator access.
        </p>
      </header>

      <div
        className="inline-flex p-1 rounded-2xl gap-1 flex-wrap"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-all ${
            tab === 'profile' ? 'text-primary-foreground shadow-md' : 'text-muted-foreground'
          }`}
          style={tab === 'profile' ? { background: '#2563EB' } : {}}
        >
          <User className="w-4 h-4" />
          Profile &amp; Security
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-all ${
              tab === 'users' ? 'text-primary-foreground shadow-md' : 'text-muted-foreground'
            }`}
            style={tab === 'users' ? { background: '#2563EB' } : {}}
          >
            <Shield className="w-4 h-4" />
            User Management
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab('whatsapp')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-all ${
            tab === 'whatsapp' ? 'text-primary-foreground shadow-md' : 'text-muted-foreground'
          }`}
          style={tab === 'whatsapp' ? { background: '#10B981' } : {}}
        >
          <Smartphone className="w-4 h-4" />
          WhatsApp Integration
        </button>
      </div>

      {tab === 'profile' && (
        <div className="space-y-10">
          <section
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-lg font-bold text-foreground mb-6">Profile picture</h2>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative">
                <img
                  src={avatarSrc || 'https://i.pravatar.cc/150?u=placeholder'}
                  alt=""
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-border"
                />
                {savingAvatar && (
                  <div className="absolute inset-0 rounded-2xl bg-background/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:opacity-95">
                    <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} disabled={savingAvatar} />
                    Upload image
                  </label>
                  <button
                    type="button"
                    onClick={() => void clearAvatar()}
                    disabled={savingAvatar}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-xs text-muted-foreground max-w-md">
                  Images are stored in the database as Base64 for this mock setup. Plug in blob storage later without changing UI.
                </p>
                {avatarMsg && (
                  <p className={`text-sm flex items-center gap-2 ${avatarMsg.includes('saved') || avatarMsg.includes('removed') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {avatarMsg.includes('saved') || avatarMsg.includes('removed')
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <AlertCircle className="w-4 h-4" />}
                    {avatarMsg}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-lg font-bold text-foreground mb-6">Display name</h2>
            <div className="max-w-md space-y-4">
              <div>
                <label className={labelCls}>Signed in as</label>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save name
              </button>
              {profileMsg && (
                <p className="text-sm text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {profileMsg}
                </p>
              )}
            </div>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-lg font-bold text-foreground mb-2">Change password</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Use a strong password you do not reuse elsewhere.
            </p>
            <div className="max-w-md space-y-4">
              <div>
                <label className={labelCls}>Current password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className={labelCls}>New password</label>
                <input
                  type="password"
                  className={inputCls}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="button"
                onClick={() => void savePassword()}
                disabled={savingPw || !currentPw || newPw.length < 8}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
              >
                {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Update password
              </button>
              {pwMsg && (
                <p className={`text-sm flex items-center gap-2 ${pwMsg.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {pwMsg.includes('success') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {pwMsg}
                </p>
              )}
            </div>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-lg font-bold text-foreground mb-2">Notification Preferences</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure background automated messages for your clients.
            </p>
            <div className="max-w-md space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500 bg-background"
                  checked={autoNotify}
                  onChange={(e) => {
                    setAutoNotify(e.target.checked);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('autoNotify', String(e.target.checked));
                    }
                  }}
                />
                <div>
                  <p className="text-sm font-bold text-foreground">Enable Auto-Notifications (WhatsApp/SMS)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically trigger message delivery when a hearing date is scheduled.</p>
                </div>
              </label>
            </div>
          </section>
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="space-y-8">
          <section className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Smartphone className="w-6 h-6 text-emerald-500" />
                  WhatsApp Integration
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Connect, manage, and dispatch hearing reminders.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status badge */}
                {waStatus === 'SERVERLESS' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"><Server className="w-3.5 h-3.5" /> Serverless</span>}
                {waStatus === 'CONNECTED' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> 🟢 CONNECTED</span>}
                {(waStatus === 'INITIALIZING' || waStatus === 'RECONNECTING') && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {waStatus}…</span>}
                {waStatus === 'QR_READY' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 animate-pulse"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> 🟡 SCAN QR CODE</span>}
                {waStatus === 'DISCONNECTED' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20"><AlertCircle className="w-3.5 h-3.5" /> 🔴 DISCONNECTED</span>}
                {/* Connect / Disconnect buttons */}
                {waCanConnect && (
                  <button onClick={() => void connectWhatsApp()} disabled={waConnecting} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {waConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                    {waConnecting ? 'Starting…' : 'Connect'}
                  </button>
                )}
                {waCanDisconnect && (
                  <button onClick={() => void disconnectWhatsApp()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 border border-rose-500/30 hover:bg-rose-500/10 transition-colors">
                    <PowerOff className="w-3.5 h-3.5" /> Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* QR Code panel */}
            {waStatus === 'QR_READY' && waQrImg && (
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-yellow-400/40 bg-yellow-500/5 mb-6">
                <p className="text-sm font-bold text-yellow-600 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Scan with WhatsApp on your phone
                </p>
                <img src={waQrImg} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl border-4 border-white shadow-xl" />
                <p className="text-xs text-muted-foreground text-center">Open WhatsApp → Three dots menu → Linked Devices → Link a Device</p>
              </div>
            )}

            {waStatus === 'INITIALIZING' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 mb-6">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-600">Starting WhatsApp client…</p>
                  <p className="text-xs text-muted-foreground">Launching Chromium browser. A QR code will appear shortly (30–60 seconds).</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="md:col-span-1 space-y-4">
                {/* Queue stats */}
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-primary" /> Message Queue</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-bold">{waQueue.pending}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sent</span><span className="font-bold text-emerald-600">{waQueue.sent}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Failed</span><span className="font-bold text-rose-600">{waQueue.failed}</span></div>
                  </div>
                </div>

                {/* Quick Send */}
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><MessageCircle className="w-4 h-4 text-primary" /> Quick Send</h3>
                  <div className="space-y-2">
                    <input id="wa-phone" className={inputCls} value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="03xx or +92xx..." type="tel" />
                    <textarea className={`${inputCls} resize-none text-xs`} rows={3} value={waMessage} onChange={e => setWaMessage(e.target.value)} />
                    {testResult && <p className="text-xs">{testResult}</p>}
                    <div className="flex gap-2">
                      <button id="wa-send-btn" type="button" onClick={() => void sendTestMessage()} disabled={sendingTest || !waPhone.trim()} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 transition-colors">
                        {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
                      </button>
                      <button type="button" onClick={openWhatsApp} disabled={!waPhone.trim()} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted disabled:opacity-50 transition-colors">
                        wa.me
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reminder Dispatch */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-1"><Bell className="w-4 h-4 text-emerald-500" /> Hearing Reminders</h3>
                  <p className="text-xs text-muted-foreground mb-3">Dispatch reminders for hearings in 1, 3, 7 days (Asia/Karachi)</p>
                  {reminderResult && <p className="text-xs mb-3 font-medium">{reminderResult}</p>}
                  <div className="flex gap-2">
                    <button id="reminder-dry-run" type="button" onClick={() => void dispatchReminders(true)} disabled={reminderLoading} className="flex-1 text-xs px-3 py-2 rounded-lg border border-border font-bold hover:bg-muted disabled:opacity-50">
                      {reminderLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : '🔍'} Dry Run
                    </button>
                    <button id="reminder-send" type="button" onClick={() => void dispatchReminders(false)} disabled={reminderLoading} className="flex-1 text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">
                      {reminderLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : <Zap className="w-3.5 h-3.5 inline" />} Send Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Console */}
              <div className="md:col-span-2">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col h-[460px]">
                  <div className="px-4 py-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-2"><Terminal className="w-3.5 h-3.5" /> Debug Console — {waMode} mode</span>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className={`w-2.5 h-2.5 rounded-full ${waStatus === 'CONNECTED' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    </div>
                  </div>
                  <div ref={logRef} className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 space-y-1">
                    {waLogs.length === 0 ? (
                      <span className="text-slate-600 italic">Waiting for logs…</span>
                    ) : (
                      waLogs.map((log, i) => (
                        <div key={i} className={`break-words ${log.includes('✅') ? 'text-emerald-400' : log.includes('❌') ? 'text-rose-400' : ''}`}>
                          {log.startsWith('[') ? (
                            <><span className="text-slate-500">{log.substring(0, log.indexOf(']') + 1)}</span><span className="ml-2">{log.substring(log.indexOf(']') + 1)}</span></>
                          ) : log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {/* Mode info bar */}
                <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
                  <span>📡 Mode: <strong className="text-foreground">{waMode === 'direct' ? 'Direct (whatsapp-web.js)' : 'Serverless (wa.me links)'}</strong></span>
                  <span>⏰ Reminders: <strong className="text-foreground">8 AM PKT daily</strong> (1, 3, 7 days before hearing)</span>
                  <span>💰 Fee reminders: <strong className="text-foreground">9 AM PKT daily</strong> (due soon + overdue)</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'users' && isAdmin && (
        <div className="space-y-8">
          <section
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add user
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className={labelCls}>Email (sign-in)</label>
                <input className={inputCls} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="person@firm.com" />
              </div>
              <div>
                <label className={labelCls}>Display name</label>
                <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Temporary password</label>
                <input type="password" className={inputCls} value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select className={inputCls} value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as typeof newUserRole)}>
                  <option value="DATA_ENTRY">Data Entry</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void addUser()}
              disabled={addingUser || !newEmail || !newName || newUserPassword.length < 8}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
            >
              {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create user
            </button>
            {userMsg && (
              <p className="text-sm mt-4 text-foreground/80">{userMsg}</p>
            )}
          </section>

          <section
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">All users</h2>
              {loadingUsers && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-muted-foreground text-[11px] uppercase font-bold border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium">{u.email}</td>
                      <td className="px-6 py-3">{u.name}</td>
                      <td className="px-6 py-3">{u.role}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void removeUser(u.id, u.email)}
                          disabled={u.id === user?.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 text-xs font-bold disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
