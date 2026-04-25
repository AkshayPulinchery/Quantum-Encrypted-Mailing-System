'use client';

import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, RefreshCw, Search, X, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { api, EmailMessage, formatDate } from '@/lib/api';

export type { EmailMessage };

const CATEGORY_STYLES: Record<string, string> = {
  Important:  'bg-[var(--color-retro-pink)]',
  Social:     'bg-[var(--color-retro-blue)]',
  Promotions: 'bg-[var(--color-retro-yellow)]',
  Updates:    'bg-[var(--color-retro-green)]',
};

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
  const [activeTab, setActiveTab]   = useState<'All' | 'Unread'>('All');
  const [emails, setEmails]         = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState('');

  // Category badges — loaded lazily in background after list arrives
  const [categories, setCategories] = useState<Record<number, string>>({});

  // Semantic search
  const [searchQuery, setSearchQuery]   = useState('');
  const [isSearching, setIsSearching]   = useState(false);
  const [relevanceMap, setRelevanceMap] = useState<Record<number, number>>({});
  const [searchActive, setSearchActive] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setCategories({});
    setSearchActive(false);
    setSearchQuery('');
    setRelevanceMap({});
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

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  // Background categorization — batch of 3 to avoid server overload
  useEffect(() => {
    if (emails.length === 0) return;
    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < emails.length; i += 3) {
        if (cancelled) break;
        const batch = emails.slice(i, i + 3);
        await Promise.all(batch.map(async (email) => {
          if (cancelled) return;
          try {
            const snippet = `${email.subject_encrypted} ${email.body_encrypted.slice(0, 200)}`;
            const { category } = await api.ai.categorize(snippet);
            if (!cancelled) {
              setCategories(prev => ({ ...prev, [email.id]: category }));
            }
          } catch { /* silently skip */ }
        }));
      }
    };

    run();
    return () => { cancelled = true; };
  }, [emails]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchActive(true);
    try {
      const results = await Promise.all(
        emails.map(async (email) => {
          const snippet = `${email.subject_encrypted} ${email.body_encrypted.slice(0, 300)}`;
          try {
            const { relevance } = await api.ai.semanticSearch(q, snippet);
            return { id: email.id, relevance };
          } catch {
            return { id: email.id, relevance: 0 };
          }
        })
      );
      const map: Record<number, number> = {};
      results.forEach(r => { map[r.id] = r.relevance; });
      setRelevanceMap(map);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchActive(false);
    setRelevanceMap({});
    searchRef.current?.focus();
  };

  // Build the list to display
  const baseFiltered = emails.filter((e) => {
    if (activeTab === 'Unread' && folder === 'inbox') return !e.is_read;
    return true;
  });

  const displayEmails = searchActive
    ? [...baseFiltered]
        .filter(e => (relevanceMap[e.id] ?? 0) > 0.1)
        .sort((a, b) => (relevanceMap[b.id] ?? 0) - (relevanceMap[a.id] ?? 0))
    : baseFiltered;

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

      {/* Semantic search bar */}
      <div className="p-2 border-b-[4px] border-black bg-[var(--color-retro-bg)] flex gap-2">
        <div className="flex-1 flex items-center gap-2 border-[3px] border-black bg-white px-3 py-1 shadow-[2px_2px_0_0_black]">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            ref={searchRef}
            className="flex-1 outline-none font-bold bg-transparent text-sm placeholder-gray-300"
            placeholder="AI semantic search…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          {searchQuery && (
            <button onClick={clearSearch} className="text-gray-400 hover:text-black">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="bg-[var(--color-retro-yellow)] px-3 py-1 font-black text-xs uppercase border-[3px] border-black shadow-[2px_2px_0_0_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 flex items-center gap-1"
        >
          {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          {isSearching ? '' : 'Go'}
        </button>
      </div>

      {/* Tabs — hidden while search results are shown */}
      {!searchActive && folder === 'inbox' && (
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

      {/* Search results header */}
      {searchActive && (
        <div className="flex items-center justify-between px-3 py-2 border-b-[4px] border-black bg-[var(--color-retro-blue)] font-black uppercase text-sm">
          <span>{displayEmails.length} result{displayEmails.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;</span>
          <button onClick={clearSearch} className="flex items-center gap-1 hover:underline text-xs">
            <X size={13} /> Clear
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="overflow-y-auto flex-1 p-2 flex flex-col gap-2 bg-[var(--color-retro-bg)]"
      >
        {displayEmails.map((email, idx) => {
          const category = categories[email.id];
          const relevance = searchActive ? relevanceMap[email.id] ?? 0 : null;

          return (
            <motion.button
              key={email.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
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

              <div className="flex items-center justify-between w-full mt-0.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {folder === 'inbox' && !email.is_read ? '● Unread' : 'End-to-End Encrypted'}
                </p>
                <div className="flex items-center gap-1.5">
                  {/* Relevance score in search mode */}
                  {relevance !== null && (
                    <span className={cn(
                      'text-[10px] font-black px-1.5 py-0.5 border-[2px] border-black',
                      relevance >= 0.6 ? 'bg-[var(--color-retro-green)]' :
                      relevance >= 0.35 ? 'bg-[var(--color-retro-yellow)]' : 'bg-gray-200'
                    )}>
                      {Math.round(relevance * 100)}%
                    </span>
                  )}
                  {/* Category badge */}
                  {category ? (
                    <span className={cn(
                      'text-[10px] font-black px-1.5 py-0.5 border-[2px] border-black',
                      CATEGORY_STYLES[category] ?? 'bg-gray-200'
                    )}>
                      {category}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-300 animate-pulse">…</span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}

        {displayEmails.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center font-bold text-gray-500"
          >
            {searchActive
              ? 'No matching emails found.'
              : `No emails in ${folder}.`}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
