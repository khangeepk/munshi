'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  DollarSign, Search, AlertCircle, Loader2, ArrowRight, CheckCircle2, Banknote 
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
}

interface CaseBilling {
  id: string;
  title: string;
  caseFrom: string;
  caseAgainst: string;
  totalFee: number | null;
  pendingFeeDueDate: string | null;
  payments: Payment[];
  status: string;
}

export default function BillingPage() {
  const [cases, setCases] = useState<CaseBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => setCases(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const processedCases = useMemo(() => {
    return cases.map(c => {
      const total = c.totalFee || 0;
      const paid = c.payments.reduce((acc, p) => acc + p.amount, 0);
      const balance = total - paid;
      
      let status = 'Pending';
      if (total > 0 && balance <= 0) status = 'Paid';
      else if (balance > 0 && c.pendingFeeDueDate && new Date(c.pendingFeeDueDate) < new Date(new Date().setHours(0,0,0,0))) {
        status = 'Overdue';
      }

      return { ...c, total, paid, balance, billingStatus: status };
    }).filter(c => 
      c.title.toLowerCase().includes(search.toLowerCase()) || 
      c.caseFrom.toLowerCase().includes(search.toLowerCase())
    );
  }, [cases, search]);

  const totalRevenue = processedCases.reduce((acc, c) => acc + c.paid, 0);
  const totalOutstanding = processedCases.reduce((acc, c) => acc + c.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading billing records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Billing & Financials</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all client fees, payments, and outstanding balances.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border border-border bg-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Total Revenue Collected</p>
            <p className="text-2xl font-bold text-foreground">Rs. {totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-xl p-5 border border-border bg-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Total Outstanding Dues</p>
            <p className="text-2xl font-bold text-foreground">Rs. {totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by client or case title..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="px-6 py-4">Client & Case</th>
                <th className="px-6 py-4 text-right">Total Fee</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Pending Balance</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processedCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    No billing records found.
                  </td>
                </tr>
              ) : processedCases.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{c.caseFrom}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.title}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">Rs. {c.total.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">Rs. {c.paid.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400">Rs. {c.balance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">
                    {c.pendingFeeDueDate ? new Date(c.pendingFeeDueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${
                      c.billingStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      c.billingStatus === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {c.billingStatus === 'Paid' && <CheckCircle2 className="w-3 h-3" />}
                      {c.billingStatus === 'Overdue' && <AlertCircle className="w-3 h-3" />}
                      {c.billingStatus === 'Pending' && <DollarSign className="w-3 h-3" />}
                      {c.billingStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/cases/${c.id}`} className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold text-xs">
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
