# POLARIS-X: Complete UI/UX, Screen Inventory & Dashboard Layout Blueprint
## Executive Maritime Console Architecture & Spatial Bento Hierarchy
### Problem Statement ID: 26059 — MoES / NCPOR | System: POLARIS-X

---

## 1. UI/UX Architectural Overview

Following the global skill standards from **/enterprise-ui-layout-catalog** (Cockpit Command Center HUD + Master-Detail Split), **/spatial-layout-bento-design**, **/chromatic-color-harmonies**, **/ui-ux-pro**, and **/mobile-ergonomics**, POLARIS-X is structured as a **high-density, daylight-readable maritime mission console**.

```
+---------------------------------------------------------------------------------------------------------+
|                                    MASTER SCREEN TAXONOMY                                               |
+---------------------------------------------------------------------------------------------------------+
| SCREEN 1: Primary Mission Cockpit (Main Navigation & Situational Awareness Canvas)                      |
|           -> Top HUD Telemetry Strip + Left Config Rail + Center Hero Map + Right Intel Rail + Dock     |
+---------------------------------------------------------------------------------------------------------+
| SCREEN 2: Route Multi-Alternative Comparison Studio & Waypoint Matrix                                   |
|           -> Side-by-side 3-route evaluation, multi-factor radar charts, and turn-by-turn waypoint legs |
+---------------------------------------------------------------------------------------------------------+
| SCREEN 3: Explainable AI (XAI) Decision Attribution Modal                                               |
|           -> Natural language rationale, quantitative hazard waterfall chart, sensor provenance audit   |
+---------------------------------------------------------------------------------------------------------+
| SCREEN 4: Dynamic Rerouting & "What-If" Simulation Sandbox                                              |
|           -> Hazard surge injection, before/after ghost tracks, real-time safety diffs, incident logs   |
+---------------------------------------------------------------------------------------------------------+
| SCREEN 5: Historical Passage Replay & Climate Analytics Dashboard                                       |
|           -> 2019-2022 iceberg time-lapse scrubber, 1980-2026 NSIDC sea-ice anomaly climate curve       |
+---------------------------------------------------------------------------------------------------------+
| SCREEN 6: Contextual Iceberg Inspector & Vessel Specification Drawer                                    |
|           -> Slide-out drawer with kinematic dimensions, drift rate, and IACS Polar Class spec sheets    |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Screen 1: Primary Mission Cockpit (Main Bridge Screen)

The primary operating canvas for bridge officers and mission planners. It provides immediate situational awareness and instant route optimization without page refreshes.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] POLARIS-X   MISSION: ANT-26059   VESSEL: MV VASILIY GOLOVNIN (PC-5)   UTC: 12:40:00      │
├───────────────────┬─────────────────────────────────────────────────────────┬───────────────────┤
│ LEFT RAIL (320px) │ CENTER SPATIAL HERO (FLEX-1)                            │ RIGHT RAIL (340px)│
│                   │                                                         │                   │
│ [ BENTO CARD 1 ]  │  ┌───────────────────────────────────────────────────┐  │ [ BENTO CARD 3 ]  │
│ ROUTE PLANNER     │  │ TOP TELEMETRY STRIP (HUD)                         │  │ SITUATION INTEL   │
│ - Departure       │  │ Lat: -67.57°S | Lon: -68.12°W | Ice: 4.8M km²     │  │ - Active Bergs: 14│
│ - Destination     │  └───────────────────────────────────────────────────┘  │ - Baro: 984 hPa   │
│ - Ice Class       │                                                         │ - Wind: 32 kts WSW│
│ - Fuel/Risk Ratio │             MAPLIBRE POLAR PROJECTION CANVAS            │                   │
│                   │                                                         │ [ BENTO CARD 4 ]  │
│ [ BENTO CARD 2 ]  │   (▲) Tracked Icebergs (A68A, A23A) with Drift Cones    │ ICEBERG INSPECTOR │
│ ACTIVE LAYERS     │   (░) Sea-Ice Concentration Heatmap Raster              │ - Selected: A68A  │
│ [X] Sea Ice       │   (·) BAS Synoptic Stations (Rothera, Grytviken)        │ - Dimensions:     │
│ [X] Iceberg Cones │                                                         │   82 NM x 26 NM   │
│ [X] Weather Grid  │   =========> RECOMMENDED CORRIDOR (Sky-600 Solid)       │ - Drift: 0.8 km/d │
│                   │   - - - - - > DIRECT SHORTEST TRACK (Slate-500 Dashed)  │ - Status: Drifting│
│ [ FIND OPTIMAL ]  │                                                         │                   │
│ [ ROUTE (A*)   ]  │  ┌───────────────────────────────────────────────────┐  │ [ SIMULATE BERG ] │
│                   │  │ FLOATING TIME-LAPSE & REROUTE DOCK                │  │ [ SURGE EVENT   ] │
│                   │  └───────────────────────────────────────────────────┘  │                   │
├───────────────────┴─────────────────────────────────────────────────────────┴───────────────────┤
│ PERSISTENT COMPARISON DOCK & EXPLAINABLE AI STRIP                                               │
│ Recommended Route: ETA 76.4h  |  Fuel: 104.2%  |  Dist: 1084 NM  |  Risk: LOW (0.23)            │
│ Direct Route     : ETA 71.2h  |  Fuel: 100.0%  |  Dist: 982 NM   |  Risk: HIGH (0.79)           │
│ [ WHY THIS ROUTE? - EXPLAINABLE AI BREAKDOWN ]                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Screen 1 Components & Interior Widgets:

#### 1. Top HUD Telemetry Strip (`TelemetryStrip.tsx`)
* **Position:** Fixed top bar spanning the center map canvas.
* **Widgets & Data Fields:**
  * **Current Coordinates:** Latitude/Longitude in `font-mono tabular-nums` (e.g., `-67.5700°S, -68.1236°W`).
  * **Sea-Ice Pack Extent:** Regional monthly extent readout (`4.82M km²`, with $\pm\text{anomaly}$ badge).
  * **Synoptic Pressure:** Barometric reading (`984.2 hPa`, with trend arrow $\downarrow$ falling).
  * **Wind Vector:** Wind speed & direction (`32 kts WSW`).
  * **Hazard Tally:** Active Icebergs in sector (`14 Tracked · 2 Grounded`).
  * **Mission UTC Clock:** Synchronized digital UTC clock with live seconds ticker.

#### 2. Left Bento Rail (`RouteConfigRail.tsx` — `w-80` / `320px`)
* **Card 1: Waypoint & Passage Configurator:**
  * *Departure Picker:* Dropdown / search selector with polar station presets (Rothera, Faraday/Vernadsky, Halley, Maitri, Bharati) + "Click on map" mode.
  * *Destination Picker:* Preset targets (Grytviken / South Georgia, Signy, Deception Island, Open Ocean Corridor).
  * *Waypoint Chips:* Displays selected coordinate chips with clear ($X$) buttons.
* **Card 2: Vessel Ice-Class Selector:**
  * Interactive segmented selector:
    * `Class 1: Research PRV (PC-5)` — *MV Vasiliy Golovnin* (Default)
    * `Class 2: Heavy Icebreaker (PC-2)` — Extreme ice capability
    * `Class 3: Commercial Non-Ice Class` — Open pack only
  * *Vessel Spec Summary:* Cruising speed (14 kts), max safe ice concentration (70%), hull resistance factor.
* **Card 3: Multi-Objective Weighting Sliders:**
  * *Safety Priority Slider:* $0.0 \leftrightarrow 1.0$ (Default: `0.70`).
  * *Fuel Budget Slider:* $0.0 \leftrightarrow 1.0$ (Default: `0.30`).
  * Dynamic visual percentage ratio bar connecting the two sliders.
* **Card 4: Environmental Layer Controls:**
  * Toggle checkboxes with colored legend badges:
    * `[X] Sea Ice Concentration Heatmap` (Gradient raster overlay).
    * `[X] Iceberg Drift Vectors & Uncertainty Cones` (Directional arrows).
    * `[X] BAS Synoptic Weather Stations` (Station pins with live popovers).
    * `[X] Composite Risk Lattice (0.25°)` (Navigation cost grid).
* **Primary Action Trigger:** Prominent, high-contrast **"Compute Optimal Route"** button with loading spinner and shortcut key hint (`⌘ Enter`).

#### 3. Center Hero Spatial Canvas (`PolarMap.tsx` — `flex-1`)
* **Map Engine:** MapLibre GL JS with custom polar stereographic / web mercator bathymetry vector tiles.
* **Rendered Visual Elements:**
  * **Recommended Route Line:** Solid **Sky-600** (`#0284C7`), 4px width, with subtle directional pulse animation.
  * **Direct Baseline Line:** Dashed **Slate-500** (`#64748B`), 2px width, showing the unadjusted geometric shortest track.
  * **Iceberg Markers:** Tabular polygons scaled to real nautical mile dimensions (`Length × Width`) with expanding forward uncertainty ellipses ($\sigma_{\parallel}, \sigma_{\perp}$).
  * **Weather Station Pins:** BAS station nodes displaying temperature and wind badges on hover.
  * **On-Map HUD Controls:** Compass rose orienter, zoom $\pm$ controls, coordinate reticle crosshair, and distance measuring ruler tool.

#### 4. Floating Action Dock (`FloatingActionDock.tsx`)
* **Position:** Elevated pill floating in the bottom-center of the map canvas.
* **Controls:**
  * *Time-Lapse Scrubber:* Fast-forward / rewind slider stepping through historical dates (2019 $\rightarrow$ 2022).
  * *Play / Pause Button:* Animates daily iceberg displacement vectors over time.
  * *Simulate Iceberg Surge Action:* Tactical trigger button with lightning bolt icon (`<Zap />`) to inject the live demo surge event.

#### 5. Right Bento Rail (`SituationalIntelRail.tsx` — `w-84` / `340px`)
* **Card 5: Environmental Intelligence Summary:**
  * Current sector weather conditions, ice freeze/melt phase indicator, and synoptic alert cards.
* **Card 6: Iceberg Proximity Radar List:**
  * Scrollable list of active icebergs sorted by distance to vessel:
    * `A68A`: `14.2 NM` | Status: `Drifting (0.8 km/d)` | Threat: `HIGH`
    * `A23A`: `58.0 NM` | Status: `Grounded` | Threat: `LOW`
    * `A64`: `92.4 NM` | Status: `Drifting (0.3 km/d)` | Threat: `MEDIUM`
* **Card 7: Selected Iceberg Inspector (Docked):**
  * Instant summary of the selected iceberg with a button to open the full slide-out detail drawer.

#### 6. Persistent Bottom Comparison Dock (`ComparisonDock.tsx`)
* **Position:** Fixed to the bottom viewport across the entire width.
* **Layout:** Dual comparison card strip dividing Recommended vs Direct stats:
  * **Recommended Corridor:** `ETA: 76.4h` | `Fuel Proxy: 104.2%` | `Distance: 1,084.5 NM` | `Risk: LOW (0.23)`
  * **Direct Shortest Track:** `ETA: 71.2h` | `Fuel Proxy: 100.0%` | `Distance: 982.0 NM` | `Risk: HIGH (0.79)`
* **Primary Trigger Button:** Large, high-visibility button: **"Why this route? (Explainable AI)"** with sparkle icon (`<Sparkles />`).
* **Export Action:** Secondary outline button: **"Export Passage Plan (GeoJSON / PDF)"**.

---

## 3. Screen 2: Route Multi-Alternative Comparison Studio

Accessible by clicking "Compare All Routes" from the comparison dock. Designed for in-depth voyage planning and multi-scenario trade-off analysis.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ROUTE MULTI-ALTERNATIVE COMPARISON STUDIO                                            [ CLOSE X ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐            │
│ │ ROUTE A (RECOMMENDED)   │ │ ROUTE B (DIRECT TRACK)  │ │ ROUTE C (FUEL SAVER)    │            │
│ │ Polaris Safe Corridor   │ │ Unadjusted Shortest     │ │ Open Pack Bypass        │            │
│ ├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤            │
│ │ Risk:     LOW (0.23)    │ │ Risk:     HIGH (0.79)   │ │ Risk:     MED (0.41)    │            │
│ │ ETA:      76.4 hrs      │ │ ETA:      71.2 hrs      │ │ ETA:      88.0 hrs      │            │
│ │ Fuel:     104.2%        │ │ Fuel:     100.0%        │ │ Fuel:     96.8%         │            │
│ │ Distance: 1,084.5 NM    │ │ Distance: 982.0 NM      │ │ Distance: 1,192.0 NM    │            │
│ │ [ SELECT THIS ROUTE ]   │ │ [ SELECT THIS ROUTE ]   │ │ [ SELECT THIS ROUTE ]   │            │
│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ MULTI-FACTOR TRADE-OFF RADAR & ATTRIBUTION BREAKDOWN                                            │
│                                                                                                 │
│  [ Visual Multi-Axis Radar Chart ]      [ Turn-by-Turn Waypoint Leg Table ]                     │
│  - Iceberg Collision Exposure (%)       Leg # | Waypoint | Lat/Lon | Heading | Dist | Risk      │
│  - Pack Ice Trap Probability (%)        01    | ROT-01   | -67.5°  | 042°    | 45NM | 0.12      │
│  - Severe Weather Impedance (%)         02    | BRN-02   | -65.2°  | 058°    | 82NM | 0.18      │
│  - Voyage Duration Delta (hrs)          03    | ELE-03   | -61.0°  | 076°    | 120NM| 0.24      │
│  - Bunker Fuel Proxy (%)                04    | GRY-END  | -54.2°  | 090°    | 95NM | 0.08      │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Screen 2 Components & Interior Widgets:
1. **Three-Column Alternative Cards:** Side-by-side cards comparing Route A (Optimal Safe), Route B (Direct Shortest), and Route C (Eco Fuel-Saver).
2. **Multi-Axis Radar Comparison Chart:** Visualizing 5 operational dimensions (Iceberg Avoidance, Sea Ice Safety, Weather Comfort, Fuel Efficiency, Time to Destination).
3. **Turn-by-Turn Waypoint Leg Matrix:** Expandable data table listing every intermediate navigation waypoint, true heading, leg distance, required speed, and segment risk.

---

## 4. Screen 3: Explainable AI (XAI) Attribution Modal (`XAIModal.tsx`)

The central differentiator of POLARIS-X. Converts complex mathematical optimization into transparent, plain-language justification.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ EXPLAINABLE AI: ROUTE RECOMMENDATION ATTRIBUTION                                     [ CLOSE X ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ EXECUTIVE DECISION NARRATIVE                                                                    │
│ "Route A (Recommended) is selected over the direct track because it detours north through the    │
│ Bransfield Strait, reducing predicted iceberg collision hazard exposure by 68% and avoiding    │
│ the active drift corridor of tabular iceberg A68A, at an operational cost of +102.5 NM          │
│ (+4.2% estimated bunker fuel)."                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ QUANTITATIVE HAZARD & COST DECOMPOSITION WATERFALL                                              │
│                                                                                                 │
│  [ -68.4% ]  Iceberg Collision Risk Avoided  ████████████████████████ (Major Factor)            │
│  [ -32.1% ]  Heavy Pack Ice Exposure Reduced ███████████                                        │
│  [ -14.5% ]  Adverse Wind & Storm Impedance  █████                                              │
│  [  +6.2% ]  Voyage Duration Delta (+5.2 hrs)░░                                                 │
│  [  +4.2% ]  Bunker Fuel Detour Cost         ░                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SENSOR PROVENANCE & FORECAST CONFIDENCE AUDIT                                                   │
│ • Model Confidence Index: 87% (High)                                                            │
│ • Satellite Sensor Feeds: MetOp ASCAT (2021-03-14), QuikSCAT SeaWinds, NIC Weekly Report #108   │
│ • Synoptic Meteorology: 5 BAS Weather Stations online (Rothera, Signy, Grytviken active)        │
│ • Data Freshness Flag: VALIDATED OPERATIONAL OBSERVATIONS                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Screen 3 Components:
* **Executive Decision Narrative:** Clear, unambiguous prose explaining the operational reason for the detour.
* **Hazard Waterfall Chart:** Saturated horizontal bars contrasting risk reductions against economic penalties.
* **Sensor Provenance Audit:** Complete data lineage showing exact satellite pass times and meteorological station health.

---

## 5. Screen 4: Dynamic Rerouting & Simulation Sandbox

The live demonstration highlight. Allows operators to inject hazards and observe instant path deflection and alert handling.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LIVE SIMULATION & DYNAMIC REROUTE SANDBOX                                            [ RESET ↺ ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HAZARD INJECTION CONTROLS                                                                       │
│ Target Iceberg: [ Iceberg A68A (82 NM) ▼ ]   Drift Speed Multiplier: [ 2.5x ▼ ]                 │
│ Surge Heading:  [ 045° (Northeast)     ▼ ]   [ TRIGGER DYNAMIC SURGE EVENT ]                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ REAL-TIME INCIDENT EVENT LOG & TELEMETRY SHIFT                                                  │
│                                                                                                 │
│ 12:42:01 [ALERT] Iceberg A68A drift vector accelerated (0.8 km/d -> 2.1 km/d).                  │
│ 12:42:02 [CRITICAL] Projected iceberg trajectory intersects active corridor in 14.2 hours.       │
│ 12:42:03 [OPTIMIZER] Re-running A* pathfinder on updated dynamic risk grid.                     │
│ 12:42:03 [REROUTE] New safe passage calculated. Diverted 34 NM northeast of hazard cone.        │
│                                                                                                 │
│ OLD ROUTE: Risk: 0.88 (CRITICAL) | Fuel: 104.2% | ETA: 76.4h                                    │
│ NEW ROUTE: Risk: 0.26 (LOW)      | Fuel: 107.8% | ETA: 79.1h (+2.7h adjustment)                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Screen 5: Historical Passage Replay & Climate Analytics Dashboard

Dedicated to mission planners and scientific researchers for backtesting and long-term sea-ice trend analysis.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HISTORICAL PASSAGE REPLAY & ANTARCTIC SEA-ICE CLIMATE ANALYTICS                      [ CLOSE X ] │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HISTORICAL DRIFT REPLAY (2019 - 2022)                                                           │
│ [ |<< ] [ << ] [ PLAY ▶ ] [ >> ] [ >>| ]   Active Date: 2020-11-15 (Day 320)                    │
│ [====================================●==============================] (Progress: 64%)           │
│ Historical Episode: "Iceberg A68A Approach & Breakup at South Georgia Shelf"                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LONG-TERM ANTARCTIC SEA-ICE EXTENT ANOMALY (1980 - 2026 NSIDC CLIMATE CURVE)                    │
│                                                                                                 │
│ 20M km² ┼                                      ╭──╮             ╭──╮   (September Maximum)      │
│         │                             ╭───────╯    ╰───╮       ╭╯  ╰╮                           │
│ 10M km² ┼                            ╭╯                ╰───────╯    ╰╮                          │
│         │  ╭──╮             ╭───────╯                                 ╰╮                        │
│  2M km² ┼──╯  ╰─────────────╯                                          ╰── (February Minimum)   │
│         └──┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴                  │
│           1980  1985  1990  1995  2000  2005  2010  2015  2020  2025                            │
│ Current Extent: 4.82M km² | 40-Year Mean: 5.12M km² | Seasonal Phase: Summer Retreat            │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Screen 6: Contextual Iceberg Inspector & Vessel Spec Drawer

A contextual slide-out drawer (`IcebergDrawer.tsx`) anchored to the right rail, opening when an iceberg marker or vessel profile is clicked.

```
┌──────────────────────────────────────────────────┐
│ ICEBERG TELEMETRY INSPECTOR            [ CLOSE X ]│
├──────────────────────────────────────────────────┤
│ TARGET IDENTIFIER: ICEBERG A68A                  │
│ Category: Tabular Mega-Iceberg                   │
│ Calving Origin: Larsen C Ice Shelf (July 2017)   │
├──────────────────────────────────────────────────┤
│ PHYSICAL DIMENSIONS & RADAR SIGNATURE            │
│ • Length:        82.0 Nautical Miles (151.8 km)  │
│ • Width:         26.0 Nautical Miles (48.1 km)   │
│ • Surface Area:  1,116.79 sq km                  │
│ • Freeboard:     ~30 meters (Est. Draft: 220m)   │
├──────────────────────────────────────────────────┤
│ KINEMATICS & DRIFT DYNAMICS                      │
│ • Daily Displacement: 0.86 km/day                │
│ • Current Heading:    048.5° (Northeast)         │
│ • Operational Status: Actively Drifting          │
│ • Hazard Radius:      18.5 NM Buffer Zone        │
├──────────────────────────────────────────────────┤
│ OBSERVATIONAL LINEAGE                            │
│ • Tracking Agency:    BYU Center for Remote Sens │
│ • Scatterometer:      MetOp ASCAT Radar          │
│ • Last Verification:  2021-04-12                 │
│ • Sensor Quality:     Verified High Confidence   │
└──────────────────────────────────────────────────┘
```

---

## 8. Mobile & Tablet Ergonomics Blueprint (/mobile-ergonomics)

```
┌───────────────────────────────┐
│ [=] POLARIS-X      UTC: 12:40 │  <- Compact Header (44px)
├───────────────────────────────┤
│                               │
│                               │
│     FULL-BLEED POLAR MAP      │  <- Dominant Viewport Canvas
│     (MapLibre WebGL Touch)    │
│                               │
│                               │
├───────────────────────────────┤
│ ┌───────────────────────────┐ │  <- Bottom Slide-Up Sheet (Thumb Zone)
│ │ ROUTE: ROT -> GRY (PC-5)  │ │     - Touch Target >= 44x44px
│ │ ETA: 76.4h | Fuel: 104.2% │ │     - Safe Area Inset Handling
│ │ Risk: LOW (0.23)          │ │     - Spring Drag-to-Expand
│ │ [ WHY THIS ROUTE? (XAI) ] │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

---

## 9. Pre-Flight Design System Checklist

- [x] **No Neon / No Sci-Fi HUD:** Strictly daylight-readable Slate 50 (`#F8FAFC`), Pure White (`#FFFFFF`), Slate 200 (`#E2E8F0`), and Sky 600 (`#0284C7`).
- [x] **Proportional Nested Radii:** 16px outer rails $\to$ 12px cards $\to$ 8px buttons $\to$ full pills.
- [x] **Tabular Numeric Alignment:** `tabular-nums font-mono` applied across all GPS coordinates, ETAs, fuel percentages, and barometric readings.
- [x] **High-Contrast Accessible Badges:** 10-100-20 semantic formula for Low (Sage), Medium (Amber), and High (Crimson) risk tags.
- [x] **Fluid Micro-Interactions:** Framer Motion spring physics (`stiffness: 350, damping: 25`) across all drawer and modal transitions.

*Document compiled and verified for POLARIS-X UI/UX execution.*
