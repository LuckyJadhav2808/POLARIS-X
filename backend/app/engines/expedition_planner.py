"""
POLARIS-X Multi-Waypoint Scientific Mission Sequencing & Expedition Logistics Engine
Designed for National Centre for Polar and Ocean Research (NCPOR) & MoES Antarctic Expeditions.

Features:
1. Multi-station waypoint pathfinding with realistic station dwell times (cargo discharge, CTD casts).
2. Dynamic fuel bunker depletion tracking with hotel auxiliary consumption in roadsteads.
3. Emergency abort contingency vectors to nearest safe havens.
4. Pre-configured official expedition profiles (e.g. 44th Indian Antarctic Expedition).
"""

from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import numpy as np

from app.core.config import settings
from app.core.vessel_physics import get_vessel_spec, MGO_PRICE_PER_TON_USD, CO2_TONS_PER_TON_MGO
from app.engines.polar_route import polar_route_optimizer
from app.engines.risk_grid import risk_grid_engine, haversine_distance_nm
from app.engines.polaris_rio import evaluate_route_polaris_rio


class MissionWaypoint(BaseModel):
    name: str
    lat: float
    lon: float
    dwell_time_hours: float = Field(24.0, ge=0.0, description="Dwell / cargo discharge time at station")
    activity_type: str = Field(
        "STATION_SUPPLY",
        description="PORT_DEPARTURE | STATION_SUPPLY | CTD_MOORING_STATION | CREW_DISEMBARKATION | PORT_ARRIVAL"
    )
    notes: Optional[str] = None


class ExpeditionPlanRequest(BaseModel):
    mission_name: str = "44th Indian Antarctic Expedition (Maitri-Bharati Relief)"
    polar_class: str = "PC-5"
    departure_date_iso: str = "2021-03-01T08:00:00Z"
    initial_bunker_fuel_tons: float = Field(1800.0, ge=100.0, description="Total MGO fuel capacity onboard")
    safety_weight: float = Field(0.70, ge=0.0, le=1.0)
    fuel_weight: float = Field(0.30, ge=0.0, le=1.0)
    waypoints: List[MissionWaypoint]


# Sheltered maritime anchorages / stations designated as Safe Havens for polar abort
POLAR_SAFE_HAVENS = [
    {"name": "Grytviken / King Edward Cove (South Georgia)", "lat": -54.2833, "lon": -36.4833, "shelter": "Fjord Deep Anchorage"},
    {"name": "Rothera Roadstead / Biscoe Wharf", "lat": -67.5700, "lon": -68.1236, "shelter": "Protected Anchorage & Medical Facility"},
    {"name": "Signy Island / Factory Cove", "lat": -60.7000, "lon": -45.6000, "shelter": "Natural Island Harbor"},
    {"name": "Deception Island (Whalers Bay)", "lat": -63.0000, "lon": -60.7000, "shelter": "Enclosed Volcanic Caldera"},
    {"name": "Faraday / Vernadsky Marina", "lat": -65.2500, "lon": -64.2667, "shelter": "Pelagic Sound Anchorage"},
]


class ExpeditionLogisticsEngine:
    def __init__(self, route_optimizer=polar_route_optimizer):
        self.router = route_optimizer

    def compute_expedition_plan(self, req: ExpeditionPlanRequest) -> Dict[str, Any]:
        """
        Computes sequential multi-leg navigational tracks, timeline schedules,
        bunker depletion ledger, and emergency abort contingency routes across all mission legs.
        """
        if len(req.waypoints) < 2:
            raise ValueError("Expedition requires at least 2 sequential waypoints.")

        vessel = get_vessel_spec(req.polar_class)
        current_time = datetime.fromisoformat(req.departure_date_iso.replace("Z", "+00:00"))

        # Auxiliary hotel fuel burn when vessel is anchored/dwelling in roadsteads (tons/day)
        hotel_fuel_rate_tons_day = vessel.base_fuel_rate_tons_day * 0.12

        legs_data = []
        cumulative_distance_nm = 0.0
        cumulative_transit_hours = 0.0
        cumulative_dwell_hours = 0.0
        cumulative_fuel_tons = 0.0

        current_bunker_tons = req.initial_bunker_fuel_tons
        timeline_events = []

        # Departure event
        timeline_events.append({
            "event_type": "EXPEDITION_DEPARTURE",
            "waypoint_name": req.waypoints[0].name,
            "timestamp_iso": current_time.isoformat(),
            "remaining_fuel_tons": round(current_bunker_tons, 1),
            "remaining_fuel_pct": 100.0,
            "activity": req.waypoints[0].activity_type,
            "notes": f"Departing {req.waypoints[0].name} with full bunker capacity."
        })

        for i in range(len(req.waypoints) - 1):
            w_start = req.waypoints[i]
            w_dest = req.waypoints[i + 1]

            simulation_date_str = current_time.strftime("%Y-%m-%d")

            # 1. Compute optimal passage for this leg
            leg_result = self.router.find_route(
                start_lat=w_start.lat,
                start_lon=w_start.lon,
                dest_lat=w_dest.lat,
                dest_lon=w_dest.lon,
                polar_class=req.polar_class,
                safety_weight=req.safety_weight,
                fuel_weight=req.fuel_weight,
                simulation_date_iso=simulation_date_str
            )

            rec_metrics = leg_result["recommended_metrics"]
            transit_duration_hours = rec_metrics["eta_hours"]
            transit_distance_nm = rec_metrics["distance_nm"]

            # Propulsion fuel consumption for leg
            load_factor = max(0.8, rec_metrics["fuel_proxy_pct"] / 100.0)
            leg_transit_fuel_tons = round((transit_duration_hours / 24.0) * vessel.base_fuel_rate_tons_day * load_factor, 1)

            # Advance clock for transit
            current_time += timedelta(hours=transit_duration_hours)
            arrival_time_iso = current_time.isoformat()
            current_bunker_tons -= leg_transit_fuel_tons

            # Arrival event
            timeline_events.append({
                "event_type": "WAYPOINT_ARRIVAL",
                "waypoint_name": w_dest.name,
                "timestamp_iso": arrival_time_iso,
                "leg_number": i + 1,
                "distance_from_previous_nm": transit_distance_nm,
                "remaining_fuel_tons": round(current_bunker_tons, 1),
                "remaining_fuel_pct": round((current_bunker_tons / req.initial_bunker_fuel_tons) * 100.0, 1),
                "activity": w_dest.activity_type,
                "notes": f"Arrival at {w_dest.name} after {transit_duration_hours:.1f}h transit."
            })

            # Dwell duration at destination waypoint
            dwell_hours = w_dest.dwell_time_hours
            hotel_fuel_tons = round((dwell_hours / 24.0) * hotel_fuel_rate_tons_day, 1) if dwell_hours > 0 else 0.0
            current_bunker_tons -= hotel_fuel_tons

            # Dwell completion event if applicable
            if dwell_hours > 0:
                current_time += timedelta(hours=dwell_hours)
                departure_time_iso = current_time.isoformat()
                timeline_events.append({
                    "event_type": "WAYPOINT_DEPARTURE",
                    "waypoint_name": w_dest.name,
                    "timestamp_iso": departure_time_iso,
                    "dwell_hours": dwell_hours,
                    "hotel_fuel_burned_tons": hotel_fuel_tons,
                    "remaining_fuel_tons": round(current_bunker_tons, 1),
                    "remaining_fuel_pct": round((current_bunker_tons / req.initial_bunker_fuel_tons) * 100.0, 1),
                    "activity": w_dest.activity_type,
                    "notes": f"Completed {dwell_hours:.1f}h operational dwell at {w_dest.name}."
                })
            else:
                departure_time_iso = arrival_time_iso

            total_leg_fuel = round(leg_transit_fuel_tons + hotel_fuel_tons, 1)

            # 2. Compute Nearest Emergency Abort Safe Haven
            safe_haven = self._find_nearest_safe_haven(w_dest.lat, w_dest.lon)

            # Aggregate stats
            cumulative_distance_nm += transit_distance_nm
            cumulative_transit_hours += transit_duration_hours
            cumulative_dwell_hours += dwell_hours
            cumulative_fuel_tons += total_leg_fuel

            legs_data.append({
                "leg_number": i + 1,
                "leg_title": f"Leg {i + 1}: {w_start.name.split('/')[0]} ➔ {w_dest.name.split('/')[0]}",
                "origin": {"name": w_start.name, "lat": w_start.lat, "lon": w_start.lon},
                "destination": {"name": w_dest.name, "lat": w_dest.lat, "lon": w_dest.lon},
                "departure_time_iso": simulation_date_str + "T08:00:00Z",
                "arrival_time_iso": arrival_time_iso,
                "dwell_time_hours": dwell_hours,
                "transit_duration_hours": transit_duration_hours,
                "transit_distance_nm": transit_distance_nm,
                "transit_fuel_tons": leg_transit_fuel_tons,
                "hotel_fuel_tons": hotel_fuel_tons,
                "total_leg_fuel_tons": total_leg_fuel,
                "route_geojson": leg_result["recommended_route"],
                "rio_profile": leg_result.get("rio_profile"),
                "bathymetry": leg_result.get("bathymetry"),
                "metrics": rec_metrics,
                "contingency_safe_haven": safe_haven
            })

        # Calculate overall financial & carbon cost
        total_fuel_cost_usd = round(cumulative_fuel_tons * MGO_PRICE_PER_TON_USD, 2)
        total_co2_emitted_tons = round(cumulative_fuel_tons * CO2_TONS_PER_TON_MGO, 1)
        remaining_bunker_pct = round((current_bunker_tons / req.initial_bunker_fuel_tons) * 100.0, 1)

        bunker_status = "SAFE_RESERVE"
        if remaining_bunker_pct < 20.0:
            bunker_status = "CRITICAL_LOW_RESERVE"
        elif remaining_bunker_pct < 35.0:
            bunker_status = "CAUTION_RESERVE"

        return {
            "status": "EXPEDITION_PLANNED",
            "mission_name": req.mission_name,
            "vessel_profile": vessel.model_dump(),
            "polar_class": req.polar_class,
            "total_legs": len(legs_data),
            "departure_time_iso": req.departure_date_iso,
            "mission_completion_iso": current_time.isoformat(),
            "summary": {
                "total_distance_nm": round(cumulative_distance_nm, 1),
                "total_transit_days": round(cumulative_transit_hours / 24.0, 1),
                "total_dwell_days": round(cumulative_dwell_hours / 24.0, 1),
                "total_mission_days": round((cumulative_transit_hours + cumulative_dwell_hours) / 24.0, 1),
                "total_fuel_burned_tons": round(cumulative_fuel_tons, 1),
                "initial_bunker_tons": req.initial_bunker_fuel_tons,
                "remaining_bunker_tons": round(max(0.0, current_bunker_tons), 1),
                "remaining_bunker_pct": remaining_bunker_pct,
                "bunker_status": bunker_status,
                "total_fuel_cost_usd": total_fuel_cost_usd,
                "total_co2_tons": total_co2_emitted_tons
            },
            "legs": legs_data,
            "timeline": timeline_events
        }

    def _find_nearest_safe_haven(self, lat: float, lon: float) -> Dict[str, Any]:
        """Finds closest designated polar safe haven and computes escape track metrics."""
        best_haven = None
        min_dist = float("inf")

        for haven in POLAR_SAFE_HAVENS:
            dist = haversine_distance_nm(lat, lon, haven["lat"], haven["lon"])
            if dist < min_dist:
                min_dist = dist
                best_haven = haven

        return {
            "name": best_haven["name"],
            "lat": best_haven["lat"],
            "lon": best_haven["lon"],
            "shelter_type": best_haven["shelter"],
            "distance_nm": round(min_dist, 1),
            "estimated_escape_hours": round(min_dist / 14.0, 1),
            "emergency_fuel_reserve_tons": round((min_dist / 14.0 / 24.0) * 28.0, 1)
        }


# Global instance
expedition_engine = ExpeditionLogisticsEngine()


# Predefined scientific mission profiles for instant one-click demonstration
EXPEDITION_PRESETS = [
    {
        "id": "ncpor-44th-iae",
        "title": "44th Indian Antarctic Expedition (Maitri & Bharati Relief)",
        "description": "Annual MoES flagship expedition conducting personnel rotation, station resupply, and Prydz Bay oceanographic moorings.",
        "polar_class": "PC-5",
        "departure_date": "2021-03-01T08:00:00Z",
        "initial_bunker_fuel_tons": 1800.0,
        "waypoints": [
            {"name": "Grytviken / South Georgia", "lat": -54.2833, "lon": -36.4833, "dwell_time_hours": 0.0, "activity_type": "PORT_DEPARTURE", "notes": "Final polar staging roadstead"},
            {"name": "Maitri Station (India)", "lat": -70.7667, "lon": 11.7333, "dwell_time_hours": 72.0, "activity_type": "STATION_SUPPLY", "notes": "Heavy cargo & aviation turbine fuel discharge via ice shelf"},
            {"name": "Mawson Station (Australia)", "lat": -67.6033, "lon": 62.8733, "dwell_time_hours": 12.0, "activity_type": "CTD_MOORING_STATION", "notes": "Enderby Basin hydrographic CTD section"},
            {"name": "Bharati Station (India)", "lat": -69.4075, "lon": 76.1872, "dwell_time_hours": 60.0, "activity_type": "STATION_SUPPLY", "notes": "Prydz Bay research handover and personnel changeover"}
        ]
    },
    {
        "id": "peninsula-weddell-corridor",
        "title": "Weddell Sea Paleoclimate & Iceberg Alley Research Cruise",
        "description": "Multi-site transect sampling iceberg fragmentation corridors, Bransfield deep trenches, and Larsen continental margins.",
        "polar_class": "PC-2",
        "departure_date": "2021-03-10T08:00:00Z",
        "initial_bunker_fuel_tons": 2400.0,
        "waypoints": [
            {"name": "Rothera Station", "lat": -67.5700, "lon": -68.1236, "dwell_time_hours": 0.0, "activity_type": "PORT_DEPARTURE", "notes": "Adelaide Island science departure"},
            {"name": "Faraday / Vernadsky", "lat": -65.2500, "lon": -64.2667, "dwell_time_hours": 24.0, "activity_type": "CTD_MOORING_STATION", "notes": "Pelagic geomagnetic and ozone observation drop"},
            {"name": "Deception Island", "lat": -63.0000, "lon": -60.7000, "dwell_time_hours": 18.0, "activity_type": "STATION_SUPPLY", "notes": "Volcanic hydrothermal plume sampling"},
            {"name": "Signy Island", "lat": -60.7000, "lon": -45.6000, "dwell_time_hours": 24.0, "activity_type": "STATION_SUPPLY", "notes": "Marine biological benthic survey"},
            {"name": "Grytviken / South Georgia", "lat": -54.2833, "lon": -36.4833, "dwell_time_hours": 0.0, "activity_type": "PORT_ARRIVAL", "notes": "Expedition completion port"}
        ]
    }
]
