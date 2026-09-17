"use client";

import React, { useState } from "react";
import { GeoJSONLineString, IcebergFeature, WeatherStationFeature } from "@/types";
import { Compass, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Info } from "lucide-react";

interface PolarMapProps {
  recommendedRoute: GeoJSONLineString | null;
  directRoute: GeoJSONLineString | null;
  icebergs: IcebergFeature[];
  weatherStations: WeatherStationFeature[];
  stations: { name: string; lat: number; lon: number }[];
  visibleLayers: {
    icebergs: boolean;
    weather: boolean;
    seaIce: boolean;
    stations: boolean;
  };
  isSurgeActive?: boolean;
  scrubHours?: number; // 0 to 48 hours from bottom drawer
}

type HoveredEntity =
  | { type: "iceberg"; data: IcebergFeature["properties"] }
  | { type: "weather"; data: WeatherStationFeature["properties"] }
  | { type: "turn"; pin: TurnPin }
  | null;

interface TurnPin {
  id: string;
  lat: number;
  lon: number;
  title: string;
  divergence: string;
  benefit: string;
  cost: string;
}

// Bounding box of Golden Corridor
const MIN_LAT = -78.0;
const MAX_LAT = -52.0;
const MIN_LON = -75.0;
const MAX_LON = -25.0;

export const PolarMap: React.FC<PolarMapProps> = ({
  recommendedRoute,
  directRoute,
  icebergs,
  weatherStations,
  stations,
  visibleLayers,
  isSurgeActive = false,
  scrubHours = 0,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity>(null);
  const [activeTurnPin, setActiveTurnPin] = useState<TurnPin | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ lat: number; lon: number } | null>(null);

  const svgWidth = 1000;
  const svgHeight = 680;

  // Projection math
  const project = (lat: number, lon: number): [number, number] => {
    const x = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * svgWidth;
    const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * svgHeight;
    return [x, y];
  };

  const unproject = (x: number, y: number): [number, number] => {
    const lon = MIN_LON + (x / svgWidth) * (MAX_LON - MIN_LON);
    const lat = MAX_LAT - (y / svgHeight) * (MAX_LAT - MIN_LAT);
    return [lat, lon];
  };

  const getRouteSvgPath = (coords: [number, number][]): string => {
    if (!coords || coords.length === 0) return "";
    return coords
      .map((pt, idx) => {
        const [x, y] = project(pt[1], pt[0]);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  // Strategic "Why This Turn?" XAI Pins along Route A
  const turnPins: TurnPin[] = [
    {
      id: "turn-1",
      lat: -63.5,
      lon: -55.2,
      title: "Joinville Passage Clearance",
      divergence: "Deflects +18° N into Bransfield Strait deep channel",
      benefit: "Avoids grounded iceberg shoals & Larsen C ice shelf gyre",
      cost: "+8.5 NM detour (+0.9 hrs)",
    },
    {
      id: "turn-2",
      lat: -59.8,
      lon: -46.5,
      title: "Elephant Island & Scotia Bypass",
      divergence: "Routes north of tabular iceberg A68A forward drift cone",
      benefit: "Reduces catastrophic collision hazard exposure by 74%",
      cost: "+14.2 NM detour (+2.1% fuel)",
    },
    {
      id: "turn-3",
      lat: -56.2,
      lon: -39.0,
      title: "South Georgia Coastal Approach",
      divergence: "Follows Antarctic Circumpolar Current eddy flow",
      benefit: "Gains 1.2 kt tail-current speed boost into Cumberland Bay",
      cost: "Conserves 0.65 Tons bunker fuel",
    },
  ];

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    const [lat, lon] = unproject(rawX, rawY);
    if (lat >= MIN_LAT && lat <= MAX_LAT && lon >= MIN_LON && lon <= MAX_LON) {
      setMouseCoord({ lat, lon });
    } else {
      setMouseCoord(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setActiveTurnPin(null);
  };

  // Calculate ship position along recommended route based on scrubHours
  const recCoords = recommendedRoute?.geometry?.coordinates || [];
  const shipIndex =
    recCoords.length > 0
      ? Math.min(
          Math.floor((scrubHours / 48) * (recCoords.length - 1)),
          recCoords.length - 1
        )
      : -1;
  const shipPos = shipIndex >= 0 ? recCoords[shipIndex] : null;

  return (
    <div className="relative w-full h-[600px] lg:h-[650px] bg-[#060A13] rounded-xl border border-[#17263E] overflow-hidden select-none shadow-2xl">
      {/* Map Control Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-[#0A1322]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#17263E] shadow-md">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.25, 3.0))}
          className="p-1 rounded hover:bg-[#13233C] text-slate-300 hover:text-[#38BDF8] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
          className="p-1 rounded hover:bg-[#13233C] text-slate-300 hover:text-[#38BDF8] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1 rounded hover:bg-[#13233C] text-slate-300 hover:text-white transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Basin Compass Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#0A1322]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#17263E] text-[11px] font-mono text-slate-300 shadow-md">
        <Compass className="w-3.5 h-3.5 text-[#38BDF8] animate-spin-slow" />
        <span className="font-bold tracking-wider text-slate-200">WEDDELL SEA &amp; SCOTIA BASIN</span>
        <span className="text-slate-600">|</span>
        <span className="text-[#38BDF8] font-bold">{zoom.toFixed(2)}x</span>
        {scrubHours > 0 && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">+{scrubHours}h DRIFT PROJ</span>
          </>
        )}
      </div>

      {/* Coordinate & Legend Bar */}
      <div className="absolute bottom-3 left-3 z-20 bg-[#0A1322]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#17263E] text-[11px] font-mono text-slate-300 shadow-md flex items-center gap-3">
        <div>
          <span className="text-slate-500">CURSOR: </span>
          {mouseCoord ? (
            <span className="text-cyan-300 font-semibold">
              {Math.abs(mouseCoord.lat).toFixed(2)}°S, {Math.abs(mouseCoord.lon).toFixed(2)}°W
            </span>
          ) : (
            <span className="text-slate-500">HOVERING SECTOR</span>
          )}
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-1.5 bg-[#00F0FF] rounded-full"></span>
          <span className="text-slate-300">Route A (Safe)</span>
          <span className="w-2.5 h-1.5 bg-slate-500 rounded-full ml-1"></span>
          <span className="text-slate-400">Route B (Direct)</span>
        </div>
      </div>

      {/* Main SVG Polar Geospatial Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.12s ease-out",
          }}
        >
          <defs>
            {/* Deep Abyssal Sea Gradient */}
            <radialGradient id="polarOcean" cx="40%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#081426" />
              <stop offset="60%" stopColor="#050B15" />
              <stop offset="100%" stopColor="#02050B" />
            </radialGradient>

            {/* Continuous 0.25° Sea Ice Risk Gradient Field */}
            <linearGradient id="riskMeshGradient" x1="0%" y1="100%" x2="20%" y2="0%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.28" />
              <stop offset="45%" stopColor="#0284C7" stopOpacity="0.14" />
              <stop offset="80%" stopColor="#0369A1" stopOpacity="0.0" />
            </linearGradient>

            {/* Anisotropic Iceberg Hazard Glow */}
            <radialGradient id="bergHazardMesh" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#E11D48" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
            </radialGradient>

            {/* Tactical Grid Background */}
            <pattern id="tacticalPolarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* 1. Deep Ocean Base */}
          <rect width={svgWidth} height={svgHeight} fill="url(#polarOcean)" />
          <rect width={svgWidth} height={svgHeight} fill="url(#tacticalPolarGrid)" />

          {/* Latitude & Longitude Reference Parallels */}
          {[-75, -70, -65, -60, -55].map((lat) => {
            const [, y] = project(lat, -50);
            return (
              <g key={`lat-${lat}`}>
                <line x1={0} y1={y} x2={svgWidth} y2={y} stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="4 4" />
                <text x={12} y={y - 4} fill="#475569" fontSize="10" fontFamily="monospace">
                  {Math.abs(lat)}°S
                </text>
              </g>
            );
          })}

          {[-70, -60, -50, -40, -30].map((lon) => {
            const [x] = project(-65, lon);
            return (
              <g key={`lon-${lon}`}>
                <line x1={x} y1={0} x2={x} y2={svgHeight} stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="4 4" />
                <text x={x + 4} y={svgHeight - 12} fill="#475569" fontSize="10" fontFamily="monospace">
                  {Math.abs(lon)}°W
                </text>
              </g>
            );
          })}

          {/* 2. Continuous 0.25° Risk Heatmap Mesh Layer */}
          {visibleLayers.seaIce && (
            <rect
              x={0}
              y={project(-61, -50)[1]}
              width={svgWidth}
              height={svgHeight - project(-61, -50)[1]}
              fill="url(#riskMeshGradient)"
              className="pointer-events-none"
            />
          )}

          {/* 3. True Antarctic Continental Coastlines & Ice Shelf Polygons */}
          <g id="antarctic-landmass" opacity="0.9">
            {/* Continental Ice Shelf base (Ronne / Filchner) */}
            <path
              d={`
                M ${project(-78, -75)[0]} ${project(-78, -75)[1]}
                L ${project(-74.5, -65)[0]} ${project(-74.5, -65)[1]}
                L ${project(-75.5, -45)[0]} ${project(-75.5, -45)[1]}
                L ${project(-75.5, -25)[0]} ${project(-75.5, -25)[1]}
                L ${project(-78, -25)[0]} ${project(-78, -25)[1]}
                Z
              `}
              fill="#0F172A"
              stroke="#1E293B"
              strokeWidth="1.5"
            />

            {/* Antarctic Peninsula Spine (Graham Land / Palmer Land) */}
            <path
              d={`
                M ${project(-73.5, -68.0)[0]} ${project(-73.5, -68.0)[1]}
                Q ${project(-68.5, -66.0)[0]} ${project(-68.5, -66.0)[1]} ${project(-65.0, -63.5)[0]} ${project(-65.0, -63.5)[1]}
                Q ${project(-63.8, -59.5)[0]} ${project(-63.8, -59.5)[1]} ${project(-63.2, -56.8)[0]} ${project(-63.2, -56.8)[1]}
                L ${project(-63.5, -55.8)[0]} ${project(-63.5, -55.8)[1]}
                Q ${project(-64.5, -59.0)[0]} ${project(-64.5, -59.0)[1]} ${project(-67.5, -62.5)[0]} ${project(-67.5, -62.5)[1]}
                Q ${project(-71.0, -64.0)[0]} ${project(-71.0, -64.0)[1]} ${project(-73.5, -62.0)[0]} ${project(-73.5, -62.0)[1]}
                Z
              `}
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* South Georgia Island (Grytviken) */}
            <ellipse
              cx={project(-54.28, -36.48)[0]}
              cy={project(-54.28, -36.48)[1]}
              rx="12"
              ry="5"
              fill="#1E293B"
              stroke="#475569"
              strokeWidth="1"
              transform={`rotate(-40 ${project(-54.28, -36.48)[0]} ${project(-54.28, -36.48)[1]})`}
            />

            {/* South Shetland Islands */}
            <ellipse
              cx={project(-62.5, -60.0)[0]}
              cy={project(-62.5, -60.0)[1]}
              rx="18"
              ry="4"
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="1"
              transform={`rotate(25 ${project(-62.5, -60.0)[0]} ${project(-62.5, -60.0)[1]})`}
            />
          </g>

          {/* 4. Route B: Direct Shortest Track (Dashed Baseline) */}
          {directRoute && (
            <g id="direct-baseline-track">
              <path
                d={getRouteSvgPath(directRoute.geometry.coordinates)}
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                strokeLinecap="round"
                opacity="0.65"
              />
            </g>
          )}

          {/* 5. Route A: POLARIS-X Recommended Safe Corridor */}
          {recommendedRoute && (
            <g id="recommended-safe-corridor">
              {/* Outer Cyan Glow */}
              <path
                d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                fill="none"
                stroke="#00F0FF"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.25"
              />
              {/* Core Solid Cyan Path */}
              <path
                d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                fill="none"
                stroke="#00F0FF"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Directional Dash Animation */}
              <path
                d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                className="animate-route-flow"
              />
            </g>
          )}

          {/* 6. Active Ship Location Marker (Controlled by 4D Time Scrubber) */}
          {shipPos && (
            <g id="active-ship-marker">
              {(() => {
                const [sx, sy] = project(shipPos[1], shipPos[0]);
                return (
                  <g className="cursor-pointer">
                    <circle cx={sx} cy={sy} r="16" fill="none" stroke="#00F0FF" strokeWidth="1.5" className="animate-radar" />
                    <circle cx={sx} cy={sy} r="6" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
                    <text x={sx + 12} y={sy + 4} fill="#38BDF8" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      MV Vasiliy Golovnin (t+{scrubHours}h)
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* 7. "Why This Turn?" Clickable Waypoint Pins */}
          {recommendedRoute &&
            turnPins.map((pin) => {
              const [px, py] = project(pin.lat, pin.lon);
              const isSelected = activeTurnPin?.id === pin.id;
              return (
                <g
                  key={pin.id}
                  className="cursor-pointer group"
                  onClick={() => setActiveTurnPin(isSelected ? null : pin)}
                  onMouseEnter={() => setHoveredEntity({ type: "turn", pin })}
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  <circle cx={px} cy={py} r="14" fill="#00F0FF" fillOpacity="0.2" className="animate-ping" />
                  <circle cx={px} cy={py} r="6" fill={isSelected ? "#38BDF8" : "#00F0FF"} stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx={px} cy={py} r="2" fill="#060A13" />
                  <text
                    x={px}
                    y={py - 10}
                    textAnchor="middle"
                    fill="#00F0FF"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="extrabold"
                    className="drop-shadow-md"
                  >
                    WHY?
                  </text>
                </g>
              );
            })}

          {/* 8. Tracked Icebergs & Drift Hazard Buffers */}
          {visibleLayers.icebergs &&
            icebergs.map((b) => {
              // Apply time-scrub displacement
              const driftSpeedKmDay = b.properties.disp_km_day || 0.8;
              const driftHeadingDeg = b.properties.vel_angle_deg || 45;
              const driftHeadingRad = (driftHeadingDeg * Math.PI) / 180;
              const distanceKm = driftSpeedKmDay * (scrubHours / 24);
              const deltaLat = (distanceKm * Math.cos(driftHeadingRad)) / 111.0;
              const deltaLon = (distanceKm * Math.sin(driftHeadingRad)) / (111.0 * Math.cos((b.properties.lat * Math.PI) / 180));

              const currentLat = b.properties.lat + deltaLat;
              const currentLon = b.properties.lon + deltaLon;
              const [bx, by] = project(currentLat, currentLon);

              const isMega =
                b.properties.size_sqkm > 200 ||
                b.properties.iceberg_id === "A68A" ||
                b.properties.iceberg_id === "A23A";

              const vectorLength = Math.max(driftSpeedKmDay * 18, 32);
              const targetX = bx + Math.sin(driftHeadingRad) * vectorLength;
              const targetY = by - Math.cos(driftHeadingRad) * vectorLength;

              return (
                <g
                  key={b.properties.iceberg_id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredEntity({ type: "iceberg", data: b.properties })}
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Anisotropic Hazard Ellipse Buffer */}
                  <ellipse
                    cx={bx}
                    cy={by}
                    rx={Math.max(b.properties.length_nm * 2.2, 28)}
                    ry={Math.max(b.properties.width_nm * 1.6, 16)}
                    fill="url(#bergHazardMesh)"
                    transform={`rotate(${driftHeadingDeg - 90} ${bx} ${by})`}
                  />

                  {/* Pulsing Alert Ring for Mega Icebergs or Surge */}
                  {(isMega || isSurgeActive) && (
                    <circle
                      cx={bx}
                      cy={by}
                      r={isSurgeActive && b.properties.iceberg_id === "A68A" ? 34 : 22}
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="1.5"
                      className="animate-radar"
                    />
                  )}

                  {/* Velocity Drift Vector Arrow */}
                  <line
                    x1={bx}
                    y1={by}
                    x2={targetX}
                    y2={targetY}
                    stroke="#FDA4AF"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle cx={targetX} cy={targetY} r="2.5" fill="#F43F5E" />

                  {/* Central Iceberg Core */}
                  <rect
                    x={bx - 7}
                    y={by - 7}
                    width="14"
                    height="14"
                    fill="#FFFFFF"
                    stroke="#E11D48"
                    strokeWidth="1.5"
                    rx="2"
                    className="group-hover:scale-125 transition-transform"
                  />
                  <text
                    x={bx}
                    y={by - 11}
                    textAnchor="middle"
                    fill="#F1F5F9"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {b.properties.iceberg_id}
                  </text>
                </g>
              );
            })}

          {/* 9. BAS Meteorological Weather Stations */}
          {visibleLayers.weather &&
            weatherStations.map((w) => {
              const [wx, wy] = project(w.properties.lat, w.properties.lon);
              return (
                <g
                  key={w.properties.station_id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredEntity({ type: "weather", data: w.properties })}
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  <circle cx={wx} cy={wy} r="4.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x={wx + 7} y={wy + 3} fill="#E0E7FF" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                    {w.properties.station_id}
                  </text>
                </g>
              );
            })}

          {/* 10. Research Stations / Port Markers */}
          {visibleLayers.stations &&
            stations.map((st) => {
              const [sx, sy] = project(st.lat, st.lon);
              return (
                <g key={st.name} className="cursor-pointer group">
                  <circle cx={sx} cy={sy} r="5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text
                    x={sx}
                    y={sy - 8}
                    textAnchor="middle"
                    fill="#BAE6FD"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {st.name.split("/")[0].trim()}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Floating Interactive Entity / "Why This Turn?" Card */}
      {hoveredEntity && hoveredEntity.type === "turn" && (
        <div className="absolute top-12 right-14 z-30 bg-[#0A1322]/95 rounded-xl p-4 shadow-modal border border-[#00F0FF]/50 max-w-sm animate-in fade-in duration-150 text-slate-200 font-mono">
          <div className="flex items-center gap-2 text-[#00F0FF] font-bold text-xs uppercase tracking-wider mb-1.5 border-b border-[#1E3355] pb-1">
            <Info className="w-4 h-4" />
            <span>AI CORRIDOR ATTRIBUTION PIN</span>
          </div>
          <div className="text-sm font-bold text-white mb-1">{hoveredEntity.pin.title}</div>
          <div className="text-xs space-y-1 text-slate-300">
            <div>
              <span className="text-slate-400">Action: </span>
              <span className="text-[#38BDF8]">{hoveredEntity.pin.divergence}</span>
            </div>
            <div>
              <span className="text-slate-400">Safety Gain: </span>
              <span className="text-emerald-400">{hoveredEntity.pin.benefit}</span>
            </div>
            <div>
              <span className="text-slate-400">Detour Cost: </span>
              <span className="text-amber-400">{hoveredEntity.pin.cost}</span>
            </div>
          </div>
        </div>
      )}

      {hoveredEntity && hoveredEntity.type === "iceberg" && (
        <div className="absolute top-12 right-14 z-30 bg-[#0A1322]/95 rounded-xl p-4 shadow-modal border border-rose-500/60 max-w-xs animate-in fade-in duration-150 text-slate-200 font-mono">
          <div className="flex items-center justify-between border-b border-[#1E3355] pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>ICEBERG {hoveredEntity.data.iceberg_id}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
              {hoveredEntity.data.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[9px]">DIMENSIONS</span>
              <span className="font-semibold text-slate-200">
                {hoveredEntity.data.length_nm} × {hoveredEntity.data.width_nm} NM
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">DRIFT RATE</span>
              <span className="font-semibold text-slate-200">{hoveredEntity.data.disp_km_day} km/d</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">SURFACE AREA</span>
              <span className="font-semibold text-slate-200">{hoveredEntity.data.size_sqkm} km²</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">SOURCE</span>
              <span className="font-semibold text-slate-200">BYU / NIC</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
