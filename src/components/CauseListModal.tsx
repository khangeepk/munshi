'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Calendar } from 'lucide-react';

interface CaseRow {
  id: string;
  title: string;
  caseType: string;
  caseFrom: string;
  caseAgainst: string;
  submissionDate: string;
  firNumber: string | null;
  location: string;
  judgeName: string | null;
  nextHearingDate: string | null;
  clientPhone: string | null;
  decision: string | null;
  remarks: string | null;
  status: string;
  lawyer: { name: string };
}

interface CauseListModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: CaseRow[];
}

export function CauseListModal({ isOpen, onClose, cases }: CauseListModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize with today's date in YYYY-MM-DD
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  const filteredCases = useMemo(() => {
    if (!selectedDate) return [];
    return cases.filter(c => {
      if (!c.nextHearingDate) return false;
      const hearingDateStr = new Date(c.nextHearingDate).toISOString().split('T')[0];
      return hearingDateStr === selectedDate;
    });
  }, [cases, selectedDate]);

  if (!isOpen || !mounted) return null;

  const displayDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const modalContent = (
    <div id="print-root" className="fixed inset-0 z-[100] bg-white overflow-y-auto text-black print-wrapper">
      {/* Non-printable header for preview controls */}
      <div className="no-print sticky top-0 bg-slate-100 border-b border-slate-300 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-semibold outline-none bg-transparent text-slate-800"
            />
          </div>
          <span className="text-sm font-medium text-slate-500">
            {filteredCases.length} hearing(s) found
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Now
          </button>
          <button 
            onClick={onClose}
            className="p-2.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="p-8 max-w-5xl mx-auto print-area bg-white">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">Daily Cause List</h1>
          <p className="text-lg font-semibold border-b-2 border-black inline-block pb-1">
            {displayDate}
          </p>
        </div>

        {filteredCases.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-300 rounded-xl no-print">
            <p className="text-lg">No hearings scheduled for {displayDate}.</p>
            <p className="text-sm mt-1">Select a different date from the picker above.</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-black text-sm text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-3 font-bold w-12 text-center">S.No</th>
                <th className="border border-black p-3 font-bold">Case Title & FIR</th>
                <th className="border border-black p-3 font-bold">Court Name</th>
                <th className="border border-black p-3 font-bold">Judge</th>
                <th className="border border-black p-3 font-bold w-24">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c, index) => {
                const timeStr = c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                return (
                  <tr key={c.id}>
                    <td className="border border-black p-3 text-center font-medium">{index + 1}</td>
                    <td className="border border-black p-3">
                      <div className="font-bold">{c.title}</div>
                      {c.firNumber && (
                        <div className="text-xs mt-1 text-slate-700">FIR: {c.firNumber}</div>
                      )}
                    </td>
                    <td className="border border-black p-3">
                      {c.location === 'ISLAMABAD' ? 'Islamabad High Court' : 'Rawalpindi District Court'}
                    </td>
                    <td className="border border-black p-3">{c.judgeName || '—'}</td>
                    <td className="border border-black p-3 whitespace-nowrap">{timeStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
