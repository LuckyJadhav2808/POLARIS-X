import React from "react";
import { RouteMetrics, VesselProfile } from "@/types";
import { CheckCircle2, AlertTriangle, ShieldCheck, Compass } from "lucide-react";

interface ComparisonDockProps {
  recommendedMetrics: RouteMetrics | null;
  directMetrics: RouteMetrics | null;
  vessel: VesselProfile | null;
  onOpenXAI: () => void;
}

export const ComparisonDock: React.FC<ComparisonDockProps> = ({
  recommendedMetrics,
  directMetrics,
  vessel,
  onOpenXAI,
}) => {
  if (!recommendedMetrics || !directMetrics) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card p-5 mt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-600" />
            <span>Operational Route Comparison & Multi-Objective Tradeoff</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluating POLARIS-X Risk-Weighted Corridor for {vessel?.name || "Polar Vessel"} (Route A) against Direct Great-Circle Track (Route B)
          </p>
        </div>

        <button
          onClick={onOpenXAI}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          <span>View Decision Attribution</span>
        </button>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Route A: Recommended */}
        <div className="bg-sky-50/50 rounded-xl p-4 border border-sky-200/80 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-600 ring-4 ring-sky-100"></span>
              <span className="font-bold text-sm text-sky-950">ROUTE A: Recommended Safe Corridor</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-600 text-white uppercase tracking-wider">
              OPTIMAL
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-sky-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Distance</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {recommendedMetrics.distance_nm.toLocaleString()} NM
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-sky-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transit ETA</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {recommendedMetrics.eta_hours.toFixed(1)} hrs
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-sky-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fuel Proxy</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {recommendedMetrics.fuel_proxy_pct.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-sky-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hazard Index</span>
              <span className="text-sm font-bold font-mono text-emerald-700">
                R={(recommendedMetrics.risk_score * 100).toFixed(0)} ({recommendedMetrics.risk_level})
              </span>
            </div>
          </div>

          <div className="mt-3 text-xs text-sky-900 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Passes safely north of Iceberg Alley with 0 hard collision triggers.</span>
          </div>
        </div>

        {/* Route B: Direct Shortest */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400"></span>
              <span className="font-bold text-sm text-slate-800">ROUTE B: Direct Shortest Track</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wider">
              UNADJUSTED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Distance</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {directMetrics.distance_nm.toLocaleString()} NM
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transit ETA</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {directMetrics.eta_hours.toFixed(1)} hrs
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fuel Proxy</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {directMetrics.fuel_proxy_pct.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hazard Index</span>
              <span className="text-sm font-bold font-mono text-amber-700">
                R={(directMetrics.risk_score * 100).toFixed(0)} ({directMetrics.risk_level})
              </span>
            </div>
          </div>

          <div className="mt-3 text-xs text-amber-800 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Intersects active drift envelope of mega-icebergs (A68A/A23A). High collision risk.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
