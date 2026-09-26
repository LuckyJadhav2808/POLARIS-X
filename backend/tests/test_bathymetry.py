"""
Unit tests for POLARIS-X Bathymetric Depth Filter & Under-Keel Clearance (UKC) Engine
"""
import pytest
from app.core.vessel_physics import calculate_under_keel_clearance, get_vessel_spec, VESSEL_PROFILES
from app.engines.risk_grid import get_seafloor_depth, risk_grid_engine, is_antarctic_landmass

def test_vessel_draft_specifications():
    """Verify that all polar vessel specs define operating keel drafts."""
    for p_class, spec in VESSEL_PROFILES.items():
        assert hasattr(spec, "draft_m")
        assert 7.0 <= spec.draft_m <= 13.0

    pc2 = get_vessel_spec("PC-2")
    assert pc2.draft_m == 11.2

    pc5 = get_vessel_spec("PC-5")
    assert pc5.draft_m == 8.5

def test_under_keel_clearance_calculation():
    """Test UKC evaluation across deep ocean, caution zone, and grounded states."""
    # 1. Deep ocean (500m depth, 9.8m draft)
    deep = calculate_under_keel_clearance(depth_m=500.0, draft_m=9.8)
    assert deep["under_keel_clearance_m"] == 490.2
    assert not deep["is_hazardous"]
    assert not deep["is_grounded"]
    assert deep["grounding_risk"] == 0.0
    assert deep["status"] == "DEEP_WATER_CLEAR"

    # 2. Caution continental shelf (20m depth, 8.5m draft -> UKC = 11.5m)
    caution = calculate_under_keel_clearance(depth_m=20.0, draft_m=8.5)
    assert caution["under_keel_clearance_m"] == 11.5
    assert not caution["is_hazardous"]
    assert not caution["is_grounded"]
    assert 0.0 < caution["grounding_risk"] < 0.50
    assert caution["status"] == "CAUTION_RESTRICTED_DRAFT"

    # 3. Hazardous shallow shoal (10m depth, 8.5m draft -> UKC = 1.5m < 5.0m threshold)
    shoal = calculate_under_keel_clearance(depth_m=10.0, draft_m=8.5)
    assert shoal["under_keel_clearance_m"] == 1.5
    assert shoal["is_hazardous"]
    assert not shoal["is_grounded"]
    assert shoal["grounding_risk"] >= 0.50
    assert shoal["status"] == "CRITICAL_SHALLOW_SHOAL"

    # 4. Grounded hull (7.0m depth, 8.5m draft -> grounded)
    grounded = calculate_under_keel_clearance(depth_m=7.0, draft_m=8.5)
    assert grounded["under_keel_clearance_m"] == -1.5
    assert grounded["is_hazardous"]
    assert grounded["is_grounded"]
    assert grounded["grounding_risk"] == 1.0
    assert grounded["status"] == "GROUNDED_IMPASSABLE"

def test_seafloor_depth_model():
    """Verify Antarctic bathymetric depth calculations across latitudes and longitudes."""
    # Deep open Sub-Antarctic Ocean (-52°S)
    deep_depth = get_seafloor_depth(lat=-52.0, lon=-40.0)
    assert deep_depth > 3500.0

    # Antarctic continental shelf (-65°S, -64°W)
    shelf_depth = get_seafloor_depth(lat=-65.0, lon=-64.0)
    assert 20.0 <= shelf_depth <= 1000.0

    # Landmass check returns 0.0m
    land_depth = get_seafloor_depth(lat=-75.0, lon=0.0)
    assert land_depth == 0.0

def test_route_bathymetry_profile():
    """Test sampling along a route corridor."""
    sample_route = [
        (-67.57, -68.13),  # Rothera Station roadstead
        (-64.8, -64.0),    # Gerlache Strait / Bismarck Strait
        (-62.5, -58.0),    # Bransfield Strait oceanic passage
        (-58.0, -45.0),    # Scotia Sea deep channel
        (-54.28, -36.50)   # Grytviken roadstead
    ]
    profile = risk_grid_engine.get_route_bathymetry_profile(sample_route, draft_m=8.5)
    assert "min_depth_m" in profile
    assert "avg_depth_m" in profile
    assert "min_under_keel_clearance_m" in profile
    assert "is_safe" in profile
    assert profile["min_depth_m"] > 0
    assert profile["min_under_keel_clearance_m"] > 0
    assert len(profile["sampled_waypoints"]) > 0

def test_bathymetry_geojson_endpoint():
    """Verify bathymetric feature collection structure."""
    geojson = risk_grid_engine.get_bathymetry_geojson()
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) >= 4
    for feat in geojson["features"]:
        assert feat["type"] == "Feature"
        assert "depth_m" in feat["properties"]
        assert "zone_type" in feat["properties"]
