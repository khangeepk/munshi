import type { Metadata } from 'next';
import { ClientShell } from '@/components/client/ClientShell';

export const metadata: Metadata = {
  title: 'Client Portal — LawyerSys',
  description: 'Securely access your case files, documents, and payment history.',
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
