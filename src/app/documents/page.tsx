'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileText, Search, Download, Trash2, X, CheckCircle2, AlertCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DocumentRow {
  id: string;
  title: string;
  fileUrl: string;
  category: string;
  uploadedAt: string;
  case: {
    title: string;
    lawyer: {
      role: string;
    };
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface ToastState { type: ToastType; message: string; id: number }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const bgClass =
    toast.type === 'success' ? 'bg-emerald-600 text-white' :
    toast.type === 'error'   ? 'bg-rose-600 text-white' :
                               'bg-blue-600 text-white';

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${bgClass}`}>
      {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
      {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
      {toast.type === 'info' && <Download className="w-5 h-5 shrink-0" />}
      {toast.message}
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  docTitle,
  onConfirm,
  onCancel,
  loading,
}: {
  docTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-foreground text-center mb-2">Delete Document?</h2>
        <p className="text-sm text-muted-foreground text-center leading-relaxed mb-1">
          You are about to permanently delete:
        </p>
        <p className="text-sm font-bold text-foreground text-center mb-6 px-4 truncate">
          "{docTitle}"
        </p>
        <p className="text-xs text-rose-500 text-center font-semibold mb-8">
          ⚠ This action cannot be undone. The file will be removed.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFileType(fileUrl: string, title: string) {
  const urlExt = fileUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (urlExt && ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc', 'txt'].includes(urlExt)) {
    return urlExt.toUpperCase();
  }
  const titleExt = title.split('.').pop()?.toLowerCase();
  if (titleExt && ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc', 'txt'].includes(titleExt)) {
    return titleExt.toUpperCase();
  }
  return 'PDF'; // Fallback mock type
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'ADMIN': return 'Administrator';
    case 'DATA_ENTRY': return 'Data Entry';
    case 'LAWYER': return 'Lawyer';
    case 'PARALEGAL': return 'Paralegal';
    default: return role;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { canDeleteCases } = useAuth();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDoc, setDeleteDoc] = useState<DocumentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastCounter = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    toastCounter.current += 1;
    setToast({ type, message, id: toastCounter.current });
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load documents');
      const data: DocumentRow[] = await res.json();
      setDocuments(data);
    } catch {
      showToast('error', 'Failed to load documents.');
    } finally {
      setFetching(false);
    }
  }, [showToast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return documents;
    return documents.filter((d) => 
      d.title.toLowerCase().includes(q) || 
      d.case?.title.toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const handleDownload = (doc: DocumentRow) => {
    showToast('info', `Downloading ${doc.title}...`);
    // In a real app, you would window.open(doc.fileUrl) or trigger an anchor download.
  };

  const handleConfirmDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteDoc.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Delete failed');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setDeleteDoc(null);
      showToast('success', 'Document deleted successfully');
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      
      {deleteDoc && (
        <DeleteModal
          docTitle={deleteDoc.title}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteDoc(null)}
          loading={deleting}
        />
      )}

      <div className="space-y-5 sm:space-y-6">
        {/* ── Page Header & Search ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary shrink-0" />
              Document Library
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">
              Firm-wide storage for case files, pleadings, and evidence.
            </p>
          </div>
          
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files or cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
            />
          </div>
        </div>

        {/* ── Table Card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {fetching ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading documents…</span>
            </div>
          ) : documents.length === 0 && !searchQuery ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(59,130,246,0.06) 100%)',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}
              >
                <FileText className="w-9 h-9 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No documents uploaded yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
                When you add new cases or upload files to existing ones, they will securely appear here.
              </p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-sm font-semibold text-foreground mb-1">No files match your search</p>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                Try a different document name or associated case title.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-sm font-bold text-primary underline-offset-4 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left" style={{ minWidth: '700px' }}>
                <thead>
                  <tr
                    className="text-muted-foreground uppercase text-[11px] font-bold tracking-wider"
                    style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.03)' }}
                  >
                    <th className="px-6 py-3.5">Document Name</th>
                    <th className="px-6 py-3.5">Associated Case</th>
                    <th className="px-6 py-3.5">File Type</th>
                    <th className="px-6 py-3.5">Upload Date</th>
                    <th className="px-6 py-3.5">Uploaded By</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => {
                    const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const fileType = getFileType(doc.fileUrl, doc.title);
                    
                    return (
                      <tr
                        key={doc.id}
                        className="group transition-colors hover:bg-muted/40"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-foreground leading-tight line-clamp-1 block">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-1 tracking-wide uppercase">
                            {doc.category}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">
                            {doc.case?.title || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-muted text-xs font-bold text-muted-foreground">
                            {fileType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {uploadDate}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-foreground bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                            {getRoleLabel(doc.case?.lawyer?.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDownload(doc)}
                              title="Download"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {canDeleteCases && (
                              <button
                                onClick={() => setDeleteDoc(doc)}
                                title="Delete"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {!fetching && documents.length > 0 && (
            <div
              className="px-6 py-3 flex items-center justify-between text-xs text-muted-foreground"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span>
                Showing {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                {searchQuery && documents.length !== filteredDocs.length
                  ? ` (of ${documents.length} total)`
                  : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
