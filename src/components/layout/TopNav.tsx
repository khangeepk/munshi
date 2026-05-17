'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  Moon, Sun, Bell, Menu,
  Calendar, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function useClock() {
  const [dt, setDt] = useState('');
  useEffect(() => {
    const fmt = () => {
      const now  = new Date();
      const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setDt(`${date}  |  ${time}`);
    };
    fmt();
    const id = setInterval(fmt, 60000);
    return () => clearInterval(id);
  }, []);
  return dt;
}

interface TopNavProps {
  onHamburgerClick: () => void;
}

export default function TopNav({ onHamburgerClick }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const router   = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const clock = useClock();

  const avatarSrc =
    user?.avatarUrl && user.avatarUrl.startsWith('data:')
      ? user.avatarUrl
      : user?.email
        ? `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`
        : 'https://i.pravatar.cc/150?u=lawyer';

  useEffect(() => setMounted(true), []);

  return (
    <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-5 bg-card border-b border-border shrink-0 z-20 relative transition-colors duration-300 gap-2">

      {/* ── Left: Hamburger (mobile/tablet) + Clock (desktop) ── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — shown on mobile/tablet, hidden on lg+ */}
        <Button
          variant="ghost"
          size="icon"
          id="hamburger-btn"
          onClick={onHamburgerClick}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors duration-200 shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Date & Time chip — hidden on xs, shown sm+ */}
        {mounted && clock && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground font-medium tracking-wide truncate">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{clock}</span>
          </div>
        )}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
        </Button>

        {/* Dark mode toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
        )}

        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* User avatar + role badge */}
        <div className="flex items-center gap-2 px-1.5 sm:px-2 py-1.5 rounded-xl">
          <img
            src={avatarSrc}
            alt=""
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-border object-cover shrink-0"
          />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[100px]">
              {user?.name ?? 'Account'}
            </p>
            <span
              className={`inline-block mt-0.5 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                user?.role === 'ADMIN'
                  ? 'bg-blue-500/15 text-blue-500'
                  : 'bg-amber-500/15 text-amber-500'
              }`}
            >
              {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'DATA_ENTRY' ? 'Data Entry' : user?.role ?? ''}
            </span>
          </div>
        </div>

        {/* Sign out button */}
        <button
          type="button"
          title="Sign out"
          onClick={async () => { await logout(); router.replace('/login'); }}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all duration-200 active:scale-95 shrink-0"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}