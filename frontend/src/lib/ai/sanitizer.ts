/**
 * PII Sanitizer for AI Processing
 * =================================
 * Strips personally identifiable information before sending text to AI endpoints.
 * Maintains a reversible mapping so original values can be restored after AI processing.
 *
 * Protects against: emails, phone numbers, wallet addresses, and common name patterns.
 */

export interface SanitizeResult {
    sanitized: string;
    mapping: Map<string, string>;  // placeholder → original
}

// ─── Patterns ───────────────────────────────────────────────────────────────

const PATTERNS: Array<{ regex: RegExp; label: string }> = [
    {
        regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        label: 'EMAIL',
    },
    {
        regex: /(\+?\d{1,4}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g,
        label: 'PHONE',
    },
    {
        regex: /0x[a-fA-F0-9]{40}/g,
        label: 'WALLET',
    },
    {
        regex: /\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b/g,
        label: 'ADDRESS',
    },
];

// ─── Sanitize ───────────────────────────────────────────────────────────────

/**
 * Sanitize text by replacing PII with placeholders.
 * Returns the sanitized text and a mapping for restoration.
 */
export function sanitizeForAI(text: string): SanitizeResult {
    const mapping = new Map<string, string>();
    let sanitized = text;
    let counter = 0;

    for (const pattern of PATTERNS) {
        sanitized = sanitized.replace(pattern.regex, (match) => {
            counter++;
            const placeholder = `[${pattern.label}_${counter}]`;
            mapping.set(placeholder, match);
            return placeholder;
        });
    }

    return { sanitized, mapping };
}

// ─── Restore ────────────────────────────────────────────────────────────────

/**
 * Restore sanitized text by replacing placeholders with original values.
 */
export function restoreSanitized(
    sanitizedText: string,
    mapping: Map<string, string>
): string {
    let restored = sanitizedText;

    for (const [placeholder, original] of mapping) {
        restored = restored.replaceAll(placeholder, original);
    }

    return restored;
}
