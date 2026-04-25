/**
 * Auth Service — Registration & Login with Key Generation
 * =========================================================
 * Integrates the crypto key generation into the auth flow.
 *
 * Registration: generate keypair → store private key in IndexedDB → send public key to backend
 * Login: authenticate → store JWT tokens
 */

import { apiPost, setAuthTokens, clearAuthTokens } from './api-client';
import { generateAndStoreKeys, clearKeys } from '../crypto/key-manager';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    public_key: string;
    created_at: string;
}

interface RegisterResponse {
    message: string;
    user: UserProfile;
    tokens: {
        access: string;
        refresh: string;
    };
}

interface LoginResponse {
    access: string;
    refresh: string;
}

// ─── Register ───────────────────────────────────────────────────────────────

/**
 * Register a new user with automatic key generation:
 *   1. Generate CRYSTALS-Kyber (mock) keypair
 *   2. Store private key securely in IndexedDB
 *   3. Send public key + credentials to backend
 *   4. Store JWT tokens
 */
export async function register(
    username: string,
    email: string,
    password: string
): Promise<RegisterResponse> {
    // Step 1-2: Generate keypair and store in IndexedDB
    const publicKey = await generateAndStoreKeys();

    // Step 3: Register with backend
    const response = await apiPost<RegisterResponse>('/api/auth/register/', {
        username,
        email,
        password,
        public_key: publicKey,
    });

    // Step 4: Store JWT tokens
    setAuthTokens(response.tokens.access, response.tokens.refresh);

    return response;
}

// ─── Login ──────────────────────────────────────────────────────────────────

/**
 * Login with email and password.
 * Note: Private key must already exist in IndexedDB from registration.
 */
export async function login(
    email: string,
    password: string
): Promise<LoginResponse> {
    const response = await apiPost<LoginResponse>('/api/auth/login/', {
        email,
        password,
    });

    setAuthTokens(response.access, response.refresh);
    return response;
}

// ─── Logout ─────────────────────────────────────────────────────────────────

/**
 * Clear auth tokens. Keys in IndexedDB are preserved so the user
 * can log back in and still decrypt their emails.
 */
export function logout(): void {
    clearAuthTokens();
}

/**
 * Full account cleanup: clear tokens AND keys.
 * WARNING: This will make all previously received emails unreadable!
 */
export async function fullLogout(): Promise<void> {
    clearAuthTokens();
    await clearKeys();
}

// ─── Get Current User ───────────────────────────────────────────────────────

/**
 * Fetch the currently authenticated user's profile.
 */
export async function getCurrentUser(): Promise<UserProfile> {
    const { apiGet } = await import('./api-client');
    return apiGet<UserProfile>('/api/auth/me/');
}
