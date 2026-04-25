const BASE_URL = 'http://127.0.0.1:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cutemail_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || err.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  wallet_address: string;
  public_key: string;
  created_at: string;
}

export interface EmailMessage {
  id: number;
  sender_email: string;
  receiver_email: string;
  subject_encrypted: string;
  body_encrypted: string;
  encrypted_key: string;
  is_read: boolean;
  expires_at: string | null;
  created_at: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    // Step 1 of SIWE: get a one-time nonce to sign
    getNonce: (address: string) =>
      request<{ nonce: string }>(`/api/auth/nonce/?address=${encodeURIComponent(address)}`),

    // Step 2 of SIWE: prove wallet ownership, receive JWT
    walletLogin: (data: { wallet_address: string; signature: string; message: string }) =>
      request<{ user: User; tokens: { access: string; refresh: string } }>(
        '/api/auth/wallet-login/', { method: 'POST', body: JSON.stringify(data) }
      ),

    me: () => request<User>('/api/auth/me/'),

    setPublicKey: (public_key: string) =>
      request<User>('/api/auth/me/', { method: 'PATCH', body: JSON.stringify({ public_key }) }),

    refresh: (refresh: string) =>
      request<{ access: string }>(
        '/api/auth/token/refresh/', { method: 'POST', body: JSON.stringify({ refresh }) }
      ),
  },

  users: {
    getPublicKeyByEmail: (email: string) =>
      request<{ email: string; wallet_address: string; public_key: string }>(
        `/api/users/public-key/${encodeURIComponent(email)}/`
      ),
    getPublicKeyByWallet: (address: string) =>
      request<{ email: string; wallet_address: string; public_key: string }>(
        `/api/users/public-key/wallet/${encodeURIComponent(address)}/`
      ),
  },

  mails: {
    send: (data: {
      receiver_email: string;
      subject_encrypted: string;
      body_encrypted: string;
      encrypted_key: string;
      expires_at?: string | null;
    }) => request<EmailMessage>('/api/mails/send/', { method: 'POST', body: JSON.stringify(data) }),

    inbox: () => request<EmailMessage[]>('/api/mails/inbox/'),
    sent:  () => request<EmailMessage[]>('/api/mails/sent/'),
    get:   (id: number) => request<EmailMessage>(`/api/mails/${id}/`),
    delete: (id: number) => request<void>(`/api/mails/${id}/`, { method: 'DELETE' }),
    markRead: (id: number) =>
      request<{ message: string; is_read: boolean }>(`/api/mails/${id}/read/`, { method: 'PATCH' }),
  },

  ai: {
    generateEmail: (prompt: string, tone = 'professional') =>
      request<{ subject: string; body: string }>(
        '/api/ai/generate-email/', { method: 'POST', body: JSON.stringify({ prompt, tone }) }
      ),
    rewrite: (text: string, tone = 'professional') =>
      request<{ rewritten: string }>(
        '/api/ai/rewrite/', { method: 'POST', body: JSON.stringify({ text, tone }) }
      ),
    summarize: (text: string) =>
      request<{ summary: string }>(
        '/api/ai/summarize/', { method: 'POST', body: JSON.stringify({ text }) }
      ),
    spamCheck: (text: string) =>
      request<{ is_spam: boolean; confidence: number; reason: string }>(
        '/api/ai/spam-check/', { method: 'POST', body: JSON.stringify({ text }) }
      ),
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now  = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Normalise a raw wallet address into the backend email format used for sends. */
export function walletToEmail(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('0x') && !trimmed.includes('@')) {
    return `${trimmed.toLowerCase()}@cutemail.eth`;
  }
  return trimmed;
}
