'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';

const PUBLIC_ROUTE  = /^\/login$/;
const BYPASS_ROUTE  = /^\/client(\/?)/; // Client portal has its own shell

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const publicRoute = PUBLIC_ROUTE.test(pathname ?? '') || BYPASS_ROUTE.test(pathname ?? '');

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (loading || publicRoute) return;
    if (!user) {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [loading, user, pathname, router, publicRoute]);

  // Redirect authenticated users away from login
  useEffect(() => {
    if (loading || !publicRoute) return;
    if (user) router.replace('/');
  }, [loading, user, publicRoute, router]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const openSidebar  = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (!publicRoute && loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium">Signing you in…</p>
      </div>
    );
  }

  if (publicRoute) return <>{children}</>;

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ── Desktop Sidebar (always visible lg+) ── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile Sidebar (slide-in drawer) ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col lg:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '260px' }}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav onHamburgerClick={openSidebar} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background flex flex-col">
          <div className="p-4 sm:p-6 lg:p-8 flex-1">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
          <footer className="w-full py-5 text-center mt-auto border-t border-border/20">
            <p className="text-xs font-semibold text-muted-foreground/60 tracking-wider">
              Designed and Developed by{' '}
              <span className="text-primary font-bold tracking-widest">SU TECH</span>
            </p>
          </footer>

        </main>
      </div>
    </div>
  );
}
