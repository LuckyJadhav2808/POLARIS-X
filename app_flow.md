# Application Flow & State Machine Specification
## POLARIS-X: Polar Operational Logistics, Ice Risk & Intelligent Routing System

---

## 1. High-Level Request & Component Architecture

Following **/enterprise-ui-layout-catalog** (Cockpit Command Center HUD) and **/spatial-layout-bento-design**:

```
Next.js 14+ Frontend (React Server Components + Client Leaf Map Canvas)
             │
             │ REST (JSON Envelope)
             ▼
        FastAPI Backend Core (/api/route, /api/layers, /api/simulate-reroute)
             │
      ┌──────┼────────────────────────┐
      ▼      ▼                        ▼
   IceCast BergTrack AI          RiskEngine
   (Trends) (Kinematics & Drift) (IDW Spatial Lattice)
      │      │                        │
      └──────┼────────────────────────┘
             ▼
       PolarRoute Optimizer (A* with Multi-Objective Cost & Heuristics)
             ▼
       Explainable AI (XAI Attribution Engine)
             ▼
       Standardized GeoJSON Payload + ETA/Fuel Metrics
             ▼
   Next.js Executive Console & Persistent Comparison Dock
```

---

## 2. Primary 9-Step User Journey (Bridge Officer Flow)

### Step 1 — Console Initialization & Situational Awareness
* User lands on the clean, daylight-readable **Map Console**.
* The MapLibre viewport renders the Antarctic Peninsula / Weddell Sea corridor (`-78°S` to `-54°S`, `-75°W` to `-25°W`).
* Active environmental layers load:
  * NSIDC seasonal ice baseline background.
  * Active tracked icebergs (A68A, A23A) with initial velocity drift vectors.
  * British Antarctic Survey (BAS) meteorological stations (Rothera, Grytviken, Signy, Halley).
* The **Top Telemetry Strip** displays real-time coordinates, barometric pressure, wind speed, and active iceberg tally with `tabular-nums`.

### Step 2 — Select Departure Station
* User selects the departure point from the preset waypoint list or clicks directly on the map canvas (e.g., **Rothera Station**, Lat `-67.57°S`, Lon `-68.12°W`).
* A Sky-600 pin anchors on the map with a subtle tactile focus state.

### Step 3 — Select Destination Station
* User selects the target destination (e.g., **Grytviken / South Georgia**, Lat `-54.28°S`, Lon `-36.48°W`).
* The system validates that both coordinates fall within the authorized Antarctic navigation corridor.

### Step 4 — Vessel Profile & Weighting Calibration
* User configures the vessel ice-class (e.g., `Class 1: Research PRV / PC-5 - MV Vasiliy Golovnin`).
* User tunes the optimization sliders:
  * **Safety Priority:** `0.70` (default)
  * **Fuel Priority:** `0.30` (default)

### Step 5 — Corridor Hazard Evaluation
* The user clicks **"Find Optimal Route"**.
* A tactile loading skeleton animates in the comparison dock ($< 200\text{ ms}$).
* The backend computes the dynamic composite risk grid $R(x, y, t)$ across the marine lattice.

### Step 6 — Route Computation & Simultaneous Visualization
* The backend returns the optimal route and the unadjusted direct shortest track.
* MapLibre dynamically draws both vectors simultaneously:
  * **Recommended Route:** Solid **Sky-600** line (4px width).
  * **Direct Shortest Track:** Dashed **Slate-500** line (2px width).
* Iceberg collision danger buffers expand visually along active drift paths.

### Step 7 — Side-by-Side Telemetry Comparison
* The **Persistent Comparison Dock** at the bottom of the screen populates immediately:
  * **Recommended Corridor:** `ETA: 76.4h` | `Fuel: 104.2%` | `Dist: 1,084 NM` | `Risk: LOW (0.23)`
  * **Direct Shortest Track:** `ETA: 71.2h` | `Fuel: 100.0%` | `Dist: 982 NM` | `Risk: HIGH (0.79)`

### Step 8 — Explainable AI (XAI) Attribution Breakdown
* User clicks the prominent **"Why this route?"** button in the dock.
* A high-contrast modal dialog opens with a full decomposition:
  * *"Route B is recommended because it detours north through the Bransfield Strait, reducing iceberg collision hazard exposure by 68% and avoiding the active drift field of iceberg A68A, at a trade-off of +102.5 NM (+4.2% estimated fuel)."*
  * Confidence index: `87%` (based on validated BYU scatterometer and BAS synoptic data).

### Step 9 — Live Dynamic Rerouting Demonstration (The Winning Demo Moment)
* Operator triggers the **"Simulate Iceberg Surge"** action from the floating dock.
* Iceberg A68A accelerates into the planned route corridor.
* In real-time:
  1. An amber/crimson collision warning flashes: *"Hazard Alert: Iceberg A68A trajectory intersects planned corridor in 14h."*
  2. The $A^*$ optimizer dynamically recalculates a detour.
  3. The previous route fades into a muted ghost-line as the new safe path draws in.
  4. The comparison dock updates metrics and the XAI modal updates the operational rationale.

---

## 3. Finite State Machine (FSM) Diagram

```
                 +-------------------------------------------------+
                 |                STATE: IDLE_MAP                  |
                 | - Antarctic map centered on Golden Corridor     |
                 | - Baseline environmental layers active          |
                 +------------------------+------------------------+
                                          |
                         Select Departure & Destination
                                          |
                                          v
                 +-------------------------------------------------+
                 |              STATE: CORRIDOR_EVAL               |
                 | - Coordinate bounds validation                  |
                 | - Vessel ice-class selected (PC-5)              |
                 +------------------------+------------------------+
                                          |
                               Click "Find Route"
                                          |
                                          v
                 +-------------------------------------------------+
                 |              STATE: ROUTE_COMPUTED              |
                 | - A* pathfinding completed                      |
                 | - Render Recommended (Solid) vs Direct (Dashed) |
                 | - Comparison Dock populates ETA/Fuel/Risk       |
                 +------------------------+------------------------+
                                          |
                   +----------------------+----------------------+
                   |                                             |
        Click "Why this route?"                        Trigger "Simulate Surge"
                   |                                             |
                   v                                             v
+--------------------------------------+      +--------------------------------------+
|        STATE: XAI_MODAL_OPEN         |      |        STATE: DYNAMIC_REROUTE        |
| - Hazard avoidance breakdown (-68%)  |      | - Collision corridor alert active    |
| - Distance & fuel delta (+4.2%)      |      | - Real-time route vector deflection  |
| - Confidence indicator (87%)         |      | - Comparison Dock metrics refreshed  |
+--------------------------------------+      +--------------------------------------+
```

---

## 4. Responsive Viewport Transitions (/mobile-ergonomics)

* **Desktop ($\ge 1024\text{px}$):** Multi-pane Cockpit layout (Left route configurator + Center hero map + Right iceberg inspector + Bottom comparison dock).
* **Mobile / Touch Tablet ($< 1024\text{px}$):**
  * Center map remains full-bleed.
  * Side rails collapse into an ergonomic bottom slide-up drawer (`Drawer`) anchored in the thumb zone.
  * Touch targets strictly $\ge 44 \times 44\text{ px}$ (`min-h-[44px] min-w-[44px]`).
  * Bottom comparison strip uses safe area insets: `padding-bottom: max(16px, env(safe-area-inset-bottom, 16px))`.

---

## 5. Error & Edge Case Resilience (/production-grade-engineering)

| Scenario | System Behavior & Fallback |
|---|---|
| **Coordinates Out of Bounds** | Modal alert with precise allowed range: *"Coordinates must fall within the Antarctic coverage corridor (-78.0°S to -52.0°S)."* No crash. |
| **No Navigable Path (Blocked Corridor)** | Returns `NO_VIABLE_PATH` status with guidance: *"All paths exceed maximum safe ice concentration (70%) for PC-5 hull. Relax risk threshold or select an icebreaker vessel profile."* |
| **Stale Station Meteorology** | Inactive weather stations display an `'unavailable'` flag and gracefully fall back to regional climatological averages without interrupting routing. |
