'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2, Lock, User, CheckCircle2, Shield, Smartphone, CalendarDays, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const inputCls =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('error') === 'account_suspended') {
        setError('Access Denied: Your account or tenant chamber has been suspended.');
      }
    }
  }, []);

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
        if (data.error === 'account_suspended') {
          setError('Access Denied: Your account or tenant chamber has been suspended.');
        } else {
          setError(typeof data.error === 'string' ? data.error : 'Sign-in failed');
        }
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
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      
      {/* ── Header / Navigation (Astra Style) ── */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-slate-800 dark:text-white text-base tracking-wide block leading-none">Pak Munshi</span>
              <span className="text-[9px] font-bold text-primary tracking-widest uppercase mt-0.5 block">LEGAL SUITE</span>
            </div>
          </div>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#courts" className="hover:text-primary transition-colors">Courts Supported</a>
            <a href="#security" className="hover:text-primary transition-colors">Security</a>
          </nav>

          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-3.5 h-3.5" />
              Secure Portal
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero Split Section ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 flex flex-col justify-center py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Left Column: Product pitch (Astra Style Typography) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-block text-xs font-bold text-primary tracking-wider uppercase bg-primary/10 px-3 py-1 rounded-md">
              Chamber Automation Platform
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
              Manage Your Legal Practice <br />
              <span className="text-primary">With Ultimate Simplicity</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Pak Munshi is a premium legal management suite designed specifically for advocates and chambers. Organize cases, track cause lists, record financial ledgers, and automate client communications.
            </p>

            {/* Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Generate daily printable Cause Lists instantly.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Send automatic hearing date reminders via WhatsApp/SMS.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Track client fee status, collections, and dues clearly.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Secure Login Form Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              className="w-full max-w-md rounded-2xl p-8 sm:p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
              style={{
                boxShadow: '0 20px 50px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Access Chamber</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Sign in with your user credentials to access LawyerSys.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    User ID / Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-userid"
                      name="userId"
                      autoComplete="username"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 pl-11 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="Enter email or user ID"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 pl-11 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 text-center">{error}</p>
                )}

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                  style={{ background: 'var(--primary)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* ── Feature Grid (Astra Style Cards) ── */}
      <section id="features" className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 py-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Built for Pakistan's Courts</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
              Everything Advocate chambers need to manage cases, clients, and munshis in one secure place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Cause List Automation</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Generate printable daily cause lists filtered for Islamabad High Court, Rawalpindi District Courts, or customized locations instantly.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">WhatsApp &amp; SMS Dispatch</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Send automatic messaging triggers to your clients containing hearing dates and case updates to save time and manual coordination.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Fee &amp; Collections Ledger</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Manage agreed case fees, collection histories, pending balance statements, and invoice status on a client-by-client basis.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-6 text-center bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80 transition-colors duration-300">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
          Designed and Developed by{' '}
          <span className="text-primary font-bold tracking-widest uppercase">SU TECH</span>
        </p>
      </footer>

    </div>
  );
}
