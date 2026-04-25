/**
 * Key Manager
 * ============
 * Manages the lifecycle of cryptographic keys using IndexedDB.
 * Private keys NEVER leave the browser — they are stored securely in IndexedDB.
 * Public keys are exported as base64 for API transport (registration, etc.).
 *
 * Storage layout (IndexedDB → database: "cutemail-keys", store: "keys"):
 *   - "privateKey" → base64-encoded PKCS8 private key
 *   - "publicKey"  → base64-encoded SPKI public key (local copy)
 */

import { kyberKeyGen, type KyberKeyPair } from './kyber-mock';

const DB_NAME = 'cutemail-keys';
const STORE_NAME = 'keys';
const DB_VERSION = 1;

// ─── IndexedDB Helpers ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbPut(key: string, value: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
    });
}

async function dbGet(key: string): Promise<string | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
    });
}

async function dbDelete(key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
    });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a new keypair and store it securely in IndexedDB.
 * Returns the public key (base64) for sending to the backend during registration.
 */
export async function generateAndStoreKeys(): Promise<string> {
    const keyPair: KyberKeyPair = await kyberKeyGen();

    // Store both keys in IndexedDB
    await dbPut('privateKey', keyPair.privateKey);
    await dbPut('publicKey', keyPair.publicKey);

    return keyPair.publicKey;
}

/**
 * Retrieve the private key from IndexedDB.
 * Returns null if no key exists (user needs to register/generate keys).
 */
export async function getPrivateKey(): Promise<string | null> {
    return dbGet('privateKey');
}

/**
 * Retrieve the locally stored public key from IndexedDB.
 */
export async function getPublicKey(): Promise<string | null> {
    return dbGet('publicKey');
}

/**
 * Check if keys exist in IndexedDB.
 */
export async function hasKeys(): Promise<boolean> {
    const pk = await dbGet('privateKey');
    return pk !== null;
}

/**
 * Clear all stored keys (logout / key rotation).
 */
export async function clearKeys(): Promise<void> {
    await dbDelete('privateKey');
    await dbDelete('publicKey');
}
