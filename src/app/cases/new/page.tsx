'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Styles ─────────────────────────────────────────────────────────────────
const inputCls =
  'w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow';
const labelCls = 'block text-sm font-semibold text-foreground mb-2';

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <h2 className="flex items-center gap-3 text-base font-bold text-foreground mb-6">
        <span className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black">
          {num}
        </span>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold transition-all duration-300 ${
        type === 'success'
          ? 'bg-emerald-600 text-white'
          : 'bg-rose-600 text-white'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0" />
      )}
      {message}
    </div>
  );
}

// ─── Form Component ──────────────────────────────────────────────────────────
export default function AddCase() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [totalFee, setTotalFee] = useState<number | ''>('');
  const [feePaid, setFeePaid] = useState<number | ''>('');

  // File handlers
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };
  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  // Form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    let slipUrl = '';
    if (slipFile) {
      const uploadData = new FormData();
      uploadData.append('file', slipFile);
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        if (!uploadRes.ok) throw new Error('Failed to upload slip');
        const uploadJson = await uploadRes.json();
        slipUrl = uploadJson.url;
      } catch (err: any) {
        setToast({ type: 'error', message: err.message ?? 'Image upload failed.' });
        setLoading(false);
        return;
      }
    }

    const payload = {
      title:          data.get('title')          as string,
      caseType:       data.get('caseType')        as string,
      caseFrom:       data.get('caseFrom')        as string,
      caseAgainst:    data.get('caseAgainst')     as string,
      submissionDate: data.get('submissionDate')  as string,
      firNumber:      data.get('firNumber')       as string,
      location:       data.get('location')        as string,
      judgeName:      data.get('judgeName')       as string,
      clientPhone:    data.get('clientPhone')     as string,
      nextHearingDate:data.get('nextHearingDate') as string,
      totalFee:       data.get('totalFee')        as string,
      pendingFeeDueDate: data.get('pendingFeeDueDate') as string,
      feePaid:        data.get('feePaid')         as string,
      paidDate:       data.get('paidDate')        as string,
      slipUrl,
      decision:       data.get('decision')        as string,
      remarks:        data.get('remarks')         as string,
      status:         data.get('status')          as string,
    };

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Submission failed');
      }

      setToast({ type: 'success', message: 'Case created successfully!' });
      setTimeout(() => router.push('/cases'), 1200);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message ?? 'Something went wrong. Please try again.' });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} />}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Open New Case</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register a new litigation and link it to the relevant court, judge, and client.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Basic Information ── */}
        <Section num={1} title="Basic Information">
          <div className="md:col-span-2">
            <label className={labelCls}>
              Case Title <span className="text-rose-500">*</span>
            </label>
            <input name="title" type="text" className={inputCls} placeholder="e.g., State vs. John Doe" required />
          </div>
          <div>
            <label className={labelCls}>
              Case Type <span className="text-rose-500">*</span>
            </label>
            <select name="caseType" className={inputCls} required defaultValue="">
              <option value="" disabled>Select type…</option>
              <option value="Criminal">Criminal</option>
              <option value="Civil">Civil</option>
              <option value="Family">Family</option>
              <option value="Corporate">Corporate</option>
              <option value="Constitutional">Constitutional</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>
              Plaintiff / Petitioner <span className="text-rose-500">*</span>
            </label>
            <input name="caseFrom" type="text" className={inputCls} placeholder="Full name of petitioner" required />
          </div>
          <div>
            <label className={labelCls}>
              Client Phone Number
            </label>
            <input name="clientPhone" type="tel" className={inputCls} placeholder="e.g., +923001234567" />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>
              Defendant / Respondent <span className="text-rose-500">*</span>
            </label>
            <input name="caseAgainst" type="text" className={inputCls} placeholder="Full name of respondent" required />
          </div>
        </Section>

        {/* ── Section 2: Legal Information ── */}
        <Section num={2} title="Legal Information">
          <div>
            <label className={labelCls}>
              Court Location <span className="text-rose-500">*</span>
            </label>
            <select name="location" className={inputCls} required defaultValue="">
              <option value="" disabled>Select court…</option>
              <option value="ISLAMABAD">Islamabad High Court</option>
              <option value="RAWALPINDI">Rawalpindi District Court</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Judge Name</label>
            <input name="judgeName" type="text" className={inputCls} placeholder="e.g., Justice A. Malik" />
          </div>
          <div>
            <label className={labelCls}>FIR Number</label>
            <input name="firNumber" type="text" className={inputCls} placeholder="e.g., FIR 123/2026 (criminal only)" />
          </div>
          <div>
            <label className={labelCls}>Current Status</label>
            <select name="status" className={inputCls} defaultValue="FILED">
              <option value="FILED">Filed</option>
              <option value="NOTICE_ISSUED">Notice Issued</option>
              <option value="EVIDENCE">Evidence Stage</option>
              <option value="ARGUMENTS">Arguments</option>
              <option value="ORDER_RESERVED">Order Reserved</option>
            </select>
          </div>
        </Section>

        {/* ── Section 3: Timeline ── */}
        <Section num={3} title="Timeline & Dates">
          <div>
            <label className={labelCls}>
              Submission Date <span className="text-rose-500">*</span>
            </label>
            <input name="submissionDate" type="date" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Next Hearing Date</label>
            <input name="nextHearingDate" type="date" className={inputCls} />
          </div>
        </Section>

        {/* ── Section 4: Financials ── */}
        <Section num={4} title="Financial Settings">
          <div>
            <label className={labelCls}>Total Agreed Fee</label>
            <input 
              name="totalFee" 
              type="number" 
              className={inputCls} 
              placeholder="e.g., 50000" 
              value={totalFee}
              onChange={(e) => setTotalFee(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Fee Balance (Auto-calculated)</label>
            <input 
              type="text" 
              className={`${inputCls} bg-muted/50 cursor-not-allowed text-rose-500 font-bold`} 
              value={`Rs. ${((totalFee || 0) - (feePaid || 0)).toLocaleString()}`} 
              readOnly 
            />
          </div>
          <div>
            <label className={labelCls}>Initial Fee Paid</label>
            <input 
              name="feePaid" 
              type="number" 
              className={inputCls} 
              placeholder="Amount paid now" 
              value={feePaid}
              onChange={(e) => setFeePaid(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Paid Date</label>
            <input name="paidDate" type="date" className={inputCls} defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className={labelCls}>Payment Slip (Optional)</label>
            <input 
              type="file" 
              accept="image/*,.pdf" 
              className={inputCls} 
              onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className={labelCls}>Pending Fee Due Date</label>
            <input name="pendingFeeDueDate" type="date" className={inputCls} />
          </div>
        </Section>

        {/* ── Section 5: Decision & Remarks ── */}
        <Section num={5} title="Decision & Remarks">
          <div className="md:col-span-2">
            <label className={labelCls}>Decision / Judgment</label>
            <textarea name="decision" rows={3} className={inputCls} placeholder="Final court decision or judgment text…" />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Internal Remarks</label>
            <textarea name="remarks" rows={3} className={inputCls} placeholder="Internal notes, observations, strategy…" />
          </div>
        </Section>

        {/* ── Section 6: Documents ── */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <h2 className="flex items-center gap-3 text-base font-bold text-foreground mb-6">
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black">6</span>
            Evidence &amp; Documents
          </h2>

          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors group">
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
            <p className="text-sm font-semibold text-foreground">Click to upload or drag &amp; drop</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 10MB each</p>
            <input type="file" accept=".pdf,image/*" multiple onChange={handleFiles} className="sr-only" />
          </label>

          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between bg-muted rounded-lg px-4 py-2.5 text-sm">
                  <span className="truncate text-foreground font-medium">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} className="ml-4 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Note: Document storage will be enabled in the next release.
          </p>
        </div>

        {/* ── Form Actions ── */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <Link href="/cases">
            <Button variant="ghost" type="button" className="font-semibold rounded-xl px-6" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="font-bold rounded-xl px-8 shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:scale-100 cursor-pointer"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Case'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}