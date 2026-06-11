import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  CircleDollarSign, Users, Calendar, AlertCircle, CheckCircle, 
  Loader2, ArrowUpRight, RefreshCw
} from 'lucide-react';

export default function SuperAdminFinance() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  // Filter Dropdowns State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Load finance summary metrics and full invoice ledger
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryRes = await fetch('/api/superadmin/financials/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!summaryRes.ok) throw new Error('Failed to load financial summary.');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      const paymentsRes = await fetch('/api/superadmin/financials/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!paymentsRes.ok) throw new Error('Failed to load payment histories.');
      const paymentsData = await paymentsRes.json();
      setPayments(paymentsData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Mark pending/overdue payment invoice as PAID
  const handleMarkPaid = async (paymentId) => {
    setMarkingId(paymentId);
    try {
      const response = await fetch(`/api/superadmin/financials/payments/${paymentId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark payment paid.');
      }
      
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setMarkingId(null);
    }
  };

  // Resolve status badges
  const getPaymentStatus = (p) => {
    if (p.status === 'PAID') return 'PAID';
    const due = new Date(p.dueDate);
    const now = new Date();
    if (due < now) return 'OVERDUE';
    return 'PENDING';
  };

  // Color code based on upcoming payment urgency
  const getUrgencyColor = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    due.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'border-red-500/30 bg-red-500/10 text-red-400';
    if (diffDays <= 7) return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  };

  const getUrgencyLabel = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    due.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    return `Due in ${diffDays} days`;
  };

  // Groups and sums paid invoices by month over last 6 months
  const getChartData = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        Revenue: 0
      });
    }

    payments.forEach(p => {
      if (p.status === 'PAID' && p.paidAt) {
        const paidDate = new Date(p.paidAt);
        const pMonth = paidDate.getMonth();
        const pYear = paidDate.getFullYear();
        
        const match = months.find(m => m.monthNum === pMonth && m.year === pYear);
        if (match) {
          match.Revenue += p.amount;
        }
      }
    });

    return months;
  };

  const chartData = getChartData();

  // Dynamic filter application
  const filteredPayments = payments.filter(p => {
    const status = getPaymentStatus(p);
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

    let matchesMonth = true;
    let matchesYear = true;

    const dueDate = new Date(p.dueDate);
    
    if (monthFilter !== 'ALL') {
      matchesMonth = (dueDate.getMonth() + 1) === parseInt(monthFilter);
    }
    if (yearFilter !== 'ALL') {
      matchesYear = dueDate.getFullYear() === parseInt(yearFilter);
    }

    return matchesStatus && matchesMonth && matchesYear;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Financial Overview</h2>
          <p className="text-sm text-slate-400">View recurring subscription receipts, outstanding invoices, and collection summaries.</p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Sync Ledger"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-24 flex flex-col justify-center items-center shadow-lg">
          <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
          <p className="text-slate-400 text-sm font-semibold tracking-wider">Syncing Ledger...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-800/60 p-6 rounded-xl text-center text-red-400 text-sm">
          ⚠️ {error}
        </div>
      ) : (
        <>
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Active Advocates */}
            <div className="bg-blue-955/20 border border-blue-800/50 p-5 rounded-xl shadow shadow-blue-900/10">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Advocates</p>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-extrabold text-blue-400 mt-2">{summary?.activeAdvocates || 0}</p>
              <p className="text-[10px] text-slate-500 mt-1">out of {summary?.totalAdvocates || 0} total</p>
            </div>

            {/* Expected Revenue */}
            <div className="bg-emerald-955/20 border border-emerald-800/50 p-5 rounded-xl shadow shadow-emerald-900/10">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Expected MRR</p>
                <CircleDollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-400 mt-2">${summary?.totalMonthlyRevenue.toFixed(2) || '0.00'}</p>
              <p className="text-[10px] text-slate-500 mt-1">active monthly fees</p>
            </div>

            {/* Collected This Month */}
            <div className="bg-emerald-955/20 border border-emerald-800/50 p-5 rounded-xl shadow shadow-emerald-900/10">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Collected</p>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline space-x-1 mt-2">
                <p className="text-3xl font-extrabold text-emerald-400">${summary?.collectedThisMonth.toFixed(2) || '0.00'}</p>
                <span className="text-[10px] text-emerald-400">✓</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">received current month</p>
            </div>

            {/* Pending Payments */}
            <div className="bg-amber-955/20 border border-amber-800/50 p-5 rounded-xl shadow shadow-amber-900/10">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending</p>
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-extrabold text-amber-400 mt-2">${summary?.pendingThisMonth.toFixed(2) || '0.00'}</p>
              <p className="text-[10px] text-slate-500 mt-1">due current month</p>
            </div>

            {/* Overdue Payments */}
            <div className="bg-red-955/20 border border-red-800/50 p-5 rounded-xl shadow shadow-red-900/10">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Overdue</p>
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-3xl font-extrabold text-red-400 mt-2">${summary?.overduePayments.toFixed(2) || '0.00'}</p>
              <p className="text-[10px] text-slate-500 mt-1">past due invoices</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly collections bar chart (Recharts) */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-slate-200 mb-6 flex items-center space-x-2">
                <span>Revenue Performance</span>
                <span className="text-xs font-mono text-slate-500">(Last 6 Months PAID Invoices)</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                      itemStyle={{ color: '#D4AF37' }}
                    />
                    <Bar dataKey="Revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming collections due timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
              <h3 className="font-semibold text-slate-200 mb-4 flex items-center space-x-2">
                <span>Upcoming Collections</span>
                <span className="text-xs font-mono text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">30 Days</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto max-h-64 pr-1 space-y-3">
                {!summary?.upcomingPayments || summary.upcomingPayments.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-12">No invoices due in the next 30 days.</p>
                ) : (
                  summary.upcomingPayments.map(p => (
                    <div key={p.id} className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{p.advocateName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(p.dueDate).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-200 font-mono">${p.amount.toFixed(2)}</div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold border mt-1 ${getUrgencyColor(p.dueDate)}`}>
                          {getUrgencyLabel(p.dueDate)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            
            {/* Table Header Filter selectors */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="font-semibold text-slate-200">Ledger Invoices</h3>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Status selector */}
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-gold cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="OVERDUE">Overdue</option>
                </select>

                {/* Month selector */}
                <select 
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-355 focus:outline-none focus:border-gold cursor-pointer"
                >
                  <option value="ALL">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const mName = new Date(0, i).toLocaleString('default', { month: 'long' });
                    return <option key={i+1} value={i+1}>{mName}</option>;
                  })}
                </select>

                {/* Year selector */}
                <select 
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-355 focus:outline-none focus:border-gold cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            {/* Datatable */}
            <div className="overflow-x-auto">
              {filteredPayments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-16">No invoice transactions found matching requirements.</p>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-955 border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase text-[11px]">
                      <th className="px-6 py-4">Advocate Name</th>
                      <th className="px-6 py-4">Billing Amount</th>
                      <th className="px-6 py-4">Due Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Paid Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPayments.map((p) => {
                      const status = getPaymentStatus(p);
                      return (
                        <tr key={p.id} className="hover:bg-slate-850/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-200">{p.advocate?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{p.advocate?.email || ''}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-350 font-mono font-semibold">${p.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">{new Date(p.dueDate).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            {status === 'PAID' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs uppercase tracking-wider font-semibold">
                                Paid
                              </span>
                            )}
                            {status === 'PENDING' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider font-semibold">
                                Pending
                              </span>
                            )}
                            {status === 'OVERDUE' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold text-xs uppercase tracking-wider font-semibold">
                                Overdue
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                            {p.paidAt ? new Date(p.paidAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {status !== 'PAID' ? (
                              <button 
                                onClick={() => handleMarkPaid(p.id)}
                                disabled={markingId !== null}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer ml-auto shadow shadow-emerald-950/20 disabled:opacity-50"
                              >
                                {markingId === p.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <ArrowUpRight size={12} />
                                )}
                                <span>Mark Paid</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 text-xs pr-4">Collected</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
