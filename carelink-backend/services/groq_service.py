"""
CareLink 2.0 — Groq Processing Service (Stage 2)
Handles structured NER, severity scoring, incident summarization,
and volunteer-to-incident match scoring using LLaMA 3 via Groq.
"""
from groq import AsyncGroq
from pydantic import BaseModel
from loguru import logger
from datetime import datetime, timezone
import json
import re
import time

from core.config import get_settings
from models.incident import IncidentCategory, UrgencyLevel
from models.volunteer import ScoredVolunteer, Volunteer
from models.telemetry_log import AIMatchRecord
from services.gemini_service import RawSignalBatch


# ── Output Models ─────────────────────────────────────────────────────────────

class EntityBundle(BaseModel):
    """Structured output from Groq NER extraction."""
    people_orgs:         list[str]          # People and organizations mentioned
    locations:           list[str]          # Extracted location names
    primary_location:    str                # Best single location candidate
    disaster_category:   IncidentCategory
    urgency_level:       UrgencyLevel
    extracted_needs:     list[str]          # Specific relief items needed
    required_skills:     list[str]          # Specialist skills required
    population_affected: int                # Best estimate
    casualties_confirmed: int = 0
    casualties_missing:  int = 0
    displaced_count:     int = 0
    severity_score:      int                # 0–100
    key_facts:           list[str]          # 3–5 bullet point facts
    groq_model_used:     str = "llama-3.3-70b-versatile"
    processing_ms:       int = 0


class IncidentSummary(BaseModel):
    """2–3 sentence operational summary for the incident dossier."""
    summary:     str
    short_title: str    # ≤ 60 chars, for notification banners


# ── Service ───────────────────────────────────────────────────────────────────

class GroqProcessingService:
    """
    Stage 2 of the CareLink AI pipeline.
    Groq's LLaMA 3 70B handles structured extraction and decision-support
    at ~500 tokens/second for near-real-time analysis.
    """

    MODEL = "llama-3.3-70b-versatile"

    def __init__(self):
        settings = get_settings()
        if settings.groq_api_key and not settings.groq_api_key.startswith("your_"):
            try:
                self.client = AsyncGroq(api_key=settings.groq_api_key)
                logger.info("✅ GroqProcessingService initialised with model: {}", self.MODEL)
            except Exception as exc:
                logger.warning("Groq client init failed: {}. Running in mock mode.", exc)
                self.client = None
        else:
            logger.warning("⚠️  GROQ_API_KEY not configured. Running GroqProcessingService in mock mode.")
            self.client = None

    def _safe_json(self, text: str) -> dict:
        """Strip markdown fences and parse JSON."""
        clean = re.sub(r"```(?:json)?\n?", "", text).strip().rstrip("```")
        return json.loads(clean)

    async def extract_named_entities(self, batch: RawSignalBatch) -> EntityBundle:
        """
        NER extraction from Gemini's raw signal batch.
        Identifies people, orgs, locations, needs, and required skills.
        """
        if self.client is None:
            return EntityBundle(
                people_orgs=["Red Crescent", "Local Disaster Unit"],
                locations=["Sylhet", "Sunamganj", "Bangladesh"],
                primary_location="Sylhet Basin",
                disaster_category=IncidentCategory.FLOOD,
                urgency_level=UrgencyLevel.CRITICAL,
                extracted_needs=["Water Purification", "Amphibious Boats", "Tents"],
                required_skills=["USAR", "Trauma Surgery", "Water Purification"],
                population_affected=18000,
                casualties_confirmed=5,
                casualties_missing=12,
                displaced_count=6500,
                severity_score=92,
                key_facts=[
                    "Flash flooding triggered by continuous monsoon surge",
                    "Over 500 families stranded on rooftops without clean water",
                    "Local hospital access road submerged",
                ],
                groq_model_used="llama-3.3-70b-versatile (mock)",
                processing_ms=180,
            )

        signals_text = "\n".join(
            f"- [{s.disaster_type}] {s.post_text} | Keywords: {s.urgency_keywords}"
            for s in batch.signals
        )

        prompt = (
            "You are a humanitarian intelligence extraction system.\n"
            "Analyze these disaster signals and extract structured data.\n\n"
            f"Signals:\n{signals_text}\n\n"
            "Extract and return ONLY valid JSON:\n"
            "{\n"
            '  "people_orgs": ["..."],\n'
            '  "locations": ["..."],\n'
            '  "primary_location": "...",\n'
            '  "disaster_category": "EARTHQUAKE|FLOOD|CYCLONE|WILDFIRE|FAMINE_DROUGHT|MEDICAL_OUTBREAK|INFRASTRUCTURE_COLLAPSE",\n'
            '  "urgency_level": "CRITICAL|HIGH|MEDIUM|LOW",\n'
            '  "extracted_needs": ["specific relief items needed"],\n'
            '  "required_skills": ["specialist skills required"],\n'
            '  "population_affected": 0,\n'
            '  "casualties_confirmed": 0,\n'
            '  "casualties_missing": 0,\n'
            '  "displaced_count": 0,\n'
            '  "severity_score": 0,\n'
            '  "key_facts": ["fact1", "fact2", "fact3"]\n'
            "}"
        )

        start = time.monotonic()
        try:
            response = await self.client.chat.completions.create(
                model=self.MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,  # Low temp for deterministic structured output
                max_tokens=1024,
            )
            elapsed_ms = int((time.monotonic() - start) * 1000)
            raw = response.choices[0].message.content
            data = self._safe_json(raw)
            return EntityBundle(
                **data,
                groq_model_used=self.MODEL,
                processing_ms=elapsed_ms,
            )
        except Exception as exc:
            logger.error("Groq NER extraction failed: {}", exc)
            raise

    async def calculate_severity_score(self, entity_bundle: EntityBundle) -> int:
        """
        Standalone severity scorer — called when re-evaluating existing incidents.
        The score is already embedded in extract_named_entities() for new incidents.
        Returns 0–100.
        """
        prompt = (
            "You are a disaster severity assessment AI.\n"
            "Score this incident from 0 (minor) to 100 (catastrophic).\n\n"
            f"Category: {entity_bundle.disaster_category}\n"
            f"Urgency: {entity_bundle.urgency_level}\n"
            f"Population affected: {entity_bundle.population_affected}\n"
            f"Casualties confirmed: {entity_bundle.casualties_confirmed}\n"
            f"Missing: {entity_bundle.casualties_missing}\n"
            f"Displaced: {entity_bundle.displaced_count}\n"
            f"Key facts: {entity_bundle.key_facts}\n\n"
            'Respond ONLY: {"severity_score": 0}'
        )
        if self.client is None:
            return entity_bundle.severity_score or 85

        try:
            response = await self.client.chat.completions.create(
                model=self.MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=32,
            )
            data = self._safe_json(response.choices[0].message.content)
            return max(0, min(100, int(data.get("severity_score", 50))))
        except Exception as exc:
            logger.warning("Groq severity scoring failed: {}. Returning 50.", exc)
            return 50

    async def generate_incident_summary(self, entity_bundle: EntityBundle) -> IncidentSummary:
        """
        Generate a 2–3 sentence operational briefing for the incident dossier panel.
        Format: [What happened] + [Immediate impact] + [Most critical need]
        """
        if self.client is None:
            cat_name = entity_bundle.disaster_category.value if hasattr(entity_bundle.disaster_category, 'value') else str(entity_bundle.disaster_category)
            return IncidentSummary(
                summary=f"Severe {cat_name} event reported in {entity_bundle.primary_location}. Immediate humanitarian intervention underway.",
                short_title=f"{cat_name} — {entity_bundle.primary_location}"[:60],
            )

        prompt = (

            "You are writing an operational briefing for emergency responders.\n"
            "Write a concise 2–3 sentence summary for this disaster.\n"
            "Format: [What happened] [Immediate human impact] [Most critical resource need]\n"
            "Also write a short_title (≤60 chars) for notification banners.\n\n"
            f"Category: {entity_bundle.disaster_category} | Urgency: {entity_bundle.urgency_level}\n"
            f"Location: {entity_bundle.primary_location}\n"
            f"Population affected: {entity_bundle.population_affected:,}\n"
            f"Needs: {', '.join(entity_bundle.extracted_needs[:4])}\n"
            f"Key facts: {entity_bundle.key_facts}\n\n"
            'Respond ONLY: {"summary": "...", "short_title": "..."}'
        )
        try:
            response = await self.client.chat.completions.create(
                model=self.MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=256,
            )
            data = self._safe_json(response.choices[0].message.content)
            return IncidentSummary(**data)
        except Exception as exc:
            logger.warning("Groq summary generation failed: {}", exc)
            return IncidentSummary(
                summary=f"{entity_bundle.disaster_category} incident near {entity_bundle.primary_location}.",
                short_title=f"{entity_bundle.disaster_category} — {entity_bundle.primary_location}"[:60],
            )

    async def score_volunteer_match(
        self,
        incident_data: dict,
        volunteers: list[Volunteer],
    ) -> tuple[list[ScoredVolunteer], list[AIMatchRecord]]:
        """
        Rank volunteers against an incident using Groq.
        Returns sorted ScoredVolunteer list AND audit AIMatchRecord list.

        Scoring weights (per spec):
          - Required skills overlap  → 50%
          - Proximity / ETA          → 25%
          - Past mission experience  → 15%
          - Language match           → 10%
        """
        vol_data = [
            {
                "id": v.id,
                "name": v.name,
                "skills": v.skills,
                "certifications": v.certifications,
                "languages": v.languages,
                "distance_km": v.distance_km,
                "eta_hours": v.eta_hours,
                "past_missions": v.past_missions,
                "readiness_status": v.readiness_status,
            }
            for v in volunteers
        ]
        prompt = (
            "You are an AI-powered humanitarian logistics engine.\n"
            "Rank these volunteers against the incident using the scoring weights below.\n\n"
            "SCORING WEIGHTS:\n"
            "  - Required skills overlap vs volunteer skills: 50%\n"
            "  - Proximity (lower distance_km = better): 25%\n"
            "  - Past missions (experience): 15%\n"
            "  - Language match for incident country: 10%\n\n"
            f"Incident:\n{json.dumps(incident_data, indent=2)}\n\n"
            f"Volunteers:\n{json.dumps(vol_data, indent=2)}\n\n"
            "Return ONLY valid JSON:\n"
            '{"rankings": [{"id": "...", "computed_score": 0-100, '
            '"match_reasons": ["..."], "skill_overlap": ["..."]}]}'
        )
        start = time.monotonic()
        try:
            response = await self.client.chat.completions.create(
                model=self.MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1024,
            )
            elapsed_ms = int((time.monotonic() - start) * 1000)
            data = self._safe_json(response.choices[0].message.content)
            rankings = {r["id"]: r for r in data.get("rankings", [])}

            scored: list[ScoredVolunteer] = []
            audit_records: list[AIMatchRecord] = []

            for rank_idx, vol in enumerate(
                sorted(volunteers, key=lambda v: rankings.get(v.id, {}).get("computed_score", 0), reverse=True)
            ):
                ranking = rankings.get(vol.id, {})
                score = max(0, min(100, int(ranking.get("computed_score", 50))))

                scored.append(ScoredVolunteer(
                    volunteer=vol,
                    computed_score=score,
                    match_reasons=ranking.get("match_reasons", []),
                    rank=rank_idx + 1,
                    skill_overlap=ranking.get("skill_overlap", []),
                ))
                audit_records.append(AIMatchRecord(
                    incident_id=incident_data.get("id", ""),
                    volunteer_id=vol.id,
                    groq_score=score,
                    skill_overlap=ranking.get("skill_overlap", []),
                    match_reasons=ranking.get("match_reasons", []),
                    model_used=self.MODEL,
                    prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
                    response_tokens=response.usage.completion_tokens if response.usage else 0,
                    completion_ms=elapsed_ms,
                ))

            return scored, audit_records

        except Exception as exc:
            logger.error("Groq volunteer match scoring failed: {}", exc)
            raise
