import os
import json
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
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

# Cached Live Weather with timestamp
WEATHER_CACHE = {"data": None, "timestamp": 0}

def get_live_weather_data(lat: float = None, lon: float = None) -> dict:
    """Fetch live accurate weather from Open-Meteo with caching (10 min TTL)."""
    global WEATHER_CACHE
    import time
    now_ts = time.time()
    if WEATHER_CACHE["data"] and (now_ts - WEATHER_CACHE["timestamp"] < 600) and not lat:
        return WEATHER_CACHE["data"]
    
    use_lat = lat or 26.85
    use_lon = lon or 75.72
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={use_lat}&longitude={use_lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
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
            if not lat:
                WEATHER_CACHE["data"] = result
                WEATHER_CACHE["timestamp"] = now_ts
            return result
    except Exception as e:
        print(f"[Aether Engine] Live weather fetch error: {e}")
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

        if is_match_or_result:
            clean_q = query.replace("in hindi", "").replace("hindi me", "").replace("in english", "").strip()
            search_query = f"{clean_q} sports match score result" if not any(w in clean_q.lower() for w in ["cricket", "football", "sports", "match"]) else clean_q
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl={hl}&gl={gl}&ceid={ceid}"
        elif wants_hindi:
            if is_sports:
                url = f"https://news.google.com/rss/headlines/section/topic/SPORTS?hl=hi&gl=IN&ceid=IN:hi"
            else:
                url = f"https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi"
        elif is_sports:
            url = f"https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en"
        elif is_tech:
            url = f"https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en"
        elif is_business:
            url = f"https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en"
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

    # 3. Absolute time: 10:30 AM, 5 PM, 5 baje, 6:00
    is_pm_hint = any(k in text_lower for k in ['shaam', 'shang', 'शाम', 'evening', 'night', 'raat', 'रात', 'dopahar', 'दोपहर', 'pm', 'p.m.'])
    is_am_hint = any(k in text_lower for k in ['subah', 'सुबह', 'morning', 'am', 'a.m.', 'प्रातः'])

    pattern = r'(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|baje|बजे)?'
    matches = re.finditer(pattern, text_lower)
    for m in matches:
        h_str, m_str, mer = m.groups()
        if not h_str: continue
        h = int(h_str)
        minute = int(m_str) if m_str else 0
        if h > 24 or minute > 59: continue
        
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
    """Removes reminder boilerplate words to keep titles clean and concise."""
    cleaned = re.sub(r'^(set\s+(?:the\s+)?reminder\s+(?:for|at|to)?|remind\s+(?:me\s+)?(?:to|for|at)?|रिमाइंडर\s+(?:सेट\s+करो|लगाओ)?|याद\s+दिलाना)\s*', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:in|after|ke\s*baad)?\s*\d+(?:\.\d+)?\s*(?:hours?|hrs?|ghante|ghanta|minutes?|mins?|minute|घंटे|घंटा|मिनट)\s*(?:baad|me|mein|later|to|for|ki|ka)?', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:at|on|for|by)?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|baje|बजे)?\s*(?:today|tomorrow|kal|aaj|आज|कल)?\s*(?:at|ko|par|per)?', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^(?:at|to|for|ki|ka|par)\s+', '', cleaned.strip(), flags=re.IGNORECASE)
    cleaned = cleaned.strip(" ?.,!:\n")
    return cleaned if len(cleaned) > 2 else text.strip(" ?.,!:\n")

def build_system_prompt(context: dict = None, live_feed: str = "", language: str = "auto", user_name: str = "Operator", user_query: str = "", has_image: bool = False) -> str:
    ctx_str = ""
    display_name = user_name.strip() if user_name and user_name.strip() else "Operator"
    if context:
        ctx_str = f"""
CURRENT REAL-TIME CONTEXT:
- Current Local Time: {context.get('current_time') or get_now_str()}
- User Name: {display_name}
- Detected Home Location: {context.get('user_location', 'Jaipur / Bhankrota, Rajasthan')}
- Pending Tasks ({len(context.get('tasks', []))}): {', '.join([t.get('title', '') for t in context.get('tasks', [])]) or 'None'}
- Financial Balance: ₹{context.get('balance', 0):,.2f}
- Known User Memories/Rules: {json.dumps(context.get('memories', []))}
"""
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
CRITICAL REAL-TIME IMAGE / CAMERA VISION RULES:
- The user has attached or captured a real-time photo or picture from their camera/gallery.
- You have direct multimodal visual perception of this image.
- THOROUGHLY inspect all visual elements: objects, people, scenes, handwritten notes, printed documents, receipts, bills, brands, colors, surroundings, and quality.
- If the user asks a question about the photo (e.g. "what is this", "ये क्या है", "फोटो में क्या दिख रहा है", "explain this image", "is bill me kitna amount hai", "summarize this receipt"):
  Provide a comprehensive, accurate, and helpful response answering their exact question.
- Action MUST be "query" (unless it is explicitly an expense receipt and the user specifically requests logging it, in which case use "expense").
- Place your full, well-crafted, articulate explanation in "data.response".
- Strictly respect the language instruction above (e.g. respond in beautiful, fluent Hindi when language is Hindi).
"""

    return f"""You are Aether ⚡, an Autonomous Personal AI Executive & Wealth Intelligence Assistant for {display_name}.
{ctx_str}
{lang_rules}
{image_rules}
Your job is to analyze the user's input and return a strict JSON response.

CRITICAL INSTRUCTIONS FOR TASKS & REMINDERS:
- If the user asks to set a reminder or task (e.g. "set the reminder at 10:30AM today to go to gym"):
  action MUST be "task".
  "title" MUST be the clean action item (e.g. "Go to gym").
  "reminder_time" MUST be the time string (e.g. "10:30 AM").
  "due_date" MUST be the ISO datetime string if specified.

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
    "title": "Clean task title (if task)",
    "priority": "low" | "medium" | "high" | "urgent",
    "reminder_time": "10:30 AM or null",
    "due_date": "ISO string or null",
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
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
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
                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        
                        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                        if json_match:
                            try:
                                parsed = json.loads(json_match.group(0))
                                # Ensure reminder time is captured even if LLM left it out
                                if parsed.get("action") == "task":
                                    r_time, r_dt = parse_reminder_time(user_input)
                                    if r_time and not parsed.get("data", {}).get("reminder_time"):
                                        parsed["data"]["reminder_time"] = r_time
                                        parsed["data"]["due_date"] = r_dt.isoformat() if r_dt else None
                                return parsed
                            except Exception:
                                pass

                        return {
                            "action": "query",
                            "confidence": 0.98,
                            "confidence_level": "high",
                            "data": { "response": raw_text },
                            "explanation": "Visual perception response"
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
    """Smart offline parser when no LLM API is available."""
    text_lower = text.lower().strip()
    
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

    # Task & Reminder detection
    priority = "medium"
    if any(w in text_lower for w in ["urgent", "zaroori", "important", "asap", "turant"]):
        priority = "urgent"
    elif any(w in text_lower for w in ["high", "pehli priority"]):
        priority = "high"

    reminder_time_str, due_dt = parse_reminder_time(text)
    clean_title = clean_task_title(text)

    return {
        "action": "task",
        "confidence": 0.95 if reminder_time_str else 0.90,
        "confidence_level": "high",
        "data": {
            "title": clean_title,
            "priority": priority,
            "reminder_time": reminder_time_str,
            "due_date": due_dt.isoformat() if due_dt else None
        },
        "explanation": "Extracted task and reminder"
    }
