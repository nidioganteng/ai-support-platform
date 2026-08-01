'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  ChevronRight,
  BookOpen,
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

function StatusDot({ status }: { status: Conversation['status'] }) {
  const colors: Record<Conversation['status'], string> = {
    OPEN: 'bg-green-400',
    PENDING_HUMAN: 'bg-yellow-400',
    RESOLVED: 'bg-neutral-500',
    CLOSED: 'bg-neutral-700',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />;
}

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
    if (res.ok) {
      const data = (await res.json()) as Conversation[];
      setConversations(data);
    }
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
      if (res.ok) {
        const data = (await res.json()) as ConversationDetail;
        setDetail(data);
      }
      setLoadingDetail(false);
    },
    [getToken],
  );

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) void fetchDetail(selectedId);
    else setDetail(null);
  }, [selectedId, fetchDetail]);

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

    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      conversationId: selectedId ?? '',
      sender: 'CUSTOMER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    if (detail) {
      setDetail((prev) =>
        prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev,
      );
    }

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: selectedId ?? undefined,
        }),
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
          if (data.sources.length > 0) {
            setPendingSources((prev) => [
              ...prev,
              { messageId: data.message.id, sources: data.sources },
            ]);
          }
        }
      }
    } finally {
      setSending(false);
    }
  }

  function sourcesForMessage(messageId: string): ChatSource[] {
    return pendingSources.find((p) => p.messageId === messageId)?.sources ?? [];
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-xl border border-neutral-800">
      {/* Left panel — conversation list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Conversations</h2>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:bg-neutral-200"
          >
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageSquare className="h-6 w-6 text-neutral-600" />
              <p className="text-xs text-neutral-500">No conversations yet. Start one!</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-800/60 ${
                      selectedId === conv.id ? 'bg-neutral-800' : ''
                    }`}
                  >
                    <StatusDot status={conv.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">
                        #{conv.id.slice(-8)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {conv._count.messages} msgs · {formatDate(conv.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right panel — chat window */}
      <div className="flex flex-1 flex-col">
        {!selectedId && !detail ? (
          /* New conversation / empty state */
          <div className="flex flex-1 flex-col">
            <div className="border-b border-neutral-800 px-6 py-3">
              <p className="text-sm font-medium text-white">New Conversation</p>
              <p className="text-xs text-neutral-500">Ask a question to get started</p>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-neutral-900 p-4">
                <Bot className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-400">
                Type a message below to start a new conversation.
              </p>
            </div>
            <form
              onSubmit={handleSend}
              className="border-t border-neutral-800 bg-neutral-900/50 p-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending}
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:bg-neutral-200 disabled:opacity-50"
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
        ) : loadingDetail ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        ) : detail ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-neutral-800 px-6 py-3">
              <StatusDot status={detail.status} />
              <div>
                <p className="text-sm font-medium text-white">#{detail.id.slice(-8)}</p>
                <p className="text-xs text-neutral-500 capitalize">
                  {detail.status.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {detail.messages.map((msg) => {
                  const isAI = msg.sender === 'AI';
                  const isCustomer = msg.sender === 'CUSTOMER';
                  const sources = isAI ? sourcesForMessage(msg.id) : [];

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isAI
                            ? 'bg-blue-500/20'
                            : isCustomer
                              ? 'bg-neutral-700'
                              : 'bg-purple-500/20'
                        }`}
                      >
                        {isAI ? (
                          <Bot className="h-4 w-4 text-blue-400" />
                        ) : (
                          <User className="h-4 w-4 text-neutral-300" />
                        )}
                      </div>

                      <div
                        className={`flex max-w-[75%] flex-col gap-1 ${isCustomer ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isCustomer
                              ? 'rounded-tr-sm bg-white text-black'
                              : 'rounded-tl-sm bg-neutral-800 text-neutral-100'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {sources.length > 0 && (
                          <div className="mt-1 flex flex-col gap-1.5">
                            {sources.map((src, i) => (
                              <div
                                key={`${src.sourceId}-${src.chunkIndex}`}
                                className="flex items-start gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-400"
                              >
                                <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-neutral-500" />
                                <span>
                                  <span className="font-medium text-neutral-300">
                                    Source {i + 1}
                                  </span>{' '}
                                  — {src.text.slice(0, 120)}
                                  {src.text.length > 120 ? '…' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-neutral-600">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                      <Bot className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-neutral-800 px-4 py-2.5">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="border-t border-neutral-800 bg-neutral-900/50 p-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Reply…"
                  disabled={sending}
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:bg-neutral-200 disabled:opacity-50"
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
        ) : null}
      </div>
    </div>
  );
}
