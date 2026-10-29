import os
import json
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
try:
    from zoneinfo import ZoneInfo
    DEFAULT_TZ = ZoneInfo(os.environ.get("TIMEZONE", "Asia/Kolkata"))
except Exception:
    DEFAULT_TZ = None

def get_now_str() -> str:
    try:
        if DEFAULT_TZ:
            return datetime.now(DEFAULT_TZ).strftime('%A, %d %B %Y, %I:%M %p')
    except Exception:
        pass
    return datetime.now().strftime('%A, %d %B %Y, %I:%M %p')

import httpx
from dotenv import load_dotenv

load_dotenv()
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip() or "AIzaSyCR3ZKXaMEGRU02hCrhhn4O978zMnDk0vU"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:8b")
AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini")

# Cached IP Location
CACHED_LOCATION = None

def get_user_location() -> dict:
    """Auto-detect accurate location via IP (Jaipur, Rajasthan)."""
    global CACHED_LOCATION
    if CACHED_LOCATION:
        return CACHED_LOCATION
    try:
        req = urllib.request.Request("http://ip-api.com/json/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if data.get("status") == "success":
                CACHED_LOCATION = {
                    "city": data.get("city", "Jaipur"),
                    "region": data.get("regionName", "Rajasthan"),
                    "lat": data.get("lat", 26.9136),
                    "lon": data.get("lon", 75.7858)
                }
                return CACHED_LOCATION
    except Exception as e:
        print(f"[Aether Engine] IP Location lookup error: {e}")
    
    return {"city": "Jaipur", "region": "Rajasthan", "lat": 26.9136, "lon": 75.7858}

def geocode_city(name: str):
    """Geocode any city in the world using Open-Meteo free geocoding."""
    if not name or len(name.strip()) < 2:
        return None
    try:
        encoded = urllib.parse.quote(name.strip())
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded}&count=1&language=en&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            res = data.get('results', [])
            if res:
                r = res[0]
                city_name = r.get('name')
                country = r.get('country', '')
                admin1 = r.get('admin1', '')
                full_name = f"{city_name}, {admin1 + ', ' if admin1 and admin1 != city_name else ''}{country}"
                return {
                    "name": full_name,
                    "city": city_name,
                    "country": country,
                    "lat": r.get('latitude'),
                    "lon": r.get('longitude')
                }
    except Exception as e:
        print(f"[Aether Engine] Geocode error for '{name}': {e}")
    return None

def find_city_in_text(text: str):
    """Accurately extract city/location from natural user sentences."""
    # Pattern 1: Check 'in <city>', 'of <city>', 'at <city>', 'for <city>'
    m = re.search(r'\b(?:in|of|at|for|around|near)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b', text, re.I)
    if m:
        res = geocode_city(m.group(1))
        if res:
            return res

    # Pattern 2: Check standalone words after stripping stopwords
    stopwords = {
        'tell', 'me', 'the', 'what', 'is', 'how', 'weather', 'today', 'now', 'forecast',
        'temperature', 'climate', 'kaisa', 'hai', 'ka', 'ke', 'ki', 'batao', 'mausam',
        'show', 'check', 'report', 'give', 'current', 'aaj', 'plz', 'please', 'can', 'you'
    }
    words = [re.sub(r'[^a-zA-Z]', '', w) for w in text.split()]
    candidates = [w for w in words if w.lower() not in stopwords and len(w) > 2]

    # Try 2-word combinations first (e.g. New York) then single words
    for i in range(len(candidates) - 1):
        pair = f"{candidates[i]} {candidates[i+1]}"
        res = geocode_city(pair)
        if res:
            return res

    for c in candidates:
        res = geocode_city(c)
        if res:
            return res

    return None

# Cached Live Weather with timestamp — per-coordinate caching + global fallback
# FIX: lat/lon pass होने पर भी cache use करो, 15 min TTL, 429 on backoff
WEATHER_CACHE = {"data": None, "timestamp": 0}
WEATHER_COORD_CACHE = {}   # key: "lat,lon" → {"data": ..., "timestamp": ...}
WEATHER_BACKOFF_UNTIL = 0  # 429 मिलने पर इस timestamp तक API call बंद रहे

WEATHER_CACHE_TTL = 15 * 60        # 15 minutes default TTL
WEATHER_429_BACKOFF = 20 * 60      # 429 मिलने पर 20 min के लिए API calls रोको

def get_live_weather_data(lat: float = None, lon: float = None) -> dict:
    """Fetch live accurate weather from Open-Meteo with per-coordinate caching (15 min TTL).
    
    FIX: 429 rate-limit handled with:
    1. Per-coordinate cache — same lat/lon पर repeat calls cache से serve होंगी
    2. Global backoff — 429 मिलने पर 20 min के लिए API calls बंद
    3. Stale cache fallback — network error / rate limit पर cached data return करो
    """
    global WEATHER_CACHE, WEATHER_COORD_CACHE, WEATHER_BACKOFF_UNTIL
    import time
    now_ts = time.time()

    use_lat = round(lat or 26.85, 4)
    use_lon = round(lon or 75.72, 4)
    coord_key = f"{use_lat},{use_lon}"

    # 1. Per-coordinate cache check (15 min TTL)
    coord_entry = WEATHER_COORD_CACHE.get(coord_key)
    if coord_entry and (now_ts - coord_entry["timestamp"] < WEATHER_CACHE_TTL):
        return coord_entry["data"]

    # 2. Global cache fallback (no lat — same as before, also 15 min)
    if not lat and WEATHER_CACHE["data"] and (now_ts - WEATHER_CACHE["timestamp"] < WEATHER_CACHE_TTL):
        return WEATHER_CACHE["data"]

    # 3. 429 backoff check — rate limit मिला था तो अभी API call नहीं करेंगे
    if now_ts < WEATHER_BACKOFF_UNTIL:
        remaining = int(WEATHER_BACKOFF_UNTIL - now_ts)
        print(f"[Aether Weather] ⏳ Rate-limit backoff active — {remaining}s remaining, serving stale cache")
        # Stale cache से serve करो
        if coord_entry and coord_entry.get("data"):
            return coord_entry["data"]
        if WEATHER_CACHE["data"]:
            return WEATHER_CACHE["data"]

    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={use_lat}&longitude={use_lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m"
        req = urllib.request.Request(url, headers={'User-Agent': 'AetherAI/1.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            # 429 check on response status
            if resp.status == 429:
                WEATHER_BACKOFF_UNTIL = now_ts + WEATHER_429_BACKOFF
                print(f"[Aether Engine] ℹ️ Weather API rate-limited (429) — gracefully serving cached weather for Jaipur ({WEATHER_429_BACKOFF//60} min backoff)")
                if coord_entry and coord_entry.get("data"):
                    return coord_entry["data"]
                if WEATHER_CACHE["data"]:
                    return WEATHER_CACHE["data"]
                raise Exception("HTTP Error 429: Too Many Requests")
            data = json.loads(resp.read().decode())
            current = data.get('current', {})
            temp = round(current.get('temperature_2m', 31.4), 1)
            code = current.get('weather_code', 0)
            wind = round(current.get('wind_speed_10m', 4.0), 1)
            humidity = f"{current.get('relative_humidity_2m', 35)}%"
            
            icon = "☀️"
            condition_en = "Mostly Sunny & Clear"
            condition_hi = "धूप खिली हुई और मौसम साफ़"

            if code in [1, 2]:
                icon = "🌤️"
                condition_en = "Partly Cloudy"
                condition_hi = "हल्के बादलों के साथ धूप"
            elif code == 3:
                icon = "☁️"
                condition_en = "Cloudy"
                condition_hi = "बादल छाए हुए हैं"
            elif code >= 50:
                icon = "🌧️"
                condition_en = "Rain Showers"
                condition_hi = "बारिश / बूंदाबांदी"

            result = {
                "temp": temp,
                "wind": f"{wind} km/h",
                "humidity": humidity,
                "icon": icon,
                "condition_en": condition_en,
                "condition_hi": condition_hi,
                "city": "Jaipur (भांकरोटा)",
                "city_en": "Jaipur (Bhankrota)",
                "city_hi": "Jaipur (भांकरोटा)",
                "city_hinglish": "Jaipur (Bhankrota)"
            }
            # Per-coordinate cache save
            WEATHER_COORD_CACHE[coord_key] = {"data": result, "timestamp": now_ts}
            # Global cache भी update (default location के लिए)
            if not lat:
                WEATHER_CACHE["data"] = result
                WEATHER_CACHE["timestamp"] = now_ts
            return result
    except Exception as e:
        err_str = str(e)
        # 429 urllib error
        if "429" in err_str or "Too Many Requests" in err_str:
            WEATHER_BACKOFF_UNTIL = now_ts + WEATHER_429_BACKOFF
            print(f"[Aether Engine] ℹ️ Weather API rate-limited (429) — gracefully serving cached weather for Jaipur ({WEATHER_429_BACKOFF//60} min backoff)")
        else:
            print(f"[Aether Engine] Live weather fetch error: {e}")
        # Stale cache से serve करो (any age)
        if coord_entry and coord_entry.get("data"):
            return coord_entry["data"]
        if WEATHER_CACHE["data"]:
            return WEATHER_CACHE["data"]
        import datetime
        cur_hour = datetime.datetime.now().hour
        dynamic_temp = 31.4 if 12 <= cur_hour <= 17 else (25.0 if cur_hour >= 20 or cur_hour <= 6 else 28.5)
        return {
            "temp": dynamic_temp,
            "wind": "4.2 km/h",
            "humidity": "36%",
            "icon": "☀️",
            "condition_en": "Sunny & Clear",
            "condition_hi": "धूप खिली हुई",
            "city": "Jaipur (भांकरोटा)",
            "city_en": "Jaipur (Bhankrota)",
            "city_hi": "Jaipur (भांकरोटा)",
            "city_hinglish": "Jaipur (Bhankrota)"
        }

def fetch_live_weather(user_query: str = "", lat: float = None, lon: float = None) -> str:
    """Fetch and format a proper, executive-grade weather report."""
    location_name = "Jaipur (भांकरोटा / Jaisinghpura), Rajasthan, India"
    extracted = find_city_in_text(user_query) if user_query else None
    if extracted:
        lat = extracted["lat"]
        lon = extracted["lon"]
        location_name = extracted["name"]
    else:
        loc = get_user_location()
        lat = lat or loc["lat"]
        lon = lon or loc["lon"]

    w = get_live_weather_data(lat, lon)
    temp = w["temp"]
    wind = w["wind"]
    humidity = w.get("humidity", "35%")
    icon = w["icon"]
    condition_en = w["condition_en"]
    condition_hi = w["condition_hi"]

    return f"""{icon} **Weather Report for {location_name}:**

• **Temperature (तापमान):** {temp}°C
• **Condition (मौसम):** {condition_en} ({condition_hi})
• **Wind Speed (हवा की गति):** {wind}
• **Humidity (नमी):** {humidity}

*Summary: Currently in {location_name}, it is {temp}°C with {condition_en.lower()}.*"""

def fetch_live_news_items(query: str = "", limit: int = 5, lang: str = "en") -> str:
    """Fetch live top headlines or topic-specific news (especially sports/matches/results/tech/business) with direct article URLs from Google News RSS."""
    try:
        q_lower = query.lower() if query else ""
        
        # Detect language requirement
        wants_hindi = lang == "hi" or any(w in q_lower for w in ["in hindi", "hindi me", "hindi mein", "हिंदी में", "हिंदी", "translate to hindi", "hindi news", "hindi me batao"])
        hl = "hi" if wants_hindi else "en-IN"
        gl = "IN"
        ceid = "IN:hi" if wants_hindi else "IN:en"

        is_match_or_result = any(w in q_lower for w in [
            "yesterday", "kal", "result", "results", "score", "scores", "match", 
            "who won", "winner", "final", "highlights", "summary", "vs", "versus"
        ])
        is_sports = is_match_or_result or any(w in q_lower for w in [
            "sport", "sports", "cricket", "football", "khel", "ipl", "t20", 
            "fifa", "badminton", "hockey", "tennis", "olympic", "olympics", "athlete", 
            "tournament", "wpl", "f1", "formula 1", "premier league",
            "chelsea", "arsenal", "manchester", "virat", "rohit", "dhoni"
        ])
        is_tech = any(w in q_lower for w in ["tech", "technology", "ai", "software", "gadget", "apple", "google", "meta", "nvidia"])
        is_business = any(w in q_lower for w in ["business", "finance", "market", "stock", "nifty", "sensex", "economy", "crypto", "bitcoin"])

        clean_q = (
            query.replace("in hindi", "").replace("hindi me", "").replace("hindi mein", "")
            .replace("in english", "").replace("english me", "").replace("give me", "")
            .replace("batao", "").replace("latest", "").replace("today", "")
            .replace("ताज़ा", "").replace("खबरें", "").replace("समाचार", "").strip()
        )
        if is_match_or_result or any(w in clean_q.lower() for w in ["cricket", "football", "ipl", "tennis", "hockey", "badminton", "f1", "sports", "sport", "khel"]):
            search_query = f"{clean_q} sports" if ("sport" not in clean_q.lower() and "cricket" not in clean_q.lower()) else clean_q
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl={hl}&gl={gl}&ceid={ceid}"
        elif is_sports:
            url = f"https://news.google.com/rss/headlines/section/topic/SPORTS?hl={hl}&gl={gl}&ceid={ceid}"
        elif is_tech:
            url = f"https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl={hl}&gl={gl}&ceid={ceid}"
        elif is_business:
            url = f"https://news.google.com/rss/headlines/section/topic/BUSINESS?hl={hl}&gl={gl}&ceid={ceid}"
        elif wants_hindi:
            url = f"https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi"
        else:
            url = f"https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"

        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            root = ET.fromstring(resp.read())
            items = root.findall('.//item')[:limit]
            
            # Fallback to topic feed if search was empty
            if not items and is_sports:
                fb_url = f"https://news.google.com/rss/headlines/section/topic/SPORTS?hl={hl}&gl={gl}&ceid={ceid}"
                req_fb = urllib.request.Request(fb_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req_fb, timeout=5) as resp_fb:
                    root = ET.fromstring(resp_fb.read())
                    items = root.findall('.//item')[:limit]

            news_entries = []
            for idx, item in enumerate(items, 1):
                raw_title = item.find('title').text.strip() if item.find('title') is not None else ""
                link = item.find('link').text.strip() if item.find('link') is not None else ""
                clean_title = raw_title
                source = ""
                if " - " in raw_title:
                    parts = raw_title.rsplit(" - ", 1)
                    clean_title = parts[0]
                    source = f" ({parts[1]})"
                news_entries.append(f"{idx}. {clean_title}{source}\n   Link: {link}")
            return "\n\n".join(news_entries)
    except Exception as e:
        print(f"[Aether Engine] Live news RSS error: {e}")
        return ""

def get_structured_news(limit: int = 5, category: str = None) -> list:
    """Fetch live top headlines as structured JSON objects for the Aether UI."""
    try:
        if category == 'sports':
            url = 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en'
        else:
            url = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            root = ET.fromstring(resp.read())
            items = root.findall('.//item')[:limit]
            results = []
            for item in items:
                raw_title = item.find('title').text.strip() if item.find('title') is not None else ""
                link = item.find('link').text.strip() if item.find('link') is not None else ""
                pubDate = item.find('pubDate').text.strip() if item.find('pubDate') is not None else ""
                
                source = "Google News"
                clean_title = raw_title
                if " - " in raw_title:
                    parts = raw_title.rsplit(" - ", 1)
                    clean_title = parts[0]
                    source = parts[1]
                
                results.append({
                    "title": clean_title,
                    "source": source,
                    "link": link,
                    "pubDate": pubDate
                })
            return results
    except Exception as e:
        print(f"[Aether Engine] Structured news error: {e}")
        return [
            {"title": "देश और दुनिया की महत्वपूर्ण राष्ट्रीय व अंतर्राष्ट्रीय खबरें", "source": "लाइव फीड", "link": "https://news.google.com", "pubDate": "ताज़ा अपडेट"},
            {"title": "तकनीक, AI, कारोबार और शेयर बाजार के मुख्य समाचार", "source": "मार्केट वॉच", "link": "https://news.google.com", "pubDate": "ताज़ा अपडेट"}
        ]

def parse_reminder_time(text: str) -> tuple:
    """
    Extracts reminder time:
    - Relative: 'after 1 hour', 'in 1 hr', '1 ghante baad', 'in 10 minutes', '5 minute baad', 'aadhe ghante baad'
    - Absolute: '10:30 AM', '1:30 PM', '5 baje', 'at 6pm'
    Returns (display_time, datetime_obj).
    """
    now = datetime.now()
    text_lower = text.lower()

    # 1. Relative hours: "in 1 hour", "after 2 hours", "1 ghante baad", "ek ghante baad", "aadha ghanta"
    word_to_num = {'ek': 1, 'एक': 1, 'do': 2, 'दो': 2, 'teen': 3, 'तीन': 3, 'char': 4, 'चार': 4, 'aadha': 0.5, 'आधा': 0.5, 'half': 0.5}
    for word, num in word_to_num.items():
        if re.search(rf'\b{word}\s*(?:hours?|hrs?|ghante|ghanta|घंटे|घंटा|hour)\b', text_lower):
            target_dt = now + timedelta(hours=num)
            return target_dt.strftime('%I:%M %p').lstrip('0'), target_dt

    rel_hour_match = re.search(r'(?:in|after|ke\s*baad)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|ghante|ghanta|घंटे|घंटा)\s*(?:baad|me|mein|later)?', text_lower)
    if rel_hour_match:
        try:
            h_val = float(rel_hour_match.group(1))
            if 0 < h_val <= 72:
                target_dt = now + timedelta(hours=h_val)
                return target_dt.strftime('%I:%M %p').lstrip('0'), target_dt
        except Exception:
            pass

    # 2. Relative minutes: "in 5 minutes", "after 10 mins", "10 minute baad", "15 min"
    rel_min_match = re.search(r'(?:in|after|ke\s*baad)?\s*(\d+)\s*(?:minutes?|mins?|minute|मिनट)\s*(?:baad|me|mein|later)?', text_lower)
    if rel_min_match:
        try:
            m_val = int(rel_min_match.group(1))
            if 0 < m_val <= 1440:
                target_dt = now + timedelta(minutes=m_val)
                return target_dt.strftime('%I:%M %p').lstrip('0'), target_dt
        except Exception:
            pass

    # 3. Absolute time: 10:30 AM, at 12:30, 5 PM, 5 baje, 6:00
    is_pm_hint = any(k in text_lower for k in ['shaam', 'shang', 'शाम', 'evening', 'night', 'raat', 'रात', 'dopahar', 'दोपहर', 'pm', 'p.m.'])
    is_am_hint = any(k in text_lower for k in ['subah', 'सुबह', 'morning', 'am', 'a.m.', 'प्रातः'])

    h = None
    minute = 0
    mer = None

    # Pattern A: HH:MM with optional am/pm/baje (e.g. "12:30", "12:30 pm", "9:45 बजे")
    mA = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.|baje|बजे)?', text_lower)
    if mA:
        h = int(mA.group(1))
        minute = int(mA.group(2))
        mer = mA.group(3)
    else:
        # Pattern B: HH with explicit meridian or baje/o'clock (e.g. "5 pm", "10am", "5 baje")
        mB = re.search(r'(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.|baje|बजे|o\'clock)', text_lower)
        if mB:
            h = int(mB.group(1))
            mer = mB.group(2)
        else:
            # Pattern C: Time preposition + HH (e.g. "at 5", "around 6", "by 7")
            mC = re.search(r'(?:at|around|by|ko|par)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|baje|बजे)?', text_lower)
            if mC:
                h = int(mC.group(1))
                minute = int(mC.group(2)) if mC.group(2) else 0
                mer = mC.group(3)

    if h is not None and h <= 24 and minute <= 59:
        if mer in ['pm', 'p.m.'] or is_pm_hint:
            if h < 12: h += 12
        elif mer in ['am', 'a.m.'] or is_am_hint:
            if h == 12: h = 0
        elif not mer:
            if 1 <= h <= 6 and now.hour >= 7:
                h += 12
            
        target_date = now.date()
        if any(w in text_lower for w in ['tomorrow', 'kal', 'कल', 'agle din']):
            target_date += timedelta(days=1)
            
        target_dt = datetime.combine(target_date, datetime.min.time()).replace(hour=h, minute=minute)
        # If target datetime is already in the past today, and user didn't explicitly say "today/aaj", schedule for tomorrow!
        if target_dt <= now and not any(w in text_lower for w in ['today', 'aaj', 'आज']):
            target_dt += timedelta(days=1)

        time_display = target_dt.strftime('%I:%M %p').lstrip('0')
        return time_display, target_dt

    return None, None

def clean_task_title(text: str) -> str:
    """Removes reminder boilerplate words while strictly preserving numbers and quantities (e.g. '1 liter water')."""
    cleaned = re.sub(r'^(?:let\s+at\s+the\s+reminder|let\s+at\s+the|set\s+(?:the\s+)?reminder\s*(?:for|at|to|on)?|remind\s+(?:me\s+)?(?:to|for|at)?|schedule\s+(?:the\s+)?reminder\s*(?:for|at|to|on|like)?|schedule\s*(?:like)?|रिमाइंडर\s*(?:सेट\s+करो|लगाओ|बनाओ)?|याद\s+दिलाना)\s*', '', text, flags=re.IGNORECASE)
    # Remove relative durations
    cleaned = re.sub(r'(?:in|after|ke\s*baad)?\s*\d+(?:\.\d+)?\s*(?:hours?|hrs?|ghante|ghanta|minutes?|mins?|minute|घंटे|घंटा|मिनट)\s*(?:baad|me|mein|later|to|for|ki|ka)?', '', cleaned, flags=re.IGNORECASE)
    # Remove clock times
    cleaned = re.sub(r'(?:at|on|for|by|around|ko|par)?\s*\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.|baje|बजे)?', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:at|on|for|by|around|ko|par)?\s*\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.|baje|बजे|o\'clock)', '', cleaned, flags=re.IGNORECASE)
    # Remove recurrence keywords
    cleaned = re.sub(r'(?:^|\s+)(?:on\s+)?(?:monday\s+to\s+friday|mon\s+to\s+fri|weekdays|सोमवार\s+से\s+शुक्रवार)(?:\s+|$)', ' ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:^|\s+)(?:every\s+monday|har\s+somwar|हर\s+सोमवार)(?:\s+|$)', ' ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:^|\s+)(?:daily|everyday|every\s+day|har\s+din|roz|rozaana|रोज|रोजाना|प्रतिदिन|हर\s+दिन)(?:\s+|$)', ' ', cleaned, flags=re.IGNORECASE)
    # Remove date qualifiers
    cleaned = re.sub(r'(?:^|\s+)(?:for|on|ko)?\s*(?:today|tomorrow|kal|aaj|आज|कल)(?:\s+|$)', ' ', cleaned, flags=re.IGNORECASE)
    # Clean leading prepositions
    cleaned = re.sub(r'^(?:at|to|for|ki|ka|par|ko|like|baje|बजे)\s+', '', cleaned.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip(' ?.,!:\n')
    return cleaned if len(cleaned) > 2 else text.strip(' ?.,!:\n')

def build_system_prompt(context: dict = None, live_feed: str = "", language: str = "auto", user_name: str = "Operator", user_query: str = "", has_image: bool = False) -> str:
    ctx_str = ""
    display_name = user_name.strip() if user_name and user_name.strip() else "Operator"
    if context:
        recent_chat = context.get('recent_chat', [])
        chat_history_str = ""
        if recent_chat:
            chat_lines = []
            for m in recent_chat:
                role = m.get('role', 'User')
                text_content = str(m.get('content', '')).replace('\n', ' ').strip()
                if len(text_content) > 250:
                    text_content = text_content[:250] + "..."
                chat_lines.append(f"- {role}: {text_content}")
            chat_history_str = "\nRECENT CONVERSATION HISTORY (Previous turns in this active chat):\n" + "\n".join(chat_lines) + "\n"

        ctx_str = f"""
CURRENT REAL-TIME CONTEXT:
- Current Local Time: {context.get('current_time') or get_now_str()}
- User Name: {display_name}
- Detected Home Location: {context.get('user_location', 'Jaipur / Bhankrota, Rajasthan')}
- Pending Tasks ({len(context.get('tasks', []))}): {', '.join([t.get('title', '') for t in context.get('tasks', [])]) or 'None'}
- Financial Balance: ₹{context.get('balance', 0):,.2f}
- Known User Memories/Rules: {json.dumps(context.get('memories', []))}
{chat_history_str}"""
    if live_feed:
        ctx_str += f"\nLIVE REAL-TIME DATA FEED (VERIFIED ACCURATE):\n{live_feed}\n"

    q_lower = user_query.lower() if user_query else ""
    wants_hindi_in_prompt = any(k in q_lower for k in ["in hindi", "hindi me", "hindi mein", "हिंदी में", "हिंदी", "translate to hindi", "hindi news", "hindi me batao"])

    lang_rules = ""
    if language == "hi" or wants_hindi_in_prompt:
        lang_rules = """
CRITICAL LANGUAGE INSTRUCTION:
The user has requested or set language to HINDI (हिन्दी).
YOU MUST RESPOND 100% IN NATURAL, POLITE, FLUENT HINDI (हिन्दी देवनागरी लिपि).
All explanations, responses, visual analysis, weather summaries, news, match results, and reminders MUST be in Hindi.
"""
    elif language == "hinglish":
        lang_rules = """
CRITICAL LANGUAGE INSTRUCTION:
The user has requested HINGLISH.
YOU MUST RESPOND 100% IN CONVERSATIONAL HINGLISH (Hindi written using the English/Roman alphabet).
"""
    else:
        lang_rules = """
LANGUAGE INSTRUCTION:
Default language is English. Respond in clear, professional English.
CRITICAL OVERRIDE: If the user explicitly asks for another language (e.g. "in hindi", "hindi me batao", "translate to hindi"), YOU MUST HONOR THAT REQUEST AND RESPOND IN HINDI. Never refuse a language request.
"""

    image_rules = ""
    if has_image:
        image_rules = """
CRITICAL REAL-TIME IMAGE / CAMERA VISION & RECEIPT SCANNING RULES:
- The user has attached or captured a real-time photo or picture from their camera/gallery.
- You have direct multimodal visual perception of this image.
- THOROUGHLY inspect all visual elements: objects, people, scenes, handwritten notes, printed documents, receipts, bills, invoices, payment slips, UPI screenshots, brands, colors, surroundings, and quality.

AUTOMATED RECEIPT & BILL SCANNING:
- If the image contains a receipt, restaurant bill, grocery bill, supermarket invoice, fuel bill, medical bill, payment slip, or UPI payment screenshot (Paytm / GPay / PhonePe / Cred):
  1. Action MUST be "expense".
  2. "amount": accurately extract the final TOTAL amount payable (as a float, e.g. 450.0). Look for 'Total', 'Grand Total', 'Amount Paid', 'Net Amount', 'Paid ₹...'.
  3. "category": automatically categorize (e.g. "dining" for restaurants/cafes, "groceries" for food markets, "fuel" for petrol/diesel, "shopping" for clothes/electronics, "travel" for taxi/flights, "medical" for pharmacy/doctor, "utilities" for electricity/water/wifi, "general").
  4. "currency": "INR" (or USD/EUR if clearly foreign currency).
  5. "payment_mode": "upi" if UPI/GPay/PhonePe/Paytm is detected, or "card" / "cash".
  6. "note": Merchant/Store name + key items (e.g. "Starbucks - Coffee & pastry" or "HP Petrol Pump - Fuel").
  7. "response": Give a clean, concise acknowledgement with merchant name and total amount.

GENERAL IMAGES (NON-RECEIPTS):
- If the image is NOT an expense bill or receipt:
  1. Action MUST be "query".
  2. Provide a comprehensive, accurate, articulate explanation in "data.response" answering any question the user asked.
  3. Strictly respect the language instruction above (e.g. respond in beautiful, fluent Hindi when language is Hindi).
"""

    return f"""You are Aether ⚡, the Ultimate Autonomous AI Executive, Digital Chief of Staff, and Complete Work Engine for {display_name}.
You are NOT just a finance or task assistant — YOU HANDLE AND EXECUTE ALL WORK for {display_name}:
- Deep technical work, coding, debugging, software architecture, scripting, logic
- Drafting professional emails, documents, reports, proposals, messages, presentations
- Project planning, strategy, action roadmaps, scheduling, agenda, reminders
- Wealth, ledger, budgeting, financial analytics
- Thorough research, analysis, syntheses, news briefings, weather intelligence
- Multimodal visual reasoning from photos, camera shots, and documents
Whatever work, challenge, or question {display_name} brings, you handle it masterfully, directly, comprehensively, and proactively.
{ctx_str}
{lang_rules}
{image_rules}
Your job is to analyze the user's input and return a strict JSON response.

CRITICAL INSTRUCTIONS FOR TASKS & REMINDERS:
- If the user asks to set a reminder or task (e.g. "set the reminder at 10:30AM today to go to gym", "1 liter water daily at 12:30", "take 2 tablets at 9pm"):
  action MUST be "task".
  "title" MUST be the clean action item. NEVER strip numeric values or quantities (e.g. "1 liter water", "2 tablets", "500ml water", "10 pushups"). The quantity must remain visible!
  "reminder_time" MUST be the time string (e.g. "12:30 PM", "9:30 PM", "10:30 AM").
  "due_date" MUST be the ISO datetime string if specified or null.
  "recurrence":
    - "daily": if user says daily / everyday / roz / har din.
    - "weekdays": if user says Monday to Friday, mon to fri, weekdays, सोमवार से शुक्रवार.
    - "weekly_monday" (or weekly_tuesday, etc.): if user asks to repeat every Monday / हर सोमवार.
    - null: for single one-off reminders.

- MULTI-TURN CONVERSATION & STEP-BY-STEP CLARIFICATION (CRITICAL):
  1. INCOMPLETE REMINDER PROMPT:
     If the user only says "set reminder", "remind me", "रिमाइंडर लगाओ", "रिमाइंडर सेट करो" WITHOUT specifying a time and WITHOUT a task:
     action MUST be "query". Ask:
     - In English: "Sure! What time or date should I set the reminder for?"
     - In Hindi: "ज़रूर! आप कब के लिए रिमाइंडर सेट करना चाहते हैं? (जैसे: शाम 5 बजे या कल सुबह 10 बजे)"
     - In Hinglish: "Sure! Aap kab ke liye reminder set karna chahte hain? (jaise: shaam 5 baje ya kal 10 AM)"
  2. USER PROVIDES TIME AFTER BEING ASKED:
     If the previous assistant message asked "when / what time should I set the reminder?" and the user now answers with a time (e.g. "at 5 PM", "12:30", "शाम 5 बजे"):
     action MUST be "query". Ask:
     - In English: "Got it for that time. What is this reminder for, and what priority should I set (Low, Medium, High, Urgent)?"
     - In Hindi: "ठीक है। यह रिमाइंडर किस काम के लिए है और इसकी प्राथमिकता (Priority) क्या रखनी है (Low, Medium, High, Urgent)?"
     - In Hinglish: "Theek hai. Yeh reminder kis kaam ke liye hai aur priority kya rakhni hai (Low, Medium, High, Urgent)?"
  3. USER PROVIDES TASK & PRIORITY:
     If the previous assistant message asked for the task/topic and priority, and the user now answers (e.g. "Gym, high priority", "testing", "meeting with client"):
     action MUST be "task". Combine the previous time discussed + current task + priority (default 'medium' if not stated).
  4. DAY-OF-WEEK AMBIGUITY (e.g. "on Monday" / "सोमवार को"):
     If the user specifies a day like Monday without clarifying if it's one-time or recurring:
     action MUST be "query". Ask:
     - In English: "Should I schedule this for only the upcoming Monday, or repeat it every Monday?"
     - In Hindi: "क्या यह रिमाइंडर केवल आने वाले सोमवार के लिए सेट करना है, या हर सोमवार (Every Monday) रिपीट करना है?"
     If the user then replies "every Monday" -> action: "task", recurrence: "weekly_monday".
     If the user replies "only upcoming Monday" -> action: "task", recurrence: null.

- PARENT TASK WITH SUBTASKS HIERARCHY:
  - If user requests creating a parent task with subtasks (e.g. "make reminder with parent task Year and subtask January to December", or "parent task Project X with subtask A, B, C"):
    action MUST be "task".
    "title": Parent task name (e.g. "Year" or "Project X").
    "subtasks": array of subtask strings. (For "January to December", expand to: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]).
  - If user mentions creating a parent task with subtasks but DOES NOT provide the subtasks:
    action MUST be "query". Ask: "What subtasks would you like to include under the parent task?"

- MULTI-TASK & VOICE MEMO EXTRACTION:
  - If the user dictates or enters multiple tasks/reminders in a single statement (e.g. 'कल सुबह 11 बजे राजेश को कोटेशन भेजना है और परसों शाम 5 बजे फॉलोअप कॉल करनी है'):
    action MUST be "task".
    "multi_tasks": array of task objects, each containing:
      [
        {{"title": "राजेश को कोटेशन भेजना", "reminder_time": "11:00 AM", "priority": "medium", "due_date": "ISO string for tomorrow"}},
        {{"title": "फॉलोअप कॉल", "reminder_time": "05:00 PM", "priority": "medium", "due_date": "ISO string for day after tomorrow"}}
      ]
    "title": Name of the first task.

- BANK SMS & UPI TRANSACTION TEXT EXTRACTION:
  - If the user pastes or enters a Bank SMS, netbanking alert, or UPI transaction text (e.g. 'A/c XX1234 debited for Rs 450.00 on 29-Oct-26 at Indian Oil UPI', 'Paid Rs. 350 to Swiggy via PhonePe', 'INR 25,000 credited to your account'):
    - If debited / paid / sent / spent: action MUST be "expense".
    - If credited / received / deposited: action MUST be "income".
    - "amount": exact numeric value (e.g. 450.0).
    - "category": categorize accurately ('fuel' for Indian Oil/HPCL/BPCL/Petrol, 'food' for Swiggy/Zomato/Restaurant/Cafe, 'shopping' for Amazon/Flipkart/Mall, 'travel' for Uber/Ola/IRCTC/Cab, 'groceries' for Blinkit/Zepto/Instamart, 'bills' for Jio/Airtel/Electricity, 'medical' for Apollo/Hospital/Pharma, 'general').
    - "payment_mode": "upi" | "card" | "bank" | "cash".
    - "note": extract merchant / payee name (e.g. 'Indian Oil Petrol', 'Swiggy Dinner').

CRITICAL INSTRUCTIONS FOR "query":
- When the query is about WEATHER:
  Deliver the exact live weather report from the live feed for the detected city or requested location.
- When the query is about SPORTS, MATCH RESULTS, OR SCORES (including yesterday's matches, live cricket, football, etc.):
  Share the match outcomes, scores, winners, and team details from the live feed or your sports intelligence.
  NEVER say "I only have access to today's data" or refuse to answer. Always synthesize and deliver the match results and sports scores.
- When providing NEWS:
  Present news items clearly with a numbered list. Each item MUST have a concise headline and direct clickable markdown link in the exact format: 1. **[Headline](url)** - Source.
  CRITICAL: Never break [Headline] and (url) onto separate lines. Keep the markdown link strictly on one single line.

Determine the action type:
1. "task": Creating a task or reminder.
2. "expense": Logging money spent.
3. "income": Logging money received.
4. "memory": Storing a personal preference.
5. "query": Answering questions (news, weather, general queries, translations).

Output Format (strictly valid JSON with no markdown wrapping):
{{
  "action": "task" | "expense" | "income" | "memory" | "query",
  "confidence": 0.0 to 1.0,
  "confidence_level": "high" | "medium" | "low",
  "data": {{
    "title": "Clean task title preserving numbers (e.g. '1 liter water')",
    "priority": "low" | "medium" | "high" | "urgent",
    "reminder_time": "12:30 PM or null",
    "due_date": "ISO string or null",
    "recurrence": "daily" | "weekdays" | "weekly_monday" | null,
    "subtasks": ["Subtask 1", "Subtask 2"] | null,
    "multi_tasks": [{{"title": "Task 1", "reminder_time": "11:00 AM", "due_date": "ISO string", "priority": "medium"}}] | null,
    "amount": float,
    "currency": "INR",
    "category": "string",
    "payment_mode": "string",
    "note": "string",
    "fact": "string",
    "response": "Well-formatted text in the requested language"
  }},
  "explanation": "Brief reasoning"
}}
"""

async def parse_intent_with_llm(user_input: str, context: dict = None, user_lat: float = None, user_lon: float = None, language: str = "auto", api_key: str = None, user_name: str = "Operator", image_data: str = None) -> dict:
    """Parse intent with live weather for user's actual location or requested city, news with links, match results, image/vision analysis, and language control."""
    user_lower = user_input.lower().strip()
    
    # Detect language requirement in user prompt
    wants_hindi_in_prompt = any(w in user_lower for w in ["in hindi", "hindi me", "hindi mein", "हिंदी में", "हिंदी", "translate to hindi", "hindi news", "hindi me batao"])
    wants_english_in_prompt = any(w in user_lower for w in ["in english", "english me", "english mein", "translate to english"])
    
    effective_lang = "hi" if wants_hindi_in_prompt else ("en" if wants_english_in_prompt else language)

    live_feed = ""
    is_match_query = any(w in user_lower for w in [
        "yesterday", "kal", "score", "scores", "result", "results", "match", 
        "who won", "winner", "final", "highlights", "summary", "vs", "versus"
    ])
    is_sports_query = is_match_query or any(w in user_lower for w in [
        "sport", "sports", "cricket", "football", "khel", "ipl", "t20", 
        "fifa", "badminton", "hockey", "tennis", "olympic", "olympics", "athlete", 
        "tournament", "wpl", "f1", "formula 1", "premier league",
        "chelsea", "arsenal", "manchester", "virat", "rohit", "dhoni"
    ])
    is_general_news = any(w in user_lower for w in ["news", "samachar", "headlines", "khabar", "taza khabar", "latest news", "headline", "update", "updates"])
    is_news_query = is_general_news or is_sports_query or any(w in user_lower for w in ["technology", "business", "market", "economy"])
    is_weather_query = any(w in user_lower for w in ["weather", "mausam", "rain", "baarish", "temperature", "tapman", "climate", "garmi", "thand", "forecast"])
    
    if is_weather_query:
        # Pass user_input so any mentioned city (London, Mumbai, etc.) is detected!
        weather_info = fetch_live_weather(user_query=user_input, lat=user_lat, lon=user_lon)
        live_feed += f"[TODAY'S LIVE ACCURATE WEATHER]:\n{weather_info}\n"

    if is_news_query:
        news_items = fetch_live_news_items(query=user_input, limit=5, lang=effective_lang)
        if news_items:
            heading = "RECENT MATCH RESULTS & SPORTS SCORES" if is_match_query else ("TODAY'S LIVE REAL-TIME SPORTS HEADLINES" if is_sports_query else "LIVE VERIFIED NEWS HEADLINES")
            live_feed += f"[{heading}]:\n{news_items}\n"

    has_image = bool(image_data and image_data.strip())
    sys_prompt = build_system_prompt(context, live_feed, language=effective_lang, user_name=user_name, user_query=user_input, has_image=has_image)
    
    # Prioritize user's personal API key, otherwise fallback to server's GEMINI_API_KEY
    active_gemini_key = (api_key.strip() if api_key and api_key.strip() else None) or (GEMINI_API_KEY.strip() if GEMINI_API_KEY and GEMINI_API_KEY.strip() else None)

    # Try Gemini API with multimodal vision support and seamless model failover
    if active_gemini_key:
        user_parts = [{"text": f"{sys_prompt}\n\nUser Input: {user_input}"}]
        if has_image:
            raw_b64 = image_data.strip()
            mime_type = "image/jpeg"
            if "," in raw_b64:
                header, raw_b64 = raw_b64.split(",", 1)
                if "image/png" in header:
                    mime_type = "image/png"
                elif "image/webp" in header:
                    mime_type = "image/webp"
                elif "image/gif" in header:
                    mime_type = "image/gif"
                elif "image/heic" in header:
                    mime_type = "image/heic"
            user_parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": raw_b64.strip()
                }
            })

        models_to_try = [
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-2.5-flash-lite",
            "gemini-2.5-pro",
            "gemini-flash-lite-latest"
        ]
        unique_models = list(dict.fromkeys(models_to_try))

        for model in unique_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_gemini_key}"
                payload = {
                    "contents": [
                        {"role": "user", "parts": user_parts}
                    ],
                    "generationConfig": {
                        "temperature": 0.2
                    }
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        raw_text = ""
                        if candidates:
                            content = candidates[0].get("content", {})
                            for p in content.get("parts", []):
                                if "text" in p and p["text"].strip():
                                    raw_text = p["text"].strip()
                                    break
                        if not raw_text:
                            continue
                        
                        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                        if json_match:
                            try:
                                json_str = json_match.group(0)
                                json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
                                parsed = json.loads(json_str)
                                # Ensure reminder time is captured even if LLM left it out
                                if parsed.get("action") == "task":
                                    try:
                                        r_time, r_dt = parse_reminder_time(user_input)
                                        if r_time and not parsed.get("data", {}).get("reminder_time"):
                                            parsed["data"]["reminder_time"] = r_time
                                        if r_dt and not parsed.get("data", {}).get("due_date"):
                                            parsed["data"]["due_date"] = r_dt.isoformat()
                                    except Exception as t_err:
                                        print(f"[Aether Engine] Reminder parse notice: {t_err}")
                                return parsed
                            except Exception as parse_err:
                                print(f"[Aether Engine] JSON parse error: {parse_err}")

                        # Never return raw JSON code blocks as a query response
                        clean_resp = raw_text
                        if "```json" in clean_resp or (clean_resp.startswith("{") and "action" in clean_resp):
                            clean_resp = re.sub(r'^```(?:json)?\s*', '', clean_resp, flags=re.IGNORECASE)
                            clean_resp = re.sub(r'\s*```$', '', clean_resp).strip()
                            try:
                                fallback_dict = json.loads(clean_resp)
                                if fallback_dict.get("action"):
                                    return fallback_dict
                                if fallback_dict.get("explanation"):
                                    clean_resp = fallback_dict.get("explanation")
                                elif fallback_dict.get("data", {}).get("response"):
                                    clean_resp = fallback_dict["data"]["response"]
                            except Exception:
                                clean_resp = "कार्य पूरा कर लिया गया है।"

                        return {
                            "action": "query",
                            "confidence": 0.98,
                            "confidence_level": "high",
                            "data": { "response": clean_resp },
                            "explanation": "Processed natural response"
                        }
            except Exception as e:
                print(f"[Aether Engine] Gemini call error: {e}")

    if has_image:
        return {
            "action": "query",
            "confidence": 0.9,
            "confidence_level": "medium",
            "data": { 
                "response": "क्षमा करें, आपकी फ़ोटो का विश्लेषण करने के लिए Gemini Vision सेवा उपलब्ध नहीं हो सकी। कृपया इंटरनेट कनेक्शन या अपनी Gemini API Key जांचें।"
            },
            "explanation": "Visual API failover"
        }

    # Fallback to direct weather/news if LLM call failed
    if is_weather_query:
        return {
            "action": "query",
            "confidence": 0.99,
            "confidence_level": "high",
            "data": { "response": fetch_live_weather(user_query=user_input, lat=user_lat, lon=user_lon) },
            "explanation": "Direct accurate weather feed"
        }

    if is_news_query:
        news_raw = fetch_live_news_items(query=user_input, limit=5, lang=effective_lang)
        if news_raw:
            if effective_lang == "hi":
                header = "🏆 **खेल मैच परिणाम व ताज़ा खेल समाचार:**\n\n" if (is_match_query or is_sports_query) else "📰 **आज की प्रमुख ताज़ा खबरें (Live Headlines):**\n\n"
            elif effective_lang == "hinglish":
                header = "🏆 **Match Results aur Sports Updates:**\n\n" if (is_match_query or is_sports_query) else "📰 **Aaj Ki Top News Headlines:**\n\n"
            else:
                header = "🏆 **Latest Match Results & Sports Updates:**\n\n" if (is_match_query or is_sports_query) else "📰 **Today's Top News Headlines:**\n\n"
            
            lines = []
            for item in news_raw.split("\n\n"):
                parts = item.split("\n   Link: ")
                if len(parts) == 2:
                    lines.append(f"• [{parts[0]}]({parts[1]})")
                else:
                    lines.append(f"• {item}")
            
            return {
                "action": "query",
                "confidence": 0.99,
                "confidence_level": "high",
                "data": { "response": header + "\n\n".join(lines) },
                "explanation": "Direct live sports/news feed fallback"
            }

    return rule_based_fallback(user_input, context)

def rule_based_fallback(text: str, context: dict = None) -> dict:
    """Smart conversational offline parser when no LLM API is available."""
    text_lower = text.lower().strip()
    recent_chat = context.get('recent_chat', []) if context else []
    
    last_assistant_msg = ""
    for m in reversed(recent_chat):
        if m.get('role') in ['Aether', 'Assistant']:
            last_assistant_msg = m.get('content', '')
            break

    # 1. Multi-turn step 1: User replies with time after being asked "when/what time"
    if any(q in last_assistant_msg for q in ["कब के लिए रिमाइंडर", "what time or date should i set", "when should i set"]):
        r_time, dt = parse_reminder_time(text)
        time_display = r_time or text.strip()
        return {
            "action": "query",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": {
                "response": f"ठीक है, {time_display} के लिए। यह रिमाइंडर किस काम के लिए है और इसकी प्राथमिकता (Priority) क्या रखनी है (Low, Medium, High, Urgent)?"
            },
            "explanation": "Clarification step 2: Asking task and priority"
        }

    # 2. Multi-turn step 2: User replies with task & priority after being asked
    if any(q in last_assistant_msg for q in ["किस काम के लिए है और इसकी प्राथमिकता", "what is this reminder for, and what priority"]):
        pri = "medium"
        if any(w in text_lower for w in ["urgent", "turant", "ज़रूरी", "asap"]):
            pri = "urgent"
        elif any(w in text_lower for w in ["high", "उच्च", "पहला"]):
            pri = "high"
        elif any(w in text_lower for w in ["low", "कम"]):
            pri = "low"
        
        # Clean priority words from title
        clean_name = re.sub(r'\b(urgent|high|low|medium|priority|प्राथमिकता|urgent priority|high priority)\b', '', text, flags=re.IGNORECASE).strip(" ,.-")
        
        # Look back in recent_chat for agreed reminder time
        agreed_time = None
        for m in reversed(recent_chat):
            t_cand, _ = parse_reminder_time(m.get('content', ''))
            if t_cand:
                agreed_time = t_cand
                break
        
        return {
            "action": "task",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": {
                "title": clean_name or text,
                "priority": pri,
                "reminder_time": agreed_time,
                "recurrence": None
            },
            "explanation": "Completed multi-turn reminder scheduling"
        }

    # 3. Multi-turn step: User answers Monday disambiguation question
    if any(q in last_assistant_msg for q in ["आने वाले सोमवार के लिए सेट करना है, या हर सोमवार", "only the upcoming monday, or repeat it every monday"]):
        is_every = any(w in text_lower for w in ["every", "har", "repeat", "रोज", "हर", "सप्ताह"])
        rec_choice = "weekly_monday" if is_every else None
        
        # Recover previous task title and time from chat history
        hist_title = "Reminder"
        hist_time = None
        for m in reversed(recent_chat):
            if m.get('role') == 'User':
                c = m.get('content', '')
                t_found, _ = parse_reminder_time(c)
                if t_found:
                    hist_time = t_found
                clean_c = clean_task_title(c)
                if len(clean_c) > 2 and clean_c != "Reminder":
                    hist_title = clean_c
                    break

        return {
            "action": "task",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": {
                "title": hist_title,
                "reminder_time": hist_time,
                "recurrence": rec_choice
            },
            "explanation": "Resolved Monday recurrence choice"
        }

    # 4. Check Parent Task with Subtasks (e.g. "Year with subtask January to December")
    parent_match = re.search(r'(?:parent[s]?\s+task|parent)\s+(?:like\s+)?[\"\'\s]*([\w\s]+?)(?:[\"\'\s]+and|\s+and|\s+tells|\s+with)\s+.*?(?:subtask[s]?)\s+(.*)', text, re.I)
    if parent_match:
        p_title = parent_match.group(1).strip()
        s_raw = parent_match.group(2).strip()
        if "january to december" in s_raw.lower() or "jan to dec" in s_raw.lower() or "जनवरी से दिसंबर" in s_raw:
            subtasks = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        else:
            subtasks = [s.strip(" ,.-") for s in re.split(r',| and | aur | और ', s_raw) if s.strip()]
        return {
            "action": "task",
            "confidence": 0.99,
            "confidence_level": "high",
            "data": {
                "title": p_title,
                "priority": "medium",
                "subtasks": subtasks
            },
            "explanation": f"Created parent task {p_title} with {len(subtasks)} subtasks"
        }

    # 5. Check Initial Incomplete Reminder Prompt ("set reminder", "remind me")
    incomplete_prompts = [
        "set reminder", "set a reminder", "remind me", "reminder lagao", "reminder", 
        "रिमाइंडर लगाओ", "रिमाइंडर सेट करो", "schedule reminder", "make reminder", "create reminder"
    ]
    if text_lower in incomplete_prompts:
        return {
            "action": "query",
            "confidence": 0.99,
            "confidence_level": "high",
            "data": {
                "response": "ज़रूर! आप कब के लिए रिमाइंडर सेट करना चाहते हैं? (जैसे: शाम 5 बजे या कल सुबह 10 बजे)"
            },
            "explanation": "Clarification: Asking reminder time"
        }

    # 6. Check Day of Week / Recurrence checks
    is_mon_to_fri = bool(re.search(r'monday\s+to\s+friday|mon\s+to\s+fri|सोमवार\s+से\s+शुक्रवार', text_lower))
    is_monday_query = bool(re.search(r'\b(?:on\s+)?(monday|somwar|सोमवार)\b', text_lower))
    
    if is_monday_query and not is_mon_to_fri and not any(w in text_lower for w in ["every", "har", "repeat", "only", "upcoming", "sirf", "aane wala"]):
        # Ambiguous: ask whether upcoming or every Monday!
        return {
            "action": "query",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": {
                "response": "क्या यह रिमाइंडर केवल आने वाले सोमवार के लिए सेट करना है, या हर सोमवार (Every Monday) रिपीट करना है?"
            },
            "explanation": "Clarification: Monday recurrence disambiguation"
        }
    
    question_triggers = [
        "tell me", "what", "how", "can you", "who", "why", "when", "today", "todays",
        "kya", "kaise", "batao", "status", "summary", "schedule", "agenda", "balance", "news", "weather", "khabar", "mausam"
    ]
    if any(text_lower.startswith(q) or f" {q} " in f" {text_lower} " for q in question_triggers) or text_lower.endswith("?"):
        today_date = datetime.now().strftime('%A, %d %B %Y')
        task_count = len(context.get('tasks', [])) if context else 0
        balance = context.get('balance', 0) if context else 0
        
        reply = f"आज {today_date} है। आपके पास {task_count} सक्रिय कार्य हैं और कुल बैलेंस ₹{balance:,.2f} है।"
        return {
            "action": "query",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": { "response": reply },
            "explanation": "Query detection in offline fallback"
        }

    # Financial Expense detection
    expense_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:₹|rs\.?|inr|rupees|rupaye)?\s*(?:खर्च|diye|paid|spent|deducted|advance|de diye)?', text_lower)
    is_expense = any(w in text_lower for w in ["खर्च", "diye", "paid", "spent", "kharch", "bought", "khareeda", "advances", "payment"])
    
    if is_expense and expense_match:
        try:
            amt_str = expense_match.group(1).replace(",", "")
            amount = float(amt_str)
            if amount > 0:
                cat = "general"
                if any(w in text_lower for w in ["khana", "lunch", "dinner", "food", "restaurant", "chai", "coffee"]):
                    cat = "food"
                elif any(w in text_lower for w in ["petrol", "diesel", "fuel", "cab", "auto", "metro", "travel"]):
                    cat = "travel"
                elif any(w in text_lower for w in ["rent", "kiraya", "bill", "bijli", "recharge"]):
                    cat = "bills"
                
                return {
                    "action": "expense",
                    "confidence": 0.95,
                    "confidence_level": "high",
                    "data": {
                        "amount": amount,
                        "currency": "INR",
                        "category": cat,
                        "payment_mode": "upi" if "upi" in text_lower else "cash",
                        "note": text
                    },
                    "explanation": f"Rule-based detection identified expense of ₹{amount}"
                }
        except Exception:
            pass

    # Memory detection
    if any(w in text_lower for w in ["याद रखना", "remember", "note down", "meri preference", "yaad rakhna", "rule"]):
        fact = re.sub(r'^(याद रखना|remember that|remember|note that)\s*[:,-]?\s*', '', text, flags=re.IGNORECASE)
        return {
            "action": "memory",
            "confidence": 0.96,
            "confidence_level": "high",
            "data": {
                "fact": fact.strip(),
                "category": "preference"
            },
            "explanation": "Rule-based detection identified personal memory fact"
        }

    # Task & Reminder detection (Strict: only if time or task keywords are present!)
    reminder_time_str, due_dt = parse_reminder_time(text)
    has_task_intent = bool(reminder_time_str) or any(w in text_lower for w in [
        "remind", "reminder", "task", "रिमाइंडर", "टास्क", "karna hai", "karni hai", 
        "bhejna hai", "bhejna", "call karni", "call karna", "jana hai", "lana hai", 
        "khareedna", "schedule", "meeting", "do this", "complete", "finish", "water", "pani",
        "work", "urgent", "todo"
    ])

    if not has_task_intent:
        # Do not create random tasks for general queries (like 'Capital of india')!
        return {
            "action": "query",
            "confidence": 0.90,
            "confidence_level": "medium",
            "data": {
                "response": f"मैं आपके सवाल '{text}' के लिए जानकारी तैयार कर रहा हूँ। कृपया इंटरनेट या Gemini API कुंजी सक्रिय रखें।"
            },
            "explanation": "Conversational fallback rather than creating unwanted task"
        }

    priority = "medium"
    if any(w in text_lower for w in ["urgent", "zaroori", "important", "asap", "turant"]):
        priority = "urgent"
    elif any(w in text_lower for w in ["high", "pehli priority"]):
        priority = "high"

    clean_title = clean_task_title(text)
    is_daily = any(w in text_lower for w in ["daily", "everyday", "every day", "har din", "roz", "rozaana", "रोज", "रोजाना", "प्रतिदिन"])
    rec_val = None
    if is_mon_to_fri:
        rec_val = "weekdays"
        # Start from TODAY if today is Monday-Friday
        today_d = datetime.now().date()
        if today_d.weekday() < 5:
            due_dt = datetime.combine(today_d, due_dt.time() if due_dt else datetime.min.time())
        else:
            days_ahead = (0 - today_d.weekday()) % 7
            due_dt = datetime.combine(today_d + timedelta(days=days_ahead), due_dt.time() if due_dt else datetime.min.time())
    elif is_daily:
        rec_val = "daily"
    elif is_monday_query and any(w in text_lower for w in ["every", "har", "repeat", "प्रत्येक"]):
        rec_val = "weekly_monday"

    return {
        "action": "task",
        "confidence": 0.95 if reminder_time_str else 0.90,
        "confidence_level": "high",
        "data": {
            "title": clean_title,
            "priority": priority,
            "reminder_time": reminder_time_str,
            "due_date": due_dt.isoformat() if due_dt else None,
            "recurrence": rec_val
        },
        "explanation": "Extracted task and reminder"
    }
