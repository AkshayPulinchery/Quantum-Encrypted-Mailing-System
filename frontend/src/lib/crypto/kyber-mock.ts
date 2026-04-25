/**
 * CRYSTALS-Kyber Mock Implementation
 * ====================================
 * Simulates post-quantum KEM (Key Encapsulation Mechanism) using
 * Web Crypto API (RSA-OAEP 2048-bit) as the underlying primitive.
 *
 * This mirrors the real Kyber flow:
 *   1. KeyGen  → generate asymmetric keypair
 *   2. Encaps  → sender wraps a random shared secret with receiver's public key
 *   3. Decaps  → receiver unwraps the shared secret with their private key
 *
 * The shared secret is then used as an AES-256-GCM key for symmetric encryption.
 * Can be swapped for a real CRYSTALS-Kyber WASM module later.
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

// ─── Key Generation ─────────────────────────────────────────────────────────

export interface KyberKeyPair {
    publicKey: string;   // base64-encoded SPKI
    privateKey: string;  // base64-encoded PKCS8
}

/**
 * Generate a mock CRYSTALS-Kyber keypair.
 * Uses RSA-OAEP 2048 under the hood (post-quantum placeholder).
 */
export async function kyberKeyGen(): Promise<KyberKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );

    const publicKeyRaw = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyRaw = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
        publicKey: ab2b64(publicKeyRaw),
        privateKey: ab2b64(privateKeyRaw),
    };
}

// ─── Key Import ─────────────────────────────────────────────────────────────

export async function importPublicKey(base64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'spki',
        b642ab(base64),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'pkcs8',
        b642ab(base64),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
    );
}

// ─── Encapsulation (Sender side) ────────────────────────────────────────────

export interface EncapsulationResult {
    ciphertext: string;    // base64 — encrypted shared secret (send this to backend)
    sharedSecret: CryptoKey; // AES-256-GCM key (use locally for message encryption)
}

/**
 * KEM Encapsulate: generates a random AES-256 key, encrypts it with the
 * receiver's public key, and returns both the ciphertext and the raw key.
 */
export async function kyberEncapsulate(
    receiverPublicKeyB64: string
): Promise<EncapsulationResult> {
    // 1. Generate a random 256-bit shared secret
    const rawSecret = crypto.getRandomValues(new Uint8Array(32));

    // 2. Import receiver's public key
    const publicKey = await importPublicKey(receiverPublicKeyB64);

    // 3. Wrap the shared secret with the public key
    const encryptedSecret = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        rawSecret
    );

    // 4. Import the raw secret as an AES-GCM CryptoKey
    const sharedSecret = await crypto.subtle.importKey(
        'raw',
        rawSecret,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return {
        ciphertext: ab2b64(encryptedSecret),
        sharedSecret,
    };
}

// ─── Decapsulation (Receiver side) ──────────────────────────────────────────

/**
 * KEM Decapsulate: unwraps the shared secret using the receiver's private key.
 */
export async function kyberDecapsulate(
    ciphertextB64: string,
    privateKeyB64: string
): Promise<CryptoKey> {
    const privateKey = await importPrivateKey(privateKeyB64);

    // Decrypt to get the raw 256-bit secret
    const rawSecret = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        b642ab(ciphertextB64)
    );

    // Import as AES-GCM key
    return crypto.subtle.importKey(
        'raw',
        rawSecret,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}
