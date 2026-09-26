"""
Unit Tests for IMO POLARIS RIO Regulatory Compliance Engine (IMO MSC.1/Circ.1519)
"""

import pytest
from app.engines.polaris_rio import (
    IceRegimeTenths,
    calculate_rio_for_regime,
    estimate_ice_regime_from_environment,
    evaluate_route_polaris_rio,
    IMO_POLARIS_RISK_VALUES
)


def test_open_water_rio_all_classes():
    """In 10/10ths open water, all polar classes should have positive RIO = +30 (Normal Operation)."""
    ow_regime = IceRegimeTenths(open_water=10)
    for p_class in ["PC-1", "PC-2", "PC-3", "PC-4", "PC-5", "PC-6", "PC-7", "Non-Ice"]:
        calc = calculate_rio_for_regime(ow_regime, polar_class=p_class)
        assert calc["rio"] == 30
        assert calc["decision_code"] == "NORMAL_OPERATION"
        assert calc["is_legal"] is True


def test_multi_year_pack_ice_rio():
    """In 10/10ths Multi-Year Ice, heavy icebreakers are normal, whereas PC-5 and Non-Ice are prohibited."""
    my_regime = IceRegimeTenths(multi_year=10, open_water=0)

    # PC-1: 10 * 2 = +20 (Normal Operation)
    pc1_calc = calculate_rio_for_regime(my_regime, polar_class="PC-1")
    assert pc1_calc["rio"] == 20
    assert pc1_calc["decision_code"] == "NORMAL_OPERATION"

    # PC-3: 10 * (-1) = -10 (Elevated Risk / Borderline)
    pc3_calc = calculate_rio_for_regime(my_regime, polar_class="PC-3")
    assert pc3_calc["rio"] == -10
    assert pc3_calc["decision_code"] == "ELEVATED_RISK"
    assert pc3_calc["escort_required"] is True

    # PC-5 (Research PRV): 10 * (-3) = -30 (Operation Prohibited!)
    pc5_calc = calculate_rio_for_regime(my_regime, polar_class="PC-5")
    assert pc5_calc["rio"] == -30
    assert pc5_calc["decision_code"] == "OPERATION_PROHIBITED"
    assert pc5_calc["is_legal"] is False

    # Non-Ice (Commercial cargo): 10 * (-7) = -70 (Strictly Prohibited!)
    non_ice_calc = calculate_rio_for_regime(my_regime, polar_class="Non-Ice")
    assert non_ice_calc["rio"] == -70
    assert non_ice_calc["decision_code"] == "OPERATION_PROHIBITED"


def test_mixed_ice_regime_pc5():
    """
    Mixed regime:
    2/10 Thick First-Year (RV = -1 for PC-5 -> -2)
    3/10 Medium First-Year (RV = +1 for PC-5 -> +3)
    2/10 Thin First-Year 2 (RV = +2 for PC-5 -> +4)
    3/10 Open Water (RV = +3 for PC-5 -> +9)
    Total RIO = -2 + 3 + 4 + 9 = +14 (Normal Operation)
    """
    mixed = IceRegimeTenths(
        thick_first_year=2,
        medium_first_year=3,
        thin_first_year_stage2=2,
        open_water=3
    )
    res = calculate_rio_for_regime(mixed, polar_class="PC-5")
    assert res["rio"] == 14
    assert res["decision_code"] == "NORMAL_OPERATION"
    assert res["is_legal"] is True


def test_estimate_ice_regime_open_water():
    """0.0 ice concentration yields 10/10ths open water."""
    regime = estimate_ice_regime_from_environment(lat=-55.0, lon=-40.0, ice_concentration_fraction=0.0)
    assert regime.open_water == 10
    assert regime.multi_year == 0


def test_route_polaris_rio_evaluation():
    """Evaluate a small mock route track."""
    coords = [(-67.5, -68.1), (-65.0, -60.0), (-58.0, -45.0), (-54.2, -36.5)]

    def mock_ice_grid(lat, lon):
        # Gradual transition from 0.70 ice down to 0.10 ice
        southness = ((-50.0 - lat) / 20.0)
        return float(min(0.85, max(0.05, southness * 0.7))), 0.1

    result = evaluate_route_polaris_rio(
        route_coords=coords,
        ice_grid_fn=mock_ice_grid,
        polar_class="PC-5",
        simulation_date_iso="2021-03-15"
    )

    assert "min_rio" in result
    assert "avg_rio" in result
    assert "compliance_badge" in result
    assert len(result["waypoints"]) > 0
