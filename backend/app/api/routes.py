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
from app.services.xai import xai_service

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

@router.get("/layers", tags=["Geospatial Data"])
def get_operational_layers(
    simulation_date: str = Query("2021-03-15", description="ISO simulation date YYYY-MM-DD")
):
    """
    Returns unified operational GeoJSON layers:
    - Active Icebergs (Points with velocity, dimensions, and buffer metadata)
    - BAS Weather Stations (Points with live synoptic telemetry)
    - Stations / Waypoints
    """
    # 1. Icebergs
    active_icebergs = dataset_loader.get_active_icebergs_for_date(simulation_date)
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
        "vessel_profile": result["vessel_profile"],
        "xai": xai_output
    }

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
        "vessel_profile": surge_result["vessel_profile"],
        "xai": xai_output
    }
