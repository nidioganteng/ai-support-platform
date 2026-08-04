import { ApiKeyManager } from '@/components/dashboard/ApiKeyManager';
import { SettingsManager } from '@/components/dashboard/SettingsManager';

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Platform configuration and preferences.</p>
      </div>

      <ApiKeyManager />
      <SettingsManager />
    </div>
  );
}
