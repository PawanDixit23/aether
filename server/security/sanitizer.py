"""
Aether Security Subsystem — Content Quarantine & Prompt Injection Sanitizer
Based on AETHER_SECURITY_REVIEW.md (Section 3.2 Prompt Injection & Untrusted Data Quarantine)
"""

import re
import html
from typing import Dict, Any, Tuple


class ContentQuarantine:
    """Isolates untrusted user inputs, external emails, and web content from agent control flow."""

    DANGEROUS_PATTERNS = [
        r'(?i)ignore\s+(?:all\s+)?previous\s+instructions',
        r'(?i)system\s+override',
        r'(?i)you\s+are\s+now\s+(?:dan|developer\s+mode|unrestricted)',
        r'(?i)disregard\s+all\s+prior',
        r'(?i)print\s+(?:all\s+)?environment\s+variables',
        r'(?i)reveal\s+(?:all\s+)?api\s+keys'
    ]

    @classmethod
    def sanitize_input(cls, raw_text: str, source: str = "user_input") -> Tuple[str, bool]:
        """
        Sanitizes text and checks for prompt injection patterns.
        Returns: (quarantined_text, is_suspicious)
        """
        if not raw_text:
            return "", False

        is_suspicious = False
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, raw_text):
                is_suspicious = True
                # Neutralize known jailbreak strings
                raw_text = re.sub(pattern, "[FILTERED_INJECTION_ATTEMPT]", raw_text)

        # Escape raw HTML / XML tag injection
        clean_text = html.escape(raw_text)

        # Wrap in immutable XML delimiter boundary as specified in AETHER_SECURITY_REVIEW.md
        quarantined = (
            f'<untrusted_external_content source="{source}">\n'
            f'{clean_text}\n'
            f'</untrusted_external_content>'
        )

        return quarantined, is_suspicious
