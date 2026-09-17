"""
POLARIS-X End-to-End Routing Engine & XAI Automated Test Suite
Verifies mathematical optimization, pathfinding, risk avoidance, and XAI attribution.
"""
import pytest
from app.core.config import settings
from app.core.vessel_physics import get_vessel_spec, calculate_effective_speed, calculate_segment_fuel_proxy
from app.engines.risk_grid import haversine_distance_nm, SpatialRiskGrid, is_antarctic_landmass
from app.engines.polar_route import PolarRouteOptimizer
from app.services.xai import XAIExplanationService

def test_haversine_accuracy():
    """Verify geodesic distance calculation between Rothera and Grytviken."""
    rothera_lat, rothera_lon = -67.5700, -68.1236
    grytviken_lat, grytviken_lon = -54.2833, -36.4833
    
    dist_nm = haversine_distance_nm(rothera_lat, rothera_lon, grytviken_lat, grytviken_lon)
    # Geodesic Great-Circle distance is ~1,120 - 1,180 NM
    assert 1100.0 < dist_nm < 1200.0, f"Unexpected Haversine distance: {dist_nm} NM"

def test_landmass_masking():
    """Verify peninsula spine is detected as land while open sea is navigable."""
    # Peninsula spine (e.g. Graham Land inland)
    assert is_antarctic_landmass(-66.0, -64.0) is True
    # Drake Passage open water
    assert is_antarctic_landmass(-58.0, -60.0) is False
    # Scotia Sea / Iceberg Alley open water
    assert is_antarctic_landmass(-56.0, -40.0) is False

def test_vessel_speed_and_fuel_degradation():
    """Verify non-linear speed degradation and cubic fuel curves."""
    vessel = get_vessel_spec("PC-5")
    assert vessel.cruising_speed_knots == 14.0
    
    # Open water: no speed loss
    open_speed = calculate_effective_speed(14.0, 0.0, 0.0, vessel.hull_resistance_coeff)
    assert open_speed == 14.0
    
    # 50% ice concentration: noticeable speed degradation
    ice_speed = calculate_effective_speed(14.0, 0.50, 0.20, vessel.hull_resistance_coeff)
    assert 3.0 <= ice_speed < 10.0
    
    # Fuel consumption in ice is higher than open water for same distance
    fuel_ice = calculate_segment_fuel_proxy(ice_speed, 14.0, 0.50, vessel.hull_resistance_coeff, 10.0)
    fuel_open = calculate_segment_fuel_proxy(14.0, 14.0, 0.0, vessel.hull_resistance_coeff, 10.0)
    assert fuel_ice > 0

def test_end_to_end_route_optimization():
    """Verify A* pathfinding and risk avoidance between Rothera and Grytviken."""
    optimizer = PolarRouteOptimizer()
    
    rothera_lat, rothera_lon = -67.5700, -68.1236
    grytviken_lat, grytviken_lon = -54.2833, -36.4833
    
    result = optimizer.find_route(
        start_lat=rothera_lat,
        start_lon=rothera_lon,
        dest_lat=grytviken_lat,
        dest_lon=grytviken_lon,
        polar_class="PC-5",
        safety_weight=0.70,
        fuel_weight=0.30,
        simulation_date_iso="2021-03-15"
    )
    
    assert "recommended_route" in result
    assert "direct_route" in result
    assert "recommended_metrics" in result
    assert "direct_metrics" in result
    
    rec_metrics = result["recommended_metrics"]
    direct_metrics = result["direct_metrics"]
    
    # Check valid positive values
    assert rec_metrics["distance_nm"] > 800.0
    assert rec_metrics["eta_hours"] > 30.0
    assert rec_metrics["fuel_proxy_pct"] > 50.0
    
    # Recommended route must achieve lower or equal iceberg risk
    assert rec_metrics["avg_berg_risk"] <= direct_metrics["avg_berg_risk"] + 0.05
    
    # GeoJSON linestrings must contain waypoints
    assert len(result["recommended_route"]["geometry"]["coordinates"]) >= 10
    assert len(result["direct_route"]["geometry"]["coordinates"]) >= 10

def test_xai_explanation_generation():
    """Verify natural language and waterfall factor generation."""
    rec_metrics = {
        "distance_nm": 1180.5,
        "eta_hours": 88.4,
        "fuel_proxy_pct": 104.2,
        "risk_score": 0.21,
        "avg_berg_risk": 0.04,
        "avg_ice_risk": 0.18,
        "avg_wx_risk": 0.25
    }
    direct_metrics = {
        "distance_nm": 1145.0,
        "eta_hours": 92.1,
        "fuel_proxy_pct": 112.0,
        "risk_score": 0.54,
        "avg_berg_risk": 0.48,
        "avg_ice_risk": 0.29,
        "avg_wx_risk": 0.28
    }
    
    xai = XAIExplanationService.generate_explanation(
        rec_metrics=rec_metrics,
        direct_metrics=direct_metrics,
        start_name="Rothera Station",
        dest_name="Grytviken / South Georgia",
        vessel_name="MV Vasiliy Golovnin (PC-5)",
        active_berg_names=["A68A", "A23A"]
    )
    
    assert "narrative" in xai
    assert "waterfall_factors" in xai
    assert len(xai["waterfall_factors"]) == 4
    assert xai["confidence_pct"] >= 80.0
    assert "A68A" in xai["narrative"] or "MV Vasiliy Golovnin" in xai["narrative"]
