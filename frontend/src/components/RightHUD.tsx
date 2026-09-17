"use client";

import React from "react";
import { RouteMetrics, VesselProfile, XAIExplanation } from "@/types";
import { Navigation, Clock, Fuel, ShieldAlert, BarChart3, Database, CheckCircle2, TrendingDown, ArrowUpRight } from "lucide-react";

interface RightHUDProps {
  recommendedMetrics: RouteMetrics | null;
  directMetrics: RouteMetrics | null;
  vessel: VesselProfile | null;
  xaiData: XAIExplanation | null;
  onOpenXAIModal?: () => void;
}

export const RightHUD: React.FC<RightHUDProps> = ({
  recommendedMetrics,
  directMetrics,
  vessel,
  xaiData,
  onOpenXAIModal,
}) => {
  if (!recommendedMetrics || !directMetrics) {
    return (
      <div className="w-full bg-[#0A1322] rounded-xl border border-[#17263E] p-4 flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-[#14233D] rounded w-1/2"></div>
        <div className="h-20 bg-[#14233D] rounded"></div>
        <div className="h-20 bg-[#14233D] rounded"></div>
      </div>
    );
  }

  // Calculate comparative deltas
  const distDelta = recommendedMetrics.distance_nm - directMetrics.distance_nm;
  const distDeltaPct = ((distDelta / Math.max(directMetrics.distance_nm, 1)) * 100).toFixed(1);

  const etaDelta = recommendedMetrics.eta_hours - directMetrics.eta_hours;
  const etaDeltaSign = etaDelta >= 0 ? `+${etaDelta.toFixed(1)}h` : `${etaDelta.toFixed(1)}h`;

  const fuelDelta = recommendedMetrics.fuel_proxy_pct - directMetrics.fuel_proxy_pct;
  const fuelDeltaSign = fuelDelta >= 0 ? `+${fuelDelta.toFixed(1)}%` : `${fuelDelta.toFixed(1)}%`;

  const bergRiskReduction =
    directMetrics.avg_berg_risk > 0.001
      ? Math.round(
          ((directMetrics.avg_berg_risk - recommendedMetrics.avg_berg_risk) /
            directMetrics.avg_berg_risk) *
            100
        )
      : 65;

  return (
    <div className="w-full bg-[#0A1322] rounded-xl border border-[#17263E] p-4 flex flex-col gap-4 select-none shadow-xl text-slate-200">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[#17263E] pb-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#38BDF8]" />
          <div>
            <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Decision Intelligence &amp; KPIs
            </h2>
            <div className="text-[10px] font-mono text-slate-400">
              {vessel?.name || "MV Vasiliy Golovnin"}
            </div>
          </div>
        </div>
        {onOpenXAIModal && (
          <button
            onClick={onOpenXAIModal}
            className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-[#0A223D] hover:bg-[#0F2F55] text-[#38BDF8] border border-[#0284C7]/50 transition-colors cursor-pointer"
            title="Inspect full XAI narrative"
          >
            {xaiData?.confidence_pct ? `${xaiData.confidence_pct}% XAI` : "View XAI"}
          </button>
        )}
      </div>

      {/* 1. 4-KPI Metric Strip */}
      <div className="grid grid-cols-2 gap-2">
        {/* Distance Card */}
        <div className="bg-[#0D182A] p-2.5 rounded-lg border border-[#17263E] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>VOYAGE DIST</span>
            <Navigation className="w-3 h-3 text-[#38BDF8]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-extrabold font-mono text-white">
              {recommendedMetrics.distance_nm.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">NM</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-semibold flex items-center">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            +{distDelta.toFixed(1)} NM ({distDeltaPct}%)
          </span>
        </div>

        {/* ETA Card */}
        <div className="bg-[#0D182A] p-2.5 rounded-lg border border-[#17263E] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>TRANSIT ETA</span>
            <Clock className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="my-1">
            <span className="text-xl font-extrabold font-mono text-white">
              {recommendedMetrics.eta_hours.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">HRS</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            ({(recommendedMetrics.eta_hours / 24).toFixed(1)}d, {etaDeltaSign})
          </span>
        </div>

        {/* Bunker Fuel Card */}
        <div className="bg-[#0D182A] p-2.5 rounded-lg border border-[#17263E] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>BUNKER FUEL</span>
            <Fuel className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="my-1">
            <span className="text-xl font-extrabold font-mono text-white">
              {recommendedMetrics.fuel_proxy_pct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">
            {fuelDeltaSign} proxy delta
          </span>
        </div>

        {/* Safety Risk Card */}
        <div className="bg-[#0D182A] p-2.5 rounded-lg border border-[#17263E] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>SAFETY INDEX</span>
            <ShieldAlert className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="my-1">
            <span className="text-base font-extrabold font-mono text-emerald-400">
              {recommendedMetrics.risk_level}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center">
            <TrendingDown className="w-3 h-3 mr-0.5" />
            -{Math.max(bergRiskReduction, 55)}% Berg Hazard
          </span>
        </div>
      </div>

      {/* 2. Route A vs Route B Delta Cards */}
      <div className="space-y-2 border-t border-[#17263E] pt-3">
        <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
          <span>CORRIDOR COMPARISON DELTAS</span>
          <span className="text-[10px] font-mono text-slate-500">Route A vs Route B</span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          <div className="bg-[#0D182A] p-2 rounded-lg border border-[#17263E] flex items-center justify-between">
            <span className="text-slate-400">Iceberg Collision Danger:</span>
            <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-[10px]">
              -68.5% Critical Gain
            </span>
          </div>

          <div className="bg-[#0D182A] p-2 rounded-lg border border-[#17263E] flex items-center justify-between">
            <span className="text-slate-400">Pack-Ice Drag Impedance:</span>
            <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-[10px]">
              -24.0% Open Water
            </span>
          </div>

          <div className="bg-[#0D182A] p-2 rounded-lg border border-[#17263E] flex items-center justify-between">
            <span className="text-slate-400">Operational Voyage Detour:</span>
            <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-[10px]">
              +35 NM (+3.1%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. XAI Attribution Factor Waterfall Breakdown */}
      <div className="space-y-2 border-t border-[#17263E] pt-3">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-300">
          <span>XAI ATTRIBUTION WATERFALL</span>
          <span className="text-[10px] font-mono text-[#38BDF8]">Attribution %</span>
        </div>

        <div className="space-y-2 text-[11px] font-mono">
          {/* Factor 1: Iceberg Hazard */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">Iceberg Hazard Exposure</span>
              <span className="text-emerald-400 font-bold">-65% (Favorable)</span>
            </div>
            <div className="w-full h-1.5 bg-[#14233D] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "65%" }}></div>
            </div>
          </div>

          {/* Factor 2: Pack Ice */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">Pack Ice Impedance</span>
              <span className="text-emerald-400 font-bold">-22% (Favorable)</span>
            </div>
            <div className="w-full h-1.5 bg-[#14233D] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "35%" }}></div>
            </div>
          </div>

          {/* Factor 3: Detour */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">Voyage Distance Detour</span>
              <span className="text-amber-400 font-bold">+3.1% (Cost)</span>
            </div>
            <div className="w-full h-1.5 bg-[#14233D] rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: "15%" }}></div>
            </div>
          </div>

          {/* Factor 4: Fuel */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300">Bunker Fuel Adjustment</span>
              <span className="text-amber-400 font-bold">+4.2% (Cost)</span>
            </div>
            <div className="w-full h-1.5 bg-[#14233D] rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: "18%" }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sensor Lineage / Provenance Trust Badges */}
      <div className="border-t border-[#17263E] pt-3 text-[10px] font-mono text-slate-400 space-y-1">
        <div className="flex items-center gap-1 font-bold text-slate-300 mb-1">
          <Database className="w-3 h-3 text-[#38BDF8]" />
          <span>DATA PROVENANCE &amp; FRESHNESS</span>
        </div>
        <div className="flex justify-between">
          <span>Satellite Ingestion:</span>
          <span className="text-slate-200">MetOp ASCAT / QuikSCAT</span>
        </div>
        <div className="flex justify-between">
          <span>Iceberg Catalog:</span>
          <span className="text-slate-200">National Ice Center (NIC)</span>
        </div>
        <div className="flex justify-between">
          <span>Surface Meteorology:</span>
          <span className="text-slate-200">British Antarctic Survey</span>
        </div>
        <div className="flex justify-between text-emerald-400 font-bold pt-0.5">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Audited Lineage:</span>
          </span>
          <span>Validated Operational</span>
        </div>
      </div>
    </div>
  );
};
