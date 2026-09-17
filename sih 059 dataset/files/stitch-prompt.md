# Stitch Prompt — POLARIS-X Dashboards

Copy the block below into Stitch as a single prompt.

---

```
Design a web dashboard called "POLARIS-X" — an AI-powered Antarctic navigation
decision-support console used by ship captains and navigation officers to plan
safe, fuel-efficient routes through sea ice and iceberg fields. This is a
mission-critical instrument panel, not a marketing site or generic SaaS
dashboard — think ship's bridge console / mission control, not a startup
landing page.

LAYOUT
Full-bleed interactive Antarctic map as the dominant center surface, styled
with a dark polar-night basemap. Left docked panel (~300px) for a "Route
Planner": departure point selector, destination point selector, layer toggles
(sea-ice risk, iceberg positions, weather risk), and a "Find route" primary
button. Right docked panel (~320px) for a "Risk Summary": current sea-ice
risk level, iceberg count in corridor, weather risk level, each shown as a
labeled risk badge with both a color and a numeric score (e.g. "HIGH · 0.78"),
never color alone. A thin top bar with the product name, current operating
region, and a small monospace "data freshness" chip (e.g. "Sea ice: observed,
2024-11-02 · Weather: historical station data"). A persistent bottom dock
strip that always shows: recommended route stats vs. an alternative
(shortest) route stats side by side — Risk level, ETA in hours, fuel proxy,
distance — plus a "Why this route?" button that opens a panel explaining the
recommendation in plain language with a risk breakdown.

On the map itself: render the recommended route as a solid bold line, the
alternative/shortest route as a dashed thinner line in a different shade (not
just a different color), several iceberg markers with size proportional to
iceberg size and fill color indicating local risk, a faint directional
trajectory line trailing from each iceberg fading in opacity to represent
predicted movement and uncertainty, and a soft heat-map style overlay for
sea-ice risk zones.

Also design a second screen: a "Dynamic Rerouting" moment — same layout, but
mid-transition, showing an expanding risk zone near the original route, the
old route fading out, a new recommended route drawing in, and the bottom dock
comparison strip showing "OLD ROUTE" vs "NEW ROUTE" stat deltas.

VISUAL STYLE
Dark, quiet, instrument-grade UI. Base background a deep polar-night navy
(near #0A1420), panel surfaces one step lighter (near #101E30), primary text
near-white ice blue (#E7F1F5), secondary/muted text a soft blue-grey
(#9FC4D6). Reserve saturated color almost entirely for risk signaling: teal-
green for low risk (#3FA98A), amber for medium risk (#E0A93D), muted red for
high risk (#D9534F). Primary interactive accent is a glacier blue (#3FA9CE)
used for the recommended route, active states, and the primary button. Flat
panels with a single hairline border, minimal border-radius (max ~6px) — no
soft drop-shadow SaaS cards, no gradient washes, no glassmorphism.

TYPOGRAPHY
Headings and key numbers (like ETA and risk score) in a geometric,
slightly technical sans-serif (Space Grotesk style). Body text and UI labels
in a clean neutral sans-serif (Inter style). Coordinates, iceberg IDs, and
timestamps set in a monospace face (IBM Plex Mono style) so literal data
reads as data. Sentence case everywhere — no tracked-out all-caps labels, no
single-word accented headlines, no arrow-suffixed button text, no middle-dot
metadata strings.

TONE
Direct, plain-language, operator-facing copy — never marketing language.
Buttons name the action exactly ("Find route," "Compare routes," "Why this
route?"). Explanations state numbers and confidence, e.g. "Route B reduces
predicted ice exposure by 18% while increasing distance by 6%. Confidence:
medium, based on 3 recent iceberg observations." Empty/error states explain
what happened and what to do next in the interface's own voice.

Deliver both screens (main dashboard, and the dynamic-rerouting moment) at
desktop width, in the dark theme described above.
```

---

### Notes for use
- Paste the whole fenced block as one Stitch prompt — do not split it into multiple prompts, since layout, style, and tone are meant to be generated together for consistency.
- If Stitch supports iterative refinement, follow up with: "Now generate a mobile/narrow layout where the left and right panels collapse into bottom sheets and the map stays primary" to get the responsive variant described in `design.md`.
- Cross-reference `design.md` for the full token system (exact hex values, type scale, component rules) if you need to hand-tune anything Stitch outputs.
