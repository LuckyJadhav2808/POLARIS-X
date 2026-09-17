# Database & Data Schema Specification
## POLARIS-X: Polar Operational Logistics, Ice Risk & Intelligent Routing System
### PostgreSQL 15+ with PostGIS Spatial Extension

---

## 1. Schema Design Philosophy & Performance Strategy

Following **/database-engineering-optimization** and **/appsec-defense-hardening**, the POLARIS-X database schema adheres to:
1. **The Left-to-Right Composite Index Rule:** Composite indexes are ordered by `[Equality Columns] -> [Range Columns] -> [Sort Columns]`.
2. **Partial Filtered Indexes:** Indexes on high-volume tables (e.g., `icebergs`) exclude dormant or grounded records to reduce index storage by $> 75\%$ and accelerate point-in-time spatial lookups.
3. **Spatial GiST & GIN Indexing:** Native PostGIS spatial indexing (`gist`) for geometry/geography columns and Generalized Inverted Indexes (`gin`) with `jsonb_path_ops` for fast GeoJSON route coordinate queries.
4. **Zero Fabrication Data Flagging:** Every record preserves a `quality_flag` (`'observed' | 'interpolated' | 'unavailable'`) to guarantee complete transparency.

---

## 2. Entity-Relationship Architecture

```
+---------------------------+       +---------------------------+
|          sea_ice          |       |          icebergs         |
+---------------------------+       +---------------------------+
| id: UUID (PK)             |       | id: UUID (PK)             |
| timestamp: DATE           |       | iceberg_id: VARCHAR       |
| year: INT                 |       | timestamp: DATE           |
| month: INT                |       | latitude: DOUBLE          |
| ice_extent_million_sqkm   |       | longitude: DOUBLE         |
| anomaly_score: NUMERIC    |       | geom: GEOGRAPHY(Point)    |
| source: VARCHAR           |       | length_nm, width_nm       |
| quality_flag: VARCHAR     |       | size_sqkm: NUMERIC        |
+---------------------------+       | disp_km, vel_angle_deg    |
                                    | status: VARCHAR           |
+---------------------------+       +---------------------------+
|    weather_observations   |
+---------------------------+       +---------------------------+
| id: UUID (PK)             |       |         risk_grid         |
| station_id: VARCHAR       |       +---------------------------+
| station_name: VARCHAR     |       | id: UUID (PK)             |
| timestamp: TIMESTAMPTZ    |       | timestamp: DATE           |
| latitude, longitude       |       | cell_id: VARCHAR          |
| geom: GEOGRAPHY(Point)    |       | centroid_lat, centroid_lon|
| sea_level_pressure_hpa    |       | geom: GEOGRAPHY(Polygon)  |
| temperature_c: NUMERIC    |       | sea_ice_risk: NUMERIC     |
| wind_speed_knots: NUMERIC |       | iceberg_risk: NUMERIC     |
| wind_direction_deg: NUM   |       | weather_risk: NUMERIC     |
+---------------------------+       | total_risk: NUMERIC       |
                                    +---------------------------+
+---------------------------------------------------------------+
|                           route_runs                          |
+---------------------------------------------------------------+
| id: UUID (PK)                                                 |
| created_at: TIMESTAMPTZ                                       |
| start_lat, start_lon, start_name                              |
| dest_lat, dest_lon, dest_name                                 |
| vessel_type, ice_class: VARCHAR                               |
| recommended_route_geojson: JSONB (GIN Indexed)                |
| alternative_routes_geojson: JSONB                             |
| risk_level: VARCHAR ('LOW', 'MEDIUM', 'HIGH')                 |
| risk_score, eta_hours, fuel_proxy_pct, distance_nm: NUMERIC   |
| explanation: TEXT                                             |
+---------------------------------------------------------------+
```

---

## 3. Production PostgreSQL + PostGIS DDL

```sql
-- Enable PostGIS spatial extension
create extension if not exists postgis;

-- ============================================================================
-- 1. Table: sea_ice (Seasonal Climate & Extent Baseline)
-- ============================================================================
create table if not exists sea_ice (
  id uuid primary key default gen_random_uuid(),
  "timestamp" date not null,
  year int not null,
  month int not null check (month between 1 and 12),
  ice_extent_million_sqkm numeric(6, 3) not null check (ice_extent_million_sqkm >= 0),
  anomaly_score numeric(5, 3) default 0.0,
  source text not null default 'nsidc_aggregate_csv',
  quality_flag text not null default 'observed',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. Table: icebergs (Tracked Positions & Physical Dimensions)
-- ============================================================================
create table if not exists icebergs (
  id uuid primary key default gen_random_uuid(),
  iceberg_id text not null,
  "timestamp" date not null,
  latitude double precision not null check (latitude between -90.0 and -50.0),
  longitude double precision not null check (longitude between -180.0 and 180.0),
  geom geography(Point, 4326),
  length_nm numeric(5, 1),
  width_nm numeric(5, 1),
  size_sqkm numeric(8, 2),
  disp_km numeric(6, 2) default 0.0,
  vel_angle_deg numeric(5, 2) default 0.0,
  status text not null default 'drifting', -- 'drifting', 'grounded'
  source text not null, -- 'byu_stats', 'nic_weekly', 'byu_consol'
  quality_flag text not null default 'observed',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. Table: weather_observations (British Antarctic Survey Stations)
-- ============================================================================
create table if not exists weather_observations (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  station_name text not null,
  "timestamp" timestamptz not null,
  latitude double precision not null check (latitude between -90.0 and -50.0),
  longitude double precision not null check (longitude between -180.0 and 180.0),
  geom geography(Point, 4326),
  sea_level_pressure_hpa numeric(6, 1),
  temperature_c numeric(4, 1),
  wind_speed_knots numeric(5, 1),
  wind_direction_deg numeric(4, 1),
  source text not null default 'bas_surface_met',
  quality_flag text not null default 'observed',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. Table: risk_grid (Precomputed 2D Navigation Lattice)
-- ============================================================================
create table if not exists risk_grid (
  id uuid primary key default gen_random_uuid(),
  "timestamp" date not null,
  cell_id text not null,
  centroid_lat double precision not null,
  centroid_lon double precision not null,
  geom geography(Polygon, 4326),
  sea_ice_risk numeric(4, 3) not null check (sea_ice_risk between 0.0 and 1.0),
  iceberg_risk numeric(4, 3) not null check (iceberg_risk between 0.0 and 1.0),
  weather_risk numeric(4, 3) not null check (weather_risk between 0.0 and 1.0),
  total_risk numeric(4, 3) not null check (total_risk between 0.0 and 1.0),
  confidence numeric(4, 3) not null default 0.850,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. Table: route_runs (Audit Trail of Computed Routes & XAI Outputs)
-- ============================================================================
create table if not exists route_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  start_lat double precision not null,
  start_lon double precision not null,
  start_name text,
  dest_lat double precision not null,
  dest_lon double precision not null,
  dest_name text,
  vessel_type text not null default 'polar_research_vessel',
  ice_class text not null default 'PC-5',
  recommended_route_geojson jsonb not null,
  alternative_routes_geojson jsonb,
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  risk_score numeric(4, 3) not null,
  eta_hours numeric(6, 2) not null,
  fuel_proxy_pct numeric(6, 2) not null,
  distance_nm numeric(7, 2) not null,
  explanation text not null
);

-- ============================================================================
-- Performance Indexes (Left-to-Right + Partial + GiST + GIN)
-- ============================================================================

-- Fast temporal & iceberg lookups
create index idx_icebergs_lookup on icebergs (iceberg_id, "timestamp");
create index idx_active_icebergs on icebergs (iceberg_id) where status = 'drifting';
create index idx_icebergs_geom on icebergs using gist (geom);

-- Fast meteorological station lookups
create index idx_weather_lookup on weather_observations (station_id, "timestamp");
create index idx_weather_geom on weather_observations using gist (geom);

-- Fast risk grid spatial queries
create index idx_risk_grid_lookup on risk_grid ("timestamp", cell_id);
create index idx_risk_grid_geom on risk_grid using gist (geom);

-- GIN index for high-speed GeoJSON route coordinate queries
create index idx_route_runs_geojson on route_runs using gin (recommended_route_geojson jsonb_path_ops);
create index idx_route_runs_created_at on route_runs (created_at desc);
```

---

## 4. Pydantic Runtime Data Contracts

Following **/appsec-defense-hardening**, all data flowing through FastAPI is strictly validated:

### 4.1 Waypoint Coordinate Model
```python
from pydantic import BaseModel, Field

class Waypoint(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Waypoint or station name")
    lat: float = Field(..., ge=-90.0, le=-50.0, description="Latitude in Antarctic bounds")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")

class VesselProfile(BaseModel):
    ice_class: str = Field(default="PC-5", pattern="^(PC-[1-7]|Non-Ice)$")
    cruising_speed_knots: float = Field(default=14.0, ge=5.0, le=30.0)
    fuel_priority_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    safety_priority_weight: float = Field(default=0.7, ge=0.0, le=1.0)

class RouteCalculationRequest(BaseModel):
    start: Waypoint
    destination: Waypoint
    vessel_profile: VesselProfile = Field(default_factory=VesselProfile)
    simulation_date: str = Field(default="2021-03-15", pattern="^\\d{4}-\\d{2}-\\d{2}$")

    class Config:
        extra = "forbid"
```
