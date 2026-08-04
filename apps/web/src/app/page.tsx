import Link from 'next/link';
import { ArrowRight, ChevronDown, Zap, MessageSquare, Book, BarChart2, ArrowUpRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Show, UserButton } from '@clerk/nextjs';

const SplineScene = dynamic(
  () => import('@/components/SplineScene').then((m) => m.SplineScene),
  { ssr: false, loading: () => <div className="h-full w-full" style={{ background: '#c8c8c8' }} /> },
);

const features = [
  {
    number: '01',
    icon: Book,
    title: 'Knowledge Base',
    desc: 'Upload PDFs, paste text, or crawl your website. Your AI learns everything.',
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'RAG-Powered Chat',
    desc: 'Every answer grounded in your content — cited sources, no hallucinations.',
  },
  {
    number: '03',
    icon: BarChart2,
    title: 'Analytics',
    desc: 'See what customers ask, where AI fails, and improve over time.',
  },
];

export default function HomePage() {
  return (
    <div style={{ background: '#0d0d0d', color: '#f0f0f0' }}>

      {/* ── HERO ── */}
      <section className="relative h-screen w-full overflow-hidden">

        {/* Spline robot */}
        <div className="absolute inset-0 z-0">
          <SplineScene />
        </div>


        {/* Nav */}
        <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-7 lg:px-14">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight" style={{ color: '#0d0d0d' }}>AI Support</span>
          </div>
          <Show
            when="signed-in"
            fallback={
              <Link
                href="/sign-in"
                className="group flex items-center gap-1.5 text-sm font-medium nav-signin-link"
                style={{ color: '#0d0d0d' }}
              >
                Sign in
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            }
          >
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 hover:bg-white hover:text-black"
                style={{ background: 'rgba(0,0,0,0.08)', color: '#0d0d0d', border: '1px solid rgba(0,0,0,0.15)' }}
              >
                Dashboard
                <ArrowRight className="h-3 w-3" />
              </Link>
              <UserButton />
            </div>
          </Show>
        </nav>

        {/* Hero text — dead center */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
          <div>

          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: '#ffffff', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
            AI Customer Support Platform
          </p>

          <h1
            className="text-[56px] font-bold leading-[1.02] tracking-tight lg:text-[80px]"
            style={{ color: '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
          >
            Support that
            <br />
            <em className="not-italic" style={{ color: 'rgba(255,255,255,0.5)' }}>Never Sleeps.</em>
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
            Upload your docs — get a 24/7 AI assistant grounded in your content, not guesses.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Show
              when="signed-in"
              fallback={
                <>
                  <Link
                    href="/sign-up"
                    className="group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-all duration-200 hover:opacity-80"
                    style={{ background: '#0d0d0d', color: '#ffffff' }}
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all duration-200 hover:bg-black hover:text-white"
                    style={{
                      background: 'rgba(0,0,0,0.06)',
                      color: '#444444',
                      border: '1px solid rgba(0,0,0,0.12)',
                    }}
                  >
                    Sign in
                  </Link>
                </>
              }
            >
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-80"
                style={{ background: '#0d0d0d', color: '#ffffff' }}
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Show>
          </div>
          </div>
        </div>
        
        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce">
          <ChevronDown className="h-4 w-4" style={{ color: '#aaaaaa' }} />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="mx-auto max-w-6xl px-8 py-32 lg:px-14">

        {/* Section header */}
        <div className="mb-20 flex items-end justify-between">
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl" style={{ color: '#e8e8e8' }}>
            Everything you need
            <br />
            <span style={{ color: '#606060' }}>to automate support.</span>
          </h2>
          <p className="hidden max-w-xs text-sm leading-relaxed lg:block" style={{ color: '#707070' }}>
            One platform — ingest knowledge, answer customers, surface insights.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-px lg:grid-cols-3"
          style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden' }}>
          {features.map(({ number, icon: Icon, title, desc }) => (
            <div
              key={number}
              className="feature-card group flex flex-col gap-8 p-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-5xl font-bold" style={{ color: 'rgba(255,255,255,0.04)' }}>
                  {number}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Icon className="h-4 w-4" style={{ color: '#606060' }} />
                </div>
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: '#e8e8e8' }}>{title}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: '#888888' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-8 py-24 lg:px-14"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="mx-auto max-w-6xl">

          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
            How it works
          </p>
          <h2 className="mb-20 text-4xl font-bold tracking-tight" style={{ color: '#e8e8e8' }}>
            Up and running in minutes.
          </h2>

          <div className="grid gap-16 lg:grid-cols-3">
            {[
              { step: '1', title: 'Connect your content', desc: 'Upload a PDF or point to your help center. We handle chunking, embedding, and indexing automatically.' },
              { step: '2', title: 'AI learns your product', desc: 'Your content is processed into a vector database. The AI can now answer questions grounded in your knowledge.' },
              { step: '3', title: 'Go live 24/7', desc: 'Embed the chat widget on your site. Your AI assistant starts answering customers instantly, around the clock.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#909090' }}>
                    {step}
                  </div>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
                <p className="text-base font-semibold" style={{ color: '#e0e0e0' }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#888888' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-8 py-32 lg:px-14">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl p-16 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Subtle glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2"
              style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)' }} />

            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
              Ready to start?
            </p>
            <h2 className="text-4xl font-bold tracking-tight lg:text-5xl" style={{ color: '#e8e8e8' }}>
              Your AI support team
              <br />
              <span style={{ color: '#606060' }}>is one click away.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed" style={{ color: '#707070' }}>
              Join businesses already using AI to answer customers around the clock.
            </p>
            <Link
              href="/sign-up"
              className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-90"
              style={{ background: '#f0f0f0', color: '#0d0d0d' }}
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-8 py-8 lg:px-14"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-white">
              <Zap className="h-2.5 w-2.5 text-black" />
            </div>
            <span className="text-xs font-semibold" style={{ color: '#505050' }}>AI Support</span>
          </div>
          <p className="text-xs" style={{ color: '#404040' }}>© 2026 AI Support Platform</p>
        </div>
      </footer>

    </div>
  );
}
