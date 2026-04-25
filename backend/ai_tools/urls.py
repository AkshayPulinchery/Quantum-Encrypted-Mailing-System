from django.urls import path

from .views import (
    GenerateEmailView,
    RewriteEmailView,
    FixGrammarView,
    SummarizeEmailView,
    PhishingCheckView,
    SpamCheckView,
    CategorizeEmailView,
    SemanticRelevanceView,
    EmailChatView,
)

urlpatterns = [
    # 1. Email Writing Assistant
    path('generate-email/',     GenerateEmailView.as_view(),     name='generate-email'),

    # 2. Tone Rewriting
    path('rewrite/',            RewriteEmailView.as_view(),      name='rewrite-email'),

    # 3. Grammar Fix
    path('fix-grammar/',        FixGrammarView.as_view(),        name='fix-grammar'),

    # 4. Summarization
    path('summarize/',          SummarizeEmailView.as_view(),    name='summarize-email'),

    # 5a. Phishing Detection (full response with risk_level)
    path('phishing-check/',     PhishingCheckView.as_view(),     name='phishing-check'),

    # 5b. Spam Check (frontend-facing alias — returns is_spam/confidence/reason)
    path('spam-check/',         SpamCheckView.as_view(),         name='spam-check'),

    # 6. Smart Inbox Categorization
    path('categorize/',         CategorizeEmailView.as_view(),   name='categorize-email'),

    # 7. Semantic Search Support
    path('semantic-relevance/', SemanticRelevanceView.as_view(), name='semantic-relevance'),

    # 8. Email Chat Mode
    path('chat/',               EmailChatView.as_view(),          name='email-chat'),
]
