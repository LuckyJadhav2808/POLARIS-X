"""
POLARIS-X FastAPI Contract & Endpoint Tests
Validates all REST endpoints, Pydantic v2 schemas, and GeoJSON outputs.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health_endpoint():
    """Verify /api/health reports system status and corridor bounding box."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "POLARIS-X" in data["system"]
    assert "bounds" in data

def test_api_vessels_endpoint():
    """Verify /api/vessels returns polar class fleet specifications."""
    response = client.get("/api/vessels")
    assert response.status_code == 200
    data = response.json()
    assert "vessels" in data
    assert len(data["vessels"]) >= 3
    classes = [v["polar_class"] for v in data["vessels"]]
    assert any("PC-5" in c for c in classes)
    assert any("PC-2" in c for c in classes)

def test_api_stations_endpoint():
    """Verify /api/stations returns predefined Antarctic research bases."""
    response = client.get("/api/stations")
    assert response.status_code == 200
    data = response.json()
    assert "stations" in data
    station_names = [s["name"] for s in data["stations"]]
    assert "Rothera Station" in station_names
    assert "Grytviken / South Georgia" in station_names

def test_api_layers_endpoint():
    """Verify /api/layers returns unified GeoJSON FeatureCollections."""
    response = client.get("/api/layers?simulation_date=2021-03-15")
    assert response.status_code == 200
    data = response.json()
    assert data["simulation_date"] == "2021-03-15"
    assert data["icebergs"]["type"] == "FeatureCollection"
    assert data["weather_stations"]["type"] == "FeatureCollection"
    assert data["stations"]["type"] == "FeatureCollection"
    assert len(data["icebergs"]["features"]) > 0

def test_api_compute_route_post():
    """Verify POST /api/route returns optimal corridor, metrics, and XAI."""
    payload = {
        "start_station": "Rothera Station",
        "dest_station": "Grytviken / South Georgia",
        "polar_class": "PC-5",
        "safety_weight": 0.70,
        "fuel_weight": 0.30,
        "simulation_date": "2021-03-15"
    }
    response = client.post("/api/route", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "SUCCESS"
    assert "recommended_route" in data
    assert "recommended_metrics" in data
    assert "direct_route" in data
    assert "xai" in data

    # Verify XAI structure
    xai = data["xai"]
    assert "narrative" in xai
    assert "waterfall_factors" in xai
    assert len(xai["waterfall_factors"]) == 4

def test_api_simulate_reroute_post():
    """Verify POST /api/simulate-reroute triggers dynamic surge warning and detour."""
    payload = {
        "surge_berg_id": "A68A",
        "speed_multiplier": 3.5,
        "heading_deg": 65.0,
        "start_station": "Rothera Station",
        "dest_station": "Grytviken / South Georgia",
        "polar_class": "PC-5",
        "simulation_date": "2021-03-15"
    }
    response = client.post("/api/simulate-reroute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "SURGE_ACTIVE"
    assert "alert" in data
    assert data["alert"]["severity"] == "CRITICAL_WARNING"
    assert "rerouted_route" in data

def test_api_invalid_weight_boundary_validation():
    """Verify Pydantic rejects invalid safety_weight > 1.0 with 422 Unprocessable Entity."""
    payload = {
        "start_station": "Rothera Station",
        "dest_station": "Grytviken / South Georgia",
        "polar_class": "PC-5",
        "safety_weight": 1.75,  # Invalid weight > 1.0
        "fuel_weight": 0.30
    }
    response = client.post("/api/route", json=payload)
    assert response.status_code == 422
