'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, Calendar, FileText, CreditCard,
  AlertCircle, Loader2, MapPin, User, Clock,
} from 'lucide-react';

type CaseDetail = {
  id: string;
  caseTitle: string;
  caseNumber: string;
  firNumber: string | null;
  courtName: string;
  judgeName: string | null;
  caseType: string;
  status: string;
  priority: string;
  filingDate: string | null;
  nextHearingDate: string | null;
  oppositeParty: string;
  oppositeCounsel: string | null;
  policeStation: string | null;
  legalSections: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  hearings: Array<{
    id: string;
    hearingDate: string;
    hearingTime: string | null;
    courtName: string;
    purpose: string;
    status: string;
    orderSummary: string | null;
    nextHearingDate: string | null;
  }>;
  documents: Array<{
    id: string;
    title: string;
    type: string;
    mimeType: string | null;
    size: number | null;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string | null;
    createdAt: string;
  }>;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  FILED:          { bg: '#EFF6FF', text: '#1D4ED8' },
  ONGOING:        { bg: '#F0FDF4', text: '#15803D' },
  PRE_LITIGATION: { bg: '#FFFBEB', text: '#B45309' },
  STAYED:         { bg: '#FFF7ED', text: '#C2410C' },
  CLOSED:         { bg: '#F9FAFB', text: '#6B7280' },
  DISPOSED:       { bg: '#F9FAFB', text: '#6B7280' },
  APPEALED:       { bg: '#FAF5FF', text: '#7C3AED' },
};

const HEARING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: '#EFF6FF', text: '#1D4ED8' },
  HEARD:     { bg: '#F0FDF4', text: '#15803D' },
  ADJOURNED: { bg: '#FFFBEB', text: '#B45309' },
  CANCELLED: { bg: '#FEF2F2', text: '#DC2626' },
};

const INV_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SENT:      { bg: '#EFF6FF', text: '#1D4ED8' },
  PARTIAL:   { bg: '#FFFBEB', text: '#B45309' },
  OVERDUE:   { bg: '#FEF2F2', text: '#DC2626' },
  PAID:      { bg: '#F0FDF4', text: '#15803D' },
  DRAFT:     { bg: '#F9FAFB', text: '#6B7280' },
  CANCELLED: { bg: '#F9FAFB', text: '#6B7280' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Icon className="w-4 h-4" style={{ color: '#1E3A5F' }} />
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ClientCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.caseId as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!caseId) return;
    fetch(`/api/client/cases/${caseId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setCaseData(d.case);
      })
      .catch(() => setError('Failed to load case'))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E3A5F' }} />
        <p className="text-sm text-gray-500">Loading case details…</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#1E3A5F' }}>
          <ArrowLeft className="w-4 h-4" /> Back to cases
        </button>
        <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Unable to load case</p>
            <p className="text-sm text-red-600 mt-0.5">{error || 'Case not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const sc = STATUS_COLORS[caseData.status] ?? { bg: '#F9FAFB', text: '#6B7280' };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/client/cases" className="flex items-center gap-1.5 text-sm mb-4 hover:underline w-fit" style={{ color: '#1E3A5F' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to My Cases
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0F2240' }}>{caseData.caseTitle}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Case #{caseData.caseNumber} · {caseData.caseType} · {caseData.courtName}
            </p>
          </div>
          <span
            className="self-start text-sm font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: sc.bg, color: sc.text }}
          >
            {caseData.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Case Info Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Court', value: caseData.courtName, icon: MapPin },
          { label: 'Judge', value: caseData.judgeName ?? '—', icon: User },
          { label: 'Next Hearing', value: formatDate(caseData.nextHearingDate), icon: Calendar },
          { label: 'Opposite Party', value: caseData.oppositeParty, icon: User },
          { label: 'Filing Date', value: formatDate(caseData.filingDate), icon: Calendar },
          { label: 'Case Type', value: caseData.caseType, icon: Briefcase },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-4 flex items-start gap-3" style={{ border: '1px solid #E5E7EB' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
              <Icon className="w-4 h-4" style={{ color: '#1E3A5F' }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {caseData.description && (
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E5E7EB' }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Case Description</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{caseData.description}</p>
        </div>
      )}

      {/* Hearing History */}
      <SectionCard title={`Hearing History (${caseData.hearings.length})`} icon={Clock}>
        {caseData.hearings.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No hearings recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {caseData.hearings.map(h => {
              const hsc = HEARING_STATUS_COLORS[h.status] ?? { bg: '#F9FAFB', text: '#6B7280' };
              return (
                <div key={h.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(h.hearingDate)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{h.courtName} · {h.purpose}</p>
                      {h.orderSummary && (
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{h.orderSummary}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: hsc.bg, color: hsc.text }}>
                      {h.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Shared Documents */}
      <SectionCard title={`Shared Documents (${caseData.documents.length})`} icon={FileText}>
        {caseData.documents.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No shared documents for this case</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {caseData.documents.map(d => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                    <FileText className="w-4 h-4" style={{ color: '#1E3A5F' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                    <p className="text-xs text-gray-500">{d.type} · {formatDate(d.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Invoices */}
      <SectionCard title={`Invoices & Payments (${caseData.invoices.length})`} icon={CreditCard}>
        {caseData.invoices.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No invoices for this case</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {caseData.invoices.map(inv => {
              const isc = INV_STATUS_COLORS[inv.status] ?? { bg: '#F9FAFB', text: '#6B7280' };
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">#{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Total: PKR {inv.totalAmount.toLocaleString()} · Paid: PKR {inv.paidAmount.toLocaleString()}
                    </p>
                    {inv.dueDate && <p className="text-xs text-gray-400">Due: {formatDate(inv.dueDate)}</p>}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: isc.bg, color: isc.text }}>
                    {inv.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
