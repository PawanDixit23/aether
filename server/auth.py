"""Supabase access-token verification for Aether API requests."""
import os
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
