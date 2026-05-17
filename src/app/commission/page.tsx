'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, DollarSign, CheckCircle2, Clock, PlusCircle, Loader2, AlertCircle, ChevronDown } from 'lucide-react';

interface Commission {
  id: string; case: { title: string; case_status: string }; associate: { full_name: string; email: string };
  milestone: string; commission_pct: number; base_amount: number; commission_amt: number;
  status: string; paid_at: string | null; notes: string | null; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500',
  APPROVED: 'bg-blue-500/10 text-blue-500',
  PAID: 'bg-emerald-500/10 text-emerald-500',
};

function formatMoney(v: number) { return `Rs. ${v.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`; }

export default function CommissionPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [associates, setAssociates] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [totals, setTotals] = useState({ pending: 0, paid: 0 });
  const [form, setForm] = useState({ case_id: '', associate_id: '', milestone: 'HEARING_COMPLETED', commission_pct: 10, base_amount: '', notes: '' });

  const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const fetchData = useCallback(async () => {
    const [cRes, casRes, uRes] = await Promise.all([fetch('/api/commission'), fetch('/api/cases'), fetch('/api/users')]);
    if (cRes.ok) { const d = await cRes.json(); setCommissions(d.commissions); setTotals({ pending: d.totalPending, paid: d.totalPaid }); }
    if (casRes.ok) setCases(await casRes.json());
    if (uRes.ok) setAssociates(await uRes.json());
    setFetching(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.case_id || !form.associate_id || !form.base_amount) return;
    setLoading(true);
    const res = await fetch('/api/commission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...form }) });
    setLoading(false);
    if (res.ok) { showToast('success', 'Commission record created!'); setModal(false); fetchData(); } else showToast('error', (await res.json()).error);
  };

  const handleAction = async (id: string, action: 'approve' | 'mark_paid') => {
    setActionLoading(id + action);
    const res = await fetch('/api/commission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, commission_id: id }) });
    setActionLoading('');
    if (res.ok) { showToast('success', action === 'approve' ? 'Commission approved!' : 'Commission marked as paid!'); fetchData(); } else showToast('error', (await res.json()).error);
  };

  return (
    <div className="min-h-screen">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}><Users className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-2xl font-extrabold">Associate Commissions</h1><p className="text-sm text-muted-foreground">Automatic milestone-based payouts for associates.</p></div>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>
          <PlusCircle className="w-4 h-4" /> New Commission
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Records', value: commissions.length, icon: Users },
          { label: 'Pending Payouts', value: formatMoney(totals.pending), icon: Clock },
          { label: 'Total Paid Out', value: formatMoney(totals.paid), icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(197,160,89,0.15)' }}><Icon className="w-5 h-5" style={{ color: '#c5a059' }} /></div>
            <div><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</p><p className="text-xl font-extrabold mt-0.5">{value}</p></div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border"><h2 className="font-bold text-sm">Commission Ledger</h2></div>
        {fetching ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          : commissions.length === 0 ? <div className="text-center py-16 text-muted-foreground text-sm">No commission records yet.</div>
          : <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">{['Associate','Case','Milestone','Base','%','Commission','Status','Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>{commissions.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3"><p className="font-bold">{c.associate.full_name}</p><p className="text-xs text-muted-foreground">{c.associate.email}</p></td>
                  <td className="px-5 py-3 max-w-[150px] truncate font-semibold">{c.case.title}</td>
                  <td className="px-5 py-3"><span className="px-2 py-1 rounded-lg text-xs font-bold bg-muted">{c.milestone.replace(/_/g,' ')}</span></td>
                  <td className="px-5 py-3 text-muted-foreground">{formatMoney(c.base_amount)}</td>
                  <td className="px-5 py-3 font-bold" style={{ color: '#c5a059' }}>{c.commission_pct}%</td>
                  <td className="px-5 py-3 font-bold">{formatMoney(c.commission_amt)}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground'}`}>{c.status}</span></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {c.status === 'PENDING' && <button onClick={() => handleAction(c.id, 'approve')} disabled={actionLoading === c.id+'approve'} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-50">{actionLoading === c.id+'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}</button>}
                      {c.status === 'APPROVED' && <button onClick={() => handleAction(c.id, 'mark_paid')} disabled={actionLoading === c.id+'mark_paid'} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50">{actionLoading === c.id+'mark_paid' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark Paid'}</button>}
                      {c.status === 'PAID' && <span className="text-xs text-muted-foreground">{c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}</span>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">New Commission Record</h2>
            <div className="space-y-4">
              {[
                { label: 'Case *', field: 'case_id', type: 'select', options: cases.map((c: any) => ({ v: c.id, l: c.title })) },
                { label: 'Associate *', field: 'associate_id', type: 'select', options: associates.map((a: any) => ({ v: a.id, l: a.full_name || a.name })) },
                { label: 'Milestone', field: 'milestone', type: 'select', options: ['HEARING_COMPLETED','CASE_CLOSED','PAYMENT_RECEIVED','FILING_COMPLETE'].map(v => ({ v, l: v.replace(/_/g,' ') })) },
                { label: 'Base Amount (PKR) *', field: 'base_amount', type: 'number' },
                { label: 'Commission %', field: 'commission_pct', type: 'number' },
                { label: 'Notes', field: 'notes', type: 'text' },
              ].map(({ label, field, type, options }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">{label}</label>
                  {type === 'select'
                    ? <div className="relative"><select value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} className="w-full appearance-none bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none"><option value="">— Select —</option>{options?.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select><ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" /></div>
                    : <input type={type} value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none" />}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl border text-sm font-semibold hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>{loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
