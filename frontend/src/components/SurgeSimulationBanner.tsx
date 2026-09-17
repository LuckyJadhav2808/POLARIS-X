"use client";

import React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

interface SurgeSimulationBannerProps {
  isOpen: boolean;
  onDismiss: () => void;
  onApplyReroute: () => void;
}

export const SurgeSimulationBanner: React.FC<SurgeSimulationBannerProps> = ({
  isOpen,
  onDismiss,
  onApplyReroute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-gradient-to-r from-rose-950/90 via-rose-900/80 to-rose-950/90 backdrop-blur-xl text-white px-5 py-3 rounded-2xl shadow-glow-rose border border-rose-500/50 mb-3 animate-in slide-in-from-top-3 duration-200 flex flex-wrap items-center justify-between gap-3 select-none">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner">
          <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2 font-mono">
            <span className="font-extrabold text-xs tracking-wider uppercase text-rose-200">
              DYNAMIC COLLISION HAZARD ALERT: ICEBERG A68A SURGE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-slate-950 shadow-sm">
              DRIFT VELOCITY +350%
            </span>
          </div>
          <p className="text-xs text-rose-200/90 mt-0.5">
            Tabular Iceberg A68A has surged north-eastward into the baseline corridor. POLARIS-X autonomous engine has synthesized an evasive deep-water bypass.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onApplyReroute}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Apply Evasive Corridor</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-xl hover:bg-white/[0.08] text-rose-300 hover:text-white transition-colors cursor-pointer"
          title="Dismiss Alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
