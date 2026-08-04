'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function NavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Hide overlay when navigation completes (pathname changes)
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  // Show overlay when any internal link is clicked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // Skip external links, hash links, and same-page links
      if (href.startsWith('http') || href.startsWith('#') || href === pathname) return;
      setLoading(true);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.35)' }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="text-xs font-medium tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.4)' }}>Loading</p>
      </div>
    </div>
  );
}
