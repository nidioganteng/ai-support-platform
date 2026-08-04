'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { MessageSquare, Send, Loader2, Bot, User, ChevronRight, BookOpen, Plus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Message {
  id: string;
  conversationId: string;
  sender: 'CUSTOMER' | 'AI' | 'AGENT';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  status: 'OPEN' | 'PENDING_HUMAN' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

interface ConversationDetail extends Omit<Conversation, '_count'> {
  messages: Message[];
}

interface ChatSource {
  sourceId: string;
  chunkIndex: number;
  text: string;
}

interface PendingSource {
  messageId: string;
  sources: ChatSource[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const statusColors: Record<Conversation['status'], string> = {
  OPEN: 'bg-emerald-400',
  PENDING_HUMAN: 'bg-amber-400',
  RESOLVED: 'bg-neutral-500',
  CLOSED: 'bg-neutral-700',
};

export default function ConversationsPage() {
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setConversations((await res.json()) as Conversation[]);
    setLoadingList(false);
  }, [getToken]);

  const fetchDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDetail((await res.json()) as ConversationDetail);
      setLoadingDetail(false);
    },
    [getToken],
  );

  useEffect(() => { void fetchConversations(); }, [fetchConversations]);
  useEffect(() => {
    if (selectedId) void fetchDetail(selectedId);
    else setDetail(null);
  }, [selectedId, fetchDetail]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [detail?.messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const token = await getToken();
    if (!token) return;
    const userMessage = input.trim();
    setInput('');
    setSending(true);

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: selectedId ?? '',
      sender: 'CUSTOMER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    if (detail) setDetail((p) => (p ? { ...p, messages: [...p.messages, optimistic] } : p));

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, conversationId: selectedId ?? undefined }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          conversationId: string;
          message: Message;
          sources: ChatSource[];
        };
        if (!selectedId) {
          setSelectedId(data.conversationId);
          await fetchConversations();
        } else {
          await fetchDetail(data.conversationId);
          if (data.sources.length > 0)
            setPendingSources((p) => [...p, { messageId: data.message.id, sources: data.sources }]);
        }
      }
    } finally {
      setSending(false);
    }
  }

  const sourcesForMessage = (id: string) =>
    pendingSources.find((p) => p.messageId === id)?.sources ?? [];

  const inputBar = (placeholder: string) => (
    <form
      onSubmit={handleSend}
      className="border-t border-white/[0.05] bg-[#0a0a0a]/60 p-4 backdrop-blur-sm"
    >
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={sending}
          className="input-glass flex-1 rounded-xl px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex h-full overflow-hidden rounded-2xl glass animate-fade-in">
      {/* Left panel */}
      <div className="flex w-64 shrink-0 flex-col border-r border-white/[0.05]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
          <span className="text-sm font-semibold text-white">Conversations</span>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-neutral-300 transition-all hover:bg-white/[0.1]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageSquare className="h-6 w-6 text-neutral-700" />
              <p className="text-xs text-neutral-600">No conversations yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.03]">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.03] ${
                      selectedId === conv.id ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColors[conv.status]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">#{conv.id.slice(-8)}</p>
                      <p className="text-[10px] text-neutral-600">
                        {conv._count.messages} msgs · {formatDate(conv.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 text-neutral-700" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!selectedId && !detail ? (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-white/5 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Bot className="h-8 w-8 text-neutral-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Start a new conversation</p>
                <p className="mt-1 text-xs text-neutral-600">Type a message below to get started</p>
              </div>
            </div>
            {inputBar('Type a message…')}
          </>
        ) : loadingDetail ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
          </div>
        ) : detail ? (
          <>
            <div className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3">
              <span className={`h-2 w-2 rounded-full ${statusColors[detail.status]}`} />
              <div>
                <p className="text-sm font-medium text-white">#{detail.id.slice(-8)}</p>
                <p className="text-xs capitalize text-neutral-600">
                  {detail.status.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-5">
                {detail.messages.map((msg) => {
                  const isAI = msg.sender === 'AI';
                  const isCustomer = msg.sender === 'CUSTOMER';
                  const sources = isAI ? sourcesForMessage(msg.id) : [];

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isAI ? 'bg-white/[0.06]' : 'bg-white/10'
                        }`}
                      >
                        {isAI ? (
                          <Bot className="h-3.5 w-3.5 text-neutral-400" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-neutral-300" />
                        )}
                      </div>

                      <div
                        className={`flex max-w-[72%] flex-col gap-1.5 ${isCustomer ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isCustomer
                              ? 'rounded-tr-sm bg-white text-black shadow-glass'
                              : 'rounded-tl-sm glass text-neutral-100'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {sources.length > 0 && (
                          <div className="flex w-full flex-col gap-1.5">
                            {sources.map((src, i) => (
                              <div
                                key={`${src.sourceId}-${src.chunkIndex}`}
                                className="flex items-start gap-2 rounded-xl glass px-3 py-2 text-xs text-neutral-400"
                              >
                                <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-neutral-500" />
                                <span>
                                  <span className="font-medium text-neutral-300">Source {i + 1}</span>{' '}
                                  — {src.text.slice(0, 110)}
                                  {src.text.length > 110 ? '…' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] text-neutral-700">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                      <Bot className="h-3.5 w-3.5 text-neutral-400" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm glass px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {inputBar('Reply…')}
          </>
        ) : null}
      </div>
    </div>
  );
}
