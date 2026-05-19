'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, ChevronRight, Calendar, AlertCircle, Loader2, Search } from 'lucide-react';

type Case = {
  id: string;
  caseTitle: string;
  caseNumber: string;
  courtName: string;
  caseType: string;
  status: string;
  priority: string;
  filingDate: string | null;
  nextHearingDate: string | null;
  oppositeParty: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  FILED:          { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  ONGOING:        { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  PRE_LITIGATION: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  STAYED:         { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  CLOSED:         { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' },
  DISPOSED:       { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' },
  APPEALED:       { bg: '#FAF5FF', text: '#7C3AED', dot: '#A78BFA' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function ClientCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [filtered, setFiltered] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/client/cases', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setCases(d.cases); setFiltered(d.cases); }
      })
      .catch(() => setError('Failed to load cases'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      cases.filter(c =>
        c.caseTitle.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.courtName.toLowerCase().includes(q) ||
        c.oppositeParty.toLowerCase().includes(q),
      ),
    );
  }, [search, cases]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E3A5F' }} />
        <p className="text-sm text-gray-500">Loading your cases…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Unable to load cases</p>
          <p className="text-sm text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F2240' }}>My Cases</h1>
          <p className="text-sm text-gray-500 mt-1">{cases.length} case{cases.length !== 1 ? 's' : ''} on record</p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search cases…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 w-64"
            style={{ '--tw-ring-color': '#1E3A5F' } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Cases list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 gap-3" style={{ border: '1px solid #E5E7EB' }}>
          <Briefcase className="w-12 h-12 text-gray-200" />
          <p className="text-gray-500 font-medium">
            {search ? 'No cases match your search' : 'No cases found'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="text-sm underline" style={{ color: '#1E3A5F' }}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const sc = STATUS_COLORS[c.status] ?? { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' };
            return (
              <Link key={c.id} href={`/client/cases/${c.id}`}>
                <div
                  className="bg-white rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  style={{ border: '1px solid #E5E7EB' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: '#EFF6FF' }}
                      >
                        <Briefcase className="w-5 h-5" style={{ color: '#1E3A5F' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.caseTitle}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Case #{c.caseNumber} · {c.courtName}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">vs. {c.oppositeParty}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                      {c.nextHearingDate && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(c.nextHearingDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
