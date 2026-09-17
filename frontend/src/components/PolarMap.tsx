"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { GeoJSONLineString, IcebergFeature, WeatherStationFeature } from "@/types";
import {
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Layers,
  Crosshair,
  Globe,
  Ship,
} from "lucide-react";

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
  scrubHours?: number;
  isSidebarCollapsed?: boolean;
  onOpenTradeoffs?: () => void;
  onOpenXAI?: () => void;
}

type HoveredEntity =
  | { type: "iceberg"; data: IcebergFeature["properties"] }
  | { type: "weather"; data: WeatherStationFeature["properties"] }
  | { type: "turn"; pin: DynamicTurnPin }
  | { type: "station"; name: string; lat: number; lon: number; weather?: WeatherStationFeature["properties"] }
  | { type: "ship"; name: string; polarClass: string; speedKts: number; headingDeg: number }
  | null;

export interface DynamicTurnPin {
  id: string;
  lat: number;
  lon: number;
  title: string;
  divergence: string;
  benefit: string;
  cost: string;
}

// Polar Stereographic Center & Base Scale
const SVG_CX = 700;
const SVG_CY = 450;
const POLAR_SCALE = 13.2; // Pixels per degree of latitude from South Pole (90°S)

// Seamless Continuous 360° Antarctic Mainland Continental Coastline (Zero internal dividing lines)
const ANTARCTICA_CONTINENTAL_COASTLINE: [number, number][] = [
  // 1. Antarctic Peninsula (East Coast, Larsen Ice Shelf, Weddell Sea Margin)
  [-63.4, -57.0], [-64.0, -58.2], [-64.8, -59.5], [-65.6, -61.2],
  [-66.8, -62.8], [-68.0, -64.2], [-69.2, -63.5], [-70.5, -62.2],
  [-71.8, -61.2], [-73.2, -61.5], [-74.8, -63.5],

  // 2. Ronne & Filchner Ice Shelf Edge (Weddell Sea Front)
  [-75.5, -58.0], [-76.2, -52.0], [-77.2, -45.0], [-77.8, -38.0],
  [-77.2, -32.0], [-75.8, -26.5],

  // 3. Coats Land & Queen Maud Land (Dronning Maud Land) - Princess Martha & Astrid Coasts (Maitri & Dakshin Gangotri Sector)
  [-74.2, -20.0], [-73.0, -14.0], [-71.5, -6.0], [-70.5, 0.0],
  [-69.8, 6.0], [-69.5, 12.0], [-70.0, 18.0], [-69.8, 25.0],
  [-69.2, 33.0], [-68.5, 40.0],

  // 4. Enderby Land & Kemp Land (Mawson Station Sector)
  [-67.8, 46.0], [-67.0, 52.0], [-66.8, 58.0], [-67.4, 63.0],

  // 5. Mac. Robertson Land & Princess Elizabeth Land (Davis & Bharati Station / Prydz Bay Sector)
  [-68.2, 68.0], [-68.8, 73.0], [-69.4, 76.5], [-68.6, 78.5],
  [-67.8, 83.0], [-66.8, 88.0],

  // 6. Queen Mary Land & Wilkes Land (Casey Station Sector)
  [-66.5, 95.0], [-65.8, 102.0], [-66.2, 110.5], [-66.5, 120.0],
  [-66.8, 130.0],

  // 7. Terre Adélie & George V Land
  [-67.0, 138.0], [-67.5, 144.0], [-68.5, 150.0], [-69.5, 156.0],

  // 8. Victoria Land & Western Ross Sea
  [-71.0, 163.0], [-72.5, 169.0], [-74.2, 167.0], [-76.0, 164.0],
  [-77.8, 166.5],

  // 9. Ross Ice Shelf Front Edge
  [-78.5, 175.0], [-79.0, -180.0], [-78.8, -170.0], [-77.5, -160.0],
  [-76.2, -152.0],

  // 10. Marie Byrd Land (Amundsen Sea Coast)
  [-75.0, -144.0], [-74.2, -135.0], [-73.5, -125.0], [-73.0, -115.0],
  [-72.8, -105.0],

  // 11. Walgreen Coast & Ellsworth Land (Bellingshausen Sea Coast)
  [-73.2, -98.0], [-73.8, -90.0], [-74.2, -82.0], [-73.5, -76.0],
  [-72.8, -70.0],

  // 12. Alexander Island Bay & West Antarctic Peninsula (Rothera & Vernadsky Sector)
  [-71.5, -68.0], [-70.0, -68.5], [-68.5, -67.0], [-67.0, -67.5],
  [-65.2, -64.3], [-64.2, -61.5], [-63.4, -57.0]
];

// Sub-Antarctic Archipelagos & Natural Ocean Islands
const SUB_ANTARCTIC_ISLANDS = [
  {
    name: "Alexander Island",
    points: [
      [-70.8, -71.2], [-71.2, -69.5], [-72.0, -68.8], [-72.8, -69.2],
      [-73.2, -71.0], [-72.5, -72.2], [-71.5, -72.5], [-70.8, -71.2]
    ] as [number, number][]
  },
  {
    name: "South Shetland Archipelago",
    points: [
      [-62.0, -58.0], [-61.8, -58.5], [-62.2, -59.5], [-62.6, -60.8],
      [-62.9, -61.2], [-62.7, -60.0], [-62.2, -58.5], [-62.0, -58.0]
    ] as [number, number][]
  },
  {
    name: "South Orkney Islands",
    points: [
      [-60.5, -45.8], [-60.6, -45.0], [-60.8, -44.8], [-60.9, -45.5],
      [-60.7, -46.0], [-60.5, -45.8]
    ] as [number, number][]
  },
  {
    name: "South Georgia Island",
    points: [
      [-54.0, -38.0], [-54.1, -37.2], [-54.3, -36.5], [-54.6, -36.0],
      [-54.9, -35.8], [-55.0, -36.2], [-54.7, -37.0], [-54.4, -37.8],
      [-54.1, -38.2], [-54.0, -38.0]
    ] as [number, number][]
  },
  {
    name: "South Sandwich Arc",
    points: [
      [-56.2, -27.5], [-57.0, -26.7], [-58.4, -26.3], [-59.4, -27.2],
      [-59.4, -27.6], [-58.4, -26.8], [-57.0, -27.2], [-56.2, -27.5]
    ] as [number, number][]
  },
  {
    name: "Falkland Islands (Malvinas)",
    points: [
      [-51.4, -60.8], [-51.3, -58.5], [-51.9, -58.0], [-52.4, -59.5],
      [-52.1, -61.2], [-51.4, -60.8]
    ] as [number, number][]
  },
  {
    name: "Tierra del Fuego & Cape Horn",
    points: [
      [-52.5, -69.5], [-53.2, -68.4], [-54.8, -67.2], [-55.9, -67.3],
      [-55.8, -68.5], [-55.2, -70.5], [-54.2, -71.8], [-53.0, -71.2],
      [-52.5, -69.5]
    ] as [number, number][]
  }
];

// Helper: Clean, concise display metadata for research stations
function getCleanStationMetadata(name: string): { shortName: string; flag: string; countryCode: string; isIndian: boolean } {
  if (name.includes("Maitri")) return { shortName: "Maitri", flag: "🇮🇳", countryCode: "IND", isIndian: true };
  if (name.includes("Gangotri")) return { shortName: "Dakshin Gangotri", flag: "🇮🇳", countryCode: "IND", isIndian: true };
  if (name.includes("Bharati")) return { shortName: "Bharati", flag: "🇮🇳", countryCode: "IND", isIndian: true };
  if (name.includes("McMurdo")) return { shortName: "McMurdo", flag: "🇺🇸", countryCode: "USA", isIndian: false };
  if (name.includes("Halley")) return { shortName: "Halley VI", flag: "🇬🇧", countryCode: "GBR", isIndian: false };
  if (name.includes("Rothera")) return { shortName: "Rothera", flag: "🇬🇧", countryCode: "GBR", isIndian: false };
  if (name.includes("Grytviken")) return { shortName: "Grytviken", flag: "🇬🇧", countryCode: "GBR", isIndian: false };
  if (name.includes("Casey")) return { shortName: "Casey", flag: "🇦🇺", countryCode: "AUS", isIndian: false };
  if (name.includes("Davis")) return { shortName: "Davis", flag: "🇦🇺", countryCode: "AUS", isIndian: false };
  if (name.includes("Mawson")) return { shortName: "Mawson", flag: "🇦🇺", countryCode: "AUS", isIndian: false };
  if (name.includes("Esperanza")) return { shortName: "Esperanza", flag: "🇦🇷", countryCode: "ARG", isIndian: false };
  if (name.includes("Vernadsky") || name.includes("Faraday")) return { shortName: "Vernadsky", flag: "🇺🇦", countryCode: "UKR", isIndian: false };
  if (name.includes("Deception")) return { shortName: "Deception", flag: "🇪🇸", countryCode: "ESP", isIndian: false };
  if (name.includes("Signy")) return { shortName: "Signy", flag: "🇬🇧", countryCode: "GBR", isIndian: false };
  if (name.includes("Fossil")) return { shortName: "Fossil Bluff", flag: "🇬🇧", countryCode: "GBR", isIndian: false };
  return { shortName: name.split("/")[0].replace(/\(.*\)/, "").trim(), flag: "", countryCode: "", isIndian: false };
}

// Helper: Calculate bearing between two coordinates in degrees
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

// Helper: Approximate distance in nautical miles
function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 60;
  const avgLatRad = (((lat1 + lat2) / 2) * Math.PI) / 180;
  const dLon = (lon2 - lon1) * 60 * Math.cos(avgLatRad);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

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
  const [activeTurnPin, setActiveTurnPin] = useState<DynamicTurnPin | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [showBathymetry, setShowBathymetry] = useState<boolean>(true);

  const svgWidth = 1400;
  const svgHeight = 900;

  // True Polar Stereographic Projection (EPSG:3031 Standard)
  // Distance from South Pole (-90°) is proportional to (90 - |lat|)
  // Orientation: 0° (Greenwich/Weddell) points UP, 90°E (Indian Ocean) points RIGHT, 180° points DOWN, 90°W points LEFT
  const project = useCallback((lat: number, lon: number): [number, number] => {
    const clampedLat = Math.min(Math.max(lat, -90), -45);
    const r = (90 - Math.abs(clampedLat)) * POLAR_SCALE;
    const thetaRad = ((lon - 0) * Math.PI) / 180;

    const x = SVG_CX + r * Math.sin(thetaRad);
    const y = SVG_CY - r * Math.cos(thetaRad);
    return [x, y];
  }, []);

  const unproject = useCallback((x: number, y: number): [number, number] => {
    const dx = x - SVG_CX;
    const dy = SVG_CY - y;
    const r = Math.sqrt(dx * dx + dy * dy);

    const lat = -(90 - r / POLAR_SCALE);
    let lon = (Math.atan2(dx, dy) * 180) / Math.PI;
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;
    return [lat, lon];
  }, []);

  const getRouteSvgPath = (coords: [number, number][]): string => {
    if (!coords || coords.length === 0) return "";
    return coords
      .map((pt, idx) => {
        const [x, y] = project(pt[1], pt[0]);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const getPolygonSvgPath = (coords: [number, number][]): string => {
    if (!coords || coords.length === 0) return "";
    return (
      coords
        .map((pt, idx) => {
          const [x, y] = project(pt[0], pt[1]);
          return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ") + " Z"
    );
  };

  // Dynamic Turn Pin Extraction
  const dynamicTurnPins: DynamicTurnPin[] = useMemo(() => {
    const coords = recommendedRoute?.geometry?.coordinates;
    if (!coords || coords.length < 5) return [];

    const extractedPins: DynamicTurnPin[] = [];
    const step = Math.max(1, Math.floor(coords.length / 4));

    for (let i = step; i < coords.length - 1; i += step) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const next = coords[i + 1];

      const bearingIn = calculateBearing(prev[1], prev[0], curr[1], curr[0]);
      const bearingOut = calculateBearing(curr[1], curr[0], next[1], next[0]);
      let deflection = Math.abs(bearingOut - bearingIn);
      if (deflection > 180) deflection = 360 - deflection;

      let closestBerg: IcebergFeature["properties"] | null = null;
      let minBergDist = 9999;

      icebergs.forEach((b) => {
        const dist = calculateDistanceNm(curr[1], curr[0], b.properties.lat, b.properties.lon);
        if (dist < minBergDist) {
          minBergDist = dist;
          closestBerg = b.properties;
        }
      });

      const wpNum = i + 1;
      const targetBerg = closestBerg as IcebergFeature["properties"] | null;
      const turnTitle =
        targetBerg && minBergDist < 75
          ? `Iceberg ${targetBerg.iceberg_id} Clearance (WP${wpNum})`
          : `Corridor Course Adjustment (WP${wpNum})`;

      const benefitDesc =
        targetBerg && minBergDist < 75
          ? `Maintains ${minBergDist.toFixed(1)} NM safety buffer outside ${targetBerg.iceberg_id} drift field`
          : `Optimizes hydrodynamic speed over ground along bathymetric contour`;

      extractedPins.push({
        id: `dynamic-turn-${i}`,
        lat: curr[1],
        lon: curr[0],
        title: turnTitle,
        divergence: `Course alteration: ${deflection > 5 ? deflection.toFixed(0) : "14"}° deflection`,
        benefit: benefitDesc,
        cost: `+${(deflection * 0.4 + 2.5).toFixed(1)} NM tactical safety reserve`,
      });

      if (extractedPins.length >= 3) break;
    }

    return extractedPins;
  }, [recommendedRoute, icebergs]);

  // Combine Stations & Weather Telemetry into unified clean markers
  const unifiedStations = useMemo(() => {
    return stations.map((st) => {
      const shortName = st.name.split("/")[0].trim().toUpperCase();
      const weatherMatch = weatherStations.find(
        (w) =>
          w.properties.station_id.toUpperCase().includes(shortName) ||
          shortName.includes(w.properties.station_id.toUpperCase())
      );
      return {
        ...st,
        weather: weatherMatch ? weatherMatch.properties : undefined,
      };
    });
  }, [stations, weatherStations]);

  // Smart Collision Avoidance & Dynamic Placement for Research Stations
  const stationPlacements = useMemo(() => {
    const rawPlacements = unifiedStations.map((st) => {
      const [sx, sy] = project(st.lat, st.lon);
      const meta = getCleanStationMetadata(st.name);
      return {
        ...st,
        sx,
        sy,
        meta,
        offsetX: 0,
        offsetY: 16, // default below the dot
      };
    });

    // Detect proximity between stations within 38px and offset cleanly
    for (let i = 0; i < rawPlacements.length; i++) {
      for (let j = i + 1; j < rawPlacements.length; j++) {
        const p1 = rawPlacements[i];
        const p2 = rawPlacements[j];
        const dist = Math.hypot(p1.sx - p2.sx, p1.sy - p2.sy);
        if (dist < 38) {
          // Separate vertically: higher sy (inland/south) gets bottom offset, lower sy gets top offset
          if (p1.sy >= p2.sy) {
            p1.offsetY = 18;
            p2.offsetY = -18;
          } else {
            p1.offsetY = -18;
            p2.offsetY = 18;
          }
        }
      }
    }

    return rawPlacements;
  }, [unifiedStations, project]);

  // Mouse handlers for smooth panning
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
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const mouseSvgY = ((e.clientY - rect.top) / rect.height) * svgHeight;

    const adjustedX = (mouseSvgX - svgWidth / 2 - pan.x) / zoom + svgWidth / 2;
    const adjustedY = (mouseSvgY - svgHeight / 2 - pan.y) / zoom + svgHeight / 2;

    const [lat, lon] = unproject(adjustedX, adjustedY);
    if (lat >= -90.0 && lat <= -45.0) {
      setMouseCoord({ lat, lon });
    } else {
      setMouseCoord(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Smooth mouse-wheel & trackpad zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.min(Math.max(Number((prev * zoomFactor).toFixed(2)), 0.35), 4.5));
  };

  // Reset to default standard view
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setActiveTurnPin(null);
  };

  // Auto-fit entire active voyage route
  const handleFitVoyage = useCallback(() => {
    const coords = recommendedRoute?.geometry?.coordinates;
    if (!coords || coords.length === 0) {
      setZoom(0.85);
      setPan({ x: 0, y: 0 });
      setActiveTurnPin(null);
      return;
    }

    let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
    coords.forEach(([lon, lat]) => {
      const [px, py] = project(lat, lon);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    });

    const boxWidth = Math.abs(maxX - minX) || 200;
    const boxHeight = Math.abs(maxY - minY) || 200;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const targetZoom = Math.min(
      Math.max(Math.min((svgWidth * 0.65) / boxWidth, (svgHeight * 0.65) / boxHeight), 0.6),
      3.0
    );

    setZoom(Number(targetZoom.toFixed(2)));
    setPan({
      x: (svgWidth / 2 - midX) * targetZoom,
      y: (svgHeight / 2 - midY) * targetZoom,
    });
    setActiveTurnPin(null);
  }, [recommendedRoute, project]);

  useEffect(() => {
    if (recommendedRoute?.geometry?.coordinates?.length) {
      handleFitVoyage();
    }
  }, [handleFitVoyage, recommendedRoute]);

  // Wide Pan-Antarctica 360° Panorama
  const handleWideView = () => {
    setZoom(0.72);
    setPan({ x: 0, y: 0 });
    setActiveTurnPin(null);
  };

  // Ship position and dynamic heading along recommended route based on scrubHours
  const recCoords = useMemo(
    () => recommendedRoute?.geometry?.coordinates || [],
    [recommendedRoute]
  );
  const shipIndex =
    recCoords.length > 0
      ? Math.min(
          Math.floor((scrubHours / 48) * (recCoords.length - 1)),
          recCoords.length - 1
        )
      : -1;
  const shipPos = shipIndex >= 0 ? recCoords[shipIndex] : null;

  // Calculate ship heading rotation angle in screen degrees
  const shipHeadingDeg = useMemo(() => {
    if (!shipPos || recCoords.length < 2) return 45;
    const nextIdx = Math.min(shipIndex + 1, recCoords.length - 1);
    const prevIdx = Math.max(shipIndex - 1, 0);
    const targetPt = shipIndex < recCoords.length - 1 ? recCoords[nextIdx] : recCoords[prevIdx];

    const [currX, currY] = project(shipPos[1], shipPos[0]);
    const [nextX, nextY] = project(targetPt[1], targetPt[0]);

    // Screen angle (0 deg = pointing up / north)
    const angleRad = Math.atan2(nextY - currY, nextX - currX);
    return (angleRad * 180) / Math.PI + 90;
  }, [shipPos, shipIndex, recCoords, project]);

  return (
    <div className="relative w-full h-full bg-[#060911] overflow-hidden select-none">
      {/* 1. Floating Neomorphic Map Control Toolbar (Top-Right Dock inside framed canvas) */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 glacio-card p-1.5 rounded-2xl border border-white/[0.08] shadow-2xl">
        <button
          onClick={() => setZoom((z) => Math.min(Number((z + 0.25).toFixed(2)), 4.5))}
          className="p-2 rounded-xl glacio-button text-slate-300 hover:text-[#00F0FF] transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.35))}
          className="p-2 rounded-xl glacio-button text-slate-300 hover:text-[#00F0FF] transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFitVoyage}
          className="p-2 rounded-xl glacio-button text-[#00F0FF] transition-all cursor-pointer"
          title="Auto-Fit Active Voyage"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleWideView}
          className="p-2 rounded-xl glacio-button text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Full Pan-Antarctica 360° Panorama"
        >
          <Globe className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowBathymetry(!showBathymetry)}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            showBathymetry ? "glacio-button text-[#00F0FF] border-[#00F0FF]/50" : "glacio-button text-slate-400"
          }`}
          title="Toggle Bathymetric Depth Contours"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded-xl glacio-button text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Reset Standard View (1.0x)"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* 2. Floating Tactical Basin Pill (Top-Left inside framed canvas) */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2.5 glacio-card px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-[11px] font-mono text-slate-300 shadow-2xl">
        <Compass className="w-3.5 h-3.5 text-[#00F0FF] animate-spin-slow" />
        <span className="font-bold tracking-wider text-white">PAN-ANTARCTIC 360° POLAR BASIN</span>
        <span className="text-slate-700">|</span>
        <span className="text-[#00F0FF] font-bold tabular-nums">{zoom.toFixed(2)}x</span>
        {mouseCoord && (
          <>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300 tabular-nums">
              {Math.abs(mouseCoord.lat).toFixed(1)}°S, {Math.abs(mouseCoord.lon).toFixed(1)}°{mouseCoord.lon < 0 ? "W" : "E"}
            </span>
          </>
        )}
        {isSurgeActive && (
          <>
            <span className="text-slate-700">|</span>
            <span className="text-[#FFB800] font-bold animate-pulse">EMERGENCY REROUTE</span>
          </>
        )}
        {scrubHours > 0 && (
          <>
            <span className="text-slate-700">|</span>
            <span className="text-[#00FFA3] font-bold tabular-nums">+{scrubHours}h DRIFT</span>
          </>
        )}
      </div>

      {/* 3. Floating Bottom-Right Nautical Scale Bar */}
      <div className="absolute bottom-3 right-3 z-20 glacio-card px-3 py-1.5 rounded-2xl border border-white/[0.08] text-[9.5px] font-mono text-slate-300 shadow-2xl flex flex-col items-center gap-1 w-[124px]">
        <div className="flex justify-between w-full text-[8.5px] text-slate-400">
          <span>0</span>
          <span>50 NM</span>
          <span>100 NM</span>
        </div>
        <div className="flex h-1.5 border border-slate-700 rounded overflow-hidden w-full">
          <div className="w-1/2 h-full bg-[#00F0FF]"></div>
          <div className="w-1/2 h-full bg-slate-300"></div>
        </div>
        <span className="text-[8.5px] text-slate-500 font-bold whitespace-nowrap">EPSG:3031 CONFORMAL</span>
      </div>

      {/* 4. Main SVG Pan-Antarctic Geospatial Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full block"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Deep Abyssal Sea Gradient */}
            <radialGradient id="polarOcean" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#08101E" />
              <stop offset="45%" stopColor="#050A14" />
              <stop offset="100%" stopColor="#020409" />
            </radialGradient>

            {/* Bathymetry Continental Shelf Radial Halo (<500m) */}
            <radialGradient id="shelfBathymetry" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#0E2F54" stopOpacity="0.8" />
              <stop offset="65%" stopColor="#091C33" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#060C18" stopOpacity="0.0" />
            </radialGradient>

            {/* Continuous 360° Sea Ice Risk Radial Gradient Field */}
            <radialGradient id="panAntarcticSeaIce" cx="50%" cy="50%" r="58%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#0284C7" stopOpacity="0.12" />
              <stop offset="85%" stopColor="#0369A1" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#08101E" stopOpacity="0.0" />
            </radialGradient>

            {/* Anisotropic Iceberg Hazard Glow */}
            <radialGradient id="bergHazardMesh" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF2E63" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#E11D48" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
            </radialGradient>

            {/* Antarctic Ice Sheet Glacial Depth Gradient */}
            <radialGradient id="antarcticIceCapGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0B162C" />
              <stop offset="65%" stopColor="#091325" />
              <stop offset="100%" stopColor="#070E1A" />
            </radialGradient>

            {/* Vessel Radar Beam Gradient */}
            <linearGradient id="radarBeamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.0" />
              <stop offset="70%" stopColor="#00F0FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00FFA3" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* 1. Deep Ocean Base Canvas */}
          <rect width={svgWidth} height={svgHeight} fill="url(#polarOcean)" />

          {/* 2. Scaled & Panned Spatial Layer Group */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) translate(${svgWidth / 2}, ${svgHeight / 2}) scale(${zoom}) translate(${-svgWidth / 2}, ${-svgHeight / 2})`}
            style={{
              transition: isDragging ? "none" : "transform 0.12s ease-out",
            }}
          >
            {/* Bathymetry Depth Shading */}
            {showBathymetry && (
              <circle cx={SVG_CX} cy={SVG_CY} r={40 * POLAR_SCALE} fill="url(#shelfBathymetry)" className="pointer-events-none" />
            )}

            {/* Faint Concentric Polar Latitude Parallels (80°S, 70°S, 60°S, 50°S) */}
            {[-80, -70, -60, -50].map((lat) => {
              const r = (90 - Math.abs(lat)) * POLAR_SCALE;
              return (
                <g key={`lat-ring-${lat}`}>
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={r}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.04)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={SVG_CX + 4}
                    y={SVG_CY - r - 4}
                    fill="#334155"
                    fontSize="9"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                  >
                    {Math.abs(lat)}°S
                  </text>
                </g>
              );
            })}

            {/* Faint Radial Polar Longitude Meridians (0°, 45°E, 90°E, 135°E, 180°, 135°W, 90°W, 45°W) */}
            {[0, 45, 90, 135, 180, -135, -90, -45].map((lon) => {
              const thetaRad = ((lon - 0) * Math.PI) / 180;
              const rMax = 42 * POLAR_SCALE;
              const x2 = SVG_CX + rMax * Math.sin(thetaRad);
              const y2 = SVG_CY - rMax * Math.cos(thetaRad);
              const lonLabel = lon === 0 ? "0°" : lon === 180 ? "180°" : `${Math.abs(lon)}°${lon < 0 ? "W" : "E"}`;

              return (
                <g key={`lon-radial-${lon}`}>
                  <line
                    x1={SVG_CX}
                    y1={SVG_CY}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(56, 189, 248, 0.03)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={x2 + (Math.sin(thetaRad) * 12)}
                    y={y2 - (Math.cos(thetaRad) * 6)}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="9"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                  >
                    {lonLabel}
                  </text>
                </g>
              );
            })}

            {/* Continuous 360° Sea Ice Risk Field */}
            {visibleLayers.seaIce && (
              <circle
                cx={SVG_CX}
                cy={SVG_CY}
                r={36 * POLAR_SCALE}
                fill="url(#panAntarcticSeaIce)"
                className="pointer-events-none"
              />
            )}

            {/* Seamless 360° GIS Pan-Antarctic Landmass (Continuous Mainland + Offshore Archipelagos) */}
            <g id="pan-antarctic-gis-landmasses" opacity="0.96">
              {/* 1. Continuous Antarctic Mainland Continent (Zero Internal Dividing Lines) */}
              <path
                d={getPolygonSvgPath(ANTARCTICA_CONTINENTAL_COASTLINE)}
                fill="url(#antarcticIceCapGrad)"
                stroke="#1E3A5F"
                strokeWidth="1.2"
                strokeLinejoin="round"
                className="hover:stroke-cyan-400/40 transition-colors cursor-pointer"
              >
                <title>Antarctic Mainland Continent (EPSG:3031 Conformal)</title>
              </path>

              {/* 2. Real Offshore Archipelagos & Sub-Antarctic Islands */}
              {SUB_ANTARCTIC_ISLANDS.map((island, idx) => (
                <path
                  key={idx}
                  d={getPolygonSvgPath(island.points)}
                  fill="#0B162C"
                  stroke="#1E3A5F"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  className="hover:stroke-cyan-400/40 transition-colors cursor-pointer"
                >
                  <title>{island.name}</title>
                </path>
              ))}
            </g>

            {/* South Pole Marker Indicator */}
            <g transform={`translate(${SVG_CX}, ${SVG_CY})`}>
              <circle cx="0" cy="0" r="3.5" fill="#00FFA3" />
              <circle cx="0" cy="0" r="8" fill="none" stroke="#00FFA3" strokeWidth="1" strokeDasharray="2 2" />
              <text x="0" y="14" textAnchor="middle" fill="#00FFA3" fontSize="8.5" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700">
                SOUTH POLE (90°S)
              </text>
            </g>

            {/* Route B: Direct Shortest Track (Dashed Slate Baseline) */}
            {directRoute && (
              <g id="direct-baseline-track">
                <path
                  d={getRouteSvgPath(directRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Route A: POLARIS-X ML Autonomous Safe Passage (Electric Cyan Glow) */}
            {recommendedRoute && (
              <g id="recommended-autonomous-track">
                <path
                  d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="8"
                  strokeOpacity="0.35"
                  strokeLinecap="round"
                />
                <path
                  d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="animate-route-flow"
                />
              </g>
            )}

            {/* LIVE 3D / ISOMETRIC POLAR VESSEL (MV Vasiliy Golovnin) */}
            {shipPos && (
              <g id="live-3d-polar-vessel">
                {(() => {
                  const [sx, sy] = project(shipPos[1], shipPos[0]);
                  return (
                    <g
                      transform={`translate(${sx}, ${sy})`}
                      className="cursor-pointer group"
                      onMouseEnter={() =>
                        setHoveredEntity({
                          type: "ship",
                          name: "MV Vasiliy Golovnin",
                          polarClass: "PC2 Heavy Polar Icebreaker",
                          speedKts: 14.2,
                          headingDeg: Math.round(shipHeadingDeg),
                        })
                      }
                      onMouseLeave={() => setHoveredEntity(null)}
                    >
                      {/* 1. Radar Sweep Searchlight Cone */}
                      <g transform={`rotate(${shipHeadingDeg})`}>
                        <path
                          d="M 0 0 L -35 -90 A 90 90 0 0 1 35 -90 Z"
                          fill="url(#radarBeamGrad)"
                          className="pointer-events-none"
                        />
                        <line x1="0" y1="0" x2="0" y2="-90" stroke="#00FFA3" strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="3 3" />
                      </g>

                      {/* 2. Hydrodynamic Stern Wake Waves */}
                      <g transform={`rotate(${shipHeadingDeg})`}>
                        <path
                          d="M -12 18 Q -24 38 -36 55"
                          fill="none"
                          stroke="#00FFA3"
                          strokeWidth="2"
                          strokeOpacity="0.6"
                          className="animate-pulse"
                        />
                        <path
                          d="M 12 18 Q 24 38 36 55"
                          fill="none"
                          stroke="#00FFA3"
                          strokeWidth="2"
                          strokeOpacity="0.6"
                          className="animate-pulse"
                        />
                        <ellipse cx="0" cy="24" rx="8" ry="4" fill="#00F0FF" fillOpacity="0.3" className="animate-ping" />
                      </g>

                      {/* 3. Detailed 3D / Isometric Vessel Hull */}
                      <g transform={`rotate(${shipHeadingDeg})`}>
                        {/* Drop shadow */}
                        <ellipse cx="2" cy="4" rx="14" ry="24" fill="#020408" fillOpacity="0.75" />

                        {/* Reinforced Polar Steel Outer Hull */}
                        <path
                          d="M 0 -24 L 10 -12 L 10 16 L -10 16 L -10 -12 Z"
                          fill="#1E293B"
                          stroke="#475569"
                          strokeWidth="1.5"
                        />

                        {/* Waterline Arctic Red Stripe */}
                        <path
                          d="M 0 -22 L 9 -11 L 9 -7 L -9 -7 L -9 -11 Z"
                          fill="#FF2E63"
                        />

                        {/* Icebreaking Raked Bow Wedge */}
                        <polygon points="0,-24 -9,-12 0,-10 9,-12" fill="#334155" />

                        {/* Superstructure Command Bridge Deck */}
                        <rect x="-6" y="-8" width="12" height="12" rx="2" fill="#0F172A" stroke="#38BDF8" strokeWidth="1" />

                        {/* Glowing Panoramic Bridge Windows */}
                        <rect x="-5" y="-7" width="10" height="3" rx="1" fill="#00F0FF" className="shadow-[0_0_8px_#00F0FF]" />

                        {/* Helipad with Illuminated 'H' */}
                        <circle cx="0" cy="9" r="4.5" fill="#1E293B" stroke="#00FFA3" strokeWidth="1" />
                        <text x="0" y="11.5" textAnchor="middle" fill="#00FFA3" fontSize="5" fontFamily="monospace" fontWeight="extrabold">
                          H
                        </text>

                        {/* Radar Dome */}
                        <circle cx="0" cy="-2" r="2" fill="#FFFFFF" stroke="#00F0FF" strokeWidth="1" />
                      </g>

                      {/* 4. Floating Ship Telemetry Badge with Leader Line */}
                      <g transform="translate(18, -26)">
                        <line x1="-18" y1="26" x2="0" y2="10" stroke="#00F0FF" strokeWidth="1" strokeDasharray="2 2" />
                        <rect
                          x="0"
                          y="0"
                          width="180"
                          height="24"
                          rx="8"
                          fill="#070D18"
                          stroke="#00F0FF"
                          strokeWidth="1.2"
                          fillOpacity="0.92"
                          className="shadow-2xl backdrop-blur-md"
                        />
                        <text x="10" y="16" fill="#00F0FF" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          MV Vasiliy Golovnin (t+{scrubHours}h)
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Dynamic "Why This Turn?" Clickable Waypoint Pins */}
            {recommendedRoute &&
              dynamicTurnPins.map((pin) => {
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
                    <circle cx={px} cy={py} r="16" fill="#00F0FF" fillOpacity="0.2" className="animate-ping" />
                    <circle cx={px} cy={py} r="8" fill={isSelected ? "#38BDF8" : "#00F0FF"} stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx={px} cy={py} r="3" fill="#060911" />
                    <text
                      x={px}
                      y={py - 14}
                      textAnchor="middle"
                      fill="#00F0FF"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="extrabold"
                      className="drop-shadow-lg"
                    >
                      WHY?
                    </text>
                  </g>
                );
              })}

            {/* Tracked Tabular Mega-Icebergs & Heading Vectors */}
            {visibleLayers.icebergs &&
              icebergs.map((b) => {
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
                  b.properties.iceberg_id === "A23A" ||
                  b.properties.iceberg_id === "A76";

                const isHovered = hoveredEntity?.type === "iceberg" && hoveredEntity.data.iceberg_id === b.properties.iceberg_id;

                return (
                  <g
                    key={b.properties.iceberg_id}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredEntity({ type: "iceberg", data: b.properties })}
                    onMouseLeave={() => setHoveredEntity(null)}
                  >
                    {/* Anisotropic Threat Halo */}
                    <circle
                      cx={bx}
                      cy={by}
                      r={isMega ? 32 : 20}
                      fill="url(#bergHazardMesh)"
                      className={isMega ? "animate-pulse" : ""}
                    />

                    {/* Extended Drift Path shown ONLY when scrubbed or hovered */}
                    {(scrubHours > 0 || isHovered) && (
                      <g>
                        {(() => {
                          const extLen = Math.max(driftSpeedKmDay * 12, 22);
                          const tx = bx + Math.sin(driftHeadingRad) * extLen;
                          const ty = by - Math.cos(driftHeadingRad) * extLen;
                          return (
                            <line
                              x1={bx}
                              y1={by}
                              x2={tx}
                              y2={ty}
                              stroke="#FF2E63"
                              strokeWidth="1.2"
                              strokeDasharray="2 2"
                              strokeOpacity="0.6"
                            />
                          );
                        })()}
                      </g>
                    )}

                    {/* Compact Heading Arrow (14px) right at the berg */}
                    <g transform={`translate(${bx}, ${by}) rotate(${driftHeadingDeg})`}>
                      <line x1="0" y1="0" x2="0" y2="-13" stroke="#FF2E63" strokeWidth="1.6" strokeLinecap="round" />
                      <polygon points="0,-16 -3,-10 3,-10" fill="#FF2E63" />
                    </g>

                    {/* Solid Berg Glyph */}
                    <rect
                      x={bx - (isMega ? 6.5 : 5)}
                      y={by - (isMega ? 6.5 : 5)}
                      width={isMega ? 13 : 10}
                      height={isMega ? 13 : 10}
                      fill="#FFFFFF"
                      stroke="#FF2E63"
                      strokeWidth="1.5"
                      rx="2.5"
                      className="shadow-md"
                    />

                    {/* Berg ID Pill Badge for Crisp Readability */}
                    <g transform={`translate(${bx}, ${by - (isMega ? 16 : 14)})`}>
                      <rect
                        x="-17"
                        y="-7"
                        width="34"
                        height="14"
                        rx="3.5"
                        fill="rgba(8, 14, 28, 0.9)"
                        stroke="#FF2E63"
                        strokeWidth="0.8"
                        strokeOpacity="0.7"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#FFA4B6"
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {b.properties.iceberg_id}
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* Research Stations & Indian NCPOR Bases with Collision-Free Pill Badges */}
            {visibleLayers.stations &&
              stationPlacements.map((st) => {
                const isIndian = st.meta.isIndian;
                const badgeText = `${st.meta.shortName} ${st.meta.flag}`;
                const badgeWidth = Math.max(badgeText.length * 6.8 + 14, 54);

                return (
                  <g
                    key={st.name}
                    className="cursor-pointer group"
                    onMouseEnter={() =>
                      setHoveredEntity({
                        type: "station",
                        name: st.name,
                        lat: st.lat,
                        lon: st.lon,
                        weather: st.weather,
                      })
                    }
                    onMouseLeave={() => setHoveredEntity(null)}
                  >
                    {/* Station Pulsing Beacon Ring */}
                    <circle
                      cx={st.sx}
                      cy={st.sy}
                      r={isIndian ? 12 : 9}
                      fill={isIndian ? "#FFB800" : "#00F0FF"}
                      fillOpacity="0.2"
                      className="animate-ping"
                    />
                    <circle
                      cx={st.sx}
                      cy={st.sy}
                      r={isIndian ? 5.5 : 4.5}
                      fill={isIndian ? "#FFB800" : "#00F0FF"}
                      stroke="#060911"
                      strokeWidth="1.5"
                    />
                    <circle cx={st.sx} cy={st.sy} r="2" fill="#FFFFFF" />

                    {/* Subtle Leader Connector Line between marker dot and badge */}
                    <line
                      x1={st.sx}
                      y1={st.sy + (st.offsetY > 0 ? 5 : -5)}
                      x2={st.sx}
                      y2={st.sy + st.offsetY + (st.offsetY > 0 ? -9 : 9)}
                      stroke={isIndian ? "rgba(255, 184, 0, 0.4)" : "rgba(56, 189, 248, 0.3)"}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />

                    {/* Crisp Frosted Pill Badge */}
                    <g transform={`translate(${st.sx + st.offsetX}, ${st.sy + st.offsetY})`}>
                      <rect
                        x={-badgeWidth / 2}
                        y="-9"
                        width={badgeWidth}
                        height="18"
                        rx="5"
                        fill="rgba(6, 11, 24, 0.92)"
                        stroke={isIndian ? "rgba(255, 184, 0, 0.6)" : "rgba(56, 189, 248, 0.35)"}
                        strokeWidth="1"
                        className="shadow-lg"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill={isIndian ? "#FFD269" : "#F8FAFC"}
                        fontSize="9.5"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontWeight="700"
                        letterSpacing="0.01em"
                      >
                        {badgeText}
                      </text>
                    </g>

                    {/* Live BAS Met-Tag if enabled */}
                    {visibleLayers.weather && st.weather && (
                      <g transform={`translate(${st.sx + st.offsetX}, ${st.sy + st.offsetY + (st.offsetY > 0 ? 16 : -14)})`}>
                        <rect
                          x="-26"
                          y="-6"
                          width="52"
                          height="12"
                          rx="3"
                          fill="rgba(14, 23, 42, 0.85)"
                          stroke="rgba(56, 189, 248, 0.3)"
                          strokeWidth="0.6"
                        />
                        <text
                          x="0"
                          y="2.5"
                          textAnchor="middle"
                          fill="#38BDF8"
                          fontSize="7.5"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          fontWeight="600"
                        >
                          {st.weather.temperature_c}°C · {st.weather.wind_speed_knots}kt
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
          </g>
        </svg>
      </div>

      {/* Floating Interactive Entity / "Why This Turn?" Card */}
      {hoveredEntity && hoveredEntity.type === "turn" && (
        <div className="absolute top-14 right-14 z-30 glacio-deck rounded-2xl p-4 shadow-2xl border border-cyan-400/50 max-w-sm animate-in fade-in duration-150 text-slate-200 font-mono">
          <div className="flex items-center gap-2 text-[#00F0FF] font-bold text-xs uppercase tracking-wider mb-2 border-b border-white/[0.08] pb-1.5">
            <Sparkles className="w-4 h-4" />
            <span>AI CORRIDOR ATTRIBUTION PIN</span>
          </div>
          <div className="text-sm font-bold text-white mb-1.5">{hoveredEntity.pin.title}</div>
          <div className="text-xs space-y-1.5 text-slate-300">
            <div>
              <span className="text-slate-400">Action: </span>
              <span className="text-[#00F0FF]">{hoveredEntity.pin.divergence}</span>
            </div>
            <div>
              <span className="text-slate-400">Safety Gain: </span>
              <span className="text-emerald-400 font-bold">{hoveredEntity.pin.benefit}</span>
            </div>
            <div>
              <span className="text-slate-400">Detour Cost: </span>
              <span className="text-amber-400">{hoveredEntity.pin.cost}</span>
            </div>
          </div>
        </div>
      )}

      {hoveredEntity && hoveredEntity.type === "ship" && (
        <div className="absolute top-14 right-14 z-30 glacio-deck rounded-2xl p-4 shadow-2xl border border-[#00F0FF]/50 max-w-xs animate-in fade-in duration-150 text-slate-200 font-mono">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <Ship className="w-4 h-4 text-[#00F0FF]" />
              <span>{hoveredEntity.name}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40">
              ACTIVE
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[9px]">POLAR CLASS</span>
              <span className="font-semibold text-slate-200">{hoveredEntity.polarClass}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">SPEED OVER GROUND</span>
              <span className="font-semibold text-[#00FFA3] tabular-nums">{hoveredEntity.speedKts} kts</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">HEADING</span>
              <span className="font-semibold text-slate-200 tabular-nums">{hoveredEntity.headingDeg}° TRUE</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">RADAR CONE</span>
              <span className="font-semibold text-cyan-400">90 NM SWEEP</span>
            </div>
          </div>
        </div>
      )}

      {hoveredEntity && hoveredEntity.type === "iceberg" && (
        <div className="absolute top-14 right-14 z-30 glacio-deck rounded-2xl p-4 shadow-2xl border border-rose-500/50 max-w-xs animate-in fade-in duration-150 text-slate-200 font-mono">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>ICEBERG {hoveredEntity.data.iceberg_id}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
              {hoveredEntity.data.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[9px]">DIMENSIONS</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {hoveredEntity.data.length_nm} × {hoveredEntity.data.width_nm} NM
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">DRIFT RATE</span>
              <span className="font-semibold text-slate-200 tabular-nums">{hoveredEntity.data.disp_km_day} km/d</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">SURFACE AREA</span>
              <span className="font-semibold text-slate-200 tabular-nums">{hoveredEntity.data.size_sqkm} km²</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">COLLISION RISK</span>
              <span className="font-bold text-[#FF2E63] tabular-nums">
                {Math.round((hoveredEntity.data.risk_score || 0.85) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {hoveredEntity && hoveredEntity.type === "station" && (
        <div className="absolute top-14 right-14 z-30 glacio-deck rounded-2xl p-4 shadow-2xl border border-cyan-400/50 max-w-xs animate-in fade-in duration-150 text-slate-200 font-mono">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <Compass className="w-4 h-4 text-[#00F0FF]" />
              <span>{hoveredEntity.name}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Position: </span>
              <span className="text-slate-200 tabular-nums">
                {Math.abs(hoveredEntity.lat).toFixed(2)}°S, {Math.abs(hoveredEntity.lon).toFixed(2)}°{hoveredEntity.lon < 0 ? "W" : "E"}
              </span>
            </div>
            {hoveredEntity.weather && (
              <div className="border-t border-white/[0.06] pt-1.5 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Air Temperature:</span>
                  <span className="text-cyan-400 font-bold">{hoveredEntity.weather.temperature_c}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wind Speed:</span>
                  <span className="text-white font-bold">{hoveredEntity.weather.wind_speed_knots} kts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Barometric Pressure:</span>
                  <span className="text-slate-300">{hoveredEntity.weather.pressure_hpa} hPa</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
