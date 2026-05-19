'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CreditCard,
  MessageSquare,
  User,
  LogOut,
  Scale,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
  { label: 'My Cases', href: '/client/cases', icon: Briefcase },
  { label: 'Documents', href: '/client/documents', icon: FileText },
  { label: 'Payments', href: '/client/payments', icon: CreditCard },
  { label: 'Messages', href: '/client/messages', icon: MessageSquare },
  { label: 'My Profile', href: '/client/profile', icon: User },
];

export function ClientSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside
      className="flex flex-col h-full w-[260px]"
      style={{
        background: 'linear-gradient(180deg, #0F2240 0%, #1E3A5F 100%)',
        borderRight: '1px solid rgba(212,175,55,0.15)',
      }}
    >
      {/* Logo / Firm Header */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)' }}
          >
            <Scale className="w-5 h-5" style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Client Portal</p>
            <p className="text-xs leading-tight" style={{ color: '#D4AF37' }}>Legal Case Access</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? 'C'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name ?? 'Client'}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {user?.email ?? ''}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
              style={{
                background: active ? 'rgba(212,175,55,0.18)' : 'transparent',
                color: active ? '#D4AF37' : 'rgba(255,255,255,0.6)',
              }}
            >
              <Icon
                className="w-4.5 h-4.5 flex-shrink-0 transition-colors"
                style={{ color: active ? '#D4AF37' : 'rgba(255,255,255,0.45)' }}
              />
              <span className="text-sm font-medium flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" style={{ color: '#D4AF37' }} />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-red-500/10"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0 group-hover:text-red-400 transition-colors" />
          <span className="text-sm font-medium group-hover:text-red-400 transition-colors">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
