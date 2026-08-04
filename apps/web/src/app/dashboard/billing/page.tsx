'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Zap, CheckCircle2, XCircle, Loader2, ExternalLink, CreditCard } from 'lucide-react';

interface UsageStat {
  used: number;
  limit: number;
}

interface BillingStatus {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  currentPeriodEnd: string | null;
  hasActiveSubscription: boolean;
  usage: {
    knowledgeSources: UsageStat;
    conversationsThisMonth: UsageStat;
  };
}

const PLANS = [
  {
    id: 'FREE' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['3 knowledge sources', '100 conversations / month', 'Embeddable widget', 'Analytics'],
  },
  {
    id: 'PRO' as const,
    name: 'Pro',
    price: '$29',
    period: 'per month',
    features: ['20 knowledge sources', '1,000 conversations / month', 'Custom AI persona', 'Domain whitelist', 'Priority support'],
    highlight: true,
  },
  {
    id: 'ENTERPRISE' as const,
    name: 'Enterprise',
    price: '$99',
    period: 'per month',
    features: ['Unlimited knowledge sources', 'Unlimited conversations', 'Everything in Pro', 'Dedicated support'],
  },
];

function UsageBar({ label, stat }: { label: string; stat: UsageStat }) {
  const isUnlimited = stat.limit === Infinity || stat.limit >= 999999;
  const pct = isUnlimited ? 0 : Math.min((stat.used / stat.limit) * 100, 100);
  const isWarning = pct >= 80;
  const isFull = pct >= 100;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-neutral-400">{label}</span>
        <span className={isFull ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-neutral-500'}>
          {stat.used.toLocaleString()} / {isUnlimited ? '∞' : stat.limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        {!isUnlimited && (
          <div
            className={`h-full rounded-full transition-all ${
              isFull ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
        {isUnlimited && <div className="h-full w-full rounded-full bg-indigo-500/30" />}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}/billing/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setStatus((await res.json()) as BillingStatus);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleUpgrade = async (plan: 'PRO' | 'ENTERPRISE') => {
    setUpgrading(plan);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/billing/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        const { url } = (await res.json()) as { url: string };
        window.location.href = url;
      }
    } finally {
      setUpgrading(null);
    }
  };

  const handleManage = async () => {
    setOpeningPortal(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/billing/create-portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { url } = (await res.json()) as { url: string };
        window.location.href = url;
      }
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Billing</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your subscription and usage.</p>
      </div>

      {/* Success / canceled banners */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Subscription activated — your plan has been upgraded.
        </div>
      )}
      {canceled && (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-700 bg-white/[0.03] px-4 py-3 text-sm text-neutral-400">
          <XCircle className="h-4 w-4 shrink-0" />
          Checkout was canceled. Your plan was not changed.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-600">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Current plan + usage */}
          {status && (
            <div className="glass rounded-2xl p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Current plan</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-semibold text-white">{status.plan}</span>
                    {status.plan !== 'FREE' && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
                        Active
                      </span>
                    )}
                  </div>
                  {status.currentPeriodEnd && (
                    <p className="mt-0.5 text-xs text-neutral-600">
                      Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {status.hasActiveSubscription && (
                  <button
                    onClick={() => void handleManage()}
                    disabled={openingPortal}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-400 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
                  >
                    {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    Manage subscription
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <UsageBar label="Knowledge sources" stat={status.usage.knowledgeSources} />
                <UsageBar label="Conversations this month" stat={status.usage.conversationsThisMonth} />
              </div>
            </div>
          )}

          {/* Plan cards */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-white">Plans</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {PLANS.map((plan) => {
                const isCurrent = status?.plan === plan.id;
                const isDowngrade = status && ['PRO', 'ENTERPRISE'].indexOf(plan.id) < ['PRO', 'ENTERPRISE'].indexOf(status.plan);

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-5 ${
                      plan.highlight
                        ? 'border-indigo-500/40 bg-indigo-500/[0.06]'
                        : 'border-white/[0.06] bg-white/[0.03]'
                    } ${isCurrent ? 'ring-1 ring-white/20' : ''}`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-indigo-500/30 bg-indigo-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
                        Popular
                      </span>
                    )}

                    <div className="mb-4">
                      <p className="text-sm font-semibold text-white">{plan.name}</p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">{plan.price}</span>
                        <span className="text-xs text-neutral-600">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="mb-5 flex-1 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-neutral-400">
                          <Zap className="h-3 w-3 shrink-0 text-indigo-500" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="rounded-lg border border-white/10 py-2 text-center text-xs font-medium text-neutral-500">
                        Current plan
                      </div>
                    ) : plan.id === 'FREE' || isDowngrade ? (
                      <div className="rounded-lg border border-white/[0.06] py-2 text-center text-xs text-neutral-700">
                        {plan.id === 'FREE' ? 'Downgrade via portal' : 'Manage in portal'}
                      </div>
                    ) : (
                      <button
                        onClick={() => void handleUpgrade(plan.id as 'PRO' | 'ENTERPRISE')}
                        disabled={!!upgrading}
                        className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                          plan.highlight
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {upgrading === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        Upgrade to {plan.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
