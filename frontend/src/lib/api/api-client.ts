/**
 * API Client — Base HTTP Client
 * ===============================
 * Configured fetch wrapper for the Django backend.
 * Handles auth tokens, error handling, and base URL config.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ─── Token Management ──────────────────────────────────────────────────────

export function setAuthTokens(access: string, refresh: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cutemail_access_token', access);
    localStorage.setItem('cutemail_refresh_token', refresh);
}

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cutemail_access_token');
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cutemail_refresh_token');
}

export function clearAuthTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('cutemail_access_token');
    localStorage.removeItem('cutemail_refresh_token');
}

// ─── Fetch Wrapper ──────────────────────────────────────────────────────────

interface ApiError {
    error: string;
    status: number;
}

function authHeaders(): Record<string, string> {
    const token = getAccessToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 */
async function refreshAccessToken(): Promise<boolean> {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    try {
        const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        if (data.access) {
            localStorage.setItem('cutemail_access_token', data.access);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Generic fetch wrapper with auto-retry on 401 (token refresh).
 */
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    let res = await fetch(url, {
        ...options,
        headers: { ...authHeaders(), ...options.headers },
    });

    // If 401, try refreshing the token and retry once
    if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            res = await fetch(url, {
                ...options,
                headers: { ...authHeaders(), ...options.headers },
            });
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        const apiError: ApiError = {
            error: error.error || error.detail || `API error ${res.status}`,
            status: res.status,
        };
        throw apiError;
    }

    // Handle 204 No Content
    if (res.status === 204) return {} as T;

    return res.json();
}

// ─── Convenience Methods ────────────────────────────────────────────────────

export async function apiGet<T>(endpoint: string): Promise<T> {
    return apiFetch<T>(endpoint, { method: 'GET' });
}

export async function apiPost<T>(
    endpoint: string,
    body: Record<string, unknown>
): Promise<T> {
    return apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function apiPatch<T>(
    endpoint: string,
    body?: Record<string, unknown>
): Promise<T> {
    return apiFetch<T>(endpoint, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
    });
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
    return apiFetch<T>(endpoint, { method: 'DELETE' });
}
