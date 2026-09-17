# Product Requirements Document (PRD)
## POLARIS-X: Polar Operational Logistics, Ice Risk & Intelligent Routing System
### Problem Statement ID: 26059 — Ministry of Earth Sciences (MoES) / National Centre for Polar and Ocean Research (NCPOR)

---

## 1. Executive Summary & Vision

### 1.1 Product Vision
**POLARIS-X** is an enterprise-grade, explainable AI maritime navigation decision-support platform designed for polar research vessels and expedition logistics in Antarctic waters. By fusing historical and observational satellite scatterometer tracking, National Ice Center (NIC) iceberg reports, British Antarctic Survey (BAS) surface meteorology, and seasonal sea-ice climate trends, POLARIS-X generates a dynamic spatial risk field to compute safe, fuel-aware, and mission-optimized navigation routes.

### 1.2 Core Philosophy: Decision Support over Automation
* **Human-in-the-Loop:** POLARIS-X is not an autonomous captain or vessel auto-pilot. It is an intelligent advisory layer that equips navigation officers and mission planners with data-backed route alternatives, transparent risk trade-offs, and clear explanations.
* **Observe $\rightarrow$ Forecast $\rightarrow$ Predict $\rightarrow$ Simulate $\rightarrow$ Optimize $\rightarrow$ Explain $\rightarrow$ Alert**

---

## 2. Problem Statement & Stakeholders

### 2.1 The Operational Problem
Polar navigation in Antarctica (notably the Antarctic Peninsula, Weddell Sea, and Scotia Sea / "Iceberg Alley" corridor) faces extreme environmental hazards:
1. **Dynamic Sea Ice:** Concentration, multi-year pack boundaries, and floe fragmentation shift rapidly under synoptic weather.
2. **Tabular Icebergs:** Multi-billion ton icebergs (e.g., A68A, A23A) drift unpredictably driven by deep ocean currents, surface winds, and Coriolis forces.
3. **Severe Meteorology:** Violent polar lows, sub-zero katabatic windstorms, and sudden pressure drops create hazardous icing conditions.
4. **Conflicting Mission Objectives:** The shortest geometric path often passes directly through dangerous iceberg drift fields or heavy ice pack, leading to vessel entrapment, severe hull damage, or excessive fuel burn.

### 2.2 User Personas & Target Audiences

| Persona | Role | Primary Objective | Key Jobs to be Done (JTBD) |
|---|---|---|---|
| **Vessel Captain / Bridge Officer** | Vessel Master on research vessels (*MV Vasiliy Golovnin*) | Real-time passage safety & obstacle avoidance | Inspect active iceberg drift fields, evaluate recommended route vs shortest path, understand *why* a detour is needed. |
| **NCPOR Mission Planner** | Polar Expedition Operations Lead | Voyage logistics, seasonal scheduling, fuel budgeting | Estimate voyage duration (ETA), evaluate ice-class constraints, optimize multi-station transit (Maitri / Bharati / Rothera). |
| **Marine Logistics Officer** | Fleet Manager | Bunker fuel optimization & asset risk management | Minimize fuel consumption proxy, avoid extreme storm impedance, record compliance logs. |
| **Scientific Field Researcher** | Expedition Scientist | Accessing field deployment sites reliably | Timely arrivals at measurement waypoints with predictable weather windows. |

---

## 3. Scope, Goals & Non-Goals

### 3.1 MVP Goals (Phase 1 Deliverables)
* **Ingestion & Standardization Pipeline:** Ingest and normalize BYU iceberg kinematics, NIC weekly reports, BAS meteorological station datastreams, and NSIDC monthly sea-ice extent.
* **Dynamic Composite Risk Grid ($R(x, y, t)$):** Compute a continuous spatial lattice over the Golden Demo Corridor (`-78°S` to `-54°S`, `-75°W` to `-25°W`) combining sea-ice risk ($w_{ice}=0.45$), iceberg collision risk ($w_{berg}=0.40$), and meteorological impedance ($w_{wx}=0.15$).
* **Multi-Objective $A^*$ Pathfinding:** Calculate an optimal safe corridor alongside a direct shortest track baseline between departure and destination.
* **Marine Operational Metrics:** Real-time computation of ETA (hours), fuel consumption proxy (%), voyage distance (NM), and composite risk score ($0.0 - 1.0$).
* **Explainable AI (XAI) Attribution Engine:** Generate clear natural-language rationale decomposing the exact hazard trade-offs (e.g. *"-68% iceberg hazard exposure for +4.2% fuel detour"*).
* **Live Dynamic Rerouting Simulation:** Demonstrate real-time response when an iceberg surges into the planned corridor, recalculating the path and alerting the operator.
* **Production-Grade Maritime Console:** High-legibility, executive daylight UI built with Next.js 14 App Router, Tailwind CSS, and MapLibre GL.

### 3.2 Non-Goals & Out-of-Scope Boundaries
* **Autonomous Vessel Steering:** No direct hardware integration with autopilot, helm thrusters, or rudder controllers.
* **Legally Certified Safety Guarantees:** POLARIS-X is an advisory platform; navigational responsibility strictly remains with the vessel master.
* **Global Real-Time Synthetic Aperture Radar (SAR) Pipeline:** MVP utilizes validated operational historical and near-real datasets rather than real-time raw satellite downlink pipelines.
* **Multi-Vessel Fleet Collision Coordination:** Multi-ship tactical deconfliction is reserved for future enterprise phases.

---

## 4. Vessel Models & Marine Physics Specifications

POLARIS-X supports **3 configurable polar vessel classes** reflecting IACS Polar Class standards and Indian Antarctic Program chartered expeditions:

```
                                  POLARIS-X VESSEL SPECIFICATIONS
+-----------------------+-----------------------+-----------------------+-----------------------+
| Parameter             | Class 1: Research PRV | Class 2: Heavy Polar  | Class 3: Commercial   |
|                       | (e.g. Vasiliy Golovnin) | Icebreaker (PC-2)     | Non-Ice Class (Cargo) |
+-----------------------+-----------------------+-----------------------+-----------------------+
| Polar Class Rating    | PC-5 / Arc5           | PC-2 / Icebreaker     | Non-Ice Class         |
| Max Safe Ice Conc.    | 70% First-Year Ice    | 100% Multi-Year Ice   | 15% Open Pack Only    |
| Hull Resistance Coeff | 1.8                   | 1.0 (Cleaves Pack)    | 4.5 (High Trap Risk)  |
| Cruising Speed        | 14.0 knots            | 16.5 knots            | 12.0 knots            |
| Engine Power          | 12,500 kW             | 36,000 kW             | 8,000 kW              |
| Base Fuel Rate        | 28 tons/day           | 65 tons/day           | 20 tons/day           |
| Risk Multiplier       | 1.0 (Baseline)        | 0.55 (High Resilience)| 2.8 (Severe Risk)     |
+-----------------------+-----------------------+-----------------------+-----------------------+
```

### 4.1 Speed Degradation Model
Effective vessel speed degrades non-linearly with ice concentration and meteorological impedance:
$$V_{effective} = V_{cruising} \cdot \max\left(0.20, \; 1 - K_{hull} \cdot (R_{ice})^{1.8}\right) \cdot \left(1 - 0.25 \cdot R_{wx}\right)$$

### 4.2 Fuel Consumption Proxy Model
Fuel consumed is a cubic function of effective speed plus icebreaking resistance:
$$\text{Fuel Proxy}_{\%} = 100 \times \sum_{k=0}^{n-1} \left[ \left(\frac{V_{effective}}{V_{cruising}}\right)^3 \cdot \left(1 + K_{hull} \cdot R_{ice}(v_k)\right) \cdot \Delta t_k \right] \Big/ \text{Fuel}_{open\_water}$$

---

## 5. Functional Requirements Matrix

### 5.1 Intelligence Engines

| ID | Feature | Engine / Module | Priority | Description |
|---|---|---|---|---|
| **FR-01** | Seasonal Ice Baseline | **IceCast** | P0 | Computes regional sea-ice anomaly and seasonal baseline risk from NSIDC monthly extent data. |
| **FR-02** | Iceberg Drift Tracking | **BergTrack AI** | P0 | Ingests BYU stats kinematics (`disp`, `vel_angle`, `lat`, `lon`) and NIC dimensions to render active iceberg positions. |
| **FR-03** | Uncertainty Corridor | **BergTrack AI** | P1 | Generates anisotropic forward uncertainty ellipses along predicted iceberg drift vectors ($\sigma_{\parallel}, \sigma_{\perp}$). |
| **FR-04** | Synoptic Weather Risk | **RiskEngine** | P0 | Interpolates BAS station observations (wind speed, barometric pressure) using Inverse Distance Weighting (IDW). |
| **FR-05** | Composite Risk Grid | **RiskEngine** | P0 | Evaluates $R(x, y, t) = 0.45 R_{ice} + 0.40 R_{berg} + 0.15 R_{wx}$ across the $0.25^\circ \times 0.25^\circ$ marine lattice. |
| **FR-06** | Multi-Objective Pathfinding | **PolarRoute** | P0 | Computes lowest-cost navigable route using $A^*$ with Great-Circle Haversine heuristics and non-linear risk aversion ($\gamma=2.0$). |
| **FR-07** | Counterfactual Route Diff | **PolarRoute** | P0 | Generates side-by-side comparative metrics between Recommended Route and Unadjusted Direct Shortest Track. |
| **FR-08** | Explainable AI Breakdown | **XAI Layer** | P0 | Translates mathematical risk differentials into structured, natural-language operational justification. |
| **FR-09** | Dynamic Reroute Simulation | **Simulation** | P1 | Allows operators to inject sudden iceberg surges or storms, triggering real-time route diversion and alert banners. |

### 5.2 User Interface & Console Features

| ID | Feature | Component | Priority | Description |
|---|---|---|---|---|
| **UI-01** | Polar Map Viewport | `PolarMap.tsx` | P0 | Full-bleed MapLibre GL map centered on Antarctic Peninsula with custom vector bathymetry and route overlays. |
| **UI-02** | Top Telemetry Strip | `TelemetryStrip.tsx` | P0 | HUD displaying coordinates, pack ice extent, barometric pressure, and active iceberg tally with `tabular-nums`. |
| **UI-03** | Route Configurator | `RoutePlanner.tsx` | P0 | Interactive departure/destination waypoint pickers, vessel ice-class selector, and optimization weighting sliders. |
| **UI-04** | Iceberg Risk Inspector | `IcebergDrawer.tsx` | P1 | Contextual slide-out drawer displaying physical dimensions, daily drift rate, and tracking history of selected icebergs. |
| **UI-05** | Persistent Comparison Dock | `ComparisonDock.tsx` | P0 | Pinned bottom strip showing Recommended vs Direct stats (ETA, Fuel %, Distance, Risk) and the "Why this route?" button. |
| **UI-06** | Explainable AI Modal | `XAIModal.tsx` | P0 | High-contrast breakdown dialog decomposing hazard avoidance percentages and fuel trade-offs. |

---

## 6. Non-Functional Requirements (NFRs)

* **Performance & Core Web Vitals:**
  * **Largest Contentful Paint (LCP):** $\le 2.0\text{ seconds}$ on broadband and 4G connections.
  * **Cumulative Layout Shift (CLS):** $\le 0.05$ through reserved skeleton placeholders.
  * **Interaction to Next Paint (INP):** $\le 150\text{ ms}$ for responsive UI interactions.
  * **Routing Latency:** Pathfinding calculation complete in $\le 250\text{ ms}$ for a $200 \times 200$ grid.
* **Security & Defense Hardening:** Zero-trust runtime schema validation on all API endpoints; geographic coordinate bounds strictly locked to valid polar regions.
* **Accessibility (a11y):** All text and status badges meet WCAG AA (4.5:1) minimum contrast ratios; all interactive controls maintain $44 \times 44\text{ px}$ touch targets.
* **Reliability & Error Boundaries:** Subtree React error boundaries isolate canvas/routing errors; unauthenticated `/api/health` probes monitor uptime and latency.

---

## 7. Success Criteria & Evaluation Metrics

1. **Operational Safety Gain:** Recommended routes must demonstrate a measurable **$\ge 50\%$ reduction** in iceberg collision hazard exposure compared to naive shortest routes.
2. **Economic Feasibility:** The safety gain must be achieved within a reasonable fuel detour budget (typically **$\le 8\%$ additional fuel proxy**).
3. **Transparency & Trust:** 100% of generated routes must provide a coherent, natural-language explanation detailing which hazards prompted the recommendation.
4. **Live Demonstration Impact:** The live 5-act demonstration script successfully illustrates dynamic rerouting with instant visual and tabular feedback.
