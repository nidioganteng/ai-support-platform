import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#0d0d0d' }}>
      <Loader2 className="h-8 w-8 animate-spin text-white/30" />
    </div>
  );
}
