'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  ChevronRight,
  BookOpen,
  Plus,
  Headphones,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

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
  RESOLVED: 'bg-blue-400',
  CLOSED: 'bg-neutral-700',
};

const statusLabels: Record<Conversation['status'], string> = {
  OPEN: 'Open',
  PENDING_HUMAN: 'Pending Human',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

type FilterTab = 'ALL' | 'PENDING_HUMAN' | 'RESOLVED';

export default function ConversationsPage() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
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
    async (id: string, showSpinner = true) => {
      if (showSpinner) setLoadingDetail(true);
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDetail((await res.json()) as ConversationDetail);
      if (showSpinner) setLoadingDetail(false);
    },
    [getToken],
  );

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (initialId) setSelectedId(initialId);
  }, [initialId]);

  useEffect(() => {
    if (selectedId) void fetchDetail(selectedId, true);
    else { setDetail(null); setSuggestions([]); }
  }, [selectedId, fetchDetail]);

  useEffect(() => {
    if (!detail || detail.status !== 'PENDING_HUMAN') { setSuggestions([]); return; }
    const load = async () => {
      setLoadingSuggestions(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/conversations/${detail.id}/suggestions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { suggestions: string[] };
          setSuggestions(data.suggestions);
        }
      } finally {
        setLoadingSuggestions(false);
      }
    };
    void load();
  }, [detail?.id, detail?.status]);

  // Polling for real-time updates from user (every 2.5s)
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchConversations();
      if (selectedId) void fetchDetail(selectedId, false);
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchDetail, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const token = await getToken();
    if (!token) return;
    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // If we have a selected conversation, post as AGENT reply
    if (selectedId && detail) {
      const optimistic: Message = {
        id: `opt-${Date.now()}`,
        conversationId: selectedId,
        sender: 'AGENT',
        content: userMessage,
        createdAt: new Date().toISOString(),
      };
      setDetail((p) => (p ? { ...p, messages: [...p.messages, optimistic] } : p));

      try {
        const res = await fetch(`${API_URL}/conversations/${selectedId}/reply`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
        });
        if (res.ok) {
          await fetchDetail(selectedId);
          await fetchConversations();
        }
      } finally {
        setSending(false);
      }
      return;
    }

    // New conversation flow via /chat (test mode)
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId: '',
      sender: 'CUSTOMER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    if (detail) setDetail((p) => (p ? { ...p, messages: [...p.messages, optimistic] } : p));

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          conversationId: string;
          message: Message;
          sources: ChatSource[];
        };
        setSelectedId(data.conversationId);
        await fetchConversations();
        if (data.sources.length > 0)
          setPendingSources((p) => [...p, { messageId: data.message.id, sources: data.sources }]);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateStatus(newStatus: Conversation['status']) {
    if (!selectedId || updatingStatus) return;
    setUpdatingStatus(true);
    const token = await getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setDetail((p) => (p ? { ...p, status: newStatus } : p));
        await fetchConversations();
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  const sourcesForMessage = (id: string) =>
    pendingSources.find((p) => p.messageId === id)?.sources ?? [];

  const pendingCount = conversations.filter((c) => c.status === 'PENDING_HUMAN').length;

  const filteredConversations = conversations.filter((conv) => {
    if (filterTab === 'PENDING_HUMAN') return conv.status === 'PENDING_HUMAN';
    if (filterTab === 'RESOLVED') return conv.status === 'RESOLVED';
    return true;
  });

  const inputBar = (placeholder: string, showSuggestions = false) => (
    <div className="border-t border-white/[0.05] bg-[#0a0a0a]/60 backdrop-blur-sm">
      {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
        <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3 pb-1 scrollbar-none">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
          {loadingSuggestions ? (
            <span className="text-xs text-neutral-600 italic">Generating suggestions…</span>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInput(s)}
                className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:border-indigo-400/50"
              >
                {s.length > 60 ? s.slice(0, 60) + '…' : s}
              </button>
            ))
          )}
        </div>
      )}
      <form onSubmit={handleSend} className="p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={sending}
            className="input-glass flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden rounded-2xl glass animate-fade-in">
      {/* Left panel */}
      <div className="flex w-72 shrink-0 flex-col border-r border-white/[0.05]">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
          <span className="text-sm font-semibold text-white">Tickets & Chat</span>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-neutral-300 transition-all hover:bg-white/[0.1]"
            title="Start new conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-white/[0.05] px-2 py-1.5 gap-1 bg-white/[0.01]">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              filterTab === 'ALL'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('PENDING_HUMAN')}
            className={`relative flex-1 rounded-lg py-1.5 text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              filterTab === 'PENDING_HUMAN'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('RESOLVED')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              filterTab === 'RESOLVED'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Resolved
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageSquare className="h-6 w-6 text-neutral-700" />
              <p className="text-xs text-neutral-500">
                {filterTab === 'PENDING_HUMAN'
                  ? 'No pending tickets'
                  : filterTab === 'RESOLVED'
                  ? 'No resolved tickets'
                  : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.03]">
              {filteredConversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.03] ${
                      selectedId === conv.id ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${statusColors[conv.status]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-medium text-white">#{conv.id.slice(-8)}</p>
                        {conv.status === 'PENDING_HUMAN' && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                            ACTION
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500">
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
                <p className="text-sm font-medium text-white">Select a ticket or start a chat</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Select a pending ticket on the left to reply as a human agent
                </p>
              </div>
            </div>
            {inputBar('Type a test message…')}
          </>
        ) : loadingDetail ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
          </div>
        ) : detail ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${statusColors[detail.status]}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Ticket #{detail.id.slice(-8)}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        detail.status === 'PENDING_HUMAN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : detail.status === 'RESOLVED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {statusLabels[detail.status]}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Created {formatDate(detail.createdAt)} at {formatTime(detail.createdAt)}
                  </p>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2">
                {detail.status === 'RESOLVED' ? (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => void handleUpdateStatus('PENDING_HUMAN')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition-all hover:bg-white/[0.08]"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
                    Reopen Ticket
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => void handleUpdateStatus('RESOLVED')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg transition-all"
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Resolve Ticket
                  </button>
                )}
              </div>
            </div>

            {/* Banner for PENDING_HUMAN */}
            {detail.status === 'PENDING_HUMAN' && (
              <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-5 py-2.5 text-xs text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Customer is waiting for a human agent. Your replies will be sent directly as a Support Agent.</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-5">
                {detail.messages.map((msg) => {
                  const isAI = msg.sender === 'AI';
                  const isCustomer = msg.sender === 'CUSTOMER';
                  const isAgent = msg.sender === 'AGENT';
                  const sources = isAI ? sourcesForMessage(msg.id) : [];

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isAI
                            ? 'bg-white/[0.06]'
                            : isAgent
                            ? 'bg-purple-600/30 border border-purple-500/40'
                            : 'bg-white/10'
                        }`}
                      >
                        {isAI ? (
                          <Bot className="h-3.5 w-3.5 text-neutral-400" />
                        ) : isAgent ? (
                          <Headphones className="h-3.5 w-3.5 text-purple-300" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-neutral-300" />
                        )}
                      </div>

                      <div
                        className={`flex max-w-[72%] flex-col gap-1.5 ${isCustomer ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-neutral-400">
                            {isAI ? 'AI Assistant' : isAgent ? 'Support Agent' : 'Customer'}
                          </span>
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isCustomer
                              ? 'rounded-tr-sm bg-white text-black shadow-glass'
                              : isAgent
                              ? 'rounded-tl-sm bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/30 text-purple-100 shadow-glass'
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

                        <p className="text-[10px] text-neutral-600">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/30">
                      <Headphones className="h-3.5 w-3.5 text-purple-300" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm glass px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400"
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

            {inputBar('Reply to customer as Support Agent…', detail.status === 'PENDING_HUMAN')}
          </>
        ) : null}
      </div>
    </div>
  );
}
