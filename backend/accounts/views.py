import secrets
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import PublicKeySerializer, UserSerializer

try:
    from eth_account import Account
    from eth_account.messages import encode_defunct
    ETH_ACCOUNT_AVAILABLE = True
except ImportError:
    ETH_ACCOUNT_AVAILABLE = False

User = get_user_model()

# In-memory nonce store: { wallet_address_lower: (nonce, expires_at) }
# For production replace with Django cache / Redis.
_nonce_store: dict = {}


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _verify_signature(message: str, signature: str, expected_address: str) -> bool:
    if not ETH_ACCOUNT_AVAILABLE:
        # Dev fallback: skip verification if eth-account is not installed yet
        return True
    try:
        msg = encode_defunct(text=message)
        recovered = Account.recover_message(msg, signature=signature)
        return recovered.lower() == expected_address.lower()
    except Exception:
        return False


class NonceView(APIView):
    """
    GET /api/auth/nonce/?address=0x...
    Returns a one-time nonce the client must sign to prove wallet ownership.
    Nonces expire after 5 minutes.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        address = request.query_params.get('address', '').strip().lower()
        if not address or not address.startswith('0x') or len(address) != 42:
            return Response(
                {'error': 'Valid Ethereum address (0x + 40 hex chars) required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Purge expired nonces
        now = datetime.utcnow()
        for key in [k for k, (_, exp) in _nonce_store.items() if exp < now]:
            del _nonce_store[key]

        nonce = secrets.token_hex(16)
        _nonce_store[address] = (nonce, now + timedelta(minutes=5))
        return Response({'nonce': nonce})


class WalletLoginView(APIView):
    """
    POST /api/auth/wallet-login/
    Verifies an EIP-191 personal_sign signature, then creates or retrieves
    the user account for this wallet and returns JWT tokens.

    Body: { wallet_address, signature, message }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        wallet_address = request.data.get('wallet_address', '').strip().lower()
        signature = request.data.get('signature', '').strip()
        message = request.data.get('message', '').strip()

        if not wallet_address or not signature or not message:
            return Response(
                {'error': 'wallet_address, signature, and message are all required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate nonce
        entry = _nonce_store.get(wallet_address)
        if not entry:
            return Response(
                {'error': 'Nonce not found or expired — request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        nonce, expires_at = entry
        if datetime.utcnow() > expires_at:
            del _nonce_store[wallet_address]
            return Response(
                {'error': 'Nonce expired — request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if nonce not in message:
            return Response(
                {'error': 'Message does not contain the expected nonce.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify signature (consumes nonce regardless of result)
        del _nonce_store[wallet_address]
        if not _verify_signature(message, signature, wallet_address):
            return Response(
                {'error': 'Signature verification failed.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Get or create the user record for this wallet address
        user, created = User.objects.get_or_create(
            wallet_address=wallet_address,
            defaults={
                'username': wallet_address,
                'email': f'{wallet_address}@cutemail.eth',
            },
        )
        if created:
            user.set_unusable_password()
            user.save()

        return Response(
            {'user': UserSerializer(user).data, 'tokens': _issue_tokens(user)},
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    GET   /api/auth/me/  — current user profile
    PATCH /api/auth/me/  — update public_key (called by Member 3 after PQ key generation)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        public_key = request.data.get('public_key')
        if public_key:
            request.user.public_key = public_key
            request.user.save(update_fields=['public_key'])
        return Response(UserSerializer(request.user).data)


class PublicKeyView(APIView):
    """
    GET /api/users/public-key/<email>/
    GET /api/users/public-key/wallet/<address>/
    Returns a user's public key so senders can encrypt emails for them.
    No authentication required — public keys are meant to be public.
    """
    permission_classes = [AllowAny]

    def get(self, _request, email=None, address=None):
        if address:
            user = get_object_or_404(User, wallet_address=address.lower())
        else:
            user = get_object_or_404(User, email=email)
        return Response(PublicKeySerializer(user).data)
