'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, MessageSquare, Settings, LayoutDashboard } from 'lucide-react';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: Book },
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="flex h-16 items-center px-6 border-b border-neutral-800">
        <span className="text-lg font-bold text-white tracking-tight">AI Support</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 p-4 flex items-center justify-between">
        <OrganizationSwitcher appearance={{ elements: { rootBox: 'text-neutral-100' } }} />
        <UserButton />
      </div>
    </div>
  );
}
