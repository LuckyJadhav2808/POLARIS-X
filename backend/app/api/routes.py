"""
POLARIS-X High-Performance REST API Endpoints
Provides route calculation, layer data (icebergs, stations, weather),
simulation rerouting, and system telemetry for the Antarctic decision cockpit.
"""
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.vessel_physics import VESSEL_PROFILES, get_vessel_spec
from app.data.loaders import dataset_loader
from app.engines.polar_route import polar_route_optimizer
from app.engines.risk_grid import risk_grid_engine
from app.engines.polaris_rio import (
    IMO_POLARIS_RISK_VALUES,
    IceRegimeTenths,
    calculate_rio_for_regime
)
from app.engines.expedition_planner import (
    expedition_engine,
    EXPEDITION_PRESETS,
    ExpeditionPlanRequest
)
from app.services.xai import xai_service
from app.services.copilot import copilot_service

router = APIRouter()

class RouteRequest(BaseModel):
    start_station: Optional[str] = "Rothera Station"
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    dest_station: Optional[str] = "Grytviken / South Georgia"
    dest_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    polar_class: str = Field("PC-5", description="IACS vessel class: PC-5, PC-2, Non-Ice")
    safety_weight: float = Field(0.70, ge=0.0, le=1.0, description="Navigational safety weight")
    fuel_weight: float = Field(0.30, ge=0.0, le=1.0, description="Fuel conservation weight")
    simulation_date: str = Field("2021-03-15", description="ISO simulation date YYYY-MM-DD")
    surge_berg_id: Optional[str] = None
    surge_speed_multiplier: float = 1.0
    surge_heading_deg: Optional[float] = None

class SurgeRerouteRequest(BaseModel):
    surge_berg_id: str = "A68A"
    speed_multiplier: float = 3.5
    heading_deg: float = 65.0
    start_station: str = "Rothera Station"
    dest_station: str = "Grytviken / South Georgia"
    polar_class: str = "PC-5"
    simulation_date: str = "2021-03-15"

@router.get("/health", tags=["System"])
def health_check():
    """System health & readiness check."""
    return {
        "status": "HEALTHY",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "corridor": "Antarctic Peninsula & Weddell Sea",
        "bounds": {
            "min_lat": settings.MIN_LAT,
            "max_lat": settings.MAX_LAT,
            "min_lon": settings.MIN_LON,
            "max_lon": settings.MAX_LON
        }
    }

@router.get("/vessels", tags=["Fleet"])
def get_vessel_fleet():
    """Returns supported IACS polar class vessel specifications."""
    return {
        "vessels": [v.model_dump() for v in VESSEL_PROFILES.values()]
    }

@router.get("/stations", tags=["Geography"])
def get_stations():
    """Returns predefined Antarctic research stations and operational base coordinates."""
    station_list = []
    for name, coords in settings.STATIONS.items():
        station_list.append({
            "name": name,
            "lat": coords[0],
            "lon": coords[1]
        })
    return {"stations": station_list}

@router.get("/layers/iceberg-catalog", tags=["Geospatial Data"])
def get_iceberg_catalog():
    """
    Returns full metadata catalog for all 647 Antarctic icebergs tracked in BYU Consolidated Database v8.0.
    Categorized by quadrant sector (A = Weddell/Bellingshausen, B = Ross Sea/Amundsen, C = Wilkes Land, D = Queen Maud Land).
    """
    catalog = dataset_loader.get_iceberg_catalog()
    return {
        "total_icebergs": len(catalog),
        "database_version": "v8.0 (BYU Consolidated Multi-Sensor Radar)",
        "sectors": {
            "A": "Bellingshausen / Weddell Sea (0°W - 90°W)",
            "B": "Amundsen / Ross Sea (90°W - 180°)",
            "C": "Wilkes Land / East Antarctica (90°E - 180°)",
            "D": "Queen Maud Land / Davis Sea (0°E - 90°E)",
            "U": "Sub-Antarctic / Unnamed Series"
        },
        "catalog": catalog
    }

@router.get("/layers/bulletin-summary", tags=["Geospatial Data"])
def get_bulletin_summary():
    """Returns metadata summary of the 111 weekly National Ice Center (NIC) bulletins (2019-2022)."""
    return dataset_loader.get_nic_bulletin_stats()

@router.get("/layers/iceberg-history", tags=["Geospatial Data"])
def get_iceberg_dimension_history(
    iceberg_id: str = Query("A23A", description="Iceberg identifier (e.g. A23A, A68A, A64, B09B)")
):
    """
    Returns 3-year chronological evolution history of dimensions, area, and grounded/drifting status
    across all 111 weekly National Ice Center bulletins.
    """
    history_map = dataset_loader.load_nic_history(target_iceberg=iceberg_id)
    records = history_map.get(iceberg_id.strip().upper(), [])
    return {
        "iceberg_id": iceberg_id.strip().upper(),
        "total_weekly_records": len(records),
        "history": records
    }

@router.get("/layers/bathymetry", tags=["Geospatial Data"])
def get_bathymetric_features():
    """
    Returns Antarctic seafloor bathymetry features from IBCSO / GEBCO models:
    deep ocean channels, continental shelf breaks, and hazardous shallow reefs/shoals.
    """
    return risk_grid_engine.get_bathymetry_geojson()


@router.get("/layers", tags=["Geospatial Data"])
def get_operational_layers(
    simulation_date: str = Query("2021-03-15", description="ISO simulation date YYYY-MM-DD"),
    db_source: str = Query("v8.0", description="Iceberg database: 'v8.0' (Consolidated multi-sensor) or 'v7.1' (Legacy stats)")
):
    """
    Returns unified operational GeoJSON layers:
    - Active Icebergs (Points with velocity, dimensions, and buffer metadata)
    - BAS Weather Stations (Points with live synoptic telemetry)
    - Stations / Waypoints
    """
    # 1. Icebergs
    active_icebergs = dataset_loader.get_active_icebergs_for_date(simulation_date, db_source=db_source)
    berg_features = []
    for b in active_icebergs:
        berg_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(b.lon, 4), round(b.lat, 4)]
            },
            "properties": b.to_dict()
        })
    
    icebergs_geojson = {
        "type": "FeatureCollection",
        "features": berg_features
    }

    # 2. Weather Stations
    station_readings = dataset_loader.get_station_weather_snapshot(simulation_date)
    weather_features = []
    for w in station_readings:
        weather_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(w.lon, 4), round(w.lat, 4)]
            },
            "properties": w.to_dict()
        })
    
    weather_geojson = {
        "type": "FeatureCollection",
        "features": weather_features
    }

    # 3. Base Reference Stations
    station_features = []
    for name, coords in settings.STATIONS.items():
        station_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [coords[1], coords[0]]
            },
            "properties": {
                "name": name,
                "lat": coords[0],
                "lon": coords[1]
            }
        })

    stations_geojson = {
        "type": "FeatureCollection",
        "features": station_features
    }

    return {
        "simulation_date": simulation_date,
        "icebergs": icebergs_geojson,
        "weather_stations": weather_geojson,
        "stations": stations_geojson
    }

@router.post("/route", tags=["Routing Engine"])
def compute_route(req: RouteRequest):
    """
    Compute optimal risk-weighted passage vs direct track.
    Returns GeoJSON routes, metrics, and XAI natural language explanation.
    """
    # Resolve start coordinates
    if req.start_lat is not None and req.start_lon is not None:
        start_lat, start_lon = req.start_lat, req.start_lon
        start_name = f"Custom ({start_lat:.2f}, {start_lon:.2f})"
    elif req.start_station and req.start_station in settings.STATIONS:
        start_lat, start_lon = settings.STATIONS[req.start_station]
        start_name = req.start_station
    else:
        start_lat, start_lon = settings.STATIONS["Rothera Station"]
        start_name = "Rothera Station"

    # Resolve destination coordinates
    if req.dest_lat is not None and req.dest_lon is not None:
        dest_lat, dest_lon = req.dest_lat, req.dest_lon
        dest_name = f"Custom ({dest_lat:.2f}, {dest_lon:.2f})"
    elif req.dest_station and req.dest_station in settings.STATIONS:
        dest_lat, dest_lon = settings.STATIONS[req.dest_station]
        dest_name = req.dest_station
    else:
        dest_lat, dest_lon = settings.STATIONS["Grytviken / South Georgia"]
        dest_name = "Grytviken / South Georgia"

    # Run pathfinding
    result = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class=req.polar_class,
        safety_weight=req.safety_weight,
        fuel_weight=req.fuel_weight,
        simulation_date_iso=req.simulation_date,
        surge_berg_id=req.surge_berg_id,
        surge_speed_multiplier=req.surge_speed_multiplier,
        surge_heading_deg=req.surge_heading_deg
    )

    # Active icebergs for XAI context
    active_icebergs = dataset_loader.get_active_icebergs_for_date(req.simulation_date)
    berg_names = [b.iceberg_id for b in active_icebergs]

    # Generate XAI explanation
    xai_output = xai_service.generate_explanation(
        rec_metrics=result["recommended_metrics"],
        direct_metrics=result["direct_metrics"],
        start_name=start_name,
        dest_name=dest_name,
        vessel_name=result["vessel_profile"]["name"],
        active_berg_names=berg_names
    )

    return {
        "status": "SUCCESS",
        "request": {
            "start": {"name": start_name, "lat": start_lat, "lon": start_lon},
            "destination": {"name": dest_name, "lat": dest_lat, "lon": dest_lon},
            "polar_class": req.polar_class,
            "safety_weight": req.safety_weight,
            "fuel_weight": req.fuel_weight,
            "simulation_date": req.simulation_date
        },
        "recommended_route": result["recommended_route"],
        "recommended_metrics": result["recommended_metrics"],
        "direct_route": result["direct_route"],
        "direct_metrics": result["direct_metrics"],
        "esg_ledger": result.get("esg_ledger"),
        "bathymetry": result.get("bathymetry"),
        "direct_bathymetry": result.get("direct_bathymetry"),
        "rio_profile": result.get("rio_profile"),
        "direct_rio_profile": result.get("direct_rio_profile"),
        "vessel_profile": result["vessel_profile"],
        "xai": xai_output
    }

@router.get("/polaris/rio-matrix", tags=["IMO POLARIS Regulatory"])
def get_polaris_risk_value_matrix():
    """
    Returns official IMO MSC.1/Circ.1519 Table 1 Risk Value (RV) matrix
    for all 8 Polar Classes and all ice regime types.
    """
    return {
        "standard": "IMO MSC.1/Circ.1519 (POLARIS System)",
        "formula": "RIO = SUM( C_i * RV_i )",
        "thresholds": {
            "normal_operation": {"min_rio": 0, "status": "AUTHORIZED", "color": "#10B981"},
            "elevated_risk": {"min_rio": -10, "max_rio": -1, "status": "SPEED_RESTRICTED_ESCORT", "color": "#F59E0B"},
            "operation_prohibited": {"max_rio": -11, "status": "ILLEGAL_UNDER_SOLAS_XIV", "color": "#EF4444"}
        },
        "risk_value_table": IMO_POLARIS_RISK_VALUES
    }

class EvaluateRegimeRequest(BaseModel):
    polar_class: str = "PC-5"
    regime: IceRegimeTenths

@router.post("/polaris/evaluate-regime", tags=["IMO POLARIS Regulatory"])
def evaluate_custom_ice_regime(req: EvaluateRegimeRequest):
    """
    Evaluates exact IMO POLARIS RIO for a user-specified ice regime composition.
    """
    return calculate_rio_for_regime(req.regime, polar_class=req.polar_class)

@router.post("/simulate-reroute", tags=["Dynamic Simulation"])
def trigger_surge_reroute(req: SurgeRerouteRequest):
    """
    Simulate sudden iceberg drift surge (e.g. A68A breaking free in storm)
    and dynamically recompute the avoidance corridor with proactive warnings.
    """
    # Resolve start & dest coordinates
    start_lat, start_lon = settings.STATIONS.get(req.start_station, settings.STATIONS["Rothera Station"])
    dest_lat, dest_lon = settings.STATIONS.get(req.dest_station, settings.STATIONS["Grytviken / South Georgia"])

    # 1. Baseline Route (Normal conditions)
    baseline_result = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class=req.polar_class,
        simulation_date_iso=req.simulation_date
    )

    # 2. Dynamic Reroute (Surge conditions)
    surge_result = polar_route_optimizer.find_route(
        start_lat=start_lat,
        start_lon=start_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        polar_class=req.polar_class,
        simulation_date_iso=req.simulation_date,
        surge_berg_id=req.surge_berg_id,
        surge_speed_multiplier=req.speed_multiplier,
        surge_heading_deg=req.heading_deg
    )

    # 3. Generate Surge XAI Explanation
    xai_output = xai_service.generate_explanation(
        rec_metrics=surge_result["recommended_metrics"],
        direct_metrics=surge_result["direct_metrics"],
        start_name=req.start_station,
        dest_name=req.dest_station,
        vessel_name=surge_result["vessel_profile"]["name"],
        active_berg_names=[req.surge_berg_id]
    )

    return {
        "status": "SURGE_ACTIVE",
        "alert": {
            "severity": "CRITICAL_WARNING",
            "title": f"Dynamic Drift Surge Detected: Iceberg {req.surge_berg_id}",
            "message": (
                f"Iceberg {req.surge_berg_id} has accelerated by {req.speed_multiplier}x along heading {req.heading_deg}°. "
                f"Initial passage corridor is now compromised. POLARIS-X has computed an evasive northern bypass route."
            ),
            "timestamp": req.simulation_date + "T06:00:00Z"
        },
        "baseline_route": baseline_result["recommended_route"],
        "baseline_metrics": baseline_result["recommended_metrics"],
        "rerouted_route": surge_result["recommended_route"],
        "rerouted_metrics": surge_result["recommended_metrics"],
        "esg_ledger": surge_result.get("esg_ledger"),
        "bathymetry": surge_result.get("bathymetry"),
        "baseline_bathymetry": baseline_result.get("bathymetry"),
        "rio_profile": surge_result.get("rio_profile"),
        "baseline_rio_profile": baseline_result.get("rio_profile"),
        "vessel_profile": surge_result["vessel_profile"],
        "xai": xai_output
    }


# ============================================================================
# MULTI-WAYPOINT SCIENTIFIC MISSION SEQUENCING (EXPEDITION LOGISTICS PLANNER)
# ============================================================================

@router.get("/expedition/presets", tags=["Expedition Logistics"])
def get_expedition_presets():
    """Returns curated Antarctic multi-leg scientific mission expedition templates (e.g. 44th IAE)."""
    return {
        "presets": EXPEDITION_PRESETS
    }


@router.post("/expedition/plan", tags=["Expedition Logistics"])
def plan_expedition(req: ExpeditionPlanRequest):
    """
    Computes sequential multi-leg navigational routes across all waypoints,
    station dwell scheduling, cumulative fuel bunker depletion ledger (including hotel roadstead load),
    and dynamic emergency abort contingency vectors to nearest safe havens.
    """
    try:
        plan = expedition_engine.compute_expedition_plan(req)
        return plan
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Expedition planning failed: {str(e)}"
        )


# ============================================================================
# VOICE-ASSISTED BRIDGE OFFICER AI ("POLARIS COPILOT")
# ============================================================================

class CopilotQueryRequest(BaseModel):
    query: Optional[str] = None
    transcript: Optional[str] = None
    vessel_class: Optional[str] = None
    active_polar_class: Optional[str] = None
    start_station: Optional[str] = "Rothera Station"
    dest_station: Optional[str] = "Grytviken / South Georgia"
    simulation_date: Optional[str] = "2021-03-15"
    route_metrics: Optional[Dict[str, Any]] = None
    rio_profile: Optional[Dict[str, Any]] = None
    bathymetry: Optional[Dict[str, Any]] = None
    expedition_plan: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None


@router.post("/copilot/query", tags=["Bridge Officer AI"])
def query_copilot(req: CopilotQueryRequest):
    """
    Translates tactical bridge voice queries into maritime operational responses,
    spoken officer feedback, and direct cockpit command execution payloads.
    """
    user_query = req.query or req.transcript or ""
    v_class = (
        req.vessel_class 
        or req.active_polar_class 
        or (req.context.get("active_polar_class") if req.context else "PC-5") 
        or "PC-5"
    )

    ctx = req.context or {}
    b_profile = req.bathymetry or ({
        "min_under_keel_clearance_m": ctx.get("min_ukc_meters"),
        "is_safe": ctx.get("safe_margin_verified")
    } if "min_ukc_meters" in ctx else None)
    
    r_profile = req.rio_profile or ({
        "overall_status": ctx.get("rio_status"),
        "min_rio": ctx.get("min_rio")
    } if "rio_status" in ctx else None)
    
    r_metrics = req.route_metrics or ({
        "distance_nm": ctx.get("total_distance_nm"),
        "fuel_proxy_pct": ctx.get("total_fuel_tons"),
        "eta_hours": ctx.get("estimated_transit_hours")
    } if "total_distance_nm" in ctx else None)

    sim_date = req.simulation_date or (ctx.get("simulation_date") if ctx else None) or "2021-03-15"
    start_stn = req.start_station or (ctx.get("start_station") if ctx else None) or "Rothera Station"
    dest_stn = req.dest_station or (ctx.get("dest_station") if ctx else None) or "Grytviken / South Georgia"

    return copilot_service.process_query(
        query=user_query,
        vessel_class=v_class,
        start_station=start_stn,
        dest_station=dest_stn,
        simulation_date=sim_date,
        route_metrics=r_metrics,
        rio_profile=r_profile,
        bathymetry=b_profile,
        expedition_plan=req.expedition_plan
    )


