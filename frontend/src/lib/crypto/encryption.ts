/**
 * Symmetric Encryption Layer
 * ===========================
 * AES-256-GCM encryption/decryption using the shared secret from KEM.
 * 
 * Format: [12-byte IV][ciphertext] → base64 encoded
 * The IV is randomly generated for each encryption and prepended to the blob.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function ab2b64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function b642ab(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

// ─── Encrypt ────────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext using AES-256-GCM with the shared secret.
 * Returns a base64-encoded blob: [12-byte IV | ciphertext]
 */
export async function encryptMessage(
    plaintext: string,
    sharedSecret: CryptoKey
): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a unique 12-byte IV for this message
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        data
    );

    // Combine IV + ciphertext into a single blob
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return ab2b64(combined.buffer);
}

// ─── Decrypt ────────────────────────────────────────────────────────────────

/**
 * Decrypt a base64-encoded blob: [12-byte IV | ciphertext]
 * Returns the original plaintext string.
 */
export async function decryptMessage(
    encryptedB64: string,
    sharedSecret: CryptoKey
): Promise<string> {
    const combined = new Uint8Array(b642ab(encryptedB64));

    // Extract IV (first 12 bytes) and ciphertext (rest)
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}
