import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.35)' }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="text-xs font-medium tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.4)' }}>Loading</p>
      </div>
    </div>
  );
}
