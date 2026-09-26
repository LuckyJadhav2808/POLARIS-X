"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopHUD } from "@/components/TopHUD";
import { PolarMap } from "@/components/PolarMap";
import { RightHUD } from "@/components/RightHUD";
import { BottomDrawer } from "@/components/BottomDrawer";
import { XAIModal } from "@/components/XAIModal";
import { SurgeSimulationBanner } from "@/components/SurgeSimulationBanner";
import { ExpeditionPlannerModal } from "@/components/ExpeditionPlannerModal";
import { PolarisCopilotHUD } from "@/components/PolarisCopilotHUD";

import {
  fetchStations,
  fetchVessels,
  fetchOperationalLayers,
  calculateRoute,
  triggerSurgeSimulation,
} from "@/lib/api";
import {
  RouteResponse,
  VesselProfile,
  IcebergFeature,
  WeatherStationFeature,
  ExpeditionPlan,
  CopilotAction,
} from "@/types";

export default function PolarisCockpit() {
  // Reference Fleet & Stations (Pan-Antarctica 360° Matrix)
  const [stations, setStations] = useState<{ name: string; lat: number; lon: number }[]>([
    { name: "Maitri Station (India)", lat: -70.76, lon: 11.74 },
    { name: "Bharati Station (India)", lat: -69.4, lon: 76.19 },
    { name: "Dakshin Gangotri (India)", lat: -70.08, lon: 12.0 },
    { name: "Rothera Station", lat: -67.57, lon: -68.12 },
    { name: "Grytviken / South Georgia", lat: -54.28, lon: -36.48 },
    { name: "Halley Station", lat: -75.43, lon: -26.22 },
    { name: "McMurdo Station (USA)", lat: -77.85, lon: 166.67 },
    { name: "Casey Station (Australia)", lat: -66.28, lon: 110.53 },
    { name: "Davis Station (Australia)", lat: -68.58, lon: 77.97 },
    { name: "Mawson Station (Australia)", lat: -67.6, lon: 62.87 },
    { name: "Esperanza Base (Argentina)", lat: -63.4, lon: -56.98 },
    { name: "Faraday / Vernadsky", lat: -65.25, lon: -64.27 },
    { name: "Deception Island", lat: -63.0, lon: -60.7 },
    { name: "Signy Island", lat: -60.7, lon: -45.6 },
  ]);

  const [vessels, setVessels] = useState<VesselProfile[]>([
    {
      name: "MV Vasiliy Golovnin (Research PRV)",
      polar_class: "PC2",
      description: "Heavy Polar Icebreaker deployed on Indian Antarctic Expeditions (NCPOR).",
      cruising_speed_knots: 14.2,
      max_safe_ice_conc: 0.8,
      hull_resistance_coeff: 1.8,
      engine_power_kw: 12500,
      base_fuel_rate_tons_day: 28,
      risk_multiplier: 1.0,
    },
  ]);

  // Routing Configuration Parameters
  const [selectedStart, setSelectedStart] = useState<string>("Rothera Station");
  const [selectedDest, setSelectedDest] = useState<string>("Grytviken / South Georgia");
  const [selectedPolarClass, setSelectedPolarClass] = useState<string>("PC2");
  const [safetyWeight, setSafetyWeight] = useState<number>(0.7);
  const [fuelWeight, setFuelWeight] = useState<number>(0.3);
  const [simulationDate, setSimulationDate] = useState<string>("2021-03-15");

  // Geospatial Overlays
  const [icebergs, setIcebergs] = useState<IcebergFeature[]>([]);
  const [weatherStations, setWeatherStations] = useState<WeatherStationFeature[]>([]);
  const [visibleLayers, setVisibleLayers] = useState({
    icebergs: true,
    weather: true,
    seaIce: true,
    stations: true,
  });

  // Active Route Calculation & XAI
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isRightHUDOpen, setIsRightHUDOpen] = useState<boolean>(false);
  const [isXAIModalOpen, setIsXAIModalOpen] = useState<boolean>(false);
  const [isExpeditionModalOpen, setIsExpeditionModalOpen] = useState<boolean>(false);
  const [activeExpeditionPlan, setActiveExpeditionPlan] = useState<ExpeditionPlan | null>(null);

  // Dynamic Surge Simulation
  const [isSurgeActive, setIsSurgeActive] = useState<boolean>(false);
  const [isSurgeBannerOpen, setIsSurgeBannerOpen] = useState<boolean>(false);

  // Polaris Bridge Copilot AI State
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // 4D Temporal Drift Scrubber (0 to 48 hours)
  const [scrubHours, setScrubHours] = useState<number>(0);

  // Initial Load: Fetch stations, vessels, and layers
  useEffect(() => {
    async function initCockpit() {
      try {
        const [stList, vList, layers] = await Promise.all([
          fetchStations().catch(() => stations),
          fetchVessels().catch(() => vessels),
          fetchOperationalLayers(simulationDate).catch(() => null),
        ]);

        if (stList && stList.length) setStations(stList);
        if (vList && vList.length) setVessels(vList);
        if (layers) {
          setIcebergs(layers.icebergs.features || []);
          setWeatherStations(layers.weather_stations.features || []);
        }
        setIsBackendHealthy(true);
      } catch (err) {
        console.error("Initial load fallback:", err);
        setIsBackendHealthy(false);
      }
    }
    initCockpit();
  }, []);

  // Compute Route function
  const handleComputeRoute = async (customSurgeParams?: {
    surge_berg_id?: string;
    surge_speed_multiplier?: number;
    surge_heading_deg?: number;
  }) => {
    setIsLoading(true);
    try {
      const response = await calculateRoute({
        start_station: selectedStart,
        dest_station: selectedDest,
        polar_class: selectedPolarClass,
        safety_weight: safetyWeight,
        fuel_weight: fuelWeight,
        simulation_date: simulationDate,
        ...customSurgeParams,
      });
      setRouteData(response);
      setIsBackendHealthy(true);
    } catch (err) {
      console.error("Route calculation error:", err);
      setIsBackendHealthy(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Run route calculation whenever routing parameters change
  useEffect(() => {
    handleComputeRoute();
  }, [selectedStart, selectedDest, selectedPolarClass, simulationDate, safetyWeight, fuelWeight]);

  // Toggle layer filters
  const handleToggleLayer = (layer: "icebergs" | "weather" | "seaIce" | "stations") => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Trigger A68A Dynamic Surge Scenario
  const handleTriggerSurgeDemo = async () => {
    if (isSurgeActive) {
      setIsSurgeActive(false);
      setIsSurgeBannerOpen(false);
      handleComputeRoute();
      return;
    }

    setIsLoading(true);
    try {
      const surgeRes = await triggerSurgeSimulation({
        surge_berg_id: "A68A",
        speed_multiplier: 3.5,
        heading_deg: 65.0,
        start_station: selectedStart,
        dest_station: selectedDest,
        polar_class: selectedPolarClass,
        simulation_date: simulationDate,
      });

      const startObj = stations.find((s) => s.name === selectedStart) || { name: selectedStart, lat: -67.57, lon: -68.12 };
      const destObj = stations.find((s) => s.name === selectedDest) || { name: selectedDest, lat: -54.28, lon: -36.48 };

      setRouteData({
        status: "SURGE_ACTIVE",
        request: {
          start: { name: selectedStart, lat: startObj.lat, lon: startObj.lon },
          destination: { name: selectedDest, lat: destObj.lat, lon: destObj.lon },
          polar_class: selectedPolarClass,
          safety_weight: safetyWeight,
          fuel_weight: fuelWeight,
          simulation_date: simulationDate,
        },
        recommended_route: surgeRes.rerouted_route,
        recommended_metrics: surgeRes.rerouted_metrics,
        direct_route: surgeRes.baseline_route,
        direct_metrics: surgeRes.baseline_metrics,
        vessel_profile: surgeRes.vessel_profile,
        xai: surgeRes.xai,
      });

      setIsSurgeActive(true);
      setIsSurgeBannerOpen(true);
    } catch (err) {
      console.error("Surge simulation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dual Export Handlers
  const handleExportECDIS = () => {
    const ecdisData = {
      type: "FeatureCollection",
      metadata: {
        standard: "IEC 61174 ECDIS Route Plan Format",
        system: "POLARIS-X MoES NCPOR Autonomous Marine Routing",
        vessel: routeData?.vessel_profile?.name || "MV Vasiliy Golovnin",
        polar_class: selectedPolarClass,
        origin: selectedStart,
        destination: selectedDest,
        timestamp_utc: new Date().toISOString(),
        metrics: routeData?.recommended_metrics,
      },
      features: [
        {
          type: "Feature",
          properties: {
            route_name: "POLARIS-X Recommended Safe Track",
            polar_risk_level: "A_COMPLIANT",
          },
          geometry: routeData?.recommended_route?.geometry || {
            type: "LineString",
            coordinates: [],
          },
        },
      ],
    };

    const blob = new Blob([JSON.stringify(ecdisData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POLARIS_X_ECDIS_${selectedStart.split("/")[0]}_${selectedDest.split("/")[0]}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGPX = () => {
    const coords = routeData?.recommended_route?.geometry?.coordinates || [];
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="POLARIS-X ECDIS">\n  <trk>\n    <name>POLARIS-X Autonomous Route (${selectedStart.split("/")[0]} to ${selectedDest.split("/")[0]})</name>\n    <trkseg>\n`;
    coords.forEach(([lon, lat], idx) => {
      gpx += `      <trkpt lat="${lat}" lon="${lon}"><name>WP${idx + 1}</name></trkpt>\n`;
    });
    gpx += `    </trkseg>\n  </trk>\n</gpx>`;

    const blob = new Blob([gpx], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POLARIS_X_ROUTE_${selectedStart.split("/")[0]}_${selectedDest.split("/")[0]}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Polaris Copilot Action Dispatcher
  const handleExecuteCopilotAction = (action: CopilotAction) => {
    if (!action || !action.type) return;

    switch (action.type) {
      case "SWITCH_POLAR_CLASS":
      case "SET_POLAR_CLASS": {
        const rawClass = action.payload?.polar_class || "PC2";
        const normalized = rawClass.replace("-", "").toUpperCase();
        setSelectedPolarClass(normalized);
        break;
      }
      case "COMPUTE_ROUTE":
      case "TRIGGER_COMPUTE_ROUTE": {
        handleComputeRoute();
        break;
      }
      case "TRIGGER_SURGE":
      case "TRIGGER_SURGE_DEMO": {
        handleTriggerSurgeDemo();
        break;
      }
      case "OPEN_EXPEDITION":
      case "OPEN_EXPEDITION_PLANNER":
      case "OPEN_EXPEDITION_MODAL": {
        setIsExpeditionModalOpen(true);
        break;
      }
      case "OPEN_TRADEOFFS":
      case "OPEN_TRADEOFFS_HUD": {
        setIsRightHUDOpen(true);
        break;
      }
      case "OPEN_XAI":
      case "OPEN_XAI_MODAL": {
        setIsXAIModalOpen(true);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060911] text-slate-100 selection:bg-[#00F0FF]/30 selection:text-[#00F0FF]">
      {/* 1. Framed Pan-Antarctic Polar Stereographic Deck (Framed between Header, BottomDrawer, and Sidebars) */}
      <div
        className={`fixed top-[68px] bottom-[94px] right-4 transition-all duration-300 z-10 rounded-3xl overflow-hidden border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.6)] bg-[#040812] ${
          isSidebarCollapsed ? "left-[104px]" : "left-[356px]"
        }`}
      >
        <PolarMap
          recommendedRoute={routeData?.recommended_route || null}
          directRoute={routeData?.direct_route || null}
          expeditionPlan={activeExpeditionPlan}
          onClearExpedition={() => setActiveExpeditionPlan(null)}
          onOpenExpedition={() => setIsExpeditionModalOpen(true)}
          icebergs={icebergs}
          weatherStations={weatherStations}
          stations={stations}
          visibleLayers={visibleLayers}
          vesselProfile={routeData?.vessel_profile || null}
          selectedPolarClass={selectedPolarClass}
          isSurgeActive={isSurgeActive}
          scrubHours={scrubHours}
          isSidebarCollapsed={isSidebarCollapsed}
          onOpenTradeoffs={() => setIsRightHUDOpen(true)}
          onOpenXAI={() => setIsXAIModalOpen(true)}
        />
      </div>

      {/* 2. Floating Neomorphic Sidebar Navigation & Control Deck */}
      <Sidebar
        stations={stations}
        vessels={vessels}
        selectedStart={selectedStart}
        selectedDest={selectedDest}
        selectedPolarClass={selectedPolarClass}
        safetyWeight={safetyWeight}
        fuelWeight={fuelWeight}
        simulationDate={simulationDate}
        visibleLayers={visibleLayers}
        isLoading={isLoading}
        isBackendHealthy={isBackendHealthy}
        isSurgeActive={isSurgeActive}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSelectStart={setSelectedStart}
        onSelectDest={setSelectedDest}
        onSelectPolarClass={setSelectedPolarClass}
        onSafetyWeightChange={setSafetyWeight}
        onFuelWeightChange={setFuelWeight}
        onDateChange={setSimulationDate}
        onToggleLayer={handleToggleLayer}
        onComputeRoute={() => handleComputeRoute()}
        onTriggerSurgeDemo={handleTriggerSurgeDemo}
        onOpenTradeoffs={() => setIsRightHUDOpen(true)}
        onOpenXAI={() => setIsXAIModalOpen(true)}
        onOpenExpedition={() => setIsExpeditionModalOpen(true)}
        activeExpeditionPlan={activeExpeditionPlan}
        onClearExpedition={() => setActiveExpeditionPlan(null)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* 3. Floating Top Telemetry Ribbon */}
      <TopHUD
        recommendedMetrics={routeData?.recommended_metrics || null}
        directMetrics={routeData?.direct_metrics || null}
        esgLedger={routeData?.esg_ledger || null}
        rioProfile={routeData?.rio_profile || null}
        vesselProfile={routeData?.vessel_profile || null}
        selectedStart={selectedStart}
        selectedDest={selectedDest}
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenTradeoffs={() => setIsRightHUDOpen(true)}
        onOpenXAI={() => setIsXAIModalOpen(true)}
        onOpenExpedition={() => setIsExpeditionModalOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onExportECDIS={handleExportECDIS}
        onExportGPX={handleExportGPX}
      />

      {/* 4. Floating 4D Temporal Drift Scrubber Dock */}
      <BottomDrawer
        recommendedRoute={routeData?.recommended_route || null}
        directRoute={routeData?.direct_route || null}
        scrubHours={scrubHours}
        onScrubChange={setScrubHours}
        startStation={selectedStart}
        destStation={selectedDest}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* 5. Slide-Over Analytical Inspector (Route A vs B Tradeoffs, Shapley XAI, ECDIS, IMO POLARIS) */}
      <RightHUD
        isOpen={isRightHUDOpen}
        onClose={() => setIsRightHUDOpen(false)}
        recommendedMetrics={routeData?.recommended_metrics || null}
        directMetrics={routeData?.direct_metrics || null}
        esgLedger={routeData?.esg_ledger || null}
        bathymetry={routeData?.bathymetry || null}
        rioProfile={routeData?.rio_profile || null}
        directRioProfile={routeData?.direct_rio_profile || null}
        vesselProfile={routeData?.vessel_profile || null}
        xaiData={routeData?.xai || null}
        recommendedRoute={routeData?.recommended_route || null}
        directRoute={routeData?.direct_route || null}
        selectedStart={selectedStart}
        selectedDest={selectedDest}
        selectedPolarClass={selectedPolarClass}
      />

      {/* 6. Dynamic Emergency Surge Alert Modal Banner */}
      <SurgeSimulationBanner
        isOpen={isSurgeBannerOpen}
        onDismiss={() => setIsSurgeBannerOpen(false)}
        onApplyReroute={() => setIsSurgeBannerOpen(false)}
      />

      {/* 7. Comprehensive XAI Modal */}
      <XAIModal
        isOpen={isXAIModalOpen}
        onClose={() => setIsXAIModalOpen(false)}
        xaiData={routeData?.xai || null}
      />

      {/* 8. NCPOR Expedition Logistics Planner Modal */}
      <ExpeditionPlannerModal
        isOpen={isExpeditionModalOpen}
        onClose={() => setIsExpeditionModalOpen(false)}
        stations={stations}
        vessels={vessels}
        currentPolarClass={selectedPolarClass}
        onApplyExpeditionToMap={(plan) => {
          setActiveExpeditionPlan(plan);
          setIsExpeditionModalOpen(false);
        }}
      />

      {/* 9. Voice-Assisted Bridge Officer AI Copilot HUD */}
      <PolarisCopilotHUD
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activePolarClass={selectedPolarClass}
        routeData={routeData}
        onExecuteAction={handleExecuteCopilotAction}
      />
    </div>
  );
}
