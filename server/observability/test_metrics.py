import unittest

from server.observability.metrics import ObservabilityTracker


class ObservabilityBandwidthTests(unittest.TestCase):
    def test_tracks_request_and_response_bytes_per_endpoint(self):
        tracker = ObservabilityTracker()
        tracker.record_request("/api/tasks", 12.5, 200, request_bytes=64)
        tracker.record_response_bytes("/api/tasks", 1024)

        summary = tracker.get_summary()
        self.assertEqual(summary["total_requests"], 1)
        self.assertEqual(summary["total_request_bytes"], 64)
        self.assertEqual(summary["total_response_bytes"], 1024)
        self.assertEqual(summary["endpoint_metrics"][0]["endpoint"], "/api/tasks")
        self.assertEqual(summary["endpoint_metrics"][0]["response_bytes"], 1024)

    def test_error_counts_and_recent_events_remain_bounded(self):
        tracker = ObservabilityTracker()
        for index in range(150):
            tracker.record_request(f"/api/route-{index}", 1, 500 if index == 0 else 200)
        summary = tracker.get_summary()
        self.assertEqual(summary["total_requests"], 150)
        self.assertEqual(summary["total_errors"], 1)
        self.assertEqual(summary["recent_activity_count"], tracker.MAX_RECENT_EVENTS)
        self.assertLessEqual(len(summary["endpoint_metrics"]), tracker.MAX_ENDPOINTS)

    def test_negative_byte_counts_are_ignored(self):
        tracker = ObservabilityTracker()
        tracker.record_request("/api/tasks", 1, 200, request_bytes=-10)
        tracker.record_response_bytes("/api/tasks", -20)
        summary = tracker.get_summary()
        self.assertEqual(summary["total_request_bytes"], 0)
        self.assertEqual(summary["total_response_bytes"], 0)


if __name__ == "__main__":
    unittest.main()
