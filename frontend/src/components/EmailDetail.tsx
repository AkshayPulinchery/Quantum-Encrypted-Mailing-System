'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Sparkles, User, KeyRound, Bomb, Rocket, Loader2 } from 'lucide-react';
import { cn, brutalBorder, brutalShadowNoHover } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { api, EmailMessage, formatDate } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function EmailDetail({
  selectedId,
  onDeleted,
}: {
  selectedId: number | null;
  onDeleted?: (id: number) => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [isVaporized, setIsVaporized] = useState(false);

  // Fetch email when selection changes
  useEffect(() => {
    if (!selectedId) { setEmail(null); return; }
    setIsLoadingEmail(true);
    setSummary(null);
    setIsVaporized(false);
    api.mails.get(selectedId)
      .then((data) => {
        setEmail(data);
        // Mark as read if we're the receiver
        if (data && !data.is_read && data.receiver_email === user?.email) {
          api.mails.markRead(selectedId).catch(() => {});
        }
      })
      .catch(() => setEmail(null))
      .finally(() => setIsLoadingEmail(false));
  }, [selectedId, user?.email]);

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

  const handleSummarize = async () => {
    setIsGenerating(true);
    setSummary(null);
    try {
      const result = await api.ai.summarize(email.body_encrypted);
      setSummary(result.summary);
    } catch {
      setSummary('Could not generate summary. Make sure the backend AI service is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerDestruction = () => {
    if (isDestroying) return;
    setIsDestroying(true);
    api.mails.delete(email.id).catch(() => {});
    setTimeout(() => {
      onDeleted?.(email.id);
      setIsVaporized(true);
      setIsDestroying(false);
    }, 2000);
  };

  const isSent = email.sender_email === user?.email;

  return (
    <div className="flex-1 h-full bg-[var(--color-retro-white)] flex flex-col overflow-auto relative">
      {/* Destruction animation overlay */}
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

      {/* Top banner */}
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

      <div className={cn(
        'p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full transition-opacity duration-300',
        isDestroying ? 'opacity-0' : 'opacity-100'
      )}>
        <h1 className="text-4xl font-black uppercase tracking-tight">{email.subject_encrypted}</h1>

        <div className="flex items-center gap-4 bg-white p-4 border-[3px] border-black shadow-[4px_4px_0_0_black]">
          <div className="w-12 h-12 bg-gray-200 border-[2px] border-black flex items-center justify-center overflow-hidden">
            <User size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-black">{email.sender_email}</span>
            <span className="font-bold text-gray-500 text-sm">
              To: {email.receiver_email} &nbsp;·&nbsp; {formatDate(email.created_at)}
            </span>
          </div>
        </div>

        {/* AI Summarize — only show for received emails */}
        {!isSent && (
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={handleSummarize}
              disabled={isGenerating}
              className="bg-[var(--color-retro-pink)] px-4 py-2 font-black uppercase flex items-center gap-2 border-[3px] border-black shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={20} />}
              Summarize Email
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="font-bold text-gray-500 animate-pulse">Running zk-ML summary model...</div>
        )}

        {summary && (
          <div className="bg-[var(--color-retro-bg)] p-4 border-[3px] border-black shadow-[4px_4px_0_0_black] font-bold">
            <div className="flex items-center gap-2 mb-2 font-black uppercase text-[var(--color-retro-pink)] drop-shadow-[1px_1px_0_black]">
              <Sparkles size={18} /> TL;DR
            </div>
            {summary}
          </div>
        )}

        {/* Body */}
        <div className="mt-4 font-mono text-lg leading-relaxed whitespace-pre-wrap flex-1">
          {email.body_encrypted}
        </div>
      </div>
    </div>
  );
}
