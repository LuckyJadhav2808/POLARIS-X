import React, { useState, useEffect } from "react";
import { Compass, ShieldCheck, Clock, MapPin, AlertTriangle } from "lucide-react";

interface HeaderProps {
  activeCorridor?: string;
  isBackendHealthy?: boolean;
  onOpenXAI?: () => void;
  onTriggerSurgeDemo?: () => void;
  isSurgeActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeCorridor = "Antarctic Peninsula & Weddell Sea",
  isBackendHealthy = true,
  onOpenXAI,
  onTriggerSurgeDemo,
  isSurgeActive = false,
}) => {
  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-navy-900 text-white border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Left: Branding & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center shadow-md shadow-sky-600/20 text-white font-bold text-xl tracking-wider">
          <Compass className="w-6 h-6 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              POLARIS<span className="text-sky-400 font-extrabold">-X</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
              NCPOR / MoES PS-26059
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
            <span>Polar Operational Logistics, Ice Risk & Intelligent Routing System</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-sky-400" />
              {activeCorridor}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Telemetry Controls, Simulation Triggers & Status */}
      <div className="flex items-center gap-3">
        {/* Dynamic Surge Scenario Trigger */}
        <button
          onClick={onTriggerSurgeDemo}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm ${
            isSurgeActive
              ? "bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900 animate-pulse"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600"
          }`}
          title="Simulate sudden dynamic drift surge of Iceberg A68A"
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${isSurgeActive ? "text-white" : "text-amber-400"}`} />
          <span>{isSurgeActive ? "Surge Scenario Active" : "Simulate A68A Surge"}</span>
        </button>

        {/* Explainable AI Trigger */}
        <button
          onClick={onOpenXAI}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-sm shadow-sky-600/30"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Why This Route? (XAI)</span>
        </button>

        {/* UTC Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>{utcTime || "UTC CLOCK"}</span>
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
          <span className="relative flex h-2 w-2">
            {isBackendHealthy && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isBackendHealthy ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></span>
          </span>
          <span className="text-slate-300 font-medium">
            {isBackendHealthy ? "Core Online" : "Connecting..."}
          </span>
        </div>
      </div>
    </header>
  );
};
