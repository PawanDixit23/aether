import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

import ai_engine


class _FakeResponse:
    status = 200

    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


class LiveDataRegressionTests(unittest.TestCase):
    def setUp(self):
        ai_engine.WEATHER_COORD_CACHE.clear()
        ai_engine.NEWS_CACHE["all"] = {"data": [], "timestamp": 0}
        ai_engine.NEWS_CACHE["sports"] = {"data": [], "timestamp": 0}
        ai_engine._cricket_cache.update({"data": [], "timestamp": 0})
        ai_engine._scorecard_cache.clear()
        ai_engine._match_league_map.clear()

    def test_weather_cache_never_leaks_between_coordinates(self):
        payload = {
            "current": {
                "temperature_2m": 23.5,
                "apparent_temperature": 22.0,
                "relative_humidity_2m": 45,
                "weather_code": 3,
                "wind_speed_10m": 8.0,
                "wind_direction_10m": 90,
                "precipitation": 0.0,
                "rain": 0.0,
                "showers": 0.0,
            },
            "daily": {
                "temperature_2m_max": [27.0],
                "temperature_2m_min": [18.0],
                "precipitation_probability_max": [10],
                "sunrise": ["2026-11-16T06:30"],
                "sunset": ["2026-11-16T17:45"],
            },
        }
        with patch.object(ai_engine.urllib.request, "urlopen", return_value=_FakeResponse(payload)):
            jaipur = ai_engine.get_live_weather_data(26.9124, 75.7873, "Jaipur")
        self.assertEqual(jaipur["status"], "success")
        self.assertEqual(jaipur["temp"], 23.5)

        with patch.object(ai_engine.urllib.request, "urlopen", side_effect=URLError("offline")):
            delhi = ai_engine.get_live_weather_data(28.6139, 77.2090, "Delhi")
        self.assertEqual(delhi["status"], "unavailable")
        self.assertNotIn("temp", delhi)
        self.assertEqual(delhi["city"], "Delhi")

    def test_weather_provider_failure_does_not_return_invented_temperature(self):
        with patch.object(ai_engine.urllib.request, "urlopen", side_effect=URLError("offline")):
            result = ai_engine.get_live_weather_data(19.0760, 72.8777, "Mumbai")
        self.assertEqual(result["status"], "unavailable")
        self.assertNotIn("temp", result)

    def test_cricket_feed_failure_does_not_return_hardcoded_live_matches(self):
        with patch.object(ai_engine.urllib.request, "urlopen", side_effect=URLError("offline")):
            matches = ai_engine.fetch_cricinfo_live_matches(force=True)
        self.assertEqual(matches, [])

    def test_scorecard_failure_does_not_return_synthetic_scorecard(self):
        with patch.object(ai_engine.urllib.request, "urlopen", side_effect=URLError("offline")):
            result = ai_engine.fetch_cricinfo_match_scorecard("test-match-id", force=True)
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["matchcards"], [])
        self.assertEqual(result["rosters"], [])

    def test_news_feed_failure_does_not_return_placeholder_headlines(self):
        with patch.object(ai_engine.urllib.request, "urlopen", side_effect=URLError("offline")):
            results = ai_engine.get_structured_news(limit=5)
        self.assertEqual(results, [])




class WeatherIntentRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def test_weather_question_returns_provider_text_without_llm_guessing(self):
        verified = "LIVE WEATHER: Sanganer 24.1 C, clear sky, updated 2026-11-16T06:00:00Z"
        with patch.object(ai_engine, "fetch_live_weather", return_value=verified), patch.object(
            ai_engine, "generate_contextual_follow_ups", return_value=[]
        ):
            result = await ai_engine.parse_intent_with_llm(
                "How weather today?",
                context={"city_guide": {"city": "Sanganer"}},
                user_lat=26.85,
                user_lon=75.77,
                language="en",
                user_city="Sanganer, Rajasthan",
            )
        self.assertEqual(result["action"], "query")
        self.assertEqual(result["data"]["response"], verified)
        self.assertIn("Deterministic live weather", result["explanation"])


if __name__ == "__main__":
    unittest.main()
