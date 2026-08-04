'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Book,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface KnowledgeSource {
  id: string;
  type: 'PDF' | 'TEXT' | 'WEBSITE';
  title: string;
  sourceUrl: string | null;
  originalFileName: string | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: KnowledgeSource['status'] }) {
  const map = {
    PENDING: { label: 'Pending', icon: Loader2, className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    PROCESSING: { label: 'Processing', icon: Loader2, className: 'text-neutral-300 bg-white/10 border-white/15' },
    READY: { label: 'Ready', icon: CheckCircle, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    FAILED: { label: 'Failed', icon: XCircle, className: 'text-red-400 bg-red-400/10 border-red-400/20' },
  } as const;

  const { label, icon: Icon, className } = map[status];
  const spin = status === 'PENDING' || status === 'PROCESSING';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className={`h-3 w-3 ${spin ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

export default function KnowledgeBasePage() {
  const { getToken } = useAuth();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [activeTab, setActiveTab] = useState<'pdf' | 'website'>('pdf');
  const [uploading, setUploading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/knowledge-sources`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setSources((await res.json()) as KnowledgeSource[]);
  }, [getToken]);

  useEffect(() => { void fetchSources(); }, [fetchSources]);

  useEffect(() => {
    const hasInProgress = sources.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING');
    if (!hasInProgress) return;
    const interval = setInterval(() => void fetchSources(), 3000);
    return () => clearInterval(interval);
  }, [sources, fetchSources]);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/knowledge-sources/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        let msg = `Upload failed (${res.status})`;
        try { const b = (await res.json()) as { error?: string }; if (b.error) msg = b.error; } catch { /* noop */ }
        throw new Error(msg);
      }
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleWebsiteCrawl(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim()) return;
    setCrawling(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/knowledge-sources/website`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });
      if (!res.ok) {
        let msg = `Crawl failed (${res.status})`;
        try { const b = (await res.json()) as { error?: string }; if (b.error) msg = b.error; } catch { /* noop */ }
        throw new Error(msg);
      }
      setWebsiteUrl('');
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crawl request failed');
    } finally {
      setCrawling(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Knowledge Base</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload PDFs or enter website URLs to power your AI assistant.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 w-fit rounded-xl glass p-1">
        {[
          { key: 'pdf' as const, label: 'Upload PDF', icon: FileText },
          { key: 'website' as const, label: 'Website Crawl', icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ${
              activeTab === key
                ? 'bg-white/10 text-white'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Input zone */}
      {activeTab === 'pdf' ? (
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFileUpload(f); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01] p-12 text-center transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.025]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] transition-all group-hover:border-white/20 group-hover:bg-white/[0.08]">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            ) : (
              <Upload className="h-5 w-5 text-neutral-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {uploading ? 'Uploading…' : 'Click or drag a PDF to upload'}
            </p>
            <p className="mt-1 text-xs text-neutral-700">PDF only · max 20 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); }}
            disabled={uploading}
          />
        </div>
      ) : (
        <form onSubmit={handleWebsiteCrawl} className="flex flex-col gap-4 rounded-2xl glass p-6">
          <label htmlFor="websiteUrl" className="text-sm font-medium text-white">
            Crawl Website URL
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
              <input
                id="websiteUrl"
                type="url"
                required
                placeholder="https://example.com/docs"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={crawling}
                className="input-glass w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={crawling || !websiteUrl.trim()}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
            >
              {crawling ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</>
              ) : (
                'Crawl'
              )}
            </button>
          </div>
          <p className="text-xs text-neutral-700">
            Page content will be extracted and indexed for your AI assistant.
          </p>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Source list */}
      {sources.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl glass py-12 text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Book className="h-5 w-5 text-neutral-600" />
          </div>
          <p className="text-sm text-neutral-600">No sources yet. Upload a PDF or crawl a website.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl glass">
          {sources.map((source) => {
            const Icon = source.type === 'WEBSITE' ? Globe : FileText;
            return (
              <li
                key={source.id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03]">
                    <Icon className="h-4 w-4 text-neutral-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{source.title}</p>
                    {source.status === 'READY' && (
                      <p className="text-xs text-neutral-600">{source.chunkCount} chunks indexed</p>
                    )}
                    {source.status === 'FAILED' && source.errorMessage && (
                      <p className="truncate text-xs text-red-400">{source.errorMessage}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={source.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
