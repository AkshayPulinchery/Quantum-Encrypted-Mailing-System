'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, Sparkles, User, KeyRound, Bomb, Rocket,
  Loader2, MessageSquare, Send, X, ShieldAlert, ChevronDown,
} from 'lucide-react';
import { cn, brutalBorder, brutalShadowNoHover } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { api, EmailMessage, formatDate, ChatMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const QUICK_ACTIONS = [
  { label: 'Summarize', instruction: 'Summarize this email in 3 bullet points.' },
  { label: 'Draft Reply', instruction: 'Draft a professional reply to this email.' },
  { label: 'Action Items', instruction: 'List all action items from this email.' },
];

export function EmailDetail({
  selectedId,
  onDeleted,
}: {
  selectedId: number | null;
  onDeleted?: (id: number) => void;
}) {
  const { user } = useAuth();
  const [email, setEmail]               = useState<EmailMessage | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  // Summarize
  const [summary, setSummary]           = useState<string | null>(null);
  const [actionItems, setActionItems]   = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Delete / vaporize
  const [isDestroying, setIsDestroying] = useState(false);
  const [isVaporized, setIsVaporized]   = useState(false);

  // Spam check
  const [spamResult, setSpamResult]     = useState<{ is_spam: boolean; confidence: number; reason: string } | null>(null);

  // Chat panel
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatHistory, setChatHistory]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState('');
  const [isChatting, setIsChatting]     = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch email when selection changes
  useEffect(() => {
    if (!selectedId) { setEmail(null); return; }
    setIsLoadingEmail(true);
    setSummary(null);
    setActionItems([]);
    setIsVaporized(false);
    setSpamResult(null);
    setChatOpen(false);
    setChatHistory([]);
    setChatInput('');

    api.mails.get(selectedId)
      .then((data) => {
        setEmail(data);
        if (data && !data.is_read && data.receiver_email === user?.email) {
          api.mails.markRead(selectedId).catch(() => {});
        }
      })
      .catch(() => setEmail(null))
      .finally(() => setIsLoadingEmail(false));
  }, [selectedId, user?.email]);

  // Auto spam-check incoming emails
  useEffect(() => {
    if (!email || email.sender_email === user?.email) return;
    const text = `${email.subject_encrypted} ${email.body_encrypted}`;
    api.ai.spamCheck(text)
      .then(setSpamResult)
      .catch(() => {}); // never block the UI
  }, [email?.id, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleSummarize = async () => {
    if (!email) return;
    setIsGenerating(true);
    setSummary(null);
    setActionItems([]);
    try {
      const result = await api.ai.summarize(email.body_encrypted);
      setSummary(result.summary);
      setActionItems(result.action_items ?? []);
    } catch {
      setSummary('Could not generate summary. Make sure the backend AI service is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerDestruction = () => {
    if (isDestroying || !email) return;
    setIsDestroying(true);
    api.mails.delete(email.id).catch(() => {});
    setTimeout(() => {
      onDeleted?.(email.id);
      setIsVaporized(true);
      setIsDestroying(false);
    }, 2000);
  };

  const handleChat = async (overrideInstruction?: string) => {
    if (!email) return;
    const instruction = (overrideInstruction ?? chatInput).trim();
    if (!instruction) return;
    setChatInput('');

    // Seed the email context on the very first turn (invisible in UI)
    const contextPair: ChatMessage[] = chatHistory.length === 0 ? [
      { role: 'user',      content: `Email:\nSubject: ${email.subject_encrypted}\n\n${email.body_encrypted.slice(0, 800)}` },
      { role: 'assistant', content: 'I have read the email. How can I help?' },
    ] : [];

    const userMsg: ChatMessage = { role: 'user', content: instruction };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);

    setIsChatting(true);
    try {
      const result = await api.ai.chat([...contextPair, ...chatHistory], instruction);
      const aiMsg: ChatMessage = { role: 'assistant', content: result.reply };
      setChatHistory([...nextHistory, aiMsg]);
    } catch {
      const aiMsg: ChatMessage = { role: 'assistant', content: 'Sorry, the AI chat is unavailable right now.' };
      setChatHistory([...nextHistory, aiMsg]);
    } finally {
      setIsChatting(false);
    }
  };

  // ── empty / loading states ─────────────────────────────────────────────────

  if (!selectedId) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center p-8">
        <div className="text-2xl font-black text-gray-400 border-[4px] border-dashed border-gray-300 p-12 text-center uppercase">
          Select a secure message to read
        </div>
      </div>
    );
  }

  if (isVaporized) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center p-8">
        <div className="text-2xl font-black text-gray-400 border-[4px] border-dashed border-gray-300 p-12 text-center uppercase">
          Data Vaporized 💨
        </div>
      </div>
    );
  }

  if (isLoadingEmail) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!email) return null;

  const isSent = email.sender_email === user?.email;
  const isSpam = spamResult?.is_spam === true;

  return (
    <div className="flex-1 h-full bg-[var(--color-retro-white)] flex flex-col overflow-auto relative">

      {/* ── Destruction overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isDestroying && (
          <motion.div
            initial={{ x: '100%', y: '-100%', rotate: 135, scale: 2 }}
            animate={{ x: '0%', y: '0%', rotate: 135, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            <div className="relative">
              <Rocket size={150} className="text-black fill-[var(--color-retro-yellow)] border-[4px] border-black p-2 bg-white shadow-[8px_8px_0_0_black]" />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 0.1 }}
                className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500 rounded-full blur-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDestroying && (
          <motion.div
            initial={{ opacity: 1 }}
            className="absolute inset-0 z-40 bg-white/20 backdrop-blur-sm overflow-hidden"
          >
            <div className="relative w-full h-full">
              {Array.from({ length: 60 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: '50%', y: '50%', opacity: 1, scale: 1 }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 200}%`,
                    y: `${50 + (Math.random() - 0.5) * 200}%`,
                    rotate: Math.random() * 720,
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                  className="absolute w-12 h-12 bg-black border-[2px] border-[var(--color-retro-pink)] shadow-[4px_4px_0_0_black]"
                  style={{ left: '-24px', top: '-24px' }}
                />
              ))}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 4, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full z-50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top banner ──────────────────────────────────────────────────── */}
      {isSent ? (
        <div className="bg-[var(--color-retro-blue)] border-b-[4px] border-black p-3 flex items-center gap-3">
          <KeyRound strokeWidth={3} size={20} />
          <span className="font-black uppercase text-sm tracking-wide">Sent — End-to-End Encrypted</span>
        </div>
      ) : (
        <div className="bg-[var(--color-retro-green)] border-b-[4px] border-black p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound strokeWidth={3} size={20} />
            <span className="font-black uppercase text-sm tracking-wide">
              Verified End-to-End Encrypted (CRYSTALS-Dilithium)
            </span>
          </div>
          <button
            onClick={triggerDestruction}
            title="Delete email"
            className="bg-black text-white px-3 py-1 font-black uppercase text-xs border-[2px] border-white shadow-[2px_2px_0_0_white] hover:bg-red-600 flex items-center gap-1"
          >
            <Bomb size={14} /> Delete
          </button>
        </div>
      )}

      {/* ── Spam warning banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isSpam && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-100 border-b-[4px] border-red-600 p-3 flex items-start gap-3">
              <ShieldAlert size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-black uppercase text-red-700 text-sm">
                  Spam / Phishing Warning &mdash; {Math.round((spamResult?.confidence ?? 0) * 100)}% confidence
                </p>
                <p className="font-bold text-red-600 text-xs mt-0.5">{spamResult?.reason}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Email content ───────────────────────────────────────────────── */}
      <div className={cn(
        'p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full transition-opacity duration-300',
        isDestroying ? 'opacity-0' : 'opacity-100'
      )}>
        <h1 className="text-4xl font-black uppercase tracking-tight">{email.subject_encrypted}</h1>

        <div className="flex items-center gap-4 bg-white p-4 border-[3px] border-black shadow-[4px_4px_0_0_black]">
          <div className="w-12 h-12 bg-gray-200 border-[2px] border-black flex items-center justify-center">
            <User size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-black">{email.sender_email}</span>
            <span className="font-bold text-gray-500 text-sm">
              To: {email.receiver_email} &nbsp;·&nbsp; {formatDate(email.created_at)}
            </span>
          </div>
        </div>

        {/* AI action buttons — only for received emails */}
        {!isSent && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSummarize}
              disabled={isGenerating}
              className="bg-[var(--color-retro-pink)] px-4 py-2 font-black uppercase flex items-center gap-2 border-[3px] border-black shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={20} />}
              Summarize
            </button>
            <button
              onClick={() => { setChatOpen(o => !o); }}
              className={cn(
                'px-4 py-2 font-black uppercase flex items-center gap-2 border-[3px] border-black shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all',
                chatOpen ? 'bg-black text-white' : 'bg-[var(--color-retro-blue)]'
              )}
            >
              <MessageSquare size={20} />
              {chatOpen ? 'Close Chat' : 'Chat with AI'}
              <ChevronDown size={16} className={cn('transition-transform', chatOpen ? 'rotate-180' : '')} />
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="font-bold text-gray-500 animate-pulse">Running zk-ML summary model...</div>
        )}

        {/* Summary output */}
        {summary && (
          <div className="bg-[var(--color-retro-bg)] p-4 border-[3px] border-black shadow-[4px_4px_0_0_black] font-bold">
            <div className="flex items-center gap-2 mb-2 font-black uppercase text-[var(--color-retro-pink)] drop-shadow-[1px_1px_0_black]">
              <Sparkles size={18} /> TL;DR
            </div>
            <p className="whitespace-pre-line">{summary}</p>
            {actionItems.length > 0 && (
              <div className="mt-3 pt-3 border-t-[3px] border-black">
                <p className="font-black uppercase text-sm mb-2">Action Items</p>
                <ul className="flex flex-col gap-1">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-black mt-0.5">→</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Email body */}
        <div className="mt-4 font-mono text-lg leading-relaxed whitespace-pre-wrap flex-1">
          {email.body_encrypted}
        </div>
      </div>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t-[4px] border-black"
          >
            {/* Chat header */}
            <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black uppercase text-sm">
                <MessageSquare size={16} />
                Chat with AI about this email
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="hover:bg-white/20 p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat messages */}
            <div className="max-h-72 overflow-y-auto flex flex-col gap-3 p-4 bg-[var(--color-retro-bg)]">
              {chatHistory.length === 0 && (
                <p className="text-sm font-bold text-gray-500 text-center py-4">
                  Ask me anything about this email — or use a quick action below.
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] p-3 border-[3px] border-black font-bold text-sm',
                    msg.role === 'user'
                      ? 'self-end bg-[var(--color-retro-yellow)] shadow-[3px_3px_0_0_black]'
                      : 'self-start bg-white shadow-[3px_3px_0_0_black]'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <span className="flex items-center gap-1 font-black uppercase text-xs text-gray-500 mb-1">
                      <Sparkles size={12} /> AI
                    </span>
                  )}
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              ))}
              {isChatting && (
                <div className="self-start bg-white border-[3px] border-black p-3 shadow-[3px_3px_0_0_black] flex items-center gap-2 font-bold text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" /> Thinking…
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 px-4 py-2 border-t-[3px] border-black bg-white">
              {QUICK_ACTIONS.map(({ label, instruction }) => (
                <button
                  key={label}
                  onClick={() => handleChat(instruction)}
                  disabled={isChatting}
                  className="text-xs font-black uppercase px-3 py-1.5 border-[2px] border-black shadow-[2px_2px_0_0_black] bg-[var(--color-retro-bg)] hover:bg-[var(--color-retro-yellow)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Chat input */}
            <div className="flex border-t-[4px] border-black">
              <input
                className="flex-1 px-4 py-3 font-bold outline-none bg-white placeholder-gray-300 text-sm"
                placeholder="Ask about this email…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                disabled={isChatting}
              />
              <button
                onClick={() => handleChat()}
                disabled={isChatting || !chatInput.trim()}
                className="bg-[var(--color-retro-green)] px-5 border-l-[4px] border-black font-black uppercase text-sm flex items-center gap-2 hover:brightness-95 active:brightness-90 disabled:opacity-50 transition-all"
              >
                {isChatting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
