"use client";

import React, { useState } from "react";
import {
  Compass,
  Navigation,
  ShieldCheck,
  Fuel,
  Layers,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Ship,
  ArrowRightLeft,
  Activity,
  Sliders,
  Calendar,
} from "lucide-react";
import { Station, VesselProfile } from "@/types";

interface SidebarProps {
  stations: Station[];
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
  isBackendHealthy: boolean;
  isSurgeActive: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectStart: (name: string) => void;
  onSelectDest: (name: string) => void;
  onSelectPolarClass: (pc: string) => void;
  onSafetyWeightChange: (val: number) => void;
  onFuelWeightChange: (val: number) => void;
  onDateChange: (date: string) => void;
  onToggleLayer: (layer: "icebergs" | "weather" | "seaIce" | "stations") => void;
  onComputeRoute: () => void;
  onTriggerSurgeDemo: () => void;
  onOpenTradeoffs: () => void;
  onOpenXAI: () => void;
}

const POLAR_CLASSES = [
  { id: "PC1", label: "PC1", title: "Year-round Polar Pack Ice" },
  { id: "PC2", label: "PC2", title: "Moderate Multi-Year Ice (Golovnin)" },
  { id: "PC4", label: "PC4", title: "Thick First-Year Ice" },
  { id: "PC7", label: "PC7", title: "Thin First-Year Ice (Summer)" },
  { id: "OPEN_WATER", label: "OW", title: "Open Water Non-Ice" },
];

export const Sidebar: React.FC<SidebarProps> = ({
  stations,
  selectedStart,
  selectedDest,
  selectedPolarClass,
  safetyWeight,
  fuelWeight,
  simulationDate,
  visibleLayers,
  isLoading,
  isBackendHealthy,
  isSurgeActive,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  onSelectStart,
  onSelectDest,
  onSelectPolarClass,
  onSafetyWeightChange,
  onFuelWeightChange,
  onDateChange,
  onToggleLayer,
  onComputeRoute,
  onTriggerSurgeDemo,
  onOpenTradeoffs,
  onOpenXAI,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const handleSwapStations = () => {
    const temp = selectedStart;
    onSelectStart(selectedDest);
    onSelectDest(temp);
  };

  return (
    <aside
      className={`fixed top-4 left-4 bottom-4 z-40 transition-all duration-300 ease-in-out select-none flex flex-col ${
        isCollapsed ? "w-[68px]" : "w-[320px]"
      }`}
    >
      <div className="h-full w-full glacio-deck rounded-3xl p-3.5 flex flex-col justify-between overflow-hidden shadow-2xl relative border border-white/[0.08]">
        {/* Collapse Toggle Button for Expanded State */}
        {!isCollapsed && (
          <button
            onClick={handleToggle}
            className="absolute top-3.5 right-3 p-1.5 rounded-xl glacio-button text-slate-400 hover:text-[#00F0FF] transition-all cursor-pointer z-50"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {isCollapsed ? (
          /* COLLAPSED ICON RAIL */
          <div className="flex flex-col items-center justify-between h-full py-2">
            <div className="flex flex-col items-center gap-4">
              {/* Expand Toggle Button as Clean Top Header Action */}
              <button
                onClick={handleToggle}
                className="w-10 h-10 rounded-2xl glacio-button flex items-center justify-center text-[#00F0FF] hover:border-[#00F0FF] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-5 h-5 text-[#00F0FF]" />
              </button>

              {/* Brand Logo Compass Icon */}
              <div className="w-9 h-9 rounded-2xl glacio-inset flex items-center justify-center text-cyan-400">
                <Compass className="w-4 h-4 animate-spin-slow" />
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={onComputeRoute}
                  disabled={isLoading}
                  className="w-10 h-10 rounded-2xl glacio-button-primary flex items-center justify-center cursor-pointer shadow-lg"
                  title="Compute ML Route"
                >
                  <Navigation className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenTradeoffs}
                  className="w-10 h-10 rounded-2xl glacio-button flex items-center justify-center text-slate-300 hover:text-[#00F0FF] cursor-pointer"
                  title="Open Analytical Tradeoffs"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenXAI}
                  className="w-10 h-10 rounded-2xl glacio-button flex items-center justify-center text-slate-300 hover:text-[#00F0FF] cursor-pointer"
                  title="Open XAI Attribution"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  onClick={onTriggerSurgeDemo}
                  className={`w-10 h-10 rounded-2xl glacio-button flex items-center justify-center cursor-pointer ${
                    isSurgeActive ? "text-amber-400 border-amber-400/50" : "text-slate-400 hover:text-amber-400"
                  }`}
                  title="Emergency Surge Simulation"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Health status dot */}
            <div
              className={`w-3 h-3 rounded-full ${
                isBackendHealthy ? "bg-emerald-400 shadow-[0_0_8px_#10B981]" : "bg-rose-500 shadow-[0_0_8px_#F43F5E]"
              }`}
              title={isBackendHealthy ? "Backend Connected (FastAPI)" : "Backend Offline"}
            />
          </div>
        ) : (
          /* EXPANDED FULL CONTROL DECK */
          <div className="flex flex-col h-full overflow-hidden">
            {/* 1. Header & Brand Crest */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 pt-0.5 shrink-0">
              <div className="w-9 h-9 rounded-xl glacio-button flex items-center justify-center relative">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z"
                    fill="url(#brandGrad)"
                    stroke="#00F0FF"
                    strokeWidth="1.2"
                  />
                  <defs>
                    <linearGradient id="brandGrad" x1="2" y1="2" x2="22" y2="22">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#0055FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#060911] ${
                    isBackendHealthy ? "bg-emerald-400" : "bg-rose-500"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs tracking-wider text-white">POLARIS-X</span>
                  <span className="text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30">
                    MoES · NCPOR
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 font-mono tracking-tight">Antarctic Autonomous Cockpit</p>
              </div>
            </div>

            {/* 2. Scrollable Configuration Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 my-1.5 pb-2">
              {/* Voyage Waypoints Config */}
              <div className="glacio-card rounded-2xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-[#00F0FF]" />
                    Voyage Corridor
                  </span>
                  <button
                    onClick={handleSwapStations}
                    className="p-1 rounded-lg glacio-button text-slate-400 hover:text-[#00F0FF] transition-all cursor-pointer"
                    title="Swap Departure & Destination"
                  >
                    <ArrowRightLeft className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 font-mono block mb-0.5">
                      Departure
                    </label>
                    <select
                      value={selectedStart}
                      onChange={(e) => onSelectStart(e.target.value)}
                      className="w-full glacio-inset rounded-xl px-2 py-1 text-[10.5px] text-slate-200 font-mono focus:outline-none cursor-pointer"
                    >
                      {stations.map((st) => (
                        <option key={st.name} value={st.name} className="bg-[#0A111E] text-slate-200">
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 font-mono block mb-0.5">
                      Destination
                    </label>
                    <select
                      value={selectedDest}
                      onChange={(e) => onSelectDest(e.target.value)}
                      className="w-full glacio-inset rounded-xl px-2 py-1 text-[10.5px] text-slate-200 font-mono focus:outline-none cursor-pointer"
                    >
                      {stations.map((st) => (
                        <option key={st.name} value={st.name} className="bg-[#0A111E] text-slate-200">
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Polar Vessel Class Selector */}
              <div className="glacio-card rounded-2xl p-2 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <Ship className="w-3 h-3 text-[#00FFA3]" />
                  Polar Vessel Class
                </span>

                <div className="grid grid-cols-5 gap-1">
                  {POLAR_CLASSES.map((pc) => {
                    const isSelected = selectedPolarClass === pc.id;
                    return (
                      <button
                        key={pc.id}
                        onClick={() => onSelectPolarClass(pc.id)}
                        className={`py-0.5 rounded-lg text-center font-mono font-bold text-[10px] transition-all cursor-pointer ${
                          isSelected
                            ? "glacio-button border-[#00FFA3] text-[#00FFA3] shadow-[0_0_8px_rgba(0,255,163,0.3)]"
                            : "glacio-button text-slate-400 hover:text-slate-200"
                        }`}
                        title={pc.title}
                      >
                        {pc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Objective Weighting Slider */}
              <div className="glacio-card rounded-2xl p-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                  <span className="text-[#00F0FF] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Safety: {Math.round(safetyWeight * 100)}%
                  </span>
                  <span className="text-[#00FFA3] flex items-center gap-1">
                    <Fuel className="w-3 h-3" />
                    Fuel: {Math.round(fuelWeight * 100)}%
                  </span>
                </div>

                <div className="glacio-inset rounded-xl p-1">
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={safetyWeight}
                    onChange={(e) => {
                      const s = parseFloat(e.target.value);
                      onSafetyWeightChange(s);
                      onFuelWeightChange(parseFloat((1 - s).toFixed(2)));
                    }}
                    className="w-full cursor-pointer h-1.5 bg-slate-800 rounded-lg accent-[#00F0FF]"
                  />
                </div>
              </div>

              {/* Date & Met-Ocean Simulation Epoch */}
              <div className="glacio-card rounded-2xl p-2 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  Simulation Date
                </span>
                <input
                  type="date"
                  value={simulationDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full glacio-inset rounded-xl px-2 py-1 text-[10.5px] text-slate-200 font-mono focus:outline-none cursor-pointer"
                />
              </div>

              {/* GIS Layer Matrix Toggles */}
              <div className="glacio-card rounded-2xl p-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Map Layers
                </span>

                <div className="grid grid-cols-2 gap-1">
                  {[
                    { key: "icebergs", label: "Icebergs", active: visibleLayers.icebergs, color: "text-[#FF2E63]" },
                    { key: "seaIce", label: "Sea Ice", active: visibleLayers.seaIce, color: "text-[#00F0FF]" },
                    { key: "weather", label: "BAS Sensors", active: visibleLayers.weather, color: "text-[#38BDF8]" },
                    { key: "stations", label: "Bases", active: visibleLayers.stations, color: "text-[#00FFA3]" },
                  ].map((l) => (
                    <button
                      key={l.key}
                      onClick={() => onToggleLayer(l.key as "icebergs" | "weather" | "seaIce" | "stations")}
                      className={`px-1.5 py-0.5 rounded-lg font-mono text-[9.5px] font-semibold flex items-center justify-between cursor-pointer transition-all ${
                        l.active ? "glacio-button border-cyan-400/40 text-slate-200" : "glacio-inset text-slate-500"
                      }`}
                    >
                      <span>{l.label}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${l.active ? l.color + " bg-current shadow-sm" : "bg-slate-700"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Sticky Action CTA Footer */}
            <div className="pt-2 border-t border-white/[0.08] space-y-1.5 shrink-0">
              <button
                onClick={onComputeRoute}
                disabled={isLoading}
                className="w-full glacio-button-primary py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-[11.5px] font-bold shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Activity className="w-3 h-3 animate-spin" />
                    <span>Computing Safe Route...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" />
                    <span>Compute ML Safe Route</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={onOpenTradeoffs}
                  className="glacio-button py-1 rounded-xl text-[10.5px] font-mono font-semibold text-slate-200 hover:text-[#00F0FF] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-2.5 h-2.5" />
                  <span>Tradeoffs</span>
                </button>
                <button
                  onClick={onOpenXAI}
                  className="glacio-button py-1 rounded-xl text-[10.5px] font-mono font-semibold text-slate-200 hover:text-[#00F0FF] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>XAI Engine</span>
                </button>
              </div>

              <button
                onClick={onTriggerSurgeDemo}
                className={`w-full py-1 rounded-xl font-mono text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  isSurgeActive
                    ? "glacio-button border-[#FFB800] text-[#FFB800] shadow-[0_0_12px_rgba(255,184,0,0.3)] animate-pulse"
                    : "glacio-button text-slate-300 hover:text-[#FFB800]"
                }`}
              >
                <AlertTriangle className="w-2.5 h-2.5 text-[#FFB800]" />
                <span>{isSurgeActive ? "Surge Active" : "Emergency Surge Demo"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
