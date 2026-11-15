"""
Aether Central Authentication & Identity Subsystem (AETH-P0-01)
Enforces fail-closed JWT verification, immutable Supabase user UUID extraction,
and eliminates caller-controlled identity spoofing or unverified fallback in production.
"""

import os
import re
import json
import base64
import time
import math
import hashlib
import logging
from functools import lru_cache
from typing import Optional, Dict, Any
import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError
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
    """Decode JWT claims without verification for explicitly enabled local dev/test only."""
    parts = token.split(".")
    if len(parts) != 3:
        return None
    try:
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        return json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    except Exception:
        return None


UUID_REGEX = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

logger = logging.getLogger(__name__)


def _log_jwt_diagnostic(reason: str, algorithm: Optional[str] = None, kid_present: bool = False, exception_type: Optional[str] = None) -> None:
    """Temporary, opt-in JWT diagnostics. Never log tokens, claims, or secrets."""
    if os.environ.get("AETHER_AUTH_DIAGNOSTICS", "").strip().lower() not in {"1", "true", "yes"}:
        return
    logger.warning(
        "AETHER_AUTH_DIAGNOSTIC reason=%s algorithm=%s kid_present=%s exception_type=%s",
        reason,
        algorithm or "unknown",
        kid_present,
        exception_type or "none",
    )



def _supabase_jwks_url() -> str:
    """Resolve Supabase JWKS endpoint, allowing an explicit deployment override."""
    configured = os.environ.get("SUPABASE_JWKS_URL", "").strip()
    if configured:
        return configured
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    if not supabase_url:
        raise ValueError("SUPABASE_URL or SUPABASE_JWKS_URL is required for ES256 verification")
    return f"{supabase_url}/auth/v1/.well-known/jwks.json"


@lru_cache(maxsize=4)
def _get_jwks_client(url: str) -> PyJWKClient:
    """Reuse the JWKS client so its key-set cache is effective across requests."""
    return PyJWKClient(url, cache_jwk_set=True, cache_keys=True, timeout=5)


def verify_supabase_jwt(
    token: str,
    jwt_secret: str,
    expected_iss: Optional[str] = None,
    expected_aud: Optional[str] = "authenticated",
    jwks_url: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Verify Supabase access tokens using their declared signing algorithm.
    ES256 uses the matching public key from Supabase JWKS; HS256 uses the
    legacy JWT secret for existing tokens. All other algorithms fail closed.
    Temporary diagnostics are opt-in and never expose token/claim values.
    """
    algorithm = None
    kid_present = False
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        kid_present = bool(header.get("kid"))

        if algorithm == "ES256":
            jwks_client = _get_jwks_client(jwks_url or _supabase_jwks_url())
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            verification_key = signing_key.key
            allowed_algorithms = ["ES256"]
        elif algorithm == "HS256":
            if not jwt_secret:
                _log_jwt_diagnostic("legacy_hs256_secret_missing", algorithm, kid_present)
                return None
            verification_key = jwt_secret
            allowed_algorithms = ["HS256"]
        else:
            _log_jwt_diagnostic("unsupported_algorithm", algorithm, kid_present)
            return None

        required_claims = ["exp", "sub", "aud"]
        if expected_iss:
            required_claims.append("iss")

        payload = jwt.decode(
            token,
            key=verification_key,
            algorithms=allowed_algorithms,
            audience=expected_aud,
            issuer=expected_iss,
            leeway=30,
            options={"require": required_claims}
        )

        sub = payload.get("sub")
        if not sub or not UUID_REGEX.match(str(sub).strip()):
            _log_jwt_diagnostic("invalid_subject", algorithm, kid_present)
            return None

        exp = payload.get("exp")
        if not isinstance(exp, (int, float)) or not math.isfinite(exp):
            _log_jwt_diagnostic("invalid_expiration_claim", algorithm, kid_present)
            return None
        if float(exp) > time.time() + 365 * 86400:
            _log_jwt_diagnostic("expiration_too_far_in_future", algorithm, kid_present)
            return None

        nbf = payload.get("nbf")
        if nbf is not None and (
            not isinstance(nbf, (int, float)) or not math.isfinite(nbf)
        ):
            _log_jwt_diagnostic("invalid_not_before_claim", algorithm, kid_present)
            return None

        return payload
    except (InvalidTokenError, PyJWKClientError, ValueError, TypeError, KeyError) as exc:
        # Log only the exception class; exception messages can contain deployment details.
        _log_jwt_diagnostic("verification_rejected", algorithm, kid_present, type(exc).__name__)
        return None
    except Exception as exc:
        # JWKS/network/cryptographic failures must never fall back to unverified claims.
        _log_jwt_diagnostic("verification_internal_error", algorithm, kid_present, type(exc).__name__)
        return None


def _finalize_identity(request: Optional[Request], user_identity: UserIdentity) -> UserIdentity:
    """Stores verified identity on request state and wires transaction-local RLS context (AETH-P0-02)."""
    if request and hasattr(request, "state"):
        request.state.current_user = user_identity
        request.state.current_user_id = user_identity.user_id
        db = getattr(request.state, "db", None)
        if db:
            try:
                from database import set_db_rls_context
                set_db_rls_context(db, user_identity.user_id)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Database RLS security context initialization failed: {e}")
    return user_identity


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
    if is_production and not expected_iss:
        supabase_url = os.environ.get("SUPABASE_URL", "").strip()
        if supabase_url:
            expected_iss = f"{supabase_url.rstrip('/')}/auth/v1"
        else:
            raise HTTPException(
                status_code=500,
                detail="Production authentication configuration missing (SUPABASE_JWT_ISSUER or SUPABASE_URL required)"
            )

    expected_aud = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated").strip() or "authenticated"

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Empty Bearer token in Authorization header")

        # 1. Cryptographic Supabase JWT Verification
        if jwt_secret or token.count(".") == 2:
            payload = verify_supabase_jwt(token, jwt_secret, expected_iss=expected_iss, expected_aud=expected_aud)
            if not payload:
                raise HTTPException(status_code=401, detail="Invalid, expired, or tampered authentication token")

            user_id = str(payload.get("sub")).strip()
            email = str(payload.get("email") or default_dev_email).strip().lower()

            return _finalize_identity(request, UserIdentity(
                user_id=user_id,
                email=email,
                role=payload.get("role", "authenticated"),
                issuer=payload.get("iss", "supabase"),
                audience=payload.get("aud", "authenticated"),
                exp=float(payload.get("exp", 0))
            ))

        # In production without secret: Fail closed immediately
        if is_production:
            raise HTTPException(
                status_code=500,
                detail="Production authentication configuration missing (SUPABASE_JWT_SECRET required)"
            )

        # 2. Local Dev/Test Mode ONLY with explicit ENABLE_INSECURE_DEV_AUTH guard (AETH-P0-01)
        # An accidental ENVIRONMENT=dev in production CANNOT enable unverified token paths!
        allow_insecure_dev = os.environ.get("ENABLE_INSECURE_DEV_AUTH", "").lower() in ["true", "1", "yes"]
        if not is_production and allow_insecure_dev:
            payload = _decode_jwt_unverified(token)
            if payload and payload.get("sub"):
                sub = str(payload.get("sub")).strip()
                email = str(payload.get("email") or default_dev_email).strip().lower()
                return _finalize_identity(request, UserIdentity(
                    user_id=sub,
                    email=email,
                    role=payload.get("role", "authenticated"),
                    issuer=payload.get("iss", "dev"),
                    audience=payload.get("aud", "authenticated"),
                    exp=float(payload.get("exp", time.time() + 3600))
                ))

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
                return _finalize_identity(request, UserIdentity(
                    user_id=test_uuid,
                    email=test_email,
                    role="authenticated"
                ))

        raise HTTPException(status_code=401, detail="Malformed or unverified Bearer token")

    # Local development fallback only when explicitly in local/dev/test mode AND explicit insecure flag
    is_dev = env in ["dev", "development", "local", "test"]
    allow_insecure_dev = os.environ.get("ENABLE_INSECURE_DEV_AUTH", "").lower() in ["true", "1", "yes"]
    if is_dev and not is_production and not jwt_secret and allow_insecure_dev:
        return _finalize_identity(request, UserIdentity(
            user_id="00000000-0000-0000-0000-000000000001",
            email=default_dev_email,
            role="authenticated"
        ))

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


def validate_security_config_at_startup():
    """
    Validates critical security configuration at application startup (AETH-P0-01 & AETH-P0-05).
    Fails fast with fatal RuntimeError if production environment lacks mandatory JWT or webhook secrets.
    """
    env = os.environ.get("ENVIRONMENT", "production").lower()
    is_prod = env in ["prod", "production"]
    if not is_prod:
        return

    errors = []
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
    if not jwt_secret:
        errors.append("SUPABASE_JWT_SECRET is required in production.")

    jwt_iss = os.environ.get("SUPABASE_JWT_ISSUER", "").strip()
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    if not jwt_iss and not supabase_url:
        errors.append("SUPABASE_JWT_ISSUER (or SUPABASE_URL) is required in production.")

    # Validate webhook secrets if enabled in production
    if os.environ.get("ENABLE_TELEGRAM", "").lower() in ["true", "1", "yes"] or os.environ.get("TELEGRAM_BOT_TOKEN", "").strip():
        if not os.environ.get("TELEGRAM_WEBHOOK_SECRET", "").strip():
            errors.append("TELEGRAM_WEBHOOK_SECRET is required when Telegram integration is active in production.")

    if os.environ.get("ENABLE_WHATSAPP", "").lower() in ["true", "1", "yes"] or os.environ.get("WHATSAPP_TOKEN", "").strip():
        if not os.environ.get("WHATSAPP_APP_SECRET", "").strip():
            errors.append("WHATSAPP_APP_SECRET is required when Meta WhatsApp integration is active in production.")

    if os.environ.get("ENABLE_TWILIO", "").lower() in ["true", "1", "yes"] or os.environ.get("TWILIO_ACCOUNT_SID", "").strip():
        if not os.environ.get("TWILIO_AUTH_TOKEN", "").strip():
            errors.append("TWILIO_AUTH_TOKEN is required when Twilio integration is active in production.")

    if errors:
        raise RuntimeError("FATAL AETHER STARTUP FAILURE: Critical production security configuration missing:\n" + "\n".join(f"  • {e}" for e in errors))

