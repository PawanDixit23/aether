"""
ChatSorter Fact Extraction Engine
Extracts discrete episodic facts, routines, personal preferences, and contact relationships
from conversation streams into the long-term memory vault.
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.3 Memory Intelligence)
"""

import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

try:
    from models import MemoryItem
except ImportError:
    from server.models import MemoryItem


class ChatSorter:
    """Extracts and archives long-term memory facts from user interactions."""

    @staticmethod
    def extract_facts(user_msg: str, user_email: str, db: Session) -> List[MemoryItem]:
        extracted = []
        msg_clean = user_msg.strip()
        msg_lower = msg_clean.lower()

        # Helper to avoid duplicates
        existing_facts = {
            m.fact.strip().lower()
            for m in db.query(MemoryItem).filter(MemoryItem.user_email == user_email).all()
            if m.fact
        }

        def add_if_new(category: str, fact_str: str = "", confidence: float = 0.95, fact: str = ""):
            text = (fact_str or fact).strip()
            if text and text.lower() not in existing_facts:
                item = MemoryItem(user_email=user_email, category=category, fact=text, confidence=confidence)
                db.add(item)
                existing_facts.add(text.lower())
                extracted.append(item)

        # 1. Contact & Relationship Extraction (e.g. "wife ka number 8949546909", "mummy mobile is 9876543210")
        contact_patterns = [
            r'\b(wife|husband|mummy|mother|papa|father|bhai|brother|sister|friend|doctor|driver|manager|boss|[a-zA-Z]{3,15})\s*(?:ka\s*(?:phone|mobile|whatsapp)?\s*number|phone|mobile|contact|number)\s*(?:hai|is|=|:)?\s*([+0-9]{10,13})\b',
            r'\b([+0-9]{10,13})\s*(?:is\s*)?(?:my\s*)?(wife|husband|mummy|papa|brother|friend|[a-zA-Z]{3,15})\s*(?:ka\s*number|contact)\b',
            r'\b(?:save|add|store)\s+([a-zA-Z]{3,15})\s*(?:phone|mobile|number)?\s*([+0-9]{10,13})\b'
        ]
        for p in contact_patterns:
            matches = re.finditer(p, msg_lower)
            for m in matches:
                groups = m.groups()
                # Determine which group is the phone number and which is the name
                if groups[0].isdigit() or groups[0].startswith("+"):
                    phone_val = groups[0]
                    name_val = groups[1]
                else:
                    name_val = groups[0]
                    phone_val = groups[1]
                
                # Normalize phone
                clean_phone = re.sub(r'[^\d+]', '', phone_val)
                if len(clean_phone) >= 10:
                    fact_str = f"Contact: {name_val.capitalize()} -> {clean_phone}"
                    add_if_new(category="contact", fact=fact_str, confidence=0.99)

        # 2. Daily Habits & Routines (e.g. "2 liter water daily", "har din subah exercise")
        routine_patterns = [
            r'(?:har din|roz|daily|everyday|every morning)\s+(?:main\s+)?([^\.\,]+)',
            r'i (?:usually|always|every day)\s+([^\.\,]+)',
            r'my routine is\s+([^\.\,]+)',
            r'\b([0-9]+\s*(?:liter|litre|glass|km|mins?)\s*(?:water|walk|exercise|study)?\s*(?:daily|roz|har din))\b'
        ]
        for p in routine_patterns:
            m = re.search(p, msg_lower)
            if m:
                fact_str = f"Daily Routine: {m.group(1).strip()}"
                add_if_new(category="routine", fact=fact_str, confidence=0.95)

        # 3. Personal Preferences
        pref_patterns = [
            r'(?:mujhe|mera)\s+([^\.\,]+?)\s+(?:pasand hai|achha lagta hai|favourite hai)',
            r'i (?:prefer|like|love)\s+([^\.\,]+)',
            r'my preference is\s+([^\.\,]+)'
        ]
        for p in pref_patterns:
            m = re.search(p, msg_lower)
            if m:
                fact_str = f"Preference: {m.group(1).strip()}"
                add_if_new(category="preference", fact=fact_str, confidence=0.92)

        # 4. Schedule / Working Hours
        schedule_patterns = [
            r'(?:office|kaam|work|shift)\s+(?:starts at|shuru hota hai|time hai)\s+([0-9\:]+\s*(?:am|pm)?)',
            r'(?:sleep at|so jaata hoon)\s+([0-9\:]+\s*(?:am|pm)?)'
        ]
        for p in schedule_patterns:
            m = re.search(p, msg_lower)
            if m:
                fact_str = f"Schedule Info: {m.group(0).strip()}"
                add_if_new(category="schedule", fact=fact_str, confidence=0.90)

        if extracted:
            db.commit()
            print(f"[ChatSorter] Automatically extracted {len(extracted)} episodic facts for {user_email}")

        return extracted
