# POLARIS-X: Polar Operational Logistics, Ice Risk & Intelligent Routing System
## Unified Master Architecture, Dataset Audit & Production Blueprint
### Smart India Hackathon (SIH) — Problem Statement ID: 26059
### Ministry of Earth Sciences (MoES) — National Centre for Polar and Ocean Research (NCPOR)

> **Document Classification:** Autonomous Engineering Source of Truth  
> **Target Region:** Antarctic Maritime Operations (Antarctic Peninsula, Weddell Sea, and Scotia Sea / "Iceberg Alley" corridor)  
> **System Archetype:** Marine Command Center HUD & Explainable AI Navigation Decision Support System

---

## 1. Executive Summary & Problem Framing

### 1.1 The Operational Challenge
Antarctic research vessels (such as those chartered or operated by NCPOR, e.g., *MV Vasiliy Golovnin*, expeditions to Maitri and Bharati stations) operate in one of the planet's most hazardous and uncertain maritime regions. Sea-ice concentration shifts dynamically across seasons and synoptic weather events; multi-billion-ton tabular icebergs drift under combined wind, ocean currents, and Coriolis forcing; violent polar storms cause severe wave and visibility hazards; and a passage that is clear today can become completely impassable or trap a vessel tomorrow.

### 1.2 The True Problem Statement
The visible question is:
> *"How do we find a safe route through Antarctic waters?"*

The true operational problem is:
> *"How do navigators make high-stakes routing decisions when the environment itself is continuously evolving, observational data is fragmented across sources, and traditional routing algorithms optimize solely for distance rather than multi-objective risk, fuel consumption, and forecast uncertainty?"*

To solve this, POLARIS-X answers four core operational questions:
1. **What is happening now?** (Current sea-ice extent/concentration, verified iceberg positions, local meteorological conditions).
2. **What will happen next?** (Sea-ice trend predictions, iceberg drift trajectory forecasting with uncertainty corridors, developing weather risks).
3. **What should the vessel do?** (Recommend multi-objective routes balancing safety, fuel consumption proxy, and ETA against vessel ice-class capabilities).
4. **Why does the system recommend that route?** (**Explainable AI decision support**: explicit breakdown of hazard avoidance, risk trade-offs versus the shortest path, and forecast confidence).

### 1.3 Strategic Product Positioning
* **What POLARIS-X IS:** A human-in-the-loop, mission-aware decision intelligence platform converting heterogeneous environmental observations into a dynamic risk field and explainable route recommendations.
* **What POLARIS-X IS NOT:** An autonomous vessel captain, an autopiloted steering system, or a certified safety authority. The navigator remains in full command.

```
+-----------------------------------------------------------------------------------+
|                               POLARIS-X PARADIGM                                  |
|   Observe  -->  Forecast  -->  Predict  -->  Simulate  -->  Optimize  --> Explain |
+-----------------------------------------------------------------------------------+
```

---

## 2. Exhaustive Dataset Audit (SIH 059 Ground Truth)

An exhaustive programmatic and scientific audit was executed on all files located in the `sih 059 dataset` repository. Below are the verified ground-truth findings, schema structures, coverage, and integration strategies.

```
d:\Polaris-X\sih 059 dataset\
|-- monthly-sea-ice-extent-in-the-antarctic.csv  (13.2 KB, 558 rows)
|-- archive.zip                                  (103 KB, 111 weekly CSV reports)
|-- consolidated_database_v8.0.zip               (3.88 MB, 647 CSV trajectory files)
|-- stats_database_v7.1.zip                      (2.66 MB, 191 precomputed kinematic CSVs)
|-- surface_met.zip                              (9.66 MB, 8 British Antarctic Survey DAT files)
|-- files.zip                                    (PRD.md, app-flow.md, schema.md, design.md)
|-- Antarctic_Navigation_Ultimate_Context.md     (37 KB contextual briefing)
`-- dataset_integration.md                       (12 KB data pipeline guidelines)
```

### 2.1 Dataset 1: Monthly Antarctic Sea-Ice Extent (`monthly-sea-ice-extent-in-the-antarctic.csv`)
* **Nature & Structure:** Single CSV containing 558 rows spanning from **January 1980 to August 2026** (continuous monthly records).
* **Column Analysis:**
  * `Entity`: Represents the **Year** (integer, `1980` to `2026`).
  * `Year`: Represents the **Month of Year** (integer, `1` to `12`).
  * `Monthly sea ice extent in the Antarctic`: Float representing total Antarctic sea ice extent in **million square kilometers** ($\text{million km}^2$). Range: minimum ~`2.07 million km²` (February austral summer) to maximum ~`19.8 million km²` (September austral winter).
* **Critical Ground Truth:** **This is an aggregate temporal signal, NOT a spatial gridded raster.** It cannot be plotted directly as lat/lon spatial grid cells.
* **Role in POLARIS-X:** Macro-level seasonal cycle baselines and long-term trend forecasting. Informs the seasonal background risk multiplier ($R_{ice\_seasonal}(t)$) for monthly risk weighting in the route optimizer.

### 2.2 Dataset 2: National Ice Center (NIC) Weekly Iceberg Reports (`archive.zip`)
* **Nature & Structure:** 111 weekly CSV snapshot files dating from **August 16, 2019 to August 12, 2022** (`AntarcticIcebergs_YYYYMMDD.csv`).
* **Column Schema:**
  * `Iceberg`: Identifier text (e.g., `A23A`, `A68A`, `A68B`, `B09B`, `B15AA`, `B43`). 81 unique named tabular icebergs tracked.
  * `Length (NM)`: Length in nautical miles (range: 3.0 NM to 82.0 NM, mean: 16.3 NM).
  * `Width (NM)`: Width in nautical miles (range: 2.0 NM to 40.0 NM, mean: 7.8 NM).
  * `Latitude`: Decimal degrees (range: `-77.78°S` to `-52.50°S`).
  * `Longitude`: Decimal degrees (range: `-172.57°W` to `+148.33°E`).
  * `Remarks`: Operational status notes such as `belle (grounded)`, `amere`, `wilkw (grounded)`, `amune`. Indicates whether an iceberg is anchored to the seabed or actively free-drifting.
  * `Last Update`: Date string of last visual/radar confirmation.
* **Role in POLARIS-X:** Provides ground-truth snapshots and physical dimensions (Length/Width in NM) to calculate realistic hazard buffer polygons around each iceberg rather than treating them as single points.

### 2.3 Dataset 3: BYU Antarctic Iceberg Consolidated Database (`consolidated_database_v8.0.zip`)
* **Nature & Structure:** 647 individual CSV files (`updated7_consol/a01.csv` ... `a78.csv`), representing daily satellite scatterometer tracking from **1978 to 2026** (Brigham Young University Center for Remote Sensing).
* **Columns & Format:**
  * `date`: Julian Day format integer `YYYYDDD` (e.g., `1978204` = Year 1978, Day 204; `2026090` = Year 2026, Day 90).
  * `ascat_1..3`: MetOp Advanced Scatterometer Latitude, Longitude, Flag.
  * `nic_1..3`: National Ice Center Latitude, Longitude, Flag.
  * `seawinds_1..3`: QuikSCAT SeaWinds Latitude, Longitude, Flag.
  * `sass_1..3`: Seasat-A Scatterometer Latitude, Longitude, Flag.
  * `size_1..2`: Major and minor axes in nautical miles.
* **Role in POLARIS-X:** Multi-sensor tracking baseline demonstrating how polar night and cloud cover are resolved via spaceborne microwave radars.

### 2.4 Dataset 4: BYU Iceberg Kinematics & Statistics Database (`stats_database_v7.1.zip`)
* **Nature & Structure:** 191 cleaned, filtered, kinematic trajectory CSVs (`stats_database_v7.1/*.csv`). Spans **2000 to 2023+**.
* **Column Schema:**
  * `date`: Julian Day integer `YYYYDDD`.
  * `date_gap`: Gap in days since last observation (`0` or `1`).
  * `disp`: Daily displacement / drift distance in **kilometers** ($\text{km/day}$). Range: 0.0 km to ~894 km (storm-driven surges).
  * `flags`: Data processing and sensor validity flags.
  * `lat`, `lon`: Filtered decimal coordinates.
  * `mask`: Land/coastal boundary mask indicator (`0` or `1`).
  * `size`: Cross-sectional surface area in **square kilometers** ($\text{km}^2$, e.g., `1116.79 km²` for A68A).
  * `vel_angle`: Instantaneous velocity drift heading / angle (radians / degrees).
* **Role in POLARIS-X:** **Primary engine for BergTrack AI.** Pre-filtered daily kinematic displacement & bearing histories for major icebergs (A68A: 1,324 days, A23A: 10,920 days, B09D: 2,547 days) used to train and run trajectory forecasting with expanding uncertainty corridors.

### 2.5 Dataset 5: British Antarctic Survey Surface Meteorology (`surface_met.zip`)
* **Nature & Structure:** 8 long-term fixed meteorological station record files (`.dat` format) from the British Antarctic Survey (BAS). Totaling over 1,000,000 synoptic meteorological observations.
* **Stations:**
  1. **Adelaide** (`Adelaide_surface.dat`): Lat `-67.80°`, Lon `-68.90°`, Elev 26m (1962–1976)
  2. **Deception Island** (`Deception_surface.dat`): Lat `-63.00°`, Lon `-60.70°`, Elev 8m (1959–1967)
  3. **Faraday / Vernadsky** (`Faraday_surface.dat`): Lat `-65.25°`, Lon `-64.27°`, Elev 11m (1947–1995)
  4. **Fossil Bluff** (`Fossil_Bluff_surface.dat`): Lat `-71.32°`, Lon `-68.28°`, Elev 250m (1961–2005)
  5. **Grytviken** (`Grytviken_surface.dat`): Lat `-54.28°`, Lon `-36.48°`, Elev 3m (1959–1981)
  6. **Halley** (`Halley_surface.dat`): Lat `-75.43°`, Lon `-26.22°`, Elev 30m (1957–2013)
  7. **Rothera** (`Rothera_surface.dat`): Lat `-67.57°`, Lon `-68.12°`, Elev 32m (1976–2013)
  8. **Signy** (`Signy_surface.dat`): Lat `-60.70°`, Lon `-45.60°`, Elev 6m (1956–2000)
* **Data Format per Line:**
  `Year Month Day Hour Minute Sea_Level_Pressure(hPa) Station_Pressure(hPa) Temp(°C) Wind_Speed(knots) Wind_Dir(deg)`
  Null indicator: `-999`.
* **Role in POLARIS-X:** Defines station weather risk nodes and calibrates regional wind and barometric storm impedance fields.

### 2.6 Geographic & Operational Convergence: "The Golden Demo Corridor"
The **Antarctic Peninsula and Weddell Sea corridor** (`-78°S` to `-54°S`, `-75°W` to `-25°W`) is where all 5 datasets converge:
1. All 8 BAS weather stations are clustered along this passage.
2. Mega-icebergs **A68A** (calved from Larsen C) and **A23A** (drifting from Filchner-Ronne) transit this exact corridor through the Scotia Sea toward South Georgia ("Iceberg Alley").
3. Connects active polar bases (e.g. **Rothera Station** $\rightarrow$ **Grytviken / South Georgia**).

---

## 3. Executive Maritime Design System & Production Color Palette

POLARIS-X avoids pitch-black gaming HUDs, heavy neon glows, and sci-fi aesthetic cliches. Instead, it adopts the **Executive Maritime Enterprise Design Standard**—modeled after tier-1 scientific and commercial maritime systems (Copernicus Marine Service, Windward AI, Spire Maritime, and Linear).

It prioritizes high-contrast legibility, clean daylight-readable cards, subtle slate borders, and understated, corporate-grade risk signaling.

```
+-----------------------------------------------------------------------------------------+
|                  EXECUTIVE MARITIME ENTERPRISE COLOR PALETTE                            |
+----------------------+--------------------+---------------------------------------------+
| Token                | Value              | Application / Role                          |
+----------------------+--------------------+---------------------------------------------+
| Base Canvas          | #F8FAFC (Slate 50) | Crisp, clean, daylight application backdrop |
| Panel / Card Surface | #FFFFFF (Pure White)| Primary Bento cards, sidebars, dock        |
| Surface Hover        | #F1F5F9 (Slate 100)| Interactive hover states                    |
| Surface Border       | #E2E8F0 (Slate 200)| Hairline 1px border for crisp separation    |
| Primary Text         | #0F172A (Slate 900)| High-contrast, sharp executive typography   |
| Secondary Text       | #475569 (Slate 600)| Muted metadata, coordinates, units          |
| Muted Delimiter      | #94A3B8 (Slate 400)| Inactive icons, subtle gridlines            |
| Primary Brand Accent | #0284C7 (Sky 600)  | Recommended safe route, primary actions     |
| Brand Accent Hover   | #0369A1 (Sky 700)  | Button hover, selected waypoints            |
| Comparison Line      | #64748B (Slate 500)| Direct shortest route (dashed contrast)     |
+----------------------+--------------------+---------------------------------------------+
| SEMANTIC RISK TOKENS (Understated Enterprise Badges, No Neon)                           |
+----------------------+--------------------+---------------------------------------------+
| Safe / Low Risk      | Text: #047857      | Subtle badge: bg-emerald-50 text-emerald-700|
|                      | Fill: #ECFDF5      | border border-emerald-200                   |
| Medium / Caution     | Text: #B45309      | Subtle badge: bg-amber-50 text-amber-700    |
|                      | Fill: #FFFBEB      | border border-amber-200                     |
| Severe / Alert       | Text: #B91C1C      | Subtle badge: bg-rose-50 text-rose-700      |
|                      | Fill: #FEF2F2      | border border-rose-200                      |
+----------------------+--------------------+---------------------------------------------+
```

### 3.1 Production Surface Elevation & Shadows
* **Layer 0 (Canvas):** `#F8FAFC` (Clean Slate 50)
* **Layer 1 (Bento Cards & Rails):** `#FFFFFF` with `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)` and `border: 1px solid #E2E8F0`
* **Layer 2 (Elevated Modals & Tooltips):** `#FFFFFF` with `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)` and `border: 1px solid #CBD5E1`

### 3.2 Enterprise Semantic Badges
Badges are clean, subtle, and accessible—never harsh or fluorescent:
```tsx
// Production-grade enterprise status badge
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  LOW RISK · 0.21
</span>
```

---

## 4. Typography & Icon Asset Catalog

* **Display & Panel Titles:** `Space Grotesk` (geometric, technical, authoritative bridge tone).
* **Body & Explanations:** `Inter` (neutral, high legibility for dense mission logs).
* **Telemetry, Coordinates, Bearings & Timers:** `IBM Plex Mono` with `tabular-nums` (prevents visual jitter during real-time updates).

### Icon Assets (`lucide-react`)
* **Navigation:** `<Compass />`, `<Navigation />`, `<Anchor />`, `<MapPin />`, `<Route />`
* **Hazards:** `<ShieldAlert />`, `<Wind />`, `<Waves />`, `<Snowflake />`, `<AlertTriangle />`
* **Telemetry:** `<Fuel />`, `<Clock />`, `<Cpu />`, `<Layers />`, `<Activity />`, `<Gauge />`
* **Actions:** `<SlidersHorizontal />`, `<Sparkles />`, `<Info />`, `<RotateCcw />`, `<Play />`

---

## 5. Spatial Layout & Enterprise Console Architecture

Combining the **Cockpit / Command Center HUD** from **/enterprise-ui-layout-catalog** with the **Asymmetrical Bento Hierarchy** from **/spatial-layout-bento-design**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] POLARIS-X   MISSION: ANT-26059   VESSEL: MV VASILIY GOLOVNIN (PC-5)   UTC: 12:40:00      │
├───────────────────┬─────────────────────────────────────────────────────────┬───────────────────┤
│ LEFT RAIL (320px) │ CENTER SPATIAL HERO (FLEX-1)                            │ RIGHT RAIL (340px)│
│                   │                                                         │                   │
│ [ BENTO CARD 1 ]  │  ┌───────────────────────────────────────────────────┐  │ [ BENTO CARD 3 ]  │
│ ROUTE PLANNER     │  │ TOP TELEMETRY STRIP (HUD)                         │  │ SITUATION INTEL   │
│ - Departure       │  │ Lat: -67.57°S | Lon: -68.12°W | Ice: 4.8M km²     │  │ - Active Bergs: 14│
│ - Destination     │  └───────────────────────────────────────────────────┘  │ - Baro: 984 hPa   │
│ - Ice Class       │                                                         │ - Wind: 32 kts WSW│
│ - Fuel/Risk Ratio │             MAPLIBRE POLAR PROJECTION CANVAS            │                   │
│                   │                                                         │ [ BENTO CARD 4 ]  │
│ [ BENTO CARD 2 ]  │   (▲) Tracked Icebergs (A68A, A23A) with Drift Cones    │ ICEBERG INSPECTOR │
│ ACTIVE LAYERS     │   (░) Sea-Ice Concentration Heatmap Raster              │ - Selected: A68A  │
│ [X] Sea Ice       │   (·) BAS Synoptic Stations (Rothera, Grytviken)        │ - Dimensions:     │
│ [X] Iceberg Cones │                                                         │   82 NM x 26 NM   │
│ [X] Weather Grid  │   =========> RECOMMENDED CORRIDOR (Sky-600 Solid)       │ - Drift: 0.8 km/d │
│                   │   - - - - - > DIRECT SHORTEST TRACK (Slate-500 Dashed)  │ - Status: Drifting│
│ [ FIND OPTIMAL ]  │                                                         │                   │
│ [ ROUTE (A*)   ]  │  ┌───────────────────────────────────────────────────┐  │ [ SIMULATE BERG ] │
│                   │  │ FLOATING TIME-LAPSE & REROUTE DOCK                │  │ [ SURGE EVENT   ] │
│                   │  └───────────────────────────────────────────────────┘  │                   │
├───────────────────┴─────────────────────────────────────────────────────────┴───────────────────┤
│ PERSISTENT COMPARISON DOCK & EXPLAINABLE AI STRIP                                               │
│ Recommended Route: ETA 76.4h  |  Fuel: 104.2%  |  Dist: 1084 NM  |  Risk: LOW (0.23)            │
│ Direct Route     : ETA 71.2h  |  Fuel: 100.0%  |  Dist: 982 NM   |  Risk: HIGH (0.79)           │
│ [ WHY THIS ROUTE? - EXPLAINABLE AI BREAKDOWN ]                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Proportional Radii Nesting Rule
To prevent awkward clipping across Bento containers:
* **Outer Console Rails:** `rounded-2xl (16px)`
* **Bento Cards & Modals:** `rounded-xl (12px)`
* **Action Buttons & Form Selectors:** `rounded-lg (8px)`
* **Status Badges & Pills:** `rounded-full (9999px)`

### 5.2 Mobile-First Ergonomics (/mobile-ergonomics)
* Touch targets strictly $\ge 44 \times 44\text{ px}$.
* Safe area inset handling: `padding-bottom: max(16px, env(safe-area-inset-bottom))`.
* On touch screens / mobile, side rails collapse into smooth spring-physics bottom sheets (`Framer Motion`: `damping: 28, stiffness: 280`).

---

## 6. Vessel Models & Marine Physics Specifications

Supporting real polar expeditions (MoES / NCPOR), POLARIS-X defines **3 operational vessel profiles**:

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

### 6.1 Marine Physics Formulas
$$V_{effective} = V_{cruising} \cdot \max\left(0.2, \; 1 - K_{hull} \cdot (R_{ice})^{1.8}\right) \cdot \left(1 - 0.25 \cdot R_{wx}\right)$$
$$\text{Fuel Proxy}_{\%} = 100 \times \sum_{k=0}^{n-1} \left[ \left(\frac{V_{effective}}{V_{cruising}}\right)^3 \cdot \left(1 + K_{hull} \cdot R_{ice}\right) \cdot \Delta t_k \right] \Big/ \text{Fuel}_{open\_water}$$

---

## 7. Database Engineering & PostGIS Schema

Following **/database-engineering-optimization**, we implement the **Left-to-Right Composite Index Rule**, partial filtered indexes, and GIN spatial indexing:

```sql
create extension if not exists postgis;

-- 1. Sea Ice Observations & Trends
create table sea_ice (
  id uuid primary key default gen_random_uuid(),
  "timestamp" date not null,
  year int not null,
  month int not null,
  ice_extent_million_sqkm numeric not null,
  anomaly_score numeric,
  source text default 'nsidc_aggregate_csv',
  quality_flag text default 'observed',
  created_at timestamptz default now()
);

-- 2. Tracked Icebergs
create table icebergs (
  id uuid primary key default gen_random_uuid(),
  iceberg_id text not null,
  "timestamp" date not null,
  latitude double precision not null,
  longitude double precision not null,
  geom geography(Point, 4326),
  length_nm numeric,
  width_nm numeric,
  size_sqkm numeric,
  disp_km numeric default 0,
  vel_angle_deg numeric default 0,
  status text default 'drifting',
  source text not null,
  quality_flag text default 'observed',
  created_at timestamptz default now()
);

-- 3. Synoptic Weather Station Observations
create table weather_observations (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  station_name text not null,
  "timestamp" timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  geom geography(Point, 4326),
  sea_level_pressure_hpa numeric,
  temperature_c numeric,
  wind_speed_knots numeric,
  wind_direction_deg numeric,
  source text default 'bas_surface_met',
  quality_flag text default 'observed',
  created_at timestamptz default now()
);

-- 4. Spatial Navigation Risk Grid (Precomputed Lattice)
create table risk_grid (
  id uuid primary key default gen_random_uuid(),
  "timestamp" date not null,
  cell_id text not null,
  centroid_lat double precision not null,
  centroid_lon double precision not null,
  geom geography(Polygon, 4326),
  sea_ice_risk numeric not null check (sea_ice_risk between 0 and 1),
  iceberg_risk numeric not null check (iceberg_risk between 0 and 1),
  weather_risk numeric not null check (weather_risk between 0 and 1),
  total_risk numeric not null check (total_risk between 0 and 1),
  confidence numeric default 0.85,
  created_at timestamptz default now()
);

-- 5. Route Run Audit & Optimization Logs
create table route_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  start_lat double precision not null,
  start_lon double precision not null,
  dest_lat double precision not null,
  dest_lon double precision not null,
  vessel_type text default 'polar_research_vessel',
  ice_class text default 'PC-5',
  recommended_route_geojson jsonb not null,
  alternative_routes_geojson jsonb,
  risk_level text not null,
  risk_score numeric not null,
  eta_hours numeric not null,
  fuel_proxy_pct numeric not null,
  distance_nm numeric not null,
  explanation text not null
);

-- Optimized Indexes (Left-to-Right + Partial + GIN)
create index idx_icebergs_lookup on icebergs (iceberg_id, "timestamp");
create index idx_active_icebergs on icebergs (iceberg_id) where status = 'drifting';
create index idx_icebergs_geom on icebergs using gist (geom);
create index idx_weather_geom on weather_observations using gist (geom);
create index idx_risk_grid_lookup on risk_grid ("timestamp", cell_id);
create index idx_risk_grid_geom on risk_grid using gist (geom);
create index idx_route_runs_geojson on route_runs using gin (recommended_route_geojson jsonb_path_ops);
```

---

## 8. Backend Systems Architecture & AppSec Hardening

Following **/backend-system-architecture** and **/appsec-defense-hardening**:

```
[ HTTP Router /api/route ]
         │ (1. Zero-Trust Pydantic Validation & Bounds Checking)
         ▼
[ PolarRoute Service ]
         │ (2. Multi-Objective Cost & Great-Circle Heuristics)
         ▼
[ RiskGrid & BergTrack Engines ]
         │ (3. Kinematics, Gaussian Hazard Buffering, Weather IDW)
         ▼
[ PostGIS / In-Memory Spatial Store ]
```

### 8.1 Uniform API Envelope
```json
{
  "success": true,
  "data": {
    "recommended_route": { ... },
    "alternatives": [ ... ],
    "metrics": {
      "risk_level": "LOW",
      "risk_score": 0.23,
      "eta_hours": 76.4,
      "fuel_proxy_pct": 104.2,
      "distance_nm": 1084.5
    },
    "explanation": "Route B avoids iceberg A68A drift zone, reducing collision risk by 68% for +4.2% fuel."
  },
  "meta": {
    "calculation_time_ms": 118,
    "simulation_date": "2021-03-15",
    "vessel_class": "PC-5"
  }
}
```

### 8.2 AppSec Defense
* **Coordinate Bounds Enforcement:** Validates latitude `[-90, -50]` and longitude `[-180, 180]`.
* **Zero-Leakage Error Handler:** Production exceptions masked; detailed traces emitted only to server logs.
* **Probes:** Unauthenticated health probe at `/api/health` returning uptime, memory status, and PostGIS latency.

---

## 9. Frontend Architecture & Web Performance

Following **/frontend-architecture-perf**:
* **RSC by Default:** Layout, header, and static panels rendered on server; `'use client'` pushed to interactive leaves (`<MapCanvas />`, `<RoutePlanner />`, `<TimeSlider />`).
* **MapLibre GL Dynamic Import:**
  ```tsx
  const PolarMap = dynamic(() => import('@/components/map/PolarMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse" />
  });
  ```
* **Core Web Vitals:** Guaranteed **CLS $\le 0.1$** and **INP $\le 200\text{ms}$** using WebGL hardware-accelerated Linestring rendering and memoized GeoJSON vectors.

---

## 10. Test Engineering & QA Automation Plan

Following **/test-engineering-qa**:
1. **Unit Tests (Pytest / Vitest):**
   * Haversine great-circle distance accuracy against Vincenty benchmark ($< 0.1\%$ error).
   * Julian date conversion (`YYYYDDD` $\leftrightarrow$ `YYYY-MM-DD`).
   * $A^*$ heuristic admissibility ($h(u) \le \mathcal{C}^*(u, dest)$).
   * Vessel cubic fuel consumption calculation.
2. **Integration Tests:**
   * `/api/route` payload contract validation.
   * Dynamic reroute simulation endpoint latency ($< 250\text{ms}$).
3. **Playwright E2E Test Suite:**
   * Automated verification of the 5-act demo:
     1. Select Rothera $\rightarrow$ Grytviken.
     2. Verify Recommended route renders solid Sky-600 line; Direct route renders dashed Slate-500 line.
     3. Assert comparison dock displays correct ETA/Fuel differential.
     4. Open "Why this route?" modal and assert risk decomposition text is visible.
     5. Trigger "Simulate Iceberg Surge" button and assert new route draws with alert banner.

---

## 11. SIH Winning Pitch Strategy & Demo Script

### 11.1 The Five-Act Live Demonstration Script
1. **Act I: The Strategic Setup.** Open on the Antarctic Peninsula map. Show the research vessel stationed at Rothera Station aiming to navigate to Grytviken (South Georgia). Display the raw layers: sea ice background, weather stations, and active icebergs.
2. **Act II: The Naive Shortest Path Failure.** Click "Compute Direct Route". Show the direct great-circle route slicing directly through the path of mega-iceberg **A68A** and dense pack ice. Risk indicator turns Crimson (`HIGH · 0.79`).
3. **Act III: The POLARIS-X Optimization.** Click "Find POLARIS Route". The A* optimizer processes the dynamic risk field in <150ms. A sleek maritime-blue corridor routes safely north through the Bransfield Strait, clearing the hazard zone.
4. **Act IV: The "Why this route?" Differentiator.** Click the Explain button. The system displays attribution metrics: *“Iceberg collision exposure reduced by 68%, storm zone bypassed, at the cost of only +4.2% fuel proxy.”*
5. **Act V: The Live Dynamic Rerouting.** Trigger the "Simulate Iceberg Surge" button. Iceberg A68A drifts into the planned corridor. In real-time, the system issues a collision-corridor warning, recalculates the path dynamically, renders the new trajectory, and updates the explanation.

### 11.2 Winning Pitch Soundbites
> *"We are not building another Antarctic map. We are building the decision layer that turns heterogeneous satellite, oceanographic, and meteorological data into explainable, vessel-specific navigation recommendations under uncertainty."*

> *"POLARIS-X tells a navigator not only where the hazards are, but which route to take, why it is safer, how much fuel it will consume, and how confident the system is in its recommendation."*

---

## 12. Complete Execution Checklist & Project Structure

```
Polaris-X/
├── backend/
│   ├── app/
│   │   ├── core/           # Security, config, mathematical constants
│   │   ├── data/           # ETL loaders for BYU stats, NIC reports, BAS stations
│   │   ├── engines/        # Risk Grid Generator, BergTrack AI, PolarRoute A*
│   │   ├── api/            # Route handlers (/api/route, /api/layers, /api/simulate)
│   │   └── main.py         # FastAPI application entry point
│   ├── tests/              # Pytest unit & integration tests
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/            # Next.js 14 App Router (layout.tsx, page.tsx)
    │   ├── components/     # Tactical Bento Console, PolarMap, ComparisonDock, Modals
    │   ├── lib/            # Design tokens, API client, GeoJSON transformers
    │   └── styles/         # Tailwind config, chromatic color variables, Space Grotesk
    ├── package.json
    └── tailwind.config.ts
```

*This master document is now the definitive, fully audited single source of truth for the POLARIS-X project.*
