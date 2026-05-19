'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  FilePlus2,
  CalendarDays,
  FolderOpen,
  Settings,
  Scale,
  LogOut,
  X,
  DollarSign,
  Clock,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const navItems = [
  { href: '/',               label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/cases',          label: 'My Cases',         icon: Briefcase },
  { href: '/cases/new',      label: 'Add Case',         icon: FilePlus2 },
  { href: '/hearings',       label: 'My Hearings',      icon: CalendarDays },
  { href: '/documents',      label: 'Documents',        icon: FolderOpen },
  { href: '/billing',        label: 'Billing',          icon: DollarSign },
  { href: '/settings',       label: 'Settings',         icon: Settings },
];

const sqTechItems = [
  { href: '/billing/hours',  label: 'Billable Hours',   icon: Clock },
  { href: '/trust',          label: 'Trust Ledger',     icon: Shield },
  { href: '/conflict',       label: 'Conflict Check',   icon: ShieldAlert },
  { href: '/commission',     label: 'Commissions',      icon: Users },
];

function roleLabel(role: string) {
  if (role === 'SUPER_ADMIN')  return 'Super Admin';
  if (role === 'TENANT_ADMIN') return 'Advocate';
  if (role === 'TENANT_USER')  return 'Munshi';
  if (role === 'CLIENT')       return 'Client';
  return role;
}

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const avatarSrc =
    user?.avatarUrl && user.avatarUrl.startsWith('data:')
      ? user.avatarUrl
      : user?.email
        ? `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`
        : 'https://i.pravatar.cc/150?u=lawyer';

  return (
    <aside
      className="flex w-64 flex-shrink-0 flex-col h-full z-20"
      style={{
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* ── Logo Row ── */}
      <div
        className="h-16 flex items-center justify-between gap-3 px-5 shrink-0"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shrink-0">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-white text-sm tracking-wide block leading-none">LawyerSys</span>
            <p
              className="text-[10px] opacity-40 mt-0.5 tracking-widest uppercase"
              style={{ color: 'var(--sidebar-foreground)' }}
            >
              Legal CMS
            </p>
          </div>
        </div>
        {/* Close button — only shown in mobile drawer */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p
          className="px-3 pb-3 text-[10px] font-semibold tracking-widest uppercase opacity-40"
          style={{ color: 'var(--sidebar-foreground)' }}
        >
          Main Menu
        </p>

        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className={cn('relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out group overflow-hidden')}
              style={isActive ? { background: 'linear-gradient(90deg, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.05) 100%)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.35)', color: '#FFFFFF' } : { color: 'var(--sidebar-foreground)' }}>
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{ background: '#3B82F6', boxShadow: '0 0 8px rgba(59,130,246,0.8)' }} />}
              <Icon className={cn('w-[18px] h-[18px] flex-shrink-0 transition-all duration-200', isActive ? 'text-blue-400' : 'opacity-60 group-hover:opacity-100')} />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}

        <p className="px-3 pt-4 pb-2 text-[10px] font-semibold tracking-widest uppercase opacity-40" style={{ color: 'var(--sidebar-foreground)' }}>SQ Tech Modules</p>
        {sqTechItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onClose}
              className={cn('relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out group overflow-hidden')}
              style={isActive ? { background: 'linear-gradient(90deg, rgba(197,160,89,0.2) 0%, rgba(197,160,89,0.04) 100%)', boxShadow: 'inset 0 0 0 1px rgba(197,160,89,0.3)', color: '#FFFFFF' } : { color: 'var(--sidebar-foreground)' }}>
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{ background: '#c5a059', boxShadow: '0 0 8px rgba(197,160,89,0.8)' }} />}
              <Icon className={cn('w-[18px] h-[18px] flex-shrink-0 transition-all duration-200', isActive ? '' : 'opacity-60 group-hover:opacity-100')} style={isActive ? { color: '#c5a059' } : {}} />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── User Footer ── */}
      <div className="shrink-0 flex flex-col">
        {/* SQ Tech Branding */}
        <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground/60">
            Designed and Developed by <br />
            <span className="text-primary/90 font-bold tracking-widest uppercase">SQ Tech</span>
          </p>
        </div>

        <div
          className="px-4 py-4 space-y-3"
          style={{ borderTop: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex items-center gap-3">
            <img
              src={avatarSrc}
              alt=""
              className="w-9 h-9 rounded-full border-2 object-cover shrink-0"
              style={{ borderColor: 'rgba(59,130,246,0.5)' }}
            />
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name ?? 'Account'}</p>
              <span
                className={`inline-block mt-0.5 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {user ? roleLabel(user.role) : '—'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-white/90 hover:bg-white/10 transition-colors border border-white/10 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
