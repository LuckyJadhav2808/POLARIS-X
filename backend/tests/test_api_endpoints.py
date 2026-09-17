"""
POLARIS-X FastAPI API Endpoint Integration Tests
Tests client request payloads against live FastAPI instance via TestClient.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["system"] == "POLARIS-X"

def test_vessels_endpoint():
    response = client.get("/api/vessels")
    assert response.status_code == 200
    data = response.json()
    assert len(data["vessels"]) >= 3
    names = [v["polar_class"] for v in data["vessels"]]
    assert any("PC-5" in n for n in names)

def test_stations_endpoint():
    response = client.get("/api/stations")
    assert response.status_code == 200
    data = response.json()
    assert len(data["stations"]) >= 5
    station_names = [s["name"] for s in data["stations"]]
    assert "Rothera Station" in station_names
    assert "Grytviken / South Georgia" in station_names

def test_layers_endpoint():
    response = client.get("/api/layers?simulation_date=2021-03-15")
    assert response.status_code == 200
    data = response.json()
    assert "icebergs" in data
    assert "weather_stations" in data
    assert "stations" in data
    assert len(data["icebergs"]["features"]) > 0
    assert len(data["weather_stations"]["features"]) > 0

def test_route_computation_endpoint():
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
    assert "direct_route" in data
    assert "recommended_metrics" in data
    assert "xai" in data
    assert "narrative" in data["xai"]
    assert len(data["xai"]["waterfall_factors"]) == 4

def test_simulate_reroute_endpoint():
    payload = {
        "surge_berg_id": "A68A",
        "speed_multiplier": 3.0,
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
    assert "CRITICAL" in data["alert"]["severity"]
    assert "rerouted_route" in data
