# App Flow — POLARIS-X

This document describes the user-facing flow, the screen-by-screen journey, and the underlying request/response flow between frontend, backend, and data layer.

---

## 1. High-Level System Flow

```
Next.js + React + TypeScript (Frontend)
             │
             │ REST (JSON)
             ↓
        FastAPI + Python (Backend)
             │
      ┌──────┼──────┐
      ↓      ↓      ↓
   Sea Ice  Iceberg  Weather
   Loader   Loader   Loader
      │      │      │
      └──────┼──────┘
             ↓
        Risk Engine
             ↓
       Route Optimizer (A*)
             ↓
        GeoJSON + Explanation
             ↓
   Antarctic Map + Dashboard (Frontend)
```

---

## 2. Primary User Journey (Demo Flow)

### Step 1 — Landing / Map View
- User opens the app and sees a full-screen Antarctic map (MapLibre/Leaflet).
- Default risk layers (sea-ice risk, iceberg positions) are loaded and shown as toggleable overlays.
- A sidebar/panel shows: dataset freshness ("Historical Antarctic surface meteorology used as a weather-risk signal"), current layer legend, and a "Plan a Route" call-to-action.

### Step 2 — Select Departure
- User clicks on the map, or selects from a list/dropdown of known stations/waypoints, to set the **departure point**.
- Selected point is pinned and labeled on the map.

### Step 3 — Select Destination
- User clicks a second point, or selects from a dropdown, to set the **destination**.
- The app validates both points fall within the covered operating region/data bounds; if not, it warns the user.

### Step 4 — Display Available Risk Information
- Before routing, the app shows a quick summary panel: current sea-ice risk level, number of known icebergs in the corridor, current weather risk in the region.
- This answers "what is happening now?" before the user asks "what should I do?"

### Step 5 — Show Iceberg Danger Zones
- Iceberg markers are rendered on the map with a size/color indicating risk.
- Predicted trajectory (short vector/arrow) and an uncertainty corridor (shaded ellipse or buffer) are shown per iceberg, where available.

### Step 6 — Generate Recommended Route
- User clicks "Find Route."
- Frontend calls `POST /api/route` with `start` and `destination`.
- Backend runs the risk engine + A* optimizer and returns:
  - Recommended route (GeoJSON)
  - 1–2 alternative routes (e.g., shortest-path route)
  - Risk score, ETA, fuel proxy per route
  - Risk zones crossed
  - Natural-language explanation

### Step 7 — Compare With Shortest Route
- The map renders both routes simultaneously (different colors/styles).
- A comparison table/card shows: Risk (LOW/MED/HIGH), ETA (hours), Fuel proxy, Distance, for each route side by side.

### Step 8 — Explain Why the Recommended Route Is Safer
- User clicks "Why this route?"
- A panel/modal shows the explanation string plus a breakdown: which hazard(s) drove the decision, what the risk trade-off vs. the shortest route is, and confidence level.

### Step 9 — Display ETA / Risk / Fuel Proxy Summary
- A persistent summary card remains visible with the finalized recommended route's key stats.

---

## 3. Dynamic Rerouting Demo Flow (P1 — key differentiator demo)

```
1. Show initial recommended route → "Fastest/likely-safe route selected."
2. Introduce/simulate predicted iceberg movement (demo trigger button or time-slider).
3. Risk zone visibly expands on the map near the original route.
4. System detects increasing risk along the current route.
5. System generates alternative route(s).
6. Recommended route changes on the map.
7. Comparison card updates:
      OLD ROUTE   → Risk: HIGH, Fuel: 100, ETA: 40h
      NEW ROUTE   → Risk: LOW,  Fuel: 104, ETA: 43h
8. User clicks "Why did we reroute?" → explanation panel updates with the new reasoning.
```

This is the strongest live-demo moment and should be a first-class UI flow, not an afterthought (e.g., a visible "Simulate risk change" control).

---

## 4. Screen Inventory

| Screen / View | Purpose |
|---|---|
| **Map Dashboard (home)** | Primary screen — Antarctic map with risk layers, iceberg markers, route lines |
| **Route Planner Panel** | Departure/destination selection, "Find Route" action |
| **Risk Summary Panel** | Current sea-ice / iceberg / weather risk snapshot for selected region |
| **Route Comparison Panel** | Side-by-side stats: recommended vs. alternative route(s) |
| **Explanation Panel/Modal** | "Why this route?" breakdown |
| **Rerouting Simulation Control** | Trigger/slider to simulate iceberg movement or risk change over time |
| **Dataset/Confidence Info Panel** | Data freshness, source honesty notes (e.g., "historical observation, not live forecast") |
| **(Optional P2) Historical Scenario Validation View** | Replay a past scenario to show model behavior |

---

## 5. Backend Request Flow (per route request)

```
1. Frontend: POST /api/route { start, destination }
2. Backend: validate coordinates within data bounds
3. Backend: load/query cached risk grid for the relevant region + latest available time step
   (grid is precomputed periodically by the risk pipeline, not recomputed per-request)
4. Backend: build risk-weighted graph over grid cells between start and destination
5. Backend: run A* → candidate route(s)
6. Backend: compute route_cost = distance_cost + risk_cost + iceberg_cost + sea_ice_cost + weather_cost
7. Backend: compute ETA (distance / assumed vessel speed) and fuel proxy (function of distance + ice resistance)
8. Backend: generate explanation string (template-based on which risk components dominated)
9. Backend: persist run to `route_runs` table (Supabase)
10. Backend: return JSON { risk, eta_hours, risk_score, route (GeoJSON), risk_zones, explanation }
11. Frontend: render route(s) on map + populate comparison/explanation panels
```

---

## 6. Data Pipeline Flow (offline / scheduled, not per-request)

```
1. Loaders (sea_ice.py, iceberg.py, weather.py) read raw files
2. Preprocessing (cleaning.py, spatial.py, temporal.py) standardizes to common schema
3. Features are derived (iceberg movement features, sea-ice trend, weather risk features)
4. Risk engine (risk_engine.py) computes sea_ice_risk / iceberg_risk / weather_risk / total_risk per grid cell per day
5. Risk grid is written to Supabase (or a processed-data store) for the API to query
```

This keeps the per-request API fast — routing queries a precomputed risk grid rather than recomputing forecasts live.

---

## 7. Error / Edge-Case Flows

- **Start/destination outside data coverage:** show a clear warning, do not silently fall back to a default region.
- **No route found (fully blocked corridor):** return a response indicating no safe path under current risk thresholds, with the option to relax risk tolerance.
- **Missing data for a time step:** mark the affected risk component as `unavailable` rather than interpolating silently (per `Do not invent missing observations`), and reflect this in the confidence/explanation output.
- **Stale data:** always show data freshness/date range in the UI so the demo — and any real usage — is honest about what "current" means.
