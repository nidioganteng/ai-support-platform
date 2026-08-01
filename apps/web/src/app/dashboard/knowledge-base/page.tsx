'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Book } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface KnowledgeSource {
  id: string;
  title: string;
  originalFileName: string | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: KnowledgeSource['status'] }) {
  const map = {
    PENDING: { label: 'Pending', icon: Loader2, className: 'text-yellow-400 bg-yellow-400/10' },
    PROCESSING: { label: 'Processing', icon: Loader2, className: 'text-blue-400 bg-blue-400/10' },
    READY: { label: 'Ready', icon: CheckCircle, className: 'text-green-400 bg-green-400/10' },
    FAILED: { label: 'Failed', icon: XCircle, className: 'text-red-400 bg-red-400/10' },
  } as const;

  const { label, icon: Icon, className } = map[status];
  const spin = status === 'PENDING' || status === 'PROCESSING';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className={`h-3.5 w-3.5 ${spin ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

export default function KnowledgeBasePage() {
  const { getToken } = useAuth();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const res = await fetch(`${API_URL}/knowledge-sources`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = (await res.json()) as KnowledgeSource[];
      setSources(data);
    }
  }, [getToken]);

  // Initial load
  useEffect(() => {
    void fetchSources();
  }, [fetchSources]);

  // Poll every 3s while any source is still processing
  useEffect(() => {
    const hasInProgress = sources.some(
      (s) => s.status === 'PENDING' || s.status === 'PROCESSING',
    );
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
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }

      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFileUpload(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFileUpload(file);
  }

  return (
    <div className="flex h-full flex-col gap-6 p-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Knowledge Base</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Upload PDFs to power your AI assistant's answers.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 p-10 text-center transition-colors hover:border-neutral-500 hover:bg-neutral-900"
      >
        <div className="rounded-full bg-neutral-800 p-3">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          ) : (
            <Upload className="h-6 w-6 text-neutral-400" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            {uploading ? 'Uploading…' : 'Click or drag a PDF here to upload'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">PDF only · max 20 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onFileChange}
          disabled={uploading}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Source list */}
      {sources.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800 p-8 text-center">
          <Book className="mb-3 h-8 w-8 text-neutral-600" />
          <p className="text-sm text-neutral-500">No knowledge sources yet. Upload a PDF to get started.</p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
          {sources.map((source) => (
            <li key={source.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-neutral-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{source.title}</p>
                  {source.status === 'READY' && (
                    <p className="text-xs text-neutral-500">{source.chunkCount} chunks indexed</p>
                  )}
                  {source.status === 'FAILED' && source.errorMessage && (
                    <p className="truncate text-xs text-red-400">{source.errorMessage}</p>
                  )}
                </div>
              </div>
              <StatusBadge status={source.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
