'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Calendar, FileText, CreditCard,
  AlertCircle, ChevronRight, Clock, TrendingUp, Loader2,
} from 'lucide-react';

type DashboardData = {
  stats: {
    activeCases: number;
    upcomingHearings: number;
    sharedDocuments: number;
    pendingAmount: number;
  };
  upcomingHearings: Array<{
    id: string;
    hearingDate: string;
    courtName: string;
    purpose: string;
    status: string;
    case: { caseTitle: string; caseNumber: string };
  }>;
  pendingInvoices: Array<{
    id: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: string | null;
  }>;
  recentCases: Array<{
    id: string;
    caseTitle: string;
    caseNumber: string;
    status: string;
    courtName: string;
    nextHearingDate: string | null;
    updatedAt: string;
  }>;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  FILED:           { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  ONGOING:         { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  PRE_LITIGATION:  { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  STAYED:          { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  CLOSED:          { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' },
  DISPOSED:        { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' },
  APPEALED:        { bg: '#FAF5FF', text: '#7C3AED', dot: '#A78BFA' },
};

const INV_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SENT:     { bg: '#EFF6FF', text: '#1D4ED8' },
  PARTIAL:  { bg: '#FFFBEB', text: '#B45309' },
  OVERDUE:  { bg: '#FEF2F2', text: '#DC2626' },
  PAID:     { bg: '#F0FDF4', text: '#15803D' },
  DRAFT:    { bg: '#F9FAFB', text: '#6B7280' },
  CANCELLED:{ bg: '#F9FAFB', text: '#6B7280' },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  href: string;
}) {
  return (
    <Link href={href} className="block group">
      <div
        className="rounded-2xl p-5 bg-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
        <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function daysUntil(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `In ${d} days`;
}

export default function ClientDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/dashboard', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E3A5F' }} />
        <p className="text-sm text-gray-500">Loading your dashboard…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-2xl p-6 flex items-center gap-4"
        style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
      >
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Unable to load dashboard</p>
          <p className="text-sm text-red-600 mt-0.5">{error || 'Please try refreshing the page.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F2240' }}>My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to your secure client portal.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label="Active Cases"
          value={data.stats.activeCases}
          color="#1E3A5F"
          href="/client/cases"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Hearings"
          value={data.stats.upcomingHearings}
          color="#7C3AED"
          href="/client/cases"
        />
        <StatCard
          icon={FileText}
          label="Shared Documents"
          value={data.stats.sharedDocuments}
          color="#059669"
          href="/client/documents"
        />
        <StatCard
          icon={CreditCard}
          label="Pending Amount"
          value={`PKR ${data.stats.pendingAmount.toLocaleString()}`}
          color="#D4AF37"
          href="/client/payments"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: '#1E3A5F' }} />
              <h2 className="font-semibold text-gray-900">Upcoming Hearings</h2>
            </div>
            <Link href="/client/cases" className="text-xs font-medium hover:underline" style={{ color: '#1E3A5F' }}>
              View cases →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.upcomingHearings.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No upcoming hearings in the next 7 days</p>
              </div>
            ) : data.upcomingHearings.map(h => (
              <div key={h.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{h.case.caseTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{h.courtName} · {h.purpose}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold" style={{ color: '#1E3A5F' }}>
                      {daysUntil(h.hearingDate)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(h.hearingDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Cases */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#1E3A5F' }} />
              <h2 className="font-semibold text-gray-900">Recent Cases</h2>
            </div>
            <Link href="/client/cases" className="text-xs font-medium hover:underline" style={{ color: '#1E3A5F' }}>
              All cases →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentCases.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No cases found</p>
              </div>
            ) : data.recentCases.map(c => {
              const sc = STATUS_COLORS[c.status] ?? { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' };
              return (
                <Link key={c.id} href={`/client/cases/${c.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: sc.dot }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.caseTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.courtName} · #{c.caseNumber}</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Invoices */}
      {data.pendingInvoices.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Pending Payments</h2>
            </div>
            <Link href="/client/payments" className="text-xs font-medium hover:underline" style={{ color: '#1E3A5F' }}>
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.pendingInvoices.map(inv => {
              const sc = INV_STATUS_COLORS[inv.status] ?? { bg: '#F9FAFB', text: '#6B7280' };
              const remaining = inv.totalAmount - inv.paidAmount;
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      PKR {inv.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Due: {inv.dueDate ? formatDate(inv.dueDate) : 'Not set'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      {inv.status}
                    </span>
                    {remaining > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Remaining: PKR {remaining.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
