"""Campus Event Manager — local development API backed by SQLite."""
from pathlib import Path
import re
import sqlite3

from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "campus_events.db"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": [
    "http://127.0.0.1:5500", "http://localhost:5500"
]}})

SEED_EVENTS = [
    (1, "Campus Hackathon", "Technical", "2026-12-10", "Innovation Lab",
     "Build innovative solutions with your team and showcase your coding skills."),
    (2, "Cultural Fest", "Cultural", "2026-12-15", "Main Auditorium",
     "Experience music, dance, art, and exciting cultural performances."),
    (3, "Intercollege Sports Meet", "Sports", "2026-12-20", "Sports Ground",
     "Participate in exciting competitions and represent your college."),
    (4, "AI and Machine Learning Workshop", "Workshop", "2026-12-22", "Computer Lab",
     "Learn the fundamentals of artificial intelligence through practical activities."),
]


def connect_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with connect_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                venue TEXT NOT NULL,
                description TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL REFERENCES events(id),
                client_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, client_id)
            );
        """)
        conn.executemany("""
            INSERT OR IGNORE INTO events
            (id, name, category, date, venue, description)
            VALUES (?, ?, ?, ?, ?, ?)
        """, SEED_EVENTS)


def valid_client_id(client_id):
    return isinstance(client_id, str) and re.fullmatch(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
        client_id, re.IGNORECASE
    ) is not None


@app.get("/")
def home():
    return jsonify(message="Campus Event Manager API is running")


@app.get("/api/events")
def get_events():
    with connect_db() as conn:
        rows = conn.execute("SELECT * FROM events ORDER BY date, id").fetchall()
    return jsonify([dict(row) for row in rows])


@app.get("/api/registrations")
def get_registrations():
    client_id = request.args.get("client_id", "")
    if not valid_client_id(client_id):
        return jsonify(error="Valid client_id is required"), 400
    with connect_db() as conn:
        rows = conn.execute("""
            SELECT r.id AS registration_id, r.student_name, r.created_at,
                   e.id, e.name, e.category, e.date, e.venue, e.description
            FROM registrations r JOIN events e ON e.id = r.event_id
            WHERE r.client_id = ? ORDER BY r.created_at DESC, r.id DESC
        """, (client_id,)).fetchall()
    return jsonify([dict(row) for row in rows])


@app.post("/api/registrations")
def register():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="JSON object required"), 400
    event_id = data.get("event_id")
    client_id = data.get("client_id")
    student_name = data.get("student_name")
    if type(event_id) is not int or event_id < 1:
        return jsonify(error="Valid event_id is required"), 400
    if not valid_client_id(client_id):
        return jsonify(error="Valid client_id is required"), 400
    if not isinstance(student_name, str) or not 1 <= len(student_name.strip()) <= 80:
        return jsonify(error="Student name must be 1 to 80 characters"), 400

    with connect_db() as conn:
        event = conn.execute("SELECT id FROM events WHERE id = ?", (event_id,)).fetchone()
        if event is None:
            return jsonify(error="Event not found"), 404
        try:
            cursor = conn.execute("""
                INSERT INTO registrations (event_id, client_id, student_name)
                VALUES (?, ?, ?)
            """, (event_id, client_id, student_name.strip()))
        except sqlite3.IntegrityError:
            return jsonify(error="You are already registered for this event"), 409
    return jsonify(message="Registration successful", registration_id=cursor.lastrowid), 201


@app.delete("/api/registrations/<int:registration_id>")
def cancel_registration(registration_id):
    data = request.get_json(silent=True)
    client_id = data.get("client_id") if isinstance(data, dict) else None
    if not valid_client_id(client_id):
        return jsonify(error="Valid client_id is required"), 400
    with connect_db() as conn:
        cursor = conn.execute(
            "DELETE FROM registrations WHERE id = ? AND client_id = ?",
            (registration_id, client_id)
        )
        if cursor.rowcount == 0:
            return jsonify(error="Registration not found"), 404
    return jsonify(message="Registration cancelled")


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
