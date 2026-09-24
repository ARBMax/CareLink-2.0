"""
CareLink 2.0 — Gemini Ingestion Service (Stage 1)
Handles social media relevance filtering, multimodal image triage,
raw signal extraction, and translation using Gemini Flash.
"""
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel
from loguru import logger
from datetime import datetime, timezone
import json
import re

from core.config import get_settings
from models.incident import IncidentCategory, GeoCoords


# ── Output Models ─────────────────────────────────────────────────────────────

class RelevanceResult(BaseModel):
    is_relevant: bool
    confidence: float       # 0.0–1.0
    reason: str


class RawSignal(BaseModel):
    post_text:      str
    possible_locations: list[str]       # Place name strings extracted
    coords_hint:    GeoCoords | None    # Only if GPS coords found in text
    disaster_type:  IncidentCategory | str
    urgency_keywords: list[str]
    estimated_affected: int | None
    source_language: str = "en"
    translated_text: str | None = None  # Populated if non-English


class RawSignalBatch(BaseModel):
    signals:           list[RawSignal]
    batch_timestamp:   datetime
    gemini_model_used: str
    processing_ms:     int


class ImageAnalysis(BaseModel):
    damage_type:      str               # e.g. "Structural collapse", "Flooding"
    severity_estimate: str              # "low" | "medium" | "high"
    location_clues:   list[str]
    visible_people:   int | None
    confidence:       float


# ── Service ───────────────────────────────────────────────────────────────────

class GeminiIngestionService:
    """
    Stage 1 of the CareLink AI pipeline.
    Gemini Flash handles high-volume, ambiguous, multimodal input.
    """

    MODEL = "gemini-2.0-flash"
    RELEVANCE_THRESHOLD = 0.6   # Discard posts below this confidence

    def __init__(self):
        settings = get_settings()
        if settings.gemini_api_key and not settings.gemini_api_key.startswith("your_"):
            try:
                self.client = genai.Client(api_key=settings.gemini_api_key)
                logger.info("✅ GeminiIngestionService initialised with model: {}", self.MODEL)
            except Exception as exc:
                logger.warning("Gemini client initialization failed: {}. Running in mock mode.", exc)
                self.client = None
        else:
            logger.warning("⚠️  GEMINI_API_KEY not configured. Running GeminiIngestionService in mock mode.")
            self.client = None

    def _safe_json(self, text: str) -> dict:

        """Strip markdown fences and parse JSON."""
        clean = re.sub(r"```(?:json)?\n?", "", text).strip().rstrip("```")
        return json.loads(clean)

    async def is_disaster_relevant(
        self, post: str, image_url: str | None = None
    ) -> RelevanceResult:
        """
        Quickly filter whether a social post is about an active disaster.
        Used as a cheap gate before the more expensive signal extraction.
        """
        prompt = (
            "You are a humanitarian intelligence triage agent.\n"
            "Determine if this social media post is about an ACTIVE disaster, "
            "humanitarian crisis, or emergency event requiring immediate response.\n\n"
            f"Post: {post}\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"is_relevant": true/false, "confidence": 0.0-1.0, "reason": "..."}'
        )
        if self.client is None:
            keywords = ["flood", "earthquake", "quake", "cyclone", "fire", "emergency", "sos", "trapped", "collapse", "tsunami", "landslide"]
            is_rel = any(k in post.lower() for k in keywords)
            return RelevanceResult(is_relevant=is_rel, confidence=0.88 if is_rel else 0.2, reason="keyword_fallback")

        parts = [prompt]
        if image_url:
            parts.append(genai_types.Part.from_uri(uri=image_url, mime_type="image/jpeg"))

        try:
            response = await self.client.aio.models.generate_content(
                model=self.MODEL,
                contents=parts,
            )
            data = self._safe_json(response.text)
            return RelevanceResult(**data)
        except Exception as exc:
            logger.warning("Gemini relevance check failed: {}. Defaulting to relevant.", exc)
            return RelevanceResult(is_relevant=True, confidence=0.5, reason="parse_error")

    async def extract_raw_signals(self, posts: list[str]) -> RawSignalBatch:
        """
        Batch extraction of raw disaster signals from a list of social posts.
        Returns structured data for Groq to process in Stage 2.
        """
        if self.client is None:
            signals = [
                RawSignal(
                    post_text=p,
                    possible_locations=["Sylhet Basin", "Bangladesh"],
                    coords_hint=GeoCoords(lat=24.8949, lng=91.8687),
                    disaster_type=IncidentCategory.FLOOD,
                    urgency_keywords=["urgent", "rescue", "trapped", "water"],
                    estimated_affected=1500,
                    source_language="en",
                )
                for p in posts
            ]
            return RawSignalBatch(
                signals=signals,
                batch_timestamp=datetime.now(timezone.utc),
                gemini_model_used="gemini-2.0-flash (mock)",
                processing_ms=150,
            )

        posts_json = json.dumps([{"index": i, "text": p} for i, p in enumerate(posts)])
        prompt = (
            "You are a humanitarian intelligence analyst.\n"
            "Analyze these social media posts and extract structured disaster signals.\n"
            "For EACH post, extract:\n"
            "  1. possible_locations: list of place names mentioned\n"
            "  2. coords_hint: {lat, lng} if GPS coordinates are present, otherwise null\n"
            "  3. disaster_type: one of EARTHQUAKE|FLOOD|CYCLONE|WILDFIRE|"
            "FAMINE_DROUGHT|MEDICAL_OUTBREAK|INFRASTRUCTURE_COLLAPSE|UNKNOWN\n"
            "  4. urgency_keywords: list of words indicating severity\n"
            "  5. estimated_affected: integer if population count mentioned, else null\n"
            "  6. source_language: ISO 639-1 code\n\n"
            f"Posts:\n{posts_json}\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"signals": [{"post_text": "...", "possible_locations": [], '
            '"coords_hint": null, "disaster_type": "...", '
            '"urgency_keywords": [], "estimated_affected": null, '
            '"source_language": "en"}]}'
        )
        start = datetime.now(timezone.utc)
        try:
            response = await self.client.aio.models.generate_content(
                model=self.MODEL,
                contents=prompt,
            )
            elapsed = int(
                (datetime.now(timezone.utc) - start).total_seconds() * 1000
            )
            data = self._safe_json(response.text)
            signals = [RawSignal(**s) for s in data.get("signals", [])]
            return RawSignalBatch(
                signals=signals,
                batch_timestamp=start,
                gemini_model_used=self.MODEL,
                processing_ms=elapsed,
            )
        except Exception as exc:
            logger.error("Gemini signal extraction failed: {}", exc)
            raise

    async def analyze_image(self, image_url: str) -> ImageAnalysis:
        """
        Multimodal analysis of a disaster image.
        Used when Field Report form includes photo/satellite imagery.
        """
        if self.client is None:
            return ImageAnalysis(
                damage_type="Structural damage and flood inundation",
                severity_estimate="high",
                location_clues=["Embankment breach", "Submerged buildings"],
                visible_people=30,
                confidence=0.88,
            )

        prompt = (
            "You are a disaster assessment AI analyzing an image.\n"
            "Identify:\n"
            "  1. damage_type: What kind of damage or disaster is visible?\n"
            "  2. severity_estimate: 'low', 'medium', or 'high'\n"
            "  3. location_clues: Any text, landmarks, or geography visible\n"
            "  4. visible_people: Estimate of people visible (integer or null)\n"
            "  5. confidence: Your confidence in this assessment (0.0–1.0)\n\n"
            "Respond ONLY in valid JSON:\n"
            '{"damage_type": "...", "severity_estimate": "...", '
            '"location_clues": [], "visible_people": null, "confidence": 0.9}'
        )
        try:
            response = await self.client.aio.models.generate_content(
                model=self.MODEL,
                contents=[
                    prompt,
                    genai_types.Part.from_uri(uri=image_url, mime_type="image/jpeg"),
                ],
            )
            data = self._safe_json(response.text)
            return ImageAnalysis(**data)
        except Exception as exc:
            logger.error("Gemini image analysis failed: {}", exc)
            raise

    async def translate_and_transcribe(self, content: str, lang_hint: str = "auto") -> str:
        """
        Translate non-English field reports or WhatsApp messages to English.
        Also handles transcription hints if content is a transcript of audio.
        """
        if lang_hint == "en":
            return content  # Skip API call for English content

        prompt = (
            f"Translate the following text to English. "
            f"Source language hint: {lang_hint}.\n"
            "Return ONLY the translated English text, no explanations.\n\n"
            f"Text: {content}"
        )
        try:
            response = await self.client.aio.models.generate_content(
                model=self.MODEL,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as exc:
            logger.warning("Gemini translation failed: {}. Returning original.", exc)
            return content

    async def filter_relevant_posts(self, posts: list[str]) -> list[str]:
        """
        Filter a list of posts, returning only those above RELEVANCE_THRESHOLD.
        Runs relevance checks concurrently using asyncio.gather.
        """
        import asyncio
        results = await asyncio.gather(
            *[self.is_disaster_relevant(p) for p in posts],
            return_exceptions=True
        )
        relevant = []
        for post, result in zip(posts, results):
            if isinstance(result, Exception):
                relevant.append(post)  # Include on error (fail open)
            elif result.confidence >= self.RELEVANCE_THRESHOLD and result.is_relevant:
                relevant.append(post)
        logger.info(
            "Gemini relevance filter: {}/{} posts passed",
            len(relevant), len(posts)
        )
        return relevant
