# Technology Stack & System Architecture Specification
## POLARIS-X: Polar Operational Logistics, Ice Risk & Intelligent Routing System

---

## 1. System Architecture Overview

POLARIS-X is built on a modern, decoupled client-server architecture designed for high-throughput geospatial computation, instant user feedback, and robust security isolation:

```
+-----------------------------------------------------------------------------------------+
|                              FRONTEND: NEXT.JS 14+ APP ROUTER                           |
|  - React 18/19 Server Components (RSC by default) + Client Leaf Components              |
|  - MapLibre GL JS / Leaflet (WebGL GPU Hardware Accelerated Polar Projection Canvas)    |
|  - Tailwind CSS + Space Grotesk / Inter / IBM Plex Mono Typography                      |
|  - Lucide React Icon Assets + Framer Motion Spring Transitions                          |
+--------------------------------------------^--------------------------------------------+
                                             | REST (JSON / GeoJSON Envelope)
+--------------------------------------------v--------------------------------------------+
|                              BACKEND: FASTAPI SYSTEM CORE                               |
|  - Python 3.10+ / FastAPI / Uvicorn ASGI Server                                         |
|  - Zero-Trust Runtime Schema Parsing via Pydantic v2                                    |
|  - 3-Tier Layering: Transport (Routers) -> Service (Engines) -> DAL (Loaders)           |
+--------------------------------------------^--------------------------------------------+
                                             | In-Memory Graph / PostGIS Queries
+--------------------------------------------v--------------------------------------------+
|                              COMPUTATIONAL & DATA ENGINES                               |
|  [RiskGrid Engine]         [BergTrack AI]         [PolarRoute A*]      [XAI Engine]     |
|  - Composite Risk 2D Grid  - Kinematics & Drift   - Multi-Objective    - Attribution    |
|  - IDW Weather Interpolate - Uncertainty Cones    - Great-Circle A*    - Natural Lang   |
+--------------------------------------------^--------------------------------------------+
                                             | Spatial PostGIS Queries
+--------------------------------------------v--------------------------------------------+
|                              DATA & PERSISTENCE LAYER                                   |
|  - PostgreSQL 15+ with PostGIS Spatial Extension (Supabase / Local Instance)            |
|  - In-Memory High-Speed Spatial Lattice (NumPy / SciPy / NetworkX)                      |
|  - Raw Ingestion: BYU Stats, NIC Weekly Reports, BAS Weather Datastreams, NSIDC Extent  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Technology Stack Taxonomy

### 2.1 Frontend Stack

| Layer / Library | Technology / Package | Version | Architectural Purpose & Rationale |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `^14.2.0` | React Server Components (RSC) for initial page delivery, streaming with Suspense, and edge routing. |
| **Core UI Library** | React & React DOM | `^18.3.0` | Declarative UI state management and concurrent rendering. |
| **Language** | TypeScript | `^5.4.0` | End-to-end type safety across API contracts, GeoJSON structures, and UI state models. |
| **Styling** | Tailwind CSS | `^3.4.0` | Utility-first CSS engine enforcing design tokens, responsive breakpoints, and strict elevation scales. |
| **Map Engine** | MapLibre GL JS | `^4.1.0` | WebGL GPU hardware-accelerated mapping, dynamic GeoJSON line styling, and polar custom tile layers. |
| **Map Bridge** | React-Map-GL (or MapLibre wrapper) | `^7.1.0` | React component abstraction for MapLibre lifecycle events. |
| **Animations** | Framer Motion | `^11.0.0` | Natural spring physics (`stiffness: 350, damping: 25`) for panel transitions and slide-out drawers. |
| **Iconography** | Lucide React | `^0.360.0` | Tree-shakeable, accessible vector icons (`<Compass />`, `<Anchor />`, `<Wind />`, `<Fuel />`). |
| **HTTP Client** | Native `fetch` + SWR | Native / `^2.2.0` | Stale-While-Revalidate caching for geospatial layers with optimistic UI mutation rollbacks. |

### 2.2 Backend Stack

| Layer / Library | Technology / Package | Version | Architectural Purpose & Rationale |
|---|---|---|---|
| **API Framework** | FastAPI | `^0.110.0` | Asynchronous, high-performance Python ASGI web framework with automatic OpenAPI documentation. |
| **ASGI Server** | Uvicorn (standard) | `^0.28.0` | Ultra-fast ASGI server implementation for asynchronous request handling. |
| **Validation** | Pydantic v2 | `^2.6.0` | Strict zero-trust input parsing, coordinate bounds enforcement, and JSON serialization. |
| **Pathfinding** | NetworkX | `^3.2.0` | Fast graph construction and $A^*$ pathfinding over the 8-connected risk lattice. |
| **Spatial Analysis** | Shapely & GeoPandas | `^2.0.0` / `^0.14.0` | Geometric polygon operations, iceberg buffer computation, and spatial coordinate conversions. |
| **Scientific Computing** | NumPy & SciPy | `^1.26.0` / `^1.12.0` | 2D risk grid arrays, Inverse Distance Weighting (IDW) interpolation, and matrix operations. |
| **Data Processing** | Pandas | `^2.2.0` | Ingestion, filtering, and parsing of BYU Julian day timestamps, NIC tables, and BAS station files. |

### 2.3 Database & Infrastructure

| Layer / Tool | Technology | Version | Purpose & Rationale |
|---|---|---|---|
| **Database** | PostgreSQL + PostGIS | `PostgreSQL 15+` / `PostGIS 3.3+` | Spatial database holding iceberg point trajectories, station geometries, and GeoJSON route audit logs. |
| **Cloud Provider** | Supabase (or Local Docker) | Latest | Managed Postgres with native PostGIS, spatial indexes, and REST APIs. |
| **Containerization** | Docker & Docker Compose | `^24.0.0` | Isolated multi-container deployment (FastAPI backend + Next.js frontend + PostGIS). |

---

## 3. Separation of Concerns & Clean Layering

Following **/backend-system-architecture**, the backend enforces strict 3-tier layering:

```
[ Transport Layer: app/api/routes.py ]
         │ (1. Zero-Trust Pydantic Validation & HTTP Status Codes)
         ▼
[ Service Layer: app/services/polar_route.py & app/services/xai.py ]
         │ (2. Pure Domain Logic, A* Optimization, Metrics, XAI Decomposition)
         ▼
[ Domain Engines: app/engines/risk_grid.py & app/engines/berg_track.py ]
         │ (3. Kinematic Modeling, Gaussian Hazard Buffers, IDW Spatial Grid)
         ▼
[ Data Access Layer: app/data/loaders.py & PostGIS Repository ]
         │ (4. Dataset Extraction, Ingestion, and Spatial Queries)
```

---

## 4. API Contract & Response Envelope Standards

All API endpoints return a standardized, uniform envelope:

### 4.1 Success Response Schema
```json
{
  "success": true,
  "data": {
    "recommended_route": {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-68.12, -67.57], [-60.50, -62.80], [-36.48, -54.28]]
      },
      "properties": {
        "name": "POLARIS Safe Corridor",
        "waypoints_count": 48
      }
    },
    "alternatives": [
      {
        "route_id": "route_direct_shortest",
        "name": "Direct Shortest Track (Unadjusted)",
        "geometry": {
          "type": "LineString",
          "coordinates": [[-68.12, -67.57], [-52.30, -61.00], [-36.48, -54.28]]
        },
        "metrics": {
          "risk_level": "HIGH",
          "risk_score": 0.79,
          "eta_hours": 71.2,
          "fuel_proxy_pct": 100.0,
          "distance_nm": 982.0
        }
      }
    ],
    "metrics": {
      "risk_level": "LOW",
      "risk_score": 0.23,
      "eta_hours": 76.4,
      "fuel_proxy_pct": 104.2,
      "distance_nm": 1084.5
    },
    "hazards_avoided": [
      { "id": "A68A", "type": "Tabular Iceberg", "risk_contribution": "Critical" }
    ],
    "explanation": "Route B is recommended because it detours north of Elephant Island, reducing iceberg collision hazard exposure by 68% and avoiding the active drift field of iceberg A68A, at a trade-off of +102.5 NM (+4.2% estimated fuel)."
  },
  "meta": {
    "calculation_time_ms": 118,
    "simulation_date": "2021-03-15",
    "vessel_class": "PC-5",
    "grid_resolution_deg": 0.25
  }
}
```

### 4.2 Error Response Schema
```json
{
  "success": false,
  "error": {
    "code": "COORDINATES_OUT_OF_BOUNDS",
    "message": "Departure coordinates (-45.2, -30.1) fall outside the valid Antarctic navigation coverage corridor (-78.0 to -52.0 S).",
    "details": {
      "field": "start.lat",
      "provided_value": -45.2,
      "allowed_range": "[-90.0, -50.0]"
    }
  }
}
```

---

## 5. Security & AppSec Defense Hardening

Following **/appsec-defense-hardening**:

1. **Zero-Trust Input Parsing:** All incoming payloads are validated via Pydantic schemas with `.strict()` parsing to eliminate mass-assignment and prototype pollution vulnerabilities.
2. **Geographic Bounds Enforcement:** Latitude is constrained strictly to `[-90.0, -50.0]`; longitude is normalized to `[-180.0, 180.0]`.
3. **HTTP Security Headers:**
   * `X-Content-Type-Options: nosniff`
   * `X-Frame-Options: SAMEORIGIN`
   * `Referrer-Policy: strict-origin-when-cross-origin`
   * `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
4. **Zero-Leakage Error Handling:** Unhandled backend exceptions are logged securely with structured traces; clients receive clean, masked error codes.
5. **Production Health Probe:** Dedicated `/api/health` probe reporting service uptime, memory consumption, and PostGIS latency.

---

## 6. Frontend Performance & Core Web Vitals Optimization

Following **/frontend-architecture-perf**:

1. **Server Components by Default:** Page wrappers, metadata, and static information panels are compiled as React Server Components (RSC) to minimize initial client JavaScript bundles.
2. **Dynamic Client Component Isolation:** MapLibre GL is dynamically imported with `ssr: false` and a matching skeleton placeholder to eliminate Cumulative Layout Shift (CLS $\le 0.05$):
   ```tsx
   const PolarMap = dynamic(() => import('@/components/map/PolarMap'), {
     ssr: false,
     loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />
   });
   ```
3. **GPU Hardware Acceleration:** Route linestrings, iceberg boundary polygons, and weather heatmaps are rendered directly on WebGL shader pipelines rather than DOM SVGs, ensuring smooth 60fps panning and zooming.

---

## 7. Testing & Quality Assurance Plan

Following **/test-engineering-qa**:

* **Unit Testing (Pytest):** Great-circle Haversine math, Julian date conversions, $A^*$ admissibility assertions ($h(u) \le \mathcal{C}^*(u, dest)$), and cubic fuel curves.
* **API Integration Testing (Pytest + HTTPX):** Endpoint contract validation on `/api/route`, `/api/layers`, `/api/simulate-reroute`, and `/api/health`.
* **End-to-End Automation (Playwright):** Full browser verification of the 5-act user journey:
  1. Load Antarctic Peninsula Map.
  2. Select Departure (Rothera) and Destination (Grytviken).
  3. Assert Recommended (Sky-600) and Direct (Slate-500) routes are rendered.
  4. Assert Comparison Dock populates correct ETA and Fuel differentials.
  5. Open "Why this route?" modal and assert XAI text appears.
  6. Trigger "Simulate Iceberg Surge" and assert dynamic route update.
