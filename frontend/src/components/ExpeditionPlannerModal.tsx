"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Ship,
  Compass,
  Anchor,
  Fuel,
  Calendar,
  Clock,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  MapPin,
  Navigation,
  FileDown,
  Layers,
  Sparkles,
  LifeBuoy,
  DollarSign,
  Flame,
  Activity,
} from "lucide-react";
import {
  MissionWaypoint,
  ExpeditionPlanRequest,
  ExpeditionPlan,
  ExpeditionPreset,
  Station,
  VesselProfile,
} from "@/types";
import { fetchExpeditionPresets, planExpedition } from "@/lib/api";

interface ExpeditionPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  vessels: VesselProfile[];
  currentPolarClass: string;
  onApplyExpeditionToMap: (plan: ExpeditionPlan) => void;
}

const DEFAULT_ACTIVITY_PRESETS = [
  { value: "PORT_DEPARTURE", label: "Port Departure", defaultDwell: 0 },
  { value: "STATION_SUPPLY", label: "Station Supply & Cargo Discharge", defaultDwell: 72 },
  { value: "CTD_MOORING_STATION", label: "Oceanographic CTD Cast / Mooring", defaultDwell: 18 },
  { value: "CREW_DISEMBARKATION", label: "Personnel Rotation / Handover", defaultDwell: 24 },
  { value: "PORT_ARRIVAL", label: "Port Arrival / Demobilization", defaultDwell: 0 },
];

export const ExpeditionPlannerModal: React.FC<ExpeditionPlannerModalProps> = ({
  isOpen,
  onClose,
  stations,
  vessels,
  currentPolarClass,
  onApplyExpeditionToMap,
}) => {
  const [presets, setPresets] = useState<ExpeditionPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ncpor-44th-iae");

  // Form State
  const [missionName, setMissionName] = useState<string>(
    "44th Indian Antarctic Expedition (Maitri & Bharati Relief)"
  );
  const [polarClass, setPolarClass] = useState<string>(currentPolarClass || "PC-5");
  const [departureDate, setDepartureDate] = useState<string>("2021-03-01T08:00:00Z");
  const [initialBunkerTons, setInitialBunkerTons] = useState<number>(1800);
  const [safetyWeight, setSafetyWeight] = useState<number>(0.7);
  const [fuelWeight, setFuelWeight] = useState<number>(0.3);

  const [waypoints, setWaypoints] = useState<MissionWaypoint[]>([
    {
      name: "Grytviken / South Georgia",
      lat: -54.2833,
      lon: -36.4833,
      dwell_time_hours: 0,
      activity_type: "PORT_DEPARTURE",
      notes: "Initial staging departure roadstead",
    },
    {
      name: "Maitri Station (India)",
      lat: -70.7667,
      lon: 11.7333,
      dwell_time_hours: 72,
      activity_type: "STATION_SUPPLY",
      notes: "Heavy cargo & aviation fuel discharge via ice shelf",
    },
    {
      name: "Mawson Station (Australia)",
      lat: -67.6033,
      lon: 62.8733,
      dwell_time_hours: 12,
      activity_type: "CTD_MOORING_STATION",
      notes: "Enderby Basin hydrographic CTD cast",
    },
    {
      name: "Bharati Station (India)",
      lat: -69.4075,
      lon: 76.1872,
      dwell_time_hours: 60,
      activity_type: "STATION_SUPPLY",
      notes: "Prydz Bay research handover and personnel changeover",
    },
  ]);

  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [planResult, setPlanResult] = useState<ExpeditionPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"legs" | "bunker" | "timeline">("legs");

  // Load Presets on Mount
  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await fetchExpeditionPresets();
        if (res?.presets?.length) {
          setPresets(res.presets);
        }
      } catch (err) {
        console.warn("Could not load expedition presets:", err);
      }
    }
    loadPresets();
  }, []);

  // When a preset is selected, populate fields
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = presets.find((item) => item.id === presetId);
    if (!p) return;
    setMissionName(p.title);
    setPolarClass(p.polar_class);
    setDepartureDate(p.departure_date);
    setInitialBunkerTons(p.initial_bunker_fuel_tons);
    setWaypoints(p.waypoints);
    setPlanResult(null);
    setErrorMessage(null);
  };

  // Waypoint operations
  const handleAddWaypoint = () => {
    const defaultStation = stations[0] || { name: "New Station", lat: -65.0, lon: -64.0 };
    setWaypoints([
      ...waypoints,
      {
        name: defaultStation.name,
        lat: defaultStation.lat,
        lon: defaultStation.lon,
        dwell_time_hours: 24,
        activity_type: "STATION_SUPPLY",
        notes: "Station resupply operations",
      },
    ]);
  };

  const handleRemoveWaypoint = (index: number) => {
    if (waypoints.length <= 2) {
      alert("An expedition must have at least 2 sequential waypoints.");
      return;
    }
    setWaypoints(waypoints.filter((_, idx) => idx !== index));
  };

  const handleMoveWaypoint = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= waypoints.length) return;
    const newWps = [...waypoints];
    const temp = newWps[index];
    newWps[index] = newWps[targetIdx];
    newWps[targetIdx] = temp;
    setWaypoints(newWps);
  };

  const handleUpdateWaypoint = (index: number, updates: Partial<MissionWaypoint>) => {
    setWaypoints(
      waypoints.map((wp, idx) => (idx === index ? { ...wp, ...updates } : wp))
    );
  };

  // Station dropdown selection handler
  const handleStationDropdown = (index: number, stationName: string) => {
    const st = stations.find((s) => s.name === stationName);
    if (st) {
      handleUpdateWaypoint(index, {
        name: st.name,
        lat: st.lat,
        lon: st.lon,
      });
    }
  };

  // Compute Expedition Plan
  const handleComputePlan = async () => {
    if (waypoints.length < 2) {
      setErrorMessage("Please configure at least 2 waypoints.");
      return;
    }

    setIsComputing(true);
    setErrorMessage(null);

    const payload: ExpeditionPlanRequest = {
      mission_name: missionName,
      polar_class: polarClass,
      departure_date_iso: departureDate,
      initial_bunker_fuel_tons: Number(initialBunkerTons),
      safety_weight: Number(safetyWeight),
      fuel_weight: Number(fuelWeight),
      waypoints,
    };

    try {
      const result = await planExpedition(payload);
      setPlanResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to compute expedition plan.");
    } finally {
      setIsComputing(false);
    }
  };

  // Export Expedition Plan as JSON ECDIS Voyage Plan
  const handleExportExpedition = () => {
    if (!planResult) return;
    const blob = new Blob([JSON.stringify(planResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NCPOR_EXPEDITION_${planResult.mission_name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-7xl h-[92vh] flex flex-col bg-[#070C18]/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(0,240,255,0.2)] overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-gradient-to-r from-[#0C1527] via-[#091122] to-[#0C1527] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.3)] text-cyan-400">
              <Anchor className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60">
                  NCPOR / MoES Strategic Suite
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  IMO Polar Code Compliant
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                Multi-Waypoint Scientific Mission Sequencing
                <span className="text-xs font-mono font-medium text-slate-400">
                  (Expedition Logistics Planner)
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {planResult && (
              <button
                id="btn-project-on-deck"
                onClick={() => onApplyExpeditionToMap(planResult)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Project on Deck</span>
              </button>
            )}

            {planResult && (
              <button
                onClick={handleExportExpedition}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono font-bold text-slate-200 transition-all"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Plan</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Header: Mission Presets Quick Bar */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/[0.05] flex items-center justify-between overflow-x-auto text-xs font-mono">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Official Expedition Presets:
            </span>
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-3 py-1 rounded-lg border transition-all text-xs ${
                  selectedPresetId === preset.id
                    ? "bg-cyan-500/20 border-cyan-400/80 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-bold"
                    : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.07]"
                }`}
              >
                {preset.title.split("(")[0].trim()}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4 text-slate-400 shrink-0">
            <span>
              Waypoints: <strong className="text-white">{waypoints.length}</strong>
            </span>
            <span>
              Polar Class: <strong className="text-[#00FFA3]">{polarClass}</strong>
            </span>
            <span>
              Bunker: <strong className="text-amber-400">{initialBunkerTons} T</strong>
            </span>
          </div>
        </div>

        {/* Main Content: Split Deck */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Mission Configuration & Waypoint Sequencer (5 cols) */}
          <div className="lg:col-span-5 p-5 border-r border-white/[0.08] overflow-y-auto space-y-5 bg-[#050A16]/50">
            {/* Mission Settings Card */}
            <div className="glacio-card p-4 rounded-2xl border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-400">
                  <Ship className="w-3.5 h-3.5" />
                  Mission Specification
                </span>
                <span className="text-[10px] text-slate-400">Voyage ID: EXP-2026-NCPOR</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400">Mission Title</label>
                  <input
                    type="text"
                    value={missionName}
                    onChange={(e) => setMissionName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400">Vessel Polar Class</label>
                    <select
                      value={polarClass}
                      onChange={(e) => setPolarClass(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="PC-1">PC-1 (Year-round Deep Polar)</option>
                      <option value="PC-2">PC-2 (Moderate Multi-Year)</option>
                      <option value="PC-4">PC-4 (Thick First-Year)</option>
                      <option value="PC-5">PC-5 (Medium First-Year)</option>
                      <option value="PC-7">PC-7 (Thin First-Year / Summer)</option>
                      <option value="OPEN_WATER">Open Water (Non-Ice)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Initial Bunker (Tons MGO)</span>
                      <span className="text-amber-400 font-bold">{initialBunkerTons} T</span>
                    </label>
                    <input
                      type="number"
                      min={300}
                      max={5000}
                      step={50}
                      value={initialBunkerTons}
                      onChange={(e) => setInitialBunkerTons(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400">Departure Timestamp (UTC)</label>
                    <input
                      type="text"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Optimization Weight</span>
                      <span className="text-cyan-400 font-bold">
                        {(safetyWeight * 100).toFixed(0)}% Safe / {(fuelWeight * 100).toFixed(0)}% Fuel
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      value={safetyWeight}
                      onChange={(e) => {
                        const s = parseFloat(e.target.value);
                        setSafetyWeight(s);
                        setFuelWeight(parseFloat((1.0 - s).toFixed(2)));
                      }}
                      className="w-full mt-2 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Waypoints Sequence List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Sequential Mission Waypoints ({waypoints.length})
                </span>
                <button
                  onClick={handleAddWaypoint}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Station</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {waypoints.map((wp, idx) => (
                  <div
                    key={idx}
                    className="glacio-card p-3 rounded-xl border border-white/[0.06] hover:border-cyan-500/30 transition-all space-y-2 group"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <select
                          value={stations.some((s) => s.name === wp.name) ? wp.name : "CUSTOM"}
                          onChange={(e) => {
                            if (e.target.value !== "CUSTOM") {
                              handleStationDropdown(idx, e.target.value);
                            }
                          }}
                          className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
                        >
                          {stations.map((s) => (
                            <option key={s.name} value={s.name} className="bg-[#0C1527] text-white">
                              {s.name}
                            </option>
                          ))}
                          <option value="CUSTOM" className="bg-[#0C1527] text-cyan-400">
                            (Custom Coordinate)
                          </option>
                        </select>
                      </div>

                      {/* Move & Delete controls */}
                      <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMoveWaypoint(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                          title="Move Waypoint Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveWaypoint(idx, "down")}
                          disabled={idx === waypoints.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                          title="Move Waypoint Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveWaypoint(idx)}
                          className="p-1 text-red-400 hover:text-red-300 ml-1"
                          title="Remove Waypoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Coordinates & Activity Selection */}
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-mono pt-1 border-t border-white/[0.04]">
                      <div className="col-span-5">
                        <label className="text-slate-400 block mb-0.5">Activity</label>
                        <select
                          value={wp.activity_type}
                          onChange={(e) => {
                            const act = e.target.value;
                            const preset = DEFAULT_ACTIVITY_PRESETS.find((p) => p.value === act);
                            handleUpdateWaypoint(idx, {
                              activity_type: act,
                              dwell_time_hours: preset ? preset.defaultDwell : wp.dwell_time_hours,
                            });
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-cyan-300 focus:outline-none"
                        >
                          {DEFAULT_ACTIVITY_PRESETS.map((act) => (
                            <option key={act.value} value={act.value} className="bg-[#0C1527] text-white">
                              {act.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4">
                        <label className="text-slate-400 block mb-0.5 flex items-center justify-between">
                          <span>Dwell Time</span>
                          <span className="text-amber-400 font-bold">{wp.dwell_time_hours}h</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={360}
                          value={wp.dwell_time_hours}
                          onChange={(e) =>
                            handleUpdateWaypoint(idx, {
                              dwell_time_hours: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-white focus:outline-none"
                        />
                      </div>

                      <div className="col-span-3 flex flex-col justify-end">
                        <span className="text-[9px] text-slate-400">
                          {wp.lat >= 0 ? `${wp.lat.toFixed(1)}°N` : `${Math.abs(wp.lat).toFixed(1)}°S`},{" "}
                          {wp.lon >= 0 ? `${wp.lon.toFixed(1)}°E` : `${Math.abs(wp.lon).toFixed(1)}°W`}
                        </span>
                      </div>
                    </div>

                    {/* Operational Notes */}
                    <div>
                      <input
                        type="text"
                        placeholder="Operational notes (e.g. Fuel discharge, hydrographic mooring)..."
                        value={wp.notes || ""}
                        onChange={(e) => handleUpdateWaypoint(idx, { notes: e.target.value })}
                        className="w-full px-2 py-1 rounded-lg bg-black/20 border border-white/[0.04] text-[9px] font-mono text-slate-400 focus:outline-none focus:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2">
              <button
                id="btn-compute-expedition"
                onClick={handleComputePlan}
                disabled={isComputing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-black tracking-wider uppercase shadow-[0_0_30px_rgba(0,240,255,0.4)] disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isComputing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-cyan-200" />
                    <span>Computing Multi-Leg Optimal Passage & Bunker Ledger...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4 text-cyan-300" />
                    <span>Compute Complete Expedition Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Computed Mission Operations & Logistics (7 cols) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#070D1C]/80">
            {planResult ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Executive Summary Metric Bar */}
                <div className="p-5 border-b border-white/[0.08] bg-black/30 shrink-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="glacio-card p-3 rounded-xl border border-white/[0.06]">
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-cyan-400" />
                        Total Distance
                      </div>
                      <div className="text-lg font-mono font-black text-white mt-1">
                        {planResult.summary.total_distance_nm.toLocaleString()} <span className="text-xs font-normal text-slate-400">NM</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        Across {planResult.total_legs} scientific legs
                      </div>
                    </div>

                    <div className="glacio-card p-3 rounded-xl border border-white/[0.06]">
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        Mission Duration
                      </div>
                      <div className="text-lg font-mono font-black text-white mt-1">
                        {planResult.summary.total_mission_days} <span className="text-xs font-normal text-slate-400">Days</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        {planResult.summary.total_transit_days}d transit + {planResult.summary.total_dwell_days}d dwell
                      </div>
                    </div>

                    <div className="glacio-card p-3 rounded-xl border border-white/[0.06]">
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-amber-400" />
                        Bunker Depleted
                      </div>
                      <div className="text-lg font-mono font-black text-amber-400 mt-1">
                        {planResult.summary.total_fuel_burned_tons} <span className="text-xs font-normal text-slate-400">Tons</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        ${planResult.summary.total_fuel_cost_usd.toLocaleString()} MGO
                      </div>
                    </div>

                    <div className="glacio-card p-3 rounded-xl border border-white/[0.06]">
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Remaining Bunker
                      </div>
                      <div className="text-lg font-mono font-black mt-1 flex items-baseline gap-1">
                        <span
                          className={
                            planResult.summary.bunker_status === "SAFE_RESERVE"
                              ? "text-[#00FFA3]"
                              : planResult.summary.bunker_status === "CAUTION_RESERVE"
                              ? "text-amber-400"
                              : "text-red-400"
                          }
                        >
                          {planResult.summary.remaining_bunker_pct}%
                        </span>
                        <span className="text-xs font-normal text-slate-400">
                          ({planResult.summary.remaining_bunker_tons} T)
                        </span>
                      </div>
                      <div className="text-[9px] font-mono mt-0.5">
                        {planResult.summary.bunker_status === "SAFE_RESERVE" ? (
                          <span className="text-[#00FFA3] font-bold">Safe Reserve (&gt;20%)</span>
                        ) : planResult.summary.bunker_status === "CAUTION_RESERVE" ? (
                          <span className="text-amber-400 font-bold">Caution (20-35%)</span>
                        ) : (
                          <span className="text-red-400 font-bold animate-pulse">Critical Fuel!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bunker Depletion Meter Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Dynamic Bunker Reserve Gauge</span>
                      <span className="text-slate-400">
                        Initial: <strong className="text-white">{planResult.summary.initial_bunker_tons} T</strong> | Emitted:{" "}
                        <strong className="text-slate-300">{planResult.summary.total_co2_tons} T CO₂</strong>
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden flex relative">
                      <div
                        style={{ width: `${planResult.summary.remaining_bunker_pct}%` }}
                        className={`h-full transition-all duration-500 ${
                          planResult.summary.bunker_status === "SAFE_RESERVE"
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : planResult.summary.bunker_status === "CAUTION_RESERVE"
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                            : "bg-gradient-to-r from-red-600 to-rose-400 animate-pulse"
                        }`}
                      />
                      {/* 20% Reserve Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-400/80 z-10"
                        style={{ left: "20%" }}
                        title="20% Mandatory Polar Reserve"
                      />
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center space-x-6 px-6 border-b border-white/[0.08] bg-black/20 text-xs font-mono shrink-0">
                  <button
                    onClick={() => setActiveTab("legs")}
                    className={`py-3 border-b-2 font-bold transition-all ${
                      activeTab === "legs"
                        ? "border-cyan-400 text-cyan-300"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Mission Legs & Passages ({planResult.legs.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("bunker")}
                    className={`py-3 border-b-2 font-bold transition-all ${
                      activeTab === "bunker"
                        ? "border-cyan-400 text-cyan-300"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Bunker Ledger & Safe Havens
                  </button>
                  <button
                    onClick={() => setActiveTab("timeline")}
                    className={`py-3 border-b-2 font-bold transition-all ${
                      activeTab === "timeline"
                        ? "border-cyan-400 text-cyan-300"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Chronological Mission Timeline
                  </button>
                </div>

                {/* Tab Content Panels */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Tab 1: Mission Legs */}
                  {activeTab === "legs" && (
                    <div className="space-y-3">
                      {planResult.legs.map((leg) => (
                        <div
                          key={leg.leg_number}
                          className="glacio-card p-4 rounded-2xl border border-white/[0.06] hover:border-cyan-500/40 transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-[10px] font-black">
                                Leg {leg.leg_number}
                              </span>
                              <h3 className="font-mono text-sm font-bold text-white">
                                {leg.leg_title}
                              </h3>
                            </div>

                            {/* RIO Operational Limit Badge */}
                            {leg.rio_profile && (
                              <div
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                  leg.rio_profile.overall_status === "FULLY_AUTHORIZED"
                                    ? "bg-emerald-950/80 border-emerald-500/60 text-[#00FFA3]"
                                    : leg.rio_profile.overall_status === "ELEVATED_RISK_AUTHORIZED"
                                    ? "bg-amber-950/80 border-amber-500/60 text-amber-300"
                                    : "bg-red-950/80 border-red-500/60 text-red-300"
                                }`}
                              >
                                {leg.rio_profile.compliance_badge} (Avg RIO: {leg.rio_profile.avg_rio.toFixed(1)})
                              </div>
                            )}
                          </div>

                          {/* Leg Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="text-slate-400 block">Transit Passage</span>
                              <span className="text-white font-bold text-xs">
                                {leg.transit_distance_nm} NM ({leg.transit_duration_hours.toFixed(1)}h)
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="text-slate-400 block">Station Dwell</span>
                              <span className="text-amber-400 font-bold text-xs">
                                {leg.dwell_time_hours} Hours
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="text-slate-400 block">Propulsion + Hotel Burn</span>
                              <span className="text-slate-200 font-bold text-xs">
                                {leg.transit_fuel_tons} T + {leg.hotel_fuel_tons} T
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                              <span className="text-slate-400 block">Total Leg Fuel</span>
                              <span className="text-cyan-300 font-bold text-xs">
                                {leg.total_leg_fuel_tons} Tons MGO
                              </span>
                            </div>
                          </div>

                          {/* Emergency Contingency Safe Haven for this leg */}
                          <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 flex items-center justify-between text-[10px] font-mono">
                            <div className="flex items-center space-x-2">
                              <LifeBuoy className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span className="text-slate-300">
                                Designated Abort Safe Haven:{" "}
                                <strong className="text-rose-300">
                                  {leg.contingency_safe_haven.name}
                                </strong>{" "}
                                ({leg.contingency_safe_haven.shelter_type})
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-slate-400 shrink-0">
                              <span>Escape Dist: <strong className="text-white">{leg.contingency_safe_haven.distance_nm} NM</strong></span>
                              <span>Est. Transit: <strong className="text-amber-300">{leg.contingency_safe_haven.estimated_escape_hours}h</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Bunker Ledger & Safe Havens */}
                  {activeTab === "bunker" && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="glacio-card p-4 rounded-2xl border border-white/[0.06] space-y-3">
                        <h4 className="font-bold text-cyan-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
                          <Fuel className="w-4 h-4 text-cyan-400" />
                          Comprehensive Bunker Depletion Ledger
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-white/[0.08] text-slate-400 text-[10px]">
                                <th className="py-2">Leg / Sector</th>
                                <th className="py-2">Distance</th>
                                <th className="py-2">Transit Burn</th>
                                <th className="py-2">Roadstead Hotel Burn</th>
                                <th className="py-2">Total Sector</th>
                                <th className="py-2">Safe Haven Abort</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                              {planResult.legs.map((leg) => (
                                <tr key={leg.leg_number} className="hover:bg-white/[0.02]">
                                  <td className="py-2.5 font-bold text-white">
                                    Leg {leg.leg_number}: {leg.destination.name.split("/")[0]}
                                  </td>
                                  <td className="py-2.5 text-slate-300">{leg.transit_distance_nm} NM</td>
                                  <td className="py-2.5 text-slate-300">{leg.transit_fuel_tons} T</td>
                                  <td className="py-2.5 text-amber-300">{leg.hotel_fuel_tons} T ({leg.dwell_time_hours}h)</td>
                                  <td className="py-2.5 text-cyan-300 font-bold">{leg.total_leg_fuel_tons} T</td>
                                  <td className="py-2.5 text-rose-300">{leg.contingency_safe_haven.name.split("/")[0]} ({leg.contingency_safe_haven.distance_nm} NM)</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Strategic Recommendations */}
                      <div className="glacio-card p-4 rounded-2xl border border-white/[0.06] space-y-2 text-[11px] text-slate-300">
                        <div className="font-bold text-[#00FFA3] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Logistics Feasibility Clearance
                        </div>
                        <p>
                          Total fuel required is{" "}
                          <strong className="text-white">{planResult.summary.total_fuel_burned_tons} Tons</strong>{" "}
                          out of{" "}
                          <strong className="text-white">{planResult.summary.initial_bunker_tons} Tons</strong>{" "}
                          bunker capacity, leaving a reserve margin of{" "}
                          <strong className="text-cyan-300">
                            {planResult.summary.remaining_bunker_pct}% ({planResult.summary.remaining_bunker_tons} Tons)
                          </strong>.
                        </p>
                        <p className="text-slate-400">
                          Auxiliary hotel load during station cargo discharges accounts for{" "}
                          <strong className="text-amber-300">
                            {planResult.legs.reduce((acc, l) => acc + l.hotel_fuel_tons, 0).toFixed(1)} Tons
                          </strong>{" "}
                          across {planResult.summary.total_dwell_days} days of roadstead station dwelling.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Chronological Timeline */}
                  {activeTab === "timeline" && (
                    <div className="space-y-3 font-mono">
                      {planResult.timeline.map((evt, idx) => (
                        <div
                          key={idx}
                          className="glacio-card p-3 rounded-xl border border-white/[0.06] flex items-start space-x-3 text-xs"
                        >
                          <div className="mt-0.5">
                            {evt.event_type === "EXPEDITION_DEPARTURE" ? (
                              <div className="w-5 h-5 rounded-full bg-cyan-900 border border-cyan-400 flex items-center justify-center text-cyan-300">
                                <Ship className="w-3 h-3" />
                              </div>
                            ) : evt.event_type === "WAYPOINT_ARRIVAL" ? (
                              <div className="w-5 h-5 rounded-full bg-indigo-900 border border-indigo-400 flex items-center justify-center text-indigo-300">
                                <Anchor className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-amber-900 border border-amber-400 flex items-center justify-center text-amber-300">
                                <Clock className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">
                                {evt.event_type.replace(/_/g, " ")}: {evt.waypoint_name}
                              </span>
                              <span className="text-[10px] text-cyan-400">
                                {new Date(evt.timestamp_iso).toUTCString().slice(0, 22)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{evt.notes}</p>
                            <div className="flex items-center space-x-4 text-[10px] text-slate-400 pt-0.5">
                              <span>
                                Remaining Bunker:{" "}
                                <strong className="text-amber-400">{evt.remaining_fuel_tons} T</strong> ({evt.remaining_fuel_pct}%)
                              </span>
                              {evt.dwell_hours ? (
                                <span>
                                  Dwell Burn:{" "}
                                  <strong className="text-slate-300">{evt.hotel_fuel_burned_tons} T</strong>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state before computing */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
                  <Compass className="w-8 h-8 animate-pulse" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h3 className="text-base font-bold text-white font-mono">
                    Ready to Sequence Scientific Expedition
                  </h3>
                  <p className="text-xs font-mono text-slate-400 leading-relaxed">
                    Select a mission preset (like the <strong>44th Indian Antarctic Expedition</strong>) or configure custom research stations, cargo discharge dwell times, and bunker capacity.
                  </p>
                </div>
                <button
                  onClick={handleComputePlan}
                  disabled={isComputing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                >
                  Compute 44th IAE Mission Plan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
