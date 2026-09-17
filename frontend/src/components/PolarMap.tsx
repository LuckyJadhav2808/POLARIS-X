import React, { useState } from "react";
import { GeoJSONLineString, IcebergFeature, WeatherStationFeature } from "@/types";
import { Compass, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Wind } from "lucide-react";

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
}

type HoveredEntity =
  | { type: "iceberg"; data: IcebergFeature["properties"] }
  | { type: "weather"; data: WeatherStationFeature["properties"] }
  | null;

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
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity>(null);
  const [mouseCoord, setMouseCoord] = useState<{ lat: number; lon: number } | null>(null);

  const svgWidth = 1000;
  const svgHeight = 700;

  // Geographic Coordinate to SVG Canvas Projection (Equirectangular / Polar adjusted)
  const project = (lat: number, lon: number): [number, number] => {
    // Map Longitude (-75 to -25) to X (0 to svgWidth)
    const x = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * svgWidth;
    // Map Latitude (-78 to -52) to Y (svgHeight to 0, since North is up)
    const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * svgHeight;
    return [x, y];
  };

  const unproject = (x: number, y: number): [number, number] => {
    const lon = MIN_LON + (x / svgWidth) * (MAX_LON - MIN_LON);
    const lat = MAX_LAT - (y / svgHeight) * (MAX_LAT - MIN_LAT);
    return [lat, lon];
  };

  // Convert GeoJSON coordinates array to SVG path 'd' string
  const getRouteSvgPath = (coords: [number, number][]): string => {
    if (!coords || coords.length === 0) return "";
    return coords
      .map((pt, idx) => {
        const [x, y] = project(pt[1], pt[0]);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  // Mouse pan handlers
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
  };

  return (
    <div className="relative w-full h-[620px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden select-none shadow-card">
      {/* Map Control Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 shadow-md">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.25, 3.0))}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Corridor & Compass Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-300 shadow-md">
        <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" />
        <span>WEDDELL SEA & SCOTIA SEA BASIN</span>
        <span className="text-slate-600">|</span>
        <span className="text-sky-400 font-semibold">{zoom.toFixed(2)}x</span>
      </div>

      {/* Live Coordinate Cursor Telemetry */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-slate-300 shadow-md flex items-center gap-3">
        <div>
          <span className="text-slate-500">CURSOR: </span>
          {mouseCoord ? (
            <span className="text-sky-300 font-semibold">
              {Math.abs(mouseCoord.lat).toFixed(2)}°S, {Math.abs(mouseCoord.lon).toFixed(2)}°W
            </span>
          ) : (
            <span className="text-slate-500">HOVERING SECTOR</span>
          )}
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          <span className="text-slate-400">Route A (Safe)</span>
          <span className="w-2 h-2 rounded-full bg-slate-500 ml-2"></span>
          <span className="text-slate-400">Route B (Direct)</span>
        </div>
      </div>

      {/* Main SVG Geospatial Canvas */}
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
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          <defs>
            {/* Marine Ocean Gradient */}
            <radialGradient id="oceanGradient" cx="40%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0B192C" />
              <stop offset="60%" stopColor="#07111F" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>

            {/* Sea Ice Concentration Field */}
            <linearGradient id="iceFieldGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
              <stop offset="40%" stopColor="#0284C7" stopOpacity="0.12" />
              <stop offset="85%" stopColor="#0369A1" stopOpacity="0.0" />
            </linearGradient>

            {/* Iceberg Anisotropic Hazard Pattern */}
            <radialGradient id="bergHazardGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.70" />
              <stop offset="50%" stopColor="#E11D48" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
            </radialGradient>

            {/* Grid Pattern */}
            <pattern id="polarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* 1. Deep Ocean Canvas Base */}
          <rect width={svgWidth} height={svgHeight} fill="url(#oceanGradient)" />
          <rect width={svgWidth} height={svgHeight} fill="url(#polarGrid)" />

          {/* Latitude & Longitude Reference Parallels */}
          {[-75, -70, -65, -60, -55].map((lat) => {
            const [, y] = project(lat, -50);
            return (
              <g key={`lat-${lat}`}>
                <line x1={0} y1={y} x2={svgWidth} y2={y} stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="4 4" />
                <text x={12} y={y - 4} fill="#64748B" fontSize="10" fontFamily="monospace">
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
                <text x={x + 4} y={svgHeight - 12} fill="#64748B" fontSize="10" fontFamily="monospace">
                  {Math.abs(lon)}°W
                </text>
              </g>
            );
          })}

          {/* 2. Sea-Ice Concentration Field Layer */}
          {visibleLayers.seaIce && (
            <rect
              x={0}
              y={project(-62, -50)[1]}
              width={svgWidth}
              height={svgHeight - project(-62, -50)[1]}
              fill="url(#iceFieldGradient)"
              className="pointer-events-none"
            />
          )}

          {/* 3. Antarctic Landmass Polygonal Geometry (Peninsula & Shelf Spine) */}
          <g id="landmass" className="transition-all">
            {/* Continental Ice Shelf base */}
            <path
              d={`
                M ${project(-78, -75)[0]} ${project(-78, -75)[1]}
                L ${project(-74.5, -65)[0]} ${project(-74.5, -65)[1]}
                L ${project(-75.5, -45)[0]} ${project(-75.5, -45)[1]}
                L ${project(-75.5, -25)[0]} ${project(-75.5, -25)[1]}
                L ${project(-78, -25)[0]} ${project(-78, -25)[1]}
                Z
              `}
              fill="#1E293B"
              stroke="#334155"
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
              fill="#334155"
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* South Georgia Island (Grytviken) */}
            <ellipse
              cx={project(-54.28, -36.48)[0]}
              cy={project(-54.28, -36.48)[1]}
              rx="10"
              ry="4"
              fill="#475569"
              stroke="#64748B"
              strokeWidth="1"
              transform={`rotate(-40 ${project(-54.28, -36.48)[0]} ${project(-54.28, -36.48)[1]})`}
            />
            {/* South Shetland Islands */}
            <ellipse
              cx={project(-62.5, -60.0)[0]}
              cy={project(-62.5, -60.0)[1]}
              rx="16"
              ry="3"
              fill="#475569"
              stroke="#64748B"
              strokeWidth="1"
              transform={`rotate(25 ${project(-62.5, -60.0)[0]} ${project(-62.5, -60.0)[1]})`}
            />
          </g>

          {/* 4. Direct Shortest Track (Route B - Unadjusted Baseline) */}
          {directRoute && (
            <g id="direct-route">
              <path
                d={getRouteSvgPath(directRoute.geometry.coordinates)}
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
                opacity="0.75"
              />
            </g>
          )}

          {/* 5. Recommended Safe Corridor (Route A - POLARIS-X Risk-Weighted) */}
          {recommendedRoute && (
            <g id="recommended-route">
              {/* Outer Glow */}
              <path
                d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                fill="none"
                stroke="#0284C7"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.25"
              />
              {/* Core Solid Line */}
              <path
                d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Animated Directional Dash Flow */}
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

          {/* 6. Tracked Icebergs & Drift Hazard Fields */}
          {visibleLayers.icebergs &&
            icebergs.map((b) => {
              const [bx, by] = project(b.properties.lat, b.properties.lon);
              const isMega = b.properties.size_sqkm > 200 || b.properties.iceberg_id === "A68A" || b.properties.iceberg_id === "A23A";
              const heading = b.properties.vel_angle_deg || 45;
              const headingRad = (heading * Math.PI) / 180;
              const vectorLength = Math.max(b.properties.disp_km_day * 15, 30);
              const targetX = bx + Math.sin(headingRad) * vectorLength;
              const targetY = by - Math.cos(headingRad) * vectorLength; // SVG Y is inverted

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
                    fill="url(#bergHazardGlow)"
                    transform={`rotate(${heading - 90} ${bx} ${by})`}
                  />

                  {/* Pulsing Radar Ring for Mega Icebergs or Surge */}
                  {(isMega || isSurgeActive) && (
                    <circle
                      cx={bx}
                      cy={by}
                      r={isSurgeActive && b.properties.iceberg_id === "A68A" ? 36 : 24}
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
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <circle cx={targetX} cy={targetY} r="3" fill="#F43F5E" />

                  {/* Central Iceberg Core Icon */}
                  <rect
                    x={bx - 7}
                    y={by - 7}
                    width="14"
                    height="14"
                    fill="#FFFFFF"
                    stroke="#E11D48"
                    strokeWidth="2"
                    rx="3"
                    className="group-hover:scale-125 transition-transform"
                  />
                  <text
                    x={bx}
                    y={by - 12}
                    textAnchor="middle"
                    fill="#F1F5F9"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                    className="drop-shadow-md"
                  >
                    {b.properties.iceberg_id}
                  </text>
                  <text
                    x={bx}
                    y={by + 20}
                    textAnchor="middle"
                    fill="#CBD5E1"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {b.properties.disp_km_day} km/d
                  </text>
                </g>
              );
            })}

          {/* 7. BAS Meteorological Weather Stations */}
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
                  <circle
                    cx={wx}
                    cy={wy}
                    r="5"
                    fill="#6366F1"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="group-hover:scale-125 transition-transform"
                  />
                  <text
                    x={wx + 8}
                    y={wy + 3}
                    fill="#E0E7FF"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="sans-serif"
                  >
                    {w.properties.station_id}
                  </text>
                </g>
              );
            })}

          {/* 8. Research Stations / Port Waypoint Markers */}
          {visibleLayers.stations &&
            stations.map((st) => {
              const [sx, sy] = project(st.lat, st.lon);
              return (
                <g key={st.name} className="cursor-pointer group">
                  <circle
                    cx={sx}
                    cy={sy}
                    r="6"
                    fill="#0284C7"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="group-hover:scale-125 transition-transform"
                  />
                  <text
                    x={sx}
                    y={sy - 10}
                    textAnchor="middle"
                    fill="#BAE6FD"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    className="drop-shadow-md"
                  >
                    {st.name.split("/")[0].trim()}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Floating Interactive Entity Hover Tooltip Card */}
      {hoveredEntity && (
        <div className="absolute bottom-16 right-4 z-30 bg-white rounded-xl p-4 shadow-modal border border-slate-200 max-w-xs animate-in fade-in zoom-in-95 duration-150 text-slate-800">
          {hoveredEntity.type === "iceberg" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>ICEBERG {hoveredEntity.data.iceberg_id}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  {hoveredEntity.data.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">COORDINATES</span>
                  <span className="font-semibold text-slate-700">
                    {Math.abs(hoveredEntity.data.lat).toFixed(2)}°S, {Math.abs(hoveredEntity.data.lon).toFixed(2)}°W
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DRIFT RATE</span>
                  <span className="font-semibold text-slate-700">{hoveredEntity.data.disp_km_day} km/day</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DIMENSIONS</span>
                  <span className="font-semibold text-slate-700">
                    {hoveredEntity.data.length_nm} × {hoveredEntity.data.width_nm} NM
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">SURFACE AREA</span>
                  <span className="font-semibold text-slate-700">{hoveredEntity.data.size_sqkm} km²</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 flex justify-between">
                <span>Source: BYU MetOp / NIC</span>
                <span>Date: {hoveredEntity.data.date}</span>
              </div>
            </div>
          )}

          {hoveredEntity.type === "weather" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                  <Wind className="w-4 h-4 text-indigo-600" />
                  <span>{hoveredEntity.data.station_name}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  BAS SYNOP
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">TEMPERATURE</span>
                  <span className="font-semibold text-slate-700">{hoveredEntity.data.temperature_c}°C</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">WIND SPEED</span>
                  <span className="font-semibold text-slate-700">{hoveredEntity.data.wind_speed_knots} kts</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PRESSURE (SLP)</span>
                  <span className="font-semibold text-slate-700">{hoveredEntity.data.pressure_hpa} hPa</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">WIND DIR</span>
                  <span className="font-semibold text-slate-700">{hoveredEntity.data.wind_dir_deg}°</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
