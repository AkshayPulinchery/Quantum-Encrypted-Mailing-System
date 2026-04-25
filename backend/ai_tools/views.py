from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .services import (
    generate_email,
    rewrite_email,
    fix_grammar,
    summarize_email,
    phishing_check,
    spam_check,
    categorize_email,
    semantic_relevance,
    email_chat,
)


def _provider(request) -> str:
    """Extract and validate provider from request data."""
    p = request.data.get('provider', 'openai').strip().lower()
    return p if p in ('openai', 'qwen') else 'openai'


class GenerateEmailView(APIView):
    """
    POST /api/ai/generate-email/
    Body: { "prompt": "...", "tone": "professional", "provider": "openai|qwen" }
    Returns: { "subject": "...", "body": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        prompt = request.data.get('prompt', '').strip()
        tone   = request.data.get('tone', 'professional').strip()
        if not prompt:
            return Response({'error': '"prompt" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(generate_email(prompt, tone, _provider(request)))


class RewriteEmailView(APIView):
    """
    POST /api/ai/rewrite/
    Body: { "text": "...", "tone": "professional", "provider": "openai|qwen" }
    Returns: { "rewritten": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        tone = request.data.get('tone', 'professional').strip()
        if not text:
            return Response({'error': '"text" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(rewrite_email(text, tone, _provider(request)))


class FixGrammarView(APIView):
    """
    POST /api/ai/fix-grammar/
    Body: { "text": "...", "provider": "openai|qwen" }
    Returns: { "corrected": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': '"text" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(fix_grammar(text, _provider(request)))


class SummarizeEmailView(APIView):
    """
    POST /api/ai/summarize/
    Body: { "text": "...", "provider": "openai|qwen" }
    Returns: { "summary": "...", "action_items": [...] }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': '"text" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(summarize_email(text, _provider(request)))


class PhishingCheckView(APIView):
    """
    POST /api/ai/phishing-check/
    Body: { "text": "...", "provider": "openai|qwen" }
    Returns: { "is_phishing": bool, "confidence": 0-1, "reason": "...", "risk_level": "low|medium|high" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': '"text" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(phishing_check(text, _provider(request)))


class SpamCheckView(APIView):
    """
    POST /api/ai/spam-check/
    Body: { "text": "...", "provider": "openai|qwen" }
    Returns: { "is_spam": bool, "confidence": 0-1, "reason": "..." }
    Frontend-facing alias for phishing detection with simplified response shape.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': '"text" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(spam_check(text, _provider(request)))


class CategorizeEmailView(APIView):
    """
    POST /api/ai/categorize/
    Body: { "text": "...", "provider": "openai|qwen" }
    Returns: { "category": "Important|Social|Promotions|Updates" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': '"text" is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(categorize_email(text, _provider(request)))


class SemanticRelevanceView(APIView):
    """
    POST /api/ai/semantic-relevance/
    Body: { "query": "...", "snippet": "...", "provider": "openai|qwen" }
    Returns: { "relevance": 0-1, "matched_reason": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query   = request.data.get('query', '').strip()
        snippet = request.data.get('snippet', '').strip()
        if not query or not snippet:
            return Response(
                {'error': '"query" and "snippet" are both required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(semantic_relevance(query, snippet, _provider(request)))


class EmailChatView(APIView):
    """
    POST /api/ai/chat/
    Body: {
        "conversation": [{"role": "user"|"assistant", "content": "..."}, ...],
        "instruction": "...",
        "provider": "openai|qwen"
    }
    Returns: { "reply": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        conversation = request.data.get('conversation', [])
        instruction  = request.data.get('instruction', '').strip()

        if not isinstance(conversation, list):
            return Response(
                {'error': '"conversation" must be a list of message objects.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not instruction:
            return Response({'error': '"instruction" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        for entry in conversation:
            if not isinstance(entry, dict) or 'role' not in entry or 'content' not in entry:
                return Response(
                    {'error': 'Each conversation entry must have "role" and "content" keys.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if entry['role'] not in ('user', 'assistant'):
                return Response(
                    {'error': '"role" must be "user" or "assistant".'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(email_chat(conversation, instruction, _provider(request)))
