"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Navigation,
  ChevronRight,
  ChevronLeft,
  Activity,
} from "lucide-react";
import { GeoJSONLineString } from "@/types";

interface BottomDrawerProps {
  recommendedRoute: GeoJSONLineString | null;
  directRoute: GeoJSONLineString | null;
  scrubHours: number;
  onScrubChange: (hours: number) => void;
  startStation: string;
  destStation: string;
  isSidebarCollapsed?: boolean;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  scrubHours,
  onScrubChange,
  startStation,
  destStation,
  isSidebarCollapsed = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        onScrubChange((scrubHours + 2) % 50);
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isPlaying, scrubHours, onScrubChange]);

  const progressPercent = Math.min(Math.round((scrubHours / 48) * 100), 100);

  return (
    <div
      className={`fixed bottom-4 right-4 z-30 transition-all duration-300 select-none ${
        isSidebarCollapsed ? "left-[104px]" : "left-[356px]"
      }`}
    >
      <div className="glacio-deck rounded-2xl p-3 px-5 flex flex-col gap-2 border border-white/[0.08] shadow-2xl">
        {/* Top Row: Playback Controls + Scrub Readout + Passage Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-xl glacio-button-primary flex items-center justify-center cursor-pointer shadow-md"
              title={isPlaying ? "Pause 4D Temporal Simulation" : "Play 4D Temporal Simulation"}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-[#020617]" /> : <Play className="w-4 h-4 text-[#020617] ml-0.5" />}
            </button>

            <button
              onClick={() => onScrubChange(Math.max(scrubHours - 6, 0))}
              className="p-1.5 rounded-xl glacio-button text-slate-300 hover:text-white cursor-pointer"
              title="Step Back 6 Hours"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onScrubChange(Math.min(scrubHours + 6, 48))}
              className="p-1.5 rounded-xl glacio-button text-slate-300 hover:text-white cursor-pointer"
              title="Step Forward 6 Hours"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onScrubChange(0)}
              className="p-1.5 rounded-xl glacio-button text-slate-400 hover:text-white cursor-pointer"
              title="Reset to Departure (t+0h)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 pl-2 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="text-slate-400">PROJECTION: </span>
              <span className="text-[#00F0FF] font-bold tabular-nums">t+{scrubHours}h</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-bold">{progressPercent}% VOYAGE</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3 h-3 text-[#00FFA3]" />
              <span className="text-slate-400">{startStation.split("/")[0]}</span>
              <span className="text-slate-600">➔</span>
              <span className="text-[#00F0FF] font-semibold">{destStation.split("/")[0]}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400">
              <Activity className="w-3 h-3" />
              <span>DYNAMIC ICE DRIFT ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Tactile Inset Scrubber Groove */}
        <div className="glacio-inset rounded-2xl p-2 px-3 flex flex-col gap-1">
          <input
            type="range"
            min="0"
            max="48"
            step="1"
            value={scrubHours}
            onChange={(e) => onScrubChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span className={scrubHours === 0 ? "text-[#00F0FF] font-bold" : ""}>Departure (t+0h)</span>
            <span className={scrubHours === 12 ? "text-[#00F0FF] font-bold" : ""}>t+12h (Weddell Shelf)</span>
            <span className={scrubHours === 24 ? "text-[#00F0FF] font-bold" : ""}>t+24h (South Orkneys)</span>
            <span className={scrubHours === 36 ? "text-[#00F0FF] font-bold" : ""}>t+36h (Scotia Sea)</span>
            <span className={scrubHours === 48 ? "text-[#00F0FF] font-bold" : ""}>t+48h (Arrival)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
