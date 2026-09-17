import React from "react";
import { VesselProfile } from "@/types";
import { Ship, Sliders, Layers, Calendar, Play, CheckCircle2 } from "lucide-react";

interface RouteConfigRailProps {
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

export const RouteConfigRail: React.FC<RouteConfigRailProps> = ({
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
  const currentVessel = vessels.find((v) => v.polar_class.includes(selectedPolarClass)) || vessels[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-5 flex flex-col gap-5 select-none h-full">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Voyage Parameters</h2>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
          A* Monotonic
        </span>
      </div>

      {/* 1. Origin & Destination */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Departure Station / Port</span>
            <span className="text-[10px] text-sky-600 font-mono">ORIGIN</span>
          </label>
          <select
            value={selectedStart}
            onChange={(e) => onSelectStart(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
          >
            {stations.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.lat.toFixed(2)}°S, {s.lon.toFixed(2)}°W)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Destination Station / Port</span>
            <span className="text-[10px] text-emerald-600 font-mono">DEST</span>
          </label>
          <select
            value={selectedDest}
            onChange={(e) => onSelectDest(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
          >
            {stations.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.lat.toFixed(2)}°S, {s.lon.toFixed(2)}°W)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Vessel Polar Class Selection */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Ship className="w-3.5 h-3.5 text-sky-600" />
          <span>IACS Polar Class Profile</span>
        </label>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "PC-5", label: "PC-5 Research", sub: "14.0 kts" },
            { id: "PC-2", label: "PC-2 Breaker", sub: "16.5 kts" },
            { id: "Non-Ice", label: "Commercial", sub: "12.0 kts" },
          ].map((item) => {
            const isSelected = selectedPolarClass.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPolarClass(item.id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "bg-sky-50/80 border-sky-500 text-sky-900 shadow-sm"
                    : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.sub}</div>
              </button>
            );
          })}
        </div>

        {/* Vessel Spec Badge */}
        {currentVessel && (
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">{currentVessel.name}</div>
            <div className="flex justify-between text-slate-500 font-mono text-[10px]">
              <span>Max Ice: {(currentVessel.max_safe_ice_conc * 100).toFixed(0)}%</span>
              <span>Hull Drag K={currentVessel.hull_resistance_coeff}</span>
              <span>Fuel: {currentVessel.base_fuel_rate_tons_day} T/d</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Objective Weighting Sliders */}
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>Multi-Objective Optimization</span>
          <span className="text-[10px] font-mono text-slate-400">Haversine A*</span>
        </label>

        {/* Safety vs Distance slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-600">Navigational Safety ({Math.round(safetyWeight * 100)}%)</span>
            <span className="text-slate-600">Fuel Conservation ({Math.round(fuelWeight * 100)}%)</span>
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
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
        </div>
      </div>

      {/* 4. Temporal Climatology / Simulation Date */}
      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sky-600" />
          <span>Operational Simulation Date</span>
        </label>
        <input
          type="date"
          value={simulationDate}
          min="2018-01-01"
          max="2024-12-31"
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
        />
      </div>

      {/* 5. Geospatial Layer Toggles */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>Active Geospatial Overlays</span>
        </label>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => onToggleLayer("icebergs")}
            className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
              visibleLayers.icebergs
                ? "bg-rose-50 border-rose-300 text-rose-800 font-medium"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            <span>Iceberg Vectors</span>
            {visibleLayers.icebergs && <CheckCircle2 className="w-3 h-3 text-rose-600" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("seaIce")}
            className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
              visibleLayers.seaIce
                ? "bg-cyan-50 border-cyan-300 text-cyan-800 font-medium"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            <span>Sea Ice Field</span>
            {visibleLayers.seaIce && <CheckCircle2 className="w-3 h-3 text-cyan-600" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("weather")}
            className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
              visibleLayers.weather
                ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-medium"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            <span>BAS Weather</span>
            {visibleLayers.weather && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("stations")}
            className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
              visibleLayers.stations
                ? "bg-sky-50 border-sky-300 text-sky-800 font-medium"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            <span>Port Stations</span>
            {visibleLayers.stations && <CheckCircle2 className="w-3 h-3 text-sky-600" />}
          </button>
        </div>
      </div>

      {/* 6. Primary Action Button */}
      <div className="mt-auto pt-3">
        <button
          onClick={onComputeRoute}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
