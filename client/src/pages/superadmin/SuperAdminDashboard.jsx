import React from 'react';

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">System Overview</h2>
        <p className="text-sm text-slate-400">Real-time statistics of the Antigravity multi-tenant platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Advocate Tenants</p>
          <p className="text-4xl font-extrabold text-gold mt-2">142</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Platform Recurring Revenue</p>
          <p className="text-4xl font-extrabold text-gold mt-2">$2,840</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Servers Health</p>
          <p className="text-4xl font-extrabold text-emerald-500 mt-2">100%</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Activities</h3>
        <p className="text-slate-400 text-sm">All SaaS networks are operating under peak efficiency. No issues logged.</p>
      </div>
    </div>
  );
}
