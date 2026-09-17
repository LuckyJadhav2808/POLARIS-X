"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, FastForward, Rewind, Activity, Clock } from "lucide-react";

interface BottomDrawerProps {
  scrubHours: number;
  onScrubChange: (hours: number) => void;
  totalDistanceNm?: number;
  currentEtaHours?: number;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  scrubHours,
  onScrubChange,
  totalDistanceNm = 1180.5,
  currentEtaHours = 88.4,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Play animation timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        onScrubChange(scrubHours >= 48 ? 0 : scrubHours + 1);
      }, 350);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, scrubHours, onScrubChange]);

  const handleStepForward = () => {
    onScrubChange(Math.min(scrubHours + 4, 48));
  };

  const handleStepBackward = () => {
    onScrubChange(Math.max(scrubHours - 4, 0));
  };

  const handleReset = () => {
    setIsPlaying(false);
    onScrubChange(0);
  };

  // Compute ship distance progressed on timeline
  const progressRatio = scrubHours / 48;
  const currentNm = Math.round(progressRatio * totalDistanceNm);

  return (
    <div className="w-full bg-[#0A1322] border border-[#17263E] rounded-xl p-3 lg:p-4 flex flex-col gap-3 select-none shadow-xl text-slate-200">
      {/* 1. Temporal Scrubbing Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#17263E] pb-2.5">
        {/* Left: Player buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0D182A] p-1 rounded-lg border border-[#17263E]">
            <button
              onClick={handleStepBackward}
              className="p-1.5 rounded hover:bg-[#13233C] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Step Backward -4h"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                isPlaying
                  ? "bg-[#0284C7] text-white shadow-md shadow-sky-600/30"
                  : "hover:bg-[#13233C] text-[#38BDF8] hover:text-white"
              }`}
              title={isPlaying ? "Pause Drift Simulation" : "Play 48h Drift Simulation"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-[#38BDF8]" />}
            </button>
            <button
              onClick={handleStepForward}
              className="p-1.5 rounded hover:bg-[#13233C] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Step Forward +4h"
            >
              <FastForward className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 rounded hover:bg-[#13233C] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset to 0h"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-400">OFFSET:</span>
            <span className="font-extrabold text-[#38BDF8] text-sm">
              +{scrubHours}h
            </span>
            <span className="text-slate-500">/ 48h DRIFT</span>
          </div>
        </div>

        {/* Center: Interactive Scrubber Slider */}
        <div className="flex-1 max-w-xl mx-2 flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500">t=0h</span>
          <input
            type="range"
            min="0"
            max="48"
            step="1"
            value={scrubHours}
            onChange={(e) => {
              setIsPlaying(false);
              onScrubChange(parseInt(e.target.value, 10));
            }}
            className="w-full h-2 bg-[#13233C] rounded-lg appearance-none cursor-pointer accent-[#38BDF8]"
          />
          <span className="text-[10px] font-mono text-slate-500">t=+48h</span>
        </div>

        {/* Right: Live Progress Readout */}
        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>VOYAGE PROGRESS:</span>
          <span className="font-bold text-white">{currentNm} NM</span>
          <span className="text-slate-500">({Math.round(progressRatio * 100)}%)</span>
        </div>
      </div>

      {/* 2. Route Cross-Section Profile & Hazard Timeline */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="font-bold uppercase tracking-wider">
              Voyage Cross-Section &amp; Risk Profile
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Total Passage: {totalDistanceNm} NM (~{currentEtaHours} hrs)
          </span>
        </div>

        {/* Visual Segment Timeline Bar */}
        <div className="relative w-full h-7 bg-[#0D182A] border border-[#17263E] rounded-lg overflow-hidden flex text-[10px] font-mono">
          {/* Segment 1: Rothera Channel (0 - 280 NM) */}
          <div
            className="h-full bg-emerald-950/50 border-r border-[#17263E] flex items-center justify-center text-emerald-300 font-semibold px-2 truncate"
            style={{ width: "24%" }}
          >
            Rothera Sound (Low R)
          </div>

          {/* Segment 2: Bransfield Strait (280 - 600 NM) */}
          <div
            className="h-full bg-cyan-950/50 border-r border-[#17263E] flex items-center justify-center text-cyan-300 font-semibold px-2 truncate"
            style={{ width: "27%" }}
          >
            Bransfield Strait (Med R)
          </div>

          {/* Segment 3: Elephant Island / Iceberg Alley (600 - 900 NM) */}
          <div
            className="h-full bg-rose-950/60 border-r border-[#17263E] flex items-center justify-center text-rose-300 font-bold px-2 truncate"
            style={{ width: "25%" }}
          >
            ⚠️ Iceberg Alley (High R)
          </div>

          {/* Segment 4: Scotia Sea / South Georgia (900 - 1180 NM) */}
          <div
            className="h-full bg-emerald-950/50 flex items-center justify-center text-emerald-300 font-semibold px-2 truncate"
            style={{ width: "24%" }}
          >
            Scotia Approach (Low R)
          </div>

          {/* Active Vessel Indicator Pin on Timeline */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] transition-all duration-150"
            style={{ left: `${Math.min(progressRatio * 100, 99.5)}%` }}
          >
            <div className="absolute -top-1 -left-1.5 w-4 h-2 bg-[#00F0FF] rounded-full"></div>
          </div>
        </div>

        {/* Timeline Checkpoints */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>0 NM (Departure)</span>
          <span>300 NM</span>
          <span>600 NM (Elephant Isl.)</span>
          <span>900 NM (Scotia Basin)</span>
          <span>{totalDistanceNm} NM (Arrival)</span>
        </div>
      </div>
    </div>
  );
};
