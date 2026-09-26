"use client";

import React from "react";
import { RouteMetrics, VesselProfile, EsgLedger, RIOProfile } from "@/types";
import {
  Compass,
  Clock,
  Fuel,
  Download,
  Sliders,
  Sparkles,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Anchor,
  Radio,
  Mic,
} from "lucide-react";

interface TopHUDProps {
  recommendedMetrics: RouteMetrics | null;
  directMetrics: RouteMetrics | null;
  esgLedger?: EsgLedger | null;
  rioProfile?: RIOProfile | null;
  vesselProfile: VesselProfile | null;
  selectedStart: string;
  selectedDest: string;
  isSidebarCollapsed?: boolean;
  onOpenTradeoffs: () => void;
  onOpenXAI: () => void;
  onOpenExpedition?: () => void;
  onOpenCopilot?: () => void;
  onExportECDIS: () => void;
  onExportGPX: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  recommendedMetrics,
  directMetrics,
  esgLedger,
  rioProfile,
  vesselProfile,
  selectedStart,
  selectedDest,
  isSidebarCollapsed = false,
  onOpenTradeoffs,
  onOpenXAI,
  onOpenExpedition,
  onOpenCopilot,
  onExportECDIS,
  onExportGPX,
}) => {
  const distanceNm = recommendedMetrics?.distance_nm || 1420;
  const transitHours = recommendedMetrics?.eta_hours || 100.8;
  const transitDays = transitHours / 24;
  const fuelPct = esgLedger?.recommended_fuel_tons ?? (recommendedMetrics?.fuel_proxy_pct || 48.5);
  const baselineDist = directMetrics?.distance_nm || 1386;
  const detourNm = (distanceNm - baselineDist).toFixed(1);
  const fuelDiffPercent = esgLedger?.efficiency_gain_pct ?? (
    directMetrics
      ? Math.round(((directMetrics.fuel_proxy_pct - fuelPct) / directMetrics.fuel_proxy_pct) * 100)
      : 14
  );

  const minRio = rioProfile?.min_rio ?? 18;
  const isRioProhibited = rioProfile?.overall_status === "PROHIBITED_VIOLATION";
  const isRioElevated = rioProfile?.overall_status === "ELEVATED_RISK_AUTHORIZED";
  const rioStatusColor = isRioProhibited ? "#EF4444" : isRioElevated ? "#F59E0B" : "#10B981";
  const rioBadgeLabel = isRioProhibited ? "PROHIBITED" : isRioElevated ? "ELEVATED RISK" : "AUTHORIZED";

  return (
    <header
      className={`fixed top-4 right-4 z-30 transition-all duration-300 max-w-full ${
        isSidebarCollapsed ? "left-[104px]" : "left-[356px]"
      }`}
    >
      <div className="glacio-deck rounded-2xl px-3 py-1.5 flex items-center justify-between gap-2 border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* 1. Active Passage Title (Shrinks gracefully with truncate) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-xl glacio-button flex items-center justify-center text-[#00F0FF] shrink-0">
            <Compass className="w-3.5 h-3.5 text-[#00F0FF]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[11px] text-white tracking-wide font-mono flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-[#00F0FF] shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[130px]">{selectedStart.split("/")[0]}</span>
                <span className="text-slate-500">➔</span>
                <span className="truncate max-w-[90px] sm:max-w-[130px]">{selectedDest.split("/")[0]}</span>
              </span>
              <span className="text-[7.5px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 shrink-0">
                <CheckCircle2 className="w-2 h-2" />
                OPTIMAL
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 truncate text-[8.5px] font-mono">
              <span className="font-extrabold text-[#00FFA3] px-1 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                {vesselProfile?.polar_class?.split("/")[0]?.trim() || "PC-1"}
              </span>
              <span className="text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
                {vesselProfile?.name || "Polar Research Icebreaker"}
              </span>
              <span className="text-cyan-400 font-bold tabular-nums shrink-0 hidden sm:inline">
                {vesselProfile?.cruising_speed_knots ?? 17.5} kn
              </span>
            </div>
          </div>
        </div>

        {/* 2. Key Telemetry Metric Chips (Responsive visibility) */}
        <div className="flex items-center gap-1.5 font-mono shrink-0">
          {/* Distance (Visible on very wide screens only) */}
          <div className="glacio-card px-2 py-0.5 rounded-xl items-center gap-1 hidden 2xl:flex">
            <Compass className="w-3 h-3 text-[#00F0FF]" />
            <div>
              <div className="text-[7.5px] text-slate-400 font-bold leading-none">DIST</div>
              <div className="text-[10.5px] font-extrabold text-white tabular-nums">
                {distanceNm.toFixed(0)} NM <span className="text-[8.5px] text-amber-400 font-normal">({detourNm >= "0" ? `+${detourNm}` : detourNm})</span>
              </div>
            </div>
          </div>

          {/* Transit ETA */}
          <div className="glacio-card px-2 py-0.5 rounded-xl items-center gap-1 hidden sm:flex">
            <Clock className="w-3 h-3 text-cyan-400" />
            <div>
              <div className="text-[7.5px] text-slate-400 font-bold leading-none">ETA</div>
              <div className="text-[10.5px] font-extrabold text-white tabular-nums">
                {transitDays.toFixed(1)}d <span className="text-[8.5px] text-slate-400 font-normal">({(transitDays * 24).toFixed(0)}h)</span>
              </div>
            </div>
          </div>

          {/* Fuel Proxy */}
          <div className="glacio-card px-2 py-0.5 rounded-xl items-center gap-1 flex">
            <Fuel className="w-3 h-3 text-[#00FFA3]" />
            <div>
              <div className="text-[7.5px] text-slate-400 font-bold leading-none">FUEL</div>
              <div className="text-[10.5px] font-extrabold text-[#00FFA3] tabular-nums">
                {fuelPct.toFixed(1)} MT <span className="text-[8.5px] text-emerald-400 font-normal hidden md:inline">({fuelDiffPercent > 0 ? `-${fuelDiffPercent}%` : "0%"})</span>
              </div>
            </div>
          </div>

          {/* IMO POLARIS RIO Regulatory Badge */}
          <div
            onClick={onOpenTradeoffs}
            className="glacio-card px-2 py-0.5 rounded-xl items-center gap-1.5 cursor-pointer hover:border-cyan-500/50 transition-all flex"
            title="Inspect Official IMO POLARIS (MSC.1/Circ.1519) Regulatory Assessment"
          >
            <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: rioStatusColor }} />
            <div>
              <div className="text-[7.5px] text-slate-400 font-bold leading-none">IMO POLARIS</div>
              <div className="text-[10.5px] font-extrabold tabular-nums flex items-center gap-1">
                <span style={{ color: rioStatusColor }}>
                  RIO {minRio >= 0 ? `+${minRio}` : minRio}
                </span>
                <span
                  className="text-[7.5px] px-1 py-0.2 rounded font-bold uppercase hidden lg:inline"
                  style={{
                    backgroundColor: isRioProhibited ? "rgba(239,68,68,0.2)" : isRioElevated ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)",
                    color: rioStatusColor
                  }}
                >
                  {rioBadgeLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Action Toolbar (Tradeoffs, XAI, Dual ECDIS Export - Always full and non-clipped) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenTradeoffs}
            className="glacio-button px-2 py-1 rounded-xl text-[10.5px] font-mono font-semibold text-slate-200 hover:text-[#00F0FF] flex items-center gap-1 cursor-pointer"
            title="Inspect Analytical Tradeoff Matrix"
          >
            <Sliders className="w-3 h-3 text-[#00F0FF]" />
            <span className="hidden xs:inline">Tradeoffs</span>
          </button>

          <button
            onClick={onOpenXAI}
            className="glacio-button px-2 py-1 rounded-xl text-[10.5px] font-mono font-semibold text-slate-200 hover:text-[#00F0FF] flex items-center gap-1 cursor-pointer"
            title="Open Explainable AI Shapley Attribution"
          >
            <Sparkles className="w-3 h-3 text-[#00F0FF]" />
            <span>XAI</span>
          </button>

          {onOpenExpedition && (
            <button
              onClick={onOpenExpedition}
              className="glacio-button px-2 py-1 rounded-xl text-[10.5px] font-mono font-semibold text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer border border-amber-500/30 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              title="Multi-Waypoint Scientific Mission Sequencing (Expedition Logistics Planner)"
            >
              <Anchor className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">Expedition</span>
            </button>
          )}

          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="glacio-button px-2 py-1 rounded-xl text-[10.5px] font-mono font-semibold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer border border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse"
              title="Activate Voice-Assisted Bridge Officer AI (Polaris Copilot)"
            >
              <Mic className="w-3 h-3 text-cyan-400" />
              <span className="hidden xs:inline">Copilot</span>
            </button>
          )}

          {/* ECDIS Export Pill */}
          <div className="flex items-center gap-0.5 glacio-inset p-0.5 rounded-xl">
            <button
              onClick={onExportECDIS}
              className="px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-slate-300 hover:text-[#00F0FF] hover:bg-cyan-500/15 transition-all cursor-pointer flex items-center gap-0.5"
              title="Export IEC 61174 ECDIS GeoJSON"
            >
              <Download className="w-2.5 h-2.5 text-[#00F0FF]" />
              <span>ECDIS</span>
            </button>
            <button
              onClick={onExportGPX}
              className="px-1 py-0.5 rounded-lg text-[10px] font-mono font-bold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              title="Export GPX Track XML"
            >
              <span>GPX</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
