'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Sparkles, User, KeyRound, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useEmails, BlockchainEmail, shortenAddress, formatTimestamp } from '@/context/EmailContext';
import { Bomb, Rocket } from 'lucide-react';

interface EmailDetailProps {
  selectedId: number | null;
  isDemo?: boolean;
}

export function BlockchainEmailDetail({ selectedId, isDemo = false }: EmailDetailProps) {
  const { emails, loading, deleteEmail } = useEmails();
  const { address } = useAccount();
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [lastViewedDestructive, setLastViewedDestructive] = useState<number | null>(null);

  const email: BlockchainEmail | undefined = emails.find((e: BlockchainEmail) => e.id === selectedId);
  const isSentByMe = email && address ? email.from.toLowerCase() === address.toLowerCase() : false;

  // Auto-vaporize logic
  useEffect(() => {
    if (lastViewedDestructive && lastViewedDestructive !== selectedId) {
      deleteEmail(lastViewedDestructive);
      setLastViewedDestructive(null);
    }
    
    if (email?.isDestructive) {
      setLastViewedDestructive(selectedId);
    }
  }, [selectedId, email, lastViewedDestructive, deleteEmail]);

  if (!address && !isDemo) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center p-8">
        <div className="text-2xl font-black text-gray-400 border-[4px] border-dashed border-gray-300 p-12 text-center uppercase">
          Connect wallet to read emails
        </div>
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center p-8">
        <div className="text-2xl font-black text-gray-400 border-[4px] border-dashed border-gray-300 p-12 text-center uppercase">
          Select a quantum-secured message
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 h-full bg-[var(--color-retro-bg)] flex items-center justify-center p-8">
        <div className="text-2xl font-black text-gray-400 border-[4px] border-dashed border-gray-300 p-12 text-center uppercase">
          {lastViewedDestructive === selectedId ? 'Data Vaporized 💨' : 'Email not found'}
        </div>
      </div>
    );
  }

  const triggerDestruction = () => {
    if (isDestroying) return;
    setIsDestroying(true);
    setTimeout(() => {
      deleteEmail(selectedId);
      setIsDestroying(false);
    }, 2000); 
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleSummarize = async () => {
    setIsGenerating(true);
    setSummary(null);
    try {
      const resp = await fetch(`${API_URL}/api/ai/summarize/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: email?.body || '' })
      });
      const data = await resp.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
      setSummary("Failed to generate AI summary. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
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
      ) : (
        <div className="bg-[var(--color-retro-green)] border-b-[4px] border-black p-3 flex items-center gap-3">
          <KeyRound strokeWidth={3} size={24} />
          <span className="font-black uppercase text-sm tracking-wide">
            {email.isQuantum ? 'Quantum-Secured (Phase-Shift Rotation)' : 'Secured (Crystals-Kyber)'}
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
            <span className="font-black">
              {isSentByMe ? `To: ${shortenAddress(email.to)}` : `From: ${shortenAddress(email.from)}`}
            </span>
            {email.isAnonymous && !isSentByMe && (
              <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 border-[1px] border-blue-600 rounded-full w-fit mt-1">
                SENDER IDENTITY MASKED
              </span>
            )}
            <span className="font-bold text-gray-500 text-sm">
              {isSentByMe ? 'Sent' : 'Received'} • {formatTimestamp(email.timestamp)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <button 
            onClick={handleSummarize}
            disabled={isGenerating || email.isDestructive}
            className="bg-[var(--color-retro-pink)] px-4 py-2 font-black uppercase flex items-center gap-2 border-[3px] border-black shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
          >
            <Sparkles size={20} /> Summarize
          </button>
        </div>

        {isGenerating && (
           <div className="font-bold text-gray-500 animate-pulse flex items-center gap-2">
             <Loader2 className="w-4 h-4 animate-spin" /> Running quantum summary...
           </div>
        )}

        {summary && (
          <div className="bg-[var(--color-retro-bg)] p-4 border-[3px] border-black shadow-[4px_4px_0_0_black] font-bold">
            <div className="flex items-center gap-2 mb-2 font-black uppercase text-[var(--color-retro-pink)] drop-shadow-[1px_1px_0_black]">
              <Sparkles size={18} /> TL;DR
            </div>
            {summary}
          </div>
        )}

        <div className="mt-8 font-mono text-lg leading-relaxed whitespace-pre-wrap flex-1">
          {email.body}
        </div>

        <div className="mt-auto border-t-[4px] border-black pt-8 flex justify-center pb-8">
          {email.isDestructive ? (
             <button 
                onClick={triggerDestruction}
                className="bg-[var(--color-retro-yellow)] p-6 font-black uppercase text-2xl border-[4px] border-black shadow-[8px_8px_0_0_black] hover:bg-black hover:text-white transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                I am done reading. VAPORIZE NOW!
             </button>
          ) : (
            <div className="bg-gray-100 p-4 border-[3px] border-black font-bold text-sm text-center">
              <p>This message is secured by {email.isQuantum ? 'Quantum-Inspired Formula' : 'Post-Quantum Kyber'}</p>
              <p className="text-gray-500">ID: {email.id} • {email.isQuantum ? 'Phase-Shift Rotation' : 'Kyber-768'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}