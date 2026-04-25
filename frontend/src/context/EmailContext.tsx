'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { Contract, ethers } from 'ethers';

import { QuantumCrypto } from '@/lib/quantum_crypto';

declare const Fhevmjs: any;

const SEPOLIA_CHAIN_ID = 11155111;
const CONTRACT_ADDRESS = '0xCB45011ca6B8CDce01792CBB9B4c999479E94a0E';
const QUANTUM_SEED = "PLANCK_CONSTANT_6.626";

const DEMO_EMAILS: BlockchainEmail[] = [
  { id: 1, from: '0x742d35Cc6634C0532925a3b844Bc9e7525a806B3', to: '', subject: 'Welcome to CuteMail!', body: 'This is a demo email in our Web3 email app. Connect your wallet to send real encrypted emails on the blockchain!', threadId: 0, mailbox: 0, timestamp: Date.now() - 3600000, isQuantum: false },
  { id: 2, from: '0x742d35Cc6634C0532925a3b844Bc9e7525a806B3', to: '', subject: 'Quantum Security Test', body: 'This is a test of the new quantum-inspired encryption system.', threadId: 0, mailbox: 0, timestamp: Date.now() - 7200000, isQuantum: true },
];

function encodeEmail(email: BlockchainEmail): string {
  const signature = Math.random().toString(36).substr(2, 12);
  const dataToEncode = { ...email, signature, used: false };
  
  if (email.isQuantum) {
    dataToEncode.body = QuantumCrypto.encrypt(email.body, QUANTUM_SEED);
    dataToEncode.subject = `[QUANTUM] ${email.subject}`;
  }
  
  // Unicode-safe Base64 encoding
  const jsonStr = JSON.stringify(dataToEncode);
  return btoa(unescape(encodeURIComponent(jsonStr)));
}

function decodeEmail(code: string): { email: BlockchainEmail | null; signature: string | null; used: boolean } {
  try {
    // Unicode-safe Base64 decoding
    const jsonStr = decodeURIComponent(escape(atob(code)));
    const data = JSON.parse(jsonStr);
    
    if (data.isQuantum) {
      data.body = QuantumCrypto.decrypt(data.body, QUANTUM_SEED);
      data.subject = data.subject.replace('[QUANTUM] ', '');
    }
    return { email: data, signature: data.signature, used: data.used };
  } catch (err) {
    console.error('Decode Error:', err);
    return { email: null, signature: null, used: false };
  }
}

const USED_CODES_KEY = 'usedEmailCodes';

function getDemoMode(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('demoMode');
  return saved !== 'false';
}

function getUserId(): string {
  if (typeof window === 'undefined') return 'user_demo';
  const saved = localStorage.getItem('userId');
  if (saved) return saved;
  const newId = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('userId', newId);
  return newId;
}

const EMAIL_ABI = [
  'function sendMail(address to, string calldata subject, string calldata subjectProofs, string calldata body, string calldata bodyProofs) returns (uint256)',
  'function reply(uint256 threadId, string calldata subject, string calldata subjectProofs, string calldata body, string calldata bodyProofs)',
  'function move(uint256[] calldata mailIds, uint8 newBox)',
  'function inbox(address user) view returns (uint256[])',
  'function sent(address user) view returns (uint256[])',
  'function getMail(uint256 id) view returns (tuple(address from, address to, string subject, string body, uint256 threadId, uint8 mailbox, uint256 timestamp))',
  'function archive(address user) view returns (uint256[])',
  'function star(address user) view returns (uint256[])',
  'function spam(address user) view returns (uint256[])',
  'function trash(address user) view returns (uint256[])',
  'event MailSent(uint256 indexed mailId, address indexed from, address indexed to)',
];

export const BOXES = {
  INBOX: 0,
  SENT: 1,
  ARCHIVE: 2,
  STAR: 3,
  SPAM: 4,
  TRASH: 5,
  READ: 6,
} as const;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://10.253.181.154:8080';
let ws: WebSocket | null = null;

export interface BlockchainEmail {
  id: number;
  from: string;
  to: string;
  subject: string;
  body: string;
  threadId: number;
  mailbox: number;
  timestamp: number;
  isQuantum?: boolean;
  isDestructive?: boolean;
  isAnonymous?: boolean;
}

interface EmailContextType {
  emails: BlockchainEmail[];
  loading: boolean;
  error: string | null;
  sendEmail: (to: string, subject: string, body: string, isQuantum?: boolean, isDestructive?: boolean, isAnonymous?: boolean) => Promise<string | void>;
  reply: (threadId: number, subject: string, body: string) => Promise<void>;
  moveEmails: (mailIds: number[], box: number) => Promise<void>;
  refresh: () => Promise<void>;
  deleteEmail: (id: number) => void;
  importEmail: (code: string) => void;
  initialized: boolean;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

let fhevmInstance: any = null;

async function initFhevm(walletClient: any): Promise<any> {
  if (fhevmInstance) return fhevmInstance;
  
  if (typeof Fhevmjs === 'undefined') {
    console.warn('Fhevmjs not loaded, skipping FHE initialization');
    return null;
  }
  
  try {
    fhevmInstance = await Fhevmjs.create({
      chainId: SEPOLIA_CHAIN_ID,
      signer: walletClient,
    });
    return fhevmInstance;
  } catch (e) {
    console.error('FHE init failed:', e);
    return null;
  }
}

async function encryptToFhe(plaintext: string): Promise<{ data: string; proof: string }> {
  if (!fhevmInstance) {
    return { data: plaintext, proof: '' };
  }
  
  try {
    const encrypted = fhevmInstance.encrypt(plaintext);
    return {
      data: encrypted.ciphertext,
      proof: encrypted.proof,
    };
  } catch (e) {
    return { data: plaintext, proof: '' };
  }
}

function shortenAddress(address: string): string {
  if (!address) return '';
  if (address.includes('Anonymous')) return address;
  if (!address.startsWith('0x')) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function connectWebSocket(userId: string, onMessage: (email: BlockchainEmail) => void): WebSocket {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'register', userId }));
    }
  };
  
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'message') {
        onMessage({
          id: Date.now(),
          from: msg.from,
          to: userId,
          subject: msg.subject,
          body: msg.body,
          threadId: 0,
          mailbox: BOXES.INBOX,
          timestamp: msg.timestamp
        });
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  };
  
  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };
  
  return ws;
}

async function sendViaWebSocket(from: string, to: string, subject: string, body: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 5;
    
    const trySend = () => {
      attempts++;
      try {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          if (attempts < maxAttempts) {
            ws = connectWebSocket(from, () => {});
            setTimeout(trySend, 500);
          } else {
            reject(new Error('Could not connect to server'));
          }
          return;
        }
        
        ws.send(JSON.stringify({
          type: 'send',
          from,
          to,
          subject,
          body
        }));
        resolve(true);
      } catch (e) {
        if (attempts < maxAttempts) {
          setTimeout(trySend, 500);
        } else {
          reject(e);
        }
      }
    };
    
    setTimeout(trySend, 100);
  });
}

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [emails, setEmails] = useState<BlockchainEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const getContract = useCallback((signerOrProvider: any): Contract => {
    return new Contract(CONTRACT_ADDRESS, EMAIL_ABI, signerOrProvider);
  }, []);

  const fetchEmails = useCallback(async (walletClient: any, userAddress: string): Promise<BlockchainEmail[]> => {
    if (!walletClient || !userAddress) return [];
    
    try {
      const contract = getContract(walletClient);
      
      const [inboxIds, sentIds] = await Promise.all([
        contract.inbox(userAddress),
        contract.sent(userAddress),
      ]);

      const userAddressLower = userAddress.toLowerCase();
      
      const fetchMailById = async (id: any, boxType: number): Promise<BlockchainEmail | null> => {
        try {
          const mail = await contract.getMail(id);
          
          const isOutgoing = mail.to.toLowerCase() === userAddressLower;
          if (boxType === BOXES.SENT && !isOutgoing) return null;
          
          let subject = '[Encrypted]';
          let body = '[Encrypted]';
          
          if (fhevmInstance) {
            try {
              subject = fhevmInstance.decrypt(mail.subject, { from: userAddress });
              body = fhevmInstance.decrypt(mail.body, { from: userAddress });
            } catch (e) {
              console.log('Could not decrypt email:', id);
            }
          }

          return {
            id: Number(id),
            from: mail.from,
            to: mail.to,
            subject,
            body,
            threadId: Number(mail.threadId),
            mailbox: Number(mail.mailbox),
            timestamp: Number(mail.timestamp),
          };
        } catch (err) {
          console.error(`Error fetching mail ${id}:`, err);
          return null;
        }
      };

      const inboxEmails = await Promise.all(
        inboxIds.map((id: any) => fetchMailById(id, BOXES.INBOX))
      );
      
      const sentEmails = await Promise.all(
        sentIds.map((id: any) => fetchMailById(id, BOXES.SENT))
      );

      const allEmails: BlockchainEmail[] = [
        ...inboxEmails.filter(Boolean) as BlockchainEmail[],
        ...sentEmails.filter(Boolean) as BlockchainEmail[],
      ].sort((a, b) => b.timestamp - a.timestamp);

      return allEmails;
    } catch (err) {
      console.error('Error fetching emails:', err);
      return [];
    }
  }, [getContract]);

  const refresh = useCallback(async () => {
    if (!walletClient || !address) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (getDemoMode()) {
        // Only initialize with demo emails if the list is empty or matches initial state
        setEmails(prev => {
          if (prev.length > DEMO_EMAILS.length) return prev; // Keep current if we have additions
          return DEMO_EMAILS;
        });
        setInitialized(true);
        return;
      }

      try {
        await initFhevm(walletClient);
      } catch (e) {
        console.warn('FHE init skipped:', e);
      }

      const fetchedEmails = await fetchEmails(walletClient, address);
      setEmails(fetchedEmails);
      setInitialized(true);
    } catch (err: any) {
      console.error('Refresh error:', err);
      setError(err.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [walletClient, address, fetchEmails]);

  const deleteEmail = useCallback((id: number) => {
    setEmails(prev => prev.filter(e => e.id !== id));
  }, []);

  const sendEmail = useCallback(async (to: string, subject: string, body: string, isQuantum: boolean = false, isDestructive: boolean = false, isAnonymous: boolean = false) => {
    if (getDemoMode()) {
      const userId = getUserId();
      
      const mockEmail: BlockchainEmail = {
        id: Date.now(),
        from: isAnonymous ? 'Anonymous (via CuteMail)' : userId,
        to: to,
        subject: subject,
        body: body,
        threadId: 0,
        mailbox: BOXES.SENT,
        timestamp: Date.now(),
        isQuantum: isQuantum,
        isDestructive: isDestructive,
        isAnonymous: isAnonymous
      };
      setEmails(prev => [mockEmail, ...prev]);
      setLoading(false);
      return encodeEmail(mockEmail);
    }

    if (!walletClient || !address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      try {
        await initFhevm(walletClient);
      } catch (e) {
        console.warn('FHE init skipped');
      }

      const { data: encryptedSubject, proof: subjectProofs } = await encryptToFhe(subject);
      const { data: encryptedBody, proof: bodyProofs } = await encryptToFhe(body);

      const contract = getContract(walletClient);
      
      let toAddress = to;
      if (!to.endsWith('.eth') && !ethers.isAddress(to)) {
        throw new Error('Invalid recipient address');
      }

      const tx = await contract.sendMail(toAddress, encryptedSubject, subjectProofs, encryptedBody, bodyProofs);
      await tx.wait();
      
      await refresh();
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  }, [walletClient, address, getContract, refresh]);

  const reply = useCallback(async (threadId: number, subject: string, body: string) => {
    if (!walletClient || !address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await initFhevm(walletClient);

      const { data: encryptedSubject, proof: subjectProofs } = await encryptToFhe(subject);
      const { data: encryptedBody, proof: bodyProofs } = await encryptToFhe(body);

      const contract = getContract(walletClient);
      const tx = await contract.reply(threadId, encryptedSubject, subjectProofs, encryptedBody, bodyProofs);
      await tx.wait();
      
      await refresh();
    } catch (err: any) {
      console.error('Reply error:', err);
      setError(err.message || 'Failed to reply');
    } finally {
      setLoading(false);
    }
  }, [walletClient, address, getContract, refresh]);

  const moveEmails = useCallback(async (mailIds: number[], box: number) => {
    if (!walletClient || !address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const contract = getContract(walletClient);
      const tx = await contract.move(mailIds, box);
      await tx.wait();
      
      await refresh();
    } catch (err: any) {
      console.error('Move error:', err);
      setError(err.message || 'Failed to move emails');
    } finally {
      setLoading(false);
    }
  }, [walletClient, address, getContract, refresh]);

  const importEmail = useCallback((code: string) => {
    const { email, signature } = decodeEmail(code);
    
    if (!email || !signature) {
      alert('Invalid email code');
      return;
    }
    
    const usedCodes = JSON.parse(localStorage.getItem(USED_CODES_KEY) || '[]');
    if (usedCodes.includes(signature)) {
      alert('⚠️ This email has already been used!\nSelf-destructed emails can only be imported once.');
      return;
    }
    
    const importedEmail: BlockchainEmail = {
      ...email,
      id: Number(email.id), // Ensure it's a number for .find()
      mailbox: BOXES.INBOX // Force to inbox so it shows up in main view
    };
    
    usedCodes.push(signature);
    localStorage.setItem(USED_CODES_KEY, JSON.stringify(usedCodes));
    
    setEmails(prev => {
      // Check if already exists to prevent duplicates
      if (prev.find(e => e.id === importedEmail.id)) return prev;
      return [importedEmail, ...prev];
    });
    
    alert(`📬 Email received!\n⚠️ This email is now self-destructed - once you close it, it cannot be re-imported.`);
  }, []);

  useEffect(() => {
    if (getDemoMode()) {
      refresh();
      return;
    }
    
    if (isConnected && walletClient && address) {
      initFhevm(walletClient).then(() => {
        refresh();
      }).catch(console.error);
    }
  }, [isConnected, walletClient, address, refresh]);

  return (
    <EmailContext.Provider value={{ 
      emails, 
      loading, 
      error, 
      sendEmail, 
      reply, 
      moveEmails, 
      refresh,
      deleteEmail,
      importEmail,
      initialized 
    }}>
      {children}
    </EmailContext.Provider>
  );
}

export function useEmails() {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmails must be used within an EmailProvider');
  }
  return context;
}

export { shortenAddress, formatTimestamp };