"""
Tests for Dataset #1: BYU Antarctic Iceberg Consolidated Database v8.0 Ingestion
Validates multi-sensor fallback parsing, on-the-fly kinematics, 647-iceberg catalog,
and API layer endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.data.loaders import dataset_loader, haversine_km, forward_azimuth_deg

client = TestClient(app)

def test_haversine_and_azimuth_geometry():
    """Verify Great-Circle displacement and initial azimuth bearing calculations."""
    # Move ~1 degree North along meridian
    km = haversine_km(-65.0, -60.0, -64.0, -60.0)
    assert 110.0 < km < 112.0
    az = forward_azimuth_deg(-65.0, -60.0, -64.0, -60.0)
    assert abs(az - 0.0) < 0.1 or abs(az - 360.0) < 0.1

    # Move East along latitude
    az_east = forward_azimuth_deg(-65.0, -60.0, -65.0, -59.0)
    assert 85.0 < az_east < 95.0

def test_iceberg_catalog_v8():
    """Verify catalog metadata extraction of 647 icebergs across Antarctic sectors."""
    catalog = dataset_loader.get_iceberg_catalog()
    assert len(catalog) == 647
    
    # Check sectors present
    sectors = {item["sector"] for item in catalog}
    assert "A" in sectors  # Weddell / Bellingshausen
    assert "B" in sectors  # Ross Sea / Amundsen
    assert "C" in sectors  # Wilkes Land
    assert "D" in sectors  # Queen Maud Land

    # Verify famous mega-icebergs are in the catalog
    catalog_ids = {item["iceberg_id"] for item in catalog}
    assert "A68A" in catalog_ids
    assert "A23A" in catalog_ids
    assert "B09D" in catalog_ids

def test_load_consolidated_v8_tracks():
    """Verify multi-sensor extraction and on-the-fly kinematics on target icebergs."""
    v8_tracks = dataset_loader.load_consolidated_v8_tracks(target_icebergs=["a68a", "a23a", "b09d"])
    assert "A68A" in v8_tracks
    assert "A23A" in v8_tracks
    assert "B09D" in v8_tracks

    df_a68a = v8_tracks["A68A"]
    assert not df_a68a.empty
    assert "date" in df_a68a.columns
    assert "lat" in df_a68a.columns
    assert "lon" in df_a68a.columns
    assert "sensor" in df_a68a.columns
    assert "disp" in df_a68a.columns
    assert "vel_angle" in df_a68a.columns

    # Verify sensor fallback populated sensor column (e.g. ascat or nic)
    sensors_used = df_a68a["sensor"].unique().tolist()
    assert len(sensors_used) > 0
    assert any(s in sensors_used for s in ["ascat", "nic", "qscat"])

    # Displacements should be non-negative and realistic
    assert (df_a68a["disp"] >= 0).all()
    assert (df_a68a["vel_angle"] >= 0).all()
    assert (df_a68a["vel_angle"] <= 360).all()

def test_get_active_icebergs_v8_vs_v7():
    """Verify snapshot retrieval with both v8.0 and v7.1 database sources."""
    # V8.0
    v8_bergs = dataset_loader.get_active_icebergs_for_date("2021-03-15", db_source="v8.0")
    assert len(v8_bergs) > 0
    v8_ids = {b.iceberg_id for b in v8_bergs}
    assert "A23A" in v8_ids
    assert "A68A" in v8_ids
    # V8 source tag should indicate multi-sensor consolidated origin
    assert any("byu_consolidated_v8" in b.source for b in v8_bergs)

    # V7.1 backwards compatibility
    v7_bergs = dataset_loader.get_active_icebergs_for_date("2021-03-15", db_source="v7.1")
    assert len(v7_bergs) > 0
    assert any("byu_stats" in b.source for b in v7_bergs)

def test_api_layers_iceberg_catalog_endpoint():
    """Test GET /api/layers/iceberg-catalog returns complete 647 inventory."""
    res = client.get("/api/layers/iceberg-catalog")
    assert res.status_code == 200
    data = res.json()
    assert data["total_icebergs"] == 647
    assert "v8.0" in data["database_version"]
    assert "sectors" in data
    assert len(data["catalog"]) == 647

def test_api_layers_with_v8_db_source():
    """Test GET /api/layers with db_source=v8.0 parameter."""
    res = client.get("/api/layers?simulation_date=2021-03-15&db_source=v8.0")
    assert res.status_code == 200
    data = res.json()
    assert "icebergs" in data
    features = data["icebergs"]["features"]
    assert len(features) > 0
    
    first_prop = features[0]["properties"]
    assert "iceberg_id" in first_prop
    assert "source" in first_prop
    assert "lat" in first_prop
    assert "lon" in first_prop

def test_nic_bulletin_stats_and_history():
    """Verify parsing of all 111 NIC bulletins and extraction of multi-year iceberg history."""
    stats = dataset_loader.get_nic_bulletin_stats()
    assert stats["total_bulletins"] == 111
    assert stats["distinct_icebergs_tracked"] >= 80
    assert stats["total_weekly_observations"] > 500
    assert "2019" in stats["temporal_range"]["start"]
    assert "2022" in stats["temporal_range"]["end"]

    # Test A23A history
    history_a23a = dataset_loader.load_nic_history("A23A")["A23A"]
    assert len(history_a23a) == 111
    assert history_a23a[0]["date"] == "2019-08-16"
    assert history_a23a[0]["status"] == "grounded"
    assert history_a23a[-1]["status"] == "drifting"

    # Test A68A history (calving and melting)
    history_a68a = dataset_loader.load_nic_history("A68A")["A68A"]
    assert len(history_a68a) > 30
    assert history_a68a[0]["length_nm"] > history_a68a[-1]["length_nm"]

def test_api_nic_endpoints():
    """Test GET /api/layers/bulletin-summary and GET /api/layers/iceberg-history."""
    res_sum = client.get("/api/layers/bulletin-summary")
    assert res_sum.status_code == 200
    data_sum = res_sum.json()
    assert data_sum["total_bulletins"] == 111
    assert data_sum["distinct_icebergs_tracked"] >= 80

    res_hist = client.get("/api/layers/iceberg-history?iceberg_id=A23A")
    assert res_hist.status_code == 200
    data_hist = res_hist.json()
    assert data_hist["iceberg_id"] == "A23A"
    assert data_hist["total_weekly_records"] == 111
    assert len(data_hist["history"]) == 111

