from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Safe user representation — no password, no private key."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'wallet_address', 'public_key', 'created_at']
        read_only_fields = fields


class PublicKeySerializer(serializers.ModelSerializer):
    """Only exposes public key — used by senders to encrypt outgoing emails."""

    class Meta:
        model = User
        fields = ['email', 'wallet_address', 'public_key']
        read_only_fields = fields
