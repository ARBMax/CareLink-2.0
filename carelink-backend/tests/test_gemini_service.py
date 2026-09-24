"""
CareLink 2.0 — Unit Tests for Gemini Ingestion Service
Tests signal filtering and fallback handling.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.gemini_service import GeminiIngestionService, RawSignalBatch, DisasterSignal


@pytest.mark.asyncio
async def test_filter_relevant_posts_offline_mode():
    """Verify service handles offline or missing API key gracefully."""
    service = GeminiIngestionService()
    test_posts = [
        "Major flooding in Sylhet district! Water levels over 2 meters. #flood",
        "Just had a great dinner at the local restaurant!",
        "Earthquake tremor felt strongly in city center, windows cracked.",
    ]

    # In mock/offline mode without live API key, filter should return disaster-relevant posts
    filtered = await service.filter_relevant_posts(test_posts)
    assert len(filtered) >= 1
    assert any("flood" in p.lower() or "earthquake" in p.lower() for p in filtered)


@pytest.mark.asyncio
async def test_extract_raw_signals_structure():
    """Verify raw signal batch structure."""
    service = GeminiIngestionService()
    test_posts = [
        "Landslide blocks highway near Chittagong. At least 15 families cut off from aid.",
    ]

    batch = await service.extract_raw_signals(test_posts)
    assert isinstance(batch, RawSignalBatch)
    assert len(batch.signals) >= 1
    assert batch.signals[0].text is not None
