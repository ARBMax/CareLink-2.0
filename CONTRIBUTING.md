# Contributing to CareLink 2.0

Thank you for your interest in contributing to **CareLink 2.0 — Decision OS for Disaster Response**.

This project is built and maintained under the **Apache 2.0 License** as a free, open-source humanitarian tool.

---

## 👥 Two-Person Development Architecture

To enable rapid, conflict-free collaboration with a single repository owner, the codebase is strictly partitioned:

```
CareLink-2.0/
├── carelink-backend/        # 👤 Person A (Repo Owner) Domain
│   ├── core/
│   ├── models/
│   ├── routers/
│   ├── services/
│   ├── scrapers/
│   └── scheduler/
│
└── src/                     # 👤 Person B (Contributor) Domain
    ├── components/
    ├── hooks/
    └── types/
```

### Git Branch & PR Workflow

1. **Person A (Repo Owner):**
   - Holds repository ownership and admin merge rights on `main`.
   - Works on backend features in `backend/dev` or directly on `main`.
   - Reviews and merges PRs from contributors.

2. **Person B (Contributor):**
   - Forks the repository to their personal GitHub account.
   - Creates a feature branch (e.g., `feature/smart-match-ui` or `feature/3d-globe-tooltips`).
   - Submits PRs targeting `main` (or `frontend/dev`).
   - All frontend PRs strictly touch `src/` and `public/` files — zero changes in `carelink-backend/` to prevent merge conflicts.

---

## 🛠 Local Development Setup

### 1. Backend (Python 3.12 + FastAPI)

```bash
cd carelink-backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI server with auto-reload:
uvicorn main:app --reload --port 8000
```

Interactive API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).
Real-time WebSocket endpoint is at `ws://localhost:8000/ws`.

### 2. Frontend (React + Vite + TypeScript)

```bash
# In the workspace root:
npm install
npm run dev
```

App runs at [http://localhost:5173](http://localhost:5173).

---

## 📦 Four Core Collections & Data Contracts

All data models maintain strict 1:1 parity between backend Pydantic models (`carelink-backend/models/`) and TypeScript interfaces (`src/types/`):

1. **Incidents (`incidents`)**: Geocoordinates `[lat, lng]`, severity metrics (0–100), disaster category, casualty counts, verified situational needs, resolution status.
2. **Responders & Volunteers (`volunteers`)**: Live GPS coordinates, credentialed skill tags, medical/SAR certifications, languages, readiness states.
3. **Active Dispatches & Logistics (`dispatch_arcs`)**: Origin-to-destination transit waypoints, transport modalities, dispatch progress %, live ETA updates.
4. **Telemetry & Audit Feeds (`telemetry_logs`)**: Sensor packets, telemetry source metadata, alert severity levels, Groq AI match scoring audit records (7-day TTL).

---

## 🧪 Testing

Run backend tests:
```bash
cd carelink-backend
pytest tests/ -v
```

---

## 📄 License

CareLink 2.0 is licensed under the **Apache License 2.0**.
