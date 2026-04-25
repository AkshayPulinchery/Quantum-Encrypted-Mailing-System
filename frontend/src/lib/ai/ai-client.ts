/**
 * AI Client — Secure AI Processing Layer
 * ========================================
 * Typed API client for all AI endpoints.
 *
 * Key privacy guarantees:
 *   1. Email is decrypted CLIENT-SIDE before AI processing
 *   2. PII is sanitized BEFORE sending to the backend AI
 *   3. Results are restored with original PII after AI response
 *   4. No plaintext is ever stored — processed in memory only
 *
 * Usage:
 *   import { summarizeEmail, spamCheckEmail, generateEmail, rewriteEmail } from '@/lib/ai';
 */

import { sanitizeForAI, restoreSanitized } from './sanitizer';
import { kyberDecapsulate } from '../crypto/kyber-mock';
import { decryptMessage } from '../crypto/encryption';
import { getPrivateKey } from '../crypto/key-manager';

// ─── Config ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function getAuthHeaders(): Record<string, string> {
    const token =
        typeof window !== 'undefined'
            ? localStorage.getItem('cutemail_access_token')
            : null;

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `API error ${res.status}`);
    }

    return res.json();
}

// ─── Decrypt Helper ─────────────────────────────────────────────────────────

/**
 * Decrypt an encrypted email's body using the user's private key.
 * This is the critical step that happens CLIENT-SIDE only.
 */
export async function decryptEmailBody(
    bodyEncrypted: string,
    encryptedKey: string
): Promise<string> {
    const privateKeyB64 = await getPrivateKey();
    if (!privateKeyB64) {
        throw new Error('No private key found. Please register or import your keys.');
    }

    // KEM Decapsulate → shared secret
    const sharedSecret = await kyberDecapsulate(encryptedKey, privateKeyB64);

    // Decrypt the body
    return decryptMessage(bodyEncrypted, sharedSecret);
}

// ─── AI Endpoints ───────────────────────────────────────────────────────────

export interface SummarizeResponse {
    summary: string;
}

/**
 * Summarize an encrypted email:
 *   1. Decrypt body client-side
 *   2. Sanitize PII
 *   3. Send only the sanitized text to /api/ai/summarize/
 *   4. Return the summary
 */
export async function summarizeEmail(
    bodyEncrypted: string,
    encryptedKey: string
): Promise<SummarizeResponse> {
    // Step 1: Decrypt locally
    const plaintext = await decryptEmailBody(bodyEncrypted, encryptedKey);

    // Step 2: Sanitize PII
    const { sanitized } = sanitizeForAI(plaintext);

    // Step 3: Send sanitized text to AI
    return apiPost<SummarizeResponse>('/api/ai/summarize/', { text: sanitized });
}

/**
 * Summarize already-decrypted text (for use when text is already available).
 */
export async function summarizePlaintext(text: string): Promise<SummarizeResponse> {
    const { sanitized } = sanitizeForAI(text);
    return apiPost<SummarizeResponse>('/api/ai/summarize/', { text: sanitized });
}

export interface SpamCheckResponse {
    is_spam: boolean;
    confidence: number;
    reason: string;
}

/**
 * Check an encrypted email for spam:
 *   1. Decrypt body client-side
 *   2. Sanitize PII
 *   3. Send to /api/ai/spam-check/
 *   4. Return spam analysis
 */
export async function spamCheckEmail(
    bodyEncrypted: string,
    encryptedKey: string
): Promise<SpamCheckResponse> {
    const plaintext = await decryptEmailBody(bodyEncrypted, encryptedKey);
    const { sanitized } = sanitizeForAI(plaintext);
    return apiPost<SpamCheckResponse>('/api/ai/spam-check/', { text: sanitized });
}

/**
 * Spam-check already-decrypted text.
 */
export async function spamCheckPlaintext(text: string): Promise<SpamCheckResponse> {
    const { sanitized } = sanitizeForAI(text);
    return apiPost<SpamCheckResponse>('/api/ai/spam-check/', { text: sanitized });
}

export interface GenerateEmailResponse {
    subject: string;
    body: string;
}

/**
 * Generate an email using AI.
 * No decryption needed — user provides plaintext prompt.
 */
export async function generateEmail(
    prompt: string,
    tone: string = 'professional'
): Promise<GenerateEmailResponse> {
    return apiPost<GenerateEmailResponse>('/api/ai/generate-email/', { prompt, tone });
}

export interface RewriteResponse {
    rewritten: string;
}

/**
 * Rewrite text in a different tone:
 *   1. Sanitize PII from the input text
 *   2. Send to /api/ai/rewrite/
 *   3. Restore PII in the result
 */
export async function rewriteEmail(
    text: string,
    tone: string = 'professional'
): Promise<RewriteResponse> {
    const { sanitized, mapping } = sanitizeForAI(text);
    const result = await apiPost<RewriteResponse>('/api/ai/rewrite/', {
        text: sanitized,
        tone,
    });

    // Restore PII in the rewritten text
    return {
        rewritten: restoreSanitized(result.rewritten, mapping),
    };
}
