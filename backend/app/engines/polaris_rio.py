"""
POLARIS-X IMO POLARIS RIO Regulatory Compliance Engine
Implements the International Maritime Organization (IMO) Polar Operational Limit
Assessment Risk Indexing System (POLARIS) pursuant to IMO MSC.1/Circ.1519.

Calculates the Risk Index Outcome (RIO) for ice regimes:
    RIO = SUM( C_i * RV_i )
where:
    C_i  = Concentration of ice type i in tenths (0 to 10)
    RV_i = Risk Value for ice type i corresponding to the vessel's Polar Class

Operational Decision Thresholds:
    RIO >= 0:   Normal Operation (Authorized under Polar Code)
    -10 <= RIO < 0: Elevated Risk Operation (Speed restricted <= 5 kn, escort required)
    RIO < -10:  Operation Prohibited (Illegal under IMO Polar Code Chapter 3 & SOLAS XIV)
"""

from typing import Dict, List, Tuple, Any, Optional
from pydantic import BaseModel, Field
import numpy as np


class IceRegimeTenths(BaseModel):
    """
    Standardized ice regime composition expressed in tenths (0 to 10).
    The sum of all ice concentrations plus open water must equal 10.
    """
    multi_year: int = Field(0, ge=0, le=10, description="Multi-Year Ice (>2m thick, old polar pack)")
    second_year: int = Field(0, ge=0, le=10, description="Second-Year Ice (1.5 - 2.5m thick)")
    thick_first_year: int = Field(0, ge=0, le=10, description="Thick First-Year Ice (>1.2m thick)")
    medium_first_year: int = Field(0, ge=0, le=10, description="Medium First-Year Ice (0.7 - 1.2m thick)")
    thin_first_year_stage2: int = Field(0, ge=0, le=10, description="Thin First-Year Stage 2 (0.5 - 0.7m thick)")
    thin_first_year_stage1: int = Field(0, ge=0, le=10, description="Thin First-Year Stage 1 (0.3 - 0.5m thick)")
    new_ice: int = Field(0, ge=0, le=10, description="New / Grey-White / Nilas / Pancake Ice (<0.3m)")
    brash_water: int = Field(0, ge=0, le=10, description="Brash Ice / Bergy Water (ice fragments <2m)")
    open_water: int = Field(10, ge=0, le=10, description="Ice Free / Open Water")


# ==============================================================================
# IMO MSC.1/Circ.1519 Table 1: Standard Polar Class Risk Values (RV)
# ==============================================================================
# Mapping: polar_class -> { ice_type: Risk Value (RV) }
# Polar Classes: PC-1 to PC-7, plus Non-Ice Class (Category C / Unclassed)
IMO_POLARIS_RISK_VALUES: Dict[str, Dict[str, int]] = {
    "PC-1": {
        "multi_year": 2,
        "second_year": 2,
        "thick_first_year": 2,
        "medium_first_year": 2,
        "thin_first_year_stage2": 2,
        "thin_first_year_stage1": 2,
        "new_ice": 2,
        "brash_water": 3,
        "open_water": 3,
    },
    "PC-2": {
        "multi_year": 1,
        "second_year": 2,
        "thick_first_year": 2,
        "medium_first_year": 2,
        "thin_first_year_stage2": 2,
        "thin_first_year_stage1": 2,
        "new_ice": 2,
        "brash_water": 3,
        "open_water": 3,
    },
    "PC-3": {
        "multi_year": -1,
        "second_year": 1,
        "thick_first_year": 2,
        "medium_first_year": 2,
        "thin_first_year_stage2": 2,
        "thin_first_year_stage1": 2,
        "new_ice": 2,
        "brash_water": 3,
        "open_water": 3,
    },
    "PC-4": {
        "multi_year": -2,
        "second_year": -1,
        "thick_first_year": 1,
        "medium_first_year": 2,
        "thin_first_year_stage2": 2,
        "thin_first_year_stage1": 2,
        "new_ice": 2,
        "brash_water": 3,
        "open_water": 3,
    },
    "PC-5": {
        "multi_year": -3,
        "second_year": -2,
        "thick_first_year": -1,
        "medium_first_year": 1,
        "thin_first_year_stage2": 2,
        "thin_first_year_stage1": 2,
        "new_ice": 2,
        "brash_water": 3,
        "open_water": 3,
    },
    "PC-6": {
        "multi_year": -4,
        "second_year": -3,
        "thick_first_year": -2,
        "medium_first_year": -1,
        "thin_first_year_stage2": 1,
        "thin_first_year_stage1": 2,
        "new_ice": 2,
        "brash_water": 3,
        "open_water": 3,
    },
    "PC-7": {
        "multi_year": -5,
        "second_year": -4,
        "thick_first_year": -3,
        "medium_first_year": -2,
        "thin_first_year_stage2": -1,
        "thin_first_year_stage1": 1,
        "new_ice": 2,
        "brash_water": 3,
        "open_water": 3,
    },
    "Non-Ice": {
        "multi_year": -7,
        "second_year": -6,
        "thick_first_year": -5,
        "medium_first_year": -4,
        "thin_first_year_stage2": -3,
        "thin_first_year_stage1": -2,
        "new_ice": 1,
        "brash_water": 2,
        "open_water": 3,
    }
}


def normalize_class_to_rio_key(polar_class: str) -> str:
    """Normalizes any polar class string to one of the 8 canonical keys in IMO Table 1."""
    c = polar_class.strip().upper().replace(" ", "").replace("_", "").replace("/", "").replace("-", "")
    if "PC1" in c or "ARC1" in c:
        return "PC-1"
    if "PC2" in c or "ARC2" in c:
        return "PC-2"
    if "PC3" in c or "ARC3" in c:
        return "PC-3"
    if "PC4" in c or "ARC4" in c:
        return "PC-4"
    if "PC5" in c or "ARC5" in c:
        return "PC-5"
    if "PC6" in c or "ARC6" in c:
        return "PC-6"
    if "PC7" in c or "ARC7" in c:
        return "PC-7"
    return "Non-Ice"


def calculate_rio_for_regime(
    regime: IceRegimeTenths,
    polar_class: str = "PC-5"
) -> Dict[str, Any]:
    """
    Computes the exact Risk Index Outcome (RIO) for a specified ice regime
    and vessel polar class according to IMO MSC.1/Circ.1519.
    """
    canon_class = normalize_class_to_rio_key(polar_class)
    rv_table = IMO_POLARIS_RISK_VALUES.get(canon_class, IMO_POLARIS_RISK_VALUES["PC-5"])

    components = {
        "multi_year": regime.multi_year * rv_table["multi_year"],
        "second_year": regime.second_year * rv_table["second_year"],
        "thick_first_year": regime.thick_first_year * rv_table["thick_first_year"],
        "medium_first_year": regime.medium_first_year * rv_table["medium_first_year"],
        "thin_first_year_stage2": regime.thin_first_year_stage2 * rv_table["thin_first_year_stage2"],
        "thin_first_year_stage1": regime.thin_first_year_stage1 * rv_table["thin_first_year_stage1"],
        "new_ice": regime.new_ice * rv_table["new_ice"],
        "brash_water": regime.brash_water * rv_table["brash_water"],
        "open_water": regime.open_water * rv_table["open_water"],
    }

    rio = sum(components.values())

    # Operational Decision Logic (IMO Polar Code Standard)
    if rio >= 0:
        decision_code = "NORMAL_OPERATION"
        decision_label = "Normal Operation Authorized"
        status_color = "#10B981"  # Emerald
        speed_recommendation = "Standard cruising speed authorized under master discretion"
        escort_required = False
        is_legal = True
    elif -10 <= rio < 0:
        decision_code = "ELEVATED_RISK"
        decision_label = "Elevated Risk Operation (Restricted)"
        status_color = "#F59E0B"  # Amber
        speed_recommendation = "Speed restricted to <= 5.0 knots; searchlight/radar watch required"
        escort_required = True
        is_legal = True
    else:
        decision_code = "OPERATION_PROHIBITED"
        decision_label = "Operation Strictly Prohibited"
        status_color = "#EF4444"  # Crimson
        speed_recommendation = "ENTRY FORBIDDEN: High risk of hull breach, rudder damage or besetting"
        escort_required = True
        is_legal = False

    return {
        "rio": int(rio),
        "polar_class": canon_class,
        "decision_code": decision_code,
        "decision_label": decision_label,
        "status_color": status_color,
        "speed_recommendation": speed_recommendation,
        "escort_required": escort_required,
        "is_legal": is_legal,
        "components": components,
        "risk_values": rv_table,
        "regime_tenths": regime.model_dump()
    }


def estimate_ice_regime_from_environment(
    lat: float,
    lon: float,
    ice_concentration_fraction: float,
    month: int = 3,
    berg_risk_factor: float = 0.0
) -> IceRegimeTenths:
    """
    Decomposes continuous satellite sea-ice concentration (0.0 to 1.0) and geographic coordinates
    into realistic IMO ice regime tenths according to Antarctic glaciological climatology.
    """
    total_tenths = int(np.clip(round(ice_concentration_fraction * 10.0), 0, 10))
    open_water_tenths = 10 - total_tenths

    if total_tenths == 0:
        return IceRegimeTenths(open_water=10)

    # Weddell Sea (-60°W to -20°W) and Ross Sea (+160°E to -150°W) deep south have multi-year pack
    is_deep_gyre = (
        (-60.0 <= lon <= -20.0 and lat <= -66.0) or
        ((lon >= 160.0 or lon <= -150.0) and lat <= -71.0)
    )

    remaining_ice = total_tenths

    # Multi-Year Ice proportion
    if is_deep_gyre and lat <= -70.0:
        my_tenths = min(remaining_ice, int(round(total_tenths * 0.35)))
    elif is_deep_gyre:
        my_tenths = min(remaining_ice, int(round(total_tenths * 0.15)))
    else:
        my_tenths = 0
    remaining_ice -= my_tenths

    # Second-Year Ice proportion
    if is_deep_gyre and remaining_ice > 0:
        sy_tenths = min(remaining_ice, int(round(total_tenths * 0.20)))
    elif lat <= -65.0 and remaining_ice > 0:
        sy_tenths = min(remaining_ice, int(round(total_tenths * 0.10)))
    else:
        sy_tenths = 0
    remaining_ice -= sy_tenths

    # Thick First-Year Ice
    if lat <= -64.0 and remaining_ice > 0:
        tfy_tenths = min(remaining_ice, int(round(total_tenths * 0.30)))
    else:
        tfy_tenths = min(remaining_ice, int(round(total_tenths * 0.15)))
    remaining_ice -= tfy_tenths

    # Medium First-Year Ice
    mfy_tenths = min(remaining_ice, int(round(total_tenths * 0.35)))
    remaining_ice -= mfy_tenths

    # Thin First-Year Ice Stage 2
    tfy2_tenths = min(remaining_ice, int(round(total_tenths * 0.40)))
    remaining_ice -= tfy2_tenths

    # Thin First-Year Stage 1 & New Ice
    tfy1_tenths = min(remaining_ice, remaining_ice // 2)
    remaining_ice -= tfy1_tenths

    new_ice_tenths = remaining_ice
    remaining_ice = 0

    # Brash ice / bergy water factor if near icebergs
    brash_tenths = 0
    if berg_risk_factor > 0.4 and open_water_tenths > 1:
        brash_tenths = min(open_water_tenths - 1, int(round(berg_risk_factor * 3.0)))
        open_water_tenths -= brash_tenths

    return IceRegimeTenths(
        multi_year=my_tenths,
        second_year=sy_tenths,
        thick_first_year=tfy_tenths,
        medium_first_year=mfy_tenths,
        thin_first_year_stage2=tfy2_tenths,
        thin_first_year_stage1=tfy1_tenths,
        new_ice=new_ice_tenths,
        brash_water=brash_tenths,
        open_water=open_water_tenths
    )


def evaluate_route_polaris_rio(
    route_coords: List[Tuple[float, float]],
    ice_grid_fn,
    polar_class: str = "PC-5",
    simulation_date_iso: str = "2021-03-15"
) -> Dict[str, Any]:
    """
    Evaluates the complete IMO POLARIS RIO profile along a sequence of route waypoints.
    Returns summary statistics, minimum RIO, compliance status, and waypoint-by-waypoint records.
    """
    if not route_coords:
        return {
            "overall_status": "NO_WAYPOINTS",
            "is_fully_compliant": True,
            "min_rio": 30,
            "avg_rio": 30.0,
            "max_rio": 30,
            "normal_pct": 100.0,
            "elevated_pct": 0.0,
            "prohibited_pct": 0.0,
            "waypoints_evaluated": 0,
            "waypoints": []
        }

    canon_class = normalize_class_to_rio_key(polar_class)
    month = int(simulation_date_iso.split("-")[1]) if "-" in simulation_date_iso else 3

    rio_values: List[int] = []
    waypoint_records: List[Dict[str, Any]] = []

    normal_count = 0
    elevated_count = 0
    prohibited_count = 0

    # Subsample if too dense (up to 30 sample points along passage)
    step = max(1, len(route_coords) // 25)
    sample_indices = list(range(0, len(route_coords), step))
    if sample_indices[-1] != len(route_coords) - 1:
        sample_indices.append(len(route_coords) - 1)

    for idx in sample_indices:
        lat, lon = route_coords[idx]
        ice_conc, berg_factor = ice_grid_fn(lat, lon)

        regime = estimate_ice_regime_from_environment(
            lat=lat,
            lon=lon,
            ice_concentration_fraction=ice_conc,
            month=month,
            berg_risk_factor=berg_factor
        )

        calc = calculate_rio_for_regime(regime, polar_class=canon_class)
        rio = calc["rio"]
        rio_values.append(rio)

        if calc["decision_code"] == "NORMAL_OPERATION":
            normal_count += 1
        elif calc["decision_code"] == "ELEVATED_RISK":
            elevated_count += 1
        else:
            prohibited_count += 1

        waypoint_records.append({
            "index": idx + 1,
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "rio": rio,
            "decision_code": calc["decision_code"],
            "decision_label": calc["decision_label"],
            "status_color": calc["status_color"],
            "speed_limit_knots": 5.0 if calc["decision_code"] == "ELEVATED_RISK" else None,
            "ice_concentration_pct": round(ice_conc * 100.0, 1),
            "regime_summary": {
                "my": regime.multi_year,
                "sy": regime.second_year,
                "tfy": regime.thick_first_year,
                "mfy": regime.medium_first_year,
                "thin": regime.thin_first_year_stage1 + regime.thin_first_year_stage2 + regime.new_ice,
                "ow": regime.open_water + regime.brash_water
            }
        })

    n_samples = len(rio_values)
    min_rio = min(rio_values)
    avg_rio = float(np.mean(rio_values))
    max_rio = max(rio_values)

    normal_pct = round((normal_count / n_samples) * 100.0, 1)
    elevated_pct = round((elevated_count / n_samples) * 100.0, 1)
    prohibited_pct = round((prohibited_count / n_samples) * 100.0, 1)

    if prohibited_count > 0:
        overall_status = "PROHIBITED_VIOLATION"
        compliance_badge = "NON-COMPLIANT"
        compliance_text = f"Route enters illegal ice regimes under IMO Polar Code (Min RIO: {min_rio} < -10)."
        is_fully_compliant = False
    elif elevated_count > 0:
        overall_status = "ELEVATED_RISK_AUTHORIZED"
        compliance_badge = "CONDITIONAL (ESCORT/SPEED LIMIT)"
        compliance_text = f"Passage is legal with speed restrictions <= 5 kn on {elevated_pct}% of track."
        is_fully_compliant = True
    else:
        overall_status = "FULLY_AUTHORIZED"
        compliance_badge = "100% IMO POLARIS COMPLIANT"
        compliance_text = "Passage completely within normal operational limits under IMO MSC.1/Circ.1519."
        is_fully_compliant = True

    return {
        "polar_class": canon_class,
        "standard": "IMO MSC.1/Circ.1519 (POLARIS System)",
        "overall_status": overall_status,
        "compliance_badge": compliance_badge,
        "compliance_text": compliance_text,
        "is_fully_compliant": is_fully_compliant,
        "min_rio": min_rio,
        "avg_rio": round(avg_rio, 1),
        "max_rio": max_rio,
        "normal_pct": normal_pct,
        "elevated_pct": elevated_pct,
        "prohibited_pct": prohibited_pct,
        "waypoints_evaluated": n_samples,
        "waypoints": waypoint_records
    }
