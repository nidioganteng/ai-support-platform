import { ApiKeyManager } from '@/components/dashboard/ApiKeyManager';
import { Settings, Palette, Globe, Shield, Bell } from 'lucide-react';

const sections = [
  {
    icon: Palette,
    title: 'Widget Appearance',
    description: 'Customize colors, position, and branding of your chat widget.',
    badge: 'Phase 5',
  },
  {
    icon: Globe,
    title: 'Allowed Domains',
    description: 'Control which websites are authorized to embed your widget.',
    badge: 'Phase 5',
  },
  {
    icon: Shield,
    title: 'AI Persona',
    description: 'Set your assistant name, tone, and fallback behavior.',
    badge: 'Phase 6',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Configure email alerts for human handoff and new conversations.',
    badge: 'Phase 6',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Platform configuration and preferences.</p>
      </div>

      <ApiKeyManager />

      {/* Upcoming sections */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Settings className="h-4 w-4 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Coming in Phase 5 &amp; 6</p>
            <p className="text-xs text-neutral-600">Settings unlock as new phases ship.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="glass rounded-2xl p-5 opacity-40">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <section.icon className="h-4 w-4 text-neutral-400" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                  {section.badge}
                </span>
              </div>
              <p className="text-sm font-medium text-white">{section.title}</p>
              <p className="mt-1 text-xs text-neutral-600">{section.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
