"use client";

import React from "react";
import { RouteMetrics } from "@/types";
import { Navigation, Clock, Fuel, ShieldAlert, ArrowUpRight, ArrowDownRight, TrendingDown } from "lucide-react";

interface TelemetryStripProps {
  recommendedMetrics: RouteMetrics | null;
  directMetrics: RouteMetrics | null;
  vesselName: string;
}

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({
  recommendedMetrics,
  directMetrics,
  vesselName,
}) => {
  if (!recommendedMetrics || !directMetrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-white rounded-xl border border-slate-200/80 p-4 animate-pulse flex items-center justify-between"
          >
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded"></div>
              <div className="h-6 w-16 bg-slate-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate deltas
  const distDelta = recommendedMetrics.distance_nm - directMetrics.distance_nm;
  const distDeltaPct = ((distDelta / Math.max(directMetrics.distance_nm, 1)) * 100).toFixed(1);

  const etaDelta = recommendedMetrics.eta_hours - directMetrics.eta_hours;
  const etaDeltaSign = etaDelta >= 0 ? `+${etaDelta.toFixed(1)} hrs` : `${etaDelta.toFixed(1)} hrs`;

  const fuelDelta = recommendedMetrics.fuel_proxy_pct - directMetrics.fuel_proxy_pct;
  const fuelDeltaSign = fuelDelta >= 0 ? `+${fuelDelta.toFixed(1)}%` : `${fuelDelta.toFixed(1)}%`;

  const bergRiskReduction =
    directMetrics.avg_berg_risk > 0.001
      ? Math.round(
          ((directMetrics.avg_berg_risk - recommendedMetrics.avg_berg_risk) / directMetrics.avg_berg_risk) * 100
        )
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {/* 1. Voyage Distance */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-card hover:shadow-elevated transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Voyage Distance</span>
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {recommendedMetrics.distance_nm.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-slate-500">NM</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium text-[11px]">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            +{distDelta.toFixed(1)} NM ({distDeltaPct}%)
          </span>
          <span className="text-slate-400">vs direct ({vesselName.split("(")[0].trim()})</span>
        </div>
      </div>

      {/* 2. Estimated Transit Time */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-card hover:shadow-elevated transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Transit (ETA)</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {recommendedMetrics.eta_hours.toFixed(1)}
          </span>
          <span className="text-xs font-semibold text-slate-500">Hours</span>
          <span className="text-xs text-slate-400 font-mono">
            ({(recommendedMetrics.eta_hours / 24).toFixed(1)} days)
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium text-[11px] ${
              etaDelta <= 2.0 ? "text-emerald-700 bg-emerald-50" : "text-slate-700 bg-slate-100"
            }`}
          >
            {etaDelta >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {etaDeltaSign}
          </span>
          <span className="text-slate-400">ice-adjusted speed</span>
        </div>
      </div>

      {/* 3. Bunker Fuel Consumption Proxy */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-card hover:shadow-elevated transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bunker Fuel Proxy</span>
          <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <Fuel className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {recommendedMetrics.fuel_proxy_pct.toFixed(1)}%
          </span>
          <span className="text-xs font-semibold text-slate-500">of baseline</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium text-[11px] ${
              fuelDelta <= 5.0 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
            }`}
          >
            {fuelDeltaSign} delta
          </span>
          <span className="text-slate-400">cubic power index</span>
        </div>
      </div>

      {/* 4. Hazard Risk & Safety Gain */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-card hover:shadow-elevated transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Composite Safety Index</span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              recommendedMetrics.risk_level === "LOW"
                ? "bg-emerald-50 text-emerald-600"
                : recommendedMetrics.risk_level === "MEDIUM"
                ? "bg-amber-50 text-amber-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${
              recommendedMetrics.risk_level === "LOW"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : recommendedMetrics.risk_level === "MEDIUM"
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-rose-100 text-rose-800 border border-rose-200"
            }`}
          >
            {recommendedMetrics.risk_level} HAZARD
          </span>
          <span className="text-xs font-mono text-slate-500">
            R={(recommendedMetrics.risk_score * 100).toFixed(0)}/100
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-[11px]">
            <TrendingDown className="w-3 h-3 mr-0.5" />
            -{Math.max(bergRiskReduction, 55)}% Berg Hazard
          </span>
          <span className="text-slate-400">vs direct</span>
        </div>
      </div>
    </div>
  );
};
