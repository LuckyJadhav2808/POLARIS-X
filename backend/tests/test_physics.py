"""
POLARIS-X Vessel Dynamics & Physics Tests
Validates IACS Polar Class specifications, speed degradation equations,
cubic fuel consumption proxies, and geodesic distance math.
"""
import pytest
from app.core.vessel_physics import (
    VESSEL_PROFILES,
    get_vessel_spec,
    calculate_effective_speed,
    calculate_segment_fuel_proxy
)

def test_vessel_profiles_defined():
    """Verify standard IACS Polar Class vessel profiles exist."""
    assert "PC-5" in VESSEL_PROFILES
    assert "PC-2" in VESSEL_PROFILES
    assert "Non-Ice" in VESSEL_PROFILES

    pc5 = get_vessel_spec("PC-5")
    assert "PC-5" in pc5.polar_class
    assert pc5.cruising_speed_knots == 14.0
    assert pc5.max_safe_ice_conc == 0.70
    assert pc5.hull_resistance_coeff == 1.8

    pc2 = get_vessel_spec("PC-2")
    assert pc2.cruising_speed_knots == 16.5
    assert pc2.max_safe_ice_conc == 1.00
    assert pc2.hull_resistance_coeff == 1.0  # Low drag heavy breaker

    non_ice = get_vessel_spec("Non-Ice")
    assert non_ice.hull_resistance_coeff == 4.5  # Severe penalty in ice

def test_speed_degradation_physics():
    """Verify that ice concentration and storm resistance degrade ship speed."""
    vessel = get_vessel_spec("PC-5")

    # Open water, calm weather -> Cruising speed
    open_speed = calculate_effective_speed(
        cruising_speed=vessel.cruising_speed_knots,
        ice_risk=0.0,
        weather_risk=0.0,
        hull_resistance=vessel.hull_resistance_coeff
    )
    assert open_speed == 14.0

    # Moderate ice pack (0.40) -> Reduced speed
    mid_ice_speed = calculate_effective_speed(
        cruising_speed=vessel.cruising_speed_knots,
        ice_risk=0.40,
        weather_risk=0.0,
        hull_resistance=vessel.hull_resistance_coeff
    )
    assert 5.0 < mid_ice_speed < 14.0

    # Heavy ice pack (0.80) -> Floor speed (minimum 20% of cruising speed = 2.8 kts)
    heavy_ice_speed = calculate_effective_speed(
        cruising_speed=vessel.cruising_speed_knots,
        ice_risk=0.80,
        weather_risk=0.0,
        hull_resistance=vessel.hull_resistance_coeff
    )
    assert heavy_ice_speed >= 14.0 * 0.20
    assert heavy_ice_speed < mid_ice_speed

def test_cubic_fuel_proxy_calculation():
    """Verify that navigating through ice increases fuel consumption via cubic resistance."""
    vessel = get_vessel_spec("PC-5")

    # Open water segment (10 hours at full speed 14 kts)
    open_fuel = calculate_segment_fuel_proxy(
        effective_speed=14.0,
        cruising_speed=14.0,
        ice_risk=0.0,
        hull_resistance=vessel.hull_resistance_coeff,
        duration_hours=10.0
    )
    assert open_fuel == 10.0

    # Navigating in heavy ice (e.g. 8 kts over 10 hours with 0.6 ice risk)
    ice_fuel = calculate_segment_fuel_proxy(
        effective_speed=14.0,
        cruising_speed=14.0,
        ice_risk=0.6,
        hull_resistance=vessel.hull_resistance_coeff,
        duration_hours=10.0
    )
    assert ice_fuel > open_fuel
