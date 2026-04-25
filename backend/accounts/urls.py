from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import NonceView, WalletLoginView, MeView, PublicKeyView

urlpatterns = [
    # Wallet-based auth (SIWE — Sign-In With Ethereum)
    path('auth/nonce/', NonceView.as_view(), name='nonce'),
    path('auth/wallet-login/', WalletLoginView.as_view(), name='wallet-login'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Public key lookup — by email or by wallet address
    path('users/public-key/<str:email>/', PublicKeyView.as_view(), name='public-key-by-email'),
    path('users/public-key/wallet/<str:address>/', PublicKeyView.as_view(), name='public-key-by-wallet'),
]
