"""
CareLink 2.0 — Predictive Early Warning Service
Fetches live disaster signals from GDACS RSS and NewsAPI, then uses
Groq to generate structured risk assessments with a 24-72h horizon.

Data flow:
  1. GDACS RSS poll  → raw alert texts
  2. NewsAPI poll    → breaking disaster headlines
  3. Groq LLaMA     → risk scoring, signal extraction, recommended actions
  4. In-memory cache → served via REST + pushed over WebSocket
"""
from loguru import logger
import httpx
import xml.etree.ElementTree as ET
import json
import re
import time
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote_plus

from core.config import get_settings
from core.websocket_manager import ws_manager


# ── Risk Alert Model (matches frontend RiskAlert interface) ────────────────────

class RiskAlert:
    def __init__(self, **kwargs):
        self.id:                  str        = kwargs.get("id", f"ew-{uuid.uuid4().hex[:6]}")
        self.type:                str        = kwargs.get("type", "FLOOD")
        self.region:              str        = kwargs.get("region", "Unknown")
        self.country:             str        = kwargs.get("country", "Unknown")
        self.risk_level:          str        = kwargs.get("risk_level", "WATCH")
        self.risk_score:          int        = kwargs.get("risk_score", 40)
        self.timeframe:           str        = kwargs.get("timeframe", "72 hours")
        self.trigger:             str        = kwargs.get("trigger", "")
        self.affected_population: int        = kwargs.get("affected_population", 0)
        self.coordinates:         dict       = kwargs.get("coordinates", {"lat": 0, "lng": 0})
        self.last_updated:        str        = kwargs.get("last_updated", "Just now")
        self.signals:             list[str]  = kwargs.get("signals", [])
        self.recommended_actions: list[str]  = kwargs.get("recommended_actions", [])
        self.source_url:          str        = kwargs.get("source_url", "")

    def to_dict(self) -> dict:
        return {
            "id":                  self.id,
            "type":                self.type,
            "region":              self.region,
            "country":             self.country,
            "riskLevel":           self.risk_level,
            "riskScore":           self.risk_score,
            "timeframe":           self.timeframe,
            "trigger":             self.trigger,
            "affectedPopulation":  self.affected_population,
            "coordinates":         self.coordinates,
            "lastUpdated":         self.last_updated,
            "signals":             self.signals,
            "recommendedActions":  self.recommended_actions,
            "sourceUrl":           self.source_url,
        }


# ── Service ───────────────────────────────────────────────────────────────────

GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"
NEWS_API_BASE = "https://newsapi.org/v2/everything"

# Disaster type → approximate geo centroids for fallback coordinates
_REGION_COORDS: dict[str, tuple[float, float]] = {
    "bangladesh":     (23.6850, 90.3563),
    "myanmar":        (16.8660, 96.1951),
    "india":          (20.5937, 78.9629),
    "nepal":          (28.3949, 84.1240),
    "pakistan":       (30.3753, 69.3451),
    "afghanistan":    (33.9391, 67.7100),
    "philippines":    (12.8797, 121.7740),
    "indonesia":      (-0.7893, 113.9213),
    "japan":          (36.2048, 138.2529),
    "china":          (35.8617, 104.1954),
    "turkey":         (38.9637, 35.2433),
    "greece":         (39.0742, 21.8243),
    "italy":          (41.8719, 12.5674),
    "somalia":        (5.1521,  46.1996),
    "ethiopia":       (9.1450,  40.4897),
    "kenya":          (-0.0236,  37.9062),
    "niger":          (17.6078,  8.0817),
    "mali":           (17.5707, -3.9962),
    "chad":           (15.4542,  18.7322),
    "mozambique":     (-18.6657, 35.5296),
    "haiti":          (18.9712, -72.2852),
    "brazil":         (-14.2350, -51.9253),
    "usa":            (37.0902, -95.7129),
    "ukraine":        (48.3794,  31.1656),
    "syria":          (34.8021,  38.9968),
    "iraq":           (33.2232,  43.6793),
    "yemen":          (15.5527,  48.5164),
}

DISASTER_KEYWORD_MAP = {
    "cyclone":    "CYCLONE",
    "hurricane":  "CYCLONE",
    "typhoon":    "CYCLONE",
    "tropical":   "CYCLONE",
    "earthquake": "EARTHQUAKE",
    "seismic":    "EARTHQUAKE",
    "quake":      "EARTHQUAKE",
    "tremor":     "EARTHQUAKE",
    "flood":      "FLOOD",
    "flooding":   "FLOOD",
    "inundation": "FLOOD",
    "wildfire":   "WILDFIRE",
    "fire":       "WILDFIRE",
    "blaze":      "WILDFIRE",
    "drought":    "DROUGHT",
    "famine":     "DROUGHT",
    "outbreak":   "OUTBREAK",
    "epidemic":   "OUTBREAK",
    "cholera":    "OUTBREAK",
    "dengue":     "OUTBREAK",
    "tsunami":    "FLOOD",
    "landslide":  "FLOOD",
    "volcano":    "EARTHQUAKE",
}

SEVERITY_KEYWORDS_HIGH = [
    "catastrophic", "devastating", "massive", "major", "severe", "critical",
    "extreme", "deadly", "fatal", "kills", "killed", "deaths", "dead",
    "emergency", "crisis", "catastrophe", "warning", "alert level",
]


class EarlyWarningService:
    """
    Fetches live disaster feeds, scores them with Groq, and maintains
    an in-memory cache of current RiskAlerts for the frontend panel.
    """

    # How many minutes old a cached result can be before a re-fetch
    CACHE_TTL_MINUTES = 10

    def __init__(self):
        self.settings = get_settings()
        self._cache: list[RiskAlert] = []
        self._cache_ts: datetime | None = None
        self._lock = asyncio.Lock()

        # Groq client (reuse pattern from groq_service)
        self._groq = None
        if self.settings.groq_api_key and not self.settings.groq_api_key.startswith("your_"):
            try:
                from groq import AsyncGroq
                self._groq = AsyncGroq(api_key=self.settings.groq_api_key)
                logger.info("✅ EarlyWarningService: Groq client initialized")
            except Exception as exc:
                logger.warning("EarlyWarningService: Groq init failed: {}. Using keyword scoring.", exc)
        else:
            logger.warning("⚠️  EarlyWarningService: GROQ_API_KEY not set — using keyword-based scoring fallback")

    # ── Feed Fetchers ─────────────────────────────────────────────────────────

    async def _fetch_gdacs(self) -> list[dict]:
        """Fetch active alerts from the GDACS Global Disaster RSS feed."""
        alerts = []
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.get(GDACS_RSS_URL)
                if res.status_code == 200:
                    root = ET.fromstring(res.text)
                    ns = {"gdacs": "http://www.gdacs.org"}
                    for item in root.findall(".//item"):
                        title   = item.findtext("title", "")
                        desc    = item.findtext("description", "")
                        link    = item.findtext("link", "")
                        guid    = item.findtext("guid", link)

                        # Try to extract GDACS-specific severity/eventtype
                        severity = item.findtext("gdacs:severity", "", ns) or ""
                        country  = item.findtext("gdacs:country", "", ns) or ""
                        lat      = item.findtext("gdacs:latitude", "0", ns) or "0"
                        lng      = item.findtext("gdacs:longitude", "0", ns) or "0"
                        population = item.findtext("gdacs:population", "0", ns) or "0"

                        alerts.append({
                            "id":          guid or f"gdacs-{uuid.uuid4().hex[:6]}",
                            "text":        f"GDACS Alert: {title}. {desc}",
                            "link":        link,
                            "source":      "GDACS",
                            "country":     country,
                            "severity":    severity,
                            "lat":         float(lat) if lat.replace(".", "").replace("-", "").isdigit() else 0.0,
                            "lng":         float(lng) if lng.replace(".", "").replace("-", "").isdigit() else 0.0,
                            "population":  int(population) if population.isdigit() else 0,
                        })
                    logger.info("GDACS: fetched {} alerts", len(alerts))
                else:
                    logger.warning("GDACS returned HTTP {}", res.status_code)
        except Exception as exc:
            logger.warning("GDACS fetch failed: {}", exc)
        return alerts

    async def _fetch_newsapi(self) -> list[dict]:
        """Fetch breaking disaster headlines from NewsAPI."""
        if not self.settings.news_api_key or self.settings.news_api_key.startswith("your_"):
            return []

        alerts = []
        query = quote_plus(
            "earthquake OR flood OR cyclone OR hurricane OR tsunami "
            "OR wildfire OR disaster OR drought OR epidemic"
        )
        url = (
            f"{NEWS_API_BASE}?q={query}&language=en&sortBy=publishedAt"
            f"&pageSize=30&apiKey={self.settings.news_api_key}"
        )
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    for article in res.json().get("articles", []):
                        title = article.get("title", "")
                        desc  = article.get("description", "") or ""
                        alerts.append({
                            "id":       article.get("url", f"news-{uuid.uuid4().hex[:6]}"),
                            "text":     f"{title}. {desc}",
                            "link":     article.get("url", ""),
                            "source":   "NewsAPI",
                            "country":  "",
                            "severity": "",
                            "lat":      0.0,
                            "lng":      0.0,
                            "population": 0,
                        })
                    logger.info("NewsAPI: fetched {} articles", len(alerts))
        except Exception as exc:
            logger.warning("NewsAPI fetch failed: {}", exc)
        return alerts

    # ── Groq AI Scoring ───────────────────────────────────────────────────────

    def _safe_json(self, text: str) -> dict:
        clean = re.sub(r"```(?:json)?\n?", "", text).strip().rstrip("`").strip()
        # Extract first JSON object if wrapped in extra text
        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if match:
            clean = match.group(0)
        return json.loads(clean)

    def _keyword_score(self, text: str) -> int:
        """Fast keyword-based severity score (0-100) used when Groq is unavailable."""
        text_lower = text.lower()
        score = 30
        for kw in SEVERITY_KEYWORDS_HIGH:
            if kw in text_lower:
                score += 10
        return min(score, 90)

    def _keyword_disaster_type(self, text: str) -> str:
        text_lower = text.lower()
        for kw, dtype in DISASTER_KEYWORD_MAP.items():
            if kw in text_lower:
                return dtype
        return "FLOOD"

    def _fallback_coords(self, text: str, country: str, lat: float, lng: float) -> dict:
        """Return coords from GDACS if available, else guess from country name."""
        if lat != 0.0 or lng != 0.0:
            return {"lat": round(lat, 4), "lng": round(lng, 4)}
        combined = (text + " " + country).lower()
        for name, (clat, clng) in _REGION_COORDS.items():
            if name in combined:
                return {"lat": clat, "lng": clng}
        return {"lat": 0.0, "lng": 0.0}

    async def _score_with_groq(self, raw_alert: dict) -> RiskAlert | None:
        """Use Groq LLaMA to produce a structured RiskAlert from a raw text alert."""
        text = raw_alert["text"][:1200]  # truncate to avoid token overflow

        prompt = (
            "You are a humanitarian risk intelligence analyst generating a predictive early warning.\n"
            "Analyze this disaster alert and produce a structured risk assessment.\n\n"
            f"Alert text: {text}\n"
            f"Source country hint: {raw_alert.get('country', 'Unknown')}\n"
            f"Source: {raw_alert.get('source', 'Unknown')}\n\n"
            "Return ONLY valid JSON (no markdown, no extra text):\n"
            "{\n"
            '  "type": "FLOOD|CYCLONE|EARTHQUAKE|WILDFIRE|DROUGHT|OUTBREAK",\n'
            '  "region": "Geographic region name (e.g. Bay of Bengal, Sahel Corridor)",\n'
            '  "country": "Affected countries (e.g. Bangladesh / Myanmar)",\n'
            '  "risk_level": "EXTREME|HIGH|MODERATE|WATCH",\n'
            '  "risk_score": 0,\n'
            '  "timeframe": "e.g. 24-48 hours",\n'
            '  "trigger": "One sentence describing the specific trigger event",\n'
            '  "affected_population": 0,\n'
            '  "coordinates": {"lat": 0.0, "lng": 0.0},\n'
            '  "signals": ["signal 1", "signal 2", "signal 3"],\n'
            '  "recommended_actions": ["action 1", "action 2", "action 3"]\n'
            "}"
        )

        try:
            start = time.monotonic()
            response = await self._groq.chat.completions.create(
                model="qwen/qwen3.8-27b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=512,
            )
            elapsed_ms = int((time.monotonic() - start) * 1000)
            raw_content = response.choices[0].message.content
            data = self._safe_json(raw_content)

            # Merge GDACS coords if Groq returned 0,0
            coords = data.get("coordinates", {"lat": 0.0, "lng": 0.0})
            if coords.get("lat", 0) == 0 and coords.get("lng", 0) == 0:
                coords = self._fallback_coords(
                    text, raw_alert.get("country", ""),
                    raw_alert.get("lat", 0.0), raw_alert.get("lng", 0.0)
                )

            # Use GDACS population if Groq returned 0
            pop = data.get("affected_population", 0) or raw_alert.get("population", 0)

            return RiskAlert(
                id=f"ew-{uuid.uuid4().hex[:6]}",
                type=data.get("type", self._keyword_disaster_type(text)),
                region=data.get("region", raw_alert.get("country", "Unknown")),
                country=data.get("country", raw_alert.get("country", "Unknown")),
                risk_level=data.get("risk_level", "WATCH"),
                risk_score=max(0, min(100, int(data.get("risk_score", 40)))),
                timeframe=data.get("timeframe", "72 hours"),
                trigger=data.get("trigger", text[:140]),
                affected_population=int(pop),
                coordinates=coords,
                last_updated="Just now",
                signals=data.get("signals", [])[:5],
                recommended_actions=data.get("recommended_actions", [])[:4],
                source_url=raw_alert.get("link", ""),
            )
        except Exception as exc:
            logger.warning("Groq EW scoring failed ({}ms): {}", int((time.monotonic() - start) * 1000), exc)
            return None

    def _keyword_score_alert(self, raw_alert: dict) -> RiskAlert:
        """Fallback scoring when Groq is unavailable."""
        text = raw_alert["text"]
        dtype = self._keyword_disaster_type(text)
        score = self._keyword_score(text)
        risk_level = (
            "EXTREME" if score >= 80 else
            "HIGH" if score >= 65 else
            "MODERATE" if score >= 50 else
            "WATCH"
        )
        coords = self._fallback_coords(
            text, raw_alert.get("country", ""),
            raw_alert.get("lat", 0.0), raw_alert.get("lng", 0.0)
        )

        # Generate basic signals from text sentences
        sentences = [s.strip() for s in text.replace(". ", ".|").split("|") if len(s.strip()) > 20]
        signals = sentences[:4] if sentences else [text[:120]]

        return RiskAlert(
            id=f"ew-{uuid.uuid4().hex[:6]}",
            type=dtype,
            region=raw_alert.get("country", "Unknown Region"),
            country=raw_alert.get("country", "Unknown"),
            risk_level=risk_level,
            risk_score=score,
            timeframe="48–72 hours",
            trigger=sentences[0][:180] if sentences else text[:180],
            affected_population=raw_alert.get("population", 0),
            coordinates=coords,
            last_updated="Just now",
            signals=signals,
            recommended_actions=[
                f"Pre-position humanitarian assets for {dtype.lower()} response",
                "Alert regional emergency response coordinators",
                "Establish real-time comms with local disaster management authority",
            ],
            source_url=raw_alert.get("link", ""),
        )

    # ── Orchestration ─────────────────────────────────────────────────────────

    async def refresh_alerts(self) -> list[RiskAlert]:
        """
        Fetch fresh data from all sources, score each alert, update cache,
        and broadcast via WebSocket.  Thread-safe via asyncio.Lock.
        """
        async with self._lock:
            logger.info("🛰️  EarlyWarningService: refreshing alerts…")

            # Fetch from all sources concurrently
            gdacs_task   = asyncio.create_task(self._fetch_gdacs())
            newsapi_task = asyncio.create_task(self._fetch_newsapi())
            gdacs_raw, news_raw = await asyncio.gather(gdacs_task, newsapi_task)

            raw_alerts = gdacs_raw + news_raw

            if not raw_alerts:
                logger.warning("EarlyWarningService: no raw alerts fetched — keeping existing cache")
                return self._cache

            # Score each alert — Groq if available, keyword fallback otherwise
            # Limit to top 10 to avoid rate limits
            raw_alerts = raw_alerts[:10]
            alerts: list[RiskAlert] = []

            if self._groq:
                # Rate limit: process with 2s gaps to avoid Groq 429
                for raw in raw_alerts:
                    result = await self._score_with_groq(raw)
                    if result:
                        alerts.append(result)
                    await asyncio.sleep(1.5)
            else:
                alerts = [self._keyword_score_alert(r) for r in raw_alerts]

            # Sort by risk score descending
            alerts.sort(key=lambda a: a.risk_score, reverse=True)

            # De-duplicate by type+region (keep highest scored)
            seen_keys: set[str] = set()
            deduped: list[RiskAlert] = []
            for alert in alerts:
                key = f"{alert.type}-{alert.region[:20].lower()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    deduped.append(alert)

            self._cache    = deduped
            self._cache_ts = datetime.now(timezone.utc)

            logger.info("✅ EarlyWarningService: {} alerts cached", len(deduped))

            # Broadcast update to all connected WebSocket clients
            await ws_manager.broadcast(
                "EARLY_WARNING_UPDATE",
                {"alerts": [a.to_dict() for a in deduped]},
                source="early_warning_service",
            )

            return deduped

    async def get_alerts(self, force_refresh: bool = False) -> list[RiskAlert]:
        """
        Return cached alerts, refreshing if stale or forced.
        First call will always trigger a fetch.
        """
        if force_refresh or not self._cache or self._is_cache_stale():
            return await self.refresh_alerts()
        return self._cache

    def _is_cache_stale(self) -> bool:
        if self._cache_ts is None:
            return True
        age = (datetime.now(timezone.utc) - self._cache_ts).total_seconds() / 60
        return age > self.CACHE_TTL_MINUTES

    def cache_age_minutes(self) -> float:
        if self._cache_ts is None:
            return float("inf")
        return (datetime.now(timezone.utc) - self._cache_ts).total_seconds() / 60


# ── Singleton ─────────────────────────────────────────────────────────────────
_ew_service: Optional[EarlyWarningService] = None


def get_early_warning_service() -> EarlyWarningService:
    global _ew_service
    if _ew_service is None:
        _ew_service = EarlyWarningService()
    return _ew_service
