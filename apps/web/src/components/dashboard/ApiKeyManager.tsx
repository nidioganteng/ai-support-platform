'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Copy, Check, Key, RefreshCw } from 'lucide-react';

export function ApiKeyManager() {
  const { getToken } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/api-key`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.publicApiKey);
      }
    } catch (error) {
      console.error('Failed to fetch API key', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/api-key/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.publicApiKey);
      }
    } catch (error) {
      console.error('Failed to generate API key', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!apiKey) return;
    
    // The snippet for embedding
    const snippet = `<script src="http://localhost:3000/widget.js" data-org-key="${apiKey}"></script>`;
    
    navigator.clipboard.writeText(snippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="h-6 w-1/3 rounded bg-neutral-800"></div>
        <div className="h-20 w-full rounded bg-neutral-800"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-left">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-medium text-white">
          <Key className="h-5 w-5 text-indigo-400" />
          Widget API Key
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          This key is required to embed the support widget on your website. Keep it safe, though it is designed to be public-facing on your site.
        </p>
      </div>

      {!apiKey ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-700 p-8 text-center">
          <p className="mb-4 text-sm text-neutral-400">No API Key generated yet.</p>
          <button
            onClick={generateApiKey}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Generate Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
              <code>{`<script src="http://localhost:3000/widget.js" data-org-key="${apiKey}"></script>`}</code>
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute right-2 top-2 rounded-md bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
              title="Copy snippet"
            >
              {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={generateApiKey}
              className="flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-indigo-400"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
