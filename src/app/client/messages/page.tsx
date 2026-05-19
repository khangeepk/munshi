'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, AlertCircle, Loader2 } from 'lucide-react';

type Message = {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderId: string;
  sender: { name: string; role: string };
  case: { id: string; caseTitle: string; caseNumber: string } | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

const ADVOCATE_ROLES = new Set(['TENANT_ADMIN', 'ADVOCATE', 'JUNIOR_LAWYER', 'CLERK', 'ACCOUNTANT']);

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const r = await fetch('/api/client/messages', { credentials: 'include' });
    const d = await r.json();
    if (!d.error) setMessages(d.messages ?? []);
  };

  useEffect(() => {
    // Get current user id from session
    fetch('/api/auth/session', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setUserId(d.user?.id ?? null));

    fetchMessages()
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/client/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const d = await r.json();
      if (d.error) {
        alert(d.error);
      } else {
        setContent('');
        await fetchMessages();
      }
    } catch {
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E3A5F' }} />
        <p className="text-sm text-gray-500">Loading messages…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-800">Unable to load messages</p>
          <p className="text-sm text-red-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F2240' }}>Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Communicate securely with your law firm</p>
      </div>

      {/* Message thread */}
      <div
        className="flex-1 bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '400px', maxHeight: '60vh' }}
      >
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <MessageSquare className="w-12 h-12 text-gray-200" />
              <p className="text-gray-500 font-medium">No messages yet</p>
              <p className="text-sm text-gray-400 text-center max-w-xs">
                Send a message to your law firm below and they will respond shortly.
              </p>
            </div>
          ) : messages.map(msg => {
            const isMe = msg.senderId === userId;
            const isAdvocate = ADVOCATE_ROLES.has(msg.sender.role);
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2">
                    {!isMe && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: '#EFF6FF', color: '#1E3A5F' }}
                      >
                        {msg.sender.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      {isMe ? 'You' : msg.sender.name}
                      {isAdvocate && !isMe && ' (Law Firm)'}
                    </p>
                  </div>
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isMe ? '#1E3A5F' : '#F3F4F6',
                      color: isMe ? 'white' : '#111827',
                      borderRadius: isMe ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                    }}
                  >
                    {msg.content}
                  </div>
                  <p className="text-xs text-gray-400">{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose area */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-end gap-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message… (Enter to send)"
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 min-h-[42px] max-h-32"
            style={{ '--tw-ring-color': '#1E3A5F' } as React.CSSProperties}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 disabled:opacity-40 flex-shrink-0"
            style={{ background: '#1E3A5F', color: 'white' }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
