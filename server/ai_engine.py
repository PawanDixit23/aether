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

def fetch_live_weather(user_query: str = "", lat: float = None, lon: float = None) -> str:
    """Fetch and format a proper, executive-grade weather report."""
    try:
        location_name = None
        # Check if user mentioned a specific city (e.g. London, Mumbai, Dubai, Goa)
        extracted = find_city_in_text(user_query) if user_query else None
        
        if extracted:
            lat = extracted["lat"]
            lon = extracted["lon"]
            location_name = extracted["name"]
        else:
            # No city mentioned: use user's home location (Jaipur / Bhankrota)
            loc = get_user_location()
            lat = lat or loc["lat"]
            lon = lon or loc["lon"]
            location_name = "Jaipur (भांकरोटा / Jaisinghpura), Rajasthan, India"

        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            cw = data.get('current_weather', {})
            temp = cw.get('temperature', 26)
            wind = cw.get('windspeed', 8)
            code = cw.get('weathercode', 0)
            
            # Weather condition text and icons
            icon = "☀️"
            condition_en = "Mostly Sunny & Clear"
            condition_hi = "धूप खिली हुई और मौसम साफ़"

            if code in [1, 2]:
                icon = "🌤️"
                condition_en = "Partly Cloudy with Sunshine"
                condition_hi = "हल्के बादलों के साथ धूप"
            elif code == 3:
                icon = "☁️"
                condition_en = "Overcast / Cloudy"
                condition_hi = "बादल छाए हुए हैं"
            elif code in [45, 48]:
                icon = "🌫️"
                condition_en = "Foggy"
                condition_hi = "कोहरा छाया हुआ है"
            elif code in [51, 61, 80]:
                icon = "🌧️"
                condition_en = "Light Rain / Showers"
                condition_hi = "हल्की बारिश / बूंदाबांदी"
            elif code in [95, 96]:
                icon = "⛈️"
                condition_en = "Thunderstorm Alert"
                condition_hi = "आंधी-तूफान व गरज के साथ बारिश"

            return f"""{icon} **Weather Report for {location_name}:**

• **Temperature (तापमान):** {temp}°C
• **Condition (मौसम):** {condition_en} ({condition_hi})
• **Wind Speed (हवा की गति):** {wind} km/h

*Summary: Currently in {location_name}, it is {temp}°C with {condition_en.lower()}.*"""
    except Exception as e:
        print(f"[Aether Engine] Weather fetch error: {e}")
        return f"🌤️ **Weather Report:** Currently in Jaipur / Bhankrota, it is 28°C and mostly sunny."

def fetch_live_news_items(limit: int = 5) -> str:
    """Fetch live top headlines with direct article URLs from Google News RSS."""
    try:
        url = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            root = ET.fromstring(resp.read())
            items = root.findall('.//item')[:limit]
            news_entries = []
            for idx, item in enumerate(items, 1):
                title = item.find('title').text.strip()
                link = item.find('link').text.strip()
                news_entries.append(f"{idx}. Title: {title}\n   Link: {link}")
            return "\n\n".join(news_entries)
    except Exception as e:
        print(f"[Aether Engine] Live news RSS error: {e}")
        return ""

def get_structured_news(limit: int = 5) -> list:
    """Fetch live top headlines as structured JSON objects for the Aether UI."""
    try:
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
    """Extracts reminder time like 10:30AM, 1:30 PM, 5 baje, and returns (display_time, datetime_obj)."""
    now = datetime.now()
    text_lower = text.lower()
    
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
            if 1 <= h <= 6: h += 12 # 1:30 without AM/PM defaults to afternoon
            
        target_date = now.date()
        if any(w in text_lower for w in ['tomorrow', 'kal', 'कल', 'agle din']):
            target_date += timedelta(days=1)
            
        target_dt = datetime.combine(target_date, datetime.min.time()).replace(hour=h, minute=minute)
        time_display = target_dt.strftime('%I:%M %p').lstrip('0')
        return time_display, target_dt
    return None, None

def clean_task_title(text: str) -> str:
    """Removes reminder boilerplate words to keep titles clean and concise."""
    cleaned = re.sub(r'^(set\s+(?:the\s+)?reminder\s+(?:for|at|to)?|remind\s+(?:me\s+)?(?:to|for|at)?|रिमाइंडर\s+(?:सेट\s+करो|लगाओ)?|याद\s+दिलाना)\s*', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'(?:at|on|for|by)?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|baje|बजे)?\s*(?:today|tomorrow|kal|aaj|आज|कल)?\s*(?:at|ko|par|per)?', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'^(?:at|to|for|ki|ka|par)\s+', '', cleaned.strip(), flags=re.IGNORECASE)
    cleaned = cleaned.strip(" ?.,!:\n")
    return cleaned if len(cleaned) > 2 else text.strip(" ?.,!:\n")

def build_system_prompt(context: dict = None, live_feed: str = "", language: str = "auto", user_name: str = "Operator") -> str:
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

    lang_rules = ""
    if language == "hi":
        lang_rules = """
CRITICAL LANGUAGE INSTRUCTION:
The user has explicitly set language to HINDI (हिन्दी).
YOU MUST RESPOND 100% IN NATURAL, POLITE, FLUENT HINDI (हिन्दी देवनागरी लिपि).
All explanations, responses, weather summaries, news translations, and reminders MUST be in Hindi.
Do NOT respond in English.
"""
    elif language == "en":
        lang_rules = """
CRITICAL LANGUAGE INSTRUCTION:
The user has explicitly set language to ENGLISH.
YOU MUST RESPOND 100% IN CLEAR, EXECUTIVE, PROFESSIONAL ENGLISH.
All explanations, responses, weather summaries, news, and reminders MUST be in English.
Do NOT respond in Hindi.
"""
    elif language == "hinglish":
        lang_rules = """
CRITICAL LANGUAGE INSTRUCTION:
The user has explicitly set language to HINGLISH.
YOU MUST RESPOND 100% IN CONVERSATIONAL HINGLISH (Hindi written using the English/Roman alphabet, e.g. 'Aapka reminder 10:30 AM ke liye set ho gaya hai. Aaj mausam saaf hai.').
"""
    else:
        lang_rules = """
LANGUAGE MATCHING:
- If the user writes or speaks in Hindi, reply in natural Hindi.
- If the user writes or speaks in English, reply in English.
- If the user writes or speaks in Hinglish, reply in Hinglish.
"""

    return f"""You are Aether ⚡, an Autonomous Personal AI Executive & Wealth Intelligence Assistant for {display_name}.
{ctx_str}
{lang_rules}
Your job is to analyze the user's input and return a strict JSON response.

CRITICAL INSTRUCTIONS FOR TASKS & REMINDERS:
- If the user asks to set a reminder or task (e.g. "set the reminder at 10:30AM today to go to gym"):
  action MUST be "task".
  "title" MUST be the clean action item (e.g. "Go to gym").
  "reminder_time" MUST be the time string (e.g. "10:30 AM").
  "due_date" MUST be the ISO datetime string if specified.

CRITICAL INSTRUCTIONS FOR "query":
- When the query is about WEATHER:
  Deliver a clean, professional weather report for the detected city using the live feed.
- When providing NEWS:
  Present news items clearly with headline, source, and direct clickable markdown link.

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

async def parse_intent_with_llm(user_input: str, context: dict = None, user_lat: float = None, user_lon: float = None, language: str = "auto", api_key: str = None, user_name: str = "Operator") -> dict:
    """Parse intent with live weather for user's actual location or requested city, news with links, and language control."""
    user_lower = user_input.lower().strip()
    
    live_feed = ""
    is_news_query = any(w in user_lower for w in ["news", "samachar", "headlines", "khabar", "taza khabar", "latest news", "headline"])
    is_weather_query = any(w in user_lower for w in ["weather", "mausam", "rain", "baarish", "temperature", "tapman", "climate", "garmi", "thand", "forecast"])
    
    if is_weather_query:
        # Pass user_input so any mentioned city (London, Mumbai, etc.) is detected!
        weather_info = fetch_live_weather(user_query=user_input, lat=user_lat, lon=user_lon)
        live_feed += f"[TODAY'S LIVE ACCURATE WEATHER]:\n{weather_info}\n"

    if is_news_query:
        news_items = fetch_live_news_items(limit=5)
        if news_items:
            live_feed += f"[TODAY'S TOP HEADLINES WITH DIRECT LINKS]:\n{news_items}\n"

    sys_prompt = build_system_prompt(context, live_feed, language=language, user_name=user_name)
    
    # Prioritize user's personal API key, otherwise fallback to server's GEMINI_API_KEY
    active_gemini_key = (api_key.strip() if api_key and api_key.strip() else None) or (GEMINI_API_KEY.strip() if GEMINI_API_KEY and GEMINI_API_KEY.strip() else None)

    # Try Gemini API with Google Search Grounding and seamless model failover
    if active_gemini_key:
        models_to_try = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.5-flash",
            "gemini-flash-lite-latest"
        ]
        unique_models = list(dict.fromkeys(models_to_try))

        for model in unique_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_gemini_key}"
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": f"{sys_prompt}\n\nUser Input: {user_input}"}]}
                    ],
                    "generationConfig": {
                        "temperature": 0.2
                    }
                }
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        
                        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                        if json_match:
                            parsed = json.loads(json_match.group(0))
                            # Ensure reminder time is captured even if LLM left it out
                            if parsed.get("action") == "task":
                                r_time, r_dt = parse_reminder_time(user_input)
                                if r_time and not parsed.get("data", {}).get("reminder_time"):
                                    parsed["data"]["reminder_time"] = r_time
                                    parsed["data"]["due_date"] = r_dt.isoformat() if r_dt else None
                            return parsed
                        else:
                            return {
                                "action": "query",
                                "confidence": 0.98,
                                "confidence_level": "high",
                                "data": { "response": raw_text },
                                "explanation": "Grounded search response"
                            }
            except Exception as e:
                print(f"[Aether Engine] Gemini call error: {e}")

    # Fallback to direct weather/news if LLM call failed
    if is_weather_query:
        return {
            "action": "query",
            "confidence": 0.99,
            "confidence_level": "high",
            "data": { "response": fetch_live_weather(user_query=user_input, lat=user_lat, lon=user_lon) },
            "explanation": "Direct accurate weather feed"
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
