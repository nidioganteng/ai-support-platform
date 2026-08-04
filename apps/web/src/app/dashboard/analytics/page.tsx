'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { BarChart2, MessageSquare, CheckCircle2, Users, TrendingUp, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const VolumeChart = dynamic(() => import('./charts').then((m) => m.VolumeChart), { ssr: false });
const StatusPieChart = dynamic(() => import('./charts').then((m) => m.StatusPieChart), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Overview {
  totalConversations: number;
  totalMessages: number;
  resolutionRate: number;
  handoffRate: number;
  avgMessagesPerConversation: number;
}

interface VolumeEntry { date: string; count: number; }
interface StatusEntry { status: string; count: number; }
interface QuestionEntry { question: string; count: number; }

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [volume, setVolume] = useState<VolumeEntry[]>([]);
  const [statusData, setStatusData] = useState<StatusEntry[]>([]);
  const [topQuestions, setTopQuestions] = useState<QuestionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const [ov, vol, status, questions] = await Promise.all([
          fetchJson<Overview>(`${API_URL}/analytics/overview`, token),
          fetchJson<{ data: VolumeEntry[] }>(`${API_URL}/analytics/volume?days=30`, token),
          fetchJson<{ data: StatusEntry[] }>(`${API_URL}/analytics/status-breakdown`, token),
          fetchJson<{ data: QuestionEntry[] }>(`${API_URL}/analytics/top-questions?limit=8`, token),
        ]);

        setOverview(ov);
        setVolume(vol.data);
        setStatusData(status.data);
        setTopQuestions(questions.data);
      } catch {
        setError('Failed to load analytics. Make sure the API is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-neutral-600">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Conversations',
      value: overview?.totalConversations ?? 0,
      icon: MessageSquare,
      suffix: '',
    },
    {
      label: 'AI Resolution Rate',
      value: overview?.resolutionRate ?? 0,
      icon: CheckCircle2,
      suffix: '%',
    },
    {
      label: 'Handoff Rate',
      value: overview?.handoffRate ?? 0,
      icon: Users,
      suffix: '%',
    },
    {
      label: 'Avg Messages / Conv',
      value: overview?.avgMessagesPerConversation ?? 0,
      icon: TrendingUp,
      suffix: '',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <BarChart2 className="h-4 w-4 text-neutral-300" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="text-xs text-neutral-600">Last 30 days overview</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, suffix }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
              <Icon className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-white">
              {value}{suffix}
            </p>
            <p className="mt-1 text-xs text-neutral-600">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Volume line chart */}
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <p className="mb-1 text-sm font-semibold text-white">Conversation Volume</p>
          <p className="mb-5 text-xs text-neutral-600">Daily conversations over the last 30 days</p>
          <VolumeChart data={volume} />
        </div>

        {/* Status pie chart */}
        <div className="glass rounded-2xl p-6">
          <p className="mb-1 text-sm font-semibold text-white">Status Breakdown</p>
          <p className="mb-5 text-xs text-neutral-600">Current conversation statuses</p>
          <StatusPieChart data={statusData} />
        </div>
      </div>

      {/* Top questions */}
      <div className="glass rounded-2xl p-6">
        <p className="mb-1 text-sm font-semibold text-white">Top Customer Questions</p>
        <p className="mb-5 text-xs text-neutral-600">Most frequently asked messages</p>

        {topQuestions.length === 0 ? (
          <p className="text-sm text-neutral-600">No conversations yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topQuestions.map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
              >
                <span className="w-5 shrink-0 text-xs font-bold text-neutral-700">
                  {i + 1}
                </span>
                <p className="flex-1 truncate text-sm text-neutral-300">{q.question}</p>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                  {q.count}×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
