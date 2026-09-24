# CareLink 2.0 — Backend Service

**CareLink 2.0 Decision OS** backend built with **FastAPI**, **Google Gemini 2.0 Flash**, **Groq LLaMA 3.3 70B**, and **Firebase Firestore / Realtime DB**.

---

## 🏗 Architecture & Two-Stage AI Pipeline

```
                                ┌──────────────────────────────────────────────────┐
                                │          Disaster Signal Ingestion               │
                                │   (Twitter/X, News/GDACS RSS, WhatsApp Hotline)  │
                                └─────────────────────────┬────────────────────────┘
                                                          │
                                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1 — GEMINI 2.0 FLASH (`gemini-2.0-flash`)                                                                        │
│ • High-throughput batch relevance filtering                                                                           │
│ • Multimodal eyewitness image triage & damage assessment                                                               │
│ • Cross-lingual translation & preliminary signal extraction (~800ms)                                                   │
└─────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2 — GROQ LLaMA 3.3 70B (`llama-3.3-70b-versatile`)                                                               │
│ • Structured Named Entity Recognition (NER) & location candidate extraction                                            │
│ • Severity scoring (0–100) & verified situational relief needs                                                         │
│ • Geospatial responder matching against credentialed skills & certifications (~400ms)                                  │
└─────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
│        Firebase Firestore DB         │                │     WebSocket Real-Time Gateway      │
│  4 Relational / Document Collections │                │       ws://localhost:8000/ws         │
│  (Incidents, Volunteers, Logistics,  │                │   (Pushes live globe markers,        │
│   Telemetry / Audit Logs)            │                │    telemetry feeds, flight progress) │
└──────────────────────────────────────┘                └──────────────────────────────────────┘
```

---

## 🗄️ Four Core Relational / Document Collections

1. **`incidents`**: Geocoordinates `[lat, lng]`, severity metrics (0–100), disaster category, casualty counts, verified situational needs, and resolution status.
2. **`volunteers`**: Responders with live GPS home-base positions, credentialed skill tags, medical/SAR certifications, spoken languages, and real-time readiness status.
3. **`dispatch_arcs`**: Active logistics tracking origin-to-destination transit waypoints, transport modalities (Air Charter, Helo, Ground Convoy), progress %, and ETA updates.
4. **`telemetry_logs`**: Timestamped sensor packets, telemetry metadata, alert severity levels, and Groq AI match scoring audit records (7-day TTL policy).

---

## 🚀 Quickstart

### Prerequisites
- Python 3.12+
- Virtual environment tool (`venv` or `conda`)

### 1. Setup Environment
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

### 2. Configure API Keys (in `.env`)
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
FIREBASE_PROJECT_ID=carelink-2
```
*(Note: If API keys are not supplied, the backend automatically operates with built-in heuristic fallbacks and mock pools for offline development).*

### 3. Start the Server
```bash
uvicorn main:app --reload --port 8000
```
- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **WebSocket Gateway**: `ws://localhost:8000/ws`

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health and AI/DB dependency status |
| `GET` | `/api/incidents` | List crises (filters: urgency, category, status, region) |
| `POST` | `/api/incidents` | Create incident manually (field report) |
| `GET` | `/api/incidents/{id}` | Detailed incident record |
| `PATCH` | `/api/incidents/{id}/status` | Update incident resolution state |
| `GET` | `/api/volunteers` | List responders (filters: status, skills) |
| `POST` | `/api/volunteers` | Register certified responder |
| `PATCH` | `/api/volunteers/{id}/gps` | Live GPS location update |
| `GET` | `/api/dispatch` | Active origin-to-destination transit routes |
| `POST` | `/api/dispatch` | Launch new dispatch mission |
| `PATCH` | `/api/dispatch/{id}/progress` | Update transit progress % & ETA |
| `POST` | `/api/ingest/text` | Ingest raw crisis text via Gemini → Groq pipeline |
| `POST` | `/api/ingest/image` | Multimodal damage triage from disaster photo |
| `POST` | `/api/ingest/sensor` | Ingest raw satellite or ground sensor packet |
| `POST` | `/api/match` | Run Groq AI volunteer matching against incident |
| `GET` | `/api/match/audit/{id}` | Groq match audit trail & token consumption |
| `GET` | `/api/stats` | High-level mission control KPIs & DEFCON threat level |

---

## 🐳 Docker Deployment

```bash
# Build image
docker build -t carelink-backend:latest .

# Run container
docker run -p 8000:8000 --env-file .env carelink-backend:latest
```

---

## ⚖️ License

Distributed under the **Apache License 2.0**.
