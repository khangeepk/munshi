'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const inputCls =
  'w-full bg-muted border border-border rounded-xl px-4 py-3 pl-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userId.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Sign-in failed');
        return;
      }
      await refresh();
      let next = '/';
      if (typeof window !== 'undefined') {
        const q = new URLSearchParams(window.location.search).get('next');
        next = q && q.startsWith('/') && !q.startsWith('//') ? q : '/';
      }
      router.replace(next);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        className="w-full max-w-md rounded-2xl p-8 sm:p-10 shadow-2xl"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg mb-4">
            <Scale className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Administrator Login</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Sign in with your user ID and password to access LawyerSys.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              User ID
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="login-userid"
                name="userId"
                autoComplete="username"
                className={inputCls}
                placeholder="Enter your user ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={inputCls}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400 text-center">{error}</p>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none"
            style={{ background: '#2563EB' }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <footer className="w-full py-5 text-center mt-6">
        <p className="text-xs font-semibold text-muted-foreground/60 tracking-wider">
          Designed and Developed By{' '}
          <span className="text-blue-500 font-bold tracking-widest">Sami Khan</span>
        </p>
      </footer>
    </div>
  );
}
