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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Explainable AI Decision Attribution (XAI)</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {xaiData.confidence_pct}% CONFIDENCE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent multi-objective mathematical justification for bridge navigation officers
            </p>
          </div>
        </div>

        {/* 1. Natural Language Justification Narrative */}
        <div className="mt-5 bg-sky-50/60 rounded-xl p-4 border border-sky-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950 mb-2 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Operational Navigation Narrative</span>
          </div>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">
            {xaiData.narrative}
          </p>
        </div>

        {/* 2. Attribution Waterfall Factors */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-slate-600" />
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
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{item.factor}</span>
                    <span
                      className={`font-mono font-bold ${
                        isFavorable ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {item.delta_pct > 0 ? `+${item.delta_pct}%` : `${item.delta_pct}%`} ({item.impact})
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isFavorable ? "bg-emerald-500" : "bg-amber-500"
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
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
            <Database className="w-4 h-4 text-slate-600" />
            <span>Dataset Lineage & Verification</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Iceberg Tracking</span>
              <span className="font-medium text-slate-700">{xaiData.data_lineage.scatterometer}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Iceberg Bulletins</span>
              <span className="font-medium text-slate-700">{xaiData.data_lineage.iceberg_reports}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Synoptic Meteorology</span>
              <span className="font-medium text-slate-700">{xaiData.data_lineage.meteorology}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Auditing Status</span>
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {xaiData.data_lineage.data_freshness}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
