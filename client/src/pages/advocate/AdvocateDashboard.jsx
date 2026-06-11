import React from 'react';

export default function AdvocateDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">Lawyer Dashboard</h2>
        <p className="text-sm text-slate-400">Welcome to your workspace. Below are your case and schedule summaries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Legal Files</p>
          <p className="text-4xl font-extrabold text-gold mt-2">28</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Clients Directory</p>
          <p className="text-4xl font-extrabold text-gold mt-2">49</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Hired Munshi Clerks</p>
          <p className="text-4xl font-extrabold text-gold mt-2">2</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Upcoming Hearings</h3>
        <p className="text-slate-400 text-sm">No court hearings scheduled for today.</p>
      </div>
    </div>
  );
}
