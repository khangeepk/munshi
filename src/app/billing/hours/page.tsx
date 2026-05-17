'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Square, Clock, DollarSign, FileText, ChevronDown, Loader2, AlertCircle } from 'lucide-react';

interface BillableSession {
  id: string; case_id: string; case: { title: string }; lawyer: { full_name: string };
  start_time: string; end_time: string | null; duration_mins: number | null;
  hourly_rate: number; notes: string | null; is_billed: boolean;
}

function formatMoney(val: number) { return `Rs. ${val.toLocaleString('en-PK')}`; }
function formatDur(mins: number) { const h = Math.floor(mins/60); const m = mins%60; return h > 0 ? `${h}h ${m}m` : `${m}m`; }

export default function BillableHoursPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [sessions, setSessions] = useState<BillableSession[]>([]);
  const [activeSession, setActiveSession] = useState<BillableSession | null>(null);
  const [selectedCase, setSelectedCase] = useState('');
  const [rate, setRate] = useState(5000);
  const [notes, setNotes] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const [cRes, sRes] = await Promise.all([fetch('/api/cases'), fetch('/api/billing/hours')]);
    if (cRes.ok) setCases(await cRes.json());
    if (sRes.ok) {
      const data: BillableSession[] = await sRes.json();
      setSessions(data);
      const running = data.find(s => !s.end_time);
      if (running) { setActiveSession(running); setElapsed(Math.floor((Date.now() - new Date(running.start_time).getTime()) / 1000)); }
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (activeSession) { timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); }
    else { if (timerRef.current) clearInterval(timerRef.current); setElapsed(0); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession]);

  const startTimer = async () => {
    if (!selectedCase) { setError('Please select a case.'); return; }
    setError(''); setLoading(true);
    const res = await fetch('/api/billing/hours', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', case_id: selectedCase, hourly_rate: rate, notes }) });
    if (res.ok) { setActiveSession(await res.json()); await fetchData(); } else setError((await res.json()).error);
    setLoading(false);
  };

  const stopTimer = async () => {
    if (!activeSession) return; setLoading(true);
    const res = await fetch('/api/billing/hours', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop', session_id: activeSession.id, notes }) });
    if (res.ok) { setActiveSession(null); await fetchData(); } else setError((await res.json()).error);
    setLoading(false);
  };

  const elapsedHrs = Math.floor(elapsed / 3600);
  const elapsedMins = Math.floor((elapsed % 3600) / 60);
  const elapsedSecs = elapsed % 60;
  const totalEarned = sessions.filter(s => s.end_time).reduce((s, h) => s + ((h.duration_mins ?? 0) / 60) * h.hourly_rate, 0);

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Billable Hours Tracker</h1>
          <p className="text-sm text-muted-foreground">Live timer — track time per client matter.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Completed Sessions', value: sessions.filter(s => s.end_time).length, icon: Timer },
          { label: 'Hours Logged', value: `${(sessions.reduce((s,h) => s+(h.duration_mins??0), 0)/60).toFixed(1)}h`, icon: Clock },
          { label: 'Total Revenue', value: formatMoney(totalEarned), icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(197,160,89,0.15)' }}>
              <Icon className="w-5 h-5" style={{ color: '#c5a059' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
              <p className="text-xl font-extrabold mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <h2 className="font-bold mb-5 flex items-center gap-2 text-base"><Timer className="w-4 h-4" style={{ color: '#c5a059' }} /> New Timer Session</h2>
        {error && <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Case *</label>
            <div className="relative">
              <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)} disabled={!!activeSession} className="w-full appearance-none bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50">
                <option value="">— Select case —</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Hourly Rate (PKR)</label>
            <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} disabled={!!activeSession} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50" />
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none resize-none" placeholder="Work being performed..." />
        </div>
        {activeSession && (
          <div className="text-center py-8 mb-5 rounded-2xl" style={{ background: 'linear-gradient(135deg,rgba(26,26,46,0.8),rgba(197,160,89,0.08))', border: '1px solid rgba(197,160,89,0.3)' }}>
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">⏱ Session Running</p>
            <p className="font-mono font-black text-5xl tracking-tight" style={{ color: '#c5a059' }}>
              {String(elapsedHrs).padStart(2,'0')}:{String(elapsedMins).padStart(2,'0')}:{String(elapsedSecs).padStart(2,'0')}
            </p>
            <p className="text-sm text-muted-foreground mt-3">Est. fee: <span className="font-bold text-foreground">{formatMoney((elapsed/3600)*rate)}</span></p>
          </div>
        )}
        {!activeSession
          ? <button onClick={startTimer} disabled={loading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start Timer</button>
          : <button onClick={stopTimer} disabled={loading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop & Save</button>
        }
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: '#c5a059' }} />
          <h2 className="font-bold text-base">Completed Sessions</h2>
        </div>
        {fetching ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          : sessions.filter(s => s.end_time).length === 0
          ? <div className="text-center py-12 text-muted-foreground text-sm">No sessions recorded yet.</div>
          : <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">{['Case','Date','Duration','Rate','Fee','Notes'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>{sessions.filter(s => s.end_time).map(s => {
                const fee = ((s.duration_mins ?? 0)/60) * s.hourly_rate;
                return <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-semibold">{s.case?.title ?? '—'}</td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(s.start_time).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(197,160,89,0.15)', color: '#c5a059' }}>{formatDur(s.duration_mins ?? 0)}</span></td>
                  <td className="px-5 py-3 text-muted-foreground">Rs. {s.hourly_rate.toLocaleString()}/hr</td>
                  <td className="px-5 py-3 font-bold">{formatMoney(fee)}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{s.notes || '—'}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
      </div>
    </div>
  );
}
