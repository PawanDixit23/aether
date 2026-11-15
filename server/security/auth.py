"""
Aether Central Authentication & Identity Subsystem (AETH-P0-01)
Enforces fail-closed JWT verification, immutable Supabase user UUID extraction,
and eliminates caller-controlled identity spoofing or unverified fallback in production.
"""

import os
import re
import json
import time
import base64
import hmac
import hashlib
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends, Request

# ─────────────────────────────────────────────────────────────────────────────
# Central Immutable User Identity Principal (AETH-P0-01 & AETH-P0-02)
# ─────────────────────────────────────────────────────────────────────────────
class UserIdentity:
    """Typed canonical user principal carrying immutable UUID and verified claims."""
    def __init__(
        self,
        user_id: str,
        email: str,
        role: str = "authenticated",
        issuer: str = "supabase",
        audience: str = "authenticated",
        exp: Optional[float] = None
    ):
        self.id = str(user_id).strip()  # Canonical immutable user UUID (sub)
        self.user_id = self.id
        self.email = str(email).strip().lower()
        self.role = str(role).strip()
        self.issuer = str(issuer).strip()
        self.audience = str(audience).strip()
        self.exp = exp

    def __repr__(self):
        return f"<UserIdentity id={self.id} email={self.email} role={self.role}>"


def _decode_jwt_unverified(token: str) -> Optional[Dict[str, Any]]:
    """Decodes JWT payload without signature check (strictly for local dev/testing only)."""
    parts = token.split(".")
    if len(parts) != 3:
        return None
    try:
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        return json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    except Exception:
        return None


def verify_supabase_jwt(token: str, jwt_secret: str) -> Optional[Dict[str, Any]]:
    """
    Cryptographically verifies Supabase JWT:
    - Pins accepted algorithm to HS256 (strictly rejects 'none' or unexpected algorithms)
    - Validates HMAC-SHA256 signature in constant time
    - Enforces mandatory 'sub' (UUID) and 'exp' (expiry) claims
    - Validates clock-skew (max 30s allowance)
    """
    parts = token.split(".")
    if len(parts) != 3:
        return None

    header_b64, payload_b64, sig_b64 = parts

    # 1. Inspect header algorithm - reject alg=none or non-HS256
    try:
        header_padded = header_b64 + "=" * (-len(header_b64) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_padded).decode("utf-8"))
        if not isinstance(header, dict) or header.get("alg") != "HS256":
            return None
    except Exception:
        return None

    # 2. Verify signature
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(jwt_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b"=").decode("utf-8")

    # Constant-time signature comparison to defeat timing attacks
    if not hmac.compare_digest(expected_b64, sig_b64):
        return None

    # 3. Decode & validate claims
    try:
        payload_padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_padded).decode("utf-8"))
    except Exception:
        return None

    now = time.time()

    # Mandatory 'sub' claim (user UUID)
    sub = payload.get("sub") or payload.get("user_id")
    if not sub or not str(sub).strip():
        return None

    # Mandatory 'exp' claim with 30s clock skew tolerance
    exp = payload.get("exp")
    if exp is None:
        return None
    try:
        if now > (float(exp) + 30):
            return None  # Token expired
    except (ValueError, TypeError):
        return None

    # Optional 'nbf' (not-before) claim
    nbf = payload.get("nbf")
    if nbf is not None:
        try:
            if now < (float(nbf) - 30):
                return None  # Token not yet valid
        except (ValueError, TypeError):
            return None

    return payload


def get_current_user_identity(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> UserIdentity:
    """
    Canonical mandatory authentication dependency (AETH-P0-01).
    Validates Bearer JWT token, fails closed in production, and returns typed UserIdentity.
    """
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
    default_dev_email = os.environ.get("DEFAULT_USER_EMAIL", "e.pawandixit@gmail.com").strip().lower()
    env = os.environ.get("ENVIRONMENT", "development").lower()
    is_production = env in ["prod", "production"]

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Empty Bearer token in Authorization header")

        # 1. Cryptographic Supabase JWT Verification
        if jwt_secret:
            payload = verify_supabase_jwt(token, jwt_secret)
            if not payload:
                raise HTTPException(status_code=401, detail="Invalid, expired, or tampered authentication token")

            user_id = payload.get("sub") or payload.get("user_id")
            email = payload.get("email") or default_dev_email

            return UserIdentity(
                user_id=str(user_id),
                email=str(email),
                role=payload.get("role", "authenticated"),
                issuer=payload.get("iss", "supabase"),
                audience=payload.get("aud", "authenticated"),
                exp=float(payload.get("exp", 0))
            )

        # In production without secret: Fail closed immediately
        if is_production:
            raise HTTPException(
                status_code=500,
                detail="Production authentication configuration missing (SUPABASE_JWT_SECRET required)"
            )

        # 2. Local Dev/Test Mode (Only when NOT in production and secret is unconfigured)
        payload = _decode_jwt_unverified(token)
        if payload and (payload.get("sub") or payload.get("email")):
            sub = payload.get("sub") or f"dev_usr_{hashlib.md5(token.encode()).hexdigest()[:12]}"
            email = payload.get("email") or default_dev_email
            return UserIdentity(
                user_id=str(sub),
                email=str(email),
                role=payload.get("role", "authenticated"),
                issuer=payload.get("iss", "dev"),
                audience=payload.get("aud", "authenticated"),
                exp=float(payload.get("exp", time.time() + 3600))
            )

        # Test token prefixes for test client (AETH-P0-01 / AETH-P0-02 Multi-User Testing)
        if token.startswith("test_") or token.startswith("dev_"):
            ident = token.split("_", 1)[1]
            test_email = ident if "@" in ident else f"{ident}@aether.local"
            return UserIdentity(
                user_id=f"usr_{ident}",
                email=test_email,
                role="authenticated"
            )

        raise HTTPException(status_code=401, detail="Malformed Bearer token")

    # Local development fallback only when NOT in production
    is_dev = env in ["dev", "development", "local", "test"]
    if is_dev and not is_production and not jwt_secret:
        return UserIdentity(
            user_id="dev_operator_uuid",
            email=default_dev_email,
            role="authenticated"
        )

    # In production or when unauthenticated, reject access with 401
    raise HTTPException(
        status_code=401,
        detail="Authentication required. Please provide a valid Bearer token in Authorization header."
    )


def get_current_user_email(user: UserIdentity = Depends(get_current_user_identity)) -> str:
    """Dependency that returns the verified, authenticated user's email."""
    return user.email


def get_current_user_id(user: UserIdentity = Depends(get_current_user_identity)) -> str:
    """Dependency that returns the verified, authenticated user's immutable UUID."""
    return user.id


def get_optional_user_identity(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Optional[UserIdentity]:
    """Optional auth dependency for public or semi-public endpoints."""
    try:
        return get_current_user_identity(request, authorization)
    except HTTPException:
        return None
