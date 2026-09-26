"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { GeoJSONLineString, IcebergFeature, WeatherStationFeature, VesselProfile, ExpeditionPlan } from "@/types";
import {
  Compass,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Sparkles,
  Layers,
  Crosshair,
  Globe,
  Ship,
  Navigation2,
  Volume2,
  VolumeX,
  CornerUpLeft,
  Anchor,
  LifeBuoy,
  X,
} from "lucide-react";

interface PolarMapProps {
  recommendedRoute: GeoJSONLineString | null;
  directRoute: GeoJSONLineString | null;
  expeditionPlan?: ExpeditionPlan | null;
  onClearExpedition?: () => void;
  onOpenExpedition?: () => void;
  icebergs: IcebergFeature[];
  weatherStations: WeatherStationFeature[];
  stations: { name: string; lat: number; lon: number }[];
  visibleLayers: {
    icebergs: boolean;
    weather: boolean;
    seaIce: boolean;
    stations: boolean;
  };
  vesselProfile?: VesselProfile | null;
  selectedPolarClass?: string;
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
  index: number;
}

// Polar Stereographic Center & Base Scale
const SVG_CX = 700;
const SVG_CY = 450;
const POLAR_SCALE = 13.2; // Pixels per degree of latitude from South Pole (90°S)

// Seamless Continuous 360° Antarctic Mainland Continental Coastline
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

  // 12. Alexander Island Bay & West Antarctic Peninsula
  [-71.5, -68.0], [-70.0, -68.5], [-68.5, -67.0], [-67.0, -67.5],
  [-65.2, -64.3], [-64.2, -61.5], [-63.4, -57.0]
];

// Sub-Antarctic Archipelagos & Islands
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

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 60;
  const avgLatRad = (((lat1 + lat2) / 2) * Math.PI) / 180;
  const dLon = (lon2 - lon1) * 60 * Math.cos(avgLatRad);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

export const PolarMap: React.FC<PolarMapProps> = ({
  recommendedRoute,
  directRoute,
  expeditionPlan = null,
  onClearExpedition,
  onOpenExpedition,
  icebergs,
  weatherStations,
  stations,
  visibleLayers,
  vesselProfile,
  selectedPolarClass,
  isSurgeActive = false,
  scrubHours = 0,
}) => {
  // High-performance decoupled camera state refs (Google Maps 60/120fps standard)
  const cameraRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    zoom: 0.92,
    targetZoom: 0.92,
    vx: 0,
    vy: 0,
    keyVx: 0,
    keyVy: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartPanX: 0,
    dragStartPanY: 0,
    dragMoved: false,
  });

  const pointerHistoryRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const mapGroupRef = useRef<SVGGElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity>(null);
  const [activeTurnPin, setActiveTurnPin] = useState<DynamicTurnPin | null>(null);
  const [showBathymetry, setShowBathymetry] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const coordsRef = useRef<HTMLSpanElement>(null);

  const svgWidth = 1400;
  const svgHeight = 900;

  // Polar Stereographic Projection (EPSG:3031 Standard)
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

  // Memoized SVG background geometry
  const mainlandPath = useMemo(() => {
    return (
      ANTARCTICA_CONTINENTAL_COASTLINE.map((pt, idx) => {
        const [x, y] = project(pt[0], pt[1]);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ") + " Z"
    );
  }, [project]);

  const islandsPaths = useMemo(() => {
    return SUB_ANTARCTIC_ISLANDS.map((island) => ({
      name: island.name,
      d:
        island.points
          .map((pt, idx) => {
            const [x, y] = project(pt[0], pt[1]);
            return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(" ") + " Z",
    }));
  }, [project]);

  const getRouteSvgPath = useCallback(
    (coords: [number, number][]): string => {
      if (!coords || coords.length === 0) return "";
      return coords
        .map((pt, idx) => {
          const [x, y] = project(pt[1], pt[0]);
          return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");
    },
    [project]
  );

  // Dynamic Turn Pin Extraction
  const dynamicTurnPins: DynamicTurnPin[] = useMemo(() => {
    const coords = recommendedRoute?.geometry?.coordinates;
    if (!coords || coords.length < 6) return [];

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

      const wpNum = extractedPins.length + 1;
      const targetBerg = closestBerg as IcebergFeature["properties"] | null;
      const turnTitle =
        targetBerg && minBergDist < 75
          ? `Iceberg ${targetBerg.iceberg_id} Clearance (WP${wpNum})`
          : `Hydrodynamic Course Alignment (WP${wpNum})`;

      const benefitDesc =
        targetBerg && minBergDist < 75
          ? `Maintains ${minBergDist.toFixed(1)} NM safety buffer clear of drift field`
          : `Optimizes speed over ground along local bathymetric trench`;

      extractedPins.push({
        id: `dynamic-turn-${i}`,
        lat: curr[1],
        lon: curr[0],
        title: turnTitle,
        divergence: `${deflection > 5 ? deflection.toFixed(0) : "14"}° course deviation`,
        benefit: benefitDesc,
        cost: `+${(deflection * 0.35 + 2.1).toFixed(1)} NM safety detour`,
        index: wpNum,
      });

      if (extractedPins.length >= 3) break;
    }

    return extractedPins;
  }, [recommendedRoute, icebergs]);

  // Google Maps Style Origin & Destination Coordinates
  const routeEndpoints = useMemo(() => {
    const coords = recommendedRoute?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];
    const midIdx = Math.floor(coords.length / 2);
    const midCoord = coords[midIdx];

    const [startX, startY] = project(startCoord[1], startCoord[0]);
    const [endX, endY] = project(endCoord[1], endCoord[0]);
    const [midX, midY] = project(midCoord[1], midCoord[0]);

    let totalNm = 0;
    for (let i = 1; i < coords.length; i++) {
      totalNm += calculateDistanceNm(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
    }

    return {
      start: { x: startX, y: startY, lat: startCoord[1], lon: startCoord[0] },
      end: { x: endX, y: endY, lat: endCoord[1], lon: endCoord[0] },
      mid: { x: midX, y: midY, totalNm: Math.round(totalNm) },
    };
  }, [recommendedRoute, project]);

  // 🎯 SMART SIDEWAY OFFSETS TO KEEP NAMES CLEAR OF THE NAVIGATION PATH
  const stationPlacements = useMemo(() => {
    return stations.map((st) => {
      const [sx, sy] = project(st.lat, st.lon);
      const meta = getCleanStationMetadata(st.name);
      const shortNameUpper = st.name.split("/")[0].trim().toUpperCase();
      const weatherMatch = weatherStations.find(
        (w) =>
          w.properties.station_id.toUpperCase().includes(shortNameUpper) ||
          shortNameUpper.includes(w.properties.station_id.toUpperCase())
      );

      // Default smart lateral offset:
      // West Antarctic Peninsula stations offset LEFT (West)
      // East Antarctic & Weddell stations offset RIGHT (East)
      let offsetX = 28;
      let offsetY = 0;
      let textAnchor: "start" | "end" | "middle" = "start";

      const name = st.name.toLowerCase();
      if (name.includes("rothera") || name.includes("vernadsky") || name.includes("deception") || name.includes("fossil")) {
        offsetX = -32;
        offsetY = name.includes("vernadsky") ? -8 : 0;
        textAnchor = "end";
      } else if (name.includes("esperanza") || name.includes("signy") || name.includes("grytviken") || name.includes("halley")) {
        offsetX = 32;
        offsetY = name.includes("esperanza") ? 10 : 0;
        textAnchor = "start";
      } else if (name.includes("maitri") || name.includes("gangotri")) {
        offsetX = 32;
        offsetY = name.includes("maitri") ? -8 : 8;
        textAnchor = "start";
      } else if (name.includes("bharati")) {
        offsetX = 0;
        offsetY = -16;
        textAnchor = "middle";
      }

      return {
        ...st,
        sx,
        sy,
        meta,
        weather: weatherMatch?.properties,
        offsetX,
        offsetY,
        textAnchor,
      };
    });
  }, [stations, weatherStations, project]);

  // Direct GPU-composited SVG transform update (eliminates 100% of React re-render jank)
  const applyTransform = useCallback((x: number, y: number, z: number) => {
    if (mapGroupRef.current) {
      mapGroupRef.current.setAttribute(
        "transform",
        `translate(${x.toFixed(2)}, ${y.toFixed(2)}) translate(${svgWidth / 2}, ${svgHeight / 2}) scale(${z.toFixed(4)}) translate(${-svgWidth / 2}, ${-svgHeight / 2})`
      );
    }
  }, [svgWidth, svgHeight]);

  // Google Maps Style Physics Animation Loop
  const tickPhysics = useCallback(() => {
    const cam = cameraRef.current;
    let needsNextFrame = false;

    // 1. Keypad / Keyboard continuous directional panning
    const keys = activeKeysRef.current;
    let targetKeyVx = 0;
    let targetKeyVy = 0;
    const keySpeed = 22 / cam.zoom;

    if (keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Numpad8")) targetKeyVy += keySpeed;
    if (keys.has("ArrowDown") || keys.has("KeyS") || keys.has("Numpad2")) targetKeyVy -= keySpeed;
    if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("Numpad4")) targetKeyVx += keySpeed;
    if (keys.has("ArrowRight") || keys.has("KeyD") || keys.has("Numpad6")) targetKeyVx -= keySpeed;

    // Diagonals on Numpad (7, 9, 1, 3)
    if (keys.has("Numpad7")) { targetKeyVy += keySpeed * 0.707; targetKeyVx += keySpeed * 0.707; }
    if (keys.has("Numpad9")) { targetKeyVy += keySpeed * 0.707; targetKeyVx -= keySpeed * 0.707; }
    if (keys.has("Numpad1")) { targetKeyVy -= keySpeed * 0.707; targetKeyVx += keySpeed * 0.707; }
    if (keys.has("Numpad3")) { targetKeyVy -= keySpeed * 0.707; targetKeyVx -= keySpeed * 0.707; }

    // Smooth keyboard acceleration & deceleration
    cam.keyVx += (targetKeyVx - cam.keyVx) * 0.28;
    cam.keyVy += (targetKeyVy - cam.keyVy) * 0.28;
    if (Math.abs(cam.keyVx) > 0.05 || Math.abs(cam.keyVy) > 0.05) {
      cam.targetX += cam.keyVx;
      cam.targetY += cam.keyVy;
      needsNextFrame = true;
    }

    // Keypad zoom (+ / -)
    if (keys.has("Equal") || keys.has("NumpadAdd")) {
      cam.targetZoom = Math.min(cam.targetZoom * 1.025, 5.0);
      needsNextFrame = true;
    }
    if (keys.has("Minus") || keys.has("NumpadSubtract")) {
      cam.targetZoom = Math.max(cam.targetZoom * 0.975, 0.35);
      needsNextFrame = true;
    }

    // 2. Kinetic drag momentum glide (when released)
    if (!cam.isDragging && (Math.abs(cam.vx) > 0.1 || Math.abs(cam.vy) > 0.1)) {
      cam.targetX += cam.vx;
      cam.targetY += cam.vy;
      cam.vx *= 0.94; // Viscous exponential friction (authentic Google Maps glide)
      cam.vy *= 0.94;
      needsNextFrame = true;
    } else if (!cam.isDragging) {
      cam.vx = 0;
      cam.vy = 0;
    }

    // 3. Smooth Camera Pan Easing (Spring-damped interpolation towards target)
    if (cam.isDragging) {
      cam.x = cam.targetX;
      cam.y = cam.targetY;
    } else {
      const dx = cam.targetX - cam.x;
      const dy = cam.targetY - cam.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        cam.x += dx * 0.24;
        cam.y += dy * 0.24;
        needsNextFrame = true;
      } else {
        cam.x = cam.targetX;
        cam.y = cam.targetY;
      }
    }

    // 4. Smooth Camera Zoom Easing (Exponential spring interpolation)
    const dz = cam.targetZoom - cam.zoom;
    if (Math.abs(dz) > 0.001) {
      cam.zoom += dz * 0.24;
      needsNextFrame = true;
    } else {
      cam.zoom = cam.targetZoom;
    }

    // Bounds clamping
    cam.targetZoom = Math.max(0.35, Math.min(cam.targetZoom, 5.0));
    cam.zoom = Math.max(0.35, Math.min(cam.zoom, 5.0));

    const maxPan = 2200 * cam.zoom;
    cam.targetX = Math.max(-maxPan, Math.min(maxPan, cam.targetX));
    cam.targetY = Math.max(-maxPan, Math.min(maxPan, cam.targetY));
    cam.x = Math.max(-maxPan, Math.min(maxPan, cam.x));
    cam.y = Math.max(-maxPan, Math.min(maxPan, cam.y));

    // Render directly to SVG transform without React reconciliation overhead
    applyTransform(cam.x, cam.y, cam.zoom);

    if (needsNextFrame || cam.isDragging) {
      animFrameRef.current = requestAnimationFrame(tickPhysics);
    } else {
      animFrameRef.current = null;
    }
  }, [applyTransform]);

  const requestPhysicsTick = useCallback(() => {
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(tickPhysics);
    }
  }, [tickPhysics]);

  // Pointer Capture Dragging with Rolling Velocity Window
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const cam = cameraRef.current;
    cam.isDragging = true;
    cam.dragStartX = e.clientX;
    cam.dragStartY = e.clientY;
    cam.dragStartPanX = cam.x;
    cam.dragStartPanY = cam.y;
    cam.dragMoved = false;
    cam.vx = 0;
    cam.vy = 0;

    const now = performance.now();
    pointerHistoryRef.current = [{ x: e.clientX, y: e.clientY, t: now }];
    requestPhysicsTick();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const cam = cameraRef.current;
    const now = performance.now();

    if (cam.isDragging) {
      const dx = e.clientX - cam.dragStartX;
      const dy = e.clientY - cam.dragStartY;
      if (Math.hypot(dx, dy) > 3) {
        cam.dragMoved = true;
      }

      cam.targetX = cam.dragStartPanX + dx;
      cam.targetY = cam.dragStartPanY + dy;
      cam.x = cam.targetX;
      cam.y = cam.targetY;

      const history = pointerHistoryRef.current;
      history.push({ x: e.clientX, y: e.clientY, t: now });
      while (history.length > 1 && now - history[0].t > 120) {
        history.shift();
      }

      applyTransform(cam.x, cam.y, cam.zoom);
    }

    // Decoupled cursor readout via DOM (0 React re-renders)
    if (coordsRef.current && svgRef.current) {
      const svg = svgRef.current;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(ctm.inverse());

        const adjustedX = (svgP.x - SVG_CX - cam.x) / cam.zoom + SVG_CX;
        const adjustedY = (svgP.y - SVG_CY - cam.y) / cam.zoom + SVG_CY;

        const [lat, lon] = unproject(adjustedX, adjustedY);
        if (lat >= -90.0 && lat <= -45.0) {
          coordsRef.current.innerText = `${Math.abs(lat).toFixed(1)}°S, ${Math.abs(lon).toFixed(1)}°${lon < 0 ? "W" : "E"}`;
        } else {
          coordsRef.current.innerText = "POLAR WATERS";
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {}

    const cam = cameraRef.current;
    if (!cam.isDragging) return;
    cam.isDragging = false;

    // Calculate release velocity vector from multi-sample pointer history
    const history = pointerHistoryRef.current;
    if (history.length >= 2) {
      const oldest = history[0];
      const newest = history[history.length - 1];
      const dt = Math.max(newest.t - oldest.t, 10);
      if (dt < 150) {
        const vx = ((newest.x - oldest.x) / dt) * 16.67;
        const vy = ((newest.y - oldest.y) / dt) * 16.67;
        const speed = Math.hypot(vx, vy);

        if (speed > 0.8) {
          const maxSpeed = 35;
          const scale = speed > maxSpeed ? maxSpeed / speed : 1.0;
          cam.vx = vx * scale;
          cam.vy = vy * scale;
        }
      }
    }
    pointerHistoryRef.current = [];
    requestPhysicsTick();
  };

  // Google Maps-Grade Delta-Normalized Wheel & Trackpad Pinch Zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const svg = svgRef.current;
    if (!svg) return;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(ctm.inverse());

    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 24; // DOM_DELTA_LINE
    else if (e.deltaMode === 2) delta *= 400; // DOM_DELTA_PAGE

    const isPinch = e.ctrlKey;
    const factor = isPinch ? 0.012 : 0.0022;
    const zoomMultiplier = Math.exp(-delta * factor);

    const cam = cameraRef.current;
    cam.vx = 0;
    cam.vy = 0;

    const oldTargetZoom = cam.targetZoom;
    const nextTargetZoom = Math.max(0.35, Math.min(oldTargetZoom * zoomMultiplier, 5.0));

    if (Math.abs(nextTargetZoom - oldTargetZoom) > 0.0001) {
      const cx = svgWidth / 2;
      const cy = svgHeight / 2;
      const scaleRatio = nextTargetZoom / oldTargetZoom;

      cam.targetX = (svgP.x - cx) - scaleRatio * (svgP.x - cx - cam.targetX);
      cam.targetY = (svgP.y - cy) - scaleRatio * (svgP.y - cy - cam.targetY);
      cam.targetZoom = nextTargetZoom;

      requestPhysicsTick();
    }
  }, [svgWidth, svgHeight, requestPhysicsTick]);

  // Non-passive wheel listener attachment to prevent window scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Double-Click Smooth Focal Zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(ctm.inverse());

    const cam = cameraRef.current;
    const oldTargetZoom = cam.targetZoom;
    const nextTargetZoom = Math.min(oldTargetZoom * 1.5, 5.0);

    const cx = svgWidth / 2;
    const cy = svgHeight / 2;
    const scaleRatio = nextTargetZoom / oldTargetZoom;

    cam.targetX = (svgP.x - cx) - scaleRatio * (svgP.x - cx - cam.targetX);
    cam.targetY = (svgP.y - cy) - scaleRatio * (svgP.y - cy - cam.targetY);
    cam.targetZoom = nextTargetZoom;

    requestPhysicsTick();
  };

  // Ship dynamics
  const recCoords = useMemo(() => recommendedRoute?.geometry?.coordinates || [], [recommendedRoute]);
  const shipIndex =
    recCoords.length > 0
      ? Math.min(Math.floor((scrubHours / 48) * (recCoords.length - 1)), recCoords.length - 1)
      : -1;
  const shipPos = shipIndex >= 0 ? recCoords[shipIndex] : null;

  const shipHeadingDeg = useMemo(() => {
    if (!shipPos || recCoords.length < 2) return 45;
    const nextIdx = Math.min(shipIndex + 1, recCoords.length - 1);
    const prevIdx = Math.max(shipIndex - 1, 0);
    const targetPt = shipIndex < recCoords.length - 1 ? recCoords[nextIdx] : recCoords[prevIdx];
    const [currX, currY] = project(shipPos[1], shipPos[0]);
    const [nextX, nextY] = project(targetPt[1], targetPt[0]);
    const angleRad = Math.atan2(nextY - currY, nextX - currX);
    return (angleRad * 180) / Math.PI + 90;
  }, [shipPos, shipIndex, recCoords, project]);

  // Camera Presets
  const handleFitVoyage = useCallback(() => {
    const coords = recommendedRoute?.geometry?.coordinates;
    const cam = cameraRef.current;

    if (!coords || coords.length === 0) {
      cam.targetZoom = 0.85;
      cam.targetX = 0;
      cam.targetY = 0;
      cam.vx = 0;
      cam.vy = 0;
      setActiveTurnPin(null);
      requestPhysicsTick();
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
      Math.max(Math.min((svgWidth * 0.58) / boxWidth, (svgHeight * 0.58) / boxHeight), 0.65),
      2.8
    );

    cam.targetZoom = targetZoom;
    cam.targetX = (svgWidth / 2 - midX) * targetZoom;
    cam.targetY = (svgHeight / 2 - midY) * targetZoom;
    cam.vx = 0;
    cam.vy = 0;
    setActiveTurnPin(null);

    requestPhysicsTick();
  }, [recommendedRoute, project, svgWidth, svgHeight, requestPhysicsTick]);

  // Google Maps Style "Re-centre" on Vessel
  const handleRecentre = useCallback(() => {
    if (!shipPos) {
      handleFitVoyage();
      return;
    }
    const [sx, sy] = project(shipPos[1], shipPos[0]);
    const cam = cameraRef.current;
    const targetZoom = Math.max(cam.zoom, 1.8);

    cam.targetZoom = targetZoom;
    cam.targetX = (svgWidth / 2 - sx) * targetZoom;
    cam.targetY = (svgHeight / 2 - sy) * targetZoom;
    cam.vx = 0;
    cam.vy = 0;

    requestPhysicsTick();
  }, [shipPos, project, handleFitVoyage, svgWidth, svgHeight, requestPhysicsTick]);

  const handleWideView = useCallback(() => {
    const cam = cameraRef.current;
    cam.targetZoom = 0.75;
    cam.targetX = 0;
    cam.targetY = 0;
    cam.vx = 0;
    cam.vy = 0;
    setActiveTurnPin(null);
    requestPhysicsTick();
  }, [requestPhysicsTick]);

  // Auto-frame pan-Antarctic map when multi-leg scientific expedition is loaded
  useEffect(() => {
    if (expeditionPlan && expeditionPlan.legs && expeditionPlan.legs.length > 0) {
      const cam = cameraRef.current;
      cam.targetZoom = 0.70;
      cam.targetX = 0;
      cam.targetY = 0;
      cam.vx = 0;
      cam.vy = 0;
      requestPhysicsTick();
    }
  }, [expeditionPlan, requestPhysicsTick]);

  const handleReset = useCallback(() => {
    const cam = cameraRef.current;
    cam.targetZoom = 0.92;
    cam.targetX = 0;
    cam.targetY = 0;
    cam.vx = 0;
    cam.vy = 0;
    setActiveTurnPin(null);
    requestPhysicsTick();
  }, [requestPhysicsTick]);

  const handleZoomIn = useCallback(() => {
    const cam = cameraRef.current;
    cam.targetZoom = Math.min(cam.targetZoom * 1.35, 5.0);
    requestPhysicsTick();
  }, [requestPhysicsTick]);

  const handleZoomOut = useCallback(() => {
    const cam = cameraRef.current;
    cam.targetZoom = Math.max(cam.targetZoom / 1.35, 0.35);
    requestPhysicsTick();
  }, [requestPhysicsTick]);

  // Keypad & Keyboard Navigation Engine (Arrow keys, Numpad 8/4/6/2/+, WASD, Home)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key;
      const code = e.code;

      if (code === "Numpad5" || code === "Home") {
        e.preventDefault();
        handleRecentre();
        return;
      }

      const isNavKey =
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key) ||
        ["KeyW", "KeyA", "KeyS", "KeyD"].includes(code) ||
        [
          "Numpad8", "Numpad2", "Numpad4", "Numpad6",
          "Numpad7", "Numpad9", "Numpad1", "Numpad3",
          "Equal", "Minus", "NumpadAdd", "NumpadSubtract"
        ].includes(code);

      if (isNavKey) {
        e.preventDefault();
        activeKeysRef.current.add(code);
        if (key.startsWith("Arrow")) {
          activeKeysRef.current.add(key);
        }
        requestPhysicsTick();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.code);
      activeKeysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleRecentre, requestPhysicsTick]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#050811] overflow-hidden select-none touch-none overscroll-none"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      {/* 1. NAVIGATION HUD (TOP-LEFT): DIRECTION BAR & DISTANCE SUMMARY BAR */}
      <div className="absolute top-3 left-3 z-30 pointer-events-auto flex flex-col gap-2 max-w-[calc(100vw-3rem)] sm:max-w-md">
        {/* Direction Turn Banner */}
        <div className="bg-[#032e26]/95 border border-emerald-500/30 rounded-xl shadow-2xl px-3 py-1.5 text-white flex items-center gap-2.5 backdrop-blur-xl transition-all w-fit">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30 shrink-0">
            <CornerUpLeft className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
          </div>
          <div className="leading-tight pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black tracking-tight text-white">
                {dynamicTurnPins.length > 0 ? "18 NM" : "0 NM"}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                NEXT TURN
              </span>
            </div>
            <div className="text-[11px] font-medium text-emerald-200/90 truncate max-w-[200px] sm:max-w-[280px]">
              {dynamicTurnPins[0]?.title || "Peninsula Safe Corridor"}
            </div>
          </div>
        </div>

        {/* Distance & Trip Summary Bar (Directly below Direction Bar) */}
        <div className="bg-[#0B132B]/95 border border-white/10 rounded-xl shadow-xl px-3 py-2 text-white backdrop-blur-xl flex items-center gap-2.5 w-fit">
          <button
            onClick={handleFitVoyage}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors shrink-0"
            title="Overview Entire Track"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <div className="leading-tight pr-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm sm:text-base font-black text-rose-500 tracking-tight">
                {routeEndpoints ? "4d 18h" : "En Route"}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {routeEndpoints ? `${routeEndpoints.mid.totalNm} NM` : "1361 NM"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
              <span className="text-emerald-400 font-bold">Fastest Corridor</span>
              <span>·</span>
              <span ref={coordsRef}>POLAR WATERS</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GOOGLE MAPS FLOATING ACTION CONTROLS (RIGHT DOCK) */}
      <div className="absolute top-16 right-3.5 z-30 flex flex-col gap-2">
        {/* Compass Needle */}
        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] text-white flex items-center justify-center shadow-lg border border-white/10 transition-all cursor-pointer"
          title="Reset North Orientation"
        >
          <div className="flex flex-col items-center">
            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[7px] border-b-rose-500" />
            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[7px] border-t-slate-400" />
          </div>
        </button>

        {/* Mute Audio */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-9 h-9 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] text-slate-200 flex items-center justify-center shadow-lg border border-white/10 transition-all cursor-pointer"
          title={isMuted ? "Unmute Bridge Alerts" : "Mute Bridge Alerts"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Bathymetry Layer Toggle */}
        <button
          onClick={() => setShowBathymetry(!showBathymetry)}
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg border transition-all cursor-pointer ${
            showBathymetry
              ? "bg-cyan-500/20 text-[#00F0FF] border-cyan-400/50"
              : "bg-[#0F172A]/90 text-slate-400 border-white/10 hover:text-white"
          }`}
          title="Toggle Bathymetry Depth Shading"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] text-slate-200 hover:text-[#00F0FF] flex items-center justify-center shadow-lg border border-white/10 transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] text-slate-200 hover:text-[#00F0FF] flex items-center justify-center shadow-lg border border-white/10 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Wide View */}
        <button
          onClick={handleWideView}
          className="w-9 h-9 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] text-slate-200 hover:text-white flex items-center justify-center shadow-lg border border-white/10 transition-all cursor-pointer"
          title="Full Pan-Antarctica 360°"
        >
          <Globe className="w-4 h-4" />
        </button>
      </div>

      {/* 3. FLOATING "RE-CENTRE" PILL (BOTTOM-LEFT) */}
      <div className="absolute bottom-16 left-3.5 z-30 flex items-center gap-2">
        <button
          onClick={handleRecentre}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0F172A]/95 hover:bg-[#1E293B] text-[#00F0FF] border border-cyan-400/40 shadow-xl transition-all cursor-pointer font-bold text-xs tracking-wide group backdrop-blur-xl"
        >
          <Navigation2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform text-[#00F0FF]" />
          <span>Re-centre</span>
        </button>

        {isSurgeActive && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-[11px] shadow-lg backdrop-blur-md animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Hazard Ahead</span>
          </div>
        )}
      </div>



      {/* 5. MAIN SVG PAN-ANTARCTIC CANVAS */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden select-none outline-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full block"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Deep Ocean Gradient */}
            <radialGradient id="polarOcean" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#08101E" />
              <stop offset="45%" stopColor="#050A14" />
              <stop offset="100%" stopColor="#020409" />
            </radialGradient>

            {/* Bathymetry Shelf */}
            <radialGradient id="shelfBathymetry" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#0E2F54" stopOpacity="0.75" />
              <stop offset="65%" stopColor="#091C33" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#060C18" stopOpacity="0.0" />
            </radialGradient>

            {/* Sea Ice Field */}
            <radialGradient id="panAntarcticSeaIce" cx="50%" cy="50%" r="58%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#0284C7" stopOpacity="0.08" />
              <stop offset="85%" stopColor="#0369A1" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#08101E" stopOpacity="0.0" />
            </radialGradient>

            {/* Iceberg Hazard Glow */}
            <radialGradient id="bergHazardMesh" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF2E63" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#E11D48" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
            </radialGradient>

            {/* Continental Ice Cap */}
            <radialGradient id="antarcticIceCapGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0B162C" />
              <stop offset="65%" stopColor="#091325" />
              <stop offset="100%" stopColor="#070E1A" />
            </radialGradient>

            {/* Vessel Radar Beam */}
            <linearGradient id="radarBeamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.0" />
              <stop offset="70%" stopColor="#00F0FF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00FFA3" stopOpacity="0.4" />
            </linearGradient>

            {/* Google Maps Route Drop Shadow */}
            <filter id="routeShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Background Ocean */}
          <rect width={svgWidth} height={svgHeight} fill="url(#polarOcean)" />

          {/* Scaled & Panned Spatial Layer Group */}
          <g
            ref={mapGroupRef}
            transform={`translate(${cameraRef.current.x}, ${cameraRef.current.y}) translate(${svgWidth / 2}, ${svgHeight / 2}) scale(${cameraRef.current.zoom}) translate(${-svgWidth / 2}, ${-svgHeight / 2})`}
            style={{
              willChange: "transform",
              transformOrigin: "0 0",
            }}
          >
            {/* Bathymetry Shelf */}
            {showBathymetry && (
              <circle
                cx={SVG_CX}
                cy={SVG_CY}
                r={40 * POLAR_SCALE}
                fill="url(#shelfBathymetry)"
                className="pointer-events-none"
              />
            )}

            {/* Polar Parallels */}
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
                    fontSize="8.5"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                  >
                    {Math.abs(lat)}°S
                  </text>
                </g>
              );
            })}

            {/* Polar Meridians */}
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
                    x={x2 + Math.sin(thetaRad) * 12}
                    y={y2 - Math.cos(thetaRad) * 6}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="8.5"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                  >
                    {lonLabel}
                  </text>
                </g>
              );
            })}

            {/* Sea Ice Layer */}
            {visibleLayers.seaIce && (
              <circle
                cx={SVG_CX}
                cy={SVG_CY}
                r={36 * POLAR_SCALE}
                fill="url(#panAntarcticSeaIce)"
                className="pointer-events-none"
              />
            )}

            {/* Landmasses */}
            <g id="antarctic-landmass" opacity="0.96">
              <path
                d={mainlandPath}
                fill="url(#antarcticIceCapGrad)"
                stroke="#1E3A5F"
                strokeWidth="1.2"
                strokeLinejoin="round"
                className="hover:stroke-cyan-400/30 transition-colors"
              >
                <title>Antarctic Continent (EPSG:3031)</title>
              </path>

              {islandsPaths.map((island, idx) => (
                <path
                  key={idx}
                  d={island.d}
                  fill="#0B162C"
                  stroke="#1E3A5F"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  className="hover:stroke-cyan-400/30 transition-colors"
                >
                  <title>{island.name}</title>
                </path>
              ))}
            </g>

            {/* South Pole Marker */}
            <g transform={`translate(${SVG_CX}, ${SVG_CY})`}>
              <circle cx="0" cy="0" r="3" fill="#00FFA3" />
              <circle cx="0" cy="0" r="7" fill="none" stroke="#00FFA3" strokeWidth="0.8" strokeDasharray="2 2" />
              <text
                x="0"
                y="13"
                textAnchor="middle"
                fill="#00FFA3"
                fontSize="8"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="700"
                opacity="0.8"
              >
                SOUTH POLE
              </text>
            </g>

            {/* Direct Baseline Shortest Track (Alternative Gray Route) */}
            {directRoute && (
              <g id="direct-route-group">
                <path
                  d={getRouteSvgPath(directRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <path
                  d={getRouteSvgPath(directRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>
            )}

            {/* 🎯 GOOGLE MAPS NAVIGATION PATH (UNOBSTRUCTED, HIGH-CONTRAST ROYAL BLUE) */}
            {recommendedRoute && (
              <g id="google-style-route">
                {/* 1. Dark Route Underlay Casing */}
                <path
                  d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#030712"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#routeShadow)"
                />

                {/* 2. Vibrant Google Maps Navigation Blue Core Line */}
                <path
                  d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 3. Inner Saturated Navigation Core Glow */}
                <path
                  d={getRouteSvgPath(recommendedRoute.geometry.coordinates)}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />

                {/* 4. GOOGLE MAPS MANEUVER TURN CIRCLES (Clean unobtrusive white dots) */}
                {dynamicTurnPins.map((pin) => {
                  const [px, py] = project(pin.lat, pin.lon);
                  const isSelected = activeTurnPin?.id === pin.id;
                  return (
                    <g
                      key={pin.id}
                      className="cursor-pointer group"
                      onClick={() => {
                        if (!cameraRef.current.dragMoved) {
                          setActiveTurnPin(isSelected ? null : pin);
                        }
                      }}
                      onMouseEnter={() => setHoveredEntity({ type: "turn", pin })}
                      onMouseLeave={() => setHoveredEntity(null)}
                    >
                      <circle
                        cx={px}
                        cy={py}
                        r="5"
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth="2"
                        className="shadow-md"
                      />
                      <circle cx={px} cy={py} r="1.8" fill="#1E293B" />
                    </g>
                  );
                })}

                {/* 5. START (ORIGIN) PIN - Green Beacon */}
                {routeEndpoints && (
                  <g
                    transform={`translate(${routeEndpoints.start.x}, ${routeEndpoints.start.y})`}
                    className="cursor-pointer group"
                  >
                    <circle cx="0" cy="0" r="14" fill="#00FFA3" fillOpacity="0.2" />
                    <circle cx="0" cy="0" r="7.5" fill="#00FFA3" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx="0" cy="0" r="2.5" fill="#030712" />

                    <g transform="translate(0, -18)">
                      <rect
                        x="-30"
                        y="-8"
                        width="60"
                        height="16"
                        rx="4"
                        fill="#030712"
                        stroke="#00FFA3"
                        strokeWidth="1"
                        className="shadow-xl"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#00FFA3"
                        fontSize="8"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontWeight="bold"
                      >
                        DEPARTURE
                      </text>
                    </g>
                  </g>
                )}

                {/* 6. DESTINATION PIN - Red Teardrop Drop-Pin */}
                {routeEndpoints && (
                  <g
                    transform={`translate(${routeEndpoints.end.x}, ${routeEndpoints.end.y})`}
                    className="cursor-pointer group"
                  >
                    <circle cx="0" cy="0" r="14" fill="#FF2E63" fillOpacity="0.2" />

                    <path
                      d="M 0 0 C -4.5 -6 -8 -11 -8 -15 A 8 8 0 1 1 8 -15 C 8 -11 4.5 -6 0 0 Z"
                      fill="#FF2E63"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="shadow-xl"
                    />
                    <circle cx="0" cy="-15" r="3" fill="#FFFFFF" />

                    <g transform="translate(0, -28)">
                      <rect
                        x="-32"
                        y="-8"
                        width="64"
                        height="16"
                        rx="4"
                        fill="#030712"
                        stroke="#FF2E63"
                        strokeWidth="1"
                        className="shadow-xl"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FFA4B6"
                        fontSize="8"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontWeight="bold"
                      >
                        DESTINATION
                      </text>
                    </g>
                  </g>
                )}
              </g>
            )}

            {/* 🌟 NCPOR MULTI-WAYPOINT EXPEDITION LOGISTICS VOYAGE TRACKS */}
            {expeditionPlan && expeditionPlan.legs && expeditionPlan.legs.length > 0 && (
              <g id="expedition-multi-leg-group">
                {expeditionPlan.legs.map((leg, legIdx) => {
                  const coords = leg.route_geojson?.geometry?.coordinates;
                  if (!coords || coords.length === 0) return null;
                  const legColors = [
                    { stroke: "#00F0FF", casing: "#0369A1", glow: "#38BDF8" },
                    { stroke: "#10B981", casing: "#047857", glow: "#34D399" },
                    { stroke: "#F59E0B", casing: "#B45309", glow: "#FCD34D" },
                    { stroke: "#A855F7", casing: "#7E22CE", glow: "#D8B4FE" },
                    { stroke: "#EC4899", casing: "#BE185D", glow: "#F472B6" },
                  ];
                  const color = legColors[legIdx % legColors.length];
                  const [origX, origY] = project(leg.origin.lat, leg.origin.lon);
                  const [destX, destY] = project(leg.destination.lat, leg.destination.lon);

                  const haven = leg.contingency_safe_haven;
                  const [havenX, havenY] = haven ? project(haven.lat, haven.lon) : [0, 0];

                  return (
                    <g key={leg.leg_number} id={`expedition-leg-${leg.leg_number}`}>
                      {/* 1. Safe Haven Emergency Abort Vector (Dashed Rose Line) */}
                      {haven && (
                        <g opacity="0.85">
                          <line
                            x1={destX}
                            y1={destY}
                            x2={havenX}
                            y2={havenY}
                            stroke="#F43F5E"
                            strokeWidth="1.8"
                            strokeDasharray="4 4"
                          />
                          <g transform={`translate(${(destX + havenX) / 2}, ${(destY + havenY) / 2})`}>
                            <rect
                              x="-44"
                              y="-8"
                              width="88"
                              height="16"
                              rx="4"
                              fill="#0F172A"
                              stroke="#F43F5E"
                              strokeWidth="0.8"
                            />
                            <text
                              x="0"
                              y="3"
                              textAnchor="middle"
                              fill="#FDA4AF"
                              fontSize="7.5"
                              fontFamily="system-ui, -apple-system, sans-serif"
                              fontWeight="bold"
                            >
                              ABORT {haven.distance_nm} NM
                            </text>
                          </g>
                          <g transform={`translate(${havenX}, ${havenY})`}>
                            <circle cx="0" cy="0" r="5" fill="#4C0519" stroke="#F43F5E" strokeWidth="1.2" />
                            <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
                          </g>
                        </g>
                      )}

                      {/* 2. Leg Track Underlay Casing */}
                      <path
                        d={getRouteSvgPath(coords)}
                        fill="none"
                        stroke="#030712"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* 3. Leg Colored Track */}
                      <path
                        d={getRouteSvgPath(coords)}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* 4. Core Glow */}
                      <path
                        d={getRouteSvgPath(coords)}
                        fill="none"
                        stroke={color.glow}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />

                      {/* 5. Destination Waypoint Marker */}
                      <g transform={`translate(${destX}, ${destY})`} className="cursor-pointer">
                        <circle cx="0" cy="0" r="12" fill={color.stroke} fillOpacity="0.25" />
                        <circle cx="0" cy="0" r="6" fill={color.stroke} stroke="#FFFFFF" strokeWidth="1.8" />
                        <text
                          x="0"
                          y="2.5"
                          textAnchor="middle"
                          fill="#030712"
                          fontSize="7"
                          fontWeight="black"
                        >
                          {leg.leg_number}
                        </text>

                        {/* Station Name & Dwell Pill */}
                        <g transform="translate(0, -18)">
                          <rect
                            x="-50"
                            y="-9"
                            width="100"
                            height="18"
                            rx="5"
                            fill="#070D1B"
                            stroke={color.stroke}
                            strokeWidth="1"
                            className="shadow-xl"
                          />
                          <text
                            x="0"
                            y="-0.5"
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="7.5"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            fontWeight="bold"
                          >
                            {leg.destination.name.split("/")[0].slice(0, 16)}
                          </text>
                          <text
                            x="0"
                            y="6.5"
                            textAnchor="middle"
                            fill={leg.dwell_time_hours > 0 ? "#FCD34D" : "#94A3B8"}
                            fontSize="6.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {leg.dwell_time_hours > 0 ? `Dwell ${leg.dwell_time_hours}h` : "Passage"}
                          </text>
                        </g>
                      </g>

                      {/* 6. Departure Marker on First Leg */}
                      {legIdx === 0 && (
                        <g transform={`translate(${origX}, ${origY})`}>
                          <circle cx="0" cy="0" r="14" fill="#00FFA3" fillOpacity="0.25" />
                          <circle cx="0" cy="0" r="7" fill="#00FFA3" stroke="#FFFFFF" strokeWidth="2" />
                          <circle cx="0" cy="0" r="2.5" fill="#030712" />
                          <g transform="translate(0, -18)">
                            <rect
                              x="-36"
                              y="-8"
                              width="72"
                              height="16"
                              rx="4"
                              fill="#030712"
                              stroke="#00FFA3"
                              strokeWidth="1"
                            />
                            <text
                              x="0"
                              y="3.5"
                              textAnchor="middle"
                              fill="#00FFA3"
                              fontSize="7.5"
                              fontFamily="system-ui, -apple-system, sans-serif"
                              fontWeight="bold"
                            >
                              EXPEDITION ORIGIN
                            </text>
                          </g>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Vessel Position & Heading */}
            {shipPos && (
              <g id="polar-vessel">
                {(() => {
                  const [sx, sy] = project(shipPos[1], shipPos[0]);
                  return (
                    <g
                      transform={`translate(${sx}, ${sy})`}
                      className="cursor-pointer group"
                      onMouseEnter={() =>
                        setHoveredEntity({
                          type: "ship",
                          name: vesselProfile?.name || (selectedPolarClass === "PC1" ? "Heavy Polar Icebreaker (PC-1)" : "MV Vasiliy Golovnin"),
                          polarClass: vesselProfile?.polar_class || (selectedPolarClass ? `${selectedPolarClass} Class` : "PC-2"),
                          speedKts: vesselProfile?.cruising_speed_knots || 14.2,
                          headingDeg: Math.round(shipHeadingDeg),
                        })
                      }
                      onMouseLeave={() => setHoveredEntity(null)}
                    >
                      {/* Radar Beam */}
                      <g transform={`rotate(${shipHeadingDeg})`}>
                        <path
                          d="M 0 0 L -25 -65 A 65 65 0 0 1 25 -65 Z"
                          fill="url(#radarBeamGrad)"
                          className="pointer-events-none"
                        />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="-65"
                          stroke="#00FFA3"
                          strokeWidth="1.2"
                          strokeOpacity="0.7"
                          strokeDasharray="2 2"
                        />
                      </g>

                      {/* Hull */}
                      <g transform={`rotate(${shipHeadingDeg})`}>
                        <ellipse cx="1" cy="2" rx="9" ry="16" fill="#020408" fillOpacity="0.8" />
                        <path
                          d="M 0 -16 L 7 -8 L 7 11 L -7 11 L -7 -8 Z"
                          fill="#1E293B"
                          stroke="#475569"
                          strokeWidth="1.2"
                        />
                        <path d="M 0 -14 L 6 -7 L 6 -4 L -6 -4 L -6 -7 Z" fill="#FF2E63" />
                        <rect x="-4" y="-5" width="8" height="8" rx="1.5" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.8" />
                        <rect x="-3" y="-4" width="6" height="2" rx="0.5" fill="#00F0FF" />
                        <circle cx="0" cy="6" r="3" fill="#1E293B" stroke="#00FFA3" strokeWidth="0.8" />
                        <text x="0" y="8" textAnchor="middle" fill="#00FFA3" fontSize="3.5" fontFamily="monospace" fontWeight="bold">
                          H
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Icebergs */}
            {visibleLayers.icebergs &&
              icebergs.map((b) => {
                const driftSpeedKmDay = b.properties.disp_km_day || 0.8;
                const driftHeadingDeg = b.properties.vel_angle_deg || 45;
                const driftHeadingRad = (driftHeadingDeg * Math.PI) / 180;
                const distanceKm = driftSpeedKmDay * (scrubHours / 24);
                const deltaLat = (distanceKm * Math.cos(driftHeadingRad)) / 111.0;
                const deltaLon =
                  (distanceKm * Math.sin(driftHeadingRad)) /
                  (111.0 * Math.cos((b.properties.lat * Math.PI) / 180));

                const currentLat = b.properties.lat + deltaLat;
                const currentLon = b.properties.lon + deltaLon;
                const [bx, by] = project(currentLat, currentLon);

                const isMega =
                  b.properties.size_sqkm > 200 ||
                  b.properties.iceberg_id === "A68A" ||
                  b.properties.iceberg_id === "A23A" ||
                  b.properties.iceberg_id === "A76";

                return (
                  <g
                    key={b.properties.iceberg_id}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredEntity({ type: "iceberg", data: b.properties })}
                    onMouseLeave={() => setHoveredEntity(null)}
                  >
                    <circle
                      cx={bx}
                      cy={by}
                      r={isMega ? 16 : 10}
                      fill="url(#bergHazardMesh)"
                    />

                    {/* Diamond Glyph */}
                    <g transform={`translate(${bx}, ${by}) rotate(45)`}>
                      <rect
                        x={isMega ? -4 : -3}
                        y={isMega ? -4 : -3}
                        width={isMega ? 8 : 6}
                        height={isMega ? 8 : 6}
                        fill="#FFFFFF"
                        stroke="#FF2E63"
                        strokeWidth="1.2"
                        rx="1"
                      />
                    </g>

                    {/* ID Label (Halo style, unobtrusive) */}
                    <text
                      x={bx + 8}
                      y={by + 3}
                      fill="#FFA4B6"
                      fontSize="7.5"
                      fontWeight="700"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      className="pointer-events-none"
                      style={{
                        paintOrder: "stroke fill",
                        stroke: "#030712",
                        strokeWidth: "2.5px",
                        strokeLinejoin: "round",
                      }}
                    >
                      {b.properties.iceberg_id}
                    </text>
                  </g>
                );
              })}

            {/* 🎯 RESEARCH STATIONS (LATERAL OFFSET KEEPS PATH COMPLETELY CLEAR) */}
            {visibleLayers.stations &&
              stationPlacements.map((st) => {
                const isIndian = st.meta.isIndian;
                const badgeText = `${st.meta.shortName} ${st.meta.flag}`;

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
                    {/* Small precise station marker dot */}
                    <circle
                      cx={st.sx}
                      cy={st.sy}
                      r={isIndian ? 4.5 : 3.5}
                      fill={isIndian ? "#FFB800" : "#38BDF8"}
                      stroke="#060911"
                      strokeWidth="1.2"
                    />
                    <circle cx={st.sx} cy={st.sy} r="1.2" fill="#FFFFFF" />

                    {/* Subtle hairline leader connector to offset text */}
                    <line
                      x1={st.sx}
                      y1={st.sy}
                      x2={st.sx + (st.offsetX > 0 ? 12 : st.offsetX < 0 ? -12 : 0)}
                      y2={st.sy + (st.offsetY !== 0 ? (st.offsetY > 0 ? 8 : -8) : 0)}
                      stroke={isIndian ? "rgba(255, 184, 0, 0.4)" : "rgba(56, 189, 248, 0.35)"}
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />

                    {/* GOOGLE MAPS STYLE HALO TEXT (CLEAN & OFFSET ASIDE FROM ROUTE) */}
                    <text
                      x={st.sx + st.offsetX}
                      y={st.sy + st.offsetY + 3.5}
                      textAnchor={st.textAnchor}
                      fill={isIndian ? "#FFD269" : "#F1F5F9"}
                      fontSize="8.5"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontWeight={isIndian ? "800" : "600"}
                      className="pointer-events-none transition-all group-hover:fill-cyan-300"
                      style={{
                        paintOrder: "stroke fill",
                        stroke: "#030712",
                        strokeWidth: "3px",
                        strokeLinejoin: "round",
                      }}
                    >
                      {badgeText}
                    </text>
                  </g>
                );
              })}
          </g>
        </svg>
      </div>

      {/* 6. TOOLTIPS & DETAIL CARDS */}
      {hoveredEntity && hoveredEntity.type === "turn" && (
        <div className="absolute top-20 left-4 z-40 glacio-deck rounded-2xl p-4 shadow-2xl border border-cyan-400/50 max-w-sm animate-in fade-in duration-150 text-slate-200 font-mono">
          <div className="flex items-center gap-2 text-[#00F0FF] font-bold text-xs uppercase tracking-wider mb-2 border-b border-white/[0.08] pb-1.5">
            <Sparkles className="w-4 h-4" />
            <span>AI CORRIDOR ATTRIBUTION PIN #{hoveredEntity.pin.index}</span>
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
        <div className="absolute top-20 left-4 z-40 glacio-deck rounded-2xl p-4 shadow-2xl border border-[#00F0FF]/50 max-w-xs animate-in fade-in duration-150 text-slate-200 font-mono">
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
              <span className="text-slate-400 block text-[9px]">RADAR SWEEP</span>
              <span className="font-semibold text-cyan-400">65 NM CONE</span>
            </div>
          </div>
        </div>
      )}

      {hoveredEntity && hoveredEntity.type === "iceberg" && (
        <div className="absolute top-20 left-4 z-40 glacio-deck rounded-2xl p-4 shadow-2xl border border-rose-500/50 max-w-xs animate-in fade-in duration-150 text-slate-200 font-mono">
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
        <div className="absolute top-20 left-4 z-40 glacio-deck rounded-2xl p-4 shadow-2xl border border-cyan-400/50 max-w-xs animate-in fade-in duration-150 text-slate-200 font-mono">
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
                {Math.abs(hoveredEntity.lat).toFixed(2)}°S, {Math.abs(hoveredEntity.lon).toFixed(2)}°
                {hoveredEntity.lon < 0 ? "W" : "E"}
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
