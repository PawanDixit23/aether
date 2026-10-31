"""
ChatSorter Fact Extraction Engine
Extracts discrete episodic facts, routines, and user preferences from conversation streams.
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.3 Memory Intelligence)
"""

import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import MemoryItem


class ChatSorter:
    """Extracts and archives long-term memory facts from user interactions."""

    @staticmethod
    def extract_facts(user_msg: str, user_email: str, db: Session) -> List[MemoryItem]:
        extracted = []
        msg_lower = user_msg.lower()

        # 1. Routine Detection
        routine_patterns = [
            r'(?:har din|roz|daily|everyday|every morning)\s+(?:main\s+)?([^\.\,]+)',
            r'i (?:usually|always|every day)\s+([^\.\,]+)',
            r'my routine is\s+([^\.\,]+)'
        ]
        for p in routine_patterns:
            m = re.search(p, msg_lower)
            if m:
                fact_str = f"Daily Routine: {m.group(1).strip()}"
                item = MemoryItem(user_email=user_email, category="routine", fact=fact_str, confidence=0.95)
                db.add(item)
                extracted.append(item)

        # 2. Personal Preferences
        pref_patterns = [
            r'(?:mujhe|mera)\s+([^\.\,]+?)\s+(?:pasand hai|achha lagta hai|favourite hai)',
            r'i (?:prefer|like|love)\s+([^\.\,]+)',
            r'my preference is\s+([^\.\,]+)'
        ]
        for p in pref_patterns:
            m = re.search(p, msg_lower)
            if m:
                fact_str = f"Preference: {m.group(1).strip()}"
                item = MemoryItem(user_email=user_email, category="preference", fact=fact_str, confidence=0.92)
                db.add(item)
                extracted.append(item)

        # 3. Schedule / Working Hours
        schedule_patterns = [
            r'(?:office|kaam|work|shift)\s+(?:starts at|shuru hota hai|time hai)\s+([0-9\:]+\s*(?:am|pm)?)',
            r'(?:sleep at|so jaata hoon)\s+([0-9\:]+\s*(?:am|pm)?)'
        ]
        for p in schedule_patterns:
            m = re.search(p, msg_lower)
            if m:
                fact_str = f"Schedule Info: {m.group(0).strip()}"
                item = MemoryItem(user_email=user_email, category="schedule", fact=fact_str, confidence=0.90)
                db.add(item)
                extracted.append(item)

        if extracted:
            db.commit()
            print(f"[ChatSorter] Automatically extracted {len(extracted)} episodic facts for {user_email}")

        return extracted
