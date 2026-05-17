'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, Copy, RefreshCw, Database, Key, Globe } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  urdu: string;
  done: boolean;
}

const STEPS: Step[] = [
  { id: 1, title: 'Go to supabase.com and sign in', urdu: 'Supabase par login karein', done: false },
  { id: 2, title: 'Open your project (JR TMS or create new)', urdu: 'Apna project kholen', done: false },
  { id: 3, title: 'Click Settings → API → copy Project URL + anon key', urdu: 'API settings se URL aur key copy karein', done: false },
  { id: 4, title: 'Click Settings → Database → copy both connection strings', urdu: 'Database strings copy karein', done: false },
  { id: 5, title: 'Add all 4 values to Netlify Environment Variables', urdu: 'Netlify par set karein', done: false },
  { id: 6, title: 'Netlify will auto-redeploy and everything works!', urdu: 'Netlify apne aap rebuild ho ga', done: false },
];

const ENV_VARS = [
  {
    key: 'DATABASE_URL',
    label: 'Database URL (Pooler/Transaction — Port 6543)',
    example: 'postgresql://postgres.YOURREF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    icon: Database,
    color: '#6366f1',
  },
  {
    key: 'DIRECT_URL',
    label: 'Direct URL (Session mode — Port 5432)',
    example: 'postgresql://postgres.YOURREF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
    icon: Database,
    color: '#8b5cf6',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    label: 'Supabase Project URL',
    example: 'https://abcdefghij.supabase.co',
    icon: Globe,
    color: '#06b6d4',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    label: 'Supabase Anon/Public Key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    icon: Key,
    color: '#f59e0b',
  },
];

export default function SetupPage() {
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState('');
  const [steps, setSteps] = useState(STEPS);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
      if (data.ok) {
        // Redirect to dashboard after 2 seconds if configured
        setTimeout(() => { window.location.href = '/'; }, 2000);
      }
    } catch { setHealth(null); }
    setChecking(false);
  };

  useEffect(() => { checkHealth(); }, []);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const toggleStep = (id: number) => {
    setSteps(s => s.map(step => step.id === id ? { ...step, done: !step.done } : step));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)' }}>
      {/* Header */}
      <header className="px-6 py-5 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>
              <span className="text-white font-black text-sm">SQ</span>
            </div>
            <div>
              <p className="font-black text-white text-sm tracking-wide">PakMunshi — SQ Tech</p>
              <p className="text-xs text-white/40 uppercase tracking-widest">Lawyer Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <XCircle className="w-3.5 h-3.5" /> Configuration Required
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-10 h-10 text-rose-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Database Not Connected</h1>
            <p className="text-white/50 max-w-lg mx-auto text-sm leading-relaxed">
              Aap ka app bilkul theek hai — sirf Supabase database credentials set karna baqi hai.
              Yeh karo aur sab kuch automatically kaam karna shuru ho jayega.
            </p>
          </div>

          {/* Health Status Card */}
          <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">Environment Variable Status</h2>
              <button onClick={checkHealth} disabled={checking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} /> Check Again
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ENV_VARS.map(({ key, icon: Icon, color }) => {
                const status = health?.checks?.[key];
                const isSet = status === 'set';
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isSet ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white/70 font-mono truncate">{key}</p>
                    </div>
                    {isSet
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
            {health?.ok && (
              <div className="mt-4 p-3 rounded-xl text-center text-sm font-bold text-emerald-400" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                ✅ All configured! Redirecting to dashboard...
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Step by Step */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-base font-black text-white mb-5">📋 Steps to Fix (Tick as you go)</h2>
              <div className="space-y-3">
                {steps.map(step => (
                  <label key={step.id} className="flex items-start gap-3 cursor-pointer group" onClick={() => toggleStep(step.id)}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${step.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 group-hover:border-white/50'}`}>
                      {step.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold transition-colors ${step.done ? 'text-white/40 line-through' : 'text-white/80'}`}>{step.title}</p>
                      <p className="text-xs text-white/30 mt-0.5">{step.urdu}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-base font-black text-white mb-5">🔗 Quick Links</h2>
              <div className="space-y-3">
                {[
                  { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard', desc: 'Get your project credentials' },
                  { label: 'Netlify Environment Vars', url: 'https://app.netlify.com', desc: 'Site Settings → Environment Variables' },
                  { label: 'GitHub Repository', url: 'https://github.com/khangeepk/munshi', desc: 'View latest code' },
                  { label: 'Live App (after config)', url: 'https://pakmunshi.netlify.app', desc: 'Your deployed app' },
                ].map(({ label, url, desc }) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl group transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-sm font-bold text-white/80 group-hover:text-white">{label}</p>
                      <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/60" />
                  </a>
                ))}
              </div>

              {/* Netlify Env Var Setup Guide */}
              <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.2)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: '#c5a059' }}>📌 Netlify mein set karne ka tarika:</p>
                <ol className="text-xs text-white/50 space-y-1 list-decimal list-inside">
                  <li>app.netlify.com → Your Site</li>
                  <li>Site configuration → Environment variables</li>
                  <li>Click "Add a variable"</li>
                  <li>Add all 4 variables below</li>
                  <li>Click "Save" → Deploys → Trigger deploy</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Env Var Reference */}
          <div className="mt-6 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-base font-black text-white mb-5">📝 Environment Variables Reference</h2>
            <p className="text-xs text-white/40 mb-4">Yeh 4 variables Netlify mein add karne hain. Actual values Supabase → Settings → API / Database se milain gi.</p>
            <div className="space-y-4">
              {ENV_VARS.map(({ key, label, example, icon: Icon, color }) => (
                <div key={key} className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                    <p className="text-xs font-bold text-white/70">{label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-white/40 break-all">{key}=</code>
                    <button onClick={() => copyText(key, key)} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border border-white/10 hover:border-white/20 text-white/50 hover:text-white transition-all">
                      <Copy className="w-3 h-3" /> {copied === key ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-white/20 font-mono mt-1 break-all">{example}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-5 text-xs text-white/20" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        Designed and Developed by <span className="text-white/40 font-bold">SQ Tech</span>
      </footer>
    </div>
  );
}
