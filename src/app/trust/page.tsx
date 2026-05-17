'use client';
import { useState, useEffect, useCallback } from 'react';
import { Shield, TrendingUp, TrendingDown, PlusCircle, Loader2, AlertCircle, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface TrustAccount { id: string; client: { name: string; phone: string | null }; balance: number; currency: string; transactions: TrustTransaction[]; }
interface TrustTransaction { id: string; type: string; amount: number; description: string | null; reference_no: string | null; created_at: string; }

function formatMoney(v: number) { return `Rs. ${v.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`; }

export default function TrustPage() {
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<TrustAccount | null>(null);
  const [modal, setModal] = useState<'create' | 'transact' | null>(null);
  const [form, setForm] = useState({ client_id: '', type: 'DEPOSIT', amount: '', description: '', reference_no: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const fetchData = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([fetch('/api/trust'), fetch('/api/clients')]);
    if (aRes.ok) { const data = await aRes.json(); setAccounts(data); if (data.length > 0 && !selectedAccount) setSelectedAccount(data[0]); }
    if (cRes.ok) setClients(await cRes.json());
    setFetching(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateAccount = async () => {
    if (!form.client_id) return;
    setLoading(true);
    const res = await fetch('/api/trust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_account', client_id: form.client_id }) });
    setLoading(false);
    if (res.ok) { showToast('success', 'Trust account created!'); setModal(null); fetchData(); } else showToast('error', (await res.json()).error);
  };

  const handleTransact = async () => {
    if (!selectedAccount || !form.amount) return;
    setLoading(true);
    const res = await fetch('/api/trust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'transact', account_id: selectedAccount.id, type: form.type, amount: form.amount, description: form.description, reference_no: form.reference_no }) });
    setLoading(false);
    if (res.ok) { showToast('success', `${form.type} recorded!`); setModal(null); setForm(f => ({ ...f, amount: '', description: '', reference_no: '' })); fetchData(); } else showToast('error', (await res.json()).error);
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="min-h-screen">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}><Shield className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-2xl font-extrabold">IOLTA Trust Ledger</h1><p className="text-sm text-muted-foreground">Client trust funds — fully separated from firm revenue.</p></div>
        </div>
        <button onClick={() => setModal('create')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>
          <PlusCircle className="w-4 h-4" /> New Trust Account
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Client Accounts', value: accounts.length, icon: Shield },
          { label: 'Total Funds Held', value: formatMoney(totalBalance), icon: TrendingUp },
          { label: 'Total Transactions', value: accounts.reduce((s, a) => s + a.transactions.length, 0), icon: TrendingDown },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(197,160,89,0.15)' }}><Icon className="w-5 h-5" style={{ color: '#c5a059' }} /></div>
            <div><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</p><p className="text-xl font-extrabold mt-0.5">{value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account List */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-bold text-sm">Client Accounts</h2></div>
          {fetching ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            : accounts.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">No accounts yet.</div>
            : accounts.map(a => (
              <button key={a.id} onClick={() => setSelectedAccount(a)}
                className={`w-full text-left px-5 py-4 border-b border-border/50 transition-colors ${selectedAccount?.id === a.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'}`}>
                <p className="font-bold text-sm">{a.client.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatMoney(a.balance)}</p>
              </button>
            ))}
        </div>

        {/* Ledger Detail */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          {!selectedAccount ? <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Select an account to view ledger</div>
            : <>
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-bold">{selectedAccount.client.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Balance: <span className="font-bold text-foreground">{formatMoney(selectedAccount.balance)}</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm(f => ({ ...f, type: 'DEPOSIT' })); setModal('transact'); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
                    <ArrowDownCircle className="w-3.5 h-3.5" /> Deposit
                  </button>
                  <button onClick={() => { setForm(f => ({ ...f, type: 'WITHDRAWAL' })); setModal('transact'); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors">
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Withdraw
                  </button>
                </div>
              </div>
              {selectedAccount.transactions.length === 0
                ? <div className="text-center py-16 text-muted-foreground text-sm">No transactions yet.</div>
                : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-muted/50">{['Date','Type','Amount','Reference','Description'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody>{selectedAccount.transactions.map(t => (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${t.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{t.type}</span></td>
                        <td className={`px-5 py-3 font-bold ${t.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === 'DEPOSIT' ? '+' : '-'}{formatMoney(t.amount)}</td>
                        <td className="px-5 py-3 text-muted-foreground">{t.reference_no || '—'}</td>
                        <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{t.description || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>}
            </>}
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">{modal === 'create' ? 'New Trust Account' : `Record ${form.type}`}</h2>
            {modal === 'create' ? (
              <>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Select Client</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none mb-5">
                  <option value="">— Select client —</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-3"><button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border text-sm font-semibold hover:bg-muted">Cancel</button>
                  <button onClick={handleCreateAccount} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>{loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}</button></div>
              </>
            ) : (
              <>
                {['amount','description','reference_no'].map(field => (
                  <div key={field} className="mb-4">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">{field.replace('_',' ')}{field==='amount'?' *':''}</label>
                    <input type={field==='amount'?'number':'text'} value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                ))}
                <div className="flex gap-3"><button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border text-sm font-semibold hover:bg-muted">Cancel</button>
                  <button onClick={handleTransact} disabled={loading} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${form.type==='DEPOSIT'?'bg-emerald-600':'bg-rose-600'}`}>{loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : form.type}</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
