'use client';

import * as React from 'react';
import {
  getDefaultConfig,
  RainbowKitProvider,
  lightTheme
} from '@rainbow-me/rainbowkit';
import { 
  phantomWallet, 
  metaMaskWallet, 
  rainbowWallet, 
  walletConnectWallet 
} from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { http } from 'wagmi';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';
import { UserProvider } from '@/context/UserContext';
import { AuthProvider } from '@/context/AuthContext';
import { CustomRainbowAvatar } from '@/components/CustomRainbowAvatar';

// Only include mainnet — we only need it for wallet signing (SIWE).
// Using an explicit http() transport prevents wagmi from falling back to
// the free public eth.merkle.io RPC which rate-limits aggressively (429).
const config = getDefaultConfig({
  appName: 'CuteMail',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(
      // Optional: swap in a free Alchemy/Infura URL from your .env for production.
      // For local dev this still avoids the hammering problem.
      process.env.NEXT_PUBLIC_ETH_RPC_URL ?? 'https://cloudflare-eth.com'
    ),
  },
  // Disable automatic background polling — we only need on-demand calls for signing.
  pollingInterval: 0,
  ssr: true,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [phantomWallet, metaMaskWallet, rainbowWallet, walletConnectWallet],
    },
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't re-fetch in the background — prevents extra RPC calls on window focus
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserProvider>
            <RainbowKitProvider 
              avatar={CustomRainbowAvatar}
              theme={lightTheme({
                accentColor: '#000',
                accentColorForeground: '#FFF',
                borderRadius: 'none',
                fontStack: 'system',
                overlayBlur: 'small',
              })}
            >
              {children}
            </RainbowKitProvider>
          </UserProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
