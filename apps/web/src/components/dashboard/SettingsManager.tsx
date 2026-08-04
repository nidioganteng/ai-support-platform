'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Palette, Globe, Shield, Bell, Plus, X, Check, Loader2 } from 'lucide-react';

interface OrgSettings {
  widgetPrimaryColor: string;
  widgetPosition: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
  widgetLabel: string;
  allowedDomains: string[];
  botName: string;
  botTone: 'PROFESSIONAL' | 'FRIENDLY' | 'CONCISE';
  fallbackMessage: string;
  notifyEmail: string | null;
  notifyOnHandoff: boolean;
  notifyOnNewConversation: boolean;
}

function SaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5 text-green-300" />
      ) : null}
      {saved ? 'Saved' : 'Save changes'}
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

export function SettingsManager() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}/organizations/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as OrgSettings;
          setSettings(data);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const patch = async (body: Partial<OrgSettings>) => {
    const token = await getToken();
    await fetch(`${apiUrl}/organizations/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-4">
      <WidgetAppearanceForm settings={settings} onSave={async (data) => { setSettings((s) => s ? { ...s, ...data } : s); await patch(data); }} />
      <AllowedDomainsForm settings={settings} onSave={async (data) => { setSettings((s) => s ? { ...s, ...data } : s); await patch(data); }} />
      <AiPersonaForm settings={settings} onSave={async (data) => { setSettings((s) => s ? { ...s, ...data } : s); await patch(data); }} />
      <NotificationsForm settings={settings} onSave={async (data) => { setSettings((s) => s ? { ...s, ...data } : s); await patch(data); }} />
    </div>
  );
}

function WidgetAppearanceForm({
  settings,
  onSave,
}: {
  settings: OrgSettings;
  onSave: (data: Pick<OrgSettings, 'widgetPrimaryColor' | 'widgetPosition' | 'widgetLabel'>) => Promise<void>;
}) {
  const [color, setColor] = useState(settings.widgetPrimaryColor);
  const [position, setPosition] = useState(settings.widgetPosition);
  const [label, setLabel] = useState(settings.widgetLabel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ widgetPrimaryColor: color, widgetPosition: position, widgetLabel: label });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="glass rounded-2xl p-6">
      <SectionHeader icon={Palette} title="Widget Appearance" description="Customize colors, position, and branding of your chat widget." />

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Primary color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-32 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Button label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">Widget position</label>
          <div className="flex gap-3">
            {(['BOTTOM_RIGHT', 'BOTTOM_LEFT'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPosition(pos)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  position === pos
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                    : 'border-white/10 bg-white/[0.04] text-neutral-400 hover:border-white/20'
                }`}
              >
                {pos === 'BOTTOM_RIGHT' ? 'Bottom right' : 'Bottom left'}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="relative h-24 overflow-hidden rounded-lg border border-white/[0.06] bg-neutral-950">
          <p className="absolute left-3 top-3 text-[10px] text-neutral-600">Preview</p>
          <div
            className={`absolute bottom-3 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-lg ${
              position === 'BOTTOM_RIGHT' ? 'right-3' : 'left-3'
            }`}
            style={{ backgroundColor: color }}
          >
            <span>💬</span>
            {label || 'Chat with us'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <SaveButton saving={saving} saved={saved} />
      </div>
    </form>
  );
}

function AllowedDomainsForm({
  settings,
  onSave,
}: {
  settings: OrgSettings;
  onSave: (data: Pick<OrgSettings, 'allowedDomains'>) => Promise<void>;
}) {
  const [domains, setDomains] = useState<string[]>(settings.allowedDomains);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const addDomain = () => {
    const d = input.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] ?? '';
    if (!d) return;
    if (domains.includes(d)) { setError('Domain already added'); return; }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { setError('Enter a valid domain (e.g. example.com)'); return; }
    setDomains((prev) => [...prev, d]);
    setInput('');
    setError('');
  };

  const removeDomain = (d: string) => setDomains((prev) => prev.filter((x) => x !== d));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ allowedDomains: domains });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="glass rounded-2xl p-6">
      <SectionHeader icon={Globe} title="Allowed Domains" description="Only these domains can embed your widget. Leave empty to allow all origins." />

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }}
            placeholder="example.com"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={addDomain}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-400 transition-colors hover:border-indigo-500 hover:text-indigo-400"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {domains.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/[0.08] py-4 text-center text-xs text-neutral-600">
            No domains added — widget can be embedded from any origin
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <span key={d} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
                {d}
                <button type="button" onClick={() => removeDomain(d)} className="text-neutral-600 hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <SaveButton saving={saving} saved={saved} />
      </div>
    </form>
  );
}

function AiPersonaForm({
  settings,
  onSave,
}: {
  settings: OrgSettings;
  onSave: (data: Pick<OrgSettings, 'botName' | 'botTone' | 'fallbackMessage'>) => Promise<void>;
}) {
  const [botName, setBotName] = useState(settings.botName);
  const [botTone, setBotTone] = useState(settings.botTone);
  const [fallback, setFallback] = useState(settings.fallbackMessage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ botName, botTone, fallbackMessage: fallback });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="glass rounded-2xl p-6">
      <SectionHeader icon={Shield} title="AI Persona" description="Set your assistant name, tone, and fallback behavior." />

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Bot name</label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              maxLength={40}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Tone</label>
            <select
              value={botTone}
              onChange={(e) => setBotTone(e.target.value as OrgSettings['botTone'])}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="PROFESSIONAL">Professional</option>
              <option value="FRIENDLY">Friendly</option>
              <option value="CONCISE">Concise</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">
            Fallback message <span className="text-neutral-600">(shown when AI can't answer)</span>
          </label>
          <textarea
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <SaveButton saving={saving} saved={saved} />
      </div>
    </form>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-neutral-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function NotificationsForm({
  settings,
  onSave,
}: {
  settings: OrgSettings;
  onSave: (data: Pick<OrgSettings, 'notifyEmail' | 'notifyOnHandoff' | 'notifyOnNewConversation'>) => Promise<void>;
}) {
  const [email, setEmail] = useState(settings.notifyEmail ?? '');
  const [onHandoff, setOnHandoff] = useState(settings.notifyOnHandoff);
  const [onNew, setOnNew] = useState(settings.notifyOnNewConversation);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      notifyEmail: email.trim() || null,
      notifyOnHandoff: onHandoff,
      notifyOnNewConversation: onNew,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="glass rounded-2xl p-6">
      <SectionHeader icon={Bell} title="Notifications" description="Configure email alerts for human handoff and new conversations." />

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">
            Notification email <span className="text-neutral-600">(leave empty to notify all admins)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="support@yourcompany.com"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Human handoff</p>
              <p className="text-xs text-neutral-500">Email when a customer requests a human agent</p>
            </div>
            <Toggle checked={onHandoff} onChange={setOnHandoff} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">New conversation</p>
              <p className="text-xs text-neutral-500">Email when a new conversation starts</p>
            </div>
            <Toggle checked={onNew} onChange={setOnNew} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <SaveButton saving={saving} saved={saved} />
      </div>
    </form>
  );
}
