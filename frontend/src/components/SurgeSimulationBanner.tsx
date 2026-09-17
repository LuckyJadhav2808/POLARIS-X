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
    <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white px-6 py-3 rounded-xl shadow-lg border border-rose-500 mb-4 animate-in slide-in-from-top-4 duration-200 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wide uppercase">
              DYNAMIC COLLISION HAZARD ALERT: ICEBERG A68A SURGE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-rose-800">
              SPEED +350%
            </span>
          </div>
          <p className="text-xs text-rose-100 mt-0.5">
            Iceberg A68A has surged north-eastward into the transit corridor. Initial passage is compromised. POLARIS-X has computed an evasive northern bypass corridor.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onApplyReroute}
          className="px-3.5 py-1.5 rounded-lg bg-white text-rose-800 hover:bg-rose-50 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Apply Evasive Reroute</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          title="Dismiss Alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
