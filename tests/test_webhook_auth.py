import base64
import hashlib
import hmac
import os
import sys
import unittest
from unittest.mock import patch

SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, SERVER_DIR)

from auth import (
    verify_telegram_webhook_request,
    verify_meta_whatsapp_webhook_request,
    verify_twilio_webhook_request,
)


class Headers(dict):
    pass


class DummyRequest:
    def __init__(self, headers=None, body=b""):
        self.headers = Headers(headers or {})
        self._body = body

    async def body(self):
        return self._body


class DummyForm(dict):
    def getlist(self, key):
        value = self[key]
        return value if isinstance(value, list) else [value]


class WebhookSignatureTests(unittest.IsolatedAsyncioTestCase):
    def test_telegram_requires_matching_secret_header(self):
        with patch.dict(os.environ, {"TELEGRAM_WEBHOOK_SECRET": "expected-secret"}, clear=False):
            self.assertTrue(verify_telegram_webhook_request(DummyRequest({
                "X-Telegram-Bot-Api-Secret-Token": "expected-secret"
            })))
            self.assertFalse(verify_telegram_webhook_request(DummyRequest({
                "X-Telegram-Bot-Api-Secret-Token": "attacker-value"
            })))

    async def test_meta_signature_covers_exact_raw_body(self):
        body = b'{"entry":[{"id":"test"}]}'
        secret = "meta-test-secret"
        signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        with patch.dict(os.environ, {"WHATSAPP_APP_SECRET": secret}, clear=False):
            self.assertTrue(await verify_meta_whatsapp_webhook_request(DummyRequest({
                "X-Hub-Signature-256": "sha256=" + signature
            }, body)))
            self.assertFalse(await verify_meta_whatsapp_webhook_request(DummyRequest({
                "X-Hub-Signature-256": "sha256=" + signature
            }, body + b" ")))

    def test_twilio_signature_uses_configured_url_and_sorted_parameters(self):
        secret = "twilio-test-auth-token"
        url = "https://example.test/api/whatsapp/twilio"
        form = DummyForm({"Body": "hello", "From": "whatsapp:+10000000000"})
        signed = url + "Bodyhello" + "Fromwhatsapp:+10000000000"
        signature = base64.b64encode(
            hmac.new(secret.encode(), signed.encode(), hashlib.sha1).digest()
        ).decode("ascii")
        with patch.dict(os.environ, {
            "TWILIO_AUTH_TOKEN": secret,
            "TWILIO_WEBHOOK_URL": url,
        }, clear=False):
            self.assertTrue(verify_twilio_webhook_request(
                DummyRequest({"X-Twilio-Signature": signature}), form
            ))
            self.assertFalse(verify_twilio_webhook_request(
                DummyRequest({"X-Twilio-Signature": "forged"}), form
            ))


if __name__ == "__main__":
    unittest.main()
