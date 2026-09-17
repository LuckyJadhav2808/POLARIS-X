# Schema — POLARIS-X (Supabase / PostgreSQL + PostGIS)

**Rule: data first, model second.** Every table below is a *target* schema. Confirm real source column names, units, date formats, and coordinate conventions against the actual files before finalizing migrations.

---

## 1. Common Standardized Schema (pre-database, used during ETL)

### Generic observation shape
| Field | Meaning |
|---|---|
| `timestamp` | Observation date/time |
| `latitude` | Decimal latitude |
| `longitude` | Decimal longitude |
| `source` | Dataset/source identifier |
| `quality_flag` | Optional quality indicator |

### Sea ice
```
timestamp
latitude
longitude
ice_concentration
source
```
> If the sea-ice CSV turns out to be **aggregate extent** (a single Antarctic-wide time series) rather than **spatial concentration**, do not force it into this spatial shape — use the alternate aggregate schema in §2.3 instead, and treat it as a temporal signal, not a spatial ice map.

### Icebergs
```
timestamp
iceberg_id
latitude
longitude
iceberg_size
source
```

### Weather
```
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

---

## 2. Supabase Tables (application data layer)

### 2.1 `sea_ice`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `timestamp` | date | daily time step |
| `latitude` | double precision | nullable if aggregate-only |
| `longitude` | double precision | nullable if aggregate-only |
| `ice_concentration` | numeric | 0–1 or 0–100, confirm units from source |
| `geom` | geography(Point,4326) | PostGIS point, generated from lat/lon when spatial |
| `source` | text | e.g. `'antarctic_sea_ice_csv'` |
| `quality_flag` | text | `'observed' \| 'interpolated' \| 'unavailable'` |
| `created_at` | timestamptz | default `now()` |

> If the source is aggregate-only, drop `latitude`/`longitude`/`geom` and instead use: `id, timestamp, ice_extent_value, unit, source, quality_flag, created_at`.

### 2.2 `icebergs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `iceberg_id` | text | original ID from source; reconcile BYU vs Kaggle IDs before insert |
| `timestamp` | date | |
| `latitude` | double precision | |
| `longitude` | double precision | |
| `geom` | geography(Point,4326) | generated |
| `size` | numeric | confirm unit (e.g. length in km, or area) |
| `size_unit` | text | e.g. `'km_length'`, `'sq_km_area'` |
| `source` | text | `'byu_consolidated' \| 'byu_statistics' \| 'kaggle_weekly'` |
| `quality_flag` | text | |
| `created_at` | timestamptz | default `now()` |

**Derived / feature columns (computed downstream, not stored raw):**
`displacement`, `latitude_change`, `longitude_change`, `speed`, `bearing`, `observation_interval`, `recent_movement_trend` — computed per `iceberg_id` sorted by `timestamp`, only after timestamp units and coordinate conventions are verified.

### 2.3 `weather_observations`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `station_id` | text | |
| `timestamp` | date | |
| `latitude` | double precision | station location |
| `longitude` | double precision | |
| `geom` | geography(Point,4326) | generated |
| `temperature` | numeric | confirm °C vs °F |
| `wind_speed` | numeric | confirm m/s vs knots |
| `wind_direction` | numeric | degrees |
| `pressure` | numeric | hPa |
| `source` | text | `'antarctic_surface_meteorology'` |
| `quality_flag` | text | |
| `created_at` | timestamptz | default `now()` |

### 2.4 `risk_grid`
Precomputed by the offline risk pipeline; queried by the routing API (not computed per-request).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `timestamp` | date | risk snapshot date |
| `cell_id` | text | grid cell identifier (e.g. lat/lon bucket key) |
| `geom` | geography(Polygon,4326) | grid cell boundary |
| `sea_ice_risk` | numeric | 0–1 |
| `iceberg_risk` | numeric | 0–1 |
| `weather_risk` | numeric | 0–1 |
| `total_risk` | numeric | weighted sum, see formula below |
| `confidence` | numeric | 0–1, optional MVP+ |
| `created_at` | timestamptz | default `now()` |

**Risk formula:**
```sql
total_risk = 0.45 * sea_ice_risk + 0.40 * iceberg_risk + 0.15 * weather_risk
```
(weights configurable; treat as MVP assumption, not scientific truth)

### 2.5 `route_runs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `created_at` | timestamptz | default `now()` |
| `start_lat` | double precision | |
| `start_lon` | double precision | |
| `destination_lat` | double precision | |
| `destination_lon` | double precision | |
| `risk_score` | numeric | 0–1 |
| `eta_hours` | numeric | |
| `fuel_proxy` | numeric | |
| `route_geojson` | jsonb | full route linestring + metadata |
| `alternative_routes_geojson` | jsonb | array of alternates for comparison |
| `explanation` | text | natural-language explanation |
| `risk_level` | text | `'LOW' \| 'MEDIUM' \| 'HIGH'` |

---

## 3. Suggested SQL (PostGIS-enabled Supabase project)

```sql
create extension if not exists postgis;

create table sea_ice (
  id uuid primary key default gen_random_uuid(),
  "timestamp" date not null,
  latitude double precision,
  longitude double precision,
  geom geography(Point, 4326),
  ice_concentration numeric,
  source text not null,
  quality_flag text default 'observed',
  created_at timestamptz default now()
);

create table icebergs (
  id uuid primary key default gen_random_uuid(),
  iceberg_id text not null,
  "timestamp" date not null,
  latitude double precision not null,
  longitude double precision not null,
  geom geography(Point, 4326),
  size numeric,
  size_unit text,
  source text not null,
  quality_flag text default 'observed',
  created_at timestamptz default now()
);

create table weather_observations (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  "timestamp" date not null,
  latitude double precision not null,
  longitude double precision not null,
  geom geography(Point, 4326),
  temperature numeric,
  wind_speed numeric,
  wind_direction numeric,
  pressure numeric,
  source text not null,
  quality_flag text default 'observed',
  created_at timestamptz default now()
);

create table risk_grid (
  id uuid primary key default gen_random_uuid(),
  "timestamp" date not null,
  cell_id text not null,
  geom geography(Polygon, 4326),
  sea_ice_risk numeric,
  iceberg_risk numeric,
  weather_risk numeric,
  total_risk numeric,
  confidence numeric,
  created_at timestamptz default now()
);

create table route_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  start_lat double precision not null,
  start_lon double precision not null,
  destination_lat double precision not null,
  destination_lon double precision not null,
  risk_score numeric,
  eta_hours numeric,
  fuel_proxy numeric,
  route_geojson jsonb,
  alternative_routes_geojson jsonb,
  explanation text,
  risk_level text
);

create index on icebergs (iceberg_id, "timestamp");
create index on sea_ice using gist (geom);
create index on icebergs using gist (geom);
create index on weather_observations using gist (geom);
create index on risk_grid using gist (geom);
create index on risk_grid ("timestamp");
```

---

## 4. API Contract

`POST /api/route`

**Request:**
```json
{
  "start": { "lat": 0, "lon": 0 },
  "destination": { "lat": 0, "lon": 0 }
}
```

**Response:**
```json
{
  "risk": "LOW",
  "eta_hours": 18.4,
  "risk_score": 0.21,
  "route": [],
  "alternative_routes": [],
  "risk_zones": [],
  "explanation": "Route avoids high iceberg and sea-ice risk areas."
}
```
(Finalize exact field types/shapes after real dataset inspection.)

---

## 5. Data Validation Checklist (must complete before locking schema/model features)

- [ ] Identify every file inside each ZIP/archive.
- [ ] Identify actual column names per file.
- [ ] Identify units (concentration %, size units, temperature scale, wind speed units).
- [ ] Identify date formats and normalize to `YYYY-MM-DD`.
- [ ] Identify coordinate conventions (lat/-lon range, 0–360 vs -180–180).
- [ ] Check missing values per column.
- [ ] Check duplicate observations.
- [ ] Check date ranges per dataset (do they overlap enough for one demo window?).
- [ ] Check geographic coverage per dataset (do they overlap spatially?).
- [ ] Check iceberg ID consistency within BYU.
- [ ] Check overlap/duplication between BYU and Kaggle iceberg data.
- [ ] Check weather station coordinates and coverage.
- [ ] Determine whether the sea-ice CSV is spatial or aggregate — this decides §2.1's final shape.

---

## 6. Time & Spatial Alignment Rules

- Use a **daily** time step where practical (`YYYY-MM-DD`).
- Never invent missing observations — tag each value's `quality_flag` as `observed`, `interpolated`, or `unavailable`.
- Build a common navigation grid (fixed-size cells over the operating region) — each cell eventually carries `sea_ice_risk`, `iceberg_risk`, `weather_risk`, `total_risk`.
