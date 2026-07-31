import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-neutral-900/50 p-8">
        {children}
      </main>
    </div>
  );
}
