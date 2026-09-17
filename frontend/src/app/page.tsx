"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { TelemetryStrip } from "@/components/TelemetryStrip";
import { RouteConfigRail } from "@/components/RouteConfigRail";
import { PolarMap } from "@/components/PolarMap";
import { ComparisonDock } from "@/components/ComparisonDock";
import { XAIModal } from "@/components/XAIModal";
import { SurgeSimulationBanner } from "@/components/SurgeSimulationBanner";

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
} from "@/types";

export default function PolarisCockpit() {
  // State: Reference Fleet & Stations
  const [stations, setStations] = useState<{ name: string; lat: number; lon: number }[]>([
    { name: "Rothera Station", lat: -67.57, lon: -68.12 },
    { name: "Faraday / Vernadsky", lat: -65.25, lon: -64.27 },
    { name: "Deception Island", lat: -63.0, lon: -60.7 },
    { name: "Signy Island", lat: -60.7, lon: -45.6 },
    { name: "Grytviken / South Georgia", lat: -54.28, lon: -36.48 },
    { name: "Halley Station", lat: -75.43, lon: -26.22 },
  ]);

  const [vessels, setVessels] = useState<VesselProfile[]>([
    {
      name: "MV Vasiliy Golovnin (Research PRV)",
      polar_class: "PC-5",
      description: "Standard Polar Research Vessel deployed on Indian Antarctic Expeditions (NCPOR).",
      cruising_speed_knots: 14.0,
      max_safe_ice_conc: 0.7,
      hull_resistance_coeff: 1.8,
      engine_power_kw: 12500,
      base_fuel_rate_tons_day: 28,
      risk_multiplier: 1.0,
    },
  ]);

  // State: Routing Parameters
  const [selectedStart, setSelectedStart] = useState<string>("Rothera Station");
  const [selectedDest, setSelectedDest] = useState<string>("Grytviken / South Georgia");
  const [selectedPolarClass, setSelectedPolarClass] = useState<string>("PC-5");
  const [safetyWeight, setSafetyWeight] = useState<number>(0.7);
  const [fuelWeight, setFuelWeight] = useState<number>(0.3);
  const [simulationDate, setSimulationDate] = useState<string>("2021-03-15");

  // State: Geospatial Layers
  const [icebergs, setIcebergs] = useState<IcebergFeature[]>([]);
  const [weatherStations, setWeatherStations] = useState<WeatherStationFeature[]>([]);
  const [visibleLayers, setVisibleLayers] = useState({
    icebergs: true,
    weather: true,
    seaIce: true,
    stations: true,
  });

  // State: Active Route Calculation & XAI
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [isXAIModalOpen, setIsXAIModalOpen] = useState<boolean>(false);

  // State: Dynamic Surge Simulation
  const [isSurgeActive, setIsSurgeActive] = useState<boolean>(false);
  const [isSurgeBannerOpen, setIsSurgeBannerOpen] = useState<boolean>(false);

  // Initial Load: Fetch static meta and operational layers
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

  // Run initial route optimization on mount
  useEffect(() => {
    handleComputeRoute();
  }, [selectedStart, selectedDest, selectedPolarClass, simulationDate]);

  // Toggle dynamic layer visibility
  const handleToggleLayer = (layer: "icebergs" | "weather" | "seaIce" | "stations") => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Trigger A68A Dynamic Surge Scenario
  const handleTriggerSurgeDemo = async () => {
    if (isSurgeActive) {
      // Toggle back to normal
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

      setRouteData({
        status: "SURGE_ACTIVE",
        request: {
          start: { name: selectedStart, lat: -67.57, lon: -68.12 },
          destination: { name: selectedDest, lat: -54.28, lon: -36.48 },
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      {/* 1. Executive Maritime Header */}
      <Header
        activeCorridor="Antarctic Peninsula & Weddell Sea"
        isBackendHealthy={isBackendHealthy}
        onOpenXAI={() => setIsXAIModalOpen(true)}
        onTriggerSurgeDemo={handleTriggerSurgeDemo}
        isSurgeActive={isSurgeActive}
      />

      {/* 2. Main Bento Cockpit Workspace */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 lg:px-6 py-4">
        {/* Dynamic Surge Alert Banner */}
        <SurgeSimulationBanner
          isOpen={isSurgeBannerOpen}
          onDismiss={() => setIsSurgeBannerOpen(false)}
          onApplyReroute={() => setIsSurgeBannerOpen(false)}
        />

        {/* 3. 4-KPI Horizontal Telemetry Strip */}
        <TelemetryStrip
          recommendedMetrics={routeData?.recommended_metrics || null}
          directMetrics={routeData?.direct_metrics || null}
          vesselName={routeData?.vessel_profile.name || "MV Vasiliy Golovnin"}
        />

        {/* 4. Core Bento Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Control Rail (4 cols on xl, 3.5 cols on lg) */}
          <div className="lg:col-span-4 xl:col-span-3 h-full">
            <RouteConfigRail
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
              onSelectStart={setSelectedStart}
              onSelectDest={setSelectedDest}
              onSelectPolarClass={setSelectedPolarClass}
              onSafetyWeightChange={setSafetyWeight}
              onFuelWeightChange={setFuelWeight}
              onDateChange={setSimulationDate}
              onToggleLayer={handleToggleLayer}
              onComputeRoute={() => handleComputeRoute()}
            />
          </div>

          {/* Right Geospatial Cockpit & Decision Dock (8 cols on xl, 8.5 cols on lg) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
            {/* Interactive Polar Canvas */}
            <PolarMap
              recommendedRoute={routeData?.recommended_route || null}
              directRoute={routeData?.direct_route || null}
              icebergs={icebergs}
              weatherStations={weatherStations}
              stations={stations}
              visibleLayers={visibleLayers}
              isSurgeActive={isSurgeActive}
            />

            {/* Side-by-Side Tradeoff Comparison Dock */}
            <ComparisonDock
              recommendedMetrics={routeData?.recommended_metrics || null}
              directMetrics={routeData?.direct_metrics || null}
              vessel={routeData?.vessel_profile || null}
              onOpenXAI={() => setIsXAIModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* 5. Explainable AI Decision Modal */}
      <XAIModal
        isOpen={isXAIModalOpen}
        onClose={() => setIsXAIModalOpen(false)}
        xaiData={routeData?.xai || null}
      />
    </div>
  );
}
