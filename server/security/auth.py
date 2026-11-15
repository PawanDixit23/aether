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


UUID_REGEX = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

def verify_supabase_jwt(
    token: str,
    jwt_secret: str,
    expected_iss: Optional[str] = None,
    expected_aud: Optional[str] = "authenticated"
) -> Optional[Dict[str, Any]]:
    """
    Cryptographically verifies Supabase JWT (AETH-P0-01):
    - Pins accepted algorithm strictly to HS256 (rejects 'none' or unexpected algorithms)
    - Validates HMAC-SHA256 signature in constant time
    - Enforces mandatory 'sub' with strict UUID format validation
    - Validates expected Supabase issuer ('iss') when configured
    - Validates expected audience ('aud') supporting string and list claims
    - Validates numeric 'exp' with 30s clock skew allowance
    - Validates 'nbf' when present
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

    # 2. Verify HMAC signature in constant time
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(jwt_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b"=").decode("utf-8")

    if not hmac.compare_digest(expected_b64, sig_b64):
        return None

    # 3. Decode & validate claims
    try:
        payload_padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_padded).decode("utf-8"))
    except Exception:
        return None

    now = time.time()

    # Mandatory 'sub' claim with strict UUID format check (AETH-P0-01)
    sub = payload.get("sub")
    if not sub or not UUID_REGEX.match(str(sub).strip()):
        return None

    # Mandatory numeric 'exp' claim with 30s clock skew tolerance
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

    # Issuer validation ('iss')
    if expected_iss:
        token_iss = payload.get("iss")
        if not token_iss or token_iss.rstrip("/") != expected_iss.rstrip("/"):
            return None

    # Audience validation ('aud')
    if expected_aud:
        token_aud = payload.get("aud")
        if isinstance(token_aud, list):
            if expected_aud not in token_aud:
                return None
        elif isinstance(token_aud, str):
            if token_aud != expected_aud:
                return None
        else:
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
    
    # ENVIRONMENT defaults to production for fail-closed security (AETH-P0-01)
    env = os.environ.get("ENVIRONMENT", "production").lower()
    is_production = env in ["prod", "production"]
    
    expected_iss = os.environ.get("SUPABASE_JWT_ISSUER", "").strip() or None
    expected_aud = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated").strip() or "authenticated"

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Empty Bearer token in Authorization header")

        # 1. Cryptographic Supabase JWT Verification
        if jwt_secret:
            payload = verify_supabase_jwt(token, jwt_secret, expected_iss=expected_iss, expected_aud=expected_aud)
            if not payload:
                raise HTTPException(status_code=401, detail="Invalid, expired, or tampered authentication token")

            user_id = str(payload.get("sub")).strip()
            email = str(payload.get("email") or default_dev_email).strip().lower()

            return UserIdentity(
                user_id=user_id,
                email=email,
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

        # 2. Local Dev/Test Mode ONLY (Strictly forbidden in production)
        if not is_production:
            payload = _decode_jwt_unverified(token)
            if payload and payload.get("sub"):
                sub = str(payload.get("sub")).strip()
                email = str(payload.get("email") or default_dev_email).strip().lower()
                return UserIdentity(
                    user_id=sub,
                    email=email,
                    role=payload.get("role", "authenticated"),
                    issuer=payload.get("iss", "dev"),
                    audience=payload.get("aud", "authenticated"),
                    exp=float(payload.get("exp", time.time() + 3600))
                )

            # Test token prefixes for test client in dev/test mode
            if token.startswith("test_") or token.startswith("dev_"):
                ident = token.split("_", 1)[1]
                test_email = ident if "@" in ident else f"{ident}@aether.local"
                # If ident is not already a UUID, generate stable deterministic UUID from ident
                if UUID_REGEX.match(ident):
                    test_uuid = ident
                else:
                    test_uuid = hashlib.md5(ident.encode()).hexdigest()
                    test_uuid = f"{test_uuid[:8]}-{test_uuid[8:12]}-{test_uuid[12:16]}-{test_uuid[16:20]}-{test_uuid[20:32]}"
                return UserIdentity(
                    user_id=test_uuid,
                    email=test_email,
                    role="authenticated"
                )

        raise HTTPException(status_code=401, detail="Malformed Bearer token")

    # Local development fallback only when explicitly in local/dev/test mode AND NOT production
    is_dev = env in ["dev", "development", "local", "test"]
    if is_dev and not is_production and not jwt_secret:
        return UserIdentity(
            user_id="00000000-0000-0000-0000-000000000001",
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
