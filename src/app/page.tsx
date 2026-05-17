'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Briefcase, Clock, CalendarCheck, CheckCircle2,
  TrendingUp, TrendingDown, Minus, MoreHorizontal, Plus,
  Eye, Pencil, Trash2, X, AlertCircle, Loader2, AlertTriangle, Save, FolderOpen,
  Bell, Printer
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { CauseListModal } from '@/components/CauseListModal';
import { triggerAutomatedMessage } from '@/services/notificationService';
import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────
type Trend = 'up' | 'down' | 'neutral';
type Tag   = 'Civil' | 'Criminal' | 'Family' | 'Corporate' | 'Constitutional' | string;
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
  payments: { amount: number }[];
}

// ─── Shared UI components (Toast, Modals) copied from cases/page ─────────────────
type ToastType = 'success' | 'error' | 'info';
interface ToastState { type: ToastType; message: string; id: number; title?: string }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    // Info toasts (like hearings) stay longer
    const ms = toast.type === 'info' ? 10000 : 3500;
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss, toast.type]);

  const bg = toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-rose-600';

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
  const inputCls = 'w-full bg-muted border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-shadow';
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
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex gap-2 items-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── SVG Sparkline ───────────────────────────────────────────────────────────
function Sparkline({ path, color }: { path: string; color: string }) {
  return (
    <div className="w-full h-10 overflow-hidden">
      <svg viewBox="0 0 120 36" width="100%" height="40" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L120,36 L0,36 Z`} fill={`url(#sg-${color.replace('#','')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
      </svg>
    </div>
  );
}

// ─── Tag colors ──────────────────────────────────────────────────────────────
const tagStyles: Record<string, { bg: string; text: string }> = {
  Civil:     { bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
  Criminal:  { bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
  Family:    { bg: 'rgba(139,92,246,0.15)',  text: '#A78BFA' },
  Corporate: { bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D' },
  Constitutional: { bg: 'rgba(16,185,129,0.15)', text: '#34D399' },
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { canModifyRecords } = useAuth();
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

      // Check for today's hearings and show a popup
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
    
    // Check if the hearing date is being set/updated
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

      // Remove slipFile from JSON body, add slipUrl
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

      // Trigger Automated Background Notification
      if (autoNotifyToggle && dateChanged) {
        const payload = `Dear ${formData.caseFrom}, your next hearing for the case "${formData.title}" is scheduled on ${formData.nextHearingDate}. Regards, Legal Team.`;
        
        // Clean phone number (remove spaces, dashes)
        const rawPhone = formData.clientPhone || '';
        const cleanedPhone = rawPhone.replace(/[\s-]/g, '');

        if (!cleanedPhone) {
          showToast('error', 'Failed to send message: No client phone number provided.');
        } else {
          // Await the real API execution
          const result = await triggerAutomatedMessage(cleanedPhone, payload, editCase.id, formData.title);
          
          if (result.success) {
            showToast('success', 'Live WhatsApp Message Sent Successfully!');
          } else if (result.serverless && result.link) {
            showToast('info', 'Opening WhatsApp to send the message...', 'Serverless Delivery');
            // Auto-open wa.me link so the user just has to hit send
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

  const activeCasesCount = cases.filter(c => c.status !== 'CLOSED').length;
  const upcomingHearingsCount = cases.filter(c => c.nextHearingDate).length;
  const closedCasesCount = cases.filter(c => c.status === 'CLOSED').length;

  const totalRevenue = cases.reduce((acc, c) => acc + (c.payments?.reduce((sum, p) => sum + p.amount, 0) || 0), 0);
  const totalOutstanding = cases.reduce((acc, c) => {
    const total = c.totalFee || 0;
    const paid = c.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balance = total - paid;
    return acc + Math.max(0, balance);
  }, 0);

  const stats = [
    { label: 'Total Cases', value: fetching ? '-' : cases.length.toString(), icon: Briefcase, borderColor: '#3B82F6', sparkPath: 'M0,30 C10,28 20,22 30,20 C40,18 50,24 60,18 C70,12 80,14 90,10 C100,6 110,8 120,4' },
    { label: 'Active Cases', value: fetching ? '-' : activeCasesCount.toString(), icon: Clock, borderColor: '#10B981', sparkPath: 'M0,28 C10,25 20,20 30,22 C40,24 50,15 60,12 C70,9 80,13 90,7 C100,3 110,5 120,2' },
    { label: 'Upcoming Hearings', value: fetching ? '-' : upcomingHearingsCount.toString(), icon: CalendarCheck, borderColor: '#8B5CF6', sparkPath: 'M0,25 C10,22 20,26 30,20 C40,14 50,18 60,15 C70,12 80,16 90,11 C100,6 110,9 120,5' },
    { label: 'Total Revenue', value: fetching ? '-' : `Rs. ${totalRevenue >= 1000 ? (totalRevenue / 1000).toFixed(1) + 'k' : totalRevenue}`, icon: TrendingUp, borderColor: '#10B981', sparkPath: 'M0,30 C10,28 20,22 30,20 C40,18 50,24 60,18 C70,12 80,14 90,10 C100,6 110,8 120,4' },
    { label: 'Dues', value: fetching ? '-' : `Rs. ${totalOutstanding >= 1000 ? (totalOutstanding / 1000).toFixed(1) + 'k' : totalOutstanding}`, icon: AlertCircle, borderColor: '#F43F5E', sparkPath: 'M0,20 C10,24 20,22 30,28 C40,26 50,30 60,25 C70,22 80,18 90,20 C100,16 110,14 120,10' },
    { label: 'Closed', value: fetching ? '-' : closedCasesCount.toString(), icon: CheckCircle2, borderColor: '#F59E0B', sparkPath: 'M0,18 C10,20 20,24 30,22 C40,20 50,26 60,24 C70,22 80,26 90,28 C100,30 110,27 120,32' },
  ];

  // Filter cases for table (all active cases, sorted by submission date descending)
  const activeCasesList = cases
    .filter(c => c.status !== 'CLOSED')
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {deleteCase && <DeleteModal caseTitle={deleteCase.title} onConfirm={handleConfirmDelete} onCancel={() => !deleting && setDeleteCase(null)} loading={deleting} />}
      {editCase && <EditSideSheet caseData={editCase} onSave={handleSaveEdit} onClose={() => !saving && setEditCase(null)} saving={saving} />}

      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Overview</h1>
          <button 
            onClick={() => setIsCauseListOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-black px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Generate Cause List
          </button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {currentDate ? `${currentDate} • Good morning.` : 'Loading...'}
        </p>
      </div>

      <CauseListModal 
        isOpen={isCauseListOpen} 
        onClose={() => setIsCauseListOpen(false)} 
        cases={cases} 
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, borderColor, sparkPath }) => (
          <div key={label} className="group relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden bg-card border border-border shadow-sm">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${borderColor}20 0%, transparent 70%)` }} />
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{label}</p>
              <div className="p-2 rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ background: `${borderColor}18` }}>
                <Icon className="w-4 h-4" style={{ color: borderColor }} strokeWidth={2} />
              </div>
            </div>
            <p className="text-5xl font-black leading-none tracking-tight text-foreground font-sans">{value}</p>
            <div className="-mx-1"><Sparkline path={sparkPath} color={borderColor} /></div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h2 className="text-sm sm:text-base font-bold text-foreground">Active Cases</h2>
          <Link href="/cases/new" className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-lg bg-blue-600 hover:opacity-90 hover:scale-[1.02] transition-all">
            <Plus className="w-3.5 h-3.5" /> NEW CASE
          </Link>
        </div>

        {fetching ? (
          <div className="p-12 flex justify-center items-center text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Fetching cases...
          </div>
        ) : activeCasesList.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-muted-foreground">No active cases found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
           <div className="divide-y divide-border min-w-[600px]">
            {activeCasesList.map(c => {
              let dateStr = 'No Hearing Scheduled';
              let isToday = false;
              if (c.nextHearingDate) {
                const d = new Date(c.nextHearingDate);
                isToday = d.toISOString().split('T')[0] === todayStr;
                dateStr = isToday ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }
              const tag = tagStyles[c.caseType] || tagStyles.Civil;

              return (
                <div key={c.id} className="group grid items-center px-6 py-4 cursor-default transition-colors duration-150 hover:bg-muted/40 min-w-[700px]" style={{ gridTemplateColumns: '1.5fr 120px 180px 110px 100px' }}>
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">
                      <Link href={`/cases/${c.id}`} className="hover:text-blue-500 transition-colors">{c.title}</Link>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.location === 'ISLAMABAD' ? 'Islamabad High Court' : 'Rawalpindi District'}</p>
                  </div>
                  <p className={`text-sm font-medium ${isToday ? 'text-emerald-500 font-bold' : c.nextHearingDate ? 'text-foreground' : 'text-muted-foreground/50'}`}>{dateStr}</p>
                  <p className="text-sm text-muted-foreground truncate pr-3">{c.judgeName || '—'}</p>
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full w-fit" style={{ background: tag.bg, color: tag.text }}>{c.caseType}</span>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/cases/${c.id}`} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><Eye className="w-4 h-4" /></Link>
                    {canModifyRecords && (
                    <button type="button" onClick={() => setEditCase(c)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                    )}
                    {canModifyRecords && (
                    <button type="button" onClick={() => setDeleteCase(c)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    )}
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