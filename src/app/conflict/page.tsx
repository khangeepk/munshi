'use client';
import { useState, useRef } from 'react';
import { Search, AlertTriangle, CheckCircle2, Loader2, Users, Briefcase, ShieldAlert } from 'lucide-react';

interface ConflictResult {
  hasConflict: boolean; query: string; summary: string;
  clientMatches: any[]; caseMatches: any[];
}

export default function ConflictPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ConflictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    if (!query.trim() || query.length < 2) return;
    setLoading(true); setSearched(false);
    const res = await fetch(`/api/conflict?query=${encodeURIComponent(query)}`);
    if (res.ok) setResult(await res.json());
    setLoading(false); setSearched(true);
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Conflict of Interest Engine</h1>
          <p className="text-sm text-muted-foreground">Search new clients against the firm's historical database before onboarding.</p>
        </div>
      </div>

      {/* Search Box */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8 shadow-sm">
        <p className="text-sm text-muted-foreground mb-4">Enter a client name, opposing party, CNIC number, or email to check for potential conflicts.</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Ali Khan, 35202-1234567-1, opposing@party.com"
            />
          </div>
          <button onClick={search} disabled={loading || query.length < 2}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg,#c5a059,#d4b76a)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Check
          </button>
        </div>
      </div>

      {/* Result */}
      {searched && result && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className={`flex items-start gap-4 p-5 rounded-2xl border ${result.hasConflict ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
            {result.hasConflict
              ? <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              : <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />}
            <div>
              <p className={`font-bold text-base ${result.hasConflict ? 'text-amber-500' : 'text-emerald-500'}`}>
                {result.hasConflict ? 'Potential Conflict Detected' : 'No Conflict Found'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
            </div>
          </div>

          {/* Client Matches */}
          {result.clientMatches.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: '#c5a059' }} />
                <h2 className="font-bold text-sm">Existing Client Matches ({result.clientMatches.length})</h2>
              </div>
              {result.clientMatches.map((client: any) => (
                <div key={client.id} className="px-5 py-4 border-b border-border/50 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{client.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">CNIC: {client.cnic_number || '—'} · Phone: {client.phone || '—'} · Email: {client.email || '—'}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(197,160,89,0.15)', color: '#c5a059' }}>{client.cases?.length ?? 0} case(s)</span>
                  </div>
                  {client.cases?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {client.cases.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          <span className="font-semibold text-foreground">{c.title}</span>
                          <span>vs.</span><span>{c.caseAgainst}</span>
                          <span className="ml-auto px-1.5 py-0.5 rounded bg-muted font-bold">{c.case_status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Case Matches */}
          {result.caseMatches.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Briefcase className="w-4 h-4" style={{ color: '#c5a059' }} />
                <h2 className="font-bold text-sm">Case Record Matches ({result.caseMatches.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">{['Case Title','Plaintiff','Defendant','Status','Lawyer'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>{result.caseMatches.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-semibold">{c.title}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.caseFrom || c.client?.name || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.caseAgainst || '—'}</td>
                      <td className="px-5 py-3"><span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500">{c.case_status}</span></td>
                      <td className="px-5 py-3 text-muted-foreground">{c.lawyer?.full_name || '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="text-center py-20 text-muted-foreground">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Enter a name or CNIC above to check for conflicts.</p>
        </div>
      )}
    </div>
  );
}
