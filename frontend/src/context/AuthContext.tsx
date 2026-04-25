'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { api, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;      // true while restoring session or running SIWE
  authError: string;       // set when SIWE signing fails or backend rejects
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [user, setUser]           = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Prevents the SIWE effect from firing twice on StrictMode double-mount
  const siweInFlight = useRef(false);

  // ── 1. On mount: try to restore an existing JWT session ──────────────────
  useEffect(() => {
    const token = localStorage.getItem('cutemail_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.auth.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('cutemail_token');
        localStorage.removeItem('cutemail_refresh');
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── 2. React to wallet connect / disconnect ───────────────────────────────
  useEffect(() => {
    // Wallet disconnected → clear session
    if (!isConnected) {
      if (user) {
        setUser(null);
        localStorage.removeItem('cutemail_token');
        localStorage.removeItem('cutemail_refresh');
      }
      siweInFlight.current = false;
      return;
    }

    // Wallet connected but we already have a valid user → nothing to do
    if (isConnected && user) return;

    // Still restoring from JWT → wait for that to finish (effect will re-run)
    if (isLoading) return;

    // Wallet connected, no user, not loading → run SIWE
    if (address && !siweInFlight.current) {
      siweInFlight.current = true;
      runSIWE(address);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isLoading]);

  async function runSIWE(walletAddress: string) {
    setAuthError('');
    try {
      // Step 1 — get a one-time nonce from the backend
      const { nonce } = await api.auth.getNonce(walletAddress);

      // Step 2 — build the human-readable message and ask the wallet to sign it
      const message = `Sign in to CuteMail\nNonce: ${nonce}\nWallet: ${walletAddress}`;
      const signature = await signMessageAsync({ message });

      // Step 3 — send proof to backend, receive JWT
      const result = await api.auth.walletLogin({ wallet_address: walletAddress, signature, message });

      localStorage.setItem('cutemail_token', result.tokens.access);
      localStorage.setItem('cutemail_refresh', result.tokens.refresh);
      setUser(result.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wallet authentication failed.';
      setAuthError(msg);
      // User rejected the signing prompt or backend returned an error — disconnect cleanly
      disconnect();
      siweInFlight.current = false;
    }
  }

  const logout = () => {
    localStorage.removeItem('cutemail_token');
    localStorage.removeItem('cutemail_refresh');
    setUser(null);
    siweInFlight.current = false;
    disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, authError, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
