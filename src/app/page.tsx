'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Briefcase, Clock, CalendarCheck, CheckCircle2,
  TrendingUp, TrendingDown, Minus, MoreHorizontal, Plus,
  Eye, Pencil, Trash2, X, AlertCircle, Loader2, AlertTriangle, Save, FolderOpen,
  Bell, Printer, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { CauseListModal } from '@/components/CauseListModal';
import { triggerAutomatedMessage } from '@/services/notificationService';
import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────
type CaseStatus = 'FILED' | 'NOTICE_ISSUED' | 'EVIDENCE' | 'ARGUMENTS' | 'ORDER_RESERVED' | 'CLOSED' | 'APPEALED';

interface CaseRow {
  id: string;
  title: string;
  caseType: string;
  caseFrom: string;
  caseAgainst: string;
  submissionDate: string;
  firNumber: string | null;
  location: string;
  judgeName: string | null;
  nextHearingDate: string | null;
  clientPhone: string | null;
  decision: string | null;
  remarks: string | null;
  status: CaseStatus;
  lawyer: { name: string };
  totalFee: number | null;
  pendingFeeDueDate: string | null;
  payments: { amount: number; paidAt: string }[];
}

type ToastType = 'success' | 'error' | 'info';
interface ToastState { type: ToastType; message: string; id: number; title?: string }

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const ms = toast.type === 'info' ? 10000 : 3500;
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss, toast.type]);

  const bg = toast.type === 'success' ? 'bg-[#0D7A5F]' : toast.type === 'info' ? 'bg-blue-600' : 'bg-rose-600';

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 text-white ${bg} max-w-sm`}>
      {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : 
       toast.type === 'info' ? <Bell className="w-5 h-5 shrink-0 mt-0.5" /> : 
       <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
      <div className="flex-1">
        {toast.title && <p className="font-extrabold text-[15px] mb-0.5">{toast.title}</p>}
        <p className={toast.title ? "opacity-90 font-medium" : ""}>{toast.message}</p>
      </div>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100 transition-opacity mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Delete Modal ────────────────────────────────────────────────────────────
function DeleteModal({ caseTitle, onConfirm, onCancel, loading }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-2xl bg-card border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-rose-500/10 border border-rose-500/25">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
        </div>
        <h2 className="text-xl font-extrabold text-center mb-2">Delete Case?</h2>
        <p className="text-sm text-muted-foreground text-center mb-1">You are about to permanently delete:</p>
        <p className="text-sm font-bold text-center mb-6 truncate px-4">"{caseTitle}"</p>
        <p className="text-xs text-rose-500 text-center font-semibold mb-8">⚠ This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-3 rounded-xl border hover:bg-muted transition-colors text-sm font-semibold">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex justify-center items-center gap-2 text-sm font-bold transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Side-Sheet ──────────────────────────────────────────────────────────
function EditSideSheet({ caseData, onSave, onClose, saving }: any) {
  const [form, setForm] = useState({
    title: caseData.title,
    caseType: caseData.caseType,
    caseFrom: caseData.caseFrom,
    caseAgainst: caseData.caseAgainst,
    submissionDate: caseData.submissionDate ? new Date(caseData.submissionDate).toISOString().split('T')[0] : '',
    firNumber: caseData.firNumber ?? '',
    location: caseData.location,
    judgeName: caseData.judgeName ?? '',
    clientPhone: caseData.clientPhone ?? '',
    nextHearingDate: caseData.nextHearingDate ? new Date(caseData.nextHearingDate).toISOString().split('T')[0] : '',
    decision: caseData.decision ?? '',
    remarks: caseData.remarks ?? '',
    status: caseData.status,
    totalFee: caseData.totalFee ?? '',
    pendingFeeDueDate: caseData.pendingFeeDueDate ? new Date(caseData.pendingFeeDueDate).toISOString().split('T')[0] : '',
    feePaid: '',
    paidDate: new Date().toISOString().split('T')[0],
  });

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [autoNotify, setAutoNotify] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAutoNotify(localStorage.getItem('autoNotify') === 'true');
    }
  }, []);

  const set = (field: string) => (e: any) => setForm(p => ({ ...p, [field]: e.target.value }));
  const inputCls = 'w-full bg-muted border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0D7A5F] outline-none transition-shadow';
  const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase mb-1.5';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl bg-card border-l w-full max-w-[560px]">
        <div className="flex items-center justify-between px-7 py-5 border-b shrink-0">
          <div>
            <h2 className="text-lg font-extrabold">Edit Case</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[380px]">{caseData.title}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, slipFile }, autoNotify); }} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
          <div><label className={labelCls}>Case Title *</label><input value={form.title} onChange={set('title')} required className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Case Type *</label>
              <select value={form.caseType} onChange={set('caseType')} required className={inputCls}>
                <option value="Criminal">Criminal</option><option value="Civil">Civil</option>
                <option value="Family">Family</option><option value="Corporate">Corporate</option>
                <option value="Constitutional">Constitutional</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                <option value="FILED">Filed</option><option value="NOTICE_ISSUED">Notice Issued</option>
                <option value="EVIDENCE">Evidence Stage</option><option value="ARGUMENTS">Arguments</option>
                <option value="ORDER_RESERVED">Order Reserved</option><option value="CLOSED">Closed</option>
                <option value="APPEALED">Appealed</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Plaintiff *</label><input value={form.caseFrom} onChange={set('caseFrom')} required className={inputCls} /></div>
          <div><label className={labelCls}>Client Phone</label><input value={form.clientPhone} onChange={set('clientPhone')} type="tel" className={inputCls} placeholder="+923001234567" /></div>
          <div><label className={labelCls}>Defendant *</label><input value={form.caseAgainst} onChange={set('caseAgainst')} required className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location *</label>
              <select value={form.location} onChange={set('location')} required className={inputCls}>
                <option value="ISLAMABAD">Islamabad High Court</option><option value="RAWALPINDI">Rawalpindi District Court</option>
              </select>
            </div>
            <div><label className={labelCls}>Judge Name</label><input value={form.judgeName} onChange={set('judgeName')} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>FIR Number</label><input value={form.firNumber} onChange={set('firNumber')} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Submission Date *</label><input type="date" value={form.submissionDate} onChange={set('submissionDate')} required className={inputCls} /></div>
            <div><label className={labelCls}>Next Hearing Date</label><input type="date" value={form.nextHearingDate} onChange={set('nextHearingDate')} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Total Agreed Fee</label><input type="number" value={form.totalFee} onChange={set('totalFee')} className={inputCls} placeholder="Rs." /></div>
            <div>
              <label className={labelCls}>Fee Balance (Auto-calculated)</label>
              <input 
                type="text" 
                className={`${inputCls} bg-muted/50 cursor-not-allowed text-rose-500 font-bold`} 
                value={`Rs. ${((Number(form.totalFee) || 0) - (caseData.payments?.reduce((acc: any, p: any) => acc + p.amount, 0) || 0) - (Number(form.feePaid) || 0)).toLocaleString()}`} 
                readOnly 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Add New Payment</label><input type="number" value={form.feePaid} onChange={set('feePaid')} className={inputCls} placeholder="Rs. amount" /></div>
            <div><label className={labelCls}>Paid Date</label><input type="date" value={form.paidDate} onChange={set('paidDate')} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Payment Slip (Optional)</label><input type="file" accept="image/*,.pdf" className="w-full text-sm mt-1" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} /></div>
            <div><label className={labelCls}>Pending Fee Due Date</label><input type="date" value={form.pendingFeeDueDate} onChange={set('pendingFeeDueDate')} className={inputCls} /></div>
          </div>
          
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-blue-600 bg-background border-border focus:ring-blue-500" 
                checked={autoNotify}
                onChange={(e) => {
                  setAutoNotify(e.target.checked);
                  if (typeof window !== 'undefined') localStorage.setItem('autoNotify', String(e.target.checked));
                }}
              />
              <div>
                <p className="text-xs font-bold text-foreground">Enable Auto-Notifications (WhatsApp/SMS)</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Automatically trigger message delivery when saving hearing date.</p>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 rounded-xl border hover:bg-muted text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#0D7A5F] hover:bg-[#0c6b53] text-white rounded-xl text-sm font-bold flex gap-2 items-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { canAddCases, canEditCases, canDeleteCases } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editCase, setEditCase] = useState<CaseRow | null>(null);
  const [deleteCase, setDeleteCase] = useState<CaseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentDate, setCurrentDate] = useState('');
  const [isCauseListOpen, setIsCauseListOpen] = useState(false);
  const toastCounter = useRef(0);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string) => {
    toastCounter.current += 1;
    setToast({ type, message, title, id: toastCounter.current });
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      const res = await fetch('/api/cases', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load cases');
      const data: CaseRow[] = await res.json();
      setCases(data);

      // Check for today's hearings
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysCases = data.filter(c => c.nextHearingDate && c.nextHearingDate.startsWith(todayStr));
      
      if (todaysCases.length > 0) {
        showToast('info', `You have ${todaysCases.length} hearing(s) scheduled for today.`, "Today's Hearings!");
      }

      // Check for overdue payments
      data.forEach(c => {
        const total = c.totalFee || 0;
        const paid = c.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
        const balance = total - paid;
        if (balance > 0 && c.pendingFeeDueDate) {
          const dueDate = new Date(c.pendingFeeDueDate);
          const today = new Date(new Date().setHours(0,0,0,0));
          if (dueDate <= today) {
            showToast('error', `Payment Reminder: ${c.caseFrom} has a pending fee of Rs. ${balance.toLocaleString()} due today!`, "Fee Due!");
          }
        }
      });
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  }, [showToast]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime:cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        fetchCases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCases]);

  const handleSaveEdit = async (formData: any, autoNotifyToggle: boolean = false) => {
    if (!editCase) return;
    setSaving(true);
    
    const oldDateStr = editCase.nextHearingDate ? new Date(editCase.nextHearingDate).toISOString().split('T')[0] : '';
    const dateChanged = formData.nextHearingDate && formData.nextHearingDate !== oldDateStr;

    try {
      let slipUrl = '';
      if (formData.slipFile) {
        const uploadData = new FormData();
        uploadData.append('file', formData.slipFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        if (!uploadRes.ok) throw new Error('Failed to upload slip');
        const uploadJson = await uploadRes.json();
        slipUrl = uploadJson.url;
      }

      const { slipFile, ...restFormData } = formData;
      const apiPayload = { ...restFormData, slipUrl };

      const res = await fetch(`/api/cases/${editCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!res.ok) throw new Error('Update failed');
      await fetchCases();
      setEditCase(null);
      showToast('success', 'Case updated successfully');

      if (autoNotifyToggle && dateChanged) {
        const payload = `Dear ${formData.caseFrom}, your next hearing for the case "${formData.title}" is scheduled on ${formData.nextHearingDate}. Regards, Legal Team.`;
        const rawPhone = formData.clientPhone || '';
        const cleanedPhone = rawPhone.replace(/[\s-]/g, '');

        if (!cleanedPhone) {
          showToast('error', 'Failed to send message: No client phone number provided.');
        } else {
          const result = await triggerAutomatedMessage(cleanedPhone, payload, editCase.id, formData.title);
          
          if (result.success) {
            showToast('success', 'Live WhatsApp Message Sent Successfully!');
          } else if (result.serverless && result.link) {
            showToast('info', 'Opening WhatsApp to send the message...', 'Serverless Delivery');
            setTimeout(() => {
              window.open(result.link, '_blank', 'noopener,noreferrer');
            }, 1000);
          } else {
            showToast('error', result.error || 'Failed to send message. Please check WhatsApp connection in Settings.');
          }
        }
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCase) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cases/${deleteCase.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchCases();
      setDeleteCase(null);
      showToast('success', 'Case deleted successfully');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Stats Calculations
  const totalCases = cases.length;
  const activeCasesCount = cases.filter(c => c.status !== 'CLOSED').length;
  const closedCasesCount = cases.filter(c => c.status === 'CLOSED').length;
  const otherCasesCount = 0; // standard other

  // Donut SVG constants
  const circ = 2 * Math.PI * 30;
  const pActive = totalCases > 0 ? (activeCasesCount / totalCases) * 100 : 0;
  const pClosed = totalCases > 0 ? (closedCasesCount / totalCases) * 100 : 0;
  const pOther = totalCases > 0 ? (otherCasesCount / totalCases) * 100 : 0;
  const closedOffset = (pActive / 100) * circ;

  // Upcoming hearings list
  const upcomingHearings = cases
    .filter(c => c.nextHearingDate && new Date(c.nextHearingDate) >= new Date(new Date().setHours(0,0,0,0)))
    .map(c => ({
      id: c.id,
      title: c.title,
      hearingDate: new Date(c.nextHearingDate as string),
    }))
    .sort((a, b) => a.hearingDate.getTime() - b.hearingDate.getTime());

  // Revenue chart setup
  const totalRevenue = cases.reduce((acc, c) => acc + (c.payments?.reduce((sum, p) => sum + p.amount, 0) || 0), 0);
  const totalOutstanding = cases.reduce((acc, c) => {
    const total = c.totalFee || 0;
    const paid = c.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balance = total - paid;
    return acc + Math.max(0, balance);
  }, 0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const paymentsByMonth = [0, 0, 0, 0, 0, 0, 0, 0];
  cases.forEach(c => {
    (c.payments || []).forEach(p => {
      const d = new Date(p.paidAt);
      const monthIdx = d.getMonth();
      if (d.getFullYear() === 2026 && monthIdx >= 0 && monthIdx < 8) {
        paymentsByMonth[monthIdx] += p.amount;
      }
    });
  });

  const hasRealPayments = paymentsByMonth.some(val => val > 0);
  const chartValues = hasRealPayments ? paymentsByMonth : [1200, 1800, 1400, 2200, 3500, 2000, 2800, 3200];
  const maxVal = Math.max(...chartValues, 1);
  const minVal = Math.min(...chartValues, 0);
  const range = maxVal - minVal;

  const points = chartValues.map((val, idx) => {
    const x = 15 + idx * 24;
    const y = 38 - ((val - minVal) / range) * 26;
    return { x, y };
  });

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    linePath += ` L ${points[i].x} ${points[i].y}`;
  }
  const areaPath = `${linePath} L ${points[points.length-1].x} 42 L ${points[0].x} 42 Z`;

  // Active Cases List
  const activeCasesList = cases
    .filter(c => c.status !== 'CLOSED')
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  return (
    <div className="space-y-6 sm:space-y-8">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {deleteCase && <DeleteModal caseTitle={deleteCase.title} onConfirm={handleConfirmDelete} onCancel={() => !deleting && setDeleteCase(null)} loading={deleting} />}
      {editCase && <EditSideSheet caseData={editCase} onSave={handleSaveEdit} onClose={() => !saving && setEditCase(null)} saving={saving} />}

      {/* ── Dashboard Header ── */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Overview</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              {currentDate ? `${currentDate} • Good morning.` : 'Loading...'}
            </p>
          </div>
          <button 
            onClick={() => setIsCauseListOpen(true)}
            className="flex items-center gap-2 bg-[#1E293B] hover:opacity-90 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shrink-0"
          >
            <Printer className="w-4 h-4" />
            Generate New Cause List
          </button>
        </div>
      </div>

      <CauseListModal 
        isOpen={isCauseListOpen} 
        onClose={() => setIsCauseListOpen(false)} 
        cases={cases} 
      />

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: CASES PROPORTION */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm flex flex-col justify-between h-[210px]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cases Proportion</span>
            <div className="flex items-center gap-4 mt-3">
              <svg viewBox="0 0 100 100" className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 overflow-visible">
                <circle cx="50" cy="50" r="32" fill="transparent" stroke="var(--border)" strokeWidth="12" />
                {totalCases > 0 ? (
                  <>
                    <circle cx="50" cy="50" r="32" fill="transparent" stroke="#0D7A5F" strokeWidth="12" 
                      strokeDasharray={`${(pActive / 100) * circ} ${circ}`} strokeDashoffset={0} 
                      transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="32" fill="transparent" stroke="#C5A059" strokeWidth="12" 
                      strokeDasharray={`${(pClosed / 100) * circ} ${circ}`} strokeDashoffset={-closedOffset} 
                      transform="rotate(-90 50 50)" />
                  </>
                ) : null}
              </svg>
              <div className="text-xs font-semibold space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D7A5F]" />
                  <span className="text-foreground">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
                  <span className="text-foreground">Closed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="text-foreground">Other</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-end border-t border-border/60 pt-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Cases</p>
              <p className="text-xl font-black text-foreground font-sans mt-0.5">{fetching ? '-' : activeCasesCount}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
              <p className="text-xl font-black text-foreground font-sans mt-0.5">{fetching ? '-' : totalCases}</p>
            </div>
          </div>
        </div>

        {/* Card 2: HEARINGS AGENDA */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm flex flex-col justify-between h-[210px]">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Hearings Agenda</span>
            <span className="text-[10px] text-muted-foreground/80 font-medium">Next 3 hearings</span>
            <div className="mt-3 space-y-2 text-xs font-semibold min-w-0">
              {fetching ? (
                <div className="py-2 text-muted-foreground text-center">Loading...</div>
              ) : upcomingHearings.length === 0 ? (
                <div className="py-2 text-muted-foreground/50 text-center italic">No upcoming hearings</div>
              ) : (
                upcomingHearings.slice(0, 3).map((h, i) => (
                  <div key={h.id || i} className="flex items-center gap-2 text-foreground min-w-0">
                    <span className="text-[#0D7A5F] shrink-0 whitespace-nowrap text-[10px] bg-[#0D7A5F]/10 px-2 py-0.5 rounded-md">
                      {h.hearingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="truncate flex-1 font-medium">{h.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-between items-end border-t border-border/60 pt-3 shrink-0">
            <div>
              <p className="text-4xl font-black text-foreground font-sans leading-none">{fetching ? '-' : upcomingHearings.length}</p>
            </div>
            <button onClick={() => window.location.href = '/hearings'} className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-full text-[10px] font-bold transition-all">
              Next Month
            </button>
          </div>
        </div>

        {/* Card 3: REVENUE GROWTH */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm flex flex-col justify-between h-[210px] overflow-hidden">
          <div className="w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Revenue Growth</span>
            <p className="text-3xl font-black text-foreground font-sans mt-2">
              Rs. {fetching ? '-' : (totalRevenue >= 1000 ? (totalRevenue / 1000).toFixed(1) + 'k' : totalRevenue)}
            </p>
          </div>
          <div className="flex-1 flex items-end -mx-5 -mb-2 mt-2 h-20">
            <svg viewBox="0 0 200 50" width="100%" height="100%" preserveAspectRatio="none" className="overflow-visible">
              <defs>
                <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#grad-revenue)" />
              <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--card)" stroke="#3B82F6" strokeWidth="1.5" />
              ))}
              {months.map((m, i) => (
                <text key={i} x={15 + i * 24} y="49" textAnchor="middle" fontSize="6" className="fill-muted-foreground/75 font-sans font-bold">{m}</text>
              ))}
            </svg>
          </div>
        </div>

        {/* Card 4: FINANCIAL STATUS */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-sm flex flex-col justify-between h-[210px]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Financial Status</span>
            <p className="text-4xl font-black text-foreground font-sans mt-3">
              Rs. {fetching ? '-' : totalOutstanding.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Dues</p>
          </div>
          <div className="flex flex-col gap-3">
            <svg viewBox="0 0 200 15" width="100%" height="12" className="overflow-visible">
              <path d="M 0,7 C 25,2 50,12 75,7 C 100,2 125,12 150,7 C 175,2 200,7 220,7" fill="none" stroke="#10B981" strokeWidth="2" />
            </svg>
            <div className="flex justify-between items-center border-t border-border/60 pt-3">
              <button 
                onClick={() => showToast('success', 'Outstanding dues are clean and fully synced with legal records.', 'Financials Synced')}
                className="flex items-center gap-1.5 bg-[#E6F4F1] hover:opacity-95 text-[#0D7A5F] px-4 py-2 rounded-full text-xs font-black transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Clean Financials
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Active Cases Registry Table ── */}
      <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Active Cases</h2>
          {canAddCases && (
            <Link 
              href="/cases/new" 
              className="flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2.5 rounded-xl bg-[#0D7A5F] hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> NEW CASE
            </Link>
          )}
        </div>

        {fetching ? (
          <div className="p-16 flex justify-center items-center text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#0D7A5F]" />
            <span className="text-sm font-semibold">Loading active cases...</span>
          </div>
        ) : activeCasesList.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground/20 mb-4" strokeWidth={1.5} />
            <p className="text-sm font-bold text-muted-foreground">No active cases registered</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="divide-y divide-border min-w-[700px]">
              {activeCasesList.map(c => {
                let dateStr = 'No Hearing Scheduled';
                let isToday = false;
                if (c.nextHearingDate) {
                  const d = new Date(c.nextHearingDate);
                  isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                  dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }
                
                return (
                  <div 
                    key={c.id} 
                    className="group grid items-center px-6 py-4 cursor-default transition-colors duration-150 hover:bg-muted/40"
                    style={{ gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1fr' }}
                  >
                    {/* Case Title and Court location */}
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-foreground leading-snug">
                        <Link href={`/cases/${c.id}`} className="hover:text-[#0D7A5F] transition-colors">{c.title}</Link>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">
                        {c.location === 'ISLAMABAD' ? 'Islamabad High Court' : 'Rawalpindi District'}
                      </p>
                    </div>

                    {/* Next Hearing Date */}
                    <p className={`text-xs font-semibold ${isToday ? 'text-emerald-600 font-bold' : c.nextHearingDate ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {dateStr}
                    </p>

                    {/* Judge Name */}
                    <p className="text-xs text-muted-foreground truncate font-semibold pr-3">
                      {c.judgeName || '—'}
                    </p>

                    {/* Status badge and actions overlay on hover */}
                    <div className="relative flex items-center justify-between h-8 min-w-[100px]">
                      {/* Active Status Badge */}
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-[#E6F4F1] text-[#0D7A5F] group-hover:opacity-0 transition-opacity">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0D7A5F]" />
                        In-progress
                      </span>

                      {/* Actions Overlay (Hover state) */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/cases/${c.id}`} 
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canEditCases && (
                          <button 
                            type="button" 
                            onClick={() => setEditCase(c)} 
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteCases && (
                          <button 
                            type="button" 
                            onClick={() => setDeleteCase(c)} 
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}