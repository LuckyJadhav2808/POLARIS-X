"use client";

import React from "react";
import { VesselProfile } from "@/types";
import { Ship, Sliders, Layers, Calendar, Play, CheckCircle2 } from "lucide-react";

interface LeftHUDProps {
  stations: { name: string; lat: number; lon: number }[];
  vessels: VesselProfile[];
  selectedStart: string;
  selectedDest: string;
  selectedPolarClass: string;
  safetyWeight: number;
  fuelWeight: number;
  simulationDate: string;
  visibleLayers: {
    icebergs: boolean;
    weather: boolean;
    seaIce: boolean;
    stations: boolean;
  };
  isLoading: boolean;
  onSelectStart: (name: string) => void;
  onSelectDest: (name: string) => void;
  onSelectPolarClass: (cls: string) => void;
  onSafetyWeightChange: (val: number) => void;
  onFuelWeightChange: (val: number) => void;
  onDateChange: (date: string) => void;
  onToggleLayer: (layer: "icebergs" | "weather" | "seaIce" | "stations") => void;
  onComputeRoute: () => void;
}

export const LeftHUD: React.FC<LeftHUDProps> = ({
  stations,
  vessels,
  selectedStart,
  selectedDest,
  selectedPolarClass,
  safetyWeight,
  fuelWeight,
  simulationDate,
  visibleLayers,
  isLoading,
  onSelectStart,
  onSelectDest,
  onSelectPolarClass,
  onSafetyWeightChange,
  onFuelWeightChange,
  onDateChange,
  onToggleLayer,
  onComputeRoute,
}) => {
  const currentVessel =
    vessels.find((v) => v.polar_class.includes(selectedPolarClass)) || vessels[0];

  return (
    <div className="w-full bg-[#0A1322] rounded-xl border border-[#17263E] p-4 flex flex-col gap-4 select-none shadow-xl text-slate-200">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-[#17263E] pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#38BDF8]" />
          <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
            Voyage Configuration
          </h2>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#13233C] text-[#38BDF8] border border-[#1E3355]">
          A* Monotonic
        </span>
      </div>

      {/* 1. Origin & Destination Waypoints */}
      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] font-mono font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>DEPARTURE PORT / STATION</span>
            <span className="text-[10px] text-[#38BDF8] font-bold">ORIGIN</span>
          </label>
          <div className="relative">
            <select
              value={selectedStart}
              onChange={(e) => onSelectStart(e.target.value)}
              className="w-full bg-[#0D182A] border border-[#1E3355] rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-[#38BDF8] cursor-pointer"
            >
              {stations.map((s) => (
                <option key={s.name} value={s.name} className="bg-[#0D182A]">
                  {s.name} ({Math.abs(s.lat).toFixed(1)}°S, {Math.abs(s.lon).toFixed(1)}°W)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-mono font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>DESTINATION PORT / STATION</span>
            <span className="text-[10px] text-emerald-400 font-bold">DEST</span>
          </label>
          <div className="relative">
            <select
              value={selectedDest}
              onChange={(e) => onSelectDest(e.target.value)}
              className="w-full bg-[#0D182A] border border-[#1E3355] rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-[#38BDF8] cursor-pointer"
            >
              {stations.map((s) => (
                <option key={s.name} value={s.name} className="bg-[#0D182A]">
                  {s.name} ({Math.abs(s.lat).toFixed(1)}°S, {Math.abs(s.lon).toFixed(1)}°W)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Vessel Polar Class Selection */}
      <div className="space-y-2 border-t border-[#17263E] pt-3">
        <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
          <Ship className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>IACS POLAR CLASS PROFILE</span>
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: "PC-5", label: "PC-5 Arc5", sub: "14.0 kts" },
            { id: "PC-2", label: "PC-2 Breaker", sub: "16.5 kts" },
            { id: "Non-Ice", label: "Non-Ice", sub: "12.0 kts" },
          ].map((item) => {
            const isSelected = selectedPolarClass.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPolarClass(item.id)}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#0B2545] border-[#38BDF8] text-white shadow-sm"
                    : "bg-[#0D182A] border-[#17263E] text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-[11px] font-mono font-bold">{item.label}</div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">{item.sub}</div>
              </button>
            );
          })}
        </div>

        {currentVessel && (
          <div className="bg-[#0D182A] rounded-lg p-2 border border-[#17263E] text-[10px] font-mono text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200 truncate">{currentVessel.name}</div>
            <div className="flex justify-between text-slate-400">
              <span>Max Ice: {(currentVessel.max_safe_ice_conc * 100).toFixed(0)}%</span>
              <span>K_hull: {currentVessel.hull_resistance_coeff}</span>
              <span>Fuel: {currentVessel.base_fuel_rate_tons_day} T/d</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Pareto Multi-Objective Optimization Slider */}
      <div className="space-y-2 border-t border-[#17263E] pt-3">
        <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
          <span>PARETO OPTIMIZATION</span>
          <span className="text-[10px] font-mono text-slate-500">A* Cost Function</span>
        </label>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-[#38BDF8] font-bold">Safety ({Math.round(safetyWeight * 100)}%)</span>
            <span className="text-emerald-400 font-bold">Fuel ({Math.round(fuelWeight * 100)}%)</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={safetyWeight}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSafetyWeightChange(val);
              onFuelWeightChange(parseFloat((1.0 - val).toFixed(2)));
            }}
            className="w-full h-1.5 bg-[#14233D] rounded-lg appearance-none cursor-pointer accent-[#38BDF8]"
          />
        </div>
      </div>

      {/* 4. Temporal Simulation Date */}
      <div className="space-y-1.5 border-t border-[#17263E] pt-3">
        <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>SIMULATION CALENDAR DATE</span>
        </label>
        <input
          type="date"
          value={simulationDate}
          min="2018-01-01"
          max="2024-12-31"
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full bg-[#0D182A] border border-[#1E3355] rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-200 focus:outline-none focus:border-[#38BDF8]"
        />
      </div>

      {/* 5. Geospatial Layer Toggles */}
      <div className="space-y-2 border-t border-[#17263E] pt-3">
        <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>MAP OVERLAY FILTERS</span>
        </label>

        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => onToggleLayer("icebergs")}
            className={`px-2 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
              visibleLayers.icebergs
                ? "bg-[#291319] border-rose-500/60 text-rose-300"
                : "bg-[#0D182A] border-[#17263E] text-slate-500"
            }`}
          >
            <span>Iceberg Cones</span>
            {visibleLayers.icebergs && <CheckCircle2 className="w-3 h-3 text-rose-400" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("seaIce")}
            className={`px-2 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
              visibleLayers.seaIce
                ? "bg-[#0A223D] border-[#0284C7]/60 text-cyan-300"
                : "bg-[#0D182A] border-[#17263E] text-slate-500"
            }`}
          >
            <span>Risk Heatmap</span>
            {visibleLayers.seaIce && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("weather")}
            className={`px-2 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
              visibleLayers.weather
                ? "bg-[#181936] border-indigo-400/60 text-indigo-300"
                : "bg-[#0D182A] border-[#17263E] text-slate-500"
            }`}
          >
            <span>BAS Weather</span>
            {visibleLayers.weather && <CheckCircle2 className="w-3 h-3 text-indigo-400" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("stations")}
            className={`px-2 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
              visibleLayers.stations
                ? "bg-[#0B2545] border-[#38BDF8]/60 text-sky-300"
                : "bg-[#0D182A] border-[#17263E] text-slate-500"
            }`}
          >
            <span>Port Stations</span>
            {visibleLayers.stations && <CheckCircle2 className="w-3 h-3 text-sky-400" />}
          </button>
        </div>
      </div>

      {/* 6. Primary Action CTA */}
      <div className="mt-2 pt-2 border-t border-[#17263E]">
        <button
          onClick={onComputeRoute}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-mono font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Optimizing Corridor...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Compute Optimized Route</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
