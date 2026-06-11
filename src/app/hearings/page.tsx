'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Gavel,
  ScrollText,
  ChevronRight,
} from 'lucide-react';

type Tab = 'upcoming' | 'past';

interface HearingPayload {
  id: string;
  caseId: string;
  caseTitle: string;
  hearingAt: string;
  court: string;
  judge: string | null;
  mode: 'agenda' | 'outcome';
  detail: string;
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Time slice for display — uses local wall clock from stored instant. */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function MyHearingsPage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [upcoming, setUpcoming] = useState<HearingPayload[]>([]);
  const [past, setPast] = useState<HearingPayload[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hearings', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setUpcoming(data.upcoming ?? []);
      setPast(data.past ?? []);
    } catch {
      setUpcoming([]);
      setPast([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = tab === 'upcoming' ? upcoming : past;

  const emptyCopy = useMemo(() => {
    if (loading) return { title: '', body: '' };
    return tab === 'upcoming'
      ? {
          title: 'No upcoming hearings',
          body: 'When cases have a next hearing date scheduled on or after today, they appear here in chronological order.',
        }
      : {
          title: 'No hearing history yet',
          body: 'Past listings from your diary and case timelines with hearing-related milestones will populate this section newest first.',
        };
  }, [loading, tab]);

  const cardStyle = {
    background: 'var(--card)' as string,
    border: '1px solid var(--border)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">My Hearings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consolidated diary of upcoming hearings and completed listings.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div
        className="inline-flex p-1 rounded-2xl gap-1 w-full sm:w-auto"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
          className={`flex-1 sm:flex-none rounded-xl px-5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
            tab === 'upcoming'
              ? 'text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={tab === 'upcoming' ? { background: 'var(--primary)' } : {}}
        >
          Upcoming Hearings
          <span className="ml-2 text-[11px] font-semibold opacity-80">({upcoming.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'past'}
          onClick={() => setTab('past')}
          className={`flex-1 sm:flex-none rounded-xl px-5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
            tab === 'past'
              ? 'text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={tab === 'past' ? { background: 'var(--primary)' } : {}}
        >
          Hearing History
          <span className="ml-2 text-[11px] font-semibold opacity-80">({past.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="flex items-center justify-center py-28 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Loading hearings…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 px-6 text-center max-w-lg mx-auto">
            <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" strokeWidth={1.25} />
            <p className="font-bold text-foreground mb-2">{emptyCopy.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{emptyCopy.body}</p>
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 mt-6 text-sm font-bold text-primary"
            >
              Go to My Cases
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <section
            aria-label={
              tab === 'upcoming'
                ? 'Upcoming hearings chronologically ascending'
                : 'Past hearings chronologically descending'
            }
            className="relative"
          >
            <div
              className="absolute left-[1.875rem] top-8 bottom-8 w-px md:left-48 z-0"
              aria-hidden
              style={{ background: 'var(--border)' }}
            />
            <ol className="relative z-[1] m-0 p-0 list-none divide-y" style={{ borderColor: 'var(--border)' }}>
              {rows.map((h, i) => (
                <li key={h.id} className="list-none">
                  <HearingTimelineCard hearing={h} tab={tab} isFirst={i === 0} />
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

function HearingTimelineCard({
  hearing,
  tab,
  isFirst,
}: {
  hearing: HearingPayload;
  tab: Tab;
  isFirst: boolean;
}) {
  const dateLine = formatDateShort(hearing.hearingAt);
  const timeStr = formatTime(hearing.hearingAt);
  const agendaLabel = tab === 'upcoming' ? 'Expected agenda' : 'Recorded outcome';

  const dotColor =
    tab === 'upcoming'
      ? 'bg-primary ring-primary/25'
      : 'bg-slate-500 ring-slate-500/20 dark:bg-slate-400';

  return (
    <article
      className={`relative grid grid-cols-1 md:grid-cols-[12rem_minmax(0,1fr)] gap-6 pl-14 md:pl-56 pr-6 md:pr-10 pb-8 ${isFirst ? 'pt-10' : 'pt-8'}`}
    >
      {/* Timeline dot */}
      <div className={`absolute left-8 md:left-44 top-10 h-4 w-4 rounded-full ring-4 ${dotColor}`} />

      {/* Date column (sticky feel on desktop) */}
      <div className="min-w-0 md:pt-0.5 text-left md:text-right">
        <time
          className="block text-sm font-black text-foreground tracking-tight"
          dateTime={hearing.hearingAt}
        >
          {dateLine}
        </time>
        <div className="mt-2 flex md:flex-row-reverse items-center md:justify-start gap-1.5 text-xs font-semibold text-muted-foreground">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{timeStr}</span>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div>
          <Link
            href={`/cases/${hearing.caseId}`}
            className="group inline-flex flex-wrap items-baseline gap-2 font-bold text-lg text-foreground hover:text-primary transition-colors leading-snug"
          >
            {hearing.caseTitle}
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
            Case-linked hearing
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4 flex gap-3"
            style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid var(--border)' }}
          >
            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Court</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{hearing.court}</p>
            </div>
          </div>
          <div
            className="rounded-xl p-4 flex gap-3"
            style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid var(--border)' }}
          >
            <Gavel className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Judge</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{hearing.judge ?? '—'}</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4 flex gap-3"
          style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}
        >
          <ScrollText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{agendaLabel}</p>
            <p className="text-sm text-foreground/95 leading-relaxed mt-1 whitespace-pre-wrap">
              {hearing.detail}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
