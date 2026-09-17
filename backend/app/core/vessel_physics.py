"""
POLARIS-X Vessel Models & Marine Physics Engine
Implements IACS Polar Class specifications, non-linear speed degradation,
and cubic fuel consumption proxy models.
"""
from typing import Dict
from pydantic import BaseModel, Field

class VesselSpec(BaseModel):
    name: str
    polar_class: str
    description: str
    cruising_speed_knots: float
    max_safe_ice_conc: float  # 0.0 - 1.0 (e.g. 0.70 for 70%)
    hull_resistance_coeff: float  # K_hull
    engine_power_kw: float
    base_fuel_rate_tons_day: float
    risk_multiplier: float

# Standard IACS & Indian Antarctic Program fleet models
VESSEL_PROFILES: Dict[str, VesselSpec] = {
    "PC-5": VesselSpec(
        name="MV Vasiliy Golovnin (Research PRV)",
        polar_class="PC-5 / Arc5",
        description="Standard Polar Research Vessel deployed on Indian Antarctic Expeditions (NCPOR).",
        cruising_speed_knots=14.0,
        max_safe_ice_conc=0.70,
        hull_resistance_coeff=1.8,
        engine_power_kw=12500.0,
        base_fuel_rate_tons_day=28.0,
        risk_multiplier=1.0,
    ),
    "PC-2": VesselSpec(
        name="Heavy Polar Icebreaker (PC-2)",
        polar_class="PC-2 / Icebreaker",
        description="Heavy icebreaker capable of cleaving multi-year polar pack ice.",
        cruising_speed_knots=16.5,
        max_safe_ice_conc=1.00,
        hull_resistance_coeff=1.0,
        engine_power_kw=36000.0,
        base_fuel_rate_tons_day=65.0,
        risk_multiplier=0.55,
    ),
    "Non-Ice": VesselSpec(
        name="Commercial Cargo / Support (Non-Ice)",
        polar_class="Non-Ice Class",
        description="Standard commercial cargo hull restricted to open water or very light floes (<15%).",
        cruising_speed_knots=12.0,
        max_safe_ice_conc=0.15,
        hull_resistance_coeff=4.5,
        engine_power_kw=8000.0,
        base_fuel_rate_tons_day=20.0,
        risk_multiplier=2.8,
    )
}

def get_vessel_spec(polar_class: str = "PC-5") -> VesselSpec:
    """Retrieve vessel profile or default to PC-5 Research PRV."""
    return VESSEL_PROFILES.get(polar_class, VESSEL_PROFILES["PC-5"])

def calculate_effective_speed(
    cruising_speed: float,
    ice_risk: float,
    weather_risk: float,
    hull_resistance: float
) -> float:
    """
    Calculate degraded speed through ice concentration and weather impedance.
    Speed cannot drop below 20% of cruising speed unless trapped.
    """
    # Non-linear ice drag penalty
    ice_factor = max(0.20, 1.0 - hull_resistance * (ice_risk ** 1.8))
    # Meteorological weather impedance penalty (wind, waves, spray icing)
    weather_factor = max(0.40, 1.0 - 0.25 * weather_risk)
    
    return float(cruising_speed * ice_factor * weather_factor)

def calculate_segment_fuel_proxy(
    effective_speed: float,
    cruising_speed: float,
    ice_risk: float,
    hull_resistance: float,
    duration_hours: float
) -> float:
    """
    Calculate fuel consumed over a segment using cubic power curve plus ice resistance.
    """
    if cruising_speed <= 0 or duration_hours <= 0:
        return 0.0
    
    speed_ratio = effective_speed / cruising_speed
    cubic_power = speed_ratio ** 3.0
    ice_resistance_multiplier = 1.0 + (hull_resistance * ice_risk)
    
    # Normalized fuel consumption units
    return float(duration_hours * cubic_power * ice_resistance_multiplier)
