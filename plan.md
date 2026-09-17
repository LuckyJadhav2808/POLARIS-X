# POLARIS-X: Senior Engineering Production Roadmap & Implementation Plan
## End-to-End Engineering Plan: From Clean Slate to Production Release
### Problem Statement ID: 26059 — MoES / NCPOR | System: POLARIS-X

---

## 1. Senior Developer Strategy & Architectural Principles

As a Senior/Principal Systems Architect building an enterprise-grade polar navigation decision-support platform, the engineering strategy follows five strict non-negotiable principles:

1. **Data & Physics First, UI Second:** A dazzling maritime dashboard is worthless if the underlying geospatial grid, iceberg drift vectors, and $A^*$ cost calculations are mocked or flawed. We establish the mathematical and data foundation first.
2. **Deterministic & Fast Execution:** Routing across a $200 \times 200$ marine grid must execute in $< 200\text{ ms}$ to support fluid live rerouting and time-lapse simulations.
3. **Decoupled 3-Tier Layering:** Zero coupling between the UI transport layer, the navigation/physics engines, and the database/data loaders.
4. **Zero-Trust Security & AppSec by Default:** Strict runtime boundary checks (coordinate validation, payload schema parsing, masked error logs, `/api/health` probes).
5. **Executive Production Polish (No Sci-Fi / No Neon):** A clean, high-contrast Slate/White/Sky design system built for daylight bridge consoles, compliant with WCAG AA/AAA standards and sub-second Core Web Vitals.

---

## 2. Master Phase Breakdown & Implementation Timeline

```
+-----------------------------------------------------------------------------------------+
|                                MASTER EXECUTION PIPELINE                                |
+-----------------------------------------------------------------------------------------+
| PHASE 0: Workspace Scaffolding, Environment & Design System Setup                       |
|          -> Directory structure, Next.js 14 + Tailwind, FastAPI boilerplate, Env schemas|
+-----------------------------------------------------------------------------------------+
| PHASE 1: Golden Corridor Data ETL & Spatial Risk Grid Engine                            |
|          -> Parse BYU stats, NIC reports, BAS stations; 2D discrete lattice & IDW       |
+-----------------------------------------------------------------------------------------+
| PHASE 2: Multi-Objective PolarRoute Pathfinder & Marine Physics                         |
|          -> 8-connected grid graph, A* algorithm, Polar Class PC-5 / PC-2 vessel models |
+-----------------------------------------------------------------------------------------+
| PHASE 3: Explainable AI (XAI) Attribution & Dynamic Rerouting Engine                    |
|          -> Hazard differential decomposition, natural language justification, surges   |
+-----------------------------------------------------------------------------------------+
| PHASE 4: FastAPI REST API & AppSec Hardening                                            |
|          -> /api/route, /api/layers, /api/simulate-reroute, /api/health, Pydantic v2    |
+-----------------------------------------------------------------------------------------+
| PHASE 5: Executive Maritime Bento Console (Next.js Frontend)                            |
|          -> MapLibre GL polar canvas, Cockpit HUD, Bento rails, Comparison Dock, XAI    |
+-----------------------------------------------------------------------------------------+
| PHASE 6: End-to-End Integration, Automated QA & Verification                            |
|          -> Pytest math/API tests, Playwright E2E 5-act user journey, CLS/INP profiling |
+-----------------------------------------------------------------------------------------+
| PHASE 7: Production Hardening, Dockerization & Final Polish                             |
|          -> Multi-stage Docker, healthcheck probes, structured logging, documentation   |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Detailed Step-by-Step Sprint Execution Plan

### Phase 0: Workspace Scaffolding & Environment Lockdown
* **Goal:** Initialize isolated backend and frontend workspaces with unified configuration, environment variable validation, and design tokens.
* **Tasks:**
  1. Initialize `backend/` Python environment with `requirements.txt` (`fastapi`, `uvicorn`, `pydantic`, `pandas`, `numpy`, `scipy`, `shapely`, `geopandas`, `networkx`, `pytest`, `httpx`).
  2. Initialize `frontend/` Next.js 14 App Router project with TypeScript, Tailwind CSS, and Lucide React.
  3. Configure `frontend/tailwind.config.ts` with the **Executive Maritime Enterprise Palette** (`slate-50` canvas, pure white cards, `slate-200` borders, `slate-900` text, `sky-600` primary accent, and 10-100-20 semantic risk tokens).
  4. Set up runtime environment validation with Zod (`src/lib/env.ts`) and Pydantic Settings (`app/core/config.py`).
* **Deliverables:** Working backend FastAPI server and Next.js frontend with clean typography (`Space Grotesk`, `Inter`, `IBM Plex Mono`).

---

### Phase 1: Golden Corridor Data ETL & Spatial Risk Grid Engine
* **Goal:** Extract and structure historical datasets into an active spatial risk lattice over the Golden Demo Corridor (`-78°S` to `-54°S`, `-75°W` to `-25°W`).
* **Tasks:**
  1. Build `app/data/loaders.py`:
     * Extract and parse `stats_database_v7.1.zip` for icebergs **A68A**, **A23A**, and **A64** (converting Julian `YYYYDDD` to dates, extracting `lat`, `lon`, `disp`, `vel_angle`, `size`).
     * Extract and parse `archive.zip` (NIC weekly reports) for physical dimensions (`Length (NM)`, `Width (NM)`, grounded vs drifting remarks).
     * Extract and parse `surface_met.zip` for British Antarctic Survey stations (Rothera, Grytviken, Signy, Faraday/Vernadsky, Halley), handling `-999` null encodings.
     * Extract `monthly-sea-ice-extent-in-the-antarctic.csv` for baseline climate anomaly calculation.
  2. Build `app/engines/risk_grid.py`:
     * Discretize the navigation domain into a $0.25^\circ \times 0.25^\circ$ marine lattice.
     * Implement Inverse Distance Weighting (IDW) for station wind speed and barometric storm risk ($R_{wx}$).
     * Implement Gaussian anisotropic iceberg collision risk fields with velocity heading elongation ($R_{berg}$).
     * Combine into composite risk field: $R(x, y, t) = 0.45 R_{ice} + 0.40 R_{berg} + 0.15 R_{wx}$.
* **Deliverables:** Cached in-memory 2D spatial risk grid and GeoJSON feature collections for map rendering.

---

### Phase 2: Multi-Objective PolarRoute Pathfinder & Marine Physics
* **Goal:** Implement the risk-aware $A^*$ routing engine with realistic polar vessel dynamics.
* **Tasks:**
  1. Build `app/engines/polar_route.py`:
     * Construct an 8-connected grid graph over navigable ocean cells (pruning landmasses and hard iceberg barriers).
     * Implement geodesic Haversine distance heuristics for admissible, monotonic $A^*$ pathfinding.
     * Apply the non-linear risk cost function:
       $$\mathcal{C}(u, v, t) = \Delta D(u, v) \cdot \left[ 1 + \beta_{risk} \cdot R(v, t)^\gamma + \beta_{ice} \cdot R_{ice}(v, t) \right]$$
       *(with $\beta_{risk}=8.0, \gamma=2.0$).*
  2. Build `app/core/vessel_physics.py`:
     * Implement IACS vessel profiles (Class 1 PRV *Vasiliy Golovnin* PC-5, Class 2 Heavy Icebreaker PC-2, Class 3 Commercial Non-Ice Class).
     * Calculate effective speed degradation:
       $$V_{effective} = V_{cruising} \cdot \max\left(0.20, \; 1 - K_{hull} \cdot R_{ice}^{1.8}\right) \cdot \left(1 - 0.25 \cdot R_{wx}\right)$$
     * Calculate cubic fuel consumption proxy (% vs open water baseline) and voyage duration (ETA in hours).
  3. Generate unadjusted Direct Shortest Track as a counterfactual baseline.
* **Deliverables:** Route optimizer producing valid GeoJSON LineStrings, ETAs, Fuel %, and Risk scores between Rothera and Grytviken in $< 150\text{ ms}$.

---

### Phase 3: Explainable AI (XAI) Engine & Dynamic Rerouting Simulator
* **Goal:** Equip POLARIS-X with natural-language decision justification and live reroute capabilities.
* **Tasks:**
  1. Build `app/services/xai.py`:
     * Compare Recommended Route against Direct Shortest Track:
       $$\Delta \text{BergRisk} = \frac{\bar{R}_{berg}^{direct} - \bar{R}_{berg}^{rec}}{\bar{R}_{berg}^{direct}} \times 100\%$$
       $$\Delta \text{Distance} = \frac{D_{rec} - D_{direct}}{D_{direct}} \times 100\%, \quad \Delta \text{Fuel} = \frac{\text{Fuel}_{rec} - \text{Fuel}_{direct}}{\text{Fuel}_{direct}} \times 100\%$$
     * Generate structured operational text: *"Route B is recommended because it avoids the active drift field of Iceberg A68A, reducing collision hazard exposure by 68% for a +4.2% fuel detour."*
  2. Build `app/services/simulation.py`:
     * Implement the dynamic surge event trigger: injects accelerated drift for Iceberg A68A directly toward the planned track.
     * Generates a collision corridor warning and dynamically computes the diverted route with visual before/after diffs.
* **Deliverables:** Full attribution engine and dynamic reroute handler ready for API exposition.

---

### Phase 4: FastAPI REST API & AppSec Hardening
* **Goal:** Expose high-performance, validated endpoints with enterprise security.
* **Tasks:**
  1. Implement endpoints:
     * `POST /api/route`: Calculates optimal and baseline routes given departure, destination, and vessel profile.
     * `GET /api/layers`: Returns active icebergs, BAS stations, and risk heatmap GeoJSON.
     * `POST /api/simulate-reroute`: Triggers the live dynamic reroute demonstration.
     * `GET /api/health`: Reports system status, memory, and routing engine latency.
  2. AppSec Hardening:
     * Pydantic v2 models with `.strict()` parsing and geographic bounds enforcement (`lat` $\in [-90.0, -50.0]$).
     * Unified response envelope: `{ success: true, data: { ... }, meta: { ... } }`.
     * CORS middleware restricted to frontend origins.
     * Zero-leakage global exception handlers.
* **Deliverables:** Fully documented Swagger/OpenAPI backend at `http://localhost:8000/docs`.

---

### Phase 5: Executive Maritime Bento Console (Next.js Frontend)
* **Goal:** Construct a responsive, daylight-readable, production-grade maritime interface.
* **Tasks:**
  1. Layout Shell (`src/app/page.tsx` & `src/components/layout/`):
     * Cockpit HUD layout with Top Telemetry Strip (`tabular-nums` for coordinates, baro pressure, wind speed, iceberg tally).
     * Left Bento Rail: Route Planner, Departure/Destination station pickers, Vessel Class selector, Layer Toggles.
     * Right Bento Rail: Situational Intel & Contextual Slide-out Iceberg Inspector (`IcebergDrawer.tsx`).
     * Bottom Dock: Persistent Route Comparison Dock (Recommended vs Direct stats) + "Why this route?" button.
     * Floating Action Dock: Time-lapse slider + "Simulate Iceberg Surge" button.
  2. Map Engine (`src/components/map/PolarMap.tsx`):
     * MapLibre GL JS dynamically imported (`ssr: false`) with skeleton loading.
     * High-contrast vector layers: Solid Sky-600 line for recommended path, Dashed Slate-500 line for direct path.
     * Iceberg markers with physical dimensions and directional drift arrows.
     * BAS weather station pins with interactive popovers.
  3. Modals & Micro-Interactions:
     * `XAIModal.tsx`: High-contrast breakdown dialog decomposing hazard avoidance and fuel trade-offs.
     * Framer Motion spring transitions (`stiffness: 350, damping: 25`) for panel toggles and route changes.
     * Mobile responsiveness: Bottom slide-up sheets and $44 \times 44\text{ px}$ touch targets.
* **Deliverables:** Fully interactive, responsive maritime bridge console.

---

### Phase 6: End-to-End Integration, Automated QA & Verification
* **Goal:** Connect frontend to live backend, execute full test suites, and audit Core Web Vitals.
* **Tasks:**
  1. Connect Next.js frontend to FastAPI backend using SWR/fetch with optimistic UI updates.
  2. Execute Backend Unit & Integration Tests (`backend/tests/`):
     * Haversine geodesic accuracy, Julian day parsing, $A^*$ admissibility, cubic fuel calculations.
     * Endpoint contract assertions on `/api/route`, `/api/layers`, `/api/simulate-reroute`.
  3. Execute Playwright E2E Test Suite (`frontend/e2e/`):
     * Automate the complete 5-act live demonstration script.
  4. Core Web Vitals Audit:
     * Verify LCP $\le 2.0\text{s}$, CLS $\le 0.05$, INP $\le 150\text{ms}$.
* **Deliverables:** Zero-regression test suite and validated live user flows.

---

### Phase 7: Production Hardening, Dockerization & Final Polish
* **Goal:** Package the entire system for one-click deployment and evaluator demonstrations.
* **Tasks:**
  1. Create multi-stage `Dockerfile.backend` (Python 3.10 slim, non-root user).
  2. Create multi-stage `Dockerfile.frontend` (Node 20 Alpine, standalone Next.js output).
  3. Create `docker-compose.yml` for unified local/cloud startup (`docker compose up --build`).
  4. Prepare offline backup demonstration assets and rehearsal scripts for the evaluation pitch.
* **Deliverables:** Complete, self-contained, production-ready POLARIS-X deployment.

---

## 4. Risk Assessment & Mitigation Matrix

| Risk Factor | Probability | Impact | Engineering Mitigation |
|---|---|---|---|
| **Pathfinding Grid Latency on Large Spatial Extents** | Medium | High | Precompute static ocean topology; run $A^*$ over bounding box sub-grids; optimize NumPy distance matrices. |
| **MapLibre Hydration Mismatch in Next.js** | High | Medium | Strictly isolate map component in dynamic import with `ssr: false` and reserved dimensional skeleton container. |
| **Missing Weather Station Data for Target Dates** | Low | Low | Gracefully fall back to regional climatological averages; flag data with `quality_flag='interpolated'`. |
| **Safari / Mobile Viewport Zoom on Form Inputs** | High | Low | Enforce minimum font size of `16px` (`text-base md:text-sm`) on all `<input>` and `<select>` elements. |

---

## 5. Definition of Done (DoD) for Production Readiness

A feature or phase is considered **Done** only when:
- [ ] 100% type-safe with zero TypeScript / Python type errors.
- [ ] All API endpoints enforce Pydantic v2 schema validation with coordinate bounds checking.
- [ ] UI strictly complies with the Executive Maritime Enterprise design system (no neon, no gaming black).
- [ ] Automated unit and integration tests pass with $> 85\%$ coverage.
- [ ] Playwright E2E test passes on the 5-act live demonstration script.
- [ ] Core Web Vitals verified (CLS $\le 0.05$, LCP $\le 2.0\text{s}$, INP $\le 150\text{ms}$).
- [ ] Docker container builds cleanly and passes `/api/health` probes.
