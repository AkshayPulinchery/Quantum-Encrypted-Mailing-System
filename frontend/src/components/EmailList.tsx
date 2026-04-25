'use client';

import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api, EmailMessage, formatDate } from '@/lib/api';

export type { EmailMessage };

export function EmailList({
  selectedId,
  setSelectedId,
  onEmailsLoaded,
  folder = 'inbox',
}: {
  selectedId: number | null;
  setSelectedId: (id: number) => void;
  onEmailsLoaded?: (emails: EmailMessage[]) => void;
  folder?: string;
}) {
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = folder === 'sent' ? await api.mails.sent() : await api.mails.inbox();
      setEmails(data);
      onEmailsLoaded?.(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  }, [folder, onEmailsLoaded]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const filtered = emails.filter((e) => {
    if (activeTab === 'Unread' && folder === 'inbox') return !e.is_read;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full border-r-[4px] border-black bg-white items-center justify-center gap-4">
        <RefreshCw size={32} className="animate-spin text-gray-400" />
        <p className="font-bold text-gray-500 uppercase text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full border-r-[4px] border-black bg-white items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="font-bold text-red-600">{error}</p>
        <button
          onClick={fetchEmails}
          className="bg-[var(--color-retro-yellow)] px-4 py-2 font-black uppercase border-[3px] border-black shadow-[3px_3px_0_0_black] text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r-[4px] border-black bg-white">
      {/* Tabs — only show All/Unread for inbox */}
      {folder === 'inbox' && (
        <div className="flex border-b-[4px] border-black font-black uppercase text-sm">
          {(['All', 'Unread'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 p-3 border-r-[4px] border-black last:border-r-0 transition-colors',
                activeTab === tab ? 'bg-[var(--color-retro-yellow)]' : 'hover:bg-gray-100'
              )}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={fetchEmails}
            title="Refresh"
            className="px-3 border-l-[4px] border-black hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="overflow-y-auto flex-1 p-2 flex flex-col gap-2 bg-[var(--color-retro-bg)]"
      >
        {filtered.map((email, idx) => (
          <motion.button
            key={email.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedId(email.id)}
            className={cn(
              'text-left p-4 border-[3px] border-black transition-colors flex flex-col gap-1',
              selectedId === email.id
                ? 'bg-[var(--color-retro-blue)] shadow-[4px_4px_0_0_black]'
                : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0_0_black]',
              folder === 'inbox' && !email.is_read ? 'border-l-[6px] border-l-black' : ''
            )}
          >
            <div className="flex justify-between items-center w-full">
              <span className="font-black text-sm truncate flex-1 flex items-center gap-1">
                <ShieldCheck size={14} className="text-green-600 flex-shrink-0" />
                {folder === 'sent' ? email.receiver_email : email.sender_email}
              </span>
              <span className="text-xs font-bold text-gray-500 flex-shrink-0 ml-2">
                {formatDate(email.created_at)}
              </span>
            </div>
            <h4 className="font-bold text-base truncate pr-2">{email.subject_encrypted}</h4>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              {folder === 'inbox' && !email.is_read ? '● Unread' : 'End-to-End Encrypted'}
            </p>
          </motion.button>
        ))}

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center font-bold text-gray-500"
          >
            No emails in {folder}.
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
