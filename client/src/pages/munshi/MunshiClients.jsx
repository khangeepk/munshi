import React from 'react';

export default function MunshiClients() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">Clients Registry</h2>
        <p className="text-sm text-slate-400">View and add clients under your hiring Advocate's directory.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <h3 className="font-semibold text-slate-200">Practice Clients Directory</h3>
          <button className="bg-gold hover:bg-gold-hover text-slate-950 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer shadow">
            Register Client
          </button>
        </div>
        <div className="p-12 text-center text-slate-400 text-sm">
          👥 No clients registered by your clerk profile yet.
        </div>
      </div>
    </div>
  );
}
