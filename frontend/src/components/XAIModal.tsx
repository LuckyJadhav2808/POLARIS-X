"use client";

import React from "react";
import { XAIExplanation } from "@/types";
import { X, ShieldCheck, Sparkles, Database, CheckCircle, BarChart3 } from "lucide-react";

interface XAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  xaiData: XAIExplanation | null;
}

export const XAIModal: React.FC<XAIModalProps> = ({ isOpen, onClose, xaiData }) => {
  if (!isOpen || !xaiData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03060C]/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="glass-panel rounded-3xl border border-white/[0.12] shadow-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-white/[0.08] pb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#00E5FF] text-slate-950 flex items-center justify-center shrink-0 shadow-glow-cyan">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white font-mono">
                Explainable AI Decision Attribution (XAI)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {xaiData.confidence_pct}% CONFIDENCE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Transparent multi-objective mathematical justification for bridge navigation officers
            </p>
          </div>
        </div>

        {/* 1. Natural Language Justification Narrative */}
        <div className="mt-5 bg-[#0A101D] rounded-2xl p-4 border border-cyan-500/20 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-bold text-[#00E5FF] mb-2 uppercase tracking-wider font-mono">
            <Sparkles className="w-4 h-4 text-[#00E5FF]" />
            <span>Operational Navigation Narrative</span>
          </div>
          <p className="text-xs font-normal text-slate-300 leading-relaxed font-sans">
            {xaiData.narrative}
          </p>
        </div>

        {/* 2. Attribution Waterfall Factors */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <BarChart3 className="w-4 h-4 text-[#00E5FF]" />
              <span>Attribution Factor Breakdown</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Relative Delta vs Direct Track</span>
          </div>

          <div className="space-y-2.5">
            {xaiData.waterfall_factors.map((item, idx) => {
              const isFavorable = item.category === "safety";
              return (
                <div
                  key={idx}
                  className="bg-[#0A101D] p-3.5 rounded-2xl border border-white/[0.06] flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">{item.factor}</span>
                    <span
                      className={`font-mono font-bold ${
                        isFavorable ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {item.delta_pct > 0 ? `+${item.delta_pct}%` : `${item.delta_pct}%`} ({item.impact})
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 bg-[#111C30] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFavorable ? "bg-emerald-400 shadow-[0_0_8px_#34D399]" : "bg-amber-400 shadow-[0_0_8px_#FBBF24]"
                      }`}
                      style={{ width: `${Math.min(Math.abs(item.delta_pct), 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Mathematical Lineage & Data Provenance */}
        <div className="mt-5 border-t border-white/[0.08] pt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-2.5 uppercase tracking-wider font-mono">
            <Database className="w-4 h-4 text-[#00E5FF]" />
            <span>Dataset Lineage & Verification</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="bg-[#0A101D] p-3 rounded-xl border border-white/[0.06]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Iceberg Tracking</span>
              <span className="font-semibold text-slate-200">{xaiData.data_lineage.scatterometer}</span>
            </div>
            <div className="bg-[#0A101D] p-3 rounded-xl border border-white/[0.06]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Iceberg Bulletins</span>
              <span className="font-semibold text-slate-200">{xaiData.data_lineage.iceberg_reports}</span>
            </div>
            <div className="bg-[#0A101D] p-3 rounded-xl border border-white/[0.06]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Synoptic Meteorology</span>
              <span className="font-semibold text-slate-200">{xaiData.data_lineage.meteorology}</span>
            </div>
            <div className="bg-[#0A101D] p-3 rounded-xl border border-white/[0.06]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Auditing Status</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {xaiData.data_lineage.data_freshness}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00E5FF] hover:brightness-110 text-slate-950 font-mono text-xs font-extrabold tracking-wide transition-all shadow-glow-cyan cursor-pointer"
          >
            Acknowledge &amp; Return to Bridge
          </button>
        </div>
      </div>
    </div>
  );
};
