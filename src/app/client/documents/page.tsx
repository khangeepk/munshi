'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, AlertCircle, Loader2, Search } from 'lucide-react';

type Doc = {
  id: string;
  title: string;
  type: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  case: { id: string; caseTitle: string; caseNumber: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  LEGAL_BRIEF: 'Legal Brief',
  EVIDENCE: 'Evidence',
  COURT_ORDER: 'Court Order',
  CONTRACT: 'Contract',
  ID_PROOF: 'ID Proof',
  INVOICE: 'Invoice',
  OTHER: 'Other',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filtered, setFiltered] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/client/documents', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setDocs(d.documents); setFiltered(d.documents); }
      })
      .catch(() => setError('Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(docs.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      (d.case?.caseTitle ?? '').toLowerCase().includes(q),
    ));
  }, [search, docs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E3A5F' }} />
        <p className="text-sm text-gray-500">Loading documents…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Unable to load documents</p>
          <p className="text-sm text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F2240' }}>My Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            {docs.length} shared document{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 gap-3" style={{ border: '1px solid #E5E7EB' }}>
          <FileText className="w-12 h-12 text-gray-200" />
          <p className="text-gray-500 font-medium">
            {search ? 'No documents match your search' : 'No shared documents yet'}
          </p>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            Documents shared by your law firm will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="divide-y divide-gray-50">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                  <FileText className="w-5 h-5" style={{ color: '#1E3A5F' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TYPE_LABELS[doc.type] ?? doc.type}
                    {doc.case && ` · ${doc.case.caseTitle}`}
                    {' · '}{formatDate(doc.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{formatSize(doc.size)}</span>
                  {/* NOTE: Download button present but secure URL generation pending Supabase Storage integration */}
                  <button
                    title="Request download from your law firm"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    onClick={() => alert('Please contact your law firm to download this document.')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
