# Campus Event Manager

A full-stack learning and portfolio project for discovering campus events and registering from a browser. Demo events are fictional.

## Features

- Four API-loaded events, live search, category filters and event-detail modal
- Student name registration saved in SQLite
- Database-level duplicate prevention per browser demo profile
- View and cancel registrations; data survives page refresh
- Responsive Bootstrap 5 frontend, loading/error feedback

## Stack

HTML, CSS, Bootstrap 5, JavaScript, Python, Flask, SQLite, Git.

## Run locally (macOS)

Open a terminal **in this project's root folder**:

```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
python -m pip install -r requirements.txt
python backend/app.py
```

Leave Flask running at `http://127.0.0.1:5001`. SQLite will automatically create `backend/campus_events.db` and insert four demo events on first run.

Open **a second terminal** from the project root and run:

```bash
python3 -m http.server 5500 --bind 127.0.0.1
```

Open **http://127.0.0.1:5500/index.html** in your browser. You can also use VS Code Live Server on port 5500.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/events` | List events |
| GET | `/api/registrations?client_id=UUID` | List this browser's registrations |
| POST | `/api/registrations` | Register `{ "event_id": 1, "client_id": "UUID", "student_name": "Alex" }` |
| DELETE | `/api/registrations/<registration_id>` | Cancel with JSON `{ "client_id": "UUID" }` |

The registration API returns HTTP 409 for duplicates, 400 for invalid inputs and 404 for missing resources.

## Important limitations

This is a **local development demo**, not a production identity system. The browser-generated UUID is not authentication; anyone who possesses that ID can access its registrations. Do not use for real student data without authentication, authorization, privacy controls and deployment hardening. Flask debug mode and localhost-only CORS are for local development only.

The old frontend's `localStorage` registrations are not automatically migrated into SQLite. New registrations are stored in the database. Bootstrap loads via CDN, so styling/modals require internet access.

## Version control

Run `git status` before committing, and ensure `backend/venv` and database files are excluded by `.gitignore`. Then commit and push as usual.

## Automated backend tests

With `backend/venv` active and in the project root, run:

```bash
python -m unittest discover -s backend -p 'test_*.py' -v
```

Tests use a temporary SQLite database and cover event retrieval, CORS, registration, duplicate prevention, cancellation, and input validation.
