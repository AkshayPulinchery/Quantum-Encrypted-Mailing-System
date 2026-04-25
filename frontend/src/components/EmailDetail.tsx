'use client';

import { useState, useEffect } from 'react';
import { MOCK_EMAILS } from './EmailList';
import { AlertTriangle, Sparkles, User, KeyRound, Bomb, Rocket, Loader2, ShieldAlert } from 'lucide-react';
import { cn, brutalBorder, brutalShadowNoHover } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/context/UserContext';
import { summarizePlaintext, spamCheckPlaintext } from '@/lib/ai/ai-client';

export function EmailDetail({ selectedId }: { selectedId: number | null }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const { destroyedIds, destroyEmail } = useUser();
  const [lastViewedDestructive, setLastViewedDestructive] = useState<number | null>(null);

  const email = MOCK_EMAILS.find(e => e.id === selectedId);

  // Auto-vaporize logic: if the user was viewing a destructive email and moves away, vaporize it.
  useEffect(() => {
    if (lastViewedDestructive && lastViewedDestructive !== selectedId && !destroyedIds.includes(lastViewedDestructive)) {
      // Trigger destruction for the previous one
      // Since it's not the active one anymore, we might not show the animation here, 
      // but we should mark it as destroyed globally.
      destroyEmail(lastViewedDestructive);
    }

    if (email?.isDestructive) {
      setLastViewedDestructive(selectedId);
    } else {
      setLastViewedDestructive(null);
    }
  }, [selectedId, email, lastViewedDestructive, destroyedIds, destroyEmail]);

  if (!selectedId || destroyedIds.includes(selectedId)) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center p-8">
        <div className="text-2xl font-black text-gray-400 border-[4px] border-dashed border-gray-300 p-12 text-center uppercase">
          {destroyedIds.includes(selectedId!) ? 'Data Vaporized 💨' : 'Select a secure message to read'}
        </div>
      </div>
    );
  }

  if (!email) return null;

  const handleSummarize = async () => {
    setIsGenerating(true);
    setSummary(null);
    try {
      // Use the plaintext content (from mock data for now)
      // In production, this would decrypt the email first
      const result = await summarizePlaintext(email.content);
      setSummary(result.summary);
    } catch {
      setSummary('⚠️ AI summarization failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerDestruction = () => {
    if (isDestroying) return;
    setIsDestroying(true);
    setTimeout(() => {
      destroyEmail(selectedId);
      setIsDestroying(false);
    }, 2000);
  };

  return (
    <div className="flex-1 h-full bg-[var(--color-retro-white)] flex flex-col overflow-auto relative">
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
                    opacity: 0
                  }}
                  transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
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

      {/* Top Banner (Spam / Encrypted / Destructive) */}
      {email.isDestructive ? (
        <div className="bg-[var(--color-retro-pink)] border-b-[4px] border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bomb strokeWidth={3} className="text-black animate-bounce" size={28} />
            <div className="flex flex-col">
              <span className="font-black uppercase text-black">Self-Destruct Sequence Active</span>
              <span className="font-bold text-sm">Vaporization triggers automatically on close.</span>
            </div>
          </div>
          <button
            onClick={triggerDestruction}
            className="bg-black text-white px-4 py-2 font-black uppercase text-xs border-[2px] border-white shadow-[3px_3px_0_0_white] hover:bg-red-600 transition-colors"
          >
            Vaporize Now
          </button>
        </div>
      ) : email.isSpam ? (
        <div className="bg-[var(--color-retro-yellow)] border-b-[4px] border-black p-4 flex items-center gap-3">
          <AlertTriangle strokeWidth={3} className="text-red-600" size={28} />
          <div className="flex flex-col">
            <span className="font-black uppercase text-red-600">Warning: Unverified Sender</span>
            <span className="font-bold text-sm">This email failed our ZERO-KNOWLEDGE reputation checks.</span>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-retro-green)] border-b-[4px] border-black p-3 flex items-center gap-3">
          <KeyRound strokeWidth={3} size={24} />
          <span className="font-black uppercase text-sm tracking-wide">
            Verified End-to-End Encrypted (CRYSTALS-Dilithium)
          </span>
        </div>
      )}

      <div className={cn(
        "p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full transition-opacity duration-300",
        isDestroying ? "opacity-0" : "opacity-100"
      )}>
        <div className="flex justify-between items-start">
          <h1 className="text-4xl font-black uppercase tracking-tight">{email.subject}</h1>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 border-[3px] border-black shadow-[4px_4px_0_0_black]">
          <div className="w-12 h-12 bg-gray-200 border-[2px] border-black flex items-center justify-center overflow-hidden">
            <User size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-black">{email.sender}</span>
            <span className="font-bold text-gray-500 text-sm">To: me ({email.date})</span>
          </div>
        </div>

        {/* AI Action */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handleSummarize}
            disabled={isGenerating || email.isDestructive}
            className="bg-[var(--color-retro-pink)] px-4 py-2 font-black uppercase flex items-center gap-2 border-[3px] border-black shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
          >
            <Sparkles size={20} /> Summarize Email
          </button>
        </div>

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

        {/* Body content */}
        <div className="mt-8 font-mono text-lg leading-relaxed whitespace-pre-wrap flex-1">
          {email.content}
        </div>

        {email.isDestructive && (
          <div className="mt-auto border-t-[4px] border-black pt-8 flex justify-center pb-8">
            <button
              onClick={triggerDestruction}
              className="bg-[var(--color-retro-yellow)] p-6 font-black uppercase text-2xl border-[4px] border-black shadow-[8px_8px_0_0_black] hover:bg-black hover:text-white transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              I am done reading. VAPORIZE NOW!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

