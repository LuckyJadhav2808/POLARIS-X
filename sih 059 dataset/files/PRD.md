# PRD — POLARIS-X
## AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System

**Problem Statement ID:** 26059
**Organization:** Ministry of Earth Sciences (MoES) — National Centre for Polar and Ocean Research (NCPOR)
**Category:** Software | **Theme:** Transportation & Logistics
**Document owner:** [fill in team name]
**Status:** Draft v1

---

## 1. Product Summary

POLARIS-X is an explainable AI decision-support platform that fuses Antarctic sea-ice, iceberg, and weather observations into a dynamic risk field, then uses that risk field to recommend safe, fuel-aware navigation routes for polar research vessels — with a clear explanation of *why* a route is recommended.

**Positioning statement:**
> "We fuse heterogeneous Antarctic observations into a dynamic navigation risk field and use it to recommend safer, explainable routes for polar research vessels."

**What this is not:** a real-time operational forecasting system, an autonomous vessel controller, or a safety-certified navigation authority. It is a decision-support layer — the navigator stays in control.

---

## 2. Problem Statement

> "How do we make navigation decisions when the environment itself is uncertain and continuously changing?"

A useful system must answer four questions:

| # | Question | Example |
|---|---|---|
| A | What is happening now? | Sea-ice location/concentration, known iceberg positions, current weather |
| B | What is likely to happen next? | Sea-ice concentration trend, iceberg drift, hazard zones forming |
| C | What should the vessel do? | Safest route, fuel-efficient route, ETA, risk per route |
| D | Why does the system recommend that route? | Which hazards drove the decision, forecast confidence, what changed since last recommendation |

Question D is the differentiator — it is what separates a "pretty map" from a decision system.

---

## 3. Goals & Non-Goals

### 3.1 Goals (MVP)
- Ingest and standardize sea-ice, iceberg, and weather datasets into one pipeline.
- Build a spatial-temporal **risk grid** (sea-ice risk + iceberg risk + weather risk).
- Run **A\*** route optimization over the risk-weighted grid between a start and destination point.
- Return 2–3 candidate routes with ETA, risk score, and a fuel proxy.
- Provide a plain-language **explanation** of the recommended route vs. alternatives.
- Demonstrate **dynamic rerouting**: when predicted iceberg/ice risk changes, the recommended route changes, and the system explains why.
- Ship a working end-to-end demo: map → risk layers → route comparison → explanation.

### 3.2 Non-Goals (explicitly out of scope for MVP)
- Real-time operational forecasting (we use historical/observational data).
- Autonomous vessel control.
- Safety certification or legally binding navigation guarantees.
- A complete gridded Antarctic weather forecast (we use station-based historical meteorology as a risk *signal*, not a forecast product).
- Multi-vessel fleet coordination (future phase).

---

## 4. Stakeholders & Users

| Stakeholder | Need |
|---|---|
| Vessel captain / navigation officer | Safe, explainable route recommendation and real-time situational awareness |
| NCPOR / polar mission planners | Mission planning, risk reduction |
| Researchers | Reliable access to field locations |
| Logistics teams | ETA, fuel, mission planning |
| Oceanographers / meteorologists | Ice/ocean/weather condition context |
| Emergency response teams | Rapid rerouting under deteriorating conditions |
| Government / scientific agencies | Better operational intelligence |

**Primary demo persona:** Navigation officer planning a route between two points in the demo operating region, comparing AI-recommended vs. shortest route.

---

## 5. Pain Points Addressed

1. **Dynamic sea ice** — concentration, edges, and fragmentation change over time; static maps go stale.
2. **Iceberg uncertainty** — icebergs drift under currents/wind/sea-ice interaction; trajectories are not obvious from a single snapshot.
3. **Weather uncertainty** — wind, temperature, pressure affect both ice behavior and vessel safety.
4. **Conflicting objectives** — safest ≠ shortest ≠ cheapest; this is multi-objective optimization, not plain shortest-path.
5. **Data fragmentation** — sea-ice, iceberg, and weather data live in different formats/sources today.
6. **Observation ≠ decision** — existing products (e.g., NSIDC-style sea-ice monitoring, satellite iceberg tracking) show *what exists*, not *what route to take*.
7. **Weak uncertainty communication** — AI outputs are too often shown as absolute truth instead of with confidence/freshness.
8. **Static route planning** — a route computed once becomes stale as conditions evolve.

---

## 6. Solution Overview — Three Engines

### Engine 1 — IceCast (Sea-ice forecasting)
- **Input:** historical sea-ice concentration/extent signal, weather, ocean variables.
- **Output:** sea-ice risk score per grid cell/time step, trend signal, (MVP: baseline model, not deep learning).

### Engine 2 — BergTrack AI (Iceberg trajectory)
- **Input:** historical iceberg positions (BYU consolidated + statistics + Kaggle weekly reports), wind, currents.
- **Output:** current iceberg positions, predicted next position(s), a simple uncertainty corridor, collision-risk zones.

### Engine 3 — PolarRoute (Routing)
- **Input:** vessel start/destination, ice risk grid, iceberg risk grid, weather risk grid, cost weights.
- **Output:** recommended route, 1–2 alternative routes, ETA, fuel proxy, total risk score, explanation string.

**Core data flow:**
```
RAW DATA → STANDARDIZED DATA → FEATURES → RISK ENGINE → ROUTE OPTIMIZER → MAP + DASHBOARD
```

---

## 7. MVP Feature List

| Priority | Feature |
|---|---|
| P0 | Dataset ingestion + standardization pipeline (sea ice, iceberg, weather) |
| P0 | Common daily time-step alignment across datasets |
| P0 | Spatial risk grid construction (sea_ice_risk, iceberg_risk, weather_risk, total_risk per cell) |
| P0 | A* route optimization over the risk-weighted grid |
| P0 | Route comparison: recommended vs. shortest-path, with ETA/fuel/risk |
| P0 | Explanation generator (plain-language reason for the recommendation) |
| P0 | Interactive Antarctic map (risk layers, iceberg markers, route lines) |
| P1 | Dynamic rerouting demo (risk changes → recommendation changes → explanation updates) |
| P1 | Baseline sea-ice trend model (moving average / linear regression / RF) |
| P1 | Baseline iceberg trajectory model (movement features → simple regression) |
| P2 | Historical scenario validation / backtesting view |
| P2 | Confidence / uncertainty indicators on forecasts |

---

## 8. Success Metrics (MVP demo-level, not production)

- End-to-end flow works: pick departure + destination → get a recommended route with explanation, in under a few seconds.
- Recommended route measurably reduces predicted ice/iceberg risk exposure vs. shortest route (shown numerically).
- Dynamic rerouting demo triggers a visibly different route + explanation when iceberg risk is injected/changed.
- All claims are honestly scoped (no "real-time," no "certified safe," no "99% accurate" without a defined metric).

---

## 9. Data Sources (see `schema.md` for full field definitions)

| Dataset | Role | Priority |
|---|---|---|
| Antarctic sea-ice CSV | Sea-ice trend/condition signal | Core |
| BYU iceberg consolidated data | Iceberg positions/trajectories | Core |
| BYU iceberg statistics | Historical iceberg behavior stats | Core |
| Antarctic weekly iceberg reports (Kaggle) | Supplementary observation/validation | Core-support |
| Antarctic surface meteorology | Temperature, wind, pressure | Core-support |

**Rule:** Data first, model second. Every dataset must be inspected (columns, units, date format, coordinate convention, missing values, duplicates) before schemas or model features are locked. See `Data Validation Checklist` in `schema.md`.

---

## 10. Risk Model (MVP formula)

```
total_risk = w_ice * sea_ice_risk + w_berg * iceberg_risk + w_weather * weather_risk
```

**Starting weights (MVP assumption, to be tuned):**
```
sea_ice   = 0.45
iceberg   = 0.40
weather   = 0.15
```

**Route cost (MVP):**
```
route_cost = distance_cost + risk_cost + iceberg_cost + sea_ice_cost + weather_cost
```

---

## 11. Explainability Requirement

Every recommendation must be accompanied by a natural-language explanation, e.g.:

> "Route B is recommended because it reduces predicted ice exposure by 18% while increasing travel distance by 6%. Confidence: Medium (based on 3 recent iceberg observations)."

This is not optional — it is the primary judge-facing differentiator.

---

## 12. Constraints & Guardrails

Do NOT:
- Merge all raw files blindly into one table.
- Train deep learning before a working baseline exists.
- Claim real-time forecasting from historical/observational data.
- Claim operational safety certification.
- Build or imply autonomous vessel control.
- Treat any single dataset (e.g., Kaggle) as automatically authoritative over another.
- Duplicate overlapping iceberg records between BYU and Kaggle without reconciliation.
- Expose raw scientific files directly to the frontend.

---

## 13. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Mapping | MapLibre or Leaflet |
| Backend | Python + FastAPI |
| Database | Supabase (PostgreSQL + PostGIS) |
| ML (baseline) | pandas, scikit-learn (moving average / linear regression / Random Forest / XGBoost) |
| Routing | A* (networkx or custom grid-graph implementation) |

---

## 14. Open Questions (to resolve during data inspection phase)

- Is the sea-ice CSV spatial (gridded concentration) or aggregate (single extent time series)? This determines whether sea-ice risk can be mapped spatially or must be applied as a uniform temporal signal.
- What are the exact date ranges and geographic coverage of each dataset — do they overlap enough for a single demo region/time window?
- What are the iceberg ID conventions in BYU vs. Kaggle — can records be matched/deduplicated?
- What coordinate convention (0–360 vs. -180–180 longitude) does each source use?
- What size/units are used for iceberg size across BYU and Kaggle?

---

## 15. Milestones (36-Hour MVP Plan)

| Phase | Deliverable |
|---|---|
| 1 | Data inspection, cleaning, standardization |
| 2 | Iceberg trajectory: positions → movement features → predicted position |
| 3 | Sea ice: historical signal → forecast/risk score |
| 4 | Weather: wind/temp/pressure → weather risk |
| 5 | Combined risk grid (ice + iceberg + weather) |
| 6 | A* route: start + destination → safest route |
| 7 | Demo: select departure/destination → show risk → show route → explain → compare vs shortest route |

---

## 16. Pitch Framing (for judges)

**Say:**
- "We provide explainable decision support."
- "We model uncertainty."
- "We continuously update risk."
- "We optimize safety, fuel, and mission time together."
- "The navigator remains in control."

**Avoid:**
- "Nobody has done this before."
- "Our AI guarantees safe navigation."
- "Our model is 99% accurate" (without defining the metric).
- "We use AI, satellite data, and blockchain" (buzzword stacking).
- "Our platform replaces captains."

**One-line USP:**
> "POLARIS-X tells a navigator not only where the hazards are, but which route to take, why it is safer, how much fuel it costs, and how confident the system is."
