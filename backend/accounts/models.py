from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model for Web3-native authentication.
    Identity is the Ethereum wallet address — no password login.
    Public key is for post-quantum encryption (separate from the wallet key).
    NEVER store or accept a private key here.
    """
    # Ethereum wallet address (checksummed or lowercase, stored lowercase)
    # Unique identity — replaces email/password auth
    wallet_address = models.CharField(
        max_length=42,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )

    # Auto-derived email: {wallet_address}@cutemail.eth — kept for internal FK use
    email = models.EmailField(unique=True)

    # Post-quantum public key submitted by the frontend after key generation.
    # Used by senders to encrypt emails for this user.
    public_key = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.wallet_address or self.email
