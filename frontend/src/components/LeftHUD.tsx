"use client";

import React, { useState } from "react";
import { VesselProfile } from "@/types";
import { Ship, Sliders, Layers, Calendar, Play, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const currentVessel =
    vessels.find((v) => v.polar_class.includes(selectedPolarClass)) || vessels[0];

  return (
    <div className="w-full glass-panel rounded-2xl p-4 flex flex-col gap-4 select-none text-slate-200 transition-all duration-300">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[#00E5FF]">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Voyage Parameters
            </h2>
            <div className="text-[10px] text-slate-400 font-mono">A* Monotonic Corridor</div>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="lg:hidden p-1 rounded-lg bg-[#111C30] text-slate-400 hover:text-white"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 1. Origin & Destination Waypoints */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-mono font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00E5FF]"></span>
                  <span>DEPARTURE PORT / STATION</span>
                </span>
                <span className="text-[10px] text-[#00E5FF] font-bold">ORIGIN</span>
              </label>
              <div className="relative">
                <select
                  value={selectedStart}
                  onChange={(e) => onSelectStart(e.target.value)}
                  className="w-full bg-[#0A101D] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/30 cursor-pointer"
                >
                  {stations.map((s) => (
                    <option key={s.name} value={s.name} className="bg-[#0D1524]">
                      {s.name} ({Math.abs(s.lat).toFixed(1)}°S, {Math.abs(s.lon).toFixed(1)}°W)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>DESTINATION PORT / STATION</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">DEST</span>
              </label>
              <div className="relative">
                <select
                  value={selectedDest}
                  onChange={(e) => onSelectDest(e.target.value)}
                  className="w-full bg-[#0A101D] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/30 cursor-pointer"
                >
                  {stations.map((s) => (
                    <option key={s.name} value={s.name} className="bg-[#0D1524]">
                      {s.name} ({Math.abs(s.lat).toFixed(1)}°S, {Math.abs(s.lon).toFixed(1)}°W)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Vessel Polar Class Selection */}
          <div className="space-y-2.5 border-t border-white/[0.08] pt-3">
            <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>IACS POLAR CLASS HULL</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">IMO Category A</span>
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
                    className={`p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400/60 text-white shadow-glow-cyan"
                        : "bg-[#0A101D] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]"
                    }`}
                  >
                    <div className="text-[11px] font-mono font-bold">{item.label}</div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">{item.sub}</div>
                  </button>
                );
              })}
            </div>

            {currentVessel && (
              <div className="bg-[#0A101D] rounded-xl p-2.5 border border-white/[0.08] text-[10px] font-mono text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-200 truncate flex items-center justify-between">
                  <span>{currentVessel.name}</span>
                  <span className="text-emerald-400 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Active Hull
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-slate-400 pt-1 border-t border-white/[0.04]">
                  <div>
                    <span className="text-slate-500 block text-[9px]">MAX ICE</span>
                    <span className="font-bold text-slate-200">{(currentVessel.max_safe_ice_conc * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">HULL DRAG</span>
                    <span className="font-bold text-slate-200">{currentVessel.hull_resistance_coeff}x</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">BUNKER RATE</span>
                    <span className="font-bold text-slate-200">{currentVessel.base_fuel_rate_tons_day} T/d</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Pareto Multi-Objective Optimization Slider */}
          <div className="space-y-2 border-t border-white/[0.08] pt-3">
            <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
              <span>PARETO TRADE-OFF BIAS</span>
              <span className="text-[10px] font-mono text-slate-500">Multi-Objective A*</span>
            </label>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#00E5FF] font-bold">Safety Bias ({Math.round(safetyWeight * 100)}%)</span>
                <span className="text-emerald-400 font-bold">Fuel Bias ({Math.round(fuelWeight * 100)}%)</span>
              </div>
              <div className="relative py-1">
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
                  className="w-full h-2 bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>Maximum Hazard Avoidance</span>
                <span>Minimum Bunker Burn</span>
              </div>
            </div>
          </div>

          {/* 4. Temporal Simulation Date */}
          <div className="space-y-1.5 border-t border-white/[0.08] pt-3">
            <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>OBSERVATION TIMELINE</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">ASCAT/NIC Baseline</span>
            </label>
            <input
              type="date"
              value={simulationDate}
              min="2018-01-01"
              max="2024-12-31"
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full bg-[#0A101D] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-200 focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          {/* 5. Geospatial Layer Toggles */}
          <div className="space-y-2 border-t border-white/[0.08] pt-3">
            <label className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>MAP OVERLAY FILTERS</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">4 Active Sources</span>
            </label>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => onToggleLayer("icebergs")}
                className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  visibleLayers.icebergs
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                    : "bg-[#0A101D] border-white/[0.06] text-slate-500"
                }`}
              >
                <span>Iceberg Cones</span>
                {visibleLayers.icebergs && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
              </button>

              <button
                type="button"
                onClick={() => onToggleLayer("seaIce")}
                className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  visibleLayers.seaIce
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                    : "bg-[#0A101D] border-white/[0.06] text-slate-500"
                }`}
              >
                <span>Risk Heatmap</span>
                {visibleLayers.seaIce && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => onToggleLayer("weather")}
                className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  visibleLayers.weather
                    ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                    : "bg-[#0A101D] border-white/[0.06] text-slate-500"
                }`}
              >
                <span>BAS Weather</span>
                {visibleLayers.weather && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => onToggleLayer("stations")}
                className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                  visibleLayers.stations
                    ? "bg-sky-500/10 border-sky-500/40 text-sky-300"
                    : "bg-[#0A101D] border-white/[0.06] text-slate-500"
                }`}
              >
                <span>Port Stations</span>
                {visibleLayers.stations && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
              </button>
            </div>
          </div>

          {/* 6. Primary Action CTA */}
          <div className="pt-2">
            <button
              onClick={onComputeRoute}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00E5FF] hover:brightness-110 active:scale-[0.99] text-slate-950 font-mono font-extrabold text-xs tracking-wider uppercase transition-all shadow-glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  <span>Computing Optimal Route...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Compute Optimal Corridor</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
