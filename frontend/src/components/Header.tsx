"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Clock, MapPin, AlertTriangle, Ship } from "lucide-react";

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
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const mins = String(now.getUTCMinutes()).padStart(2, "0");
      const secs = String(now.getUTCSeconds()).padStart(2, "0");
      const day = String(now.getUTCDate()).padStart(2, "0");
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const month = months[now.getUTCMonth()];
      const year = now.getUTCFullYear();
      setUtcTime(`${day} ${month} ${year} • ${hours}:${mins}:${secs} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070D18]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-glass select-none">
      {/* 1. Left: Brand Mark, System Identity & Corridor */}
      <div className="flex items-center gap-3.5">
        {/* Brand Mascot: Abstracted Polaris Compass Star Vector */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#00E5FF] shadow-glow-cyan">
          <svg
            className="w-5 h-5 text-white filter drop-shadow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* 4-point Diamond Star */}
            <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" fill="white" fillOpacity="0.3" stroke="white" />
            <circle cx="12" cy="12" r="2.5" fill="#050811" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
        </div>

        {/* Wordmark & Mission Title */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-white font-mono flex items-center">
              POLARIS<span className="text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">-X</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              NCPOR / MoES PS-26059
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
            <span className="text-slate-300">Autonomous Polar Maritime Navigator</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400/90 flex items-center gap-1 font-mono text-[10px]">
              <MapPin className="w-3 h-3 text-[#00E5FF]" />
              {activeCorridor}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center: IMO Polar Class & Vessel Profile Pill */}
      <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#0D1524]/80 border border-white/[0.08] text-xs font-mono shadow-inner">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>IMO Category A / {polarClass} Compliant</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
          <Ship className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span>{vesselName}</span>
        </div>
      </div>

      {/* 3. Right: Simulation Controls & Telemetry Readouts */}
      <div className="flex items-center gap-2.5">
        {/* Dynamic Surge Simulation Trigger */}
        <button
          onClick={onTriggerSurgeDemo}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all duration-200 cursor-pointer ${
            isSurgeActive
              ? "bg-rose-600 text-white shadow-glow-rose ring-2 ring-rose-400 animate-pulse"
              : "bg-[#111C30] hover:bg-[#162540] text-slate-200 border border-white/[0.08] hover:border-cyan-500/30"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#0284C7] to-[#00E5FF] hover:brightness-110 text-slate-950 font-bold transition-all shadow-glow-cyan cursor-pointer font-mono"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Why This Route?</span>
          </button>
        )}

        {/* Live Military UTC Clock */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D1524]/80 border border-white/[0.08] text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span className="tabular-nums tracking-wide">{utcTime || "CALCULATING UTC..."}</span>
        </div>

        {/* Backend Heartbeat */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D1524]/80 border border-white/[0.08] text-xs">
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
