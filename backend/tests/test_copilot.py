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


def test_copilot_destination_confirmation_query():
    """Verify voyager inquiry confirming chosen destination."""
    res = copilot_service.process_query(
        "Can you check or confirm the destination that we have chosen?",
        start_station="Rothera Station",
        dest_station="Grytviken / South Georgia",
        route_metrics={"distance_nm": 1365.0, "eta_hours": 88.0}
    )
    assert res["intent"] == "QUERY_DESTINATION"
    assert "Grytviken / South Georgia" in res["spoken_response"]
    assert "Rothera Station" in res["spoken_response"]
    assert "1365 nautical miles" in res["spoken_response"]
    assert res["audio_cue"] == "ACKNOWLEDGE"


def test_copilot_weather_query():
    """Verify synoptic weather, wind, and freezing spray advisory query."""
    res = copilot_service.process_query("What is the weather and wind speed ahead?")
    assert res["intent"] == "QUERY_WEATHER"
    assert "synoptic" in res["spoken_response"].lower()
    assert "freezing spray" in res["spoken_response"].lower()
    assert res["audio_cue"] == "WARNING"


def test_copilot_safe_haven_query():
    """Verify emergency shelter and safe haven query."""
    res = copilot_service.process_query("Where is the nearest emergency safe haven or anchorage?")
    assert res["intent"] == "QUERY_SAFE_HAVEN"
    assert "Deception Island" in res["spoken_response"]
    assert "Potter Cove" in res["spoken_response"]


def test_copilot_escort_query():
    """Verify icebreaker escort requirement check."""
    res = copilot_service.process_query(
        "Do we legally require an icebreaker escort right now?",
        vessel_class="PC-5"
    )
    assert res["intent"] == "QUERY_ESCORT"
    assert "escort" in res["spoken_response"].lower()
    assert "PC-5" in res["spoken_response"]


def test_copilot_ice_type_query():
    """Verify ice regime and besetting pressure query."""
    res = copilot_service.process_query("Are we in first-year or multi-year pack ice?")
    assert res["intent"] == "QUERY_ICE_TYPE"
    assert "First-Year" in res["spoken_response"]


def test_copilot_endurance_query():
    """Verify vessel survival days under ice entrapment hotel load."""
    res = copilot_service.process_query("How many days of hotel load survival fuel do we have if stuck in ice?")
    assert res["intent"] == "QUERY_ENDURANCE"
    assert "hotel load" in res["spoken_response"].lower()
    assert "autonomous life-support" in res["spoken_response"].lower()
    assert res["audio_cue"] == "SUCCESS"


def test_copilot_project_info_query():
    """Verify general project, NCPOR, and Problem Statement 26059 question."""
    res = copilot_service.process_query("What is Problem Statement PS-26059 and POLARIS-X?")
    assert res["intent"] == "QUERY_PROJECT_INFO"
    assert "PS-26059" in res["display_text"]
    assert "NCPOR" in res["spoken_response"]


def test_copilot_date_query():
    """Verify voyage start date / departure date inquiry."""
    res = copilot_service.process_query(
        "What is the date of starting our journey?",
        simulation_date="2021-03-15",
        start_station="Rothera Station",
        dest_station="Grytviken / South Georgia"
    )
    assert res["intent"] == "QUERY_DATE"
    assert "2021-03-15" in res["display_text"]
    assert "March 2021" in res["spoken_response"]
    assert res["audio_cue"] == "ACKNOWLEDGE"


