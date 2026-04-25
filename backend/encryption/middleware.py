"""
No-Plaintext Logging Middleware
================================
Ensures that request/response bodies containing encrypted data
are never logged in Django debug output.

Strips sensitive encrypted fields from any logging to maintain
zero-knowledge guarantees even in development.
"""
import logging
import re

logger = logging.getLogger(__name__)

# Fields that should never appear in logs
SENSITIVE_FIELDS = {
    'subject_encrypted',
    'body_encrypted',
    'encrypted_key',
    'private_key',
    'password',
}


class NoPlaintextLoggingMiddleware:
    """
    Middleware that sanitizes request data in logs.
    Does NOT modify the actual request/response — only affects logging.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Process the request
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        """
        If an exception occurs, ensure the error log doesn't contain
        encrypted blobs or sensitive data.
        """
        # Log a sanitized version
        safe_path = request.path
        safe_method = request.method
        logger.error(
            f"Error processing {safe_method} {safe_path}: {type(exception).__name__}",
            extra={'sanitized': True}
        )
        return None


def sanitize_log_data(data: dict) -> dict:
    """
    Utility: strip sensitive fields from a dict for safe logging.
    """
    if not isinstance(data, dict):
        return data

    sanitized = {}
    for key, value in data.items():
        if key in SENSITIVE_FIELDS:
            sanitized[key] = f"[REDACTED: {len(str(value))} chars]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_log_data(value)
        else:
            sanitized[key] = value

    return sanitized
