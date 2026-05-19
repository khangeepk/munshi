'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type AppRole =
  | 'ADMIN'
  | 'DATA_ENTRY'
  | 'LAWYER'
  | 'PARALEGAL'
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'ADVOCATE'
  | 'JUNIOR_LAWYER'
  | 'CLERK'
  | 'ACCOUNTANT'
  | 'CLIENT';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  avatarUrl?: string | null;
  tenantId?: string | null;
}

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  canModifyRecords: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      setUser(null);
      return;
    }
    const data = await res.json();
    setUser(data.user as AppUser);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const canModifyRecords = user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        canModifyRecords,
        isAdmin,
        refresh,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
