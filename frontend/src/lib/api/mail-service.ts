/**
 * Mail Service — End-to-End Encrypted Email Flow
 * ================================================
 * Connects the crypto module with the backend API to provide
 * a seamless encrypted email experience.
 *
 * Sending:  plaintext → KEM encapsulate → AES encrypt → POST encrypted blobs
 * Receiving: fetch encrypted blobs → KEM decapsulate → AES decrypt → plaintext
 */

import { apiGet, apiPost } from './api-client';
import { kyberEncapsulate, kyberDecapsulate } from '../crypto/kyber-mock';
import { encryptMessage, decryptMessage } from '../crypto/encryption';
import { getPrivateKey } from '../crypto/key-manager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EncryptedEmail {
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

export interface DecryptedEmail {
    id: number;
    senderEmail: string;
    receiverEmail: string;
    subject: string;
    body: string;
    isRead: boolean;
    expiresAt: string | null;
    createdAt: string;
    // Keep encrypted versions for AI processing
    _encrypted: {
        subject_encrypted: string;
        body_encrypted: string;
        encrypted_key: string;
    };
}

export interface PublicKeyResponse {
    email: string;
    public_key: string;
}

// ─── Fetch Receiver's Public Key ────────────────────────────────────────────

/**
 * Get a user's public key for encrypting emails to them.
 */
export async function getReceiverPublicKey(email: string): Promise<string> {
    const data = await apiGet<PublicKeyResponse>(
        `/api/users/public-key/${encodeURIComponent(email)}/`
    );
    if (!data.public_key) {
        throw new Error(`User ${email} has no public key registered.`);
    }
    return data.public_key;
}

// ─── Send Encrypted Email ───────────────────────────────────────────────────

/**
 * Full end-to-end encrypted send flow:
 *   1. Fetch receiver's public key
 *   2. KEM Encapsulate → shared secret + encrypted key
 *   3. Encrypt subject and body with AES-256-GCM
 *   4. POST encrypted blobs to backend
 */
export async function sendEncryptedEmail(
    receiverEmail: string,
    subject: string,
    body: string,
    expiresAt?: string | null
): Promise<EncryptedEmail> {
    // Step 1: Get receiver's public key
    const receiverPubKey = await getReceiverPublicKey(receiverEmail);

    // Step 2: KEM Encapsulate
    const { ciphertext: encryptedKey, sharedSecret } =
        await kyberEncapsulate(receiverPubKey);

    // Step 3: Encrypt subject and body
    const subjectEncrypted = await encryptMessage(subject, sharedSecret);
    const bodyEncrypted = await encryptMessage(body, sharedSecret);

    // Step 4: Send to backend
    return apiPost<EncryptedEmail>('/api/mails/send/', {
        receiver_email: receiverEmail,
        subject_encrypted: subjectEncrypted,
        body_encrypted: bodyEncrypted,
        encrypted_key: encryptedKey,
        expires_at: expiresAt || null,
    });
}

// ─── Decrypt a Single Email ─────────────────────────────────────────────────

/**
 * Decrypt an encrypted email using the user's private key.
 */
export async function decryptEmail(
    email: EncryptedEmail
): Promise<DecryptedEmail> {
    const privateKeyB64 = await getPrivateKey();
    if (!privateKeyB64) {
        throw new Error('No private key found. Please register or import your keys.');
    }

    try {
        // KEM Decapsulate → shared secret
        const sharedSecret = await kyberDecapsulate(
            email.encrypted_key,
            privateKeyB64
        );

        // Decrypt subject and body
        const subject = await decryptMessage(email.subject_encrypted, sharedSecret);
        const body = await decryptMessage(email.body_encrypted, sharedSecret);

        return {
            id: email.id,
            senderEmail: email.sender_email,
            receiverEmail: email.receiver_email,
            subject,
            body,
            isRead: email.is_read,
            expiresAt: email.expires_at,
            createdAt: email.created_at,
            _encrypted: {
                subject_encrypted: email.subject_encrypted,
                body_encrypted: email.body_encrypted,
                encrypted_key: email.encrypted_key,
            },
        };
    } catch (error) {
        // If decryption fails (wrong key, corrupted data), return with error markers
        return {
            id: email.id,
            senderEmail: email.sender_email,
            receiverEmail: email.receiver_email,
            subject: '🔒 Unable to decrypt',
            body: 'This email could not be decrypted. You may not have the correct private key.',
            isRead: email.is_read,
            expiresAt: email.expires_at,
            createdAt: email.created_at,
            _encrypted: {
                subject_encrypted: email.subject_encrypted,
                body_encrypted: email.body_encrypted,
                encrypted_key: email.encrypted_key,
            },
        };
    }
}

// ─── Fetch & Decrypt Email Lists ────────────────────────────────────────────

/**
 * Get inbox emails (encrypted) from the backend.
 */
export async function getInboxRaw(): Promise<EncryptedEmail[]> {
    return apiGet<EncryptedEmail[]>('/api/mails/inbox/');
}

/**
 * Get sent emails (encrypted) from the backend.
 */
export async function getSentRaw(): Promise<EncryptedEmail[]> {
    return apiGet<EncryptedEmail[]>('/api/mails/sent/');
}

/**
 * Get inbox and decrypt all emails.
 */
export async function getInbox(): Promise<DecryptedEmail[]> {
    const encrypted = await getInboxRaw();
    return Promise.all(encrypted.map(decryptEmail));
}

/**
 * Get sent emails and decrypt all.
 */
export async function getSent(): Promise<DecryptedEmail[]> {
    const encrypted = await getSentRaw();
    return Promise.all(encrypted.map(decryptEmail));
}

/**
 * Get a single email by ID and decrypt it.
 */
export async function getEmailById(id: number): Promise<DecryptedEmail> {
    const encrypted = await apiGet<EncryptedEmail>(`/api/mails/${id}/`);
    return decryptEmail(encrypted);
}

// ─── Email Actions ──────────────────────────────────────────────────────────

/**
 * Mark an email as read.
 */
export async function markAsRead(
    id: number
): Promise<{ message: string; is_read: boolean }> {
    return apiPost<{ message: string; is_read: boolean }>(
        `/api/mails/${id}/read/`,
        {}
    );
}

/**
 * Delete an email.
 */
export async function deleteEmail(id: number): Promise<void> {
    const { apiDelete } = await import('./api-client');
    await apiDelete(`/api/mails/${id}/`);
}
