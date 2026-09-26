"""
POLARIS-X Tactical Bridge Officer AI Copilot Unit Tests
Validates voice intent parsing, tactical maritime Q&A, and cockpit command payloads.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.services.copilot import copilot_service

client = TestClient(app)


def test_copilot_switch_polar_class_intent():
    """Verify switching polar class extracts target class and emits cockpit action."""
    res = copilot_service.process_query("Polaris, switch polar class to PC-2")
    assert res["intent"] == "SWITCH_POLAR_CLASS"
    assert res["action"]["type"] == "SET_POLAR_CLASS"
    assert res["action"]["payload"]["polar_class"] == "PC-2"
    assert "PC-2" in res["spoken_response"]
    assert res["audio_cue"] == "ACKNOWLEDGE"


def test_copilot_compute_route_intent():
    """Verify compute route command emits TRIGGER_COMPUTE_ROUTE."""
    res = copilot_service.process_query("Hey Polaris, compute optimal safe route")
    assert res["intent"] == "COMPUTE_ROUTE"
    assert res["action"]["type"] == "TRIGGER_COMPUTE_ROUTE"
    assert "pathfinder" in res["spoken_response"].lower()
    assert res["audio_cue"] == "COMPUTING"


def test_copilot_surge_intent():
    """Verify iceberg surge command triggers surge demo payload."""
    res = copilot_service.process_query("Polaris, simulate emergency surge on iceberg A68A")
    assert res["intent"] == "TRIGGER_SURGE"
    assert res["action"]["type"] == "TRIGGER_SURGE_DEMO"
    assert res["action"]["payload"]["surge_berg_id"] == "A68A"
    assert res["audio_cue"] == "WARNING"


def test_copilot_expedition_intent():
    """Verify voice request opens expedition planner."""
    res = copilot_service.process_query("Polaris, open scientific expedition planner")
    assert res["intent"] == "OPEN_EXPEDITION"
    assert res["action"]["type"] == "OPEN_EXPEDITION_MODAL"


def test_copilot_ukc_query():
    """Verify Under-Keel Clearance query returns exact soundings and draft."""
    mock_bathy = {
        "min_depth_m": 420.0,
        "min_ukc_m": 411.5
    }
    res = copilot_service.process_query(
        "Polaris, what is our minimum Under-Keel Clearance along this track?",
        vessel_class="PC-5",
        bathymetry=mock_bathy
    )
    assert res["intent"] == "QUERY_UKC"
    assert "411.5 meters" in res["spoken_response"]
    assert res["action"] is None


def test_copilot_rio_query():
    """Verify IMO POLARIS RIO query interprets compliance status."""
    mock_rio = {
        "overall_status": "FULLY_AUTHORIZED",
        "min_rio": 22.4,
        "avg_rio": 28.1,
        "compliance_badge": "100% IMO POLARIS COMPLIANT"
    }
    res = copilot_service.process_query(
        "Polaris, check IMO POLARIS status for this corridor",
        vessel_class="PC-2",
        rio_profile=mock_rio
    )
    assert res["intent"] == "QUERY_RIO"
    assert "fully authorized" in res["spoken_response"].lower()
    assert "22.4" in res["spoken_response"]
    assert res["audio_cue"] == "SUCCESS"


def test_copilot_fuel_query():
    """Verify fuel consumption status query."""
    res = copilot_service.process_query(
        "Polaris, how much fuel will this voyage burn?",
        vessel_class="PC-5",
        route_metrics={"distance_nm": 1365.0, "eta_hours": 96.0}
    )
    assert res["intent"] == "QUERY_FUEL"
    assert "fuel" in res["spoken_response"].lower()


def test_copilot_api_endpoint():
    """Verify POST /api/copilot/query endpoint responds via TestClient."""
    response = client.post(
        "/api/copilot/query",
        json={
            "query": "Polaris, switch polar class to PC-1",
            "vessel_class": "PC-5",
            "start_station": "Rothera Station",
            "dest_station": "Grytviken / South Georgia"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "SWITCH_POLAR_CLASS"
    assert data["action"]["payload"]["polar_class"] == "PC-1"
    assert "PC-1" in data["spoken_response"]
