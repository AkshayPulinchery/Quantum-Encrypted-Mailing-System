'use client';

import { cn } from '@/lib/utils';
import { Inbox, Send, Edit3, Trash2, PenBox, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ComposeModal } from '@/components/ComposeModal';
import { motion } from 'framer-motion';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [refreshSentKey, setRefreshSentKey] = useState(0);
  const { profilePic } = useUser();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const links = [
    { name: 'Inbox', href: '/dashboard', icon: <Inbox /> },
    { name: 'Sent', href: '/dashboard/sent', icon: <Send /> },
    { name: 'Drafts', href: '/dashboard/drafts', icon: <Edit3 /> },
    { name: 'Trash', href: '/dashboard/trash', icon: <Trash2 /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <Settings /> },
  ];

  return (
    <aside className={cn('bg-[var(--color-retro-white)] border-r-[4px] border-black flex flex-col p-4 gap-6', className)}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsComposeOpen(true)}
        className="flex items-center justify-center gap-2 bg-[var(--color-retro-yellow)] border-[3px] border-black shadow-[4px_4px_0_0_black] p-4 font-black uppercase text-lg"
      >
        <PenBox size={24} /> Compose
      </motion.button>

      <nav className="flex flex-col gap-2 flex-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.name} href={link.href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 p-3 font-bold border-[3px] border-transparent transition-colors',
                  isActive ? 'bg-[var(--color-retro-blue)] border-black shadow-[4px_4px_0_0_black]' : 'hover:border-black hover:bg-gray-100'
                )}
              >
                {link.icon}
                {link.name}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="mt-auto flex flex-col gap-2">
        <Link href="/dashboard/settings">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="border-[3px] border-black bg-white p-3 flex items-center gap-3 shadow-[4px_4px_0_0_black] hover:bg-gray-50"
          >
            <div className="w-10 h-10 border-[2px] border-black overflow-hidden bg-[var(--color-retro-pink)] flex-shrink-0">
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs uppercase truncate">{user?.username ?? '...'}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter truncate">{user?.email ?? ''}</span>
            </div>
          </motion.div>
        </Link>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 p-2 font-black uppercase text-sm border-[3px] border-black hover:bg-black hover:text-white transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </motion.button>
      </div>

      {isComposeOpen && (
        <ComposeModal
          onClose={() => setIsComposeOpen(false)}
          onSent={() => setRefreshSentKey((k) => k + 1)}
        />
      )}
    </aside>
  );
}
