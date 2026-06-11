'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, User2, MapPin, Gavel, Hash, CalendarDays, Clock,
  CheckCircle2, Upload, FilePlus2, Scale, MessageCircle, Smartphone, Send, Check,
  DollarSign, Banknote, CreditCard, History, BookOpen, FileText, AlertCircle, Loader2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type CaseStatus = 'FILED' | 'NOTICE_ISSUED' | 'EVIDENCE' | 'ARGUMENTS' | 'ORDER_RESERVED' | 'CLOSED' | 'APPEALED';
type CaseLocation = 'ISLAMABAD' | 'RAWALPINDI';

interface Activity {
  id: string; title: string; description: string | null;
  date: string; user: { name: string };
}
interface CaseDocument {
  id: string; title: string; fileUrl: string;
  category: string; uploadedAt: string;
}
interface CaseDetail {
  id: string; title: string; caseType: string;
  caseFrom: string; caseAgainst: string; submissionDate: string;
  firNumber: string | null; location: CaseLocation;
  judgeName: string | null; nextHearingDate: string | null;
  clientPhone: string | null;
  totalFee: number | null;
  pendingFeeDueDate: string | null;
  decision: string | null; remarks: string | null;
  status: CaseStatus;
  lawyer: { name: string; email: string };
  history: Activity[];
  documents: CaseDocument[];
  payments: { id: string; amount: number; method: string; date: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  FILED:          { label: 'Filed',          cls: 'bg-blue-100   text-blue-700   dark:bg-blue-500/15   dark:text-blue-400',   dot: 'bg-blue-500'   },
  NOTICE_ISSUED:  { label: 'Notice Issued',  cls: 'bg-amber-100  text-amber-700  dark:bg-amber-500/15  dark:text-amber-400',  dot: 'bg-amber-500'  },
  EVIDENCE:       { label: 'Evidence',       cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400', dot: 'bg-violet-500' },
  ARGUMENTS:      { label: 'Arguments',      cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400', dot: 'bg-indigo-500' },
  ORDER_RESERVED: { label: 'Order Reserved', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', dot: 'bg-orange-500' },
  CLOSED:         { label: 'Closed',         cls: 'bg-slate-100  text-slate-600  dark:bg-slate-500/15  dark:text-slate-400',  dot: 'bg-slate-500'  },
  APPEALED:       { label: 'Appealed',       cls: 'bg-rose-100   text-rose-700   dark:bg-rose-500/15   dark:text-rose-400',   dot: 'bg-rose-500'   },
};
const TYPE_COLORS: Record<string, string> = {
  Criminal: '#EF4444', Civil: '#3B82F6', Family: '#8B5CF6',
  Corporate: '#F59E0B', Constitutional: '#10B981',
};
const COURT_NAMES: Record<CaseLocation, string> = {
  ISLAMABAD:  'Islamabad High Court',
  RAWALPINDI: 'Rawalpindi District Court',
};

type Tab = 'overview' | 'timeline' | 'documents' | 'financials';

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoCard({
  icon: Icon, label, value, accent,
}: { icon: React.ElementType; label: string; value?: string | null; accent?: string }) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: accent ? `${accent}18` : 'var(--muted)' }}
      >
        <Icon className="w-4 h-4" style={{ color: accent ?? 'var(--muted-foreground)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground leading-snug break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ c }: { c: CaseDetail }) {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

  const [message, setMessage] = useState(
    `Dear ${c.caseFrom}, your next hearing for the case "${c.title}" is scheduled on ${fmt(c.nextHearingDate) || 'TBD'} at ${COURT_NAMES[c.location] || 'the court'}. Regards, Legal Team.`
  );
  const [phoneNumber, setPhoneNumber] = useState(c.clientPhone || '');
  const [logs, setLogs] = useState<{ id: number; text: string; date: Date }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleWhatsApp = () => {
    if (!phoneNumber) {
      showToast('Please enter a valid phone number');
      return;
    }
    const url = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setLogs(prev => [{ id: Date.now(), text: `WhatsApp message generated to ${phoneNumber}`, date: new Date() }, ...prev]);
  };

  const handleSMS = () => {
    if (!phoneNumber) {
      showToast('Please enter a valid phone number');
      return;
    }
    showToast('SMS queued for delivery');
    setLogs(prev => [{ id: Date.now(), text: `SMS queued for ${phoneNumber}`, date: new Date() }, ...prev]);
  };

  return (
    <div className="space-y-7">
      {/* Parties */}
      <section>
        <SectionHeading>Parties Involved</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard icon={User2} label="Plaintiff / Petitioner" value={c.caseFrom}    accent="#3B82F6" />
          <InfoCard icon={User2} label="Defendant / Respondent" value={c.caseAgainst} accent="#EF4444" />
        </div>
      </section>

      {/* Court */}
      <section>
        <SectionHeading>Court Information</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoCard icon={MapPin}  label="Court Location"  value={COURT_NAMES[c.location]} accent="#8B5CF6" />
          <InfoCard icon={Gavel}   label="Presiding Judge" value={c.judgeName}              accent="#F59E0B" />
          <InfoCard icon={Hash}    label="FIR Number"      value={c.firNumber}              accent="#EF4444" />
        </div>
      </section>

      {/* Dates */}
      <section>
        <SectionHeading>Key Dates</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard icon={CalendarDays} label="Submission Date"    value={fmt(c.submissionDate)}    accent="#10B981" />
          <InfoCard icon={Clock}        label="Next Hearing Date"  value={fmt(c.nextHearingDate)}   accent="#F59E0B" />
        </div>
      </section>

      {/* Decision / Remarks */}
      {(c.decision || c.remarks) && (
        <section>
          <SectionHeading>Notes & Judgment</SectionHeading>
          <div className="space-y-3">
            {c.decision && (
              <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Decision / Judgment</p>
                <p className="text-sm text-foreground leading-relaxed">{c.decision}</p>
              </div>
            )}
            {c.remarks && (
              <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Internal Remarks</p>
                <p className="text-sm text-foreground leading-relaxed">{c.remarks}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Lawyer */}
      <section>
        <SectionHeading>Assigned Lawyer</SectionHeading>
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-extrabold text-white text-base"
            style={{ background: 'linear-gradient(135deg,var(--primary),#7C3AED)' }}
          >
            {c.lawyer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{c.lawyer.name}</p>
            <p className="text-xs text-muted-foreground">{c.lawyer.email}</p>
          </div>
        </div>
      </section>

      {/* Client Communication */}
      <section className="relative">
        {toast && (
          <div className="absolute -top-10 right-0 px-4 py-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        )}
        <SectionHeading>Client Communication</SectionHeading>
        <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div>
            <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
              Client Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +92 300 1234567"
              className="w-full sm:max-w-xs px-3 py-2 text-sm rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
              Message Template
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold rounded-lg shadow-sm transition-colors active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Send via WhatsApp
            </button>
            <button
              onClick={handleSMS}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-bold rounded-lg transition-colors active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              Send via SMS
            </button>
          </div>

          {logs.length > 0 && (
            <div className="pt-4 mt-4 border-t border-border">
              <h4 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-3">Communication Log</h4>
              <ul className="space-y-2">
                {logs.map(log => (
                  <li key={log.id} className="text-xs text-foreground/80 flex items-start gap-2">
                    <Send className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>
                      {log.text} <span className="text-muted-foreground/60 ml-1">({log.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────
interface TLEvent {
  id: string; date: Date; title: string;
  description: string | null;
  kind: 'filed' | 'activity' | 'hearing';
  isPast: boolean;
}

function TimelineTab({ events }: { events: TLEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <History className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm font-semibold text-muted-foreground">No timeline events recorded yet</p>
      </div>
    );
  }

  const dotStyle = (e: TLEvent) => {
    if (e.kind === 'filed')   return { bg: '#10B981', border: '#10B981' };
    if (!e.isPast)            return { bg: 'var(--card)', border: '#3B82F6' };
    return                           { bg: 'var(--primary)',    border: 'var(--primary)' };
  };

  return (
    <div className="relative">
      {/* Vertical connector */}
      <div className="absolute left-[19px] top-2 bottom-2 w-0.5" style={{ background: 'var(--border)' }} />

      <div className="space-y-5">
        {events.map((ev) => {
          const { bg, border } = dotStyle(ev);
          return (
            <div key={ev.id} className="relative flex gap-5 pl-11">
              {/* Dot */}
              <div
                className="absolute left-0 top-4 w-[38px] flex justify-center"
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center z-10"
                  style={{ background: bg, borderColor: border }}
                >
                  {!ev.isPast && (
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: border }} />
                  )}
                </div>
              </div>

              {/* Card */}
              <div
                className="flex-1 rounded-xl p-4 min-w-0"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
                  <p className="text-sm font-bold text-foreground leading-snug">{ev.title}</p>
                  <span
                    className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      ev.kind === 'filed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : ev.isPast
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    }`}
                  >
                    {ev.kind === 'filed' ? 'Filed' : ev.isPast ? 'Completed' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {ev.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                {ev.description && (
                  <p className="text-sm text-foreground/70 leading-relaxed">{ev.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
const DOC_CAT_STYLES: Record<string, { cls: string }> = {
  EVIDENCE: { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
  PLEADING: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  ORDER:    { cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  MISC:     { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
};

function DocumentsTab({ documents }: { documents: CaseDocument[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg,rgba(37,99,235,0.1) 0%,rgba(59,130,246,0.04) 100%)',
            border: '1px dashed rgba(59,130,246,0.3)',
          }}
        >
          <FilePlus2 className="w-9 h-9 text-primary/60" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-base font-bold text-foreground mb-1">No Documents Yet</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Upload case files, evidence, pleadings, and court orders here to keep everything in one place.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-md hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
          style={{ background: 'var(--primary)' }}
          onClick={() => alert('Document upload coming soon!')}
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{documents.length} file{documents.length !== 1 ? 's' : ''} attached</p>
        <button
          className="inline-flex items-center gap-2 text-xs font-bold text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition-all"
          style={{ background: 'var(--primary)' }}
          onClick={() => alert('Document upload coming soon!')}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>
      {documents.map((doc) => {
        const cat = DOC_CAT_STYLES[doc.category] ?? DOC_CAT_STYLES.MISC;
        return (
          <div
            key={doc.id}
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.1)' }}>
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${cat.cls}`}>
              {doc.category}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Financials Tab ───────────────────────────────────────────────────────────
function FinancialsTab({ c, onUpdate }: { c: CaseDetail, onUpdate: () => void }) {
  const totalFee = c.totalFee || 0;
  const amountPaid = c.payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingBalance = totalFee - amountPaid;
  
  const [loading, setLoading] = useState(false);
  const [feeForm, setFeeForm] = useState({
    totalFee: c.totalFee || '',
    pendingFeeDueDate: c.pendingFeeDueDate ? new Date(c.pendingFeeDueDate).toISOString().split('T')[0] : ''
  });
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '', method: 'Cash', date: new Date().toISOString().split('T')[0]
  });

  const saveFeeDetails = async () => {
    setLoading(true);
    try {
      await fetch(`/api/cases/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          totalFee: feeForm.totalFee,
          pendingFeeDueDate: feeForm.pendingFeeDueDate || null 
        })
      });
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/cases/${c.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      setPaymentForm({ amount: '', method: 'Cash', date: new Date().toISOString().split('T')[0] });
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard icon={DollarSign} label="Total Agreed Fee" value={`Rs. ${totalFee.toLocaleString()}`} accent="#3B82F6" />
        <InfoCard icon={Banknote} label="Amount Paid" value={`Rs. ${amountPaid.toLocaleString()}`} accent="#10B981" />
        <InfoCard icon={AlertCircle} label="Remaining Balance" value={`Rs. ${remainingBalance.toLocaleString()}`} accent={remainingBalance > 0 ? "#EF4444" : "#10B981"} />
      </div>

      <div className="rounded-xl p-5 border border-border bg-card space-y-4">
        <SectionHeading>Fee Settings</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Total Agreed Fee</label>
            <input type="number" value={feeForm.totalFee} onChange={e => setFeeForm({...feeForm, totalFee: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Pending Fee Due Date</label>
            <input type="date" value={feeForm.pendingFeeDueDate} onChange={e => setFeeForm({...feeForm, pendingFeeDueDate: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>
        </div>
        <button onClick={saveFeeDetails} disabled={loading} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 active:scale-95 transition-all">Save Settings</button>
      </div>

      <div className="rounded-xl p-5 border border-border bg-card space-y-4">
        <SectionHeading>Record New Payment</SectionHeading>
        <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Amount</label>
            <input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Method</label>
            <select value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all">
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Date</label>
            <input type="date" required value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>
          <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 h-[38px] active:scale-95 transition-all">Add Payment</button>
        </form>
      </div>

      <div className="rounded-xl p-5 border border-border bg-card">
        <SectionHeading>Payment History</SectionHeading>
        {c.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 rounded-l-lg">Date</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2 rounded-r-lg text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {c.payments.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">Rs. {p.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CaseDetailPage() {
  const params   = useParams();
  const id       = params?.id as string;

  const [data,       setData]       = useState<CaseDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<Tab>('overview');

  const loadCase = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status === 404 ? 'Case not found' : 'Failed to load case');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCase(); }, [loadCase]);

  // Build sorted timeline
  const timelineEvents = useMemo<TLEvent[]>(() => {
    if (!data) return [];
    const now = new Date();
    const events: TLEvent[] = [];

    events.push({
      id: '_filed', kind: 'filed', isPast: true,
      date: new Date(data.submissionDate),
      title: 'Case Filed',
      description: `Registered as ${data.caseType} — ${data.caseFrom} vs. ${data.caseAgainst}`,
    });

    data.history.forEach(h => {
      const d = new Date(h.date);
      events.push({ id: h.id, kind: 'activity', isPast: d <= now, date: d, title: h.title, description: h.description });
    });

    if (data.nextHearingDate) {
      const d = new Date(data.nextHearingDate);
      events.push({
        id: '_hearing', kind: 'hearing', isPast: d <= now, date: d,
        title: 'Next Scheduled Hearing',
        description: `${COURT_NAMES[data.location]}${data.judgeName ? ` — before ${data.judgeName}` : ''}`,
      });
    }

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading case details…</span>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <p className="text-lg font-bold text-foreground">{error ?? 'Case not found'}</p>
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
      </div>
    );
  }

  const status     = STATUS_STYLES[data.status] ?? { label: data.status, cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-500' };
  const typeColor  = TYPE_COLORS[data.caseType] ?? '#6B7280';
  const isClosed   = data.status === 'CLOSED';

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview',   label: 'Overview',   icon: BookOpen },
    { key: 'financials', label: 'Financials', icon: DollarSign },
    { key: 'timeline',   label: 'Timeline',   icon: History,  count: timelineEvents.length },
    { key: 'documents',  label: 'Documents',  icon: FileText, count: data.documents.length || undefined },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* ── Back Button ── */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group w-fit"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Cases
      </Link>

      {/* ── Hero Header Card ── */}
      <div
        className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}
      >
        {/* Decorative radial glow */}
        <div
          className="absolute -top-8 -left-8 w-64 h-64 rounded-full pointer-events-none opacity-[0.06]"
          style={{ background: `radial-gradient(circle, ${typeColor} 0%, transparent 70%)` }}
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: title + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <span
                className="inline-flex items-center text-xs font-extrabold px-3 py-1 rounded-full text-white tracking-wide"
                style={{ background: typeColor }}
              >
                {data.caseType}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full ${status.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              {isClosed && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight mb-3">
              {data.title}
            </h1>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-foreground">{data.caseFrom}</span>
              <span className="text-muted-foreground/50">vs.</span>
              <span className="font-semibold text-foreground">{data.caseAgainst}</span>
            </div>
          </div>

          {/* Right: meta pills */}
          <div
            className="flex flex-row sm:flex-col gap-3 sm:items-end shrink-0 flex-wrap"
          >
            <div className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                style={{ background: 'linear-gradient(135deg,var(--primary),#7C3AED)' }}>
                {data.lawyer.name.charAt(0)}
              </div>
              <span className="font-semibold text-foreground">{data.lawyer.name}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{COURT_NAMES[data.location]}</span>
            </div>

            {data.nextHearingDate && (
              <div
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706' }}
              >
                <Clock className="w-3.5 h-3.5" />
                {new Date(data.nextHearingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <nav className="-mb-px flex gap-1 sm:gap-2">
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              id={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-3 py-3 text-sm font-semibold border-b-2 transition-all rounded-t-lg ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className="text-[10px] font-extrabold w-5 h-5 flex items-center justify-center rounded-full"
                  style={{
                    background: activeTab === key ? 'var(--primary)' : 'var(--muted)',
                    color:      activeTab === key ? '#fff'     : 'var(--muted-foreground)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Panels ── */}
      <div className="min-h-[300px]">
        {activeTab === 'overview'  && <OverviewTab  c={data} />}
        {activeTab === 'financials'&& <FinancialsTab c={data} onUpdate={loadCase} />}
        {activeTab === 'timeline'  && <TimelineTab  events={timelineEvents} />}
        {activeTab === 'documents' && <DocumentsTab documents={data.documents} />}
      </div>
    </div>
  );
}
