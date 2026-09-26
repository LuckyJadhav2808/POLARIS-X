"""
POLARIS-X Expedition Logistics Planner & Mission Sequencing Unit Tests
Validates multi-waypoint navigation, station dwell times, bunker depletion, and safe havens.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.engines.expedition_planner import (
    expedition_engine,
    ExpeditionPlanRequest,
    MissionWaypoint,
    EXPEDITION_PRESETS,
    POLAR_SAFE_HAVENS
)

client = TestClient(app)


def test_expedition_presets_endpoint():
    """Verify that presets endpoint returns official expedition templates."""
    response = client.get("/api/expedition/presets")
    assert response.status_code == 200
    data = response.json()
    assert "presets" in data
    assert len(data["presets"]) >= 2
    preset_ids = [p["id"] for p in data["presets"]]
    assert "ncpor-44th-iae" in preset_ids
    assert "peninsula-weddell-corridor" in preset_ids


def test_expedition_presets_structure():
    """Ensure 44th IAE preset has required stations, dwell hours, and metadata."""
    iae_preset = next(p for p in EXPEDITION_PRESETS if p["id"] == "ncpor-44th-iae")
    assert len(iae_preset["waypoints"]) == 4
    maitri = next(w for w in iae_preset["waypoints"] if "Maitri" in w["name"])
    assert maitri["dwell_time_hours"] == 72.0
    assert maitri["activity_type"] == "STATION_SUPPLY"


def test_insufficient_waypoints_validation():
    """Engine must reject requests with fewer than 2 waypoints."""
    with pytest.raises(ValueError, match="at least 2 sequential waypoints"):
        expedition_engine.compute_expedition_plan(
            ExpeditionPlanRequest(
                mission_name="Single Station Test",
                polar_class="PC-5",
                departure_date_iso="2021-03-01T08:00:00Z",
                initial_bunker_fuel_tons=1000.0,
                waypoints=[
                    MissionWaypoint(name="Grytviken", lat=-54.28, lon=-36.48, dwell_time_hours=0.0)
                ]
            )
        )


def test_multi_leg_computation_and_sequencing():
    """Verify sequential legs, timeline events, and clock advancement."""
    req = ExpeditionPlanRequest(
        mission_name="Antarctic Test Transect",
        polar_class="PC-5",
        departure_date_iso="2021-03-01T08:00:00Z",
        initial_bunker_fuel_tons=1500.0,
        waypoints=[
            MissionWaypoint(name="Rothera", lat=-67.57, lon=-68.12, dwell_time_hours=0.0, activity_type="PORT_DEPARTURE"),
            MissionWaypoint(name="Deception Island", lat=-63.00, lon=-60.70, dwell_time_hours=24.0, activity_type="STATION_SUPPLY"),
            MissionWaypoint(name="Signy Island", lat=-60.70, lon=-45.60, dwell_time_hours=12.0, activity_type="STATION_SUPPLY")
        ]
    )

    result = expedition_engine.compute_expedition_plan(req)
    assert result["status"] == "EXPEDITION_PLANNED"
    assert result["total_legs"] == 2
    assert len(result["legs"]) == 2

    # Leg 1 check
    leg1 = result["legs"][0]
    assert leg1["leg_number"] == 1
    assert "Rothera" in leg1["origin"]["name"]
    assert "Deception" in leg1["destination"]["name"]
    assert leg1["transit_duration_hours"] > 0
    assert leg1["dwell_time_hours"] == 24.0
    assert leg1["hotel_fuel_tons"] > 0
    assert leg1["total_leg_fuel_tons"] > leg1["transit_fuel_tons"]

    # Leg 2 check
    leg2 = result["legs"][1]
    assert leg2["leg_number"] == 2
    assert "Deception" in leg2["origin"]["name"]
    assert "Signy" in leg2["destination"]["name"]

    # Summary metrics
    summary = result["summary"]
    assert summary["total_distance_nm"] > 0
    assert summary["total_mission_days"] == pytest.approx(
        summary["total_transit_days"] + summary["total_dwell_days"], 0.2
    )
    assert summary["remaining_bunker_tons"] < req.initial_bunker_fuel_tons
    assert summary["bunker_status"] in ["SAFE_RESERVE", "CAUTION_RESERVE", "CRITICAL_LOW_RESERVE"]


def test_bunker_depletion_warning_levels():
    """Verify that low fuel triggers CAUTION or CRITICAL warnings."""
    # Set low bunker capacity so remaining drops below 20%
    req = ExpeditionPlanRequest(
        mission_name="Low Bunker Test",
        polar_class="PC-5",
        departure_date_iso="2021-03-01T08:00:00Z",
        initial_bunker_fuel_tons=120.0,  # very tight bunker
        waypoints=[
            MissionWaypoint(name="Rothera", lat=-67.57, lon=-68.12, dwell_time_hours=0.0),
            MissionWaypoint(name="Grytviken", lat=-54.28, lon=-36.48, dwell_time_hours=48.0)
        ]
    )

    result = expedition_engine.compute_expedition_plan(req)
    assert result["summary"]["remaining_bunker_pct"] < 35.0
    assert result["summary"]["bunker_status"] in ["CAUTION_RESERVE", "CRITICAL_LOW_RESERVE"]


def test_nearest_safe_haven_abort_vector():
    """Verify emergency safe haven calculation selects closest sheltered harbor."""
    haven = expedition_engine._find_nearest_safe_haven(-63.05, -60.65)
    # Very close to Deception Island
    assert "Deception" in haven["name"]
    assert haven["distance_nm"] < 30.0
    assert haven["estimated_escape_hours"] > 0
    assert haven["emergency_fuel_reserve_tons"] > 0


def test_plan_expedition_api_endpoint():
    """Verify POST /api/expedition/plan works end-to-end via TestClient."""
    payload = {
        "mission_name": "API Test Mission",
        "polar_class": "PC-5",
        "departure_date_iso": "2021-03-01T08:00:00Z",
        "initial_bunker_fuel_tons": 2000.0,
        "safety_weight": 0.7,
        "fuel_weight": 0.3,
        "waypoints": [
            {
                "name": "Grytviken / South Georgia",
                "lat": -54.2833,
                "lon": -36.4833,
                "dwell_time_hours": 0.0,
                "activity_type": "PORT_DEPARTURE"
            },
            {
                "name": "Signy Island",
                "lat": -60.7000,
                "lon": -45.6000,
                "dwell_time_hours": 36.0,
                "activity_type": "STATION_SUPPLY"
            }
        ]
    }
    response = client.post("/api/expedition/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "EXPEDITION_PLANNED"
    assert data["total_legs"] == 1
    assert "summary" in data
    assert "legs" in data
    assert "timeline" in data
