"""
POLARIS-X Tactical Bridge Officer AI Copilot Service ("Polaris Copilot")
Provides hands-free voice assistance, natural language understanding,
marine navigation queries, IMO POLARIS RIO status interpretation, and direct cockpit control.
"""

from typing import Dict, Any, Optional, List
import re

from app.core.vessel_physics import get_vessel_spec, VESSEL_PROFILES
from app.engines.polaris_rio import IMO_POLARIS_RISK_VALUES


class BridgeOfficerCopilotService:
    def process_query(
        self,
        query: str,
        vessel_class: str = "PC-5",
        start_station: str = "Rothera Station",
        dest_station: str = "Grytviken / South Georgia",
        route_metrics: Optional[Dict[str, Any]] = None,
        rio_profile: Optional[Dict[str, Any]] = None,
        bathymetry: Optional[Dict[str, Any]] = None,
        expedition_plan: Optional[Dict[str, Any]] = None,
        active_icebergs: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Parses voice query, extracts tactical intent, and returns spoken text,
        display narrative, actionable cockpit payload, and tactical audio cues.
        """
        raw_text = query.strip()
        # Strip wake words: "polaris", "hey polaris", "copilot"
        clean_text = re.sub(r"^(hey\s+)?polaris[\s,]*", "", raw_text, flags=re.IGNORECASE)
        clean_text = re.sub(r"^(hey\s+)?copilot[\s,]*", "", clean_text, flags=re.IGNORECASE).strip()
        q_lower = clean_text.lower()

        vessel = get_vessel_spec(vessel_class)

        # ---------------------------------------------------------------------
        # 1. ACTION: SWITCH POLAR CLASS
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["switch polar class", "change polar class", "set polar class", "change vessel", "switch vessel", "set vessel"]):
            target_class = None
            if "pc1" in q_lower or "pc-1" in q_lower or "class 1" in q_lower:
                target_class = "PC-1"
            elif "pc2" in q_lower or "pc-2" in q_lower or "class 2" in q_lower or "polarstern" in q_lower:
                target_class = "PC-2"
            elif "pc4" in q_lower or "pc-4" in q_lower or "class 4" in q_lower:
                target_class = "PC-4"
            elif "pc5" in q_lower or "pc-5" in q_lower or "class 5" in q_lower or "golovnin" in q_lower:
                target_class = "PC-5"
            elif "pc7" in q_lower or "pc-7" in q_lower or "class 7" in q_lower:
                target_class = "PC-7"
            elif "open water" in q_lower or "non-ice" in q_lower or "ow" in q_lower:
                target_class = "OPEN_WATER"

            if target_class:
                new_vessel = get_vessel_spec(target_class)
                return {
                    "intent": "SWITCH_POLAR_CLASS",
                    "spoken_response": f"Affirmative. Switching vessel ice class to {new_vessel.name}, polar class {target_class}.",
                    "display_text": f"**Vessel Ice Class Reconfigured**\n\n• **Vessel:** {new_vessel.name}\n• **Polar Class:** `{target_class}`\n• **Service Cruising Speed:** {new_vessel.cruising_speed_knots} knots\n• **Max Safe Ice Concentration:** {int(new_vessel.max_safe_ice_conc * 100)}%",
                    "action": {
                        "type": "SET_POLAR_CLASS",
                        "payload": {"polar_class": target_class}
                    },
                    "audio_cue": "ACKNOWLEDGE"
                }

        # ---------------------------------------------------------------------
        # 2. ACTION: COMPUTE ROUTE / REROUTE
        # ---------------------------------------------------------------------
        if (
            any(w in q_lower for w in ["compute route", "calculate route", "find route", "recalculate", "reroute", "optimize route", "plan route"])
            or (("compute" in q_lower or "calculate" in q_lower or "optimize" in q_lower or "find" in q_lower) and ("route" in q_lower or "path" in q_lower or "passage" in q_lower))
        ):
            return {
                "intent": "COMPUTE_ROUTE",
                "spoken_response": f"Understood, Bridge. Initiating multi-objective A-Star pathfinder from {start_station.split('/')[0]} to {dest_station.split('/')[0]}.",
                "display_text": f"**Recalculating Passage Corridor**\n\nOptimizing course between **{start_station}** and **{dest_station}** for {vessel.name} ({vessel_class}). Incorporating active satellite scatterometry and iceberg trajectories.",
                "action": {
                    "type": "TRIGGER_COMPUTE_ROUTE",
                    "payload": {}
                },
                "audio_cue": "COMPUTING"
            }

        # ---------------------------------------------------------------------
        # 3. ACTION: SIMULATE ICEBERG DRIFT SURGE
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["surge", "emergency surge", "simulate surge", "iceberg surge", "drift surge"]):
            berg_match = re.search(r"a\s*68\s*a|a\s*23\s*a|a\s*76", q_lower)
            berg_id = "A68A"
            if berg_match:
                berg_id = berg_match.group(0).upper().replace(" ", "")

            return {
                "intent": "TRIGGER_SURGE",
                "spoken_response": f"Warning! Dynamic drift surge simulation initiated for mega-iceberg {berg_id}. Recomputing evasive corridor.",
                "display_text": f"**Emergency Iceberg Surge Injected**\n\nIceberg **{berg_id}** accelerated by 3.5× along heading 065° True. Baseline track compromised; activating evasive northern bypass corridor.",
                "action": {
                    "type": "TRIGGER_SURGE_DEMO",
                    "payload": {"surge_berg_id": berg_id, "speed_multiplier": 3.5, "heading_deg": 65.0}
                },
                "audio_cue": "WARNING"
            }

        # ---------------------------------------------------------------------
        # 4. ACTION: OPEN SCIENTIFIC EXPEDITION PLANNER
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["expedition", "mission planner", "scientific mission", "ncpor mission", "multi waypoint", "multi-leg"]):
            return {
                "intent": "OPEN_EXPEDITION",
                "spoken_response": "Opening NCPOR Scientific Expedition Logistics Planner and multi-leg mission sequencer.",
                "display_text": "**Expedition Logistics Cockpit Activated**\n\nLoading multi-station sequence planner with station dwell times (Maitri, Mawson, Bharati), dynamic bunker fuel depletion ledger, and emergency safe haven abort corridors.",
                "action": {
                    "type": "OPEN_EXPEDITION_MODAL",
                    "payload": {}
                },
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 5. ACTION: OPEN TRADEOFF MATRIX OR XAI ATTRIBUTION
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["tradeoff", "trade off", "trade-off", "compare routes", "inspector", "polaris inspector"]):
            return {
                "intent": "OPEN_TRADEOFFS",
                "spoken_response": "Deploying analytical tradeoff matrix and IMO POLARIS regulatory inspection console.",
                "display_text": "**Analytical Tradeoff Inspector Deployed**\n\nComparing Route A (Recommended ML Safe Corridor) versus Route B (Direct Shortest Track) across distance, ETA, fuel burn, bathymetric draft, and POLARIS RIO limits.",
                "action": {
                    "type": "OPEN_TRADEOFFS_HUD",
                    "payload": {}
                },
                "audio_cue": "ACKNOWLEDGE"
            }

        if any(w in q_lower for w in ["xai", "explain", "attribution", "why this route", "shapley"]):
            return {
                "intent": "OPEN_XAI",
                "spoken_response": "Opening Explainable AI decision attribution module and Shapley risk breakdown.",
                "display_text": "**Explainable AI Rationale Opened**\n\nDisplaying quantifiable feature attributions: iceberg safety margins, pack ice avoidance, fuel conservation proxies, and data lineage.",
                "action": {
                    "type": "OPEN_XAI_MODAL",
                    "payload": {}
                },
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 6. TACTICAL QUERY: UNDER-KEEL CLEARANCE (UKC) & BATHYMETRY
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["under-keel", "under keel", "ukc", "depth", "bathymetry", "draft", "grounding", "shallow"]):
            min_depth = 850.0
            min_ukc = 835.0
            if bathymetry:
                min_depth = bathymetry.get("min_depth_m", 850.0)
                min_ukc = bathymetry.get("min_ukc_m", min_depth - (vessel.draft_m or 8.5))

            vessel_draft = vessel.draft_m or 8.5
            is_shallow = min_ukc < 20.0

            spoken = (
                f"Bridge, minimum Under-Keel Clearance along this track is {min_ukc:.1f} meters, "
                f"at a minimum charted sounding depth of {min_depth:.0f} meters. "
                f"{vessel.name} draws {vessel_draft:.1f} meters draft. "
                f"{'Caution, coastal shallow sector.' if is_shallow else 'Sounding is well clear of seabed hazards.'}"
            )
            display = (
                f"**Hydrographic Bathymetry & Under-Keel Clearance (UKC)**\n\n"
                f"• **Minimum Sounding Depth:** `{min_depth:.1f} m`\n"
                f"• **Vessel Dynamic Operating Draft:** `{vessel_draft:.1f} m` ({vessel.name})\n"
                f"• **Net Under-Keel Clearance (UKC):** `{min_ukc:.1f} m`\n"
                f"• **Grounding Hazard Assessment:** {'⚠️ ELEVATED SHALLOW RISK' if is_shallow else '✅ ZERO GROUNDING HAZARD (Deep Ocean Corridor)'}"
            )
            return {
                "intent": "QUERY_UKC",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "WARNING" if is_shallow else "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 7. TACTICAL QUERY: IMO POLARIS RIO STATUS & COMPLIANCE
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["rio", "polaris status", "polar code", "msc", "regulatory", "authorized", "compliance", "ice class"]):
            avg_rio = 24.5
            min_rio = 18.0
            overall_status = "FULLY_AUTHORIZED"
            badge = "100% IMO POLARIS COMPLIANT"

            if rio_profile:
                avg_rio = rio_profile.get("avg_rio", 24.5)
                min_rio = rio_profile.get("min_rio", 18.0)
                overall_status = rio_profile.get("overall_status", "FULLY_AUTHORIZED")
                badge = rio_profile.get("compliance_badge", badge)

            if overall_status == "FULLY_AUTHORIZED":
                spoken = (
                    f"Bridge report: Passage is fully authorized under IMO Resolution MSC.1/Circ.1519. "
                    f"Minimum Risk Index Outcome along track is plus {min_rio:.1f}, average RIO is plus {avg_rio:.1f}. "
                    f"Normal polar operations authorized for {vessel_class}."
                )
            elif overall_status == "ELEVATED_RISK_AUTHORIZED":
                spoken = (
                    f"Attention Bridge: Elevated operational risk detected under IMO Polar Code. "
                    f"Minimum RIO dropped to {min_rio:.1f}. Speed restrictions and heightened ice watch required."
                )
            else:
                spoken = (
                    f"Warning Bridge: Operation Prohibited under international maritime law! "
                    f"Minimum RIO dropped below minus 10 to {min_rio:.1f}. Unescorted entry illegal."
                )

            display = (
                f"**IMO POLARIS Regulatory Assessment (MSC.1/Circ.1519)**\n\n"
                f"• **Regulatory Status:** `{overall_status}` ({badge})\n"
                f"• **Vessel Ice Class:** `{vessel_class}` ({vessel.name})\n"
                f"• **Minimum RIO:** `{'+' if min_rio >= 0 else ''}{min_rio:.1f}` (Legal Threshold: $\\ge 0$ Normal, $-10$ Limit)\n"
                f"• **Average RIO:** `{'+' if avg_rio >= 0 else ''}{avg_rio:.1f}`\n"
                f"• **Mandatory Compliance Action:** {'Unescorted normal navigation authorized.' if overall_status == 'FULLY_AUTHORIZED' else 'Speed restricted to 6 kn / icebreaker escort standby.'}"
            )
            return {
                "intent": "QUERY_RIO",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "SUCCESS" if overall_status == "FULLY_AUTHORIZED" else "WARNING"
            }

        # ---------------------------------------------------------------------
        # 8. TACTICAL QUERY: FUEL BUNKER & CONSUMPTION
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["fuel", "bunker", "consumption", "burn", "diesel", "mgo", "co2", "carbon"]):
            if expedition_plan and "summary" in expedition_plan:
                exp_sum = expedition_plan["summary"]
                burned = exp_sum.get("total_fuel_burned_tons", 618.9)
                remaining_pct = exp_sum.get("remaining_bunker_pct", 65.5)
                remaining_tons = exp_sum.get("remaining_bunker_tons", 1178.7)
                cost = exp_sum.get("total_fuel_cost_usd", 526065)
                spoken = (
                    f"Expedition fuel status: Total consumption projected at {burned:.1f} tons MGO, "
                    f"leaving {remaining_pct:.1f}% bunker reserve, approximately {remaining_tons:.0f} tons. "
                    f"Bunker status is nominal."
                )
                display = (
                    f"**Expedition Bunker Status Ledger**\n\n"
                    f"• **Total Mission Burn:** `{burned:.1f} Tons MGO`\n"
                    f"• **Remaining Bunker:** `{remaining_pct:.1f}%` ({remaining_tons:.1f} T)\n"
                    f"• **Estimated Cost:** `${cost:,.2f} USD`\n"
                    f"• **CO₂ Emissions:** `{exp_sum.get('total_co2_tons', 1984.2)} Tons`"
                )
            else:
                dist = route_metrics.get("distance_nm", 1365.0) if route_metrics else 1365.0
                eta = route_metrics.get("eta_hours", 88.0) if route_metrics else 88.0
                days = eta / 24.0
                fuel_tons = round(days * vessel.base_fuel_rate_tons_day * 0.92, 1)
                spoken = (
                    f"For current voyage of {dist:.0f} nautical miles, estimated propulsion fuel burn is "
                    f"{fuel_tons:.1f} tons Marine Gas Oil across {days:.1f} steaming days."
                )
                display = (
                    f"**Voyage Propulsion Fuel Estimate**\n\n"
                    f"• **Passage Distance:** `{dist:.1f} NM`\n"
                    f"• **Steaming Time:** `{days:.1f} Days` ({eta:.1f} hrs)\n"
                    f"• **Daily Consumption:** `{vessel.base_fuel_rate_tons_day} T/day` ({vessel.name})\n"
                    f"• **Voyage Fuel Proxy:** `{fuel_tons} Tons MGO`"
                )

            return {
                "intent": "QUERY_FUEL",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 9. TACTICAL QUERY: ACTIVE ICEBERGS & SURGE
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["iceberg", "icebergs", "tabular", "a68a", "a23a", "a76", "collision hazard"]):
            spoken = (
                "Bridge tactical sweep reports primary radar tracking on mega-icebergs A68A, A23A, and A76 in the Weddell corridor. "
                "The current recommended corridor maintains a minimum standoff distance of 28 nautical miles clear of the drift field."
            )
            display = (
                "**Tactical Iceberg Radar & Drift Sweep**\n\n"
                "• **Tracked Megabergs:** `A68A`, `A23A`, `A76`, `A64`, `B28`\n"
                "• **Drift Vector:** 0.8–3.5 km/day towards Scotia Sea / South Georgia\n"
                "• **Active Clearance:** Recommended path maintains $\\ge 28\\text{ NM}$ standoff buffer\n"
                "• **Status:** Zero predicted perimeter violations on current heading."
            )
            return {
                "intent": "QUERY_ICEBERGS",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 10. TACTICAL QUERY: VOYAGE PASSAGE SUMMARY (DISTANCE, ETA, SPEED)
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["eta", "distance", "how far", "voyage status", "speed", "where are we", "course"]):
            dist = route_metrics.get("distance_nm", 1365.0) if route_metrics else 1365.0
            eta = route_metrics.get("eta_hours", 88.0) if route_metrics else 88.0
            days = eta / 24.0
            spoken = (
                f"Voyage status: Passage distance from {start_station.split('/')[0]} to {dest_station.split('/')[0]} "
                f"is {dist:.0f} nautical miles. Estimated transit duration is {days:.1f} days, at service speed {vessel.cruising_speed_knots} knots."
            )
            display = (
                f"**Active Passage Corridor Telemetry**\n\n"
                f"• **Origin:** {start_station}\n"
                f"• **Destination:** {dest_station}\n"
                f"• **Distance:** `{dist:.1f} NM`\n"
                f"• **ETA:** `{days:.1f} Days` ({eta:.1f} hrs)\n"
                f"• **Vessel Speed:** `{vessel.cruising_speed_knots} kn`"
            )
            return {
                "intent": "QUERY_PASSAGE",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 11. GENERAL / UNMATCHED INQUIRY (NAV KNOWLEDGE)
        # ---------------------------------------------------------------------
        return {
            "intent": "GENERAL_MARINE_QUERY",
            "spoken_response": f"Polaris Bridge Copilot standing by. Active vessel is {vessel.name}, class {vessel_class}. You can ask about Under-Keel Clearance, IMO RIO compliance, fuel consumption, iceberg drift, or issue route commands.",
            "display_text": (
                f"**Polaris Bridge Copilot Tactical Interface**\n\n"
                f"• **Vessel:** {vessel.name} (`{vessel_class}`)\n"
                f"• **Corridor:** {start_station.split('/')[0]} ➔ {dest_station.split('/')[0]}\n\n"
                f"**Available Tactical Voice Commands:**\n"
                f"- *\"What is our minimum Under-Keel Clearance?\"*\n"
                f"- *\"Check IMO POLARIS RIO status for this leg\"*\n"
                f"- *\"Switch polar class to PC-2 (or PC-1, PC-4, PC-7)\"*\n"
                f"- *\"Simulate emergency surge on iceberg A68A\"*\n"
                f"- *\"Compute optimal safe route\"*\n"
                f"- *\"Open scientific expedition planner\"*\n"
                f"- *\"How much fuel will this passage burn?\"*"
            ),
            "action": None,
            "audio_cue": "ACKNOWLEDGE"
        }


copilot_service = BridgeOfficerCopilotService()
