'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Eye, Pencil, Trash2, Plus, FolderOpen,
  X, CheckCircle2, AlertCircle, Loader2, AlertTriangle, Save, Filter,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { triggerAutomatedMessage } from '@/services/notificationService';

// ─── Types ───────────────────────────────────────────────────────────────────
type CaseStatus =
  | 'FILED' | 'NOTICE_ISSUED' | 'EVIDENCE'
  | 'ARGUMENTS' | 'ORDER_RESERVED' | 'CLOSED' | 'APPEALED';
type CaseLocation = 'ISLAMABAD' | 'RAWALPINDI';

interface CaseRow {
  id: string;
  title: string;
  caseType: string;
  caseFrom: string;
  caseAgainst: string;
  submissionDate: string;
  firNumber: string | null;
  location: CaseLocation;
  judgeName: string | null;
  nextHearingDate: string | null;
  clientPhone: string | null;
  decision: string | null;
  remarks: string | null;
  status: CaseStatus;
  lawyer: { name: string };
  totalFee?: number | null;
  pendingFeeDueDate?: string | null;
  payments?: { amount: number }[];
}

// ─── Status badge styling ─────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  FILED:          { label: 'Filed',          cls: 'bg-blue-100   text-blue-700   dark:bg-blue-500/15   dark:text-blue-400'   },
  NOTICE_ISSUED:  { label: 'Notice Issued',  cls: 'bg-amber-100  text-amber-700  dark:bg-amber-500/15  dark:text-amber-400'  },
  EVIDENCE:       { label: 'Evidence',       cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  ARGUMENTS:      { label: 'Arguments',      cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' },
  ORDER_RESERVED: { label: 'Order Reserved', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' },
  CLOSED:         { label: 'Closed',         cls: 'bg-slate-100  text-slate-600  dark:bg-slate-500/15  dark:text-slate-400'  },
  APPEALED:       { label: 'Appealed',       cls: 'bg-rose-100   text-rose-700   dark:bg-rose-500/15   dark:text-rose-400'   },
};

const TYPE_STYLES: Record<string, string> = {
  Criminal:      'text-rose-500   dark:text-rose-400',
  Civil:         'text-blue-500   dark:text-blue-400',
  Family:        'text-violet-500 dark:text-violet-400',
  Corporate:     'text-amber-500  dark:text-amber-400',
  Constitutional:'text-emerald-500 dark:text-emerald-400',
};

const COURT_FILTER_OPTIONS: { value: '' | CaseLocation; label: string }[] = [
  { value: '', label: 'All court locations' },
  { value: 'ISLAMABAD', label: 'Islamabad Court' },
  { value: 'RAWALPINDI', label: 'Rawalpindi District Court' },
];

function courtLabel(loc: CaseLocation) {
  return loc === 'ISLAMABAD' ? 'Islamabad Court' : 'Rawalpindi District Court';
}

/** Merge PATCH response into row shape while preserving `lawyer` from existing row. */
function mergeCaseFromApi(existing: CaseRow, api: Record<string, unknown>): CaseRow {
  const iso = (v: unknown) =>
    v == null ? null : typeof v === 'string' ? v : new Date(v as string).toISOString();
  return {
    ...existing,
    title: String(api.title ?? existing.title),
    caseType: String(api.caseType ?? existing.caseType),
    caseFrom: String(api.caseFrom ?? existing.caseFrom),
    caseAgainst: String(api.caseAgainst ?? existing.caseAgainst),
    submissionDate: iso(api.submissionDate) ?? existing.submissionDate,
    firNumber: api.firNumber != null ? String(api.firNumber) : null,
    location: (api.location as CaseLocation) ?? existing.location,
    judgeName: api.judgeName != null ? String(api.judgeName) : null,
    nextHearingDate: iso(api.nextHearingDate),
    clientPhone: api.clientPhone != null ? String(api.clientPhone) : null,
    decision: api.decision != null ? String(api.decision) : null,
    remarks: api.remarks != null ? String(api.remarks) : null,
    status: (api.status as CaseStatus) ?? existing.status,
    totalFee: api.totalFee != null ? Number(api.totalFee) : null,
    pendingFeeDueDate: iso(api.pendingFeeDueDate),
  };
}

const inputCls =
  'w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow';
const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5';

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error';
interface ToastState { type: ToastType; message: string; id: number }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${
        toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
      }`}
    >
      {toast.type === 'success'
        ? <CheckCircle2 className="w-5 h-5 shrink-0" />
        : <AlertCircle className="w-5 h-5 shrink-0" />}
      {toast.message}
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  caseTitle,
  onConfirm,
  onCancel,
  loading,
}: {
  caseTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-foreground text-center mb-2">Delete Case?</h2>
        <p className="text-sm text-muted-foreground text-center leading-relaxed mb-1">
          You are about to permanently delete:
        </p>
        <p className="text-sm font-bold text-foreground text-center mb-6 px-4 truncate">
          "{caseTitle}"
        </p>
        <p className="text-xs text-rose-500 text-center font-semibold mb-8">
          ⚠ This action cannot be undone. All associated data will be lost.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Side-Sheet ──────────────────────────────────────────────────────────
function EditSideSheet({
  caseData,
  onSave,
  onClose,
  saving,
}: {
  caseData: CaseRow;
  onSave: (data: Partial<CaseRow>, autoNotify?: boolean) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const toDateInput = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    title:           caseData.title,
    caseType:        caseData.caseType,
    caseFrom:        caseData.caseFrom,
    caseAgainst:     caseData.caseAgainst,
    submissionDate:  toDateInput(caseData.submissionDate),
    firNumber:       caseData.firNumber ?? '',
    location:        caseData.location,
    judgeName:       caseData.judgeName ?? '',
    clientPhone:     caseData.clientPhone ?? '',
    nextHearingDate: toDateInput(caseData.nextHearingDate),
    decision:        caseData.decision ?? '',
    remarks:         caseData.remarks ?? '',
    status:          caseData.status,
    totalFee:        caseData.totalFee ?? '',
    pendingFeeDueDate: toDateInput(caseData.pendingFeeDueDate || null),
    feePaid:         '',
    paidDate:        new Date().toISOString().split('T')[0],
  });

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [autoNotify, setAutoNotify] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAutoNotify(localStorage.getItem('autoNotify') === 'true');
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, slipFile } as any, autoNotify);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        style={{ backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl overflow-hidden"
        style={{
          width: 'min(560px, 96vw)',
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Edit Case</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[380px]">{caseData.title}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

            {/* Case Title */}
            <div>
              <label className={labelCls}>Case Title <span className="text-rose-500 normal-case tracking-normal font-bold">*</span></label>
              <input value={form.title} onChange={set('title')} required className={inputCls} placeholder="e.g., State vs. John Doe" />
            </div>

            {/* Case Type + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Case Type <span className="text-rose-500">*</span></label>
                <select value={form.caseType} onChange={set('caseType')} required className={inputCls}>
                  <option value="Criminal">Criminal</option>
                  <option value="Civil">Civil</option>
                  <option value="Family">Family</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Constitutional">Constitutional</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  <option value="FILED">Filed</option>
                  <option value="NOTICE_ISSUED">Notice Issued</option>
                  <option value="EVIDENCE">Evidence Stage</option>
                  <option value="ARGUMENTS">Arguments</option>
                  <option value="ORDER_RESERVED">Order Reserved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="APPEALED">Appealed</option>
                </select>
              </div>
            </div>

            {/* Plaintiff / Defendant */}
            <div>
              <label className={labelCls}>Plaintiff / Petitioner <span className="text-rose-500">*</span></label>
              <input value={form.caseFrom} onChange={set('caseFrom')} required className={inputCls} placeholder="Full name of petitioner" />
            </div>
            <div>
              <label className={labelCls}>Client Phone</label>
              <input value={form.clientPhone} onChange={set('clientPhone')} type="tel" className={inputCls} placeholder="+923001234567" />
            </div>
            <div>
              <label className={labelCls}>Defendant / Respondent <span className="text-rose-500">*</span></label>
              <input value={form.caseAgainst} onChange={set('caseAgainst')} required className={inputCls} placeholder="Full name of respondent" />
            </div>

            {/* Court + Judge */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Court Location <span className="text-rose-500">*</span></label>
                <select value={form.location} onChange={set('location')} required className={inputCls}>
                  <option value="ISLAMABAD">Islamabad Court</option>
                  <option value="RAWALPINDI">Rawalpindi District Court</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Judge Name</label>
                <input value={form.judgeName} onChange={set('judgeName')} className={inputCls} placeholder="e.g., Justice A. Malik" />
              </div>
            </div>

            {/* FIR Number */}
            <div>
              <label className={labelCls}>FIR Number</label>
              <input value={form.firNumber} onChange={set('firNumber')} className={inputCls} placeholder="e.g., FIR 123/2026 (criminal only)" />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Submission Date <span className="text-rose-500">*</span></label>
                <input type="date" value={form.submissionDate} onChange={set('submissionDate')} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Next Hearing Date</label>
                <input type="date" value={form.nextHearingDate} onChange={set('nextHearingDate')} className={inputCls} />
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Total Agreed Fee</label>
                <input type="number" value={form.totalFee} onChange={set('totalFee')} className={inputCls} placeholder="Rs." />
              </div>
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
              <div>
                <label className={labelCls}>Add New Payment</label>
                <input type="number" value={form.feePaid} onChange={set('feePaid')} className={inputCls} placeholder="Rs. amount" />
              </div>
              <div>
                <label className={labelCls}>Paid Date</label>
                <input type="date" value={form.paidDate} onChange={set('paidDate')} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Payment Slip (Optional)</label>
                <input type="file" accept="image/*,.pdf" className="w-full text-sm mt-1" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className={labelCls}>Pending Fee Due Date</label>
                <input type="date" value={form.pendingFeeDueDate} onChange={set('pendingFeeDueDate')} className={inputCls} />
              </div>
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

            {/* Decision */}
            <div>
              <label className={labelCls}>Decision / Judgment</label>
              <textarea value={form.decision} onChange={set('decision')} rows={3} className={inputCls} placeholder="Final court decision or judgment text…" />
            </div>

            {/* Remarks */}
            <div>
              <label className={labelCls}>Internal Remarks</label>
              <textarea value={form.remarks} onChange={set('remarks')} rows={3} className={inputCls} placeholder="Internal notes, observations, strategy…" />
            </div>
          </div>

          {/* Footer */}
          <div
            className="shrink-0 flex items-center justify-end gap-3 px-7 py-5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-md hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:scale-100"
              style={{ background: '#2563EB' }}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(59,130,246,0.06) 100%)',
          border: '1px solid rgba(59,130,246,0.2)',
          boxShadow: '0 0 40px rgba(59,130,246,0.08)',
        }}
      >
        <FolderOpen className="w-9 h-9 text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">No Cases Yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
        Your case registry is empty. Start by opening your first case — all your litigations will appear here.
      </p>
      <Link
        href="/cases/new"
        className="inline-flex items-center gap-2 text-sm font-bold text-primary-foreground px-6 py-3 rounded-xl shadow-md hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
        style={{ background: '#2563EB' }}
      >
        <Plus className="w-4 h-4" />
        Open Your First Case
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CasesList() {
  const { canAddCases, canEditCases, canDeleteCases } = useAuth();
  const [cases, setCases]           = useState<CaseRow[]>([]);
  const [fetching, setFetching]     = useState(true);
  const [editCase, setEditCase]     = useState<CaseRow | null>(null);
  const [deleteCase, setDeleteCase] = useState<CaseRow | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [toast, setToast]           = useState<ToastState | null>(null);
  const toastCounter                = useRef(0);

  const [courtFilter, setCourtFilter]       = useState<'' | CaseLocation>('');
  const [plaintiffFilter, setPlaintiffFilter] = useState('');
  const [defendantFilter, setDefendantFilter] = useState('');

  const filteredCases = useMemo(() => {
    const p = plaintiffFilter.trim().toLowerCase();
    const d = defendantFilter.trim().toLowerCase();
    return cases.filter((c) => {
      if (courtFilter && c.location !== courtFilter) return false;
      if (p && !c.caseFrom.toLowerCase().includes(p)) return false;
      if (d && !c.caseAgainst.toLowerCase().includes(d)) return false;
      return true;
    });
  }, [cases, courtFilter, plaintiffFilter, defendantFilter]);

  const filtersActive = !!(courtFilter || plaintiffFilter.trim() || defendantFilter.trim());

  const plaintiffSuggestions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => { if (c.caseFrom.trim()) set.add(c.caseFrom.trim()); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cases]);

  const defendantSuggestions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => { if (c.caseAgainst.trim()) set.add(c.caseAgainst.trim()); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cases]);

  const clearFilters = useCallback(() => {
    setCourtFilter('');
    setPlaintiffFilter('');
    setDefendantFilter('');
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    toastCounter.current += 1;
    setToast({ type, message, id: toastCounter.current });
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      const res = await fetch('/api/cases', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load cases');
      const data: CaseRow[] = await res.json();
      setCases(data);
    } catch {
      showToast('error', 'Failed to load cases. Please refresh.');
    } finally {
      setFetching(false);
    }
  }, [showToast]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // ── Edit save ──────────────────────────────────────────────────────────────
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Update failed');
      }
      const updated = (await res.json()) as Record<string, unknown>;
      setCases((prev) =>
        prev.map((c) => (c.id === editCase.id ? mergeCaseFromApi(c, updated) : c)),
      );
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
          const result = await triggerAutomatedMessage(cleanedPhone, payload);
          
          if (result.success) {
            showToast('success', 'Live WhatsApp Message Sent Successfully!');
          } else {
            showToast('error', 'Failed to send message. Please check WhatsApp connection in Settings.');
          }
        }
      }
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to update case');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteCase) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cases/${deleteCase.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Delete failed');
      }
      setCases((prev) => prev.filter((c) => c.id !== deleteCase.id));
      setDeleteCase(null);
      showToast('success', 'Case deleted successfully');
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to delete case');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <Toast
          toast={toast}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* ── Delete Modal ── */}
      {deleteCase && (
        <DeleteModal
          caseTitle={deleteCase.title}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteCase(null)}
          loading={deleting}
        />
      )}

      {/* ── Edit Side Sheet ── */}
      {editCase && (
        <EditSideSheet
          caseData={editCase}
          onSave={handleSaveEdit}
          onClose={() => !saving && setEditCase(null)}
          saving={saving}
        />
      )}

      <div className="space-y-5 sm:space-y-6">
        {/* ── Page Header ── */}
        <div className="flex items-start sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">My Cases</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">
              {fetching
                ? 'Loading cases…'
                : cases.length > 0
                  ? filtersActive
                    ? `Showing ${filteredCases.length} of ${cases.length} case${cases.length !== 1 ? 's' : ''}`
                    : `${cases.length} case${cases.length !== 1 ? 's' : ''} registered`
                  : 'All active, pending, and closed litigations'}
            </p>
          </div>
          {canAddCases && (
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary-foreground px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-md hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
              style={{ background: '#2563EB' }}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add Case</span>
              <span className="sm:hidden">Add</span>
            </Link>
          )}
        </div>

        {/* ── Table Card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {fetching ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading cases…</span>
            </div>
          ) : cases.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* ── Advanced filters ── */}
              <div
                className="px-5 py-4 md:px-6"
                style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Filter registry</span>
                  </div>
                  {filtersActive && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-4">
                  <div className="w-full sm:w-auto sm:min-w-[200px] lg:flex-1 lg:max-w-xs">
                    <label className={labelCls}>Court location</label>
                    <select
                      value={courtFilter}
                      onChange={(e) => setCourtFilter(e.target.value as '' | CaseLocation)}
                      className={inputCls}
                    >
                      {COURT_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:flex-1 sm:min-w-[180px]">
                    <label className={labelCls}>Plaintiff / petitioner</label>
                    <input
                      list="cases-plaintiff-options"
                      value={plaintiffFilter}
                      onChange={(e) => setPlaintiffFilter(e.target.value)}
                      className={inputCls}
                      placeholder="e.g., Ahmad"
                      autoComplete="off"
                    />
                    <datalist id="cases-plaintiff-options">
                      {plaintiffSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="w-full sm:flex-1 sm:min-w-[180px]">
                    <label className={labelCls}>Defendant / respondent</label>
                    <input
                      list="cases-defendant-options"
                      value={defendantFilter}
                      onChange={(e) => setDefendantFilter(e.target.value)}
                      className={inputCls}
                      placeholder="Type or pick a name"
                      autoComplete="off"
                    />
                    <datalist id="cases-defendant-options">
                      {defendantSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex items-end pb-0.5">
                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={!filtersActive}
                      className="w-full sm:w-auto px-4 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              </div>

              {filteredCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <p className="text-sm font-semibold text-foreground mb-1">No cases match these filters</p>
                  <p className="text-xs text-muted-foreground max-w-sm mb-6">
                    Try adjusting court location or party names, or clear filters to see your full registry.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-bold text-primary underline-offset-4 hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm text-left" style={{ minWidth: '640px' }}>
                <thead>
                  <tr
                    className="text-muted-foreground uppercase text-[11px] font-bold tracking-wider"
                    style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.03)' }}
                  >
                    <th className="px-6 py-3.5">Case Title</th>
                    <th className="px-6 py-3.5">Court &amp; Judge</th>
                    <th className="px-6 py-3.5">Next Hearing</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => {
                    const status   = STATUS_STYLES[c.status] ?? { label: c.status, cls: 'bg-slate-100 text-slate-600' };
                    const typeColor = TYPE_STYLES[c.caseType] ?? 'text-muted-foreground';
                    const hearingDate = c.nextHearingDate
                      ? new Date(c.nextHearingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—';

                    return (
                      <tr
                        key={c.id}
                        className="group transition-colors hover:bg-muted/40"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/cases/${c.id}`}
                            className="font-semibold text-foreground leading-tight hover:text-primary transition-colors line-clamp-1 block"
                          >
                            {c.title}
                          </Link>
                          <p className={`text-xs mt-0.5 font-medium ${typeColor}`}>{c.caseType}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-foreground text-sm">
                            {courtLabel(c.location)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.judgeName ?? '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">
                          {hearingDate}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* View */}
                            <Link
                              href={`/cases/${c.id}`}
                              title="View case"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Edit */}
                            {canEditCases && (
                            <button
                              onClick={() => setEditCase(c)}
                              title="Edit case"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            )}
                            {/* Delete */}
                            {canDeleteCases && (
                            <button
                              onClick={() => setDeleteCase(c)}
                              title="Delete case"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              )}

              {/* Footer */}
              <div
                className="px-6 py-3 flex items-center justify-between text-xs text-muted-foreground"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <span>
                  Showing {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
                  {filtersActive && cases.length !== filteredCases.length
                    ? ` (of ${cases.length} total)`
                    : ''}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}