# Executive Maritime Design System Specification
## POLARIS-X: Polar Operational Logistics, Ice Risk & Intelligent Routing System

---

## 1. Design Brief & Philosophy

### 1.1 Executive Production Standard
POLARIS-X rejects sci-fi video game tropes, pitch-black dark rooms, and aggressive neon glows. Instead, it implements the **Executive Maritime Enterprise Design Standard**—modeled after tier-1 scientific and commercial maritime systems (Copernicus Marine Service, Windward AI, Spire Maritime, and Linear).

It prioritizes:
1. **Daylight Legibility:** High-contrast, clean surfaces readable on ship bridge monitors and executive control rooms.
2. **Restrained Color Discipline:** Color is reserved strictly for operational state and hazard signaling; the UI background remains clean, neutral, and unobtrusive.
3. **Tactile Instrumentation:** Proportional Bento nesting, crisp hairline borders, and responsive spring physics.

---

## 2. Executive Color Palette Tokens

```
+-----------------------------------------------------------------------------------------+
|                  EXECUTIVE MARITIME ENTERPRISE COLOR PALETTE                            |
+----------------------+--------------------+---------------------------------------------+
| Token                | Value              | Application / Role                          |
+----------------------+--------------------+---------------------------------------------+
| Base Canvas          | #F8FAFC (Slate 50) | Crisp, clean, daylight application backdrop |
| Panel / Card Surface | #FFFFFF (Pure White)| Primary Bento cards, sidebars, dock        |
| Surface Hover        | #F1F5F9 (Slate 100)| Interactive row/card hover states           |
| Surface Border       | #E2E8F0 (Slate 200)| Hairline 1px border for crisp separation    |
| Primary Text         | #0F172A (Slate 900)| High-contrast, sharp executive typography   |
| Secondary Text       | #475569 (Slate 600)| Muted metadata, coordinates, units          |
| Muted Delimiter      | #94A3B8 (Slate 400)| Inactive icons, subtle gridlines            |
| Primary Brand Accent | #0284C7 (Sky 600)  | Recommended safe route, primary actions     |
| Brand Accent Hover   | #0369A1 (Sky 700)  | Button hover, selected waypoints            |
| Direct Baseline Line | #64748B (Slate 500)| Direct shortest route (dashed contrast)     |
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

### 2.1 Surface Elevation & Shadows
* **Layer 0 (Canvas Backdrop):** `#F8FAFC` (Slate 50)
* **Layer 1 (Bento Cards & Control Rails):** `#FFFFFF` with `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)` and `border: 1px solid #E2E8F0`
* **Layer 2 (Elevated Modals & Tooltips):** `#FFFFFF` with `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)` and `border: 1px solid #CBD5E1`

### 2.2 Semantic 10-100-20 Badge Formula
```tsx
// Compliant with production UI standards
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  LOW RISK · 0.21
</span>
```

---

## 3. Typography Architecture & Font Pairings

```
+-----------------------------------------------------------------------------------------+
| Level      | Font Family     | Size / Line Height | Weight | Application                |
+------------+-----------------+--------------------+--------+----------------------------+
| Hero Stat  | Space Grotesk   | 36px / 40px        | 700    | ETA Hours, Fuel % Readout  |
| H1 Title   | Space Grotesk   | 24px / 28px        | 600    | Console Header, Modal Title|
| H2 Section | Space Grotesk   | 18px / 22px        | 600    | Bento Card Titles          |
| Body       | Inter           | 14px / 20px        | 400    | Operational Explanations   |
| Small Meta | Inter           | 12px / 16px        | 500    | Field Labels, Unit Notes   |
| Telemetry  | IBM Plex Mono   | 13px / 18px        | 500    | Lat/Lon, Bearings, Timers  |
+-----------------------------------------------------------------------------------------+
```

* **Mandatory Rule:** All numeric telemetry, coordinates, and timers must use `tabular-nums font-mono` to prevent layout shift during real-time GPS streaming.

---

## 4. Spatial Layout & Console Anatomy

Combining the **Cockpit HUD** from **/enterprise-ui-layout-catalog** with the **Asymmetrical Bento Grid** from **/spatial-layout-bento-design**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] POLARIS-X   MISSION: ANT-26059   VESSEL: MV VASILIY GOLOVNIN (PC-5)   UTC: 12:40:00      │
├───────────────────┬─────────────────────────────────────────────────────────┬───────────────────┤
│ LEFT RAIL (320px) │ CENTER SPATIAL HERO (FLEX-1)                            │ RIGHT RAIL (340px)│
│                   │                                                         │                   │
│ [ BENTO CARD 1 ]  │  ┌───────────────────────────────────────────────────┐  │ [ BENTO CARD 3 ]  │
│ ROUTE PLANNER     │  │ TOP HUD TELEMETRY STRIP                           │  │ SITUATION INTEL   │
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

### 4.1 Proportional Radii Nesting Rule
To guarantee visual harmony:
* **Outer Console Container:** `rounded-2xl (16px)`
* **Bento Cards & Control Rails:** `rounded-xl (12px)`
* **Action Buttons & Form Selectors:** `rounded-lg (8px)`
* **Badges & Pills:** `rounded-full (9999px)`

### 4.2 Tactile Micro-Interactions (/ui-ux-pro)
* **Buttons:** Resting shadow `shadow-sm`, subtle lift on hover (`hover:-translate-y-0.5`), tactile compression on active press (`active:scale-[0.98]`).
* **Route Transitions:** Spring physics transition (`stiffness: 350, damping: 25`) when paths recalculate.
* **Skeleton Loaders:** Clean pulsing slate gradients (`bg-slate-100 animate-pulse`) replacing jarring layout shifts.

---

## 5. Mobile & Touch Ergonomics (/mobile-ergonomics)

1. **Touch Targets:** All interactive triggers, buttons, and map controls have a minimum bounding box of **$44 \times 44\text{ px}$**.
2. **Thumb Zone Architecture:** On touch viewports, primary route comparison stats and action triggers dock into the bottom 30% of the screen.
3. **Safe Area Insets:** Fixed bottom trays include dynamic padding:
   ```css
   padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
   ```
4. **Input Zoom Prevention:** All inputs use minimum `text-base md:text-sm` (16px) to prevent iOS Safari auto-zooming.
