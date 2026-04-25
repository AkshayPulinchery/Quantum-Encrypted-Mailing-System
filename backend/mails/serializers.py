from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Email

User = get_user_model()


class SendEmailSerializer(serializers.Serializer):
    """Validates the payload when sending an encrypted email."""
    # CharField instead of EmailField — Django's validator rejects .eth TLDs
    # used by our wallet-identity scheme (0x...@cutemail.eth).
    receiver_email = serializers.CharField()
    subject_encrypted = serializers.CharField()
    body_encrypted = serializers.CharField()
    encrypted_key = serializers.CharField()
    expires_at = serializers.DateTimeField(required=False, allow_null=True, default=None)


class EmailSerializer(serializers.ModelSerializer):
    """Read-only representation of a stored email.  Returns encrypted blobs as-is."""
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    receiver_email = serializers.EmailField(source='receiver.email', read_only=True)

    class Meta:
        model = Email
        fields = [
            'id',
            'sender_email',
            'receiver_email',
            'subject_encrypted',
            'body_encrypted',
            'encrypted_key',
            'is_read',
            'expires_at',
            'created_at',
        ]
        read_only_fields = fields
