import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configuration Required — PakMunshi by SQ Tech',
  description: 'Set up your Supabase database credentials to activate the Lawyer Management System.',
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
