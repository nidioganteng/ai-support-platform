import { ApiKeyManager } from '@/components/dashboard/ApiKeyManager';

export default function SettingsPage() {
  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-neutral-400">Manage your organization's settings and widget integration.</p>
      </div>
      
      <ApiKeyManager />
    </div>
  );
}
