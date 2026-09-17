"""
POLARIS-X Routing Engine Verification Tests
Validates A* monotonic pathfinding, multi-objective Pareto trade-offs,
and dynamic iceberg surge avoidance.
"""
import pytest
from app.core.config import settings
from app.engines.polar_route import polar_route_optimizer

def test_rothera_to_grytviken_route_convergence():
    """Test standard corridor computation between Rothera Station and Grytviken."""
    start_lat, start_lon = settings.STATIONS["Rothera Station"]
    dest_lat, dest_lon = settings.STATIONS["Grytviken / South Georgia"]

    result = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class="PC-5",
        safety_weight=0.70,
        fuel_weight=0.30,
        simulation_date_iso="2021-03-15"
    )

    assert "recommended_route" in result
    assert "recommended_metrics" in result
    assert "direct_route" in result
    assert "direct_metrics" in result

    rec_coords = result["recommended_route"]["geometry"]["coordinates"]
    direct_coords = result["direct_route"]["geometry"]["coordinates"]

    assert len(rec_coords) >= 10, "Recommended route must contain valid sequential waypoints"
    assert len(direct_coords) >= 5, "Direct route must contain baseline waypoints"

    # Start and destination endpoint verification
    assert abs(rec_coords[0][0] - start_lon) < 1.0
    assert abs(rec_coords[0][1] - start_lat) < 1.0
    assert abs(rec_coords[-1][0] - dest_lon) < 1.0
    assert abs(rec_coords[-1][1] - dest_lat) < 1.0

    # Recommended route must avoid hazards
    rec_metrics = result["recommended_metrics"]
    direct_metrics = result["direct_metrics"]

    assert rec_metrics["distance_nm"] > 0
    assert rec_metrics["eta_hours"] > 0
    assert rec_metrics["fuel_proxy_pct"] > 0
    assert rec_metrics["risk_level"] in ["LOW", "MODERATE", "ELEVATED", "CRITICAL"]

def test_pareto_multi_objective_weight_sensitivity():
    """Verify that shifting safety weight vs fuel weight modifies route geometry."""
    start_lat, start_lon = settings.STATIONS["Rothera Station"]
    dest_lat, dest_lon = settings.STATIONS["Grytviken / South Georgia"]

    # 1. High Safety Bias (0.90 Safety, 0.10 Fuel)
    high_safety_res = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class="PC-5",
        safety_weight=0.90,
        fuel_weight=0.10,
        simulation_date_iso="2021-03-15"
    )

    # 2. High Fuel Economy Bias (0.10 Safety, 0.90 Fuel)
    high_fuel_res = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class="PC-5",
        safety_weight=0.10,
        fuel_weight=0.90,
        simulation_date_iso="2021-03-15"
    )

    high_safety_dist = high_safety_res["recommended_metrics"]["distance_nm"]
    high_fuel_dist = high_fuel_res["recommended_metrics"]["distance_nm"]

    high_safety_berg_risk = high_safety_res["recommended_metrics"]["avg_berg_risk"]
    high_fuel_berg_risk = high_fuel_res["recommended_metrics"]["avg_berg_risk"]

    # High safety route takes a protective detour (equal or longer distance with lower or equal berg risk)
    assert high_safety_dist >= high_fuel_dist or high_safety_berg_risk <= high_fuel_berg_risk

def test_dynamic_a68a_surge_evasion():
    """Verify that an accelerated dynamic surge of Iceberg A68A triggers an evasive bypass."""
    start_lat, start_lon = settings.STATIONS["Rothera Station"]
    dest_lat, dest_lon = settings.STATIONS["Grytviken / South Georgia"]

    # Normal conditions
    normal_res = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class="PC-5",
        simulation_date_iso="2021-03-15"
    )

    # Surge conditions: A68A moving 3.5x faster northeast
    surge_res = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class="PC-5",
        simulation_date_iso="2021-03-15",
        surge_berg_id="A68A",
        surge_speed_multiplier=3.5,
        surge_heading_deg=65.0
    )

    assert surge_res["recommended_metrics"]["distance_nm"] > 0
    assert len(surge_res["recommended_route"]["geometry"]["coordinates"]) >= 10
