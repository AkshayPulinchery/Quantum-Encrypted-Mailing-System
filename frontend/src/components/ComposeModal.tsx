'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Send, RefreshCcw, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { brutalBorder, brutalShadowNoHover, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useEmails } from '@/context/EmailContext';

function getDemoMode(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('demoMode');
  return saved !== 'false';
}

export function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tone, setTone] = useState('Professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuantum, setIsQuantum] = useState(true);
  const [isDestructive, setIsDestructive] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const { isConnected } = useAccount();
  const { sendEmail } = useEmails();

  useEffect(() => {
    setDemoMode(getDemoMode());
  }, []);

  const handleWriteWithAI = async () => {
    setIsGenerating(true);
    try {
      const resp = await fetch(`${API_URL}/api/ai/generate-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: subject || 'General inquiry', tone })
      });
      const data = await resp.json();
      if (data.body) {
        setBody(data.body);
        if (data.subject && !subject) setSubject(data.subject);
      }
    } catch (e) {
      console.error(e);
      // Fallback
      setBody(`Dear ${to || 'Recipient'},\n\n[AI Generation failed, using local template]\n\nBest regards,\nCuteMail User`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRewriteTone = async () => {
    if (!body) return;
    setIsGenerating(true);
    try {
      const resp = await fetch(`${API_URL}/api/ai/rewrite/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, tone })
      });
      const data = await resp.json();
      if (data.rewritten) setBody(data.rewritten);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!demoMode && !isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    if (!subject || !body) {
      setError('Please fill in subject and body');
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    try {
      const result = await sendEmail(to, subject, body, isQuantum, isDestructive, isAnonymous);
      if (demoMode && typeof result === 'string') {
        setSentCode(result);
      } else {
        setTo('');
        setSubject('');
        setBody('');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = () => {
    if (!sentCode) return;
    navigator.clipboard.writeText(sentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-8 overflow-hidden backdrop-blur-sm">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className={cn(
          "w-full max-w-2xl max-h-[90vh] bg-[var(--color-retro-white)] flex flex-col relative",
          brutalBorder,
          brutalShadowNoHover
        )}
      >
        <div className="bg-[var(--color-retro-yellow)] p-3 border-b-[4px] border-black flex justify-between items-center text-black">
          <h2 className="font-black uppercase text-xl">
            {sentCode ? '📩 Email Sent!' : 'New Message'}
          </h2>
          <button onClick={onClose} className="hover:bg-black hover:text-white p-1 border-[2px] border-transparent hover:border-black transition-colors">
            <X strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-col flex-1 p-6 overflow-y-auto">
          {sentCode ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center text-center py-8"
            >
              <div className="w-20 h-20 bg-[var(--color-retro-green)] border-[4px] border-black shadow-[4px_4px_0_0_black] rounded-full flex items-center justify-center mb-6">
                <Check size={40} className="text-black" strokeWidth={4} />
              </div>
              <h3 className="text-3xl font-black uppercase mb-2">Success!</h3>
              <p className="font-bold text-gray-600 mb-8 max-w-md">
                Your email has been encrypted and is ready for transport. Share the code below with your recipient.
              </p>

              <div className="w-full bg-white border-[4px] border-black p-4 mb-6 relative group overflow-hidden">
                <p className="text-left font-mono text-sm break-all pr-12 line-clamp-3">
                  {sentCode}
                </p>
                <button 
                  onClick={copyToClipboard}
                  className={cn(
                    "absolute top-2 right-2 p-2 border-[2px] border-black transition-all",
                    copiedCode ? "bg-[var(--color-retro-green)]" : "bg-white hover:bg-gray-100",
                    brutalShadowNoHover
                  )}
                >
                  {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={copyToClipboard}
                  className="flex-1 bg-[var(--color-retro-blue)] border-[4px] border-black p-4 font-black uppercase shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
                >
                  {copiedCode ? 'Copied!' : 'Copy Share Code'} 
                  {!copiedCode && <Copy size={20} />}
                </button>
                <button 
                  onClick={onClose}
                  className="bg-white border-[4px] border-black p-4 font-black uppercase shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Done
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b-[3px] border-black pb-2">
                <span className="font-bold text-gray-500 w-16 text-left">To:</span>
                <input 
                  className="flex-1 outline-none font-medium bg-transparent"
                  placeholder="0x... or ENS name" 
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 border-b-[3px] border-black pb-2 mt-2">
                <span className="font-bold text-gray-500 w-16 text-left">Subject:</span>
                <input 
                  className="flex-1 outline-none font-bold bg-transparent placeholder-gray-300"
                  placeholder="Post-Quantum Secure Inquiry" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button 
                  onClick={handleWriteWithAI}
                  disabled={isGenerating}
                  className="bg-[var(--color-retro-pink)] px-3 py-2 font-bold flex items-center gap-2 border-[2px] border-black shadow-[2px_2px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none min-w-fit disabled:opacity-50"
                >
                  <Sparkles size={18} /> Write with AI
                </button>
                <div className="flex items-center gap-2 border-[2px] border-black shadow-[2px_2px_0_0_black] bg-white p-1">
                  <select 
                    className="outline-none font-bold bg-transparent pl-2"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    <option>Professional</option>
                    <option>Casual</option>
                    <option>Urgent</option>
                    <option>Poetic</option>
                  </select>
                  <button 
                    onClick={handleRewriteTone}
                    disabled={isGenerating || !body}
                    className="bg-[var(--color-retro-blue)] px-2 py-1 flex items-center gap-1 border-l-[2px] border-black font-bold active:bg-blue-600 disabled:opacity-50"
                  >
                    <RefreshCcw size={16} /> Rewrite
                  </button>
                </div>
              </div>

              <textarea 
                className="flex-1 w-full mt-4 p-4 min-h-[300px] outline-none border-[3px] border-black shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] resize-none font-mono text-sm leading-relaxed"
                placeholder="Write your quantum-encrypted message here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />

              {error && (
                <div className="mt-4 bg-red-100 border-[2px] border-red-500 p-2 font-bold text-red-600">
                  {error}
                </div>
              )}
            </>
          )}

          <AnimatePresence>
            {(isGenerating || isSending) && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 font-bold"
              >
                <div className="bg-white border-[4px] border-black p-6 flex flex-col items-center gap-4 shadow-[8px_8px_0_0_black]">
                  <Loader2 className="w-10 h-10 animate-spin text-black" strokeWidth={3} />
                  <span className="text-xl uppercase font-black">
                    {isSending 
                      ? (isQuantum ? 'Projecting Quantum Phase...' : 'Encrypting with Kyber...') 
                      : 'Consulting Neural Grid...'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!sentCode && (
          <div className="p-4 border-t-[4px] border-black bg-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label 
                className={cn(
                  "flex items-center gap-2 cursor-pointer p-2 border-[2px] border-black font-bold text-xs select-none transition-colors",
                  isQuantum ? "bg-purple-300" : "bg-white"
                )}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={isQuantum}
                  onChange={() => setIsQuantum(!isQuantum)}
                />
                {isQuantum ? '⚛️ QUANTUM ON' : '⚛️ QUANTUM OFF'}
              </label>

              <label 
                className={cn(
                  "flex items-center gap-2 cursor-pointer p-2 border-[2px] border-black font-bold text-xs select-none transition-colors",
                  isDestructive ? "bg-orange-300" : "bg-white"
                )}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={isDestructive}
                  onChange={() => setIsDestructive(!isDestructive)}
                />
                {isDestructive ? '💣 DESTRUCTIVE ON' : '💣 DESTRUCTIVE OFF'}
              </label>

              <label 
                className={cn(
                  "flex items-center gap-2 cursor-pointer p-2 border-[2px] border-black font-bold text-xs select-none transition-colors",
                  isAnonymous ? "bg-blue-300" : "bg-white"
                )}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={isAnonymous}
                  onChange={() => setIsAnonymous(!isAnonymous)}
                />
                {isAnonymous ? '👤 ANON MODE ON' : '👤 ANON MODE OFF'}
              </label>
            </div>
            
            <button 
              className="bg-[var(--color-retro-green)] px-6 py-3 font-black uppercase flex items-center gap-2 border-[3px] border-black shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
              onClick={handleSend}
              disabled={isSending || (!demoMode && !isConnected)}
            >
              <Send size={20} /> Send
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}