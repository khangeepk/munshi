import React from 'react';

export default function MunshiDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">Munshi Clerk Dashboard</h2>
        <p className="text-sm text-slate-400">Assisting Advocate's practice. Below is your assigned checklist.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Assigned Clients</p>
          <p className="text-4xl font-extrabold text-gold mt-2">12</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Assigned Case Files</p>
          <p className="text-4xl font-extrabold text-gold mt-2">6</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Practice Permissions</h3>
        <p className="text-slate-400 text-sm">Your account has delegated permissions to read case details and register clients.</p>
      </div>
    </div>
  );
}
