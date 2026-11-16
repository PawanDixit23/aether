"""Unit tests for Supabase ES256 and legacy HS256 access-token verification.

Run from the server directory with: python -m unittest discover -s tests
"""
import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

from security import auth


ISSUER = "https://example.supabase.co/auth/v1"
USER_ID = "d9428888-122b-4a6b-9c4a-0f5f3b1a1234"


class FakeJwksClient:
    public_key = None

    def __init__(self, *args, **kwargs):
        pass

    def get_signing_key_from_jwt(self, token):
        return SimpleNamespace(key=self.public_key)


class SupabaseJwtVerificationTests(unittest.TestCase):
    def setUp(self):
        self.private_key = ec.generate_private_key(ec.SECP256R1())
        FakeJwksClient.public_key = self.private_key.public_key()
        self.claims = {
            "sub": USER_ID,
            "email": "user@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "iss": ISSUER,
            "iat": int(time.time()),
            "exp": int(time.time()) + 300,
        }

    def test_production_startup_accepts_es256_without_legacy_hs256_secret(self):
        env = {
            "ENVIRONMENT": "production",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_JWT_ISSUER": ISSUER,
            "SUPABASE_JWT_SECRET": "",
            "TELEGRAM_BOT_TOKEN": "",
            "ENABLE_TELEGRAM": "",
            "WHATSAPP_TOKEN": "",
            "ENABLE_WHATSAPP": "",
            "TWILIO_ACCOUNT_SID": "",
            "ENABLE_TWILIO": "",
        }
        with patch.dict("os.environ", env, clear=True):
            auth.validate_security_config_at_startup()

    def test_production_startup_rejects_missing_supabase_jwks_and_issuer_configuration(self):
        env = {
            "ENVIRONMENT": "production",
            "SUPABASE_URL": "",
            "SUPABASE_JWKS_URL": "",
            "SUPABASE_JWT_ISSUER": "",
            "SUPABASE_JWT_SECRET": "",
            "TELEGRAM_BOT_TOKEN": "",
            "ENABLE_TELEGRAM": "",
            "WHATSAPP_TOKEN": "",
            "ENABLE_WHATSAPP": "",
            "TWILIO_ACCOUNT_SID": "",
            "ENABLE_TWILIO": "",
        }
        with patch.dict("os.environ", env, clear=True):
            with self.assertRaisesRegex(RuntimeError, "SUPABASE_URL"):
                auth.validate_security_config_at_startup()

    def test_accepts_es256_token_from_jwks(self):
        token = jwt.encode(self.claims, self.private_key, algorithm="ES256", headers={"kid": "test-key"})
        with patch.object(auth, "_get_jwks_client", return_value=FakeJwksClient()):
            payload = auth.verify_supabase_jwt(token, "", expected_iss=ISSUER)
        self.assertEqual(payload["sub"], USER_ID)

    def test_accepts_legacy_hs256_token(self):
        secret = "test-only-legacy-jwt-secret-with-32-bytes-minimum"
        token = jwt.encode(self.claims, secret, algorithm="HS256")
        payload = auth.verify_supabase_jwt(token, secret, expected_iss=ISSUER)
        self.assertEqual(payload["sub"], USER_ID)

    def test_rejects_wrong_issuer(self):
        token = jwt.encode(self.claims, self.private_key, algorithm="ES256", headers={"kid": "test-key"})
        with patch.object(auth, "PyJWKClient", FakeJwksClient):
            payload = auth.verify_supabase_jwt(token, "", expected_iss="https://wrong.example/auth/v1")
        self.assertIsNone(payload)

    def test_rejects_expired_token(self):
        expired = dict(self.claims, exp=int(time.time()) - 120)
        token = jwt.encode(expired, self.private_key, algorithm="ES256", headers={"kid": "test-key"})
        with patch.object(auth, "PyJWKClient", FakeJwksClient):
            payload = auth.verify_supabase_jwt(token, "", expected_iss=ISSUER)
        self.assertIsNone(payload)

    def test_rejects_unsupported_algorithm(self):
        token = jwt.encode(self.claims, "test-secret", algorithm="HS256")
        # Change only the untrusted header to an unsupported algorithm; signature must not be accepted.
        header, body, signature = token.split(".")
        import base64
        import json
        changed_header = base64.urlsafe_b64encode(
            json.dumps({"alg": "HS384", "typ": "JWT"}).encode()
        ).rstrip(b"=").decode()
        payload = auth.verify_supabase_jwt(f"{changed_header}.{body}.{signature}", "test-secret", expected_iss=ISSUER)
        self.assertIsNone(payload)


if __name__ == "__main__":
    unittest.main()
