'use client';

import { Navbar } from '@/components/Navbar';
import { brutalBorder, brutalShadow } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Mail, Cpu, AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { isAuthenticated, isLoading, authError } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setShowLoader(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <AnimatePresence>
        {showLoader && <LoadingScreen />}
      </AnimatePresence>
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          whileHover={{ scale: 1.05, rotate: 0 }}
          className="text-6xl md:text-8xl font-black uppercase mb-6 tracking-tighter leading-none bg-[var(--color-retro-yellow)] inline-block p-4 border-[6px] border-black shadow-[8px_8px_0_0_black]"
        >
          HACK THE MAILS
        </motion.h1>

        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl text-xl md:text-2xl font-bold mb-12 bg-white/80 p-4 border-[3px] border-black shadow-[4px_4px_0_0_black]"
        >
          Post-Quantum Secure. Zero-Knowledge. <br /> Neo-Brutalist Experience.
        </motion.p>

        {/* ── Auth gate ─────────────────────────────────────────────────── */}
        {mounted && (
          <div className="flex flex-col items-center gap-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className={cn(
                  'inline-flex items-center gap-3 text-2xl font-black uppercase px-8 py-4 bg-[var(--color-retro-pink)] text-black',
                  brutalBorder,
                  brutalShadow,
                )}
              >
                Launch Dashboard <ArrowRight strokeWidth={4} />
              </Link>
            ) : isLoading ? (
              /* SIWE handshake in progress */
              <div className={cn(
                'inline-flex items-center gap-3 text-xl font-black uppercase px-8 py-4 bg-[var(--color-retro-blue)]',
                brutalBorder,
              )}>
                <Loader2 size={24} className="animate-spin" />
                Authenticating wallet…
              </div>
            ) : (
              /* Not connected — show RainbowKit ConnectButton */
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  'flex flex-col items-center gap-4 px-8 py-6 bg-[var(--color-retro-blue)]',
                  brutalBorder,
                  brutalShadow,
                )}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={28} strokeWidth={3} />
                    <span className="font-black uppercase text-xl">Connect Phantom to begin</span>
                  </div>
                  <p className="text-sm font-bold font-mono max-w-sm">
                    Sign one message to prove wallet ownership. No password. No email.
                  </p>
                  {/* RainbowKit button — opens wallet selector + triggers SIWE automatically */}
                  <ConnectButton />
                </div>

                {/* Show error if user rejected signing or backend errored */}
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-red-100 border-[3px] border-red-500 px-4 py-3 font-bold text-red-700 text-sm max-w-sm"
                  >
                    <AlertTriangle size={16} />
                    {authError}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Feature cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl w-full text-left">
          <FeatureCard
            color="bg-[var(--color-retro-yellow)]"
            icon={<ShieldCheck size={40} />}
            title="Shatterproof"
            desc="Encrypted with CRYSTALS-Kyber logic. Safe against quantum algorithms."
          />
          <FeatureCard
            color="bg-[var(--color-retro-green)]"
            icon={<Mail size={40} />}
            title="Zero Knowledge"
            desc="Your inbox is only yours. We literally can't read your emails."
          />
          <FeatureCard
            color="bg-[var(--color-retro-pink)]"
            icon={<Cpu size={40} />}
            title="AI Enhanced"
            desc="Write with AI. Read with AI. Filter spam with AI."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ color, icon, title, desc }: {
  color: string; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className={cn(
        'p-6 border-[4px] border-black shadow-[6px_6px_0_0_black] flex flex-col gap-4 transition-colors',
        color,
      )}
    >
      <motion.div
        className="p-3 bg-white border-[3px] border-black shadow-[4px_4px_0_0_black] inline-flex w-fit"
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        {icon}
      </motion.div>
      <h3 className="text-2xl font-black uppercase">{title}</h3>
      <p className="font-bold">{desc}</p>
    </motion.div>
  );
}
