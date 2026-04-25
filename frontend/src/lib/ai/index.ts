/**
 * AI Module — Barrel Export
 * ==========================
 * Secure AI processing for CuteMail.
 */

export { sanitizeForAI, restoreSanitized, type SanitizeResult } from './sanitizer';

export {
    summarizeEmail,
    summarizePlaintext,
    spamCheckEmail,
    spamCheckPlaintext,
    generateEmail,
    rewriteEmail,
    decryptEmailBody,
    type SummarizeResponse,
    type SpamCheckResponse,
    type GenerateEmailResponse,
    type RewriteResponse,
} from './ai-client';
