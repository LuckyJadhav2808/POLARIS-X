# 🧭 POLARIS-X Engineering Roadmap & Feature Assignment Guide
**Antarctic Polar Navigation & Intelligent Ice Risk Decision System**  
*National Centre for Polar and Ocean Research (NCPOR) & Ministry of Earth Sciences (MoES) Reference Architecture*

---

## 📌 How to Use This Roadmap
This document outlines the **Top 1% Engineering Enhancements** for POLARIS-X. Team members can pick any unassigned feature below, put their name under **Claimed by**, and follow the implementation blueprint and verification checklist.

### Current Implementation Status Overview
| # | Feature / Improvement | Status | Impact Category | Primary Stack |
|---|----------------------|--------|-----------------|---------------|
| **1** | **IMO POLARIS RIO Engine (MSC.1/Circ.1519)** | ✅ **Completed** | Maritime Law & Regulatory | FastAPI / NumPy / React |
| **2** | **Time-Dependent 4D Pathfinding ($A^*(x, y, t)$)** | 🚀 **Available** | Core Navigational AI | Python / A* / Space-Time |
| **3** | **Kinematic Rudder & ROT Smoothing (Dubins / Theta*)** | 🚀 **Available** | Hydrodynamics & Marine Ops | Python / Splines / SVG |
| **4** | **Multi-Waypoint Mission Sequencer (Expedition Planner)** | ✅ **Completed** | Scientific Logistics (NCPOR) | FastAPI / React / GeoJSON |
| **5** | **Monte Carlo Ensemble Drift & Confidence Corridors** | 🚀 **Available** | Risk Uncertainty & Safety | NumPy / SVG Alpha Mesh |
| **6** | **Voice-Assisted Bridge Officer AI ("Polaris Copilot")** | ✅ **Completed** | Bridge Cockpit Ergonomics | Web Speech API / LLM / NLP |
| **7** | **3-Regime Polar Operating Physics (Back-and-Ram)** | 🚀 **Available** | Marine Propulsion Engineering | Python / Energy Modeling |
| **8** | **Dynamic Vessel Squat & Tidal UKC Coupling** | 🚀 **Available** | Hydrodynamics & Grounding | Bernoulli Eq / Bathymetry |
| **9** | **Two-Layer Subsurface Iceberg Drift Model** | 🚀 **Available** | Physical Oceanography | Geostrophic Coriolis Physics |
| **10**| **IEC 61174 RTZ ECDIS Route Plan Standard** | 🚀 **Available** | Hardware Interoperability | XML / Marine ECDIS Specs |
| **11**| **IMO Night / Red-Light Bridge Console Mode** | 🚀 **Available** | Bridge Human Factors | CSS Design System / Tailwind |
| **12**| **PWA & Offline IndexedDB Satellite Cache** | 🚀 **Available** | Resilient Remote Computing | Service Workers / IndexedDB |

---

# 🚀 PART 1: GAME-CHANGING NEW FEATURES

---

### Feature 1: Official IMO POLARIS RIO Regulatory Compliance Engine
- **Status**: ✅ **COMPLETED**
- **Reference**: IMO Resolution MSC.1/Circ.1519
- **Core Concept**: Evaluates the mathematical Risk Index Outcome (RIO):
  $$\text{RIO} = \sum_{i=1}^{n} \left( C_i \times \text{RV}_{i, \text{vessel\_class}} \right)$$
  - $\text{RIO} \ge 0$: Normal Operation (Authorized)
  - $-10 \le \text{RIO} < 0$: Elevated Risk (Speed restricted, escort required)
  - $\text{RIO} < -10$: Operation Prohibited by international maritime law
- **Files**:
  - Backend: [`backend/app/engines/polaris_rio.py`](backend/app/engines/polaris_rio.py)
  - Tests: [`backend/tests/test_polaris_rio.py`](backend/tests/test_polaris_rio.py) (50/50 tests passing)
  - Frontend: [`frontend/src/components/RightHUD.tsx`](frontend/src/components/RightHUD.tsx)

---

### Feature 2: Time-Dependent 4D Pathfinding ($A^*(x, y, t)$ Space-Time Lattice)
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Difficulty**: ⭐⭐⭐⭐☆ (Advanced Algorithms)
- **Estimated Effort**: 3–4 days

#### The Concept
Standard routing evaluates a static 2D snapshot of Antarctic ice and weather. However, a voyage across the Drake Passage or Weddell Sea takes **4 to 14 days**. Tabular icebergs drift 10–30 NM/day, sea ice expands/contracts with inertial currents, and polar low-pressure systems move dynamically. Static routing causes "ghost collisions" (dodging an iceberg where it used to be, or sailing directly into where an iceberg will arrive).

#### Implementation Blueprint
1. **State Space Upgrade**:
   - Change A* node state from $(r, c)$ to $(r, c, t)$, where $t$ is the elapsed voyage hours from departure.
2. **Time Step Propagation**:
   - When expanding from node $u$ to neighbor $v$, advance time by:
     $$\Delta t = \frac{\text{distance}(u, v)}{V_{\text{effective}}(v, t_u)}$$
     $$t_v = t_u + \Delta t$$
3. **Dynamic Risk Sampling**:
   - Query the iceberg positions and sea ice field at forecast timestamp $t_v$ rather than static $t_0$.
4. **Dominance Pruning**:
   - If two paths reach cell $(r, c)$, prune if one arrives later and has consumed more fuel with equal or higher cumulative risk.
5. **Backend File**:
   - Update [`backend/app/engines/polar_route.py`](backend/app/engines/polar_route.py) to add a 4D solver `find_4d_time_dependent_route()`.
6. **Frontend Integration**:
   - Hook up with the existing 4D Temporal Scrubber (`scrubHours`) in [`frontend/src/components/BottomDrawer.tsx`](frontend/src/components/BottomDrawer.tsx).

---

### Feature 3: Kinematic Rudder & Rate-of-Turn Smoothing (Dubins / Theta* Ship Paths)
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Difficulty**: ⭐⭐⭐☆☆ (Geometry & Kinematics)
- **Estimated Effort**: 2–3 days

#### The Concept
Standard grid A* produces 45° and 90° jagged zigzag tracks. A 15,000-ton polar research vessel (e.g., *MV Vasiliy Golovnin* or *RV Polarstern*) cannot execute sharp turns due to yaw inertia, rudder hydrodynamics, and drift angles. Turning too sharply in heavy swell also increases risk of hull structural slamming.

#### Implementation Blueprint
1. **Theta* Line-of-Sight Shortcut**:
   - Replace 8-neighbor parent pointers with Theta* line-of-sight checks across ice-free and low-risk water polygons.
2. **Kinematic Turn Constraints**:
   - Maximum Rate of Turn: $\text{ROT} \le 10^\circ\text{–}12^\circ/\text{min}$.
   - Minimum Turn Radius: $R_{\text{min}} = 3.5 \times L_{\text{vessel}}$ (approx. 400m–600m).
3. **Continuous Path Interpolation**:
   - Fit Catmull-Rom or Dubins path segments through turn points to produce smooth, bridge-ready curves.
4. **ECDIS Waypoint Table**:
   - Generate official Waypoint tables: `WP Number`, `Lat/Lon`, `Leg Course Over Ground (COG)`, `Distance to Go (DTG)`, `Wheel-Over Point (WOP)`.
5. **Files**:
   - Backend: Create `backend/app/engines/kinematic_smoother.py`.
   - Frontend: Display smoothed curve in [`frontend/src/components/PolarMap.tsx`](frontend/src/components/PolarMap.tsx).

---

### Feature 4: Multi-Waypoint Scientific Mission Sequencing (Expedition Logistics Planner)
- **Status**: ✅ **COMPLETED**
- **The Concept**: NCPOR annual Antarctic expeditions execute complex multi-leg missions with cargo discharges, mooring drops, and personnel rotations.
- **Implemented Capabilities**:
  - Sequential multi-leg routing with station dwell scheduling (e.g., 72h at Maitri, 12h at Mawson, 60h at Bharati).
  - Time clock advancement ($t_{k+1} = t_k + \text{transit} + \text{dwell}$).
  - Dynamic fuel bunker depletion tracking including auxiliary hotel roadstead burn (12% of MCR).
  - Automated safe haven abort vectors (Grytviken, Rothera, Signy Island, Deception Island).
  - Docked Active Expedition Card in the Left Sidebar and full visual multi-leg map projection.
- **Files**:
  - Backend: [`backend/app/engines/expedition_planner.py`](backend/app/engines/expedition_planner.py)
  - Unit Tests: [`backend/tests/test_expedition_planner.py`](backend/tests/test_expedition_planner.py) (7/7 tests passing)
  - Frontend: [`frontend/src/components/ExpeditionPlannerModal.tsx`](frontend/src/components/ExpeditionPlannerModal.tsx), [`frontend/src/components/Sidebar.tsx`](frontend/src/components/Sidebar.tsx), [`frontend/src/components/PolarMap.tsx`](frontend/src/components/PolarMap.tsx)

---

### Feature 5: Monte Carlo Ensemble Drift & "Confidence Corridors"
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Difficulty**: ⭐⭐⭐⭐☆ (Stochastic Modeling)
- **Estimated Effort**: 3 days

#### The Concept
Antarctic weather forecasts and iceberg drift tracking carry natural uncertainty. Operating officers require not just a single deterministic line, but a **Confidence Corridor** illustrating the risk envelope if winds or currents deviate by $\pm 15\%$.

#### Implementation Blueprint
1. **Stochastic Ensemble Generation**:
   - Run $N = 100$ fast Monte Carlo perturbations on ocean current vectors ($\sigma_c = 0.2\text{ kn}$) and wind fields ($\sigma_w = 4.0\text{ kn}$).
2. **Corridor Quantile Bounds**:
   - Compute P50 (expected risk track), P10 (optimistic weather window), and P95 (worst-case ice pack closure).
3. **Visual Uncertainty Ribbon**:
   - Render a glowing semi-transparent corridor polygon surrounding the route on the Polar Map, color-coded by the probability of ice encounter.
4. **Files**:
   - Backend: Create `backend/app/engines/monte_carlo.py` and endpoint `POST /api/route/ensemble`.
   - Frontend: SVG polygon path in [`frontend/src/components/PolarMap.tsx`](frontend/src/components/PolarMap.tsx).

---

### Feature 6: Voice-Assisted Bridge Officer AI ("Polaris Bridge Copilot")
- **Status**: ✅ **COMPLETED**
- **Reference**: Maritime Bridge Ergonomics & Hands-Free Tactical Navigation
- **Core Concept**:
  On an icy vessel bridge in heavy seas with bridge gloves on, navigators need quick hands-free tactical queries. Polaris Bridge Copilot provides two-way natural voice interaction, Web Audio tactical radio cues (Roger pings, caution sirens, sonar chirps), intent extraction, and automated cockpit control execution.
- **Key Capabilities**:
  1. **Hands-free voice recognition**: Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) with push-to-talk mic and fallback text bar.
  2. **Tactical soundings & queries**: Real-time Under-Keel Clearance (UKC) evaluation, IMO POLARIS RIO limits, passage distance & bunker depletion, and mega-iceberg drift assessments.
  3. **Direct cockpit control**: Dispatches and applies live actions directly to the deck (`SET_POLAR_CLASS`, `TRIGGER_COMPUTE_ROUTE`, `TRIGGER_SURGE_DEMO`, `OPEN_EXPEDITION_MODAL`, `OPEN_TRADEOFFS_HUD`, `OPEN_XAI_MODAL`).
  4. **Crisp officer TTS & synthesized chimes**: Authoritative voice synthesis with `window.speechSynthesis` and synthesized harmonic Web Audio cues.
- **Files**:
  - Backend: [`backend/app/services/copilot.py`](backend/app/services/copilot.py), [`backend/app/api/routes.py`](backend/app/api/routes.py)
  - Unit Tests: [`backend/tests/test_copilot.py`](backend/tests/test_copilot.py) (8/8 tests passed)
  - Frontend: [`frontend/src/lib/voice.ts`](frontend/src/lib/voice.ts), [`frontend/src/components/PolarisCopilotHUD.tsx`](frontend/src/components/PolarisCopilotHUD.tsx), [`frontend/src/app/page.tsx`](frontend/src/app/page.tsx)
- **Verified via Browser Testing**:
  - Live session recording: `copilot_hud_demo_1790429179202.webp`
  - Verification screenshot: `copilot_interaction_results_1790429438617.png`

---

# 🛠️ PART 2: IMPROVEMENTS TO EXISTING MODULES

---

### Improvement 7: 3-Regime Polar Operating Physics (Backing & Ramming Mode)
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Module**: `backend/app/core/vessel_physics.py`
- **Implementation**:
  Replace pure polynomial speed degradation with 3 discrete polar propulsion regimes:
  1. **Open Water / Light Ice Cruising**: $V = 14\text{ kn}$, nominal specific fuel consumption (SFOC).
  2. **Continuous Icebreaking**: When ice thickness $h \le h_{\text{limit}}$, ship maintains continuous headway ($V = 6\text{–}9\text{ kn}$, high power $85\%\text{ MCR}$).
  3. **Ramming Mode (Back-and-Ram)**: When ridge thickness exceeds continuous breaking, ship reverses and accelerates into the ridge ($V_{\text{avg}} = 2\text{–}3\text{ kn}$, engine operates at $105\%\text{ MCR}$, fuel burn triples).

---

### Improvement 8: Vessel Dynamic Squat & Tidal Coupling for True UKC
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Module**: `backend/app/engines/bathymetry.py`
- **Implementation**:
  Moving ships experience Bernoulli suction, drawing the hull deeper into shallow water:
  $$\Delta \text{draft}_{\text{squat}} = C_b \times \frac{V^2}{100}$$
  - A vessel steaming at 14 knots draws up to **1.2m more water** than when stationary.
  - Couple dynamic squat with semi-diurnal Antarctic tidal cycles to calculate exact **Under-Keel Clearance (UKC)** over coastal shoals (e.g., South Georgia fjords and Prydz Bay approaches).

---

### Improvement 9: Two-Layer Subsurface Iceberg Drift Model
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Module**: `backend/app/engines/risk_grid.py`
- **Implementation**:
  Icebergs have **85–90% of their mass underwater**. They drift predominantly with deep geostrophic currents (Antarctic Circumpolar Current / Weddell Gyre) rather than surface wind, exhibiting Coriolis deflection ($30^\circ\text{–}45^\circ$ to the left of the wind in the Southern Hemisphere).
  - Implement two-layer vector integration:
    $$\vec{V}_{\text{berg}} = 0.85 \cdot \vec{V}_{\text{deep\_current}} + 0.15 \cdot \vec{V}_{\text{surface\_current}} + C_d \cdot \text{Coriolis}(\vec{V}_{\text{wind}})$$

---

### Improvement 10: Full IEC 61174 RTZ ECDIS Route Plan Standard
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Module**: `frontend/src/app/page.tsx` & `backend/app/api/routes.py`
- **Implementation**:
  Upgrade standard GPX/GeoJSON export to full **IEC 61174 Edition 4.0 XML (`.rtz`)** format.
  - Include Cross-Track Distance (`XTD_port`, `XTD_starboard`) limits.
  - Include waypoint geometry, turn radii, and safety contour limits.
  - Allows direct plug-and-play USB import into commercial ship bridge consoles (Transas Navi-Sailor, Furuno ECDIS, Sperry Marine VisionMaster).

---

### Improvement 11: IMO Night / Red-Light Bridge Console Mode
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Module**: `frontend/src/app/globals.css` & `frontend/src/components/TopHUD.tsx`
- **Implementation**:
  According to IMO bridge ergonomics standards, ships operating in 24-hour polar winter darkness use deep red/monochrome bridge displays to preserve night-vision adaptation.
  - Add an `IMO Night Mode` toggle applying a custom matrix filter (`hue-rotate(340deg) saturate(250%)`) or dedicated deep-ruby color tokens to all HUD components.

---

### Improvement 12: Progressive Web App (PWA) & Offline IndexedDB Caching
- **Status**: 🚀 **Available to Claim**
- **Claimed By**: `[ Open for Assignment ]`
- **Module**: `frontend/` (Service Worker & Next.js PWA config)
- **Implementation**:
  Antarctic research vessels frequently lose satellite internet for days south of 60°S.
  - Implement Service Worker caching for map vector layers, bathymetry datasets, and station catalogs.
  - Store previous route solutions in browser `IndexedDB` so the cockpit runs seamlessly without internet connection.

---

## 🏗️ Architecture & Quick-Start Guide

### Starting the Local Development Stack
```powershell
# 1. Backend Server (FastAPI with Hot-Reload)
cd c:\Users\HP\.antigravity-ide\POLARIS-X\backend
& .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Frontend Cockpit (Next.js 14)
cd c:\Users\HP\.antigravity-ide\POLARIS-X\frontend
npm run dev
```

### Running Unit Tests
```powershell
cd c:\Users\HP\.antigravity-ide\POLARIS-X\backend
& .\venv\Scripts\python.exe -m pytest tests/ -v
```

### TypeScript Validation
```powershell
cd c:\Users\HP\.antigravity-ide\POLARIS-X\frontend
npx tsc --noEmit
```

---

*Authored by the POLARIS-X Core Engineering Team — Built for NCPOR / MoES Antarctic Operations.*
