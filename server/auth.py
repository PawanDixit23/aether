"""Supabase access-token verification for Aether API requests."""
import os
import base64
import hashlib
import hmac
from typing import Any, Dict
from uuid import UUID

import httpx
from fastapi import HTTPException

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dwyiledlboolxywizkbm.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_GzA-KyYiHEu53vqO6FtMMg_AbwDnkph")


async def verify_supabase_access_token(token: str) -> Dict[str, Any]:
    if not token or not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Authentication service unavailable") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
    try:
        user = response.json()
        user_id = str(UUID(str(user["id"])))
        email = str(user["email"]).strip().lower()
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid authenticated user")
    if not email or user.get("email_confirmed_at") is None:
        raise HTTPException(status_code=403, detail="A verified email is required")
    return {"id": user_id, "email": email}


def verify_telegram_webhook_request(request) -> bool:
    """Fail closed unless Telegram's configured webhook secret header matches."""
    expected = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "").strip()
    supplied = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "").strip()
    return bool(expected and supplied and hmac.compare_digest(expected, supplied))


async def verify_meta_whatsapp_webhook_request(request) -> bool:
    """Verify Meta's X-Hub-Signature-256 against the exact raw request body."""
    secret = os.environ.get("WHATSAPP_APP_SECRET", "").strip()
    supplied = request.headers.get("X-Hub-Signature-256", "").strip()
    if not secret or not supplied.startswith("sha256="):
        return False
    body = await request.body()
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    expected = "sha256=" + digest
    return hmac.compare_digest(expected, supplied)


def verify_twilio_webhook_request(request, form) -> bool:
    """Verify Twilio's request signature using the configured canonical public URL."""
    token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    callback_url = os.environ.get("TWILIO_WEBHOOK_URL", "").strip()
    supplied = request.headers.get("X-Twilio-Signature", "").strip()
    if not token or not callback_url or not supplied:
        return False

    signed = callback_url
    for key in sorted(form.keys()):
        values = form.getlist(key) if hasattr(form, "getlist") else [form[key]]
        for value in sorted(str(item) for item in values):
            signed += str(key) + value
    digest = hmac.new(token.encode("utf-8"), signed.encode("utf-8"), hashlib.sha1).digest()
    expected = base64.b64encode(digest).decode("ascii")
    return hmac.compare_digest(expected, supplied)
