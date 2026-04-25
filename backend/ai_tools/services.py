"""
AI Services for CuteMail
========================
Dual-provider AI: OpenAI (gpt-4o-mini) and Qwen2.5 via HuggingFace.

Provider selection:
  - "openai"  → gpt-4o-mini  (fast, primary)
  - "qwen"    → Qwen/Qwen2.5-7B-Instruct via HF Inference API (privacy/backup)
  - fallback  → mock responses when no keys are configured

Privacy guarantee: no plaintext is ever persisted — all processing is in-memory.
"""
import json
import time
import requests as _requests
from django.conf import settings

# ── Provider readiness ────────────────────────────────────────────────────────

try:
    from openai import OpenAI as _OpenAI
    _OPENAI_READY = bool(getattr(settings, 'OPENAI_API_KEY', ''))
except ImportError:
    _OPENAI_READY = False

_HF_READY = bool(getattr(settings, 'HF_TOKEN', ''))

_HF_URL = (
    "https://api-inference.huggingface.co"
    "/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions"
)
_MAX_TOKENS = 300


# ── OpenAI helpers ────────────────────────────────────────────────────────────

def _openai_client():
    return _OpenAI(api_key=settings.OPENAI_API_KEY)


def _chat_openai(system: str, user: str) -> str:
    response = _openai_client().chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=_MAX_TOKENS,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )
    return response.choices[0].message.content.strip()


# ── HuggingFace / Qwen helpers ────────────────────────────────────────────────

def _chat_huggingface(system: str, user: str) -> str:
    """Call Qwen2.5-7B-Instruct via HF Inference API. Retries on model loading."""
    headers = {
        "Authorization": f"Bearer {settings.HF_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "Qwen/Qwen2.5-7B-Instruct",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "max_tokens": _MAX_TOKENS,
        "stream": False,
    }

    for attempt in range(3):
        try:
            resp = _requests.post(_HF_URL, headers=headers, json=payload, timeout=30)
            if resp.status_code == 503:
                # Model is still loading — wait and retry
                time.sleep(10 * (attempt + 1))
                continue
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
        except _requests.Timeout:
            if attempt == 2:
                raise Exception("HuggingFace API timed out after 3 attempts.")
            time.sleep(5)

    raise Exception("HuggingFace API unavailable after 3 retries.")


# ── Unified dispatcher ────────────────────────────────────────────────────────

def _chat(system: str, user: str, provider: str = "openai") -> str:
    """Route to the chosen provider. Falls back to mock if neither is ready."""
    if provider == "qwen" and _HF_READY:
        return _chat_huggingface(system, user)
    if _OPENAI_READY:
        return _chat_openai(system, user)
    raise _MockFallback()


def _json_chat(system: str, user: str, fallback: dict, provider: str = "openai") -> dict:
    """Like _chat but parses the result as JSON; returns fallback on parse error."""
    raw = _chat(system, user, provider)
    try:
        # Strip markdown code fences if model wrapped the JSON
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return fallback


class _MockFallback(Exception):
    """Sentinel — caught inside each service function to return mock data."""


# ── 1. generate_email — Email Writing Assistant ───────────────────────────────

def generate_email(prompt: str, tone: str, provider: str = "openai") -> dict:
    """Return {"subject": ..., "body": ...} for the given prompt and tone."""
    try:
        text = _chat(
            system=(
                f"You are an expert email writer for a privacy-first email platform. "
                f"Write a complete, polite email in a {tone} tone. "
                f"Format EXACTLY as:\nSubject: <subject>\n\n<body>"
            ),
            user=f"Write an email about: {prompt}",
            provider=provider,
        )
        lines = text.split('\n', 1)
        subject = lines[0].replace('Subject:', '').strip()
        body = lines[1].strip() if len(lines) > 1 else text
        return {"subject": subject, "body": body}
    except _MockFallback:
        return {
            "subject": f"Regarding: {prompt[:60]}",
            "body": (
                f"Dear [Recipient],\n\n"
                f"I hope this message finds you well. I am writing regarding {prompt}.\n\n"
                f"[Mock — add OPENAI_API_KEY or HF_TOKEN to .env for real AI.]\n\n"
                f"Sincerely,\n[Your Name]"
            ),
        }


# ── 2. rewrite_email — Tone Rewriting ────────────────────────────────────────

def rewrite_email(text: str, tone: str, provider: str = "openai") -> dict:
    """Return {"rewritten": ...} — same meaning, different tone."""
    try:
        rewritten = _chat(
            system=(
                f"You are an expert email editor. "
                f"Rewrite the following email in a {tone} tone. "
                f"Keep the meaning exactly the same. Return the rewritten email only."
            ),
            user=text,
            provider=provider,
        )
        return {"rewritten": rewritten}
    except _MockFallback:
        return {
            "rewritten": (
                f"[Mock Rewrite — {tone} tone]\n\n"
                f"Dear [Recipient],\n\n{text}\n\nKind regards,\n[Your Name]"
            )
        }


# ── 3. fix_grammar — Grammar Fix ─────────────────────────────────────────────

def fix_grammar(text: str, provider: str = "openai") -> dict:
    """Return {"corrected": ...} — grammar/punctuation/clarity fix."""
    try:
        corrected = _chat(
            system=(
                "You are a professional proofreader. "
                "Correct grammar, punctuation, and clarity in the following email. "
                "Keep the original meaning and tone. Return only the corrected text."
            ),
            user=text,
            provider=provider,
        )
        return {"corrected": corrected}
    except _MockFallback:
        return {
            "corrected": (
                f"{text}\n\n"
                f"[Mock grammar check — add OPENAI_API_KEY or HF_TOKEN to .env.]"
            )
        }


# ── 4. summarize_email — Summarization ───────────────────────────────────────

def summarize_email(text: str, provider: str = "openai") -> dict:
    """Return {"summary": ..., "action_items": [...]} — bullet-point summary."""
    try:
        raw = _chat(
            system=(
                "You are an expert email analyst. "
                "Summarize the following email in 3-5 bullet points. "
                "Then list any action items after 'ACTION ITEMS:'. "
                "If there are none, write 'ACTION ITEMS: None'."
            ),
            user=text,
            provider=provider,
        )
        parts = raw.split('ACTION ITEMS:', 1)
        summary = parts[0].strip()
        action_items_raw = parts[1].strip() if len(parts) > 1 else 'None'
        action_items = (
            []
            if action_items_raw.lower() == 'none'
            else [ln.strip('•- ').strip() for ln in action_items_raw.splitlines() if ln.strip()]
        )
        return {"summary": summary, "action_items": action_items}
    except _MockFallback:
        preview = text[:120].rstrip()
        return {
            "summary": f"[Mock Summary]\n• This email discusses: \"{preview}...\"",
            "action_items": [],
        }


# ── 5. phishing_check — Spam / Phishing Detection ────────────────────────────

_PHISHING_KEYWORDS = [
    'winner', 'won', 'prize', 'lottery', 'free money', 'click here',
    'urgent', 'verify your account', 'limited time', 'act now',
    'congratulations', 'claim your reward', 'suspicious activity',
    'confirm your password', 'your account will be suspended',
    'wire transfer', 'nigerian prince', 'send bitcoin',
]


def phishing_check(text: str, provider: str = "openai") -> dict:
    """
    Return {
        "is_phishing": bool, "confidence": 0.0-1.0,
        "reason": str, "risk_level": "low"|"medium"|"high"
    }
    """
    try:
        return _json_chat(
            system=(
                "You are a spam and phishing detection expert. "
                "Analyze the following email for phishing, scam, or spam patterns. "
                "Consider: urgency language, suspicious links, requests for sensitive info, "
                "impersonation, and social engineering. "
                "Reply ONLY with valid JSON in this exact format (no markdown): "
                '{"is_phishing": true/false, "confidence": <0.0-1.0>, '
                '"reason": "<short explanation>", "risk_level": "low|medium|high"}'
            ),
            user=text,
            fallback={
                "is_phishing": False,
                "confidence": 0.0,
                "reason": "Could not parse AI response.",
                "risk_level": "low",
            },
            provider=provider,
        )
    except _MockFallback:
        text_lower = text.lower()
        hits = [kw for kw in _PHISHING_KEYWORDS if kw in text_lower]
        if hits:
            confidence = round(min(len(hits) * 0.2, 0.95), 2)
            risk = "high" if confidence >= 0.6 else "medium"
            return {
                "is_phishing": True,
                "confidence": confidence,
                "reason": f"Contains suspicious phrases: {', '.join(hits)}.",
                "risk_level": risk,
            }
        return {
            "is_phishing": False,
            "confidence": 0.05,
            "reason": "No obvious spam or phishing indicators detected.",
            "risk_level": "low",
        }


def spam_check(text: str, provider: str = "openai") -> dict:
    """
    Frontend-facing wrapper around phishing_check.
    Returns {"is_spam": bool, "confidence": float, "reason": str}.
    """
    result = phishing_check(text, provider)
    return {
        "is_spam": result["is_phishing"],
        "confidence": result["confidence"],
        "reason": result["reason"],
    }


# ── 6. categorize_email — Smart Inbox Categorization ─────────────────────────

_VALID_CATEGORIES = {"Important", "Social", "Promotions", "Updates"}


def categorize_email(text: str, provider: str = "openai") -> dict:
    """Return {"category": "Important" | "Social" | "Promotions" | "Updates"}."""
    try:
        raw = _chat(
            system=(
                "You are an email categorization system. "
                "Classify the following email into exactly ONE of these categories: "
                "Important, Social, Promotions, Updates. "
                "Reply with the category name ONLY — no explanation."
            ),
            user=text,
            provider=provider,
        )
        category = raw.strip().title()
        if category not in _VALID_CATEGORIES:
            category = "Important"
        return {"category": category}
    except _MockFallback:
        text_lower = text.lower()
        if any(w in text_lower for w in ['sale', 'discount', 'offer', 'deal', 'promo', '%off']):
            return {"category": "Promotions"}
        if any(w in text_lower for w in ['follow', 'liked', 'friend request', 'mentioned', 'tagged']):
            return {"category": "Social"}
        if any(w in text_lower for w in ['update', 'changelog', 'release', 'newsletter', 'digest']):
            return {"category": "Updates"}
        return {"category": "Important"}


# ── 7. semantic_relevance — Semantic Search Support ───────────────────────────

def semantic_relevance(query: str, snippet: str, provider: str = "openai") -> dict:
    """Return {"relevance": 0.0-1.0, "matched_reason": str}."""
    try:
        return _json_chat(
            system=(
                "You are a semantic search relevance engine. "
                "Given a user search query and an email snippet, determine how relevant "
                "the snippet is to the query based on MEANING, not just keywords. "
                "Reply ONLY with valid JSON (no markdown): "
                '{"relevance": <0.0-1.0>, "matched_reason": "<short explanation>"}'
            ),
            user=f"Query: {query}\n\nEmail snippet: {snippet}",
            fallback={"relevance": 0.0, "matched_reason": "Could not assess relevance."},
            provider=provider,
        )
    except _MockFallback:
        query_words = set(query.lower().split())
        snippet_words = set(snippet.lower().split())
        overlap = query_words & snippet_words
        relevance = round(min(len(overlap) / max(len(query_words), 1), 1.0), 2)
        reason = (
            f"Matched keywords: {', '.join(overlap)}." if overlap
            else "No keyword overlap found."
        )
        return {"relevance": relevance, "matched_reason": reason}


# ── 8. email_chat — Email Chat Mode ──────────────────────────────────────────

def email_chat(conversation: list, instruction: str, provider: str = "openai") -> dict:
    """
    Multi-turn email chat assistant.
    conversation: list of {"role": "user"|"assistant", "content": "..."}
    Returns {"reply": str}
    """
    if (provider == "qwen" and _HF_READY) or _OPENAI_READY:
        system_msg = (
            "You are CuteMail's email assistant in chat mode. "
            "Help users manage email threads: summarize, draft replies, extract action items. "
            "Be concise and direct. Respect user privacy — never invent facts."
        )
        if provider == "qwen" and _HF_READY:
            # Build a single combined prompt for HF (doesn't support multi-turn natively here)
            history = "\n".join(
                f"{m['role'].upper()}: {m['content']}" for m in conversation
            )
            combined = f"{history}\nUSER: {instruction}"
            reply = _chat_huggingface(system_msg, combined)
        else:
            messages = [{"role": "system", "content": system_msg}] + conversation + [
                {"role": "user", "content": instruction}
            ]
            response = _openai_client().chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=_MAX_TOKENS,
                messages=messages,
            )
            reply = response.choices[0].message.content.strip()
        return {"reply": reply}

    return {
        "reply": (
            f"[Mock Chat Reply]\n\n"
            f"Your instruction: \"{instruction}\"\n\n"
            f"Add OPENAI_API_KEY or HF_TOKEN to .env for real AI-powered chat."
        )
    }
