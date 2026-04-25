/**
 * API Module — Barrel Export
 * ===========================
 * Integration layer connecting Frontend ↔ Encryption ↔ Backend ↔ AI.
 */

// Base API client
export {
    apiGet,
    apiPost,
    apiPatch,
    apiDelete,
    setAuthTokens,
    getAccessToken,
    getRefreshToken,
    clearAuthTokens,
} from './api-client';

// Mail service (end-to-end encrypted email flow)
export {
    sendEncryptedEmail,
    decryptEmail,
    getInbox,
    getSent,
    getInboxRaw,
    getSentRaw,
    getEmailById,
    getReceiverPublicKey,
    markAsRead,
    deleteEmail,
    type EncryptedEmail,
    type DecryptedEmail,
    type PublicKeyResponse,
} from './mail-service';

// Auth service (registration + key generation)
export {
    register,
    login,
    logout,
    fullLogout,
    getCurrentUser,
    type UserProfile,
} from './auth-service';
