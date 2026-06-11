import React from 'react';

export default function AdvocateClients() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">Clients Directory</h2>
        <p className="text-sm text-slate-400">Manage client contact details, case associations, and directory logs.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <h3 className="font-semibold text-slate-200">Registered Client Profiles</h3>
          <button className="bg-gold hover:bg-gold-hover text-slate-950 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer shadow">
            Add New Client
          </button>
        </div>
        <div className="p-12 text-center text-slate-400 text-sm">
          👥 No clients found in the practice directory. Register a client to begin.
        </div>
      </div>
    </div>
  );
}
