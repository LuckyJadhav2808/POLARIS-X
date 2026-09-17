# POLARIS-X
### Polar Operational Logistics, Ice Risk & Intelligent Routing Navigator
#### Ministry of Earth Sciences (MoES) / National Centre for Polar and Ocean Research (NCPOR) | PS-26059

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Tests Passing](https://img.shields.io/badge/tests-30%2F30%20passed-brightgreen.svg)]()
[![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED.svg)]()

---

## 🧭 Executive Overview

**POLARIS-X** is an autonomous polar maritime navigation decision-support cockpit developed for Antarctic research expeditions and Arctic transit corridors. Addressing **Problem Statement 26059**, POLARIS-X bridges real satellite observation feeds with multi-objective mathematical pathfinding to compute safety-verified, fuel-optimized maritime shipping corridors.

The platform operationalizes a 7-stage maritime decision loop (**Observe $\rightarrow$ Forecast $\rightarrow$ Predict $\rightarrow$ Simulate $\rightarrow$ Optimize $\rightarrow$ Explain $\rightarrow$ Alert**) across the Antarctic Peninsula, Weddell Sea, and Scotia Sea (`-78°S` to `-52°S`, `-75°W` to `-25°W`).

---

## ⚡ Core Engineering Capabilities

1. **Multi-Source Antarctic Satellite Data Ingestion**:
   - **BYU ASCAT Scatterometer Kinematics**: 1,300+ daily trajectory and velocity records for mega-icebergs **A68A**, **A23A**, and **A64**.
   - **National Ice Center (NIC) Bulletins**: Physical iceberg dimensions (Length NM, Width NM) and grounded/drifting statuses.
   - **British Antarctic Survey (BAS) Synoptic Meteorology**: Continuous time-series across 8 stations (Rothera, Faraday/Vernadsky, Grytviken, Signy, Halley).
   - **NSIDC 40-Year Climatology**: Monthly sea-ice baseline & anomaly scaling.

2. **2D Continuous Spatial Navigation Risk Lattice**:
   - $0.25^\circ \times 0.25^\circ$ discrete marine lattice with landmass spline masking.
   - Anisotropic Gaussian iceberg collision probability fields elongated along dynamic drift vectors ($\vec{v}_{\text{drift}}$).
   - Inverse Distance Weighting (IDW) storm risk interpolation.

3. **IACS Polar Class Hull Physics Engine**:
   - **PC-5 / Arc5 Research PRV** (*MV Vasiliy Golovnin*): 14.0 kts, max safe ice 70%, $K_{\text{hull}} = 1.8$.
   - **PC-2 Heavy Polar Icebreaker**: 16.5 kts, max safe ice 100%, $K_{\text{hull}} = 1.0$.
   - **Commercial Non-Ice Class**: 12.0 kts, max safe ice 15%, $K_{\text{hull}} = 4.5$.
   - Non-linear speed degradation: $V_{\text{eff}} = V_{\text{cruise}} \cdot \max(0.20, 1 - K_{\text{hull}} R_{\text{ice}}^{1.8}) \cdot (1 - 0.25 R_{\text{wx}})$.
   - Cubic engine power fuel consumption index.

4. **Multi-Objective $A^*$ Pathfinding Engine**:
   - Admissible Great-Circle Haversine heuristics ensuring monotonic convergence in $< 150\text{ ms}$.
   - Solves for **Recommended Safe Corridor** vs unadjusted **Direct Shortest Track**.
   - Continuous Pareto trade-off slider balancing navigational safety ($w_{\text{safe}}$) vs bunker fuel economy ($w_{\text{fuel}}$).

5. **Explainable AI (XAI) Attribution Service**:
   - Computes Shapley attribution factors (Iceberg Hazard Exposure, Pack Ice Drag, Distance Detour, Bunker Fuel Delta).
   - Generates natural language justifications for bridge navigation officers.

6. **Executive Maritime Bento Console**:
   - High-contrast *Midnight Polar Depths* design system with `font-mono tabular-nums`.
   - Polar Stereographic canvas with dynamic drift vectors, radar pulse indicators, and automated **"Why This Turn?"** tactical pins.
   - 4D Temporal Scrubber (0 to 48 hours forward drift projection).
   - Bridge Export in both **IEC 61174 ECDIS GeoJSON** and standard **GPX** formats.

---

## 🏗️ Architecture

```
+-----------------------------------------------------------------------------------------+
|                                POLARIS-X SYSTEM ARCHITECTURE                            |
+-----------------------------------------------------------------------------------------+
|  [PRESENTATION LAYER] Next.js 14 App Router + Tailwind CSS + Glassmorphic Bento HUD     |
|   • LeftHUD Config Rail   • PolarMap Stereographic Canvas   • RightHUD Decision Dock   |
|   • Bottom 4D Scrubber    • XAI Modal Narrative             • Surge Alert Banner        |
+-----------------------------------------------------------------------------------------+
                                           │ REST API / GeoJSON
                                           ▼
+-----------------------------------------------------------------------------------------+
|  [APPLICATION CORE] FastAPI Server (Python 3.10)                                        |
|   • /api/route            • /api/layers                     • /api/simulate-reroute     |
|   • /api/vessels          • /api/stations                   • /api/health               |
+-----------------------------------------------------------------------------------------+
                                           │
                                           ▼
+-----------------------------------------------------------------------------------------+
|  [MATHEMATICAL ENGINES]                                                                 |
|   • Multi-Objective A* Optimizer (Geodesic Haversine Heuristic)                         |
|   • 0.25° Spatial Risk Grid (Anisotropic Gaussian Iceberg Hazards + BAS IDW Weather)    |
|   • IACS Polar Vessel Dynamics & Cubic Engine Power Curves                              |
|   • 48h Kinematic Iceberg Drift & Surge Simulator                                       |
|   • Shapley Decision Attribution & XAI Engine                                           |
+-----------------------------------------------------------------------------------------+
                                           │
                                           ▼
+-----------------------------------------------------------------------------------------+
|  [DATASET ETL LAYER] Ingested Real Antarctic Data                                        |
|   • BYU ASCAT Iceberg Database v7.1       • NIC Weekly Bulletins (archive.zip)          |
|   • BAS Synoptic Surface Meteorology       • NSIDC Antarctic Sea Ice Extent Index       |
+-----------------------------------------------------------------------------------------+
```

---

## 🚀 One-Click Docker Deployment

Run the complete frontend, backend, and dataset pipelines with a single command:

```bash
# Clone the repository
git clone https://github.com/LuckyJadhav2808/POLARIS-X.git
cd POLARIS-X

# Build and start all services in isolated containers
docker compose up --build
```

- **Frontend Maritime Console**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Healthcheck Probe**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Run automated 30-test QA suite
pytest -v

# Start FastAPI backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Run type check and production build
npm run build

# Start Next.js dev server
npm run dev -- -p 3000
```

---

## 🧪 Automated QA & Verification

POLARIS-X includes a comprehensive automated test suite covering routing convergence, IACS speed degradation physics, dataset parsing, and API schema validation:

```bash
cd backend
pytest -v
```

```
tests/test_api.py::test_api_health_endpoint PASSED                       [  3%]
tests/test_api.py::test_api_vessels_endpoint PASSED                      [  6%]
tests/test_api.py::test_api_stations_endpoint PASSED                     [ 10%]
tests/test_api.py::test_api_layers_endpoint PASSED                       [ 13%]
tests/test_api.py::test_api_compute_route_post PASSED                    [ 16%]
tests/test_api.py::test_api_simulate_reroute_post PASSED                 [ 20%]
tests/test_api.py::test_api_invalid_weight_boundary_validation PASSED    [ 23%]
tests/test_physics.py::test_vessel_profiles_defined PASSED               [ 66%]
tests/test_physics.py::test_speed_degradation_physics PASSED             [ 70%]
tests/test_physics.py::test_cubic_fuel_proxy_calculation PASSED          [ 73%]
tests/test_routing.py::test_rothera_to_grytviken_route_convergence PASSED [ 76%]
tests/test_routing.py::test_pareto_multi_objective_weight_sensitivity PASSED [ 80%]
tests/test_routing.py::test_dynamic_a68a_surge_evasion PASSED            [ 83%]
tests/test_routing_engine.py::test_haversine_accuracy PASSED             [ 86%]
tests/test_routing_engine.py::test_landmass_masking PASSED               [ 90%]
tests/test_routing_engine.py::test_vessel_speed_and_fuel_degradation PASSED [ 93%]
tests/test_routing_engine.py::test_end_to_end_route_optimization PASSED  [ 96%]
tests/test_routing_engine.py::test_xai_explanation_generation PASSED     [100%]

============================= 30 passed in 17.07s =============================
```

---

## 📄 License & Attribution

Developed under MIT License for the Ministry of Earth Sciences (MoES) and the National Centre for Polar and Ocean Research (NCPOR), Government of India.
Dataset references: Brigham Young University (BYU) Scatterometer Climate Record, US National Ice Center (NIC), and British Antarctic Survey (BAS).
