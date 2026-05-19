'use client';

import { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, Loader2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

type Payment = {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  paidAt: string | null;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
  case: { id: string; caseTitle: string; caseNumber: string } | null;
  payments: Payment[];
};

const INV_STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  PAID:      { bg: '#F0FDF4', text: '#15803D', icon: CheckCircle,    label: 'Paid' },
  SENT:      { bg: '#EFF6FF', text: '#1D4ED8', icon: Clock,          label: 'Due' },
  PARTIAL:   { bg: '#FFFBEB', text: '#B45309', icon: AlertTriangle,  label: 'Partial' },
  OVERDUE:   { bg: '#FEF2F2', text: '#DC2626', icon: AlertTriangle,  label: 'Overdue' },
  DRAFT:     { bg: '#F9FAFB', text: '#6B7280', icon: Clock,          label: 'Draft' },
  CANCELLED: { bg: '#F9FAFB', text: '#6B7280', icon: Clock,          label: 'Cancelled' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClientPaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/client/invoices', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setInvoices(d.invoices);
      })
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false));
  }, []);

  const totalDue = invoices
    .filter(i => ['SENT', 'PARTIAL', 'OVERDUE'].includes(i.status))
    .reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);

  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E3A5F' }} />
        <p className="text-sm text-gray-500">Loading payment history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Unable to load payments</p>
          <p className="text-sm text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F2240' }}>Payments & Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">Your payment history — read only</p>
      </div>

      {/* Summary bar */}
      {invoices.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ border: '1px solid #E5E7EB' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Paid</p>
              <p className="text-xl font-bold text-gray-900">PKR {totalPaid.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ border: '1px solid #E5E7EB' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FFFBEB' }}>
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Outstanding Balance</p>
              <p className="text-xl font-bold text-gray-900">PKR {Math.round(totalDue).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 gap-3" style={{ border: '1px solid #E5E7EB' }}>
          <CreditCard className="w-12 h-12 text-gray-200" />
          <p className="text-gray-500 font-medium">No invoices on record</p>
          <p className="text-sm text-gray-400">Your payment history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map(inv => {
            const cfg = INV_STATUS_CONFIG[inv.status] ?? INV_STATUS_CONFIG.DRAFT;
            const StatusIcon = cfg.icon;
            const remaining = inv.totalAmount - inv.paidAmount;
            return (
              <div key={inv.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {/* Invoice header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">Invoice #{inv.invoiceNumber}</p>
                      <span
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    {inv.case && (
                      <p className="text-xs text-gray-500 mt-0.5">{inv.case.caseTitle} · #{inv.case.caseNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">PKR {inv.totalAmount.toLocaleString()}</p>
                    {remaining > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        PKR {Math.round(remaining).toLocaleString()} remaining
                      </p>
                    )}
                  </div>
                </div>

                {/* Invoice breakdown */}
                <div className="px-5 py-3 grid grid-cols-3 gap-4 bg-gray-50/50 text-xs text-gray-500">
                  <div>
                    <p className="font-medium text-gray-400">Due Date</p>
                    <p className="mt-0.5 text-gray-700">{formatDate(inv.dueDate)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-400">Base Amount</p>
                    <p className="mt-0.5 text-gray-700">PKR {inv.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-400">Amount Paid</p>
                    <p className="mt-0.5 font-semibold" style={{ color: '#15803D' }}>
                      PKR {inv.paidAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Payments */}
                {inv.payments.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Payment Receipts</p>
                    <div className="space-y-2">
                      {inv.payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-gray-600">{p.method}</span>
                            {p.reference && <span className="text-gray-400">· Ref: {p.reference}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-800">PKR {p.amount.toLocaleString()}</span>
                            <span className="text-gray-400">{formatDate(p.paidAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
