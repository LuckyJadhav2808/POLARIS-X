# Design System — POLARIS-X

## 1. Design Brief Summary

**Subject:** A mission-critical navigation intelligence dashboard used by vessel captains, navigation officers, and mission planners operating in Antarctic waters. It is read under time pressure, sometimes in low-contrast conditions on a ship's bridge, and it must build trust in an AI recommendation while being honest about uncertainty.

**Audience:** Maritime/scientific operators — not consumers. Think instrumentation, not marketing. The interface should feel closer to a bridge navigation console or a mission-control ops screen than a SaaS dashboard.

**Primary job of the UI:** Let the user go from "where is the risk?" to "which route, and why?" as fast and as legibly as possible, with dynamic rerouting as the emotional high point of the experience.

**Explicitly avoid:** the generic SaaS-card look (identical rounded cards, soft grey drop shadows, gradient washes), the warm-cream/terracotta AI-generated default, and template chrome (tracked-out ALL-CAPS eyebrows, middle-dot metadata strings, arrow-suffixed buttons). This is not a landing page — restraint and instrumentation-grade clarity matter more than "delight."

---

## 2. Design Plan

### 2.1 Color

Grounded in the actual environment: ice, deep polar water, long polar night, and hazard signaling — not a generic dark-mode dashboard palette.

| Token | Hex | Role |
|---|---|---|
| `--ink-950` | `#0A1420` | Base background — deep polar-night navy, not pure black |
| `--ink-850` | `#101E30` | Panel/surface background, one step up from base |
| `--ice-100` | `#E7F1F5` | Primary text on dark surfaces |
| `--ice-400` | `#9FC4D6` | Secondary text, muted labels, gridlines |
| `--glacier-500` | `#3FA9CE` | Primary accent — active routes, selected states, links |
| `--risk-low` | `#3FA98A` | Low-risk signal (teal-green, not generic "success green") |
| `--risk-medium` | `#E0A93D` | Medium-risk signal (amber) |
| `--risk-high` | `#D9534F` | High-risk signal (muted alert red, not neon) |
| `--berg-white` | `#F4F8FA` | Iceberg markers / sea-ice overlay tint |

Light-mode variant (for print/report views only, not the primary console): invert to a pale ice-blue base (`#F2F6F8`) with the same accent and risk hues darkened ~10% for contrast.

**Principle:** color is reserved almost entirely for *risk and state*. The base UI is a quiet two-tone navy/ice system so that when something turns amber or red, it reads immediately as signal, not decoration.

### 2.2 Type

- **Display / headings:** *Space Grotesk* — geometric, slightly technical, legible at small sizes on instrument-style panels. Used for panel titles, key numbers (ETA, risk score), and the wordmark.
- **Body / UI text:** *Inter* — neutral, highly legible at small sizes for dense data panels, form labels, table content.
- **Data/mono (coordinates, timestamps, IDs):** *IBM Plex Mono* — used sparingly, only for literal coordinate pairs, iceberg IDs, and timestamps, so numeric data reads as data.

Type scale (base 16px):
```
Display   40 / 44   Space Grotesk, 600  — hero stat (e.g. ETA hours on comparison card)
H1        28 / 34   Space Grotesk, 600  — panel titles
H2        20 / 26   Space Grotesk, 500  — section headers
Body      15 / 22   Inter, 400          — panel copy, explanations
Small     13 / 18   Inter, 400          — labels, captions
Mono      13 / 18   IBM Plex Mono, 400  — coordinates, IDs, timestamps
```
No all-caps labels. No single-word accent styling in headings. Sentence case throughout.

### 2.3 Layout

**Concept: instrument console, not a landing page.** The map is the permanent hero surface; everything else is a docked panel around it, like a ship's bridge console. Left-aligned text throughout (no centered marketing blocks).

```
┌─────────────────────────────────────────────────────────────┐
│  POLARIS-X   [region]                    [freshness: ...]    │  ← thin top bar, not a hero
├───────────────┬─────────────────────────────────┬────────────┤
│               │                                   │            │
│  Route        │                                   │  Risk      │
│  Planner      │         ANTARCTIC MAP             │  Summary   │
│  (departure/  │     (risk layers, icebergs,       │  Panel     │
│  destination) │      route lines, grid)           │            │
│               │                                   │            │
├───────────────┴───────────────────────────────────┴────────────┤
│  Route Comparison Strip (recommended vs. alt) · Explain button  │
└───────────────────────────────────────────────────────────────┘
```

- Left rail (≈300px): route planner controls, layer toggles.
- Center: full-bleed map, dominant surface.
- Right rail (≈320px): risk summary + iceberg detail on selection.
- Bottom dock: persistent comparison strip (recommended route stats, alt route stats, "Why this route?" action) — always visible so judges/operators never lose the decision thread.
- On mobile/narrow viewports, rails collapse into a bottom sheet; the map remains primary.

### 2.4 Principles

1. **Risk is the only saturated color.** Everything else stays in the navy/ice tonal range so risk states are unmistakable.
2. **The explanation is never hidden behind a tooltip.** "Why this route?" is a first-class, always-visible action, not a secondary affordance.
3. **Numbers over adjectives.** Show risk score, ETA delta, fuel delta as numbers alongside the LOW/MEDIUM/HIGH label — never the label alone.
4. **Uncertainty is drawn, not just stated.** Iceberg trajectory uncertainty corridors and data-freshness tags are visual, not buried in copy.
5. **One motion moment.** The only orchestrated animation is the reroute transition (old route fading, new route drawing in, risk zone pulsing once) — everything else is static and instant, befitting an instrument panel.
6. **No decorative chrome.** No gradient washes, no matching rounded-card grid, no arrow-suffixed buttons, no eyebrow labels above every panel.

---

## 3. Component Guidance

- **Panels:** flat surfaces (`--ink-850`) with a single 1px hairline border (`rgba(159,196,214,0.15)`), border-radius 6px max — not the generic 16–20px SaaS-card radius. Corners are a mild instrument-panel softening, not a rounded-card aesthetic.
- **Buttons:** primary action uses `--glacier-500` fill with `--ink-950` text; secondary actions are outline-only on transparent. No drop shadows.
- **Risk badges:** small filled pill using the risk color, label + numeric score together (e.g. "HIGH · 0.78"), never color alone (accessibility).
- **Route lines on map:** recommended route = solid `--glacier-500`, 4px; alternative/shortest route = dashed `--ice-400`, 2px. Never rely on color alone — line style differs too.
- **Iceberg markers:** size scales with iceberg size, fill color scales with local risk; predicted trajectory drawn as a thin directional line fading in opacity with distance/uncertainty.
- **Data freshness tag:** small mono-type chip in the top bar, always visible (e.g. "Sea ice: observed, 2024-11-02 · Weather: station data, historical").
- **Charts (if used for risk trend):** line/area charts in `--glacier-500` on `--ink-850`, gridlines in low-opacity `--ice-400`, no legend clutter — label lines directly.

---

## 4. Content & Voice

- Write for a navigation officer, not a consumer: plain, direct, specific. "Route B reduces predicted ice exposure by 18%," not "Smart AI finds the best route for you!"
- Buttons are actions: "Find route," "Compare routes," "Why this route?" — not "Submit" or generic CTAs.
- Empty/error states explain what happened and what to do: "No data available for this corridor after 2023-08 — try a nearby waypoint," not a generic 404-style message.
- Never overstate certainty in copy: use "predicted," "estimated," "based on N observations," consistently.

---

## 5. Accessibility & Quality Floor

- All risk signaling doubled with shape/pattern/text, not color alone.
- Minimum contrast ratio 4.5:1 for body text against `--ink-950`/`--ink-850`.
- Visible keyboard focus states on all interactive map controls and panel actions.
- Responsive down to a single-column mobile layout with the map as primary and panels as collapsible sheets.
- Respect `prefers-reduced-motion` — disable the reroute transition animation, snap instantly instead.
