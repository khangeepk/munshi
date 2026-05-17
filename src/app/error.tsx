'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to external service, NOT to UI in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by Next.js Error Boundary:', error);
    }
  }, [error]);

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <h2 className="text-xl font-bold text-rose-600 mb-2">Something went wrong.</h2>
        <p className="text-sm text-slate-500 mb-6">Check console for details.</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // In production, render a clean fallback UI (without exposing error details)
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground mb-2">An unexpected error occurred</h2>
      <p className="text-sm text-muted-foreground mb-6">We're working on fixing this right away.</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Refresh Page
      </button>
    </div>
  );
}
