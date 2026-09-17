# Antarctic Navigation AI — Dataset Integration Guide

## 1. Project Goal

Integrate the available Antarctic datasets into one reproducible pipeline for the hackathon problem:

> AI-enabled Antarctic sea-ice forecasting, iceberg trajectory prediction, and navigation decision support.

MVP pipeline:

**Sea-ice + iceberg + weather → risk field → route optimization → explainable navigation recommendation**

---

## 2. Current Dataset Stack

| Dataset | Role | Priority |
|---|---|---|
| Antarctic sea-ice CSV | Sea-ice trend / condition signal | Core |
| BYU iceberg consolidated data | Individual iceberg positions / trajectories | Core |
| BYU iceberg statistics | Historical iceberg behavior/statistics | Core |
| Antarctic weekly iceberg reports (Kaggle) | Supplementary observations / validation | Core-support |
| Antarctic surface meteorology | Temperature, wind, pressure and related weather observations | Core-support |

**Important:** inspect the actual files before locking column names, units, dates, coordinates, or assumptions.

---

## 3. Integration Architecture

Do not merge all raw files into one giant table.

```text
RAW DATA
   ↓
STANDARDIZED DATA
   ↓
FEATURES
   ↓
AI / RISK ENGINE
   ↓
ROUTE OPTIMIZER
   ↓
Next.js Map + Decision Dashboard
```

---

## 4. Common Schema

Where possible, standardize observations to:

| Field | Meaning |
|---|---|
| `timestamp` | Observation date/time |
| `latitude` | Decimal latitude |
| `longitude` | Decimal longitude |
| `source` | Dataset/source |
| `quality_flag` | Optional quality indicator |

### Sea ice

```text
timestamp
latitude
longitude
ice_concentration
source
```

### Icebergs

```text
timestamp
iceberg_id
latitude
longitude
iceberg_size
source
```

### Weather

```text
timestamp
station_id
latitude
longitude
temperature
wind_speed
wind_direction
pressure
source
```

These are **target schemas**, not guaranteed source column names. Confirm the real fields first.

---

## 5. Sea-Ice CSV

### Purpose

Use the current Antarctic sea-ice CSV as the sea-ice condition/forecasting component.

### Processing

1. Parse dates.
2. Identify the actual sea-ice variable.
3. Normalize dates.
4. Remove invalid records.
5. Check missing values.
6. Preserve the original source value.
7. Create normalized features.

### Critical check

If the CSV contains **aggregate Antarctic sea-ice extent** rather than spatial concentration, do not represent it as a spatial ice map.

Use it as a temporal sea-ice signal instead.

---

## 6. BYU Consolidated Iceberg Data

This should be the primary historical iceberg trajectory dataset.

Workflow:

```text
iceberg_id
    ↓
sort by timestamp
    ↓
latitude / longitude sequence
    ↓
movement features
    ↓
trajectory prediction
```

Potential derived features:

- displacement
- latitude change
- longitude change
- speed
- bearing
- observation interval
- recent movement trend

Do not calculate speed until timestamp units and coordinate conventions are verified.

---

## 7. BYU Statistics Data

Use the statistics dataset as a reference/feature source.

Potential uses:

- historical iceberg behavior
- size statistics
- movement statistics
- trajectory validation

Avoid duplicating information already present in the consolidated dataset.

---

## 8. Kaggle Weekly Iceberg Reports

Use the weekly reports as supplementary observations and validation.

Before combining with BYU:

- compare date ranges
- compare iceberg identifiers
- compare latitude/longitude formats
- compare size units
- check duplicates
- identify overlapping observations

Do not blindly concatenate the datasets.

---

## 9. Antarctic Surface Meteorology

Use the weather dataset as the weather-risk component.

Target variables, if present:

- air temperature
- wind speed
- wind direction
- pressure

Standardized target table:

```text
timestamp
station_id
latitude
longitude
temperature
wind_speed
wind_direction
pressure
```

### Limitation

Station observations are not the same as a complete gridded Antarctic weather forecast.

For the MVP, describe this honestly as:

> Historical Antarctic surface meteorology used as a weather-risk signal.

---

## 10. Time Alignment

The datasets will have different timestamps.

For the MVP, use a daily time step where practical:

```text
YYYY-MM-DD
```

Do not invent missing observations.

Keep track of whether a value is:

```text
observed
interpolated
unavailable
```

---

## 11. Spatial Alignment

Create a common navigation grid.

Conceptually:

```text
Antarctica
┌──────────────────────────┐
│ ░ ░ ░ ░ ░ ░ ░ ░          │
│ ░ ░ 🧊 🧊 ░ ░ ░          │
│ ░ ░ ░ 🚢 ░ ░ ░          │
│ ░ ░ ░ ░ ░ 🧊 ░          │
└──────────────────────────┘
```

Each usable grid cell should eventually have:

```text
sea_ice_risk
iceberg_risk
weather_risk
total_risk
```

---

## 12. Risk Engine

Initial conceptual risk:

```text
Total Risk =
    Sea-Ice Risk
  + Iceberg Risk
  + Weather Risk
```

Weighted version:

```text
risk =
    w_ice * sea_ice_risk
  + w_berg * iceberg_risk
  + w_weather * weather_risk
```

Example starting weights:

```text
sea ice   = 0.45
iceberg   = 0.40
weather   = 0.15
```

These are MVP assumptions, not scientific truth. Tune and validate them.

---

## 13. Navigation Engine

Once the grid has risk scores:

```text
Risk grid
   ↓
Risk-weighted graph
   ↓
A* / Dijkstra
   ↓
Candidate routes
   ↓
Safety + distance + risk
   ↓
Recommended route
```

Use **A\*** for the first MVP.

Do not build autonomous vessel control.

---

## 14. Route Cost

Start simple:

```text
route_cost =
    distance_cost
  + risk_cost
  + iceberg_cost
  + sea_ice_cost
  + weather_cost
```

A later version can add:

```text
fuel
travel_time
uncertainty
ice_exposure
```

---

## 15. ML Strategy

### Sea ice

Start with a baseline:

- moving average
- linear regression
- Random Forest / XGBoost
- lightweight time-series model

Do not start with a Transformer before establishing a baseline.

### Iceberg trajectory

Start with:

```text
recent positions
      ↓
movement features
      ↓
simple regression / trajectory model
      ↓
future position
```

### Weather

Initially use weather variables directly as risk features.

You do not need a separate weather deep-learning model for the MVP.

---

## 16. Python Backend Structure

Recommended:

```text
backend/
│
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── routes.py
│   │   ├── predictions.py
│   │   └── risk.py
│   │
│   ├── data/
│   │   ├── loaders/
│   │   │   ├── sea_ice.py
│   │   │   ├── iceberg.py
│   │   │   └── weather.py
│   │   └── preprocessing/
│   │       ├── cleaning.py
│   │       ├── spatial.py
│   │       └── temporal.py
│   │
│   ├── models/
│   │   ├── sea_ice.py
│   │   └── iceberg.py
│   │
│   ├── risk/
│   │   └── risk_engine.py
│   │
│   └── routing/
│       └── astar.py
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── features/
│
├── models/
└── requirements.txt
```

---

## 17. Frontend Integration

Recommended stack:

- Next.js
- React
- TypeScript
- MapLibre or Leaflet

Architecture:

```text
Next.js + React + TypeScript
             │
             │ REST
             ↓
        FastAPI + Python
             │
      ┌──────┼──────┐
      ↓      ↓      ↓
   Sea Ice Iceberg Weather
      │      │      │
      └──────┼──────┘
             ↓
        Risk Engine
             ↓
       Route Optimizer
             ↓
        GeoJSON result
             ↓
      Antarctic map
```

---

## 18. Supabase Database

For application data, use Supabase/PostgreSQL/PostGIS.

### `icebergs`

```text
id
iceberg_id
timestamp
latitude
longitude
size
source
```

### `weather_observations`

```text
id
station_id
timestamp
latitude
longitude
temperature
wind_speed
wind_direction
pressure
```

### `sea_ice`

```text
id
timestamp
latitude
longitude
ice_concentration
source
```

If the sea-ice CSV is aggregate, change this table to match its actual structure.

### `route_runs`

```text
id
created_at
start_lat
start_lon
destination_lat
destination_lon
risk_score
eta
route_geojson
```

---

## 19. API Contract

The frontend should request a route with something conceptually like:

```http
POST /api/route
```

Input:

```json
{
  "start": {
    "lat": 0,
    "lon": 0
  },
  "destination": {
    "lat": 0,
    "lon": 0
  }
}
```

Output:

```json
{
  "risk": "LOW",
  "eta_hours": 18.4,
  "risk_score": 0.21,
  "route": [],
  "risk_zones": [],
  "explanation": "Route avoids high iceberg and sea-ice risk areas."
}
```

Finalize exact fields after dataset inspection.

---

## 20. Data Validation Checklist

Before model training:

- [ ] Identify every file inside each ZIP.
- [ ] Identify actual column names.
- [ ] Identify units.
- [ ] Identify date formats.
- [ ] Identify coordinate conventions.
- [ ] Check missing values.
- [ ] Check duplicate observations.
- [ ] Check date ranges.
- [ ] Check geographic coverage.
- [ ] Check iceberg ID consistency.
- [ ] Check overlap between BYU and Kaggle iceberg data.
- [ ] Check weather station coordinates.
- [ ] Determine whether the sea-ice CSV is spatial or aggregate.

---

## 21. What NOT to Do

Do not:

- merge all raw files blindly
- train deep learning before building a baseline
- download massive datasets without need
- claim real-time forecasting from historical observations
- claim operational safety certification
- build autonomous vessel control
- treat Kaggle data as automatically authoritative
- duplicate overlapping iceberg records
- expose raw scientific files directly to the frontend

---

## 22. 36-Hour MVP Plan

### Phase 1 — Data inspection

```text
Inspect → clean → standardize
```

### Phase 2 — Iceberg trajectory

```text
Historical positions
→ movement features
→ future trajectory
```

### Phase 3 — Sea ice

```text
Historical sea-ice signal
→ forecast / risk score
```

### Phase 4 — Weather

```text
Wind + temperature + pressure
→ weather risk
```

### Phase 5 — Risk map

```text
Ice + iceberg + weather
→ combined risk grid
```

### Phase 6 — Route

```text
Start + destination
→ A*
→ safest route
```

### Phase 7 — Demo

Show:

1. Select departure.
2. Select destination.
3. Display available risk information.
4. Show iceberg danger zones.
5. Generate recommended route.
6. Compare with shortest route.
7. Explain why the recommended route is safer.
8. Display ETA/risk/fuel proxy.

---

## 23. Evaluator Positioning

Do not pitch:

> "We built an AI map of Antarctica."

Pitch:

> **"We fuse heterogeneous Antarctic observations into a dynamic navigation risk field and use it to recommend safer, explainable routes for polar research vessels."**

The strongest demo loop is:

```text
OBSERVATIONS
     ↓
AI / ANALYTICS
     ↓
RISK FIELD
     ↓
ROUTE OPTIMIZATION
     ↓
EXPLAINABLE DECISION
```

The system should **support the navigator**, not claim to replace the navigator.

---

## 24. Final Integration Goal

The finished system should answer:

> **Given a vessel, departure point, destination and available Antarctic observations, which route provides the best safety/risk trade-off, and why?**

---

## 25. Immediate Next Step

Before writing model code, inspect every uploaded dataset programmatically.

The inspection should produce:

```text
Dataset
 ├── files
 ├── rows
 ├── columns
 ├── data types
 ├── date range
 ├── latitude range
 ├── longitude range
 ├── missing values
 └── sample records
```

Only after inspection should the final integration schema and ML features be locked.

**Rule: data first, model second.**
