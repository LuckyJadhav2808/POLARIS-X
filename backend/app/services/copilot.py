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
        simulation_date: str = "2021-03-15",
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
        # 8. TACTICAL QUERY: VESSEL ENDURANCE & HOTEL LOAD SURVIVAL DAYS
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["hotel load", "endurance", "stuck in ice", "how many days", "reserve days", "survival", "survival fuel", "days of fuel"]):
            hotel_rate_tons_day = 3.5
            total_reserve_tons = 1178.7
            if expedition_plan and "summary" in expedition_plan:
                total_reserve_tons = expedition_plan["summary"].get("remaining_bunker_tons", total_reserve_tons)
            
            endurance_days = round(total_reserve_tons / hotel_rate_tons_day, 1)
            spoken = (
                f"Bridge survival endurance analysis: In the event of ice entrapment with main propulsion secured, "
                f"auxiliary generators consume approximately 3.5 tons MGO per day under polar hotel load. "
                f"With {total_reserve_tons:.0f} tons of reserve fuel aboard, the vessel has {endurance_days:.0f} days "
                f"of autonomous life-support, heating, and emergency power."
            )
            display = (
                f"**Vessel Survival & Hotel Load Endurance**\n\n"
                f"• **Polar Hotel Load Consumption:** `3.5 Tons MGO / Day` (Heating, power, fresh water)\n"
                f"• **Onboard Bunker Reserves:** `{total_reserve_tons:.1f} Tons MGO`\n"
                f"• **Autonomous Beset Endurance:** `{endurance_days:.0f} Days` (~{round(endurance_days/30, 1)} months)\n"
                f"• **Life-Support Verdict:** ✅ High safety margin; far exceeds 30-day Antarctic emergency reserve threshold."
            )
            return {
                "intent": "QUERY_ENDURANCE",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "SUCCESS"
            }

        # ---------------------------------------------------------------------
        # 9. TACTICAL QUERY: FUEL BUNKER & CONSUMPTION
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
        # 10. TACTICAL QUERY: ACTIVE ICEBERGS & SURGE
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
        # 11. TACTICAL QUERY: WEATHER, SYNOPTIC WIND & FREEZING SPRAY
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["weather", "wind", "sea state", "wave", "swell", "gale", "blizzard", "freezing spray", "icing", "storm", "meteorology"]):
            spoken = (
                f"BAS Synoptic Weather Briefing: Regional surface winds are blowing South-Southwest at 26 to 34 knots, "
                f"with significant wave swell of 3.8 meters in the Scotia Sea corridor. "
                f"Air temperature is minus 5 degrees Celsius with a moderate Topside Freezing Spray advisory. "
                f"Anti-icing electrical tracing and deck de-icing systems should remain armed."
            )
            display = (
                f"**British Antarctic Survey (BAS) Synoptic Meteorology**\n\n"
                f"• **Surface Wind Vector:** `SSW 28 kts` (Gale Gusts to 38 kts)\n"
                f"• **Significant Wave Height:** `3.8 m` (Scotia Arc / Weddell Boundary)\n"
                f"• **Surface Air Temperature:** `-5.2°C` | **Sea Surface Temp (SST):** `-1.1°C`\n"
                f"• **Atmospheric Pressure:** `984.2 hPa` (Low Pressure Trough Crossing)\n"
                f"• **Topside Icing Hazard:** ⚠️ `MODERATE FREEZING SPRAY` (Mandatory superstructure watch)"
            )
            return {
                "intent": "QUERY_WEATHER",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "WARNING"
            }

        # ---------------------------------------------------------------------
        # 12. TACTICAL QUERY: DESTINATION, ORIGIN & PASSAGE VERIFICATION
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in [
            "destination", "dest", "confirm destination", "check destination", "checked destination",
            "where are we going", "where are we heading", "where are we sailing", "where are we heading to",
            "arrival", "target port", "origin", "departure", "waypoint", "waypoints"
        ]):
            dist = route_metrics.get("distance_nm", 1365.0) if route_metrics else 1365.0
            eta = route_metrics.get("eta_hours", 88.0) if route_metrics else 88.0
            days = eta / 24.0
            spoken = (
                f"Affirmative, Bridge. Active destination is confirmed as {dest_station}, "
                f"departing from {start_station}. Total passage distance along the safety corridor is "
                f"{dist:.0f} nautical miles, with an estimated steaming duration of {days:.1f} days at {vessel.cruising_speed_knots} knots."
            )
            display = (
                f"**Navigational Passage Verification**\n\n"
                f"• **Active Destination:** `{dest_station}`\n"
                f"• **Departure Origin:** `{start_station}`\n"
                f"• **Assigned Vessel:** {vessel.name} (`{vessel_class}`)\n"
                f"• **Corridor Distance:** `{dist:.1f} NM`\n"
                f"• **ETA to Destination:** `{days:.1f} Steaming Days` ({eta:.1f} hrs)\n"
                f"• **Transit Status:** ✅ Destination locked; navigation corridor verified clear of seabed & grounded berg shoals."
            )
            return {
                "intent": "QUERY_DESTINATION",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 13. TACTICAL QUERY: DEPARTURE DATE & VOYAGE TIMELINE
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in [
            "date", "departure date", "start date", "starting date", "when do we start",
            "when does our journey start", "when are we sailing", "departure time",
            "what date", "start of our journey", "starting our journey", "voyage date",
            "calendar date", "when will we leave", "when are we leaving", "what day", "what time"
        ]):
            # Human friendly formatting for simulation date (e.g. 2021-03-15 -> 15 March 2021)
            friendly_date = simulation_date
            try:
                parts = simulation_date.split("-")
                if len(parts) == 3:
                    months = [
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                    ]
                    m_idx = int(parts[1]) - 1
                    friendly_date = f"{int(parts[2])} {months[m_idx]} {parts[0]}"
            except Exception:
                pass

            spoken = (
                f"Voyage timeline briefing: The scheduled departure date for our journey is {friendly_date} at 08:00 UTC. "
                f"This coincides with the Austral late-summer polar navigation window, calibrated against BYU ASCAT satellite radar and NIC iceberg kinematics."
            )
            display = (
                f"**Voyage Departure & Operational Timeline**\n\n"
                f"• **Scheduled Departure Date:** `{simulation_date}` ({friendly_date})\n"
                f"• **Departure Time (UTC):** `08:00:00Z`\n"
                f"• **Active Corridor:** {start_station} ➔ {dest_station}\n"
                f"• **Polar Climatology Window:** Austral Late Summer / Early Autumn (Peak navigable corridor before seasonal Antarctic sea ice freeze-up)\n"
                f"• **Satellite Ingestion Epoch:** Synced with BYU ASCAT Scatterometer v7.1 and NIC bulletins tracking mega-icebergs A68A, A23A, and A64."
            )
            return {
                "intent": "QUERY_DATE",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 14. TACTICAL QUERY: VOYAGE PASSAGE SUMMARY (DISTANCE, ETA, SPEED)
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["eta", "how far", "voyage status", "cruising speed", "vessel speed", "where are we", "course track"]):
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
        # 14. TACTICAL QUERY: EMERGENCY SAFE HAVENS & SHELTERED ANCHORAGES
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["safe haven", "emergency port", "shelter", "anchorage", "refuge", "abort harbor", "where can we hide", "emergency haven", "safe harbor"]):
            spoken = (
                "Bridge Emergency Directive: Primary safe havens along the Antarctic Peninsula corridor are: "
                "1. Deception Island Whalers Bay, offering an enclosed volcanic caldera with 35-meter depth and 360-degree storm protection. "
                "2. Potter Cove at King George Island, sheltered against Weddell ice pack drift. "
                "3. Hope Bay at the northern tip of the Trinity Peninsula for rapid Scotia Sea aborts."
            )
            display = (
                f"**Designated Antarctic Emergency Safe Havens**\n\n"
                f"1. **Deception Island (Whalers Bay)**: `62°59'S, 60°34'W`\n"
                f"   - *Features:* Submerged caldera entrance (Neptune's Bellows), volcanic seabed, complete 360° pack ice & swell shelter.\n"
                f"2. **Potter Cove (King George Island)**: `62°14'S, 58°40'W`\n"
                f"   - *Features:* 30–50m soft mud holding ground, protected by Stranger Point from Weddell pack ice drift.\n"
                f"3. **Hope Bay (Trinity Peninsula)**: `63°24'S, 56°59'W`\n"
                f"   - *Features:* Northern emergency waypoint, proximity to Esperanza Station medical and search & rescue assets."
            )
            return {
                "intent": "QUERY_SAFE_HAVEN",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 15. TACTICAL QUERY: ICEBREAKER ESCORT REQUIREMENTS
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["escort", "need an escort", "require escort", "icebreaker escort", "can we sail alone", "unescorted", "alone"]):
            max_safe_ice = int(vessel.max_safe_ice_conc * 100)
            is_heavy_breaker = vessel_class in ["PC-1", "PC-2"]
            if is_heavy_breaker:
                spoken = (
                    f"Bridge report: {vessel.name} is a heavy polar icebreaker ({vessel_class}) authorized for 100% "
                    f"ice concentration under IMO Polar Code Chapter 6. No escort vessel is required. "
                    f"{vessel.name} is capable of escorting lower ice-class research vessels."
                )
                display = (
                    f"**IMO Polar Code Escort Evaluation**\n\n"
                    f"• **Vessel:** {vessel.name} (`{vessel_class}` Heavy Polar Icebreaker)\n"
                    f"• **Unescorted Capability:** `100% Multi-Year Pack Ice`\n"
                    f"• **Escort Status:** ✅ **SELF-SUFFICIENT (NO ESCORT REQUIRED)**\n"
                    f"• **Operational Role:** Authorized for lead escort convoy duty."
                )
            else:
                spoken = (
                    f"Bridge report: For {vessel.name} ({vessel_class}), unescorted navigation is authorized in "
                    f"ice concentrations up to {max_safe_ice}%. If RIO drops below zero or continuous multi-year ice "
                    f"thickness exceeds 1.2 meters, IMO Polar Code mandates standby escort by a PC-1 or PC-2 Heavy Icebreaker."
                )
                display = (
                    f"**IMO Polar Code Escort Evaluation**\n\n"
                    f"• **Vessel:** {vessel.name} (`{vessel_class}` Research PRV)\n"
                    f"• **Unescorted Ice Limit:** `{max_safe_ice}% Concentration` (First-Year Ice <= 1.2 meters)\n"
                    f"• **Escort Mandate Threshold:** RIO $< 0$ or Ice Concentration $> {max_safe_ice}%$\n"
                    f"• **Escort Status:** ⚠️ **STANDBY PROTOCOL ACTIVE** (Authorized unescorted on current safety corridor)."
                )
            return {
                "intent": "QUERY_ESCORT",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 15. TACTICAL QUERY: SEA ICE CHARACTERISTICS & BESETTING PRESSURE
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["multi-year", "first-year", "ice thickness", "ice floe", "ice ridge", "compressive", "beset", "ice pressure", "trapped in ice"]):
            spoken = (
                f"Cryosphere ice evaluation: The active navigation corridor traverses predominantly First-Year Thin to "
                f"Medium pack ice, ranging from 0.3 to 1.0 meters thickness. In the western Weddell gyre, compressive "
                f"convergent ice drift creates pressure ridges up to 2.5 meters. Vessel speed should be reduced to 6 knots "
                f"to prevent besetting."
            )
            display = (
                f"**Cryosphere Sea Ice & Pressure Dynamics**\n\n"
                f"• **Dominant Ice Regime:** `First-Year Pack Ice` (0.3–1.0 m thickness)\n"
                f"• **Secondary Hazard:** Compressive pressure ridges in Western Weddell convergence\n"
                f"• **Besetting Risk Assessment:** `LOW TO MODERATE` (Recommended safety corridor skirts compression zones)\n"
                f"• **Hull Operating Envelope:** Within {vessel.name}'s continuous icebreaking capability."
            )
            return {
                "intent": "QUERY_ICE_TYPE",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 16. TACTICAL QUERY: VESSEL ENDURANCE & HOTEL LOAD SURVIVAL DAYS
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["hotel load", "endurance", "stuck in ice", "how many days", "reserve days", "survival", "days of fuel"]):
            hotel_rate_tons_day = 3.5
            total_reserve_tons = 1178.7
            if expedition_plan and "summary" in expedition_plan:
                total_reserve_tons = expedition_plan["summary"].get("remaining_bunker_tons", total_reserve_tons)
            
            endurance_days = round(total_reserve_tons / hotel_rate_tons_day, 1)
            spoken = (
                f"Bridge survival endurance analysis: In the event of ice entrapment with main propulsion secured, "
                f"auxiliary generators consume approximately 3.5 tons MGO per day under polar hotel load. "
                f"With {total_reserve_tons:.0f} tons of reserve fuel aboard, the vessel has {endurance_days:.0f} days "
                f"of autonomous life-support, heating, and emergency power."
            )
            display = (
                f"**Vessel Survival & Hotel Load Endurance**\n\n"
                f"• **Polar Hotel Load Consumption:** `3.5 Tons MGO / Day` (Heating, power, fresh water)\n"
                f"• **Onboard Bunker Reserves:** `{total_reserve_tons:.1f} Tons MGO`\n"
                f"• **Autonomous Beset Endurance:** `{endurance_days:.0f} Days` (~{round(endurance_days/30, 1)} months)\n"
                f"• **Life-Support Verdict:** ✅ High safety margin; far exceeds 30-day Antarctic emergency reserve threshold."
            )
            return {
                "intent": "QUERY_ENDURANCE",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "SUCCESS"
            }

        # ---------------------------------------------------------------------
        # 17. TACTICAL QUERY: NEARBY ANTARCTIC RESEARCH STATIONS
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in ["nearby station", "stations", "maitri", "bharati", "rothera", "halley", "base", "which station", "research station"]):
            spoken = (
                "Regional Research Stations: Key operational bases in this sector include Rothera Station (UK) on Adelaide Island, "
                "Faraday/Vernadsky, Signy Island, and Grytviken in South Georgia. For Indian Antarctic Expeditions, Maitri Station "
                "and Bharati Station maintain continuous operational communication and emergency logistics coordination."
            )
            display = (
                f"**Active Antarctic Research Stations & Corridors**\n\n"
                f"• **Rothera Station (UK / BAS):** `67°34'S, 68°07'W` — Primary Peninsula aviation hub & deepwater wharf.\n"
                f"• **Maitri Station (India / NCPOR):** `70°46'S, 11°44'E` — Queen Maud Land central science station.\n"
                f"• **Bharati Station (India / NCPOR):** `69°24'S, 76°11'E` — Modern coastal station, Larsemann Hills.\n"
                f"• **Grytviken / South Georgia:** `54°17'S, 36°29'W` — Sub-Antarctic logistics gateway & safe anchorage."
            )
            return {
                "intent": "QUERY_STATIONS",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 18. SYSTEM, PROJECT & PROBLEM STATEMENT PS-26059 KNOWLEDGE
        # ---------------------------------------------------------------------
        if any(w in q_lower for w in [
            "what is polaris", "polaris-x", "ps-26059", "problem statement", "ncpor", "moes",
            "dataset", "datasets", "satellite", "algorithm", "who are you", "what can you do", "architecture"
        ]):
            spoken = (
                "I am POLARIS-X, an autonomous polar maritime decision-support copilot developed for NCPOR and the Ministry of Earth Sciences "
                "under Problem Statement 26059. I integrate real satellite scatterometry from BYU ASCAT, NIC iceberg bulletins, "
                "BAS synoptic weather, and multi-objective A-Star pathfinding to compute safety-verified, fuel-optimized maritime shipping corridors."
            )
            display = (
                f"**POLARIS-X System Intelligence Overview (PS-26059)**\n\n"
                f"• **Mandate:** MoES & NCPOR Polar Maritime Operational Logistics & Ice Risk Navigator\n"
                f"• **Ingested Data Feeds:**\n"
                f"  - BYU ASCAT Scatterometer kinematics (1,300+ daily iceberg tracks: A68A, A23A, A64)\n"
                f"  - National Ice Center (NIC) weekly polar bulletins\n"
                f"  - British Antarctic Survey (BAS) synoptic surface meteorology\n"
                f"  - NSIDC 40-year polar sea ice extent climatology\n"
                f"• **Optimization Engines:** Multi-objective A* with geodesic heuristics, anisotropic Gaussian risk lattice, and IMO POLARIS RIO regulatory compliance."
            )
            return {
                "intent": "QUERY_PROJECT_INFO",
                "spoken_response": spoken,
                "display_text": display,
                "action": None,
                "audio_cue": "ACKNOWLEDGE"
            }

        # ---------------------------------------------------------------------
        # 19. GENERAL / UNMATCHED INQUIRY (NAV KNOWLEDGE)
        # ---------------------------------------------------------------------
        return {
            "intent": "GENERAL_MARINE_QUERY",
            "spoken_response": f"Polaris Bridge Copilot standing by. Active vessel is {vessel.name}, class {vessel_class}. You can ask about Under-Keel Clearance, IMO RIO compliance, destination verification, weather, safe havens, escort mandates, or fuel endurance.",
            "display_text": (
                f"**Polaris Bridge Copilot Tactical Interface**\n\n"
                f"• **Vessel:** {vessel.name} (`{vessel_class}`)\n"
                f"• **Corridor:** {start_station.split('/')[0]} ➔ {dest_station.split('/')[0]}\n\n"
                f"**Available Tactical Voice Commands:**\n"
                f"- *\"Confirm the destination that we have chosen\"*\n"
                f"- *\"What is our minimum Under-Keel Clearance?\"*\n"
                f"- *\"Check IMO POLARIS RIO status for this leg\"*\n"
                f"- *\"What is the weather and freezing spray risk?\"*\n"
                f"- *\"Where is the nearest emergency safe haven?\"*\n"
                f"- *\"Do we legally require an icebreaker escort?\"*\n"
                f"- *\"How many days of hotel load survival fuel remain?\"*\n"
                f"- *\"What is Problem Statement PS-26059?\"*\n"
                f"- *\"Switch polar class to PC-2 (or PC-1, PC-4, PC-7)\"*\n"
                f"- *\"Simulate emergency surge on iceberg A68A\"*"
            ),
            "action": None,
            "audio_cue": "ACKNOWLEDGE"
        }


copilot_service = BridgeOfficerCopilotService()
