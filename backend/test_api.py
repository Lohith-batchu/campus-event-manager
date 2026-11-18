"""Run from project root: python -m unittest discover -s backend -p 'test_*.py' -v"""
import tempfile
import unittest
import uuid
from pathlib import Path

import app as api


class APITests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.previous_db = api.DATABASE
        api.DATABASE = Path(self.temp.name) / "test.db"
        api.init_db()
        self.client = api.app.test_client()
        self.client_id = str(uuid.uuid4())

    def tearDown(self):
        api.DATABASE = self.previous_db
        self.temp.cleanup()

    def test_events_and_cors(self):
        response = self.client.get("/api/events", headers={"Origin": "http://127.0.0.1:5500"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 4)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:5500")

    def test_register_duplicate_and_cancel(self):
        body = {"event_id": 1, "client_id": self.client_id, "student_name": "Demo Student"}
        self.assertEqual(self.client.post("/api/registrations", json=body).status_code, 201)
        self.assertEqual(self.client.post("/api/registrations", json=body).status_code, 409)
        results = self.client.get("/api/registrations?client_id=" + self.client_id).json
        self.assertEqual(len(results), 1)
        registration_id = results[0]["registration_id"]
        self.assertEqual(self.client.delete(f"/api/registrations/{registration_id}",
                          json={"client_id": self.client_id}).status_code, 200)
        self.assertEqual(self.client.get("/api/registrations?client_id=" + self.client_id).json, [])

    def test_validation(self):
        body = {"event_id": 999, "client_id": self.client_id, "student_name": "Demo Student"}
        self.assertEqual(self.client.post("/api/registrations", json=body).status_code, 404)
        body["event_id"] = 1
        body["student_name"] = " "
        self.assertEqual(self.client.post("/api/registrations", json=body).status_code, 400)
        self.assertEqual(self.client.get("/api/registrations?client_id=invalid").status_code, 400)


if __name__ == "__main__":
    unittest.main()
