import { MessageSquare, Book, Zap, ArrowRight, Upload, Globe } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Conversations', value: '—', icon: MessageSquare, desc: 'All time' },
  { label: 'Knowledge Sources', value: '—', icon: Book, desc: 'Indexed' },
  { label: 'AI Responses', value: '—', icon: Zap, desc: 'Generated' },
  { label: 'Regions Active', value: '8', icon: Globe, desc: 'Worldwide' },
];

const quickActions = [
  {
    title: 'Upload a PDF',
    description: 'Add product docs, FAQs, or any PDF to train your AI.',
    icon: Upload,
    href: '/dashboard/knowledge-base',
    cta: 'Go to Knowledge Base',
  },
  {
    title: 'Crawl a Website',
    description: "Point to your help center URL and we'll extract the content.",
    icon: Globe,
    href: '/dashboard/knowledge-base',
    cta: 'Add Website Source',
  },
  {
    title: 'Start a Conversation',
    description: 'Test your AI assistant with a real question right now.',
    icon: MessageSquare,
    href: '/dashboard/conversations',
    cta: 'Open Chat',
  },
];

export default function DashboardHomePage() {
  return (
    <div className="flex h-full flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Your AI support platform is ready. Upload docs and start chatting.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass glass-hover rounded-2xl p-5">
            <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
              <stat.icon className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xl font-semibold text-white">{stat.value}</p>
            <p className="mt-0.5 text-xs text-neutral-600">{stat.label}</p>
            <p className="text-[10px] text-neutral-700">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-neutral-600">
          Get started
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group flex flex-col gap-4 rounded-2xl glass glass-hover p-5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition-colors group-hover:border-white/20 group-hover:bg-white/[0.07]">
                <action.icon className="h-4 w-4 text-neutral-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{action.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  {action.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                {action.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] px-5 py-4">
        <p className="text-xs text-neutral-600">
          <span className="font-medium text-neutral-400">Tip:</span> Upload a PDF first, then open
          Conversations to test your AI assistant with a real question.
        </p>
      </div>
    </div>
  );
}
