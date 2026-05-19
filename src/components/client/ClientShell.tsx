'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Menu, X, Scale } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ClientSidebar } from '@/components/client/ClientSidebar';

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Lock body scroll when mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? '/client/dashboard')}`);
      return;
    }
    // Redirect non-CLIENT users away from portal
    if (user.role !== 'CLIENT') {
      router.replace('/');
    }
  }, [loading, user, pathname, router]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#0F2240' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#D4AF37' }} />
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Loading your portal…</p>
      </div>
    );
  }

  if (!user || user.role !== 'CLIENT') {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#0F2240' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF37' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#F8F9FA' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <ClientSidebar />
      </div>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 lg:hidden ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col lg:hidden transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <ClientSidebar onClose={closeSidebar} />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-14 border-b lg:hidden"
          style={{ background: '#0F2240', borderColor: 'rgba(212,175,55,0.15)' }}
        >
          <button
            onClick={openSidebar}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5" style={{ color: '#D4AF37' }} />
            <span className="text-white font-semibold text-sm">Client Portal</span>
          </div>
          <div className="w-9" /> {/* spacer */}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
          <footer className="text-center py-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-medium" style={{ color: 'rgba(0,0,0,0.35)' }}>
              Designed and Developed by{' '}
              <span className="font-bold" style={{ color: '#1E3A5F' }}>SQ Tech</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
