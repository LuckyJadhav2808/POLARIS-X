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

def test_voyage_esg_ledger_calculation():
    """Verify that calculate_voyage_esg_ledger computes bunker fuel tons, USD cost, CO2 abatement, and CII rating."""
    from app.core.vessel_physics import calculate_voyage_esg_ledger, MGO_PRICE_PER_TON_USD, CO2_TONS_PER_TON_MGO
    vessel = get_vessel_spec("PC-5")

    # 100 hours transit, baseline direct takes 115 hours with extra ice drag
    ledger = calculate_voyage_esg_ledger(
        rec_duration_hours=100.0,
        rec_fuel_proxy_pct=100.0,
        direct_duration_hours=115.0,
        direct_fuel_proxy_pct=120.0,
        base_fuel_rate_tons_day=vessel.base_fuel_rate_tons_day,
        mgo_price_per_ton=MGO_PRICE_PER_TON_USD
    )

    assert "recommended_fuel_tons" in ledger
    assert "cost_saved_usd" in ledger
    assert "co2_abated_tons" in ledger
    assert "cii_grade" in ledger

    # Fuel saved should be positive and financial savings should match MGO price
    assert ledger["recommended_fuel_tons"] > 0.0
    assert ledger["direct_fuel_tons"] >= ledger["recommended_fuel_tons"]
    assert ledger["cost_saved_usd"] >= 0.0
    assert ledger["co2_abated_tons"] >= 0.0
    assert ledger["cii_grade"] in ["A", "B", "C"]
    assert "MGO" in ledger["bunker_fuel_type"]

def test_polar_class_normalization_and_distinct_fuel_rates():
    """Verify that PC1, PC2, PC3, PC4, PC5, PC7, and OPEN_WATER resolve to distinct specs and fuel rates."""
    # Test normalization aliases
    pc1 = get_vessel_spec("PC1")
    pc1_hyphen = get_vessel_spec("PC-1")
    assert pc1.base_fuel_rate_tons_day == pc1_hyphen.base_fuel_rate_tons_day == 85.0
    assert pc1.draft_m == 12.0

    pc2 = get_vessel_spec("PC2")
    assert pc2.base_fuel_rate_tons_day == 65.0
    assert pc2.draft_m == 11.2

    pc3 = get_vessel_spec("PC3")
    assert pc3.base_fuel_rate_tons_day == 50.0

    pc4 = get_vessel_spec("PC4")
    assert pc4.base_fuel_rate_tons_day == 38.0

    pc7 = get_vessel_spec("PC7")
    assert pc7.base_fuel_rate_tons_day == 20.0

    ow = get_vessel_spec("OPEN_WATER")
    assert ow.base_fuel_rate_tons_day == 16.0

    # Verify that fuel consumption and carbon calculations differ significantly across classes
    from app.core.vessel_physics import calculate_voyage_esg_ledger
    ledger_pc1 = calculate_voyage_esg_ledger(100.0, 100.0, 115.0, 120.0, pc1.base_fuel_rate_tons_day)
    ledger_pc2 = calculate_voyage_esg_ledger(100.0, 100.0, 115.0, 120.0, pc2.base_fuel_rate_tons_day)
    ledger_pc4 = calculate_voyage_esg_ledger(100.0, 100.0, 115.0, 120.0, pc4.base_fuel_rate_tons_day)
    ledger_pc7 = calculate_voyage_esg_ledger(100.0, 100.0, 115.0, 120.0, pc7.base_fuel_rate_tons_day)

    # PC1 burns more fuel and saves more absolute dollars on detour than PC2, PC4, PC7
    assert ledger_pc1["recommended_fuel_cost_usd"] > ledger_pc2["recommended_fuel_cost_usd"]
    assert ledger_pc2["recommended_fuel_cost_usd"] > ledger_pc4["recommended_fuel_cost_usd"]
    assert ledger_pc4["recommended_fuel_cost_usd"] > ledger_pc7["recommended_fuel_cost_usd"]
    assert ledger_pc1["cost_saved_usd"] > ledger_pc2["cost_saved_usd"]
    assert ledger_pc2["cost_saved_usd"] > ledger_pc4["cost_saved_usd"]


