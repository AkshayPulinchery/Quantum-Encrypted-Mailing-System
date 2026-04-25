/**
 * Crypto Module — Barrel Export
 * ==============================
 * Post-quantum encryption for CuteMail.
 *
 * Usage:
 *   import { generateAndStoreKeys, kyberEncapsulate, encryptMessage } from '@/lib/crypto';
 */

// KEM (Key Encapsulation Mechanism) — mock CRYSTALS-Kyber
export {
    kyberKeyGen,
    kyberEncapsulate,
    kyberDecapsulate,
    importPublicKey,
    importPrivateKey,
    type KyberKeyPair,
    type EncapsulationResult,
} from './kyber-mock';

// Symmetric encryption (AES-256-GCM)
export { encryptMessage, decryptMessage } from './encryption';

// Key lifecycle management (IndexedDB)
export {
    generateAndStoreKeys,
    getPrivateKey,
    getPublicKey,
    hasKeys,
    clearKeys,
} from './key-manager';
