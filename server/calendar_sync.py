"""
Aether Google Calendar Integration & Synchronization Engine
Generates direct Google Calendar actions, template links, and synchronization bridges.
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.1 External Tool Integrations)
"""

import os
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional


class GoogleCalendarService:
    """Manages Google Calendar event creation, direct URL generation, and sync."""

    @staticmethod
    def generate_calendar_template_url(
        title: str, 
        start_time: datetime, 
        end_time: Optional[datetime] = None, 
        description: str = "",
        location: str = ""
    ) -> str:
        """
        Generates a direct 1-click Google Calendar Event Template URL.
        Works across all platforms (Web, Android, iOS, macOS) with zero OAuth friction.
        """
        if not end_time:
            end_time = start_time + timedelta(hours=1)

        # Format ISO UTC timestamps into Google format YYYYMMDDTHHMMSSZ
        start_str = start_time.strftime("%Y%m%dT%H%M%S")
        end_str = end_time.strftime("%Y%m%dT%H%M%S")

        params = {
            "action": "TEMPLATE",
            "text": title,
            "dates": f"{start_str}/{end_str}",
            "details": description,
            "location": location,
            "add": "aether"
        }
        query_string = urllib.parse.urlencode({k: v for k, v in params.items() if v})
        return f"https://calendar.google.com/calendar/render?{query_string}"

    @staticmethod
    def schedule_event(
        title: str,
        start_time_str: Optional[str] = None,
        date_str: Optional[str] = None,
        duration_minutes: int = 60,
        details: str = "",
        user_email: str = "operator@aether.local"
    ) -> Dict[str, Any]:
        """Schedules a calendar event, generating direct calendar integration links."""
        now = datetime.now()
        event_dt = now

        # Parse date
        if date_str:
            try:
                event_dt = datetime.fromisoformat(date_str)
            except Exception:
                pass

        # Parse time if provided
        if start_time_str:
            import re
            m = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?', start_time_str)
            if m:
                hr = int(m.group(1))
                mn = int(m.group(2)) if m.group(2) else 0
                mer = (m.group(3) or "").upper()
                if mer == "PM" and hr < 12:
                    hr += 12
                elif mer == "AM" and hr == 12:
                    hr = 0
                event_dt = event_dt.replace(hour=hr, minute=mn, second=0, microsecond=0)

        end_dt = event_dt + timedelta(minutes=duration_minutes)
        cal_url = GoogleCalendarService.generate_calendar_template_url(
            title=title,
            start_time=event_dt,
            end_time=end_dt,
            description=details or "Scheduled via Aether Autonomous AI Chief of Staff"
        )

        return {
            "title": title,
            "start_time": event_dt.isoformat(),
            "end_time": end_dt.isoformat(),
            "duration": duration_minutes,
            "google_calendar_url": cal_url,
            "formatted_time": event_dt.strftime("%I:%M %p, %a %d %b %Y"),
            "status": "scheduled"
        }
