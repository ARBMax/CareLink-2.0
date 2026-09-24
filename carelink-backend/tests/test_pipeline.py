"""
CareLink 2.0 — Integration Tests for Ingestion Pipeline & REST Routers
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from models.incident import GeoCoords


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Verify GET /api/health returns operational status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "CareLink-Backend-2.0"


@pytest.mark.asyncio
async def test_list_incidents_endpoint():
    """Verify GET /api/incidents returns populated list with 4-collection schema fields."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/incidents")
        assert response.status_code == 200
        data = response.json()
        assert "incidents" in data
        assert len(data["incidents"]) > 0
        first = data["incidents"][0]
        # Verify 4-collection required fields are present
        assert "coords" in first
        assert "lat" in first["coords"]
        assert "lng" in first["coords"]
        assert "severity_score" in first
        assert "category" in first
        assert "casualties_confirmed" in first
        assert "extracted_needs" in first
        assert "status" in first


@pytest.mark.asyncio
async def test_list_volunteers_endpoint():
    """Verify GET /api/volunteers returns responders with live GPS and credentials."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/volunteers")
        assert response.status_code == 200
        data = response.json()
        assert "volunteers" in data
        assert len(data["volunteers"]) > 0
        first = data["volunteers"][0]
        assert "home_base_coords" in first
        assert "skills" in first
        assert "certifications" in first
        assert "languages" in first
        assert "readiness_status" in first


@pytest.mark.asyncio
async def test_list_dispatches_endpoint():
    """Verify GET /api/dispatch returns origin-destination routes and waypoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/dispatch")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            first = data[0]
            assert "from_coords" in first
            assert "to_coords" in first
            assert "transport_mode" in first
            assert "waypoints" in first


@pytest.mark.asyncio
async def test_kpi_stats_endpoint():
    """Verify GET /api/stats returns dashboard metrics and DEFCON threat status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "active_emergencies" in data
        assert "threat" in data
        assert "level" in data["threat"]
        assert "impact_metrics" in data
