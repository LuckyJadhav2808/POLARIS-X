"""
Test Suite for POLARIS-X Data Loaders
"""
import pytest
from app.data.loaders import dataset_loader, julian_to_iso_date, iso_to_julian

def test_julian_conversions():
    # 2021 Day 74 = March 15, 2021
    iso = julian_to_iso_date(2021074)
    assert iso == "2021-03-15"
    julian = iso_to_julian("2021-03-15")
    assert julian == 2021074

def test_load_nic_dimensions():
    dims = dataset_loader.load_nic_dimensions()
    assert len(dims) > 0
    # Verify prominent icebergs exist
    assert "A23A" in dims or "A68A" in dims

def test_load_iceberg_kinematics():
    tracks = dataset_loader.load_iceberg_kinematics()
    assert len(tracks) > 0
    assert "A68A" in tracks or "A23A" in tracks
    if "A68A" in tracks:
        df = tracks["A68A"]
        assert len(df) > 100
        assert "lat" in df.columns
        assert "lon" in df.columns
        assert "disp" in df.columns

def test_get_active_icebergs():
    active = dataset_loader.get_active_icebergs_for_date("2021-03-15")
    assert len(active) > 0
    a68a_list = [a for a in active if a.iceberg_id == "A68A"]
    if a68a_list:
        a68a = a68a_list[0]
        assert -70.0 <= a68a.lat <= -50.0
        assert -70.0 <= a68a.lon <= -30.0

def test_load_surface_meteorology():
    stations = dataset_loader.load_surface_meteorology()
    assert len(stations) >= 4
    assert "ROTHERA" in stations
    assert "GRYTVIKEN" in stations
    rothera_readings = stations["ROTHERA"]
    assert len(rothera_readings) > 1000

def test_load_sea_ice_climatology():
    means = dataset_loader.load_sea_ice_climatology()
    assert len(means) == 12
    # February is summer minimum (~2-3M sq km), September is winter maximum (~18-19M sq km)
    assert means[2] < means[9]
