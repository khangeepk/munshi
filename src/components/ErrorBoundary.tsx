'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to external service, NOT to UI in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && process.env.NODE_ENV === 'development') {
      return (
        <div className="p-4 border border-rose-500 bg-rose-50 text-rose-700 rounded-lg m-4">
          <h3 className="font-bold">Something went wrong.</h3>
          <p className="text-sm">Check console for details.</p>
        </div>
      );
    }
    // In production, render children normally or fallback UI
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg m-4">
          <p className="text-sm">An unexpected error occurred. Please refresh the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
