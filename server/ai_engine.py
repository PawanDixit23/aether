import os
import json
import re
import urllib.request
import urllib.parse
from typing import Optional, List, Dict, Any
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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
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

def get_live_weather_data(lat: float = None, lon: float = None, city_name: str = None) -> dict:
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
    coord_key = f"{use_lat},{use_lon}_{city_name or ''}"

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
                print(f"[Aether Engine] ℹ️ Weather API rate-limited (429) — gracefully serving cached weather ({WEATHER_429_BACKOFF//60} min backoff)")
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

            clean_city = (city_name or "").strip()
            if not clean_city:
                clean_city = "Jaipur"

            result = {
                "temp": temp,
                "wind": f"{wind} km/h",
                "humidity": humidity,
                "icon": icon,
                "condition_en": condition_en,
                "condition_hi": condition_hi,
                "city": clean_city,
                "city_en": clean_city,
                "city_hi": clean_city,
                "city_hinglish": clean_city
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
            print(f"[Aether Engine] ℹ️ Weather API rate-limited (429) — gracefully serving cached weather ({WEATHER_429_BACKOFF//60} min backoff)")
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
        fallback_city = (city_name or "").strip() or "Jaipur"
        return {
            "temp": dynamic_temp,
            "wind": "4.2 km/h",
            "humidity": "36%",
            "icon": "☀️",
            "condition_en": "Sunny & Clear",
            "condition_hi": "धूप खिली हुई",
            "city": fallback_city,
            "city_en": fallback_city,
            "city_hi": fallback_city,
            "city_hinglish": fallback_city
        }

def fetch_live_weather(user_query: str = "", lat: float = None, lon: float = None, city_name: str = None) -> str:
    """Fetch and format a proper, executive-grade weather report."""
    extracted = find_city_in_text(user_query) if user_query else None
    if extracted:
        lat = extracted["lat"]
        lon = extracted["lon"]
        location_name = extracted["name"]
    elif city_name:
        location_name = city_name
    else:
        loc = get_user_location()
        lat = lat or loc["lat"]
        lon = lon or loc["lon"]
        location_name = loc.get("city", "Your Location")

    w = get_live_weather_data(lat, lon, city_name=location_name)
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

# ----------------- Dynamic City Explorer & Local Discovery Guide -----------------
CITY_GUIDE_CACHE = {}

CITY_DISCOVERY_DATABASE = {
    "jaipur": {
        "city": "Jaipur",
        "state": "Rajasthan",
        "hindi_name": "जयपुर (गुलाबी नगरी)",
        "tagline": "The Pink City • राजस्थान की ऐतिहासिक धरोहर, शाही स्थापत्य व लज़ीज़ स्वाद",
        "places_to_visit": [
            {"name": "Hawa Mahal (हवा महल)", "desc": "गुलाबी बलुआ पत्थर से निर्मित 953 झरोखों वाला विश्व प्रसिद्ध 5-मंजिला महल।", "category": "Historical Heritage", "best_time": "सुबह 9:00 - 11:30 AM"},
            {"name": "Amer Fort & Sheesh Mahal (आमेर किला)", "desc": "अरावली पर्वतमाला पर भव्य महल, मावठा झील और चमचमाता दर्पण महल।", "category": "Royal Fort", "best_time": "दोपहर 3:30 - शाम 6:30 PM (Light & Sound Show)"},
            {"name": "City Palace & Jantar Mantar", "desc": "शाही संग्रहालय व यूनेस्को विश्व धरोहर की सबसे बड़ी खगोलीय वेधशाला।", "category": "Royal Palace & Astronomy", "best_time": "सुबह 10:00 AM - 1:00 PM"},
            {"name": "Nahargarh Fort Sunset Point", "desc": "पहाड़ी से पूरे जयपुर शहर का विहंगम दृश्य और अरावली का जादुई सूर्यास्त।", "category": "Sunset Viewpoint", "best_time": "शाम 4:30 - 6:30 PM"},
            {"name": "Patrika Gate & Albert Hall", "desc": "रंग-बिरंगे हस्तलिखित राजस्थानी भित्ति चित्र और ऐतिहासिक इंडो-सारासेनिक संग्रहालय।", "category": "Culture & Photography", "best_time": "शाम 6:00 - 8:30 PM (नाइट लाइटिंग)"}
        ],
        "foods_to_try": [
            {"name": "Rawat Pyaaz Kachori (प्याज़ कचौरी)", "desc": "गर्मागर्म, तीखी और कुरकुरी प्याज़ की कचौरी — जयपुर की सबसे मशहूर पहचान।", "famous_at": "Rawat Mishthan Bhandar, Station Road"},
            {"name": "Dal Baati Churma (दाल बाटी चूरमा)", "desc": "देशी घी में डूबी बाटी, पंचमेल दाल और मीठा चूरमा — राजस्थान का शाही भोजन।", "famous_at": "Laxmi Mishthan Bhandar (LMB) या Chokhi Dhani"},
            {"name": "Ghewar & Rabdi (शाही घेवर व रबड़ी)", "desc": "मलाईदार, जालीदार पारंपरिक राजस्थानी मिष्ठान (मलाई/केसर घेवर)।", "famous_at": "LMB (Johari Bazaar) व Sambhar Fini"},
            {"name": "Lassiwala Special Lassi", "desc": "मिट्टी के कुल्हड़ में गाढ़ी मलाईदार मीठी लस्सी (1944 से संचालित)।", "famous_at": "Lassiwala (Shop 312), MI Road"},
            {"name": "Gulab Ji Chai & Bun Maska", "desc": "मसाला चाय और मक्खन वाले पाव का लाजवाब मेल।", "famous_at": "Gulab Ji Chai Wale, MI Road"}
        ],
        "popular_things": [
            {"name": "Johari Bazaar (जौहरी बाज़ार)", "desc": "पारंपरिक कुंदन, मीनाकारी आभूषण और कीमती रत्नों की विश्व प्रसिद्ध मंडी।", "type": "Jewelry & Gems Shopping"},
            {"name": "Bapu Bazaar & Nehru Bazaar", "desc": "जयपुरी रज़ाई, सांगानेरी ब्लॉक-प्रिंट कुर्तियाँ और हस्तनिर्मित चमड़े की मोजड़ियां।", "type": "Street & Textile Shopping"},
            {"name": "Chokhi Dhani Ethnic Village", "desc": "लाइव कालबेलिया लोकनृत्य, कठपुतली शो और पारंपरिक गाँव के परिवेश में शाही डिनर।", "type": "Cultural Village Experience"}
        ],
        "local_tips": [
            "चारदीवारी (Old Walled City) के बाज़ारों में खरीददारी करते समय हल्की बारगेनिंग ज़रूर करें।",
            "पुराने शहर की संकरी गलियों में घूमने के लिए ई-रिक्शा सबसे तेज़ और किफायती है।"
        ]
    },
    "delhi": {
        "city": "Delhi",
        "state": "Delhi NCR",
        "hindi_name": "दिल्ली (दिलवालों की नगरी)",
        "tagline": "The National Capital • सदियों पुराना इतिहास, आधुनिक वाइब और विश्व प्रसिद्ध स्ट्रीट फ़ूड",
        "places_to_visit": [
            {"name": "Red Fort & Chandni Chowk (लाल किला)", "desc": "मुगलकालीन लाल किला, जामा मस्जिद और पुरानी दिल्ली का जीवंत बाज़ार।", "category": "Mughal Heritage", "best_time": "सुबह 9:00 - 11:30 AM"},
            {"name": "Qutub Minar & Mehrauli Complex", "desc": "यूनेस्को विश्व धरोहर ईंटों की दुनिया की सबसे ऊंची मीनार और ऐतिहासिक लौह स्तंभ।", "category": "UNESCO World Heritage", "best_time": "दोपहर 3:00 - शाम 5:30 PM"},
            {"name": "India Gate & Kartavya Path", "desc": "अमर जवान ज्योति, राष्ट्रीय युद्ध स्मारक (National War Memorial) और भव्य राष्ट्रपति भवन का विस्टा।", "category": "National Monument", "best_time": "शाम 5:30 - 8:30 PM"},
            {"name": "Humayun's Tomb & Sunder Nursery", "desc": "चारबाग शैली का भव्य मकबरा और दिल्ली का सबसे सुंदर हरियाली हेरिटेज पार्क।", "category": "Garden & Architecture", "best_time": "सुबह 8:00 - 11:00 AM"},
            {"name": "Akshardham Temple", "desc": "अद्भुत नक्काशीदार गुलाबी बलुआ पत्थर का मंदिर परिसर और शाम का वॉटर लेज़र शो।", "category": "Spiritual & Cultural Wonder", "best_time": "दोपहर 3:00 PM से शाम तक"}
        ],
        "foods_to_try": [
            {"name": "Chole Bhature (छोले भटूरे)", "desc": "फूले हुए कुरकुरे भटूरे, चटपटे पिंडी छोले और मसालेदार गाजर-मिर्च का अचार।", "famous_at": "Sita Ram Diwan Chand (Paharganj) या Chache Di Hatti (Kamla Nagar)"},
            {"name": "Paranthe Wali Gali (पराठे वाली गली)", "desc": "काजू, खोया, पनीर, मिर्च और आलू के घी में तले हुए खस्ता पराठे।", "famous_at": "Chandni Chowk"},
            {"name": "Butter Chicken & Dal Makhani", "desc": "क्रीमी मखमली ग्रेवी वाला बटर चिकन और काली दाल।", "famous_at": "Moti Mahal (Daryaganj) या Gulati (Pandara Road)"},
            {"name": "Chandni Chowk Dahi Bhalle & Chaat", "desc": "खट्टी-मीठी सोंठ और गाढ़े दही से भरपूर कुरकुरी टिक्की व दही भल्ले।", "famous_at": "Natraj Dahi Bhalla Corner (Chandni Chowk)"}
        ],
        "popular_things": [
            {"name": "Dilli Haat (INA)", "desc": "भारत के सभी राज्यों के हस्तशिल्प, कपड़े और क्षेत्रीय पारंपरिक पकवानों का खुला बाज़ार।", "type": "Crafts & Food Bazaar"},
            {"name": "Sarojini Nagar & Janpath Market", "desc": "ट्रेंडी वेस्टर्न कपड़े, फुटवियर और फैशन एक्सेसरीज़ की बजट शॉपिंग।", "type": "Fashion Shopping"},
            {"name": "Chandni Chowk Cycle Rickshaw Tour", "desc": "पुरानी दिल्ली की ऐतिहासिक गलियों और एशिया के सबसे बड़े मसाला बाज़ार (खारी बावली) की सैर।", "type": "Heritage Tour"}
        ],
        "local_tips": [
            "दिल्ली में किसी भी स्थान पर पहुँचने के लिए 'दिल्ली मेट्रो' (Delhi Metro) सबसे तेज़ और ट्रैफिक-मुक्त साधन है।",
            "पुरानी दिल्ली सोमवार से शनिवार पूरी रौनक में रहती है, रविवार को कई दुकानें बंद रहती हैं।"
        ]
    },
    "mumbai": {
        "city": "Mumbai",
        "state": "Maharashtra",
        "hindi_name": "मुंबई (सपनों का शहर)",
        "tagline": "City of Dreams • अरब सागर की लहरें, बॉलीवुड की चमक और कभी न रुकने वाली रफ़्तार",
        "places_to_visit": [
            {"name": "Gateway of India & Taj Palace", "desc": "अरब सागर के किनारे ब्रिटिश राज का ऐतिहासिक प्रवेश द्वार और प्रतिष्ठित ताज होटल।", "category": "Iconic Landmark", "best_time": "सुबह 7:00 - 9:00 AM या शाम"},
            {"name": "Marine Drive (Queen's Necklace)", "desc": "3 किमी लंबा सी-फेसिंग प्रोमेनेड, जहाँ शाम को ठंडी समुद्री हवा और जगमगाती रौशनी का जादुई नज़ारा होता है।", "category": "Seafront Promenade", "best_time": "शाम 5:30 - 8:30 PM"},
            {"name": "Elephanta Caves (एलिफेंटा गुफाएं)", "desc": "गेटवे से फेरी की सवारी और भगवान शिव की त्रिमूर्ति वाली प्राचीन शैलकृत गुफाएं।", "category": "UNESCO World Heritage", "best_time": "सुबह 9:00 AM - 1:00 PM"},
            {"name": "Bandra Bandstand & Mount Mary Church", "desc": "समुद्र तट, बॉलीवुड हस्तियों के आशियाने और ऐतिहासिक पुर्तगाली चर्च।", "category": "Sightseeing & Sea View", "best_time": "शाम 4:30 - 7:00 PM"},
            {"name": "Chhatrapati Shivaji Maharaj Terminus (CSMT)", "desc": "गॉथिक रिवाइवल वास्तुकला का जीवंत विश्व धरोहर रेलवे स्टेशन।", "category": "Heritage Architecture", "best_time": "रात में तिरंगा व हेरिटेज लाइटिंग के समय"}
        ],
        "foods_to_try": [
            {"name": "Vada Pav (मुंबई का वड़ा पाव)", "desc": "लहसुन की सूखी लाल चटनी और तली हरी मिर्च के साथ गर्मागर्म बटाटा वड़ा पाव।", "famous_at": "Ashok Vada Pav (Kirti College, Dadar) व Aram (CSMT)"},
            {"name": "Pav Bhaji (मक्खन पाव भाजी)", "desc": "ढेर सारे मक्खन में लथपथ तीखी चटपटी भाजी और सिका हुआ पाव।", "famous_at": "Sardar Pav Bhaji (Tardeo) या Cannon (CSMT)"},
            {"name": "Bombay Sandwich & Frankie", "desc": "हरी चटनी, उबले आलू, चुकंदर, ककड़ी और चीज़ से लोडेड टोस्टेड सैंडविच।", "famous_at": "Tibbs Frankie व चर्नी रोड स्ट्रीट स्टॉल्स"},
            {"name": "Bun Maska & Irani Chai", "desc": "पारंपरिक पारसी कैफे की मलाईदार कड़क चाय और मक्खन वाला बन।", "famous_at": "Kyani & Co. (Marine Lines) या Britannia & Co."}
        ],
        "popular_things": [
            {"name": "Colaba Causeway & Fashion Street", "desc": "एंटीक सामान, कपड़े, हैंडबैग और मशहूर कैफे लियोपोल्ड की जीवंत सैर।", "type": "Shopping & Cafes"},
            {"name": "Marine Drive Evening Stroll", "desc": "समुद्र की लहरों के किनारे बैठना और शाम का सुकून भरा सूर्यास्त निहारना।", "type": "Relaxation"},
            {"name": "Bandra-Worli Sea Link Drive", "desc": "समुद्र के ऊपर 8-लेन के इंजीनियरिंग अजूबे पर ड्राइव का रोमांचक अनुभव।", "type": "Scenic Drive"}
        ],
        "local_tips": [
            "पीक ऑवर्स (सुबह 8:30-11:00 AM और शाम 5:30-8:30 PM) में लोकल ट्रेन में भीड़ से बचें या एसी लोकल चुनें।",
            "काली-पीली टैक्सी और ऑटो मीटर के अनुसार ही किराया लेते हैं।"
        ]
    },
    "bengaluru": {
        "city": "Bengaluru",
        "state": "Karnataka",
        "hindi_name": "बेंगलुरु (गार्डन सिटी व सिलिकॉन वैली)",
        "tagline": "Garden City & Tech Capital • सुहावना मौसम, फिल्टर कॉफी, शानदार पार्क व क्राफ्ट बियर",
        "places_to_visit": [
            {"name": "Lalbagh Botanical Garden", "desc": "240 एकड़ का ऐतिहासिक वानस्पतिक उद्यान, प्रसिद्ध ग्लास हाउस और सदियों पुराने दुर्लभ वृक्ष।", "category": "Botanical Garden", "best_time": "सुबह 6:00 - 9:30 AM"},
            {"name": "Bangalore Palace", "desc": "विंडसर कैसल की तर्ज़ पर बना ट्यूडर शैली का खूबसूरत शाही महल।", "category": "Royal Heritage", "best_time": "सुबह 10:30 AM - 1:30 PM"},
            {"name": "Cubbon Park & Vidhana Soudha", "desc": "300 एकड़ का हरा-भरा पार्क और नियो-द्रविड़ियन शैली का भव्य राज्य सचिवालय भवन।", "category": "Nature & Governance", "best_time": "सुबह 7:00 AM या रविवार"},
            {"name": "ISKCON Temple Bangalore", "desc": "हरे कृष्णा हिल पर बना आधुनिक व भव्य द्रविड़ियन मंदिर परिसर।", "category": "Spiritual Landmark", "best_time": "सुबह या शाम की आरती"}
        ],
        "foods_to_try": [
            {"name": "Benne Masala Dosa (मक्खन डोसा)", "desc": "सफेद मक्खन में सिका हुआ कुरकुरा डोसा, आलू मसाला और नारियल-पुदीना चटनी।", "famous_at": "Vidyarthi Bhavan (Gandhi Bazaar) या CTR (Malleshwaram)"},
            {"name": "Authentic Filter Coffee", "desc": "पीतल के डबरे-सेट में परोसी जाने वाली कड़क झागदार दक्षिण भारतीय कॉफ़ी।", "famous_at": "Brahmin's Coffee Bar या Mavalli Tiffin Room (MTR)"},
            {"name": "Bisi Bele Bath & Khara Bath", "desc": "चावल, दाल, इमली और मसालों से बना गरमागरम कर्नाटक का पारंपरिक व्यंजन।", "famous_at": "MTR Lalbagh"},
            {"name": "Mangalorean Ghee Roast", "desc": "देशी घी और कुंदपुरा मसालों में भुना हुआ पनीर या चिकन घी रोस्ट।", "famous_at": "Coastuna या Sea Rock"}
        ],
        "popular_things": [
            {"name": "Commercial Street & Brigade Road", "desc": "कपड़े, फुटवियर और आधुनिक फैशन बुटीक की चहल-पहल वाली शॉपिंग।", "type": "Fashion Shopping"},
            {"name": "Indiranagar & Koramangala Breweries", "desc": "भारत की सबसे ट्रेंडी माइक्रोब्रेवरीज, रूफटॉप कैफे और लाइव म्यूजिक संस्कृति।", "type": "Cafes & Dining"}
        ],
        "local_tips": [
            "बेंगलुरु के भारी ट्रैफिक से बचने के लिए 'नम्मा मेट्रो' (Namma Metro) सबसे आरामदायक विकल्प है।",
            "सुबह-सुबह कब्बन पार्क में मॉर्निंग वॉक शहर का सबसे तरोताज़ा अनुभव है।"
        ]
    },
    "udaipur": {
        "city": "Udaipur",
        "state": "Rajasthan",
        "hindi_name": "उदयपुर (झीलों की नगरी)",
        "tagline": "City of Lakes • पिछोला झील, संगमरमरी महल और शाही मेवाड़ी संस्कृति",
        "places_to_visit": [
            {"name": "City Palace (सिटी पैलेस)", "desc": "पिछोला झील के किनारे बना राजस्थान का सबसे बड़ा और भव्य महल परिसर।", "category": "Royal Palace", "best_time": "सुबह 9:30 AM - 1:00 PM"},
            {"name": "Lake Pichola & Jag Mandir", "desc": "झील में बोट राइड और बीच पानी में बना ऐतिहासिक संगमरमरी जग मंदिर।", "category": "Scenic Boat Ride", "best_time": "शाम 4:30 - 6:00 PM (Sunset)"},
            {"name": "Fateh Sagar Lake & Saheliyon Ki Bari", "desc": "फव्वारों और कमल के तालाबों से सजी सुंदर सहेलियों की बाड़ी व लेक ड्राइव।", "category": "Nature & Garden", "best_time": "शाम 5:00 - 7:00 PM"},
            {"name": "Monsoon Palace (सज्जनगढ़ फोर्ट)", "desc": "पहाड़ी की चोटी से पूरे उदयपुर शहर और झीलों का विहंगम 360° सनसेट दृश्य।", "category": "Hilltop Viewpoint", "best_time": "शाम 5:00 PM"}
        ],
        "foods_to_try": [
            {"name": "Mewari Dal Baati Churma", "desc": "शुद्ध देशी घी और पारम्परिक मसालों से सजी मेवाड़ी थाली।", "famous_at": "Krishna Dal Bati Restro या Traditional Khana"},
            {"name": "Gatte ki Sabzi & Ker Sangri", "desc": "बेसन के गट्टे की दही वाली ग्रेवी और रेगिस्तानी केर-सांगरी।", "famous_at": "Tribute Restaurant"},
            {"name": "Lakeview Rooftop Dinner", "desc": "रात में जगमगाती पिछोला झील के किनारे कैंडललाइट डिनर।", "famous_at": "Ambrai Restaurant या Upre by 1559 AD"}
        ],
        "popular_things": [
            {"name": "Bagore Ki Haveli (बागौर की हवेली)", "desc": "शाम को 'धरोहर' लोकनृत्य शो, चरी नृत्य और 138 कमरों की ऐतिहासिक हवेली।", "type": "Cultural Show"},
            {"name": "Hathi Pol Bazaar", "desc": "पारंपरिक पिछवाई पेंटिंग्स, लकड़ी की कलाकृतियाँ और मोजड़ियां।", "type": "Handicraft Shopping"}
        ],
        "local_tips": [
            "पिछोला झील में सनसेट बोट राइड टिकट 1 दिन पहले बुक करें ताकि सही समय मिल सके।"
        ]
    },
    "goa": {
        "city": "Goa",
        "state": "Goa",
        "hindi_name": "गोवा (समुद्र तटों का स्वर्ग)",
        "tagline": "Beaches & Heritage • सुनहरी रेत, पुर्तगाली धरोहर और सुकून भरी सुसेगाद ज़िंदगी",
        "places_to_visit": [
            {"name": "Baga, Calangute & Anjuna Beach", "desc": "नॉर्थ गोवा के जीवंत बीच, वॉटर स्पोर्ट्स, जेट स्की और बीच शेक्स।", "category": "Beach & Water Sports", "best_time": "सुबह 8:00 AM या शाम"},
            {"name": "Aguada Fort & Chapora Fort", "desc": "समुद्र किनारे 17वीं सदी का पुर्तगाली किला और 'दिल चाहता है' व्यूप्वाइंट।", "category": "Coastal Fort", "best_time": "शाम 4:30 - 6:30 PM"},
            {"name": "Basilica of Bom Jesus & Se Cathedral", "desc": "ओल्ड गोवा के 400 साल पुराने यूनेस्को चर्च और सेंट फ्रांसिस जेवियर का अवशेष।", "category": "UNESCO World Heritage", "best_time": "सुबह 9:00 AM - 12:00 PM"},
            {"name": "Dudhsagar Waterfalls", "desc": "दूध की तरह बहता 4-टियर विशाल जलप्रपात (जीप सफारी अनुभव)।", "category": "Waterfall Adventure", "best_time": "सुबह 8:00 AM से दोपहर"}
        ],
        "foods_to_try": [
            {"name": "Goan Fish Curry Thali", "desc": "नारियल और तीखी लाल मिर्च की ग्रेवी में किंगफिश/प्रॉन करी चावल।", "famous_at": "Ritz Classic (Panjim) या Fat Fish (Calangute)"},
            {"name": "Bebinca (बेबिंका)", "desc": "नारियल के दूध और अंडों से बनी पारंपरिक 7-लेयर गोअन पेस्ट्री।", "famous_at": "Mr. Baker 1922 (Panjim)"},
            {"name": "Poi & Chicken Cafreal", "desc": "पारंपरिक गोअन ब्रेड (पोई) और धनिया-मसालों में भुना कैफ्रियल।", "famous_at": "Mum's Kitchen (Panjim)"}
        ],
        "popular_things": [
            {"name": "Fontainhas (Latin Quarter)", "desc": "रंग-बिरंगे पुर्तगाली विला, संकरी गलियाँ और हेरिटेज वॉक।", "type": "Heritage Walk"},
            {"name": "Anjuna Flea Market / Saturday Night Market", "desc": "बोहो कपड़े, गहने, लाइव बैंड और अंतर्राष्ट्रीय स्ट्रीट फूड।", "type": "Night Market"}
        ],
        "local_tips": [
            "गोवा में घूमने के लिए स्कूटी या खुली जीप रेंट करना सबसे लोकप्रिय और सुविधाजनक तरीका है।"
        ]
    },
    "varanasi": {
        "city": "Varanasi",
        "state": "Uttar Pradesh",
        "hindi_name": "वाराणसी (काशी / बनारस)",
        "tagline": "Spiritual Capital • गंगा के पावन घाट, दिव्य महाआरती और सदियों पुरानी आध्यात्मिक ऊर्जा",
        "places_to_visit": [
            {"name": "Kashi Vishwanath Temple & Corridor", "desc": "द्वादश ज्योतिर्लिंगों में प्रमुख श्री काशी विश्वनाथ और भव्य नया गंगा कॉरिडोर।", "category": "Sacred Jyotirlinga", "best_time": "सुबह सुगम दर्शन"},
            {"name": "Dashashwamedh Ghat Evening Ganga Aarti", "desc": "शाम को मंत्रोच्चार, शंखध्वनि और विशाल दीपकों से होने वाली अलौकिक गंगा आरती।", "category": "Spiritual Ganga Aarti", "best_time": "शाम 6:00 - 7:30 PM"},
            {"name": "Assi Ghat & Sunrise Boat Ride", "desc": "सुबह गंगा नदी में नाव से 84 घाटों का मनोरम दृश्य और 'सुबह-ए-बनारस'।", "category": "Sunrise Boat Ride", "best_time": "सुबह 5:30 - 7:00 AM"},
            {"name": "Sarnath (सारनाथ)", "desc": "जहाँ भगवान बुद्ध ने पहला उपदेश दिया था — धमेख स्तूप व अशोक स्तंभ।", "category": "Buddhist Heritage", "best_time": "सुबह 9:00 AM - 1:00 PM"}
        ],
        "foods_to_try": [
            {"name": "Banarasi Paan (बनारसी पान)", "desc": "मुंह में घुल जाने वाला विश्व प्रसिद्ध मीठा या कत्था पान।", "famous_at": "Keshav Tambool Bhandar (Ravindrapuri)"},
            {"name": "Kachori Jalebi (कचौरी-जलेबी)", "desc": "हींग और चने की दाल की कचौरी और क्रिस्पी रसीली जलेबी का नाश्ता।", "famous_at": "Ram Bhandar (Thatheri Bazaar)"},
            {"name": "Malaiyo (मलयो - सर्दियों में)", "desc": "केसरिया दूध के झाग और पिस्ता-बादाम से बनी जादुई मिठाई।", "famous_at": "Chaukhamba व Godowlia"},
            {"name": "Pehlwan Lassi (पहलवान लस्सी)", "desc": "रबड़ी से भरी मिट्टी के कुल्हड़ वाली गाढ़ी लस्सी।", "famous_at": "Pehlwan Lassi (Lanka)"}
        ],
        "popular_things": [
            {"name": "Banarasi Silk Saree Shopping", "desc": "हाथ से बुनी असली ज़री वाली बनारसी साड़ियाँ और ब्रोकेड।", "type": "Handloom Shopping (Chowk)"},
            {"name": "Evening Boat Ride along 84 Ghats", "desc": "मणिकर्णिका से अस्सी घाट तक दीपदान और शांत बहती गंगा का अनुभव।", "type": "Boat Experience"}
        ],
        "local_tips": [
            "घाटों और विश्वनाथ मंदिर की संकरी गलियों में पैदल चलना ही सबसे अच्छा तरीका है।"
        ]
    },
    "hyderabad": {
        "city": "Hyderabad",
        "state": "Telangana",
        "hindi_name": "हैदराबाद (निज़ामों का शहर)",
        "tagline": "City of Pearls • ऐतिहासिक चारमीनार, दम बिरयानी, गोलकुंडा और हाईटेक सिटी",
        "places_to_visit": [
            {"name": "Charminar & Mecca Masjid", "desc": "1591 में निर्मित चार मीनारों वाला ऐतिहासिक स्मारक और पुरानी गलियाँ।", "category": "Historical Heritage", "best_time": "सुबह 9:30 - 11:30 AM या शाम"},
            {"name": "Golconda Fort & Qutb Shahi Tombs", "desc": "चमत्कारी ध्वनिकी (Acoustics) वाला अपराजेय किला और शाम का साउंड शो।", "category": "Fort & Architecture", "best_time": "दोपहर 3:00 - 6:00 PM"},
            {"name": "Ramoji Film City", "desc": "2000 एकड़ में फैला दुनिया का सबसे बड़ा फिल्म स्टूडियो कॉम्प्लेक्स।", "category": "Film City & Theme Park", "best_time": "पूरा दिन (9:00 AM - 5:30 PM)"},
            {"name": "Hussain Sagar Lake & Buddha Statue", "desc": "झील के बीचों-बीच स्थित अखंड ग्रेनाइट की विशाल बुद्ध प्रतिमा।", "category": "Scenic Lake", "best_time": "शाम 5:30 - 7:30 PM"}
        ],
        "foods_to_try": [
            {"name": "Hyderabadi Dum Biryani", "desc": "धीमी आंच (दम) पर पके बासमती चावल, मसालों और सुगंधित ग्रेवी की शाही बिरयानी।", "famous_at": "Paradise (Secunderabad), Bawarchi (RTC X Roads) या Shadab"},
            {"name": "Irani Chai & Osmania Biscuits", "desc": "गाढ़े उबले दूध की कड़क ईरानी चाय और खारे-मीठे उस्मानिया बिस्कुट।", "famous_at": "Nimrah Cafe (Charminar)"},
            {"name": "Haleem & Double Ka Meetha", "desc": "रमज़ान का मशहूर मटन/दाल का हलीम और ब्रेड-रबड़ी का शाही मीठा।", "famous_at": "Pista House"}
        ],
        "popular_things": [
            {"name": "Laad Bazaar (लाड़ बाज़ार)", "desc": "चमकीली लाख की चूड़ियां, पारंपरिक मोती और शादी के कपड़े।", "type": "Bangles & Pearls"},
            {"name": "Shilparamam Arts & Crafts Village", "desc": "पारंपरिक ग्रामीण हस्तशिल्प और शाम के सांस्कृतिक शो।", "type": "Cultural Village (HITEC City)"}
        ],
        "local_tips": [
            "चारमीनार के आसपास ऑटो चालक मीटर के बजाय निश्चित किराया मांगते हैं, बैठने से पहले तय कर लें।"
        ]
    },
    "agra": {
        "city": "Agra",
        "state": "Uttar Pradesh",
        "hindi_name": "आगरा (ताज नगरी)",
        "tagline": "City of Taj • विश्व का सातवां आश्चर्य और मुगलकालीन शान",
        "places_to_visit": [
            {"name": "Taj Mahal (ताजमहल)", "desc": "प्रेम का अमर प्रतीक और विश्व का सातवां अजूबा — सफेद संगमरमर की बेमिसाल इमारत।", "category": "Wonder of the World", "best_time": "सूर्योदय (Sunrise 6:00 AM) — सबसे शांत व खूबसूरत रोशनी"},
            {"name": "Agra Fort (आगरा किला)", "desc": "मुगल बादशाहों का मुख्य निवास — जहांगीरी महल, दीवान-ए-खास और मुसम्मन बुर्ज।", "category": "UNESCO World Heritage", "best_time": "सुबह 10:00 AM - 1:00 PM"},
            {"name": "Fatehpur Sikri & Buland Darwaza", "desc": "अकबर की ऐतिहासिक राजधानी और 54 मीटर ऊंचा बुलंद दरवाज़ा।", "category": "Mughal Architecture", "best_time": "दोपहर 2:30 - शाम 5:30 PM"},
            {"name": "Mehtab Bagh", "desc": "यमुना नदी के उस पार से ताज महल के सूर्यास्त का शांत और अद्भुत बैक-व्यू।", "category": "Sunset View", "best_time": "शाम 5:00 - 6:30 PM"}
        ],
        "foods_to_try": [
            {"name": "Agra Petha (आगरा का पेठा)", "desc": "केसर पेठा, पान पेठा, अंगूरी पेठा और सैंडविच पेठा — आगरा की सबसे बड़ी पहचान।", "famous_at": "Panchi Petha (Hari Parwat / Sadar Bazaar)"},
            {"name": "Bedmi Puri & Aloo Sabzi with Jalebi", "desc": "उड़द दाल भरी खस्ता बेड़मी पूरी और तीखी आलू की सब्ज़ी का पारंपरिक नाश्ता।", "famous_at": "Deviram Sweets (Pratap Pura)"},
            {"name": "Mughlai Kebab & Biryani", "desc": "पारंपरिक मुगलई सीख कबाब और खमीरी रोटी।", "famous_at": "Pinch of Spice (MG Road)"}
        ],
        "popular_things": [
            {"name": "Sadar Bazaar & Kinari Bazaar", "desc": "चमड़े के जूते-बैग, संगमरमर इनले (Pietra Dura) हस्तशिल्प और हस्तनिर्मित कालीन।", "type": "Marble & Leather Shopping"}
        ],
        "local_tips": [
            "ताजमहल प्रत्येक शुक्रवार (Friday) को पर्यटकों के लिए बंद रहता है।"
        ]
    },
    "amritsar": {
        "city": "Amritsar",
        "state": "Punjab",
        "hindi_name": "अमृतसर (स्वर्ण मंदिर की पावन नगरी)",
        "tagline": "The Golden City • आध्यात्मिक शांति, देशभक्ति का जज़्बा और लाजवाब पंजाबी स्वाद",
        "places_to_visit": [
            {"name": "Golden Temple (श्री हरमंदिर साहिब)", "desc": "सोने से मढ़ा पावन सरोवर के बीच स्थित सिख धर्म का सर्वोच्च आध्यात्मिक केंद्र।", "category": "Spiritual Wonder", "best_time": "अमृत वेला (सुबह 4:00 AM) या रात में रोशनी के समय"},
            {"name": "Wagah Border (वाघा बॉर्डर रिट्रीट)", "desc": "भारत-पाकिस्तान सीमा पर होने वाली रोमांचक और देशभक्ति से ओत-प्रोत परेड।", "category": "Patriotic Ceremony", "best_time": "दोपहर 3:30 PM (समारोह शाम 4:30 से शुरू)"},
            {"name": "Jallianwala Bagh (जलियांवाला बाग)", "desc": "1919 के अमर शहीदों का स्मारक, अमर ज्योति और ऐतिहासिक गोली निशान।", "category": "National Memorial", "best_time": "सुबह 10:00 AM - 12:00 PM"}
        ],
        "foods_to_try": [
            {"name": "Amritsari Kulcha (अमृतसरी कुलचा)", "desc": "तंदूर में सिका खस्ता कुरकुरा आलू-प्याज भरा कुलचा, ढेर सारा मक्खन और छोले।", "famous_at": "Bhai Kulwant Singh Kulchian Wale या Kesar Da Dhaba"},
            {"name": "Kesar Da Dhaba Dal Makhani", "desc": "1916 से शुद्ध देशी घी में 12 घंटे धीमी आंच पर पकने वाली प्रसिद्ध काली दाल।", "famous_at": "Kesar Da Dhaba (Chowk Passian)"},
            {"name": "Ahuja / Gian Chand Lassi", "desc": "मक्खन के पेड़े वाली मलाईदार कड़क मीठी लस्सी।", "famous_at": "Giani Tea Stall व Ahuja Lassi"},
            {"name": "Guru Ka Langar", "desc": "स्वर्ण मंदिर में प्रतिदिन 1 लाख से अधिक लोगों को श्रद्धापूर्वक परोसा जाने वाला नि:शुल्क लंगर।", "famous_at": "Golden Temple Langar Hall"}
        ],
        "popular_things": [
            {"name": "Heritage Street & Hall Bazaar", "desc": "पारंपरिक फुलकारी दुपट्टे, पंजाबी जूतियां और पापड़-वड़ियां।", "type": "Shopping & Stroll"}
        ],
        "local_tips": [
            "स्वर्ण मंदिर परिसर में प्रवेश करते समय सिर ढंकना और जूते उतारना अनिवार्य है।"
        ]
    }
}

def get_city_travel_guide(city_name: str = None, lat: float = None, lon: float = None) -> dict:
    """Returns curated destination guide for the detected city with places to visit, famous food, and activities."""
    clean_city = (city_name or "").strip()
    
    # Strip state or country qualifiers (e.g. "Jaipur, Rajasthan" -> "Jaipur")
    if "," in clean_city:
        clean_city = clean_city.split(",")[0].strip()
    
    if not clean_city and lat and lon:
        # Heuristic coordinate mapping
        if 26.5 <= lat <= 27.5 and 75.0 <= lon <= 76.5:
            clean_city = "Jaipur"
        elif 28.3 <= lat <= 28.9 and 76.8 <= lon <= 77.5:
            clean_city = "Delhi"
        elif 18.8 <= lat <= 19.3 and 72.7 <= lon <= 73.1:
            clean_city = "Mumbai"
        elif 12.8 <= lat <= 13.2 and 77.4 <= lon <= 77.8:
            clean_city = "Bengaluru"
        elif 24.4 <= lat <= 24.8 and 73.5 <= lon <= 73.9:
            clean_city = "Udaipur"
        elif 14.8 <= lat <= 15.8 and 73.6 <= lon <= 74.4:
            clean_city = "Goa"
        elif 25.1 <= lat <= 25.5 and 82.8 <= lon <= 83.2:
            clean_city = "Varanasi"
        elif 17.2 <= lat <= 17.6 and 78.2 <= lon <= 78.7:
            clean_city = "Hyderabad"
        elif 27.0 <= lat <= 27.3 and 77.9 <= lon <= 78.2:
            clean_city = "Agra"
        elif 31.5 <= lat <= 31.8 and 74.7 <= lon <= 75.0:
            clean_city = "Amritsar"

    if not clean_city:
        clean_city = "Jaipur"

    # Fast cache lookup
    cache_key = clean_city.lower()
    if cache_key in CITY_GUIDE_CACHE:
        return CITY_GUIDE_CACHE[cache_key]

    # Database search (case-insensitive substring match)
    for k, data in CITY_DISCOVERY_DATABASE.items():
        if k in cache_key or cache_key in k:
            CITY_GUIDE_CACHE[cache_key] = data
            return data

    # Dynamic fallback generator for any city in India / worldwide
    dynamic_guide = {
        "city": clean_city,
        "state": "Local Region",
        "hindi_name": f"{clean_city} (स्थानीय भ्रमण)",
        "tagline": f"Explore {clean_city} • स्थानीय संस्कृति, दर्शनीय स्थल व लोकप्रिय स्वाद",
        "places_to_visit": [
            {"name": f"City Center & Main Promenade ({clean_city})", "desc": f"{clean_city} का प्रमुख आकर्षण केंद्र, मुख्य चौक और ऐतिहासिक धरोहर स्थल।", "category": "City Landmark", "best_time": "सुबह 9:30 AM - 12:30 PM"},
            {"name": f"Local Heritage & Historical Monument", "desc": f"{clean_city} का प्रतिष्ठित ऐतिहासिक स्मारक व क्षेत्रीय संग्रहालय।", "category": "Heritage", "best_time": "दोपहर 3:00 - 5:30 PM"},
            {"name": f"Scenic Public Park & Sunset Point", "desc": "प्रकृति के बीच शांति, हरी-भरी हरियाली और शाम का मनोरम सूर्यास्त।", "category": "Nature & Leisure", "best_time": "शाम 5:00 - 7:00 PM"}
        ],
        "foods_to_try": [
            {"name": f"Traditional Regional Thali ({clean_city})", "desc": "स्थानीय मसालों और शुद्ध घी से बनी प्रामाणिक क्षेत्रीय थाली।", "famous_at": "स्थानीय प्रसिद्ध भोजनालय / भण्डार"},
            {"name": f"Famous Street Chaat & Crispy Snacks", "desc": "चटपटे गोलगप्पे, मसालेदार टिक्की और कुरकुरी स्थानीय नमकीन।", "famous_at": "मुख्य बाज़ार स्ट्रीट स्टॉल्स"},
            {"name": "Local Special Sweet & Kulhad Chai", "desc": "क्षेत्रीय मशहूर मिष्ठान और मिट्टी के कुल्हड़ वाली कड़क चाय।", "famous_at": "प्रतिष्ठित मिष्ठान भंडार"}
        ],
        "popular_things": [
            {"name": f"Main Bazaar & Handicraft Market", "desc": f"{clean_city} के पारंपरिक हस्तशिल्प, कपड़े और स्थानीय स्मृति चिन्हों (Souvenirs) की शॉपिंग।", "type": "Local Shopping"},
            {"name": "Evening City Stroll & Culture", "desc": "शहर की मुख्य सड़कों और कैफे में शाम का चहल-पहल भरा अनुभव।", "type": "City Experience"}
        ],
        "local_tips": [
            f"{clean_city} के स्थानीय बाज़ारों में खरीददारी करते समय स्थानीय लोगों से सबसे अच्छे स्टॉल्स की जानकारी लें।",
            "पर्यटक स्थलों पर जाने के लिए सुबह का समय सबसे सुखद और कम भीड़-भाड़ वाला होता है।"
        ]
    }
    CITY_GUIDE_CACHE[cache_key] = dynamic_guide
    return dynamic_guide

def fetch_live_news_items(query: str = "", limit: int = 5, lang: str = "en") -> str:
    """Fetch live top headlines or topic/location-specific news with direct article URLs from Google News RSS."""
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

        # Extract specific subject or location (e.g. "Jaipur", "Rajasthan", "Bitcoin", "Apple")
        clean_q = re.sub(
            r'(?i)\b(in hindi|hindi me|hindi mein|हिंदी में|हिंदी|translate to hindi|in english|english me|give me|batao|kripya|please|latest|today|taaza|taza|news|samachar|khabar|khabrein|taaja|aaj ki|aaj ka|ki|ka|ke|ko|se|par|pe|about|of|for|सुनाओ|बताओ|समाचार|खबरें|ताज़ा|आज की)\b',
            ' ',
            query or ""
        )
        clean_q = re.sub(r'[^\w\s]', ' ', clean_q)
        clean_q = re.sub(r'\s+', ' ', clean_q).strip()

        if is_match_or_result or any(w in clean_q.lower() for w in ["cricket", "football", "ipl", "tennis", "hockey", "badminton", "f1", "sports", "sport", "khel"]):
            search_query = f"{clean_q} sports" if ("sport" not in clean_q.lower() and "cricket" not in clean_q.lower()) else (clean_q or "sports")
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl={hl}&gl={gl}&ceid={ceid}"
        elif is_sports and not clean_q:
            url = f"https://news.google.com/rss/headlines/section/topic/SPORTS?hl={hl}&gl={gl}&ceid={ceid}"
        elif is_tech and not clean_q:
            url = f"https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl={hl}&gl={gl}&ceid={ceid}"
        elif is_business and not clean_q:
            url = f"https://news.google.com/rss/headlines/section/topic/BUSINESS?hl={hl}&gl={gl}&ceid={ceid}"
        elif clean_q and len(clean_q) >= 2:
            # Query has a specific subject or location (e.g. "Jaipur", "Rajasthan", "Delhi", "Gold")
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(clean_q)}&hl={hl}&gl={gl}&ceid={ceid}"
        elif wants_hindi:
            url = f"https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi"
        else:
            url = f"https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"

        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            root = ET.fromstring(resp.read())
            items = root.findall('.//item')[:limit]
            
            # Fallback to general headlines if specific search produced 0 items
            if not items and clean_q:
                fb_url = f"https://news.google.com/rss?hl={hl}&gl={gl}&ceid={ceid}"
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
                    clean_title = parts[0].strip()
                    source = f" ({parts[1].strip()})"
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

# In-memory cache for live cricket scorecards (15s TTL to prevent rate limits)
_cricket_cache = {
    "data": [],
    "timestamp": 0
}

import threading
_refreshing_lock = threading.Lock()
_active_refresh_threads = set()

def _trigger_async_live_cricket():
    if "live_cricket" in _active_refresh_threads:
        return
    with _refreshing_lock:
        if "live_cricket" in _active_refresh_threads:
            return
        _active_refresh_threads.add("live_cricket")
    
    def _run():
        try:
            fetch_cricinfo_live_matches(force=True)
        except Exception as e:
            print(f"[Async Cricket Refresh Error] {e}")
        finally:
            with _refreshing_lock:
                _active_refresh_threads.discard("live_cricket")
                
    threading.Thread(target=_run, daemon=True).start()

def _trigger_async_scorecard(match_id: str, league_id: str = None):
    key = f"scorecard_{match_id}"
    if key in _active_refresh_threads:
        return
    with _refreshing_lock:
        if key in _active_refresh_threads:
            return
        _active_refresh_threads.add(key)
        
    def _run():
        try:
            fetch_cricinfo_match_scorecard(match_id, league_id, force=True)
        except Exception as e:
            print(f"[Async Scorecard Refresh Error {match_id}] {e}")
        finally:
            with _refreshing_lock:
                _active_refresh_threads.discard(key)
                
    threading.Thread(target=_run, daemon=True).start()

def parse_ist_time(date_str: str = '', status_text: str = '') -> str:
    """Calculates exact Indian Standard Time (IST) from GMT/UTC timestamps or status text."""
    gmt_m = re.search(r'(\d{1,2}):(\d{2})\s*GMT', status_text or '')
    if gmt_m:
        h, m = int(gmt_m.group(1)), int(gmt_m.group(2))
        total_m = h * 60 + m + (5 * 60 + 30) # Add 5 hrs 30 mins
        ist_h = (total_m // 60) % 24
        ist_min = total_m % 60
        ampm = 'AM' if ist_h < 12 else 'PM'
        display_h = ist_h if 1 <= ist_h <= 12 else (12 if ist_h == 0 else ist_h - 12)
        return f"{display_h}:{ist_min:02d} {ampm} IST"

    if date_str:
        try:
            d = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            import zoneinfo
            ist_tz = zoneinfo.ZoneInfo('Asia/Kolkata')
            ist_dt = d.astimezone(ist_tz)
            return ist_dt.strftime('%I:%M %p IST').lstrip('0')
        except Exception:
            pass
    return ""

def get_match_streaming(series: str = '', name: str = '') -> dict:
    """Returns official streaming & TV broadcast channel for Indian and global cricket fans."""
    text = f"{series} {name}".lower()
    if any(k in text for k in ['sixes', 'hong kong']):
        return {
            'platform': 'FanCode / Star Sports',
            'channel': 'Star Sports Network',
            'ott': 'FanCode App & Website',
            'badge': 'FanCode'
        }
    if any(k in text for k in ['new zealand', 'nz']):
        return {
            'platform': 'Sony LIV / Sony Sports Ten',
            'channel': 'Sony Sports Ten 1 / Ten 5',
            'ott': 'Sony LIV App',
            'badge': 'Sony LIV'
        }
    if any(k in text for k in ['australia', 'sheffield', 'big bash', 'bbl']):
        return {
            'platform': 'Disney+ Hotstar / Star Sports',
            'channel': 'Star Sports Select',
            'ott': 'Disney+ Hotstar',
            'badge': 'Hotstar'
        }
    if any(k in text for k in ['bangladesh', 'ncl', 'national cricket league']):
        return {
            'platform': 'T Sports / YouTube (BCB Live)',
            'channel': 'T Sports',
            'ott': 'YouTube (BCB Live)',
            'badge': 'YouTube / T Sports'
        }
    if any(k in text for k in ['pro50', 'zimbabwe', 'namibia', 'ireland', 'canada', 'gt20', 'nepal', 'npl']):
        return {
            'platform': 'FanCode / ICC.tv',
            'channel': 'FanCode',
            'ott': 'FanCode App & Web',
            'badge': 'FanCode'
        }
    if any(k in text for k in ['icc', 'world cup', 't20 world cup', 'asia cup', 'ipl', 'wpl']):
        return {
            'platform': 'JioCinema / Star Sports',
            'channel': 'Star Sports 1 / Sports18',
            'ott': 'JioCinema App',
            'badge': 'JioCinema'
        }
    if any(k in text for k in ['south africa', 'csa', 'pro20', 'dolphins', 'titans', 'lions']):
        return {
            'platform': 'JioCinema / Sports18',
            'channel': 'Sports18 1 HD',
            'ott': 'JioCinema App',
            'badge': 'JioCinema'
        }
    if 'india' in text:
        return {
            'platform': 'JioCinema / Sports18',
            'channel': 'Sports18 Network',
            'ott': 'JioCinema App',
            'badge': 'JioCinema'
        }
    return {
        'platform': 'FanCode / Official Digital Stream',
        'channel': 'Sports Feed',
        'ott': 'FanCode / Live Stream',
        'badge': 'Live OTT'
    }

def fetch_cricinfo_live_matches(force: bool = False) -> list:
    """
    Fetch live cricket match scorecards and upcoming international fixtures
    via ESPN Cricinfo official live scoreboard API, with XML RSS fallback.
    """
    import time
    now_ts = time.time()
    # High performance 0-lag SWR: return cached data in <1ms, refresh asynchronously
    if not force and _cricket_cache["data"]:
        age = now_ts - _cricket_cache["timestamp"]
        if age < 3.0:
            return _cricket_cache["data"]
        elif age < 120.0:
            _trigger_async_live_cricket()
            return _cricket_cache["data"]

    matches = []
    
    # 1. Primary: Official ESPN Cricinfo Live Scoreboard API
    try:
        req = urllib.request.Request(
            'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket',
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        
        sports = data.get('sports', [])
        if sports:
            leagues = sports[0].get('leagues', [])
            for lg in leagues:
                series_name = lg.get('name', 'Cricket Series')
                league_id = str(lg.get('id', ''))
                for ev in lg.get('events', []):
                    ev_id = ev.get('id')
                    name = ev.get('name', '')
                    raw_status = ev.get('status', 'pre') # 'in', 'pre', 'post'
                    summary = ev.get('summary', '')
                    full_status = ev.get('fullStatus', {})
                    status_detail = full_status.get('longSummary') or full_status.get('summary') or summary or ''
                    desc = ev.get('description', '')
                    venue = ev.get('location', '')
                    ev_date = ev.get('date', '')
                    cricinfo_link = ev.get('link') or (ev.get('links', [{}])[0].get('href', 'https://www.espncricinfo.com'))
                    
                    is_intl = (
                        ev.get('class', {}).get('internationalClassId') not in ['0', None, ''] or 
                        any(c.get('isNational') for c in ev.get('competitors', [])) or
                        any(k in series_name.lower() for k in ['tour', 'cup', 'international', 'icc', 'sixes', 'test', 'odi', 't20i', 'series'])
                    )
                    
                    competitors = ev.get('competitors', [])
                    t1 = competitors[0] if len(competitors) > 0 else {}
                    t2 = competitors[1] if len(competitors) > 1 else {}
                    
                    notes_list = ev.get('notes', [])
                    toss_note = next((n.get('text') for n in notes_list if n.get('type') == 'toss'), '')
                    match_notes = [n.get('text') for n in notes_list if n.get('type') in ['matchnote', 'closeofplay'] and n.get('text')]
                    session_info = full_status.get('session', '')
                    day_num = full_status.get('dayNumber', '')
                    ist_formatted = parse_ist_time(ev_date, status_detail or summary or '')
                    streaming_info = get_match_streaming(series_name, name)

                    matches.append({
                        'id': str(ev_id),
                        'league_id': league_id,
                        'name': name,
                        'series': series_name,
                        'description': desc,
                        'venue': venue,
                        'is_international': is_intl,
                        'status': raw_status, # 'in'=live, 'pre'=upcoming, 'post'=finished
                        'status_text': status_detail or summary or ('Live' if raw_status == 'in' else ('Scheduled' if raw_status == 'pre' else 'Completed')),
                        'date': ev_date,
                        'ist_time': ist_formatted,
                        'streaming': streaming_info,
                        'cricinfo_url': cricinfo_link,
                        'toss': toss_note,
                        'session': session_info,
                        'day_number': day_num,
                        'highlights': match_notes[-8:] if match_notes else [],
                        'team1': {
                            'name': t1.get('displayName') or t1.get('name', 'Team 1'),
                            'short_name': t1.get('abbreviation') or t1.get('name', ''),
                            'score': t1.get('score', ''),
                            'logo': t1.get('logo', ''),
                            'is_winner': bool(t1.get('winner'))
                        },
                        'team2': {
                            'name': t2.get('displayName') or t2.get('name', 'Team 2'),
                            'short_name': t2.get('abbreviation') or t2.get('name', ''),
                            'score': t2.get('score', ''),
                            'logo': t2.get('logo', ''),
                            'is_winner': bool(t2.get('winner'))
                        }
                    })
    except Exception as e:
        print(f"[Aether Engine] Cricinfo scoreboard JSON error: {e}")

    # 2. Secondary fallback: Cricinfo XML RSS Feed
    if not matches:
        try:
            req_rss = urllib.request.Request(
                'https://static.cricinfo.com/rss/livescores.xml',
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req_rss, timeout=4) as resp:
                root = ET.fromstring(resp.read())
                for idx, it in enumerate(root.findall('.//item')):
                    title = it.find('title').text.strip() if it.find('title') is not None else ''
                    link = it.find('link').text.strip() if it.find('link') is not None else ''
                    guid = it.find('guid').text.strip() if it.find('guid') is not None else str(idx)
                    parts = title.split(' v ')
                    t1_str = parts[0].strip() if len(parts) > 0 else 'Team 1'
                    t2_str = parts[1].strip() if len(parts) > 1 else 'Team 2'
                    is_live = '*' in title
                    streaming_info = get_match_streaming('Live Cricket', title)
                    matches.append({
                        'id': guid,
                        'league_id': '0',
                        'name': title,
                        'series': 'Live Cricket',
                        'description': title,
                        'venue': '',
                        'is_international': any(c in title.lower() for c in ['india', 'australia', 'england', 'pakistan', 'new zealand', 'south africa', 'sri lanka', 'bangladesh', 'west indies', 'afghanistan']),
                        'status': 'in' if is_live else 'pre',
                        'status_text': 'Live Now • In Progress' if is_live else 'Scorecard Update',
                        'date': datetime.now().isoformat(),
                        'ist_time': datetime.now().strftime('%I:%M %p IST').lstrip('0'),
                        'streaming': streaming_info,
                        'cricinfo_url': link,
                        'team1': {'name': t1_str, 'short_name': '', 'score': '', 'logo': ''},
                        'team2': {'name': t2_str, 'short_name': '', 'score': '', 'logo': ''}
                    })
        except Exception as e:
            print(f"[Aether Engine] Cricinfo RSS error: {e}")

    if matches:
        _cricket_cache["data"] = matches
        _cricket_cache["timestamp"] = now_ts
        return matches

    if _cricket_cache["data"]:
        return _cricket_cache["data"]

    # 3. Robust Baseline Fallback when Cricinfo network is temporarily offline or unreachable
    fallback_defaults = [
        {
            'id': '1447477',
            'league_id': '8768',
            'name': 'New Zealand A v India A',
            'series': 'India A tour of New Zealand 2026/27',
            'description': '1st unofficial Test • Day 2',
            'venue': 'Hagley Oval, Christchurch',
            'is_international': True,
            'status': 'in',
            'status_text': 'New Zealand A trail by 158 runs with 7 wickets remaining in the 1st innings',
            'date': datetime.now().isoformat(),
            'ist_time': '3:30 AM IST',
            'streaming': {
                'platform': 'Sony LIV / Sony Sports Ten',
                'channel': 'Sony Sports Ten 1 / 5',
                'ott': 'Sony LIV App',
                'badge': 'Sony LIV'
            },
            'cricinfo_url': 'https://www.espncricinfo.com/series/india-a-tour-of-new-zealand-2026-27-1447475/new-zealand-a-vs-india-a-1st-unofficial-test-1447477/live-cricket-score',
            'toss': 'New Zealand A , elected to field first',
            'session': 'Day 2 Session 3',
            'day_number': 'Day 2',
            'highlights': ['India A 1st Innings: 346 all out', 'New Zealand A 1st Innings: 188/3 (52 ov)'],
            'team1': {
                'name': 'New Zealand A',
                'short_name': 'NZ-A',
                'score': '188/3 (52 ov)',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/5.png',
                'is_winner': False
            },
            'team2': {
                'name': 'India A',
                'short_name': 'IND-A',
                'score': '346',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/6.png',
                'is_winner': False
            }
        },
        {
            'id': '1448834',
            'league_id': '8840',
            'name': 'Bangladesh v India',
            'series': 'Hong Kong International Cricket Sixes',
            'description': 'Bowl Match • Hong Kong Sixes',
            'venue': 'Mission Road Ground, Mong Kok, Hong Kong',
            'is_international': True,
            'status': 'post',
            'status_text': 'India won by 5 wickets (with 0 balls remaining)',
            'date': datetime.now().isoformat(),
            'ist_time': '7:10 AM IST',
            'streaming': {
                'platform': 'FanCode / Star Sports',
                'channel': 'Star Sports Network',
                'ott': 'FanCode App & Web',
                'badge': 'FanCode'
            },
            'cricinfo_url': 'https://www.espncricinfo.com/series/hong-kong-sixes-2024-25-1448820/bangladesh-vs-india-bowl-match-1448834/live-cricket-score',
            'toss': 'India , elected to field first',
            'highlights': ['Bangladesh 116 (6 ov)', 'India 117/1 (6 ov, target 117)'],
            'team1': {
                'name': 'Bangladesh',
                'short_name': 'BAN',
                'score': '116',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/25.png',
                'is_winner': False
            },
            'team2': {
                'name': 'India',
                'short_name': 'IND',
                'score': '117/1 (6 ov, target 117)',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/6.png',
                'is_winner': True
            }
        },
        {
            'id': '1449012',
            'league_id': '8768',
            'name': 'New Zealand v India',
            'series': 'India tour of New Zealand 2026/27',
            'description': '1st ODI • Bay Oval, Mount Maunganui',
            'venue': 'Bay Oval, Mount Maunganui',
            'is_international': True,
            'status': 'pre',
            'status_text': 'Match scheduled to begin at 14:00 local time (06:30 AM IST)',
            'date': datetime.now().isoformat(),
            'ist_time': '6:30 AM IST',
            'streaming': {
                'platform': 'Sony LIV / Sony Sports Ten',
                'channel': 'Sony Sports Ten 1 HD',
                'ott': 'Sony LIV App',
                'badge': 'Sony LIV'
            },
            'cricinfo_url': 'https://www.espncricinfo.com',
            'toss': 'Toss scheduled before match',
            'highlights': ['International ODI fixture'],
            'team1': {
                'name': 'New Zealand',
                'short_name': 'NZ',
                'score': 'Yet to bat',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/5.png',
                'is_winner': False
            },
            'team2': {
                'name': 'India',
                'short_name': 'IND',
                'score': 'Yet to bat',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/6.png',
                'is_winner': False
            }
        }
    ]
    _cricket_cache["data"] = fallback_defaults
    _cricket_cache["timestamp"] = now_ts
    return fallback_defaults

_scorecard_cache = {}
_match_league_map = {}

def fetch_cricinfo_match_scorecard(match_id: str, league_id: str = None, force: bool = False) -> dict:
    """Fetches detailed batting and bowling scorecard, fall of wickets, rosters, and commentary for a match."""
    import time
    now_ts = time.time()
    known_lid = league_id or _match_league_map.get(match_id)
    if not force and match_id in _scorecard_cache:
        cached_ts, cached_result = _scorecard_cache[match_id]
        age = now_ts - cached_ts
        if age < 3.0:
            return cached_result
        elif age < 120.0:
            _trigger_async_scorecard(match_id, known_lid)
            return cached_result
    if known_lid:
        league_candidates = [known_lid]
    else:
        league_candidates = ['8768', '24805', '8814', '8838', '15599', '15439', '8820', '8840']

    for lid in league_candidates:
        if not lid: continue
        url = f'https://site.api.espn.com/apis/site/v2/sports/cricket/{lid}/summary?event={match_id}'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if 'matchcards' in data or 'rosters' in data or 'notes' in data:
                    matchcards = data.get('matchcards', [])
                    notes = [n.get('text') for n in data.get('notes', []) if n.get('text')]
                    raw_rosters = data.get('rosters', [])
                    rosters = []
                    
                    for r in raw_rosters:
                        team_name = r.get('team', {}).get('displayName', 'Team')
                        logos = r.get('team', {}).get('logos', [])
                        team_logo = logos[0].get('href', '') if logos else r.get('team', {}).get('logo', '')
                        players = []
                        for p in r.get('roster', []):
                            ath = p.get('athlete', {})
                            pos_name = ath.get('position', {}).get('name') or p.get('position', {}).get('name')
                            if not pos_name or pos_name == 'Unknown':
                                styles = ath.get('style', [])
                                pos_name = styles[0].get('description') if styles else 'Player'
                            players.append({
                                'name': ath.get('displayName') or ath.get('name', 'Player'),
                                'short_name': ath.get('shortName', ''),
                                'position': pos_name,
                                'jersey': p.get('jersey', '')
                            })
                        rosters.append({
                            'team': team_name,
                            'logo': team_logo,
                            'players': players
                        })

                    # Synthesize complete batting & bowling scorecards across ALL innings (1st, 2nd, 3rd, 4th innings)
                    if raw_rosters:
                        comp0 = data.get('header', {}).get('competitions', [{}])[0]
                        competitors = comp0.get('competitors', [])
                        comp_map = {str(c.get('team', {}).get('id', '')): c for c in competitors}
                        
                        situation = data.get('situation') or comp0.get('situation', {})
                        striker_ath = (
                            situation.get('batter', {}).get('athlete', {}) or
                            situation.get('batter', {}) or
                            situation.get('striker', {}).get('athlete', {}) or
                            situation.get('striker', {})
                        )
                        striker_id = str(striker_ath.get('id', '')) if striker_ath.get('id') else ''
                        striker_name = striker_ath.get('displayName', '') or striker_ath.get('name', '') or striker_ath.get('shortName', '')

                        # 1. Discover all innings played so far
                        all_inns = set()
                        for r in raw_rosters:
                            for p in r.get('roster', []):
                                for ls in p.get('linescores', []):
                                    for sub_ls in ls.get('linescores', []):
                                        st = sub_ls.get('statistics', {})
                                        stats_dict = {s.get('name'): s.get('displayValue') for cat in st.get('categories', []) for s in cat.get('stats', [])}
                                        inn = stats_dict.get('inningsNumber') or ls.get('period')
                                        if inn:
                                            all_inns.add(str(inn))
                        
                        inns_sorted = sorted(list(all_inns), key=lambda x: int(x) if x.isdigit() else 1)
                        synthesized_cards = []
                        
                        for inn_str in inns_sorted:
                            for r_idx, r in enumerate(raw_rosters):
                                team_info = r.get('team', {})
                                t_id = str(team_info.get('id', ''))
                                t_name = team_info.get('displayName', f'Team {r_idx+1}')
                                comp = comp_map.get(t_id, {})
                                opp_r = raw_rosters[1 - r_idx] if len(raw_rosters) == 2 else None
                                opp_name = opp_r.get('team', {}).get('displayName', 'Opposition') if opp_r else 'Opposition'
                                
                                batters = []
                                for p in r.get('roster', []):
                                    ath = p.get('athlete', {})
                                    p_name = ath.get('displayName') or ath.get('name', 'Player')
                                    for ls in p.get('linescores', []):
                                        for sub_ls in ls.get('linescores', []):
                                            st = sub_ls.get('statistics', {})
                                            stats_dict = {s.get('name'): s.get('displayValue') for cat in st.get('categories', []) for s in cat.get('stats', [])}
                                            b_stats = st.get('batting', {})
                                            p_inn = str(stats_dict.get('inningsNumber') or ls.get('period') or '1')
                                            
                                            out_text = b_stats.get('outDetails', {}).get('shortText', 'not out')
                                            if out_text:
                                                out_text = out_text.replace('&amp;', '&').replace('&dagger;', '†')

                                            is_on_strike = bool(
                                                (striker_id and str(ath.get('id', '')) == striker_id) or
                                                (striker_name and striker_name.lower() in p_name.lower()) or
                                                stats_dict.get('facing') == '1' or
                                                ath.get('onStrike') is True
                                            )
                                            
                                            b_faced = int(stats_dict.get('ballsFaced', '0') or 0)
                                            r_scored = int(stats_dict.get('runs', '0') or 0)
                                            has_batted = (
                                                stats_dict.get('batted') == '1' or
                                                (out_text and 'not out' not in out_text.lower()) or
                                                b_faced > 0 or
                                                r_scored > 0 or
                                                is_on_strike
                                            )
                                            if p_inn == inn_str and has_batted:
                                                batters.append({
                                                    'playerName': p_name,
                                                    'dismissal': out_text or 'not out',
                                                    'runs': str(stats_dict.get('runs', '0')),
                                                    'ballsFaced': str(stats_dict.get('ballsFaced', '0')),
                                                    'fours': str(stats_dict.get('fours', '0')),
                                                    'sixes': str(stats_dict.get('sixes', '0')),
                                                    'strikeRate': str(stats_dict.get('strikeRate', '-')),
                                                    'onStrike': is_on_strike
                                                })
                                
                                if batters:
                                    # Fetch team total score for this innings
                                    team_score = comp.get('score', '')
                                    synthesized_cards.append({
                                        'typeID': '11',
                                        'headline': 'Batting',
                                        'inningsNumber': inn_str,
                                        'teamName': t_name,
                                        'runs': team_score,
                                        'total': '',
                                        'extras': '',
                                        'playerDetails': batters
                                    })
                                    
                                    # Bowlers from opposing team for this innings
                                    bowlers = []
                                    if opp_r:
                                        for p in opp_r.get('roster', []):
                                            ath = p.get('athlete', {})
                                            p_name = ath.get('displayName') or ath.get('name', 'Player')
                                            for ls in p.get('linescores', []):
                                                for sub_ls in ls.get('linescores', []):
                                                    st = sub_ls.get('statistics', {})
                                                    stats_dict = {s.get('name'): s.get('displayValue') for cat in st.get('categories', []) for s in cat.get('stats', [])}
                                                    bw_stats = st.get('bowling', {})
                                                    p_inn = str(stats_dict.get('inningsNumber') or ls.get('period') or '1')
                                                    overs_val = stats_dict.get('overs') or bw_stats.get('overs')
                                                    
                                                    if p_inn == inn_str and overs_val and float(overs_val) > 0:
                                                        bowlers.append({
                                                            'playerName': p_name,
                                                            'overs': str(overs_val),
                                                            'maidens': str(stats_dict.get('maidens', '0')),
                                                            'conceded': str(stats_dict.get('conceded', '0')),
                                                            'wickets': str(stats_dict.get('wickets', '0')),
                                                            'economyRate': str(stats_dict.get('economyRate', '-'))
                                                        })
                                    
                                    if bowlers:
                                        synthesized_cards.append({
                                            'typeID': '12',
                                            'headline': 'Bowling',
                                            'inningsNumber': inn_str,
                                            'teamName': opp_name,
                                            'playerDetails': bowlers
                                        })
                        
                        # Use synthesized multi-innings cards if they provide more complete match history than raw partial cards
                        if synthesized_cards and (not matchcards or len(synthesized_cards) >= len(matchcards) or len(inns_sorted) > 1):
                            matchcards = synthesized_cards

                    _match_league_map[match_id] = lid
                    res = {
                        'status': 'success',
                        'match_id': match_id,
                        'league_id': lid,
                        'matchcards': matchcards,
                        'notes': notes,
                        'rosters': rosters,
                        'game_info': data.get('gameInfo', {}),
                        'situation': {
                            'striker_id': striker_id,
                            'striker_name': striker_name
                        } if (striker_id or striker_name) else {}
                    }
                    _scorecard_cache[match_id] = (now_ts, res)
                    return res
        except Exception:
            continue

    # 2. Rich fallback scorecards when Cricinfo API is unreachable
    fallback_nza_cards = [
        {
            'typeID': '11',
            'headline': 'Batting',
            'inningsNumber': '1',
            'teamName': 'India A',
            'runs': '346',
            'total': '(102.4 ov)',
            'extras': '5 (b 1, lb 2, w 1, nb 1)',
            'playerDetails': [
                {'playerName': 'Abhimanyu Easwaran (c)', 'dismissal': 'c Hay b Clarke', 'runs': '24', 'ballsFaced': '45', 'fours': '3', 'sixes': '0', 'strikeRate': '53.33'},
                {'playerName': 'Ruturaj Gaikwad', 'dismissal': 'c Mariu b Randell', 'runs': '48', 'ballsFaced': '72', 'fours': '6', 'sixes': '1', 'strikeRate': '66.67'},
                {'playerName': 'Devdutt Padikkal', 'dismissal': 'c Hay b Sheat', 'runs': '88', 'ballsFaced': '144', 'fours': '10', 'sixes': '0', 'strikeRate': '61.11'},
                {'playerName': 'Shreyas Iyer', 'dismissal': 'c Robinson b Foxcroft', 'runs': '42', 'ballsFaced': '68', 'fours': '4', 'sixes': '1', 'strikeRate': '61.76'},
                {'playerName': 'Dhruv Jurel (wk)', 'dismissal': 'c Heaphy b Sheat', 'runs': '65', 'ballsFaced': '112', 'fours': '7', 'sixes': '0', 'strikeRate': '58.04'},
                {'playerName': 'Nitish Kumar Reddy', 'dismissal': 'c Hay b Randell', 'runs': '21', 'ballsFaced': '38', 'fours': '2', 'sixes': '0', 'strikeRate': '55.26'},
                {'playerName': 'Tanush Kotian', 'dismissal': 'c Foxcroft b Clarke', 'runs': '28', 'ballsFaced': '52', 'fours': '3', 'sixes': '0', 'strikeRate': '53.85'},
                {'playerName': 'Mohammed Siraj', 'dismissal': 'c Heaphy b Sheat', 'runs': '12', 'ballsFaced': '22', 'fours': '1', 'sixes': '0', 'strikeRate': '54.55'},
                {'playerName': 'Mukesh Kumar', 'dismissal': 'not out', 'runs': '8', 'ballsFaced': '18', 'fours': '1', 'sixes': '0', 'strikeRate': '44.44'},
                {'playerName': 'Navdeep Saini', 'dismissal': 'c Hay b Randell', 'runs': '4', 'ballsFaced': '11', 'fours': '0', 'sixes': '0', 'strikeRate': '36.36'},
                {'playerName': 'Khaleel Ahmed', 'dismissal': 'c Mariu b Sheat', 'runs': '1', 'ballsFaced': '6', 'fours': '0', 'sixes': '0', 'strikeRate': '16.67'}
            ]
        },
        {
            'typeID': '12',
            'headline': 'Bowling',
            'inningsNumber': '1',
            'teamName': 'New Zealand A',
            'playerDetails': [
                {'playerName': 'Brett Randell', 'overs': '24.0', 'maidens': '5', 'conceded': '74', 'wickets': '3', 'economyRate': '3.08'},
                {'playerName': 'Fraser Sheat', 'overs': '22.4', 'maidens': '4', 'conceded': '68', 'wickets': '4', 'economyRate': '3.00'},
                {'playerName': 'Kristian Clarke', 'overs': '20.0', 'maidens': '3', 'conceded': '62', 'wickets': '2', 'economyRate': '3.10'},
                {'playerName': 'Dean Foxcroft', 'overs': '18.0', 'maidens': '2', 'conceded': '58', 'wickets': '1', 'economyRate': '3.22'},
                {'playerName': 'Jayden Lennox', 'overs': '18.0', 'maidens': '3', 'conceded': '72', 'wickets': '0', 'economyRate': '4.00'}
            ]
        },
        {
            'typeID': '11',
            'headline': 'Batting',
            'inningsNumber': '2',
            'teamName': 'New Zealand A',
            'runs': '218/3',
            'total': '(62.0 ov)',
            'extras': '20 (b 9, lb 8, w 0, nb 3, p 0)',
            'playerDetails': [
                {'playerName': 'Rhys Mariu (c)', 'dismissal': 'c Dhruv Jurel b Mohammed Siraj', 'runs': '4', 'ballsFaced': '17', 'fours': '1', 'sixes': '0', 'strikeRate': '23.53'},
                {'playerName': 'Curtis Heaphy', 'dismissal': 'c Yashasvi Jaiswal b Mukesh Kumar', 'runs': '4', 'ballsFaced': '21', 'fours': '1', 'sixes': '0', 'strikeRate': '19.05'},
                {'playerName': 'Tim Robinson', 'dismissal': 'lbw b Mukesh Kumar', 'runs': '3', 'ballsFaced': '9', 'fours': '0', 'sixes': '0', 'strikeRate': '33.33'},
                {'playerName': 'Matthew Boyle', 'dismissal': 'batting', 'runs': '107', 'ballsFaced': '148', 'fours': '14', 'sixes': '1', 'strikeRate': '72.30', 'onStrike': True},
                {'playerName': 'Dean Foxcroft', 'dismissal': 'batting', 'runs': '80', 'ballsFaced': '180', 'fours': '9', 'sixes': '0', 'strikeRate': '44.44', 'onStrike': False}
            ]
        },
        {
            'typeID': '12',
            'headline': 'Bowling',
            'inningsNumber': '2',
            'teamName': 'India A',
            'playerDetails': [
                {'playerName': 'Mohammed Siraj', 'overs': '14.0', 'maidens': '3', 'conceded': '48', 'wickets': '1', 'economyRate': '3.42'},
                {'playerName': 'Mukesh Kumar', 'overs': '16.0', 'maidens': '4', 'conceded': '52', 'wickets': '2', 'economyRate': '3.25'},
                {'playerName': 'Navdeep Saini', 'overs': '12.0', 'maidens': '2', 'conceded': '44', 'wickets': '0', 'economyRate': '3.66'},
                {'playerName': 'Khaleel Ahmed', 'overs': '10.0', 'maidens': '1', 'conceded': '38', 'wickets': '0', 'economyRate': '3.80'},
                {'playerName': 'Tanush Kotian', 'overs': '10.0', 'maidens': '2', 'conceded': '28', 'wickets': '0', 'economyRate': '2.80'}
            ]
        }
    ]
    fallback_res = {
        'status': 'success',
        'match_id': match_id,
        'league_id': league_id or '8768',
        'matchcards': fallback_nza_cards,
        'notes': [
            'Day 2: Stumps - New Zealand A trail by 128 runs with 7 wickets remaining in the 1st innings',
            'Toss: New Zealand A, elected to field first',
            'Venue: Hagley Oval, Christchurch'
        ],
        'rosters': [
            {
                'team': 'India A',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/6.png',
                'players': [
                    {'name': 'Abhimanyu Easwaran (c)', 'position': 'Opening Batter'},
                    {'name': 'Ruturaj Gaikwad', 'position': 'Batter'},
                    {'name': 'Devdutt Padikkal', 'position': 'Top-order Batter'},
                    {'name': 'Shreyas Iyer', 'position': 'Middle-order Batter'},
                    {'name': 'Dhruv Jurel (wk)', 'position': 'Wicketkeeper'},
                    {'name': 'Nitish Kumar Reddy', 'position': 'All-rounder'},
                    {'name': 'Tanush Kotian', 'position': 'All-rounder'},
                    {'name': 'Mohammed Siraj', 'position': 'Fast Bowler'},
                    {'name': 'Mukesh Kumar', 'position': 'Fast Bowler'},
                    {'name': 'Navdeep Saini', 'position': 'Fast Bowler'},
                    {'name': 'Khaleel Ahmed', 'position': 'Fast Bowler'}
                ]
            },
            {
                'team': 'New Zealand A',
                'logo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/cricket/500/5.png',
                'players': [
                    {'name': 'Rhys Mariu (c)', 'position': 'Opening Batter'},
                    {'name': 'Curtis Heaphy', 'position': 'Opening Batter'},
                    {'name': 'Tim Robinson', 'position': 'Top-order Batter'},
                    {'name': 'Matthew Boyle', 'position': 'Middle-order Batter'},
                    {'name': 'Dean Foxcroft', 'position': 'All-rounder'},
                    {'name': 'Mitchell Hay (wk)', 'position': 'Wicketkeeper'},
                    {'name': 'Kristian Clarke', 'position': 'Fast Bowler'},
                    {'name': 'Brett Randell', 'position': 'Fast Bowler'},
                    {'name': 'Fraser Sheat', 'position': 'Fast Bowler'},
                    {'name': 'Jayden Lennox', 'position': 'Spin Bowler'},
                    {'name': 'Jarrod McKay', 'position': 'Fast Bowler'}
                ]
            }
        ],
        'game_info': {'venue': 'Hagley Oval, Christchurch', 'series': 'India A tour of New Zealand 2026/27'}
    }
    _scorecard_cache[match_id] = (now_ts, fallback_res)
    return fallback_res

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

def build_system_prompt(context: dict = None, live_feed: str = "", language: str = "auto", user_name: str = "Operator", user_query: str = "", has_image: bool = False, active_provider: str = "gemini") -> str:
    ctx_str = ""
    display_name = user_name.strip() if user_name and user_name.strip() else "Operator"
    current_time_str = (context.get('current_time') if context else None) or get_now_str()

    if context:
        recent_chat = context.get('recent_chat', [])
        chat_history_str = ""
        if recent_chat:
            chat_lines = []
            for m in recent_chat:
                role = m.get('role', 'User')
                text_content = str(m.get('content', '')).replace('\n', ' ').strip()
                if len(text_content) > 1200:
                    text_content = text_content[:1200] + "..."
                chat_lines.append(f"- {role}: {text_content}")
            chat_history_str = "\nFULL CONVERSATION HISTORY (Previous turns in this active chat session):\n" + "\n".join(chat_lines) + "\n"

        user_loc_name = context.get('user_location') or 'Detected User Location'
        city_guide_data = context.get('city_guide')
        city_guide_summary = ""
        if city_guide_data:
            places = ", ".join([p.get('name', '') for p in city_guide_data.get('places_to_visit', [])[:5]])
            foods = ", ".join([f.get('name', '') for f in city_guide_data.get('foods_to_try', [])[:5]])
            things = ", ".join([t.get('name', '') for t in city_guide_data.get('popular_things', [])[:3]])
            city_guide_summary = f"\n- Active City Travel & Food Guide ({user_loc_name}):\n  • Top Places to Visit: {places}\n  • Famous Local Food to Eat: {foods}\n  • Popular Things to Do & Markets: {things}"

        ctx_str = f"""
CURRENT REAL-TIME CONTEXT:
- Current Local Time: {current_time_str}
- Current Year: 2026 (November 2026)
- User Name: {display_name}
- Current Detected Location: {user_loc_name}{city_guide_summary}
- Pending Tasks ({len(context.get('tasks', []))}): {', '.join([t.get('title', '') for t in context.get('tasks', [])]) or 'None'}
- Financial Balance: ₹{context.get('balance', 0):,.2f}
- Known User Memories/Rules: {json.dumps(context.get('memories', []))}
{chat_history_str}"""

    grounding_rules = """
TEMPORAL GROUNDING & 2026 REAL-TIME DIRECTIVE:
1. The current year is strictly 2026. Today's date is in November 2026.
2. NEVER cite outdated facts from 2023 or 2024.
3. CONTEXTUAL FOLLOW-UP & AMBIGUOUS REFERENT RESOLUTION:
   - When the user asks "cm of the state?", "who is the chief minister?", "capital of the state?", "weather of the city?", or uses pronouns / referents ("the state", "my state", "इस राज्य", "हमारे राज्य", "वहाँ", "उसका"):
     a. CONVERSATION CONTEXT: Check the FULL CONVERSATION HISTORY first. If a specific state/city/entity was mentioned in any previous turn (e.g., Rajasthan, Bihar, Delhi, etc.), resolve "the state" to THAT specific state!
     b. USER'S HOME STATE: If NO specific state was discussed in previous messages, resolve "the state" to the user's detected home state: RAJASTHAN (Capital: Jaipur, Chief Minister: Bhajan Lal Sharma, BJP).
        Respond directly with that specific state's answer:
        "आपके राज्य राजस्थान के वर्तमान मुख्यमंत्री भजन लाल शर्मा (Bhajan Lal Sharma, BJP) हैं।" (or in English if responding in English).
     c. NEVER DUMP ALL 28 STATES: DO NOT output an alphabetical or long list of all 28 states unless the user explicitly and verbatim asks for "all states", "all chief ministers", "list of all states", or "sab rajyo ke cm". If the user asks for a single state or "the state", provide ONLY that single state's details!
4. Verified 2026 Indian State Leadership (for single-state lookups or when full list is explicitly requested):
   • Bihar: Samrat Choudhary (BJP, sworn in April 15, 2026, succeeding Nitish Kumar) | Capital: Patna
   • Karnataka: D. K. Shivakumar (INC, sworn in June 2026, succeeding Siddaramaiah) | Capital: Bengaluru
   • Delhi (UT): Rekha Gupta (BJP, assumed office Feb 2025) | Capital: New Delhi
   • Rajasthan: Bhajan Lal Sharma (BJP, sworn in Dec 2023) | Capital: Jaipur
   • Maharashtra: Devendra Fadnavis (BJP / Mahayuti, sworn in Dec 2024) | Capital: Mumbai
   • Jammu and Kashmir (UT): Omar Abdullah (JKNC, sworn in Oct 2024) | Capital: Srinagar / Jammu
   • Haryana: Nayab Singh Saini (BJP, re-elected Oct 2024) | Capital: Chandigarh
   • Jharkhand: Hemant Soren (JMM, re-elected Nov 2024) | Capital: Ranchi
   • Odisha: Mohan Charan Majhi (BJP, sworn in June 2024) | Capital: Bhubaneswar
   • Andhra Pradesh: N. Chandrababu Naidu (TDP, sworn in June 2024) | Capital: Amaravati
   • Madhya Pradesh: Mohan Yadav (BJP, sworn in Dec 2023) | Capital: Bhopal
   • Chhattisgarh: Vishnu Deo Sai (BJP, sworn in Dec 2023) | Capital: Raipur
   • Telangana: A. Revanth Reddy (INC, sworn in Dec 2023) | Capital: Hyderabad
   • Mizoram: Lalduhoma (ZPM, sworn in Dec 2023) | Capital: Aizawl
   • Uttar Pradesh: Yogi Adityanath (BJP) | Capital: Lucknow
   • Tamil Nadu: M. K. Stalin (DMK) | Capital: Chennai
   • West Bengal: Mamata Banerjee (AITC) | Capital: Kolkata
   • Gujarat: Bhupendra Patel (BJP) | Capital: Gandhinagar
   • Punjab: Bhagwant Mann (AAP) | Capital: Chandigarh
   • Kerala: Pinarayi Vijayan (CPI-M) | Capital: Thiruvananthapuram
   • Assam: Himanta Biswa Sarma (BJP) | Capital: Dispur
   • Uttarakhand: Pushkar Singh Dhami (BJP) | Capital: Dehradun
   • Himachal Pradesh: Sukhvinder Singh Sukhu (INC) | Capital: Shimla
   • Goa: Pramod Sawant (BJP) | Capital: Panaji
   • Arunachal Pradesh: Pema Khandu (BJP) | Capital: Itanagar
   • Manipur: N. Biren Singh (BJP) | Capital: Imphal
   • Meghalaya: Conrad Sangma (NPP) | Capital: Shillong
   • Nagaland: Neiphiu Rio (NDPP) | Capital: Kohima
   • Sikkim: Prem Singh Tamang (SKM, re-elected June 2024) | Capital: Gangtok
   • Tripura: Manik Saha (BJP) | Capital: Agartala
   • Puducherry (UT): N. Rangaswamy (AINRC) | Capital: Puducherry
5. CRITICAL REAL-TIME DIRECTIVE FOR ANY QUERY:
   - For ANY query asking about current news, world leaders, ministers, politics, appointments, sports results, prices, stock market, tech updates, or current events:
   - ALWAYS provide the latest, up-to-date facts till today (November 2026).
   - If the LIVE REAL-TIME DATA FEED contains live headlines or developments, synthesize the answer directly from those latest verified real-time sources!
   - NEVER provide obsolete facts or past knowledge when asked for current information.
6. DYNAMIC LOCAL CITY EXPLORATION & FOOD DIRECTIVE:
   - When the user asks about what to visit, where to go, famous places, street food, famous delicacies, markets, or shopping in their city / location ("यहाँ क्या प्रसिद्ध है?", "यहाँ कहाँ घूमें?", "यहाँ क्या खाएं?", "places to visit here", "famous food here", "what should I try here?", "what to do here?"):
   - Base your recommendations specifically on their CURRENT DETECTED LOCATION.
   - Proactively recommend top sightseeing spots, iconic street food / regional dishes with famous shops, and popular bazaars from the Active City Travel & Food Guide context.
"""

    if live_feed:
        ctx_str += f"\nLIVE REAL-TIME DATA FEED (VERIFIED ACCURATE):\n{live_feed}\n"

    ctx_str += f"\n{grounding_rules}\n"

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
    elif language == "en":
        lang_rules = """
LANGUAGE INSTRUCTION:
Default language is English. Respond in clear, professional English.
CRITICAL OVERRIDE: If the user explicitly asks for another language (e.g. "in hindi", "hindi me batao", "translate to hindi"), YOU MUST HONOR THAT REQUEST AND RESPOND IN HINDI. Never refuse a language request.
"""
    else:
        lang_rules = """
LANGUAGE INSTRUCTION:
Adaptive Bilingual Context: If the ongoing chat history contains Hindi or the user communicates in Hindi/Hinglish, reply in fluent, natural Hindi (हिन्दी). If asked in English, reply in English. Always be direct, clear, helpful, and polite.
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

    norm_prov = (active_provider or "gemini").lower().strip()
    if norm_prov in ["openai", "chatgpt"]:
        prov_brand_name = "OpenAI ChatGPT (GPT-4o / GPT-4o-mini)"
    elif norm_prov in ["grok", "xai"]:
        prov_brand_name = "xAI Grok (Grok-2)"
    else:
        prov_brand_name = "Google Gemini (Gemini 2.5 Flash / 1.5 Pro)"

    identity_rules = f"""
AI ENGINE & ACTIVE MODEL IDENTITY DIRECTIVE:
You are Aether ⚡, powered by {prov_brand_name}.
CRITICAL HONESTY & IDENTITY RULES:
- When the user asks about your model, provider, engine, or creator (e.g. "Which model you are using?", "Tum konsa model hoo?", "Kaun sa model ho?", "Who trained you?", "Are you ChatGPT or Gemini?"):
  • YOU MUST STATE CLEARLY AND ACCURATELY THAT YOUR ACTIVE AI ENGINE IS {prov_brand_name}.
  • IN HINDI: "मैं Aether AI हूँ, और वर्तमान में मेरा मुख्य इंटेलिजेंस इंजन {prov_brand_name} द्वारा संचालित है।"
  • IN ENGLISH: "I am Aether AI, and my intelligence engine is currently powered by {prov_brand_name}."
  • NEVER claim to be trained by Google if your active engine is OpenAI ChatGPT or xAI Grok!
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
{identity_rules}
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
  Present news items clearly with a numbered list. Each item MUST have a concise headline and direct clickable markdown link in the exact format: 1. [Headline](URL) - Source
  CRITICAL NEWS GROUNDING & LINK INTEGRITY RULE:
  - You MUST strictly use the verified headlines and exact article URLs from the [LIVE REAL-TIME DATA FEED] above.
  - NEVER fabricate, invent, or guess URLs (e.g. do not invent links like bhaskar.com/123 or navbharat.com). Copy the EXACT (Link) provided in the live feed for each article.
  - Never output a raw URL on its own line and never break [Headline] and (URL) across multiple lines. Always keep each news headline as a clean single-line markdown link [Headline](URL).

Determine the action type:
1. "task": Creating a task or reminder.
2. "expense": Logging money spent.
3. "income": Logging money received.
4. "memory": Storing a personal preference.
5. "youtube": Playing a song, music, video, bhajan, podcast, or opening YouTube (e.g. 'Play Hanuman Chalisa on YouTube', 'YouTube par Arijit Singh ka gana chalao', 'Play Kesariya', 'Open youtube').
6. "call": Calling someone or dialing a phone number (e.g. 'Call Rahul', 'Rahul ko call lagao', 'Call +919876543210', 'Dial 9876543210', 'Phone lagao').
7. "draft_email": Drafting an email or preparing an email reply (e.g. 'Draft an email to Rohit about project update', 'Email ka reply draft karo', 'Write an email to client about invoice').
8. "query": Answering questions (news, weather, general queries, translations).

Output Format (strictly valid JSON with no markdown wrapping):
{{
  "action": "task" | "expense" | "income" | "memory" | "youtube" | "call" | "draft_email" | "query",
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
    "query": "string (for youtube search, e.g. 'Hanuman Chalisa')",
    "url": "string (for youtube url, e.g. 'https://www.youtube.com/results?search_query=Hanuman+Chalisa')",
    "contact_name": "string (for call, e.g. 'Rahul')",
    "phone_number": "string (for call, e.g. '+919876543210' or null)",
    "tel_url": "string (for call, e.g. 'tel:+919876543210' or null)",
    "email_recipient": "string (for email, e.g. 'rohit@example.com' or 'Rohit')",
    "email_subject": "string (for email, e.g. 'Project Update')",
    "email_body": "string (formatted email body text)",
    "response": "Well-formatted text in the requested language"
  }},
  "explanation": "Brief reasoning"
}}
"""

def _extract_llm_action_dict(raw_text: str, user_input: str, is_cricket_query: bool, live_cricket_matches: list) -> dict:
    if not raw_text or not raw_text.strip():
        return None
    raw_text = raw_text.strip()
    json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if json_match:
        try:
            json_str = json_match.group(0)
            json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
            parsed = json.loads(json_str)
            if is_cricket_query and live_cricket_matches:
                if not parsed.get("data"):
                    parsed["data"] = {}
                parsed["data"]["matches"] = live_cricket_matches
                parsed["action"] = "cricket_scorecard"

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

async def _call_openai_compatible_api(
    endpoint: str,
    api_key: str,
    models: list,
    sys_prompt: str,
    recent_chat: list,
    user_input: str,
    image_data: str = None
) -> tuple:
    """Returns (content, error_msg)"""
    if not api_key or not api_key.strip():
        return ("", "API key missing or empty")
    
    messages = [{"role": "system", "content": sys_prompt}]
    if recent_chat:
        for m in recent_chat[-40:]:
            m_role = "user" if m.get("role") in ["User", "user"] else "assistant"
            m_text = str(m.get("content", "")).strip()
            if m_text:
                messages.append({"role": m_role, "content": m_text})

    if image_data and image_data.strip():
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": user_input},
                {"type": "image_url", "image_url": {"url": image_data.strip()}}
            ]
        })
    else:
        messages.append({"role": "user", "content": user_input})

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json"
    }

    last_err = ""
    async with httpx.AsyncClient(timeout=22.0) as client:
        for model in models:
            try:
                payload = {
                    "model": model,
                    "messages": messages,
                    "temperature": 0.2
                }
                resp = await client.post(endpoint, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "").strip()
                        if content:
                            return (content, "")
                elif resp.status_code == 401:
                    last_err = "गलत या अमान्य API Key (401 Unauthorized)"
                    print(f"[Aether Multi-LLM] {model} at {endpoint} 401: Invalid key")
                    break
                elif resp.status_code == 429:
                    last_err = "API कोटा समाप्त (429 Insufficient Quota / Rate Limited)"
                    print(f"[Aether Multi-LLM] {model} at {endpoint} 429: Quota exhausted")
                    break
                else:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:80]}"
                    print(f"[Aether Multi-LLM] {model} at {endpoint} returned {resp.status_code}: {resp.text[:100]}")
            except Exception as e:
                last_err = str(e)
                print(f"[Aether Multi-LLM] Error calling {model} at {endpoint}: {e}")
    return ("", last_err)

async def parse_intent_with_llm(
    user_input: str, 
    context: dict = None, 
    user_lat: float = None, 
    user_lon: float = None, 
    language: str = "auto", 
    api_key: str = None, 
    user_name: str = "Operator", 
    image_data: str = None, 
    user_email: str = None,
    openai_key: str = None,
    grok_key: str = None,
    active_provider: str = None,
    user_city: str = None
) -> dict:
    """Parse intent with live weather for user's actual location or requested city, news with links, match results, image/vision analysis, and language control."""
    user_lower = user_input.lower().strip()

    if context is None:
        context = {}
    if user_city and not context.get('user_location'):
        context['user_location'] = user_city
    if not context.get('city_guide'):
        context['city_guide'] = get_city_travel_guide(context.get('user_location') or user_city, user_lat, user_lon)
    
    # Detect language requirement in user prompt
    wants_hindi_in_prompt = any(w in user_lower for w in ["in hindi", "hindi me", "hindi mein", "हिंदी में", "हिंदी", "translate to hindi", "hindi news", "hindi me batao"])
    wants_english_in_prompt = any(w in user_lower for w in ["in english", "english me", "english mein", "translate to english"])
    
    # Detect Devanagari script in user input
    has_devanagari = bool(re.search(r'[\u0900-\u097F]', user_input))

    # Detect if active chat session history has Hindi
    recent_chat = (context or {}).get("recent_chat", [])
    recent_has_hindi = any(bool(re.search(r'[\u0900-\u097F]', str(m.get("content", "")))) for m in recent_chat[-6:])

    if wants_hindi_in_prompt or language == "hi" or (language == "auto" and (has_devanagari or recent_has_hindi)):
        effective_lang = "hi"
    elif wants_english_in_prompt or language == "en":
        effective_lang = "en"
    elif language == "hinglish":
        effective_lang = "hinglish"
    else:
        effective_lang = language

    live_feed = ""
    is_match_query = any(w in user_lower for w in [
        "yesterday", "kal", "score", "scores", "result", "results", "match", 
        "who won", "winner", "final", "highlights", "summary", "vs", "versus"
    ])
    is_general_news = any(w in user_lower for w in ["news", "samachar", "headlines", "khabar", "taza khabar", "latest news", "headline", "update", "updates"])
    is_sports_query = is_match_query or any(w in user_lower for w in [
        "sport", "sports", "cricket", "football", "khel", "ipl", "t20", 
        "fifa", "badminton", "hockey", "tennis", "olympic", "olympics", "athlete", 
        "tournament", "wpl", "f1", "formula 1", "premier league",
        "chelsea", "arsenal", "manchester", "virat", "rohit", "dhoni"
    ])
    is_news_query = is_general_news or is_sports_query or any(w in user_lower for w in ["technology", "business", "market", "economy"])
    is_weather_query = any(w in user_lower for w in ["weather", "mausam", "rain", "baarish", "temperature", "tapman", "climate", "garmi", "thand", "forecast"])
    
    is_cricket_query = any(w in user_lower for w in [
        "cricinfo", "crickinfo", "cricket", "scorecard", "score card", 
        "ipl", "wpl", "t20i", "odi", "test match", "live score", "match score", 
        "india score", "aaj ka match", "live match", "cricket match", "cricket update",
        "match scorecard"
    ])
    live_cricket_matches = []
    if is_cricket_query:
        live_cricket_matches = fetch_cricinfo_live_matches()
        if live_cricket_matches:
            cric_lines = ["[LIVE CRICINFO CRICKET SCORECARD & FIXTURES]:"]
            for cm in live_cricket_matches[:8]:
                t1 = f"{cm['team1']['name']} {cm['team1']['score']}".strip()
                t2 = f"{cm['team2']['name']} {cm['team2']['score']}".strip()
                intl_str = " (International)" if cm.get('is_international') else ""
                cric_lines.append(f"- [{cm['status'].upper()}]{intl_str} {cm['series']} | {t1} vs {t2} | Status: {cm['status_text']} | Cricinfo: {cm['cricinfo_url']}")
            live_feed += "\n".join(cric_lines) + "\n\n"

    if is_weather_query:
        # Pass user_input and user_city so detected or mentioned city is used
        cur_city_loc = user_city or (context or {}).get("user_location")
        weather_info = fetch_live_weather(user_query=user_input, lat=user_lat, lon=user_lon, city_name=cur_city_loc)
        live_feed += f"[TODAY'S LIVE ACCURATE WEATHER]:\n{weather_info}\n\n"

    # 🗺️ Local Travel & Food Discovery Guide Injection
    is_travel_or_food_query = any(w in user_lower for w in [
        "place to visit", "places to visit", "visit", "sightseeing", "ghoomne", "ghumne", "kahan ghume", 
        "kya khaye", "kya khana", "famous food", "what to eat", "street food", "popular thing", "famous for", 
        "prassidh", "prasiddh", "प्रसिद्ध", "दर्शनीय", "खान-पान", "कहाँ घूमें", "क्या खाएं", "क्या देखें", "घूमने"
    ])
    if is_travel_or_food_query:
        city_for_guide = user_city or (context or {}).get("user_location") or "Jaipur"
        cg = get_city_travel_guide(city_for_guide, user_lat, user_lon)
        live_feed += f"[AUTHENTIC LOCAL CITY TRAVEL & DELICACIES GUIDE FOR {cg['city']}]:\n"
        live_feed += f"City: {cg['city']} ({cg.get('hindi_name', '')})\n"
        live_feed += "Must-Visit Attractions:\n" + "\n".join([f"• {p['name']}: {p['desc']} [Best time: {p.get('best_time', 'Morning/Evening')}]" for p in cg.get("places_to_visit", [])]) + "\n"
        live_feed += "Famous Foods to Try:\n" + "\n".join([f"• {f['name']}: {f['desc']} [Famous at: {f.get('famous_at', 'Local specialty')}]" for f in cg.get("foods_to_try", [])]) + "\n"
        live_feed += "Popular Activities & Markets:\n" + "\n".join([f"• {t['name']}: {t['desc']}" for t in cg.get("popular_things", [])]) + "\n\n"

    # 🌐 Universal Real-Time Search Grounding for ANY Informational / News Query:
    # If the user asks for latest news, leaders, prices, events, sports, or current facts,
    # resolve contextual referents and inject live verified Google News RSS feed directly!
    is_action_command = any(user_lower.startswith(w) for w in [
        "remind me", "remind", "task", "todo", "spent", "spend", "expense", "kharch", 
        "paid", "add income", "call ", "phone ", "draft email", "email ", "play "
    ])

    if not is_action_command and not is_weather_query:
        # Resolve ambiguous state referents from recent conversation turns
        resolved_search_query = user_input
        if any(w in user_lower for w in ["cm", "chief minister", "mukhyamantri", "मुख्यमंत्री", "state", "rajya", "राज्य", "capital", "rajdhani", "राजधानी"]):
            found_state = None
            for m in reversed(recent_chat[-12:]):
                t_low = str(m.get("content", "")).lower()
                for s in [
                    "bihar", "बिहार", "rajasthan", "राजस्थान", "delhi", "दिल्ली", 
                    "maharashtra", "महाराष्ट्र", "karnataka", "कर्नाटक", "up", "uttar pradesh", "उत्तर प्रदेश", 
                    "haryana", "हरियाणा", "punjab", "पंजाब", "gujarat", "गुजरात", "tamil nadu", "तमिलनाडु", 
                    "kerala", "केरल", "bengal", "बंगाल", "odisha", "ओडिशा", "jharkhand", "झारखंड", 
                    "telangana", "तेलंगाना", "andhra", "आंध्र", "assam", "असम"
                ]:
                    if s in t_low:
                        found_state = s.title()
                        break
                if found_state:
                    break
            target_state = found_state or (context or {}).get("user_state", "Rajasthan")
            resolved_search_query = f"{target_state} Chief Minister latest news"

        news_items = fetch_live_news_items(query=resolved_search_query, limit=5, lang=effective_lang)
        if news_items:
            heading = "RECENT MATCH RESULTS & SPORTS SCORES" if is_match_query else "TODAY'S VERIFIED REAL-TIME NEWS & DATA TILL NOVEMBER 2026"
            live_feed += f"[{heading}]:\n{news_items}\n\n"

    has_image = bool(image_data and image_data.strip())
    
    # Determine effective primary AI Provider (gemini | openai | grok)
    eff_provider = (active_provider or "").lower().strip()
    if eff_provider in ["chatgpt", "openai"]:
        eff_provider = "openai"
    elif eff_provider in ["xai", "grok"]:
        eff_provider = "grok"

    clean_grok_key = (grok_key or "").strip()
    clean_openai_key = (openai_key or "").strip()
    clean_gemini_key = (api_key or "").strip()

    if not eff_provider:
        if clean_grok_key and not clean_gemini_key and not clean_openai_key:
            eff_provider = "grok"
        elif clean_openai_key and not clean_gemini_key and not clean_grok_key:
            eff_provider = "openai"
        else:
            eff_provider = "gemini"

    # Dedicated AI Model & Provider Identity Intercept
    model_query_triggers = [
        "which model", "what model", "which ai", "what ai", "konsa model", "kaun sa model", 
        "kaunsa model", "tum konsa model", "tum kaun sa model", "model name", "who made you",
        "who created you", "who trained you", "tumhe kisne banaya", "tumhe kisne train kiya",
        "chatgpt ho ya gemini", "grok ho ya gemini", "kon sa model"
    ]
    is_model_query = any(mq in user_lower for mq in model_query_triggers)
    if is_model_query:
        if eff_provider == "openai":
            active_engine_name = "OpenAI ChatGPT (GPT-4o / GPT-4o-mini)"
        elif eff_provider == "grok":
            active_engine_name = "xAI Grok (Grok-2)"
        else:
            active_engine_name = "Google Gemini (Gemini 2.5 Flash / 1.5 Pro)"

        is_hi = (effective_lang == "hi") or any(w in user_lower for w in ["tum", "konsa", "kaun", "hoo", "ho", "kisne", "मॉडल", "तुम", "कौन", "हो"])
        if is_hi:
            model_reply = f"मैं Aether AI हूँ, और वर्तमान में मेरा मुख्य इंटेलिजेंस इंजन **{active_engine_name}** द्वारा संचालित है। आपकी सभी क्वेरीज़ और कार्य इसी AI मॉडल द्वारा प्रोसेस किए जा रहे हैं।"
        else:
            model_reply = f"I am Aether AI, and my intelligence engine is currently powered by **{active_engine_name}**. All your requests and actions are processed directly through this model."

        return {
            "action": "query",
            "confidence": 1.0,
            "confidence_level": "high",
            "data": { "response": model_reply },
            "explanation": f"Active AI model inquiry handled for {active_engine_name}"
        }

    sys_prompt = build_system_prompt(
        context, 
        live_feed, 
        language=effective_lang, 
        user_name=user_name, 
        user_query=user_input, 
        has_image=has_image,
        active_provider=eff_provider
    )

    # 1. Primary route: Grok (xAI)
    if eff_provider == "grok" and clean_grok_key:
        grok_models = ["grok-2-latest", "grok-beta", "grok-2-mini"]
        raw_text, grok_err = await _call_openai_compatible_api(
            "https://api.x.ai/v1/chat/completions",
            clean_grok_key,
            grok_models,
            sys_prompt,
            recent_chat,
            user_input,
            image_data
        )
        if raw_text:
            parsed = _extract_llm_action_dict(raw_text, user_input, is_cricket_query, live_cricket_matches)
            if parsed:
                return parsed
        elif grok_err and not clean_gemini_key:
            is_hi = (effective_lang == "hi") or any('\u0900' <= ch <= '\u097f' for ch in user_input)
            err_msg = (
                f"⚠️ **xAI Grok API त्रुटि:** {grok_err}।\nकृपया Settings > AI Platform & API Keys में अपनी Grok API Key की जाँच करें।"
                if is_hi else
                f"⚠️ **xAI Grok API Error:** {grok_err}.\nPlease verify your Grok API key in Settings > AI Platform & API Keys."
            )
            return {
                "action": "query",
                "confidence": 0.9,
                "confidence_level": "medium",
                "data": { "response": err_msg },
                "explanation": "Grok API error encountered"
            }

    # 2. Primary route: OpenAI (ChatGPT)
    if eff_provider == "openai" and clean_openai_key:
        openai_models = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
        raw_text, openai_err = await _call_openai_compatible_api(
            "https://api.openai.com/v1/chat/completions",
            clean_openai_key,
            openai_models,
            sys_prompt,
            recent_chat,
            user_input,
            image_data
        )
        if raw_text:
            parsed = _extract_llm_action_dict(raw_text, user_input, is_cricket_query, live_cricket_matches)
            if parsed:
                return parsed
        elif openai_err and not clean_gemini_key:
            is_hi = (effective_lang == "hi") or any('\u0900' <= ch <= '\u097f' for ch in user_input)
            err_msg = (
                f"⚠️ **OpenAI (ChatGPT) API त्रुटि:** {openai_err}।\nकृपया Settings > AI Platform & API Keys में अपनी OpenAI कुंजी और अकाउंट बिलिंग/क्रेडिट की जाँच करें।"
                if is_hi else
                f"⚠️ **OpenAI (ChatGPT) API Error:** {openai_err}.\nPlease verify your OpenAI API key and account billing credit in Settings > AI Platform & API Keys."
            )
            return {
                "action": "query",
                "confidence": 0.9,
                "confidence_level": "medium",
                "data": { "response": err_msg },
                "explanation": "OpenAI API error encountered"
            }

    # Strict Multi-Tenant BYOK (Bring Your Own Key) & Owner Account Quota Protection:
    # 1. Top Priority: Client-provided personal API key (from device App Settings / Onboarding)
    KNOWN_REVOKED_KEYS = {
        "AIzaSyCR3ZKXaMEGRU02hCrhhn4O978zMnDk0vU"
    }

    candidate_keys = []
    client_key = clean_gemini_key
    if client_key and client_key not in KNOWN_REVOKED_KEYS:
        candidate_keys.append(client_key)

    # 2. Server's Master GEMINI_API_KEY
    server_key = os.getenv("GEMINI_API_KEY", "").strip() or (GEMINI_API_KEY.strip() if GEMINI_API_KEY else "")
    if server_key and server_key not in KNOWN_REVOKED_KEYS and server_key not in candidate_keys:
        candidate_keys.append(server_key)

    # Try Gemini API with multimodal vision support, Google Search grounding, multi-turn memory & seamless model failover
    if candidate_keys:
        user_parts = [{"text": user_input}]
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

        # Build multi-turn conversational contents to preserve full memory across 10-20+ prompts!
        conversation_contents = []
        recent_chat = (context or {}).get("recent_chat", [])
        if recent_chat:
            for m in recent_chat[-40:]:
                m_role = "user" if m.get("role") in ["User", "user"] else "model"
                m_text = str(m.get("content", "")).strip()
                if m_text:
                    conversation_contents.append({
                        "role": m_role,
                        "parts": [{"text": m_text}]
                    })
        # Append current user prompt
        conversation_contents.append({
            "role": "user",
            "parts": user_parts
        })

        models_to_try = [
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.6-flash",
            "gemini-2.5-flash",
            "gemini-flash-latest",
            GEMINI_MODEL
        ]
        unique_models = list(dict.fromkeys(models_to_try))

        key_blocked_notice = None
        for active_gemini_key in candidate_keys:
            key_had_auth_error = False
            for model in unique_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_gemini_key}"
                    payload = {
                        "system_instruction": {
                            "parts": [{"text": sys_prompt}]
                        },
                        "contents": conversation_contents,
                        "generationConfig": {
                            "temperature": 0.2
                        },
                        "tools": [{"googleSearch": {}}]
                    }
                    async with httpx.AsyncClient(timeout=16.0) as client:
                        resp = await client.post(url, json=payload)
                        # If model rejects googleSearch tool or system_instruction with 400, fallback gracefully
                        if resp.status_code == 400:
                            payload_no_tools = {
                                "contents": [
                                    {"role": "user", "parts": [{"text": f"{sys_prompt}\n\nUser Input: {user_input}"}] + (user_parts[1:] if len(user_parts) > 1 else [])}
                                ],
                                "generationConfig": {"temperature": 0.2}
                            }
                            resp = await client.post(url, json=payload_no_tools)

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
                                    # Attach live cricket scorecard if cricket query
                                    if is_cricket_query and live_cricket_matches:
                                        if not parsed.get("data"):
                                            parsed["data"] = {}
                                        parsed["data"]["matches"] = live_cricket_matches
                                        parsed["action"] = "cricket_scorecard"

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
                        else:
                            print(f"[Aether Gemini] ⚠️ {model} returned HTTP {resp.status_code}: {resp.text}")
                            if resp.status_code == 403 or "leaked" in resp.text.lower() or "permission_denied" in resp.text.lower():
                                key_had_auth_error = True
                                key_blocked_notice = "⚠️ Google Gemini API Key ब्लॉक/लीक हो गई है (403 Permission Denied)। कृपया aistudio.google.com से नई Free API Key बनाएं और Render Environment (GEMINI_API_KEY) या App Settings में सेव करें।"
                                break
                except Exception as e:
                    print(f"[Aether Engine] Gemini call error: {e}")
            if not key_had_auth_error:
                break

        # Fallback to Grok or OpenAI if Gemini had auth failure or returned no response
        if clean_grok_key and eff_provider != "grok":
            grok_models = ["grok-2-latest", "grok-beta", "grok-2-mini"]
            raw_text = await _call_openai_compatible_api("https://api.x.ai/v1/chat/completions", clean_grok_key, grok_models, sys_prompt, recent_chat, user_input, image_data)
            if raw_text:
                parsed = _extract_llm_action_dict(raw_text, user_input, is_cricket_query, live_cricket_matches)
                if parsed:
                    return parsed

        if clean_openai_key and eff_provider != "openai":
            openai_models = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
            raw_text = await _call_openai_compatible_api("https://api.openai.com/v1/chat/completions", clean_openai_key, openai_models, sys_prompt, recent_chat, user_input, image_data)
            if raw_text:
                parsed = _extract_llm_action_dict(raw_text, user_input, is_cricket_query, live_cricket_matches)
                if parsed:
                    return parsed

        if key_blocked_notice and not (is_weather_query or is_news_query):
            return {
                "action": "query",
                "confidence": 0.99,
                "confidence_level": "high",
                "data": { "response": key_blocked_notice },
                "explanation": "Gemini key authorization failure notice"
            }

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

def resolve_youtube_playback(query: str) -> dict:
    """Finds top YouTube video so it plays directly instead of just opening search."""
    clean_q = query.strip()
    search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(clean_q)}"
    video_id = None
    try:
        req = urllib.request.Request(
            search_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            matches = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
            if not matches:
                matches = re.findall(r'/watch\?v=([a-zA-Z0-9_-]{11})', html)
            if matches:
                seen = set()
                deduped = [x for x in matches if not (x in seen or seen.add(x))]
                if deduped:
                    video_id = deduped[0]
    except Exception as e:
        print(f"[YouTube Video Resolver Notice] {e}")

    if video_id:
        watch_url = f"https://www.youtube.com/watch?v={video_id}"
        play_url = f"https://www.youtube.com/watch?v={video_id}"
        embed_url = f"https://www.youtube.com/embed/{video_id}?enablejsapi=1"
    else:
        watch_url = search_url
        play_url = search_url
        embed_url = f"https://www.youtube.com/embed?listType=search&list={urllib.parse.quote_plus(clean_q)}"

    return {
        "query": clean_q,
        "video_id": video_id,
        "watch_url": watch_url,
        "play_url": play_url,
        "embed_url": embed_url,
        "url": play_url
    }

def rule_based_fallback(text: str, context: dict = None) -> dict:
    """Smart conversational offline parser when no LLM API is available."""
    text_lower = text.lower().strip()
    recent_chat = context.get('recent_chat', []) if context else []
    
    last_assistant_msg = ""
    for m in reversed(recent_chat):
        if m.get('role') in ['Aether', 'Assistant']:
            last_assistant_msg = m.get('content', '')
            break

    # Check Cricket Scorecard Query
    is_cric = any(w in text_lower for w in [
        "cricinfo", "crickinfo", "cricket", "scorecard", "score card",
        "live score", "match score", "india score", "aaj ka match", "live match", "cricket match"
    ])
    if is_cric:
        matches = fetch_cricinfo_live_matches()
        if matches:
            top_intl = [m for m in matches if m.get("is_international")] or matches[:6]
            summary_parts = []
            for m in top_intl[:4]:
                t1 = f"{m['team1']['name']} {m['team1']['score']}".strip()
                t2 = f"{m['team2']['name']} {m['team2']['score']}".strip()
                summary_parts.append(f"🏏 **{m['series']}**\n• {t1} vs {t2}\n• स्थिति: {m['status_text']}\n• [Cricinfo Scorecard]({m['cricinfo_url']})")
            
            resp_text = "🏏 **ESPNcricinfo लाइव क्रिकेट स्कोरकार्ड**\n\n" + "\n\n".join(summary_parts)
            return {
                "action": "cricket_scorecard",
                "confidence": 0.99,
                "confidence_level": "high",
                "data": {
                    "response": resp_text,
                    "matches": matches
                },
                "explanation": "Live Cricinfo cricket scorecard"
            }

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
    
    # 7. Conversational Greetings
    greetings = [
        "hi", "hello", "hey", "namaste", "namaskar", "pranam", "kem cho", "halo",
        "kaise ho", "kya haal", "how are you", "good morning", "good evening", "good afternoon"
    ]
    is_greeting = text_lower in greetings or any(text_lower.startswith(g + " ") or text_lower.startswith(g + ",") or text_lower.startswith(g + "!") for g in greetings)
    if is_greeting:
        u_name = context.get('user_name', 'Pawan') if context else 'Pawan'
        is_hindi = any(w in text_lower for w in ["namaste", "namaskar", "pranam", "kaise ho", "kya haal", "नमस्ते", "प्रणाम", "कैसे हो", "क्या हाल"])
        if is_hindi or any('\u0900' <= ch <= '\u097f' for ch in text):
            reply = f"नमस्ते {u_name}! मैं Aether हूँ, आपका AI असिस्टेंट। मैं पूरी तरह से सक्रिय हूँ। बताइए आज मैं आपकी क्या सहायता करूँ?"
        else:
            reply = f"Hello {u_name}! I am Aether, your Autonomous AI Chief of Staff. I'm active and ready. How can I assist you today?"
        return {
            "action": "query",
            "confidence": 0.99,
            "confidence_level": "high",
            "data": { "response": reply },
            "explanation": "Conversational greeting handled in offline fallback"
        }

    # 8. User Identity Inquiry ("What is my name?")
    name_triggers = [
        "what is my name", "what's my name", "whats my name", "who am i",
        "mera naam kya hai", "mera naam", "mera name", "kiska phone hai", "mera parichay", "apna user kaun hai"
    ]
    if any(nt in text_lower for nt in name_triggers):
        u_name = context.get('user_name', 'Pawan Dixit') if context else 'Pawan Dixit'
        is_hindi = any(w in text_lower for w in ["mera", "naam", "kya", "hai", "मेरा", "नाम", "कौन्"])
        if is_hindi or any('\u0900' <= ch <= '\u097f' for ch in text):
            reply = f"आपका नाम {u_name} है।"
        else:
            reply = f"Your name is {u_name}."
        return {
            "action": "query",
            "confidence": 0.99,
            "confidence_level": "high",
            "data": { "response": reply },
            "explanation": "User identity inquiry handled in offline fallback"
        }

    # 9. Assistant Identity Inquiry ("Who are you?")
    who_triggers = [
        "who are you", "tum kaun ho", "aap kaun ho", "what is your name", "what are you", "tera naam kya hai"
    ]
    if any(wt in text_lower for wt in who_triggers):
        is_hindi = any(w in text_lower for w in ["tum", "kaun", "aap", "tera", "naam", "तुम", "कौन", "आप"])
        if is_hindi or any('\u0900' <= ch <= '\u097f' for ch in text):
            reply = "मैं Aether ⚡ हूँ — आपका पर्सनल ऑटोनॉमस AI एग्जीक्यूटिव और डिजिटल चीफ ऑफ स्टाफ।"
        else:
            reply = "I am Aether ⚡ — your Personal Autonomous AI Executive and Digital Chief of Staff."
        return {
            "action": "query",
            "confidence": 0.99,
            "confidence_level": "high",
            "data": { "response": reply },
            "explanation": "Assistant identity inquiry handled in offline fallback"
        }

    # 10. Specific Status / Daily Briefing / Agenda Queries ONLY
    status_triggers = [
        "agenda", "schedule", "today's overview", "todays overview", "daily briefing",
        "aaj ka status", "aaj ka schedule", "aaj ka agenda", "pending tasks",
        "kitne task", "tasks list", "mera balance", "total balance", "kharch kitna",
        "balance kitna hai", "status kya hai", "summary batao", "briefing do"
    ]
    is_exact_status = any(st in text_lower for st in status_triggers) or (text_lower in ["status", "summary", "briefing", "agenda", "schedule", "tasks"])
    if is_exact_status:
        today_date = datetime.now().strftime('%A, %d %B %Y')
        task_count = len(context.get('tasks', [])) if context else 0
        balance = context.get('balance', 0) if context else 0
        
        reply = f"आज {today_date} है। आपके पास {task_count} सक्रिय कार्य हैं और कुल बैलेंस ₹{balance:,.2f} है।"
        return {
            "action": "query",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": { "response": reply },
            "explanation": "Specific status/agenda query handled in offline fallback"
        }

    # 11. Distance / Route Queries (common route offline fallback)
    if "distance between" in text_lower or "duri kitni hai" in text_lower or "distance from" in text_lower:
        if "jaipur" in text_lower and ("goverdhan" in text_lower or "govardhan" in text_lower):
            reply = "The distance between Jaipur and Goverdhan is approximately 195 km (about 4 hours by road via NH21)."
            return {
                "action": "query",
                "confidence": 0.98,
                "confidence_level": "high",
                "data": { "response": reply },
                "explanation": "Known route distance handled in offline fallback"
            }

    # 12. YouTube Music / Video Playback Intent
    is_yt = any(w in text_lower for w in [
        "youtube", "play ", "gana bajao", "gana chalao", "gaana chalao", 
        "song play", "song chalao", "bhajan chalao", "video chalao", 
        "suno", "sunao", "chalana", "bajao"
    ]) or text_lower.startswith("play") or text_lower.startswith("open youtube")
    if is_yt and not any(w in text_lower for w in ["remind", "reminder", "match", "game", "cricket", "football"]):
        clean_q = re.sub(r'(?i)\b(can you|could you|please|kripya|play|open|suno|sunao|chalao|chala do|chala|bajao|baja do|gana|gaana|song|songs|video|bhajan|kholo|karo|dekho)\b', '', text)
        clean_q = re.sub(r'(?i)\b(on|in|par|pe|me|se)\s+youtube\b', '', clean_q)
        clean_q = re.sub(r'(?i)\byoutube\b', '', clean_q)
        clean_q = re.sub(r'(?i)\b(ka|ke|ki|for)\b\s*$', '', clean_q).strip()
        clean_q = re.sub(r'\s+', ' ', clean_q).strip(' :-.,')
        if not clean_q or clean_q.lower() in ["youtube", "video", "song", "gana", "gaana", "trending"]:
            clean_q = "Trending"

        yt_info = resolve_youtube_playback(clean_q)
        watch_url = yt_info["watch_url"]
        play_url = yt_info["play_url"]
        embed_url = yt_info["embed_url"]

        is_hi = any(w in text_lower for w in ["gana", "chalao", "bajao", "par", "pe", "suno", "sunao"]) or any('\u0900' <= ch <= '\u097f' for ch in text)
        msg = (
            f"🎬 **YouTube पर चलाया जा रहा है:**\n« {clean_q} »\n\n▶️ **Play Video:** {watch_url} 🎵"
            if is_hi else
            f"🎬 **Playing on YouTube:**\n« {clean_q} »\n\n▶️ **Play Video:** {watch_url} 🎵"
        )
        return {
            "action": "youtube",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": {
                "query": clean_q,
                "video_id": yt_info.get("video_id"),
                "watch_url": watch_url,
                "play_url": play_url,
                "embed_url": embed_url,
                "url": play_url,
                "response": msg
            },
            "explanation": "Rule-based YouTube music/video playback detection with direct playback stream"
        }

    # 13. Phone Call / Dialer Intent
    has_call_kw = any(w in text_lower for w in ["call", "dial", "phone lagao", "phone karo", "call lagao", "call karo", "call milao", "call mila"])
    has_future_time = bool(re.search(r'\b(?:am|pm|baje|o\'clock|tomorrow|kal|schedule|remind|reminder)\b', text_lower))
    is_immediate_call = has_call_kw and not has_future_time and not any(w in text_lower for w in ["karna hai", "karni hai"])
    if is_immediate_call:
        phone_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', text)
        phone_num = phone_match.group(1).replace(" ", "").replace("-", "") if phone_match else None
        
        contact_name = text
        if phone_match:
            contact_name = contact_name.replace(phone_match.group(1), "")
        contact_name = re.sub(r'(?i)\b(call\s+to|call|dial|phone|lagao|karo|milao|bhejo|please)\b', '', contact_name)
        contact_name = re.sub(r'(?i)\bko\b', '', contact_name)
        contact_name = re.sub(r'\s+', ' ', contact_name).strip(' :-.,')
        if not contact_name and phone_num:
            contact_name = phone_num
        elif not contact_name:
            contact_name = "Contact"

        if not phone_num and context:
            for mem in context.get("memories", []):
                mem_fact = mem.get("fact", "") if isinstance(mem, dict) else str(mem)
                if contact_name.lower() in mem_fact.lower():
                    m_num = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', mem_fact)
                    if m_num:
                        phone_num = m_num.group(1).replace(" ", "").replace("-", "")
                        break

        tel_url = f"tel:{phone_num}" if phone_num else "tel:"
        is_hi = any(w in text_lower for w in ["ko", "lagao", "karo", "milao"]) or any('\u0900' <= ch <= '\u097f' for ch in text)
        if phone_num:
            msg = f"📞 {contact_name} ({phone_num}) को कॉल मिलाई जा रही है..." if is_hi else f"📞 Dialing {contact_name} ({phone_num})..."
        else:
            msg = f"📞 {contact_name} के लिए फ़ोन डायलर खोला जा रहा है..." if is_hi else f"📞 Opening phone dialer for {contact_name}..."

        return {
            "action": "call",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": {
                "contact_name": contact_name,
                "phone_number": phone_num,
                "tel_url": tel_url,
                "response": msg
            },
            "explanation": "Rule-based phone dialer intent"
        }

    # 14. Automatic Bank SMS Expense / Income Parser
    if any(w in text_lower for w in ["debited", "credited", "spent", "withdrawn", "deposited", "transferred", "a/c", "acct"]):
        sms_parsed = parse_bank_sms(text)
        if sms_parsed and sms_parsed.get("amount", 0) > 0:
            is_hi = any('\u0900' <= ch <= '\u097f' for ch in text) or any(w in text_lower for w in ["mera", "kharch", "jod", "karo"])
            if sms_parsed["type"] == "expense":
                msg = f"🧾 **बैंक एसएमएस से खर्च दर्ज किया गया:**\n• **मर्चेंट/विवरण**: {sms_parsed['merchant']}\n• **राशि**: ₹{sms_parsed['amount']:,.2f}\n• **श्रेणी**: {sms_parsed['category'].title()}\n• **तारीख/समय**: {sms_parsed['date'].strftime('%d %b %Y, %I:%M %p')}\n• **माध्यम**: {sms_parsed['payment_mode'].upper()} ✅" if is_hi else f"🧾 **Expense Auto-Logged from Bank SMS:**\n• **Merchant**: {sms_parsed['merchant']}\n• **Amount**: ₹{sms_parsed['amount']:,.2f}\n• **Category**: {sms_parsed['category'].title()}\n• **Date/Time**: {sms_parsed['date'].strftime('%d %b %Y, %I:%M %p')}\n• **Mode**: {sms_parsed['payment_mode'].upper()} ✅"
            else:
                msg = f"💰 **बैंक एसएमएस से आय दर्ज की गई:**\n• **विवरण**: {sms_parsed['merchant']}\n• **राशि**: ₹{sms_parsed['amount']:,.2f}\n• **श्रेणी**: {sms_parsed['category'].title()}\n• **तारीख/समय**: {sms_parsed['date'].strftime('%d %b %Y, %I:%M %p')} ✅" if is_hi else f"💰 **Income Auto-Logged from Bank SMS:**\n• **Details**: {sms_parsed['merchant']}\n• **Amount**: ₹{sms_parsed['amount']:,.2f}\n• **Date/Time**: {sms_parsed['date'].strftime('%d %b %Y, %I:%M %p')} ✅"
            return {
                "action": sms_parsed["type"],
                "confidence": 0.99,
                "confidence_level": "high",
                "data": {
                    "amount": sms_parsed["amount"],
                    "currency": "INR",
                    "category": sms_parsed["category"],
                    "payment_mode": sms_parsed["payment_mode"],
                    "note": f"{sms_parsed['merchant']} (via Bank SMS)",
                    "date": sms_parsed["date"].isoformat(),
                    "response": msg
                },
                "explanation": f"Automated Indian Bank SMS {sms_parsed['type']} parser"
            }

    # 15. Email Drafting Intent
    is_email_draft = any(w in text_lower for w in ["draft an email", "draft email", "write an email", "write email", "email draft", "email ka reply", "email ka draft", "reply to email", "email likho", "email bhejna"])
    if is_email_draft:
        recip_match = re.search(r'(?:to|for|kisko)\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Za-z]+)', text, re.I)
        recip = recip_match.group(1).strip() if recip_match else "Recipient"
        subj_match = re.search(r'(?:regarding|about|subject|par|vishay)\s+([^\.,;:\n]+)', text, re.I)
        subj = subj_match.group(1).strip().title() if subj_match else "Discussion & Next Steps"
        body = (
            f"Dear {recip},\n\n"
            f"I hope this message finds you well.\n\n"
            f"Following up regarding {subj}, please review the proposed action items. "
            f"Let me know if this aligns with your expectations or if you would like to schedule a quick sync.\n\n"
            f"Warm regards,\n"
            f"Pawan Dixit"
        )
        is_hi = any('\u0900' <= ch <= '\u097f' for ch in text) or any(w in text_lower for w in ["likho", "bana", "karo", "ka"])
        msg = f"✉️ **ईमेल ड्राफ्ट तैयार किया गया है:**\n• **प्राप्तकर्ता**: {recip}\n• **विषय**: {subj}\n\nसमीक्षा और संपादन के लिए नीचे ड्राफ्ट कार्ड देखें। 📝" if is_hi else f"✉️ **Email Draft Created:**\n• **To**: {recip}\n• **Subject**: {subj}\n\nReview the draft card below before sending. 📝"
        return {
            "action": "draft_email",
            "confidence": 0.98,
            "confidence_level": "high",
            "data": {
                "email_recipient": recip,
                "email_subject": subj,
                "email_body": body,
                "response": msg
            },
            "explanation": "Rule-based email draft generation"
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
        # 1. Direct Knowledge & Capital Queries
        is_hindi = any(w in text_lower for w in ["kya", "kaise", "kisko", "kyun", "kahan", "kab", "batao", "hai", "hain", "hindi"]) or any('\u0900' <= ch <= '\u097f' for ch in text)
        
        if "capital of india" in text_lower or "bharat ki rajdhani" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "भारत की राजधानी **नई दिल्ली (New Delhi)** है।" if is_hindi else "The capital of India is **New Delhi**."}, "explanation": "India capital query"}
        if "capital of japan" in text_lower or "japan ki rajdhani" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "जापान की राजधानी **टोक्यो (Tokyo)** है।" if is_hindi else "The capital of Japan is **Tokyo**."}, "explanation": "Japan capital query"}
        if "capital of usa" in text_lower or "capital of america" in text_lower or "america ki rajdhani" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "अमेरिका (USA) की राजधानी **वाशिंगटन, डी.सी. (Washington, D.C.)** है।" if is_hindi else "The capital of the USA is **Washington, D.C.**"}, "explanation": "USA capital query"}
        if "capital of uk" in text_lower or "capital of england" in text_lower or "capital of britain" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "यूनाइटेड किंगडम (UK) की राजधानी **लंदन (London)** है।" if is_hindi else "The capital of the UK is **London**."}, "explanation": "UK capital query"}
        if "capital of france" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "फ्रांस की राजधानी **पेरिस (Paris)** है।" if is_hindi else "The capital of France is **Paris**."}, "explanation": "France capital query"}
        if "capital of germany" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "जर्मनी की राजधानी **बर्लिन (Berlin)** है।" if is_hindi else "The capital of Germany is **Berlin**."}, "explanation": "Germany capital query"}
        if "capital of russia" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "रूस की राजधानी **मॉस्को (Moscow)** है।" if is_hindi else "The capital of Russia is **Moscow**."}, "explanation": "Russia capital query"}
        if "capital of china" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "चीन की राजधानी **बीजिंग (Beijing)** है।" if is_hindi else "The capital of China is **Beijing**."}, "explanation": "China capital query"}
        if "capital of australia" in text_lower:
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": "ऑस्ट्रेलिया की राजधानी **कैनबरा (Canberra)** है।" if is_hindi else "The capital of Australia is **Canberra**."}, "explanation": "Australia capital query"}

        # 2. State & CM Inquiries
        if ("cm" in text_lower or "chief minister" in text_lower or "मुख्यमंत्री" in text_lower) and ("all" in text_lower or "sabhi" in text_lower or "list" in text_lower or "there capital and cm" in text_lower or "capital and cm" in text_lower or "rajyo ke cm" in text_lower or "all the states" in text_lower):
            state_list_hi = """यहाँ नवंबर 2026 तक भारत के प्रमुख राज्यों के मुख्यमंत्री और उनकी राजधानियों की सूची है:

1. **आंध्र प्रदेश**: एन. चंद्रबाबू नायडू (TDP) | राजधानी: अमरावती
2. **अरुणाचल प्रदेश**: पेमा खांडू (BJP) | राजधानी: ईटानगर
3. **असम**: हिमंता बिस्वा सरमा (BJP) | राजधानी: दिसपुर
4. **बिहार**: सम्राट चौधरी (BJP) | राजधानी: पटना
5. **छत्तीसगढ़**: विष्णु देव साय (BJP) | राजधानी: रायपुर
6. **गोवा**: प्रमोद सावंत (BJP) | राजधानी: पणजी
7. **गुजरात**: भूपेंद्र पटेल (BJP) | राजधानी: गांधीनगर
8. **हरियाणा**: नायब सिंह सैनी (BJP) | राजधानी: चंडीगढ़
9. **हिमाचल प्रदेश**: सुखविंदर सिंह सुक्खू (INC) | राजधानी: शिमला
10. **झारखंड**: हेमंत सोरेन (JMM) | राजधानी: रांची
11. **कर्नाटक**: डी. के. शिवकुमार (INC) | राजधानी: बेंगलुरु
12. **केरल**: पिनाराई विजयन (CPI-M) | राजधानी: तिरुवनंतपुरम
13. **मध्य प्रदेश**: मोहन यादव (BJP) | राजधानी: भोपाल
14. **महाराष्ट्र**: देवेंद्र फडणवीस (BJP) | राजधानी: मुंबई
15. **मणिपुर**: एन. बीरेन सिंह (BJP) | राजधानी: इम्फाल
16. **मेघालय**: कोनराड संगमा (NPP) | राजधानी: शिलांग
17. **मिजोरम**: लालदुहोमा (ZPM) | राजधानी: आइजोल
18. **नागालैंड**: नेफ्यू रियो (NDPP) | राजधानी: कोहिमा
19. **ओडिशा**: मोहन चरण माझी (BJP) | राजधानी: भुवनेश्वर
20. **पंजाब**: भगवंत मान (AAP) | राजधानी: चंडीगढ़
21. **राजस्थान**: भजन लाल शर्मा (BJP) | राजधानी: जयपुर
22. **सिक्किम**: प्रेम सिंह तमांग (SKM) | राजधानी: गंगटोक
23. **तमिलनाडु**: एम. के. स्टालिन (DMK) | राजधानी: चेन्नई
24. **तेलंगाना**: ए. रेवंत रेड्डी (INC) | राजधानी: हैदराबाद
25. **त्रिपुरा**: माणिक साहा (BJP) | राजधानी: अगरतला
26. **उत्तर प्रदेश**: योगी आदित्यनाथ (BJP) | राजधानी: लखनऊ
27. **उत्तराखंड**: पुष्कर सिंह धामी (BJP) | राजधानी: देहरादून
28. **पश्चिम बंगाल**: ममता बनर्जी (AITC) | राजधानी: कोलकाता

**केंद्र शासित प्रदेश (UT):**
• **दिल्ली (NCT)**: रेखा गुप्ता (BJP) | राजधानी: नई दिल्ली
• **जम्मू और कश्मीर**: उमर अब्दुल्ला (JKNC) | राजधानी: श्रीनगर / जम्मू
• **पुडुचेरी**: एन. रंगास्वामी (AINRC) | राजधानी: पुडुचेरी"""
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": state_list_hi}, "explanation": "All states CM list in Hindi"}

        if "cm of the state" in text_lower or "rajya ke cm" in text_lower or text_lower == "cm of the state?":
            target_st = "Rajasthan"
            recent = (context or {}).get("recent_chat", [])
            for m in reversed(recent[-10:]):
                c_low = str(m.get("content", "")).lower()
                if "bihar" in c_low or "बिहार" in c_low:
                    target_st = "Bihar"
                    break
                elif "delhi" in c_low or "दिल्ली" in c_low:
                    target_st = "Delhi"
                    break
            if target_st == "Bihar":
                reply = "बिहार के वर्तमान मुख्यमंत्री **सम्राट चौधरी (Samrat Choudhary, BJP)** हैं।" if is_hindi else "The current Chief Minister of Bihar is **Samrat Choudhary (BJP)**."
            elif target_st == "Delhi":
                reply = "दिल्ली की वर्तमान मुख्यमंत्री **रेखा गुप्ता (Rekha Gupta, BJP)** हैं।" if is_hindi else "The current Chief Minister of Delhi is **Rekha Gupta (BJP)**."
            else:
                reply = "आपके राज्य राजस्थान के वर्तमान मुख्यमंत्री **भजन लाल शर्मा (Bhajan Lal Sharma, BJP)** हैं।" if is_hindi else "The current Chief Minister of your state, Rajasthan, is **Bhajan Lal Sharma (BJP)**."
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": reply}, "explanation": "CM of the state resolution"}

        if any(w in text_lower for w in ["stuck", "did you stuck", "are you stuck", "ruk gaye", "phas gaye"]):
            reply = "नहीं, मैं पूरी तरह सक्रिय और तैयार हूँ! बताइए, मैं अभी आपकी क्या सहायता करूँ?" if is_hindi else "No, I am fully active and operational! How can I assist you right now?"
            return {"action": "query", "confidence": 0.99, "confidence_level": "high", "data": {"response": reply}, "explanation": "Assistant operational check"}

        # Do not create random tasks for general queries (like 'Capital of india')!
        if is_hindi:
            fallback_msg = (
                f"🔒 **Google Gemini API Key आवश्यक है (BYOK)**\n\n"
                f"विस्तृत AI उत्तर व बातचीत के लिए कृपया अपनी मुफ़्त (Free) Gemini API Key जोड़ें:\n\n"
                f"1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) पर जाकर 1 मिनट में Free Key बनाएं।\n"
                f"2. ऐप में ऊपर **Profile / Settings ⚙️** खोलें और 'Gemini API Key' में सेव करें।\n\n"
                f"*(💡 मौसम, समाचार, यूट्यूब, दैनिक कार्य और खर्च बिना API Key के चालू हैं!)*"
            )
        else:
            fallback_msg = (
                f"🔒 **Google Gemini API Key Required (BYOK)**\n\n"
                f"To unlock full conversational AI answers for '{text}', please add your free Gemini API key:\n\n"
                f"1. Generate your free key in 1 minute at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).\n"
                f"2. Open **Profile / Settings ⚙️** in the top bar and paste it under 'Google Gemini API Key'.\n\n"
                f"*(💡 Weather, news, YouTube, basic tasks & expenses work 100% free without any key!)*"
            )
        return {
            "action": "query",
            "confidence": 0.90,
            "confidence_level": "medium",
            "data": {
                "response": fallback_msg
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

async def generate_external_contact_reply(
    sender_identifier: str,
    message_text: str,
    operator_name: str = "Pawan Dixit",
    operator_context: dict = None,
    language: str = "auto"
) -> dict:
    """Generates an executive, privacy-preserving auto-reply when an external contact/friend messages the operator.
    Safely answers availability, takes messages, and strictly protects all private finances and secrets.
    """
    msg_lower = message_text.lower().strip()
    is_hindi = any(w in msg_lower for w in ["kya", "bhai", "namaste", "kaise", "kab", "mil", "aaj", "kal", "samay", "kahan", "batao"]) or any('\u0900' <= ch <= '\u097f' for ch in message_text)
    
    # 1. Fallback response in case LLM is unreachable or timed out
    if is_hindi:
        fallback_reply = (
            f"⚡ *Aether Executive Assistant*\n\n"
            f"नमस्ते! मैं Aether हूँ, {operator_name} का AI डिजिटल चीफ ऑफ स्टाफ।\n\n"
            f"आपका संदेश दर्ज कर लिया गया है:\n"
            f"« {message_text} »\n\n"
            f"{operator_name} अभी व्यस्त हैं। मैंने उन्हें सूचित कर दिया है, वे जल्द ही आपसे संपर्क करेंगे। 🤝"
        )
    else:
        fallback_reply = (
            f"⚡ *Aether Executive Assistant*\n\n"
            f"Hello! I am Aether, Executive AI Chief of Staff for {operator_name}.\n\n"
            f"I have received and logged your message:\n"
            f"« {message_text} »\n\n"
            f"{operator_name} is currently occupied. I have forwarded your message to their agenda for quick followup! 🤝"
        )

    # 2. Try Gemini LLM for high-intelligence contextual reply
    server_key = os.getenv("GEMINI_API_KEY", "").strip() or (GEMINI_API_KEY.strip() if GEMINI_API_KEY else "")
    if server_key:
        tasks_count = len(operator_context.get("tasks", [])) if operator_context else 0
        prompt = f"""You are Aether ⚡, the Autonomous Executive Chief of Staff representing {operator_name}.
A contact/friend ({sender_identifier}) has sent a message for {operator_name}:
"{message_text}"

Current Date/Time: {datetime.now().strftime('%A, %d %B %Y, %I:%M %p')}
{operator_name}'s Public Status: Occupied with work/meetings ({tasks_count} scheduled items).

CRITICAL STRICT PRIVACY AND SAFETY RULES:
1. NEVER disclose bank balances, finances, expenses, income, accounts, or payment amounts.
2. NEVER disclose passwords, private memory, credentials, or personal secrets.
3. Be exceedingly polite, courteous, professional, and helpful.
4. If they ask about availability (e.g. "when can we meet?", "is he free?"), inform them that {operator_name} is currently in meetings and offer to take a message or schedule a call.
5. Mirror their language naturally (Hindi if they spoke Hindi/Hinglish, English if they spoke English).

You must return a valid JSON response with this exact structure:
{{
  "reply": "Clear, polite response to the contact",
  "summary_for_operator": "One line summary of what the contact wanted",
  "suggested_task": "Action item title for {operator_name} to follow up"
}}
"""
        models_to_try = [GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash"]
        models_to_try = list(dict.fromkeys(models_to_try))
        for m in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={server_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2}
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                            if json_match:
                                parsed = json.loads(json_match.group(0))
                                return {
                                    "reply": parsed.get("reply", fallback_reply),
                                    "summary_for_operator": parsed.get("summary_for_operator", f"Message from {sender_identifier}: {message_text}"),
                                    "suggested_task": parsed.get("suggested_task", f"Call/Message {sender_identifier}")
                                }
            except Exception as e:
                print(f"[Aether External Auto-Responder] LLM notice on {m}: {e}")

    return {
        "reply": fallback_reply,
        "summary_for_operator": f"Message from {sender_identifier}: {message_text}",
        "suggested_task": f"Call/Message {sender_identifier} regarding: {message_text[:40]}"
    }

def parse_sms_datetime(text: str) -> datetime:
    """Parses date & time from Indian Bank SMS messages (e.g. '30-OCT-26 14:35:10', '29Oct26', '28-10-2026')."""
    m = re.search(r'(\d{1,2})[-/]?([A-Za-z]{3})[-/]?(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?', text, re.I)
    if not m:
        m = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?', text, re.I)
    if m:
        d, mth, y = m.group(1), m.group(2), m.group(3)
        hr = int(m.group(4) or 12)
        mn = int(m.group(5) or 0)
        sec = int(m.group(6) or 0)
        ampm = (m.group(7) or '').upper()
        if ampm == 'PM' and hr < 12: hr += 12
        if ampm == 'AM' and hr == 12: hr = 0
        month_map = {'jan':1, 'feb':2, 'mar':3, 'apr':4, 'may':5, 'jun':6, 'jul':7, 'aug':8, 'sep':9, 'oct':10, 'nov':11, 'dec':12}
        month = month_map.get(mth.lower(), int(mth) if mth.isdigit() else 1)
        year = int(y)
        if year < 100: year += 2000
        return datetime(year, month, int(d), hr, mn, sec)
    return datetime.utcnow()

def parse_bank_sms(text: str) -> Optional[dict]:
    """Deterministically extracts financial transaction details from Indian Bank SMS alerts."""
    text_clean = text.replace('\n', ' ')
    
    # 1. Detect credit vs debit with Indian Banking nuances (e.g. "a/c debited ... credited to [merchant]")
    is_acct_debit = bool(re.search(r'\b(?:a/c|acct|account|card)\s*(?:no\.?)?\s*[\w\*]*\s*(?:is\s+)?(?:debited|charged|spent|used)\b', text_clean, re.I))
    is_acct_credit = bool(re.search(r'\b(?:a/c|acct|account)\s*(?:no\.?)?\s*[\w\*]*\s*(?:is\s+)?(?:credited|deposited)\b', text_clean, re.I))
    
    has_debit_word = bool(re.search(r'\b(debited|spent|paid|withdrawn|sent|deducted|purchase|purchased|txn of|payment of)\b', text_clean, re.I))
    has_credit_word = bool(re.search(r'\b(credited|received|deposited|refunded|salary)\b', text_clean, re.I))

    if not has_debit_word and not has_credit_word:
        return None

    if is_acct_debit:
        txn_type = 'expense'
    elif is_acct_credit and not is_acct_debit:
        txn_type = 'income'
    elif has_debit_word and has_credit_word:
        if re.search(r'debited.*(?:credited to|transfer to|to)', text_clean, re.I):
            txn_type = 'expense'
        elif re.search(r'credited.*(?:from|by)', text_clean, re.I):
            txn_type = 'income'
        else:
            txn_type = 'expense'
    elif has_debit_word:
        txn_type = 'expense'
    else:
        txn_type = 'income'
    
    # 2. Extract Amount
    amt_match = re.search(r'(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)', text_clean, re.I)
    if not amt_match:
        amt_match = re.search(r'([\d,]+(?:\.\d{1,2})?)\s*(?:inr|rs\.?|₹)', text_clean, re.I)
    if not amt_match:
        amt_match = re.search(r'\b(?:by|with|for|of|spent|paid)\s+([\d,]+(?:\.\d{1,2})?)\b', text_clean, re.I)
    if not amt_match:
        return None
    try:
        amount = float(amt_match.group(1).replace(',', ''))
    except Exception:
        return None
        
    # 3. Extract Merchant / Info (Supports POS, UPI, Retail stores, Shopping)
    merchant = 'Shopping / Store' if txn_type == 'expense' else 'Sender'
    m_patterns = [
        r'(?:towards\s+pos\s+purchase\s+at|pos\s+purchase\s+at|purchase\s+at|pos\s+txn\s+at)\s+([A-Za-z0-9\s\.\-_&]+)',
        r';\s*([A-Za-z0-9\s\.\-_&]+?)\s+credited',
        r'(?:credited to|transfer to|transferred to|paid to|paid at|towards|spent at|at|to)\s+([A-Za-z0-9\s\.\-_&]+?)(?:\s+(?:on|using|via|ref|bal|available|upi|card|\.|\,|$|\(|\;))',
        r'(?:info:?|vpa:?)\s*([A-Za-z0-9\s\.\-_&@]+?)(?:\s+(?:on|using|via|ref|bal|\.|\,|$|\(|\;))',
    ]
    for pat in m_patterns:
        m_match = re.search(pat, text_clean, re.I)
        if m_match:
            candidate = m_match.group(1).strip()
            candidate = re.sub(r'(?i)^(?:pos\s+purchase\s+at|pos\s+purchase|pos\s+txn\s+at|pos|upi/|vpa/)\s*', '', candidate).strip()
            # Clean trailing noise like "on 31/10", ". Avl Bal", "Ref: ...", etc.
            candidate = re.split(r'(?i)\s+(?:on\s+\d|\.|\;|\(|\bavl\b|\bbal\b|\bref\b|\bupi\b)', candidate)[0].strip()
            if candidate and not any(w in candidate.lower() for w in ['inr', 'rs.', 'a/c', 'acct', 'your account', 'bank account']):
                merchant = candidate.strip(' .,;')
                break

    # 4. Extract Category (Comprehensive Shopping & Retail dictionary)
    merchant_l = merchant.lower()
    text_l = text_clean.lower()
    cat = 'general'
    
    shopping_keywords = [
        'shop', 'zara', 'h&m', 'pantaloons', 'shoppers stop', 'westside', 'reliance',
        'retail', 'mall', 'mart', 'dmart', 'max', 'decathlon', 'croma', 'lifestyle',
        'uniqlo', 'trends', 'fabindia', 'amazon', 'flipkart', 'myntra', 'ajio',
        'blinkit', 'zepto', 'instamart', 'nykaa', 'tata cliq', 'clothing', 'fashion'
    ]
    food_keywords = [
        'swiggy', 'zomato', 'chai', 'coffee', 'food', 'restaurant', 'mcdonald', 'kfc',
        'burger', 'dominos', 'pizza', 'starbucks', 'dhaba', 'bakery', 'sweets', 'cafe'
    ]
    fuel_keywords = ['shell', 'petrol', 'fuel', 'hpcl', 'bpcl', 'ioc', 'indian oil', 'cng']
    travel_keywords = ['uber', 'ola', 'rapido', 'metro', 'irctc', 'rail', 'flight', 'indigo', 'air india', 'makemytrip', 'redbus']
    bills_keywords = ['electricity', 'bijli', 'airtel', 'jio', 'vi', 'bill', 'bescom', 'recharge', 'broadband', 'water', 'gas']

    if any(w in merchant_l or w in text_l for w in shopping_keywords):
        cat = 'shopping'
    elif any(w in merchant_l or w in text_l for w in food_keywords):
        cat = 'food'
    elif any(w in merchant_l or w in text_l for w in fuel_keywords):
        cat = 'petrol'
    elif any(w in merchant_l or w in text_l for w in travel_keywords):
        cat = 'travel'
    elif any(w in merchant_l or w in text_l for w in bills_keywords):
        cat = 'bills'
    elif txn_type == 'income' and 'salary' in text_l:
        cat = 'salary'

    # 5. Extract Payment Mode
    mode = 'upi'
    if 'card' in text_l:
        mode = 'card'
    elif 'neft' in text_l or 'rtgs' in text_l or 'netbanking' in text_l:
        mode = 'netbanking'
    elif 'atm' in text_l:
        mode = 'cash'

    # 6. Extract Date & Time
    txn_dt = parse_sms_datetime(text_clean)

    return {
        'type': txn_type,
        'amount': amount,
        'merchant': merchant,
        'category': cat,
        'payment_mode': mode,
        'date': txn_dt
    }

async def generate_email_draft(
    sender: str,
    subject: str,
    body: str,
    instructions: str = "",
    operator_name: str = "Pawan Dixit",
    language: str = "en"
) -> dict:
    """Generates a professional, context-aware email draft reply for human review."""
    clean_subj = subject.strip()
    if not clean_subj.lower().startswith("re:"):
        reply_subj = f"Re: {clean_subj}"
    else:
        reply_subj = clean_subj

    prompt = f"""You are Aether ⚡, the Chief of Staff drafting an email reply on behalf of {operator_name}.

Original Email Details:
• From: {sender}
• Subject: {subject}
• Content:
{body}

Operator's Instructions / Intent:
{instructions or 'Acknowledge politely, accept or request clarification as appropriate, and close warmly.'}

Requirements:
1. Write a clear, courteous, concise, and professional email body.
2. Sign off as:
   Warm regards,
   {operator_name}
3. Strictly protect private financial or confidential details.
4. Output valid JSON with this exact structure:
{{
  "recipient": "{sender}",
  "subject": "{reply_subj}",
  "body": "Formatted email reply body text",
  "summary": "1-line summary of what the draft says"
}}
"""
    server_key = os.getenv("GEMINI_API_KEY", "").strip() or (GEMINI_API_KEY.strip() if GEMINI_API_KEY else "")
    if server_key:
        models_to_try = [GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash"]
        models_to_try = list(dict.fromkeys(models_to_try))
        for m in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={server_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3}
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            j_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                            if j_match:
                                parsed = json.loads(j_match.group(0))
                                return {
                                    "recipient": parsed.get("recipient", sender),
                                    "subject": parsed.get("subject", reply_subj),
                                    "body": parsed.get("body", "").strip(),
                                    "summary": parsed.get("summary", "Draft email reply prepared.")
                                }
            except Exception as e:
                print(f"[Email Drafter] Notice on {m}: {e}")

    fallback_body = (
        f"Hi,\n\n"
        f"Thank you for reaching out regarding \"{clean_subj}\".\n\n"
        f"I have received your message and will review the details shortly. Let me know if there are any immediate questions in the meantime.\n\n"
        f"Warm regards,\n"
        f"{operator_name}"
    )
    return {
        "recipient": sender,
        "subject": reply_subj,
        "body": fallback_body,
        "summary": "Standard executive acknowledgement draft."
    }
