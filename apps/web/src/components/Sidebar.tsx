'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Book,
  MessageSquare,
  Settings,
  LayoutDashboard,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: Book },
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`relative flex h-screen flex-col border-r border-white/[0.06] bg-[#0a0a0a] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[64px]' : 'w-56'
      }`}
    >
      {/* top shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Logo */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-white/[0.06] ${
          collapsed ? 'justify-center' : 'gap-2.5 px-4'
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
          <Zap className="h-3.5 w-3.5 text-black" />
        </div>
        {!collapsed && (
          <span className="text-[14px] font-semibold tracking-tight text-white">
            AI Support
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white" />
              )}
              <item.icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-neutral-600 group-hover:text-neutral-300'
                }`}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: 'min-w-0',
                  organizationSwitcherTrigger: 'text-neutral-400 hover:text-white text-xs',
                },
              }}
            />
            <UserButton />
          </div>
        ) : (
          <div className="flex justify-center">
            <UserButton />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a] text-neutral-600 transition-all hover:border-white/20 hover:text-neutral-300"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
