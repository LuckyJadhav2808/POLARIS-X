"use client";

import React, { useState, useEffect } from "react";
import { Compass, ShieldCheck, Clock, MapPin, AlertTriangle, Ship } from "lucide-react";

interface HeaderProps {
  activeCorridor?: string;
  isBackendHealthy?: boolean;
  onOpenXAI?: () => void;
  onTriggerSurgeDemo?: () => void;
  isSurgeActive?: boolean;
  vesselName?: string;
  polarClass?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeCorridor = "Antarctic Peninsula & Weddell Sea",
  isBackendHealthy = true,
  onOpenXAI,
  onTriggerSurgeDemo,
  isSurgeActive = false,
  vesselName = "MV Vasiliy Golovnin",
  polarClass = "PC-5",
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
    <header className="bg-[#091322] text-white border-b border-[#17263E] px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 select-none shadow-md">
      {/* Left: Branding & Corridor */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-[#0284C7] flex items-center justify-center shadow-md shadow-sky-600/30 text-white font-bold text-xl tracking-wider">
          <Compass className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
              POLARIS<span className="text-[#38BDF8] font-extrabold">-X</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-sky-500/15 text-sky-300 border border-sky-400/30">
              NCPOR / MoES PS-26059
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
            <span>Polar Operational Logistics &amp; Intelligent Routing</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#38BDF8]" />
              {activeCorridor}
            </span>
          </p>
        </div>
      </div>

      {/* Center: IMO Polar Code & Active Vessel Status Pill */}
      <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#0D182A] border border-[#1E3355] text-xs font-mono shadow-inner">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>IMO Category A / {polarClass} Compliant</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5 text-slate-200">
          <Ship className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>{vesselName}</span>
        </div>
      </div>

      {/* Right: Telemetry Controls & Simulation Trigger */}
      <div className="flex items-center gap-2.5">
        {/* Dynamic Surge Scenario Trigger */}
        <button
          onClick={onTriggerSurgeDemo}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all duration-200 shadow-sm cursor-pointer ${
            isSurgeActive
              ? "bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900 animate-pulse"
              : "bg-[#14233C] hover:bg-[#1B2F50] text-slate-200 border border-[#22395E]"
          }`}
          title="Simulate sudden dynamic drift surge of Iceberg A68A"
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${isSurgeActive ? "text-white" : "text-amber-400"}`} />
          <span>{isSurgeActive ? "Surge Active" : "Simulate A68A Surge"}</span>
        </button>

        {/* Explainable AI Trigger */}
        {onOpenXAI && (
          <button
            onClick={onOpenXAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-all shadow-sm shadow-sky-600/30 cursor-pointer font-mono"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Why This Route?</span>
          </button>
        )}

        {/* UTC Clock */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D182A] border border-[#1E3355] text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>{utcTime || "UTC CLOCK"}</span>
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D182A] border border-[#1E3355] text-xs">
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
          <span className="text-slate-300 font-mono font-medium text-[11px]">
            {isBackendHealthy ? "Core Online" : "Connecting..."}
          </span>
        </div>
      </div>
    </header>
  );
};
