"""
Encryption Validators
=====================
Validates encryption-related data during API operations.
"""
import base64
import re


def validate_public_key(key_base64: str) -> tuple[bool, str]:
    """
    Validate a base64-encoded public key.
    Returns (is_valid, error_message).
    """
    if not key_base64 or not key_base64.strip():
        return False, "Public key cannot be empty."

    # Check valid base64
    try:
        decoded = base64.b64decode(key_base64)
    except Exception:
        return False, "Public key is not valid base64."

    # RSA-2048 SPKI key should be ~294 bytes
    if len(decoded) < 100:
        return False, "Public key is too short. Expected at least 100 bytes."

    if len(decoded) > 2000:
        return False, "Public key is too long. Expected at most 2000 bytes."

    return True, ""


def validate_encrypted_payload(payload: dict) -> tuple[bool, str]:
    """
    Validate that an encrypted email payload has the expected structure.
    Checks that encrypted fields are non-empty base64 strings.
    """
    required_fields = ['subject_encrypted', 'body_encrypted', 'encrypted_key']

    for field in required_fields:
        value = payload.get(field, '')
        if not value or not isinstance(value, str):
            return False, f"'{field}' is required and must be a non-empty string."

        # Check valid base64
        try:
            base64.b64decode(value)
        except Exception:
            return False, f"'{field}' is not valid base64."

    return True, ""
