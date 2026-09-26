"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Radio,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Compass,
  ShieldCheck,
  AlertTriangle,
  Ship,
  Terminal,
  Activity,
} from "lucide-react";
import {
  CopilotAction,
  CopilotMessage,
  RouteResponse,
} from "@/types";
import { queryCopilot } from "@/lib/api";
import {
  playTacticalAudioCue,
  speakOfficerFeedback,
  replayOfficerFeedback,
  stopSpeaking,
  isSpeechRecognitionSupported,
  getSpeechRecognitionConstructor,
} from "@/lib/voice";

interface PolarisCopilotHUDProps {
  isOpen: boolean;
  onClose: () => void;
  activePolarClass: string;
  simulationDate?: string;
  startStation?: string;
  destStation?: string;
  routeData: RouteResponse | null;
  onExecuteAction: (action: CopilotAction) => void;
}

const QUICK_DIRECTIVES = [
  { label: "Sound UKC & Bathymetry", query: "Sound under-keel clearance and bathymetry safe margin" },
  { label: "IMO POLARIS RIO Check", query: "Check IMO POLARIS RIO regulatory compliance" },
  { label: "Departure Date & Timeline", query: "What is the date of starting our journey?" },
  { label: "Confirm Destination", query: "Confirm the destination that we have chosen" },
  { label: "Weather & Freezing Spray", query: "What is the weather and wind speed ahead?" },
  { label: "Emergency Safe Havens", query: "Where is the nearest emergency safe haven?" },
  { label: "Switch to Polar Class PC-2", query: "Switch polar class to PC-2 heavy icebreaker" },
  { label: "Simulate Iceberg Calving Surge", query: "Simulate iceberg calving surge warning" },
  { label: "Open Expedition Planner", query: "Open multi-waypoint expedition logistics planner" },
  { label: "Compute Recommended Route", query: "Compute optimal polar navigation route" },
  { label: "Passage Summary & Distance", query: "Report current voyage distance and fuel summary" },
];

export const PolarisCopilotHUD: React.FC<PolarisCopilotHUDProps> = ({
  isOpen,
  onClose,
  activePolarClass,
  simulationDate,
  startStation,
  destStation,
  routeData,
  onExecuteAction,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "init-1",
      sender: "copilot",
      text: `POLARIS Bridge Officer AI online. Standing by for nautical directives, IMO RIO compliance soundings, polar class alterations, or expedition planning. Press mic or type directive.`,
      displayMarkdown: `**POLARIS Bridge Officer AI online.**\nStanding by for tactical directives, IMO RIO compliance soundings, polar class alterations, or expedition logistics. Active Vessel Class: **${activePolarClass}**.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      audioCue: "ACKNOWLEDGE",
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading, isListening]);

  const handleSendQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    setInputText("");
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    playTacticalAudioCue("COMPUTING");

    // Gather live context
    const context: Record<string, any> = {
      has_route: Boolean(routeData),
      simulation_date: simulationDate || (routeData as any)?.simulation_date || "2021-03-15",
      start_station: startStation || "Rothera Station",
      dest_station: destStation || "Grytviken / South Georgia",
      min_ukc_meters: routeData?.bathymetry?.min_under_keel_clearance_m,
      safe_margin_verified: routeData?.bathymetry?.is_safe,
      rio_status: routeData?.rio_profile?.overall_status,
      min_rio: routeData?.rio_profile?.min_rio,
      total_distance_nm: routeData?.recommended_metrics?.distance_nm,
      total_fuel_tons: routeData?.esg_ledger?.recommended_fuel_tons ?? routeData?.recommended_metrics?.fuel_proxy_pct,
      estimated_transit_hours: routeData?.recommended_metrics?.eta_hours,
      active_polar_class: activePolarClass,
    };

    try {
      const response = await queryCopilot({
        transcript: trimmed,
        active_polar_class: activePolarClass,
        start_station: startStation || "Rothera Station",
        dest_station: destStation || "Grytviken / South Georgia",
        simulation_date: simulationDate || "2021-03-15",
        context,
      });

      const copilotMsg: CopilotMessage = {
        id: `ai-${Date.now()}`,
        sender: "copilot",
        text: response.spoken_response,
        displayMarkdown: response.display_markdown || (response as any).display_text,
        timestamp: response.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        action: response.action,
        audioCue: response.audio_cue,
      };

      setMessages((prev) => [...prev, copilotMsg]);

      // Play audio cue
      if (response.audio_cue) {
        playTacticalAudioCue(response.audio_cue);
      }

      // Voice read-out
      if (voiceEnabled && response.spoken_response) {
        setIsSpeaking(true);
        setSpeakingMessageId(copilotMsg.id);
        speakOfficerFeedback(
          response.spoken_response,
          true,
          () => {
            setIsSpeaking(true);
            setSpeakingMessageId(copilotMsg.id);
          },
          () => {
            setIsSpeaking(false);
            setSpeakingMessageId(null);
          }
        );
      }

      // Execute dispatched action
      if (response.action && response.action.type !== "NONE") {
        onExecuteAction(response.action);
      }
    } catch (err: any) {
      playTacticalAudioCue("WARNING");
      const errorMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        sender: "copilot",
        text: "Tactical comms link failure. Directive unacknowledged.",
        displayMarkdown: `⚠️ **Tactical Comms Error**: Unable to reach bridge AI service. *${err?.message || "Connection refused"}*`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        audioCue: "WARNING",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionClass) {
      alert("Speech recognition is not supported in this browser. Please use the text input below.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        playTacticalAudioCue("ACKNOWLEDGE");
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join("");
        setInputText(transcript);
        if (event.results[0] && event.results[0].isFinal) {
          setIsListening(false);
          handleSendQuery(transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  const handlePlayMessageVoice = (msg: CopilotMessage) => {
    const speechText = msg.text || msg.displayMarkdown || "";
    if (!speechText) return;

    // If currently speaking this exact message, toggle it off
    if (isSpeaking && speakingMessageId === msg.id) {
      handleStopSpeaking();
      return;
    }

    handleStopSpeaking();
    setVoiceEnabled(true);
    setIsSpeaking(true);
    setSpeakingMessageId(msg.id);
    playTacticalAudioCue("ACKNOWLEDGE");

    replayOfficerFeedback(
      speechText,
      () => {
        setIsSpeaking(true);
        setSpeakingMessageId(msg.id);
      },
      () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      }
    );
  };

  const latestCopilotMsg = [...messages]
    .reverse()
    .find((m) => m.sender === "copilot" && (m.text || m.displayMarkdown));

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 shadow-2xl font-sans ${
        isMinimized
          ? "bottom-4 right-4 w-80 h-14 bg-slate-950/90 border border-cyan-500/40 rounded-xl backdrop-blur-md"
          : "bottom-4 right-4 w-[460px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-2rem)] bg-slate-950/95 border border-cyan-500/40 rounded-2xl flex flex-col backdrop-blur-xl shadow-cyan-950/40"
      }`}
    >
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/40 bg-gradient-to-r from-slate-950 via-slate-900/90 to-cyan-950/50 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-cyan-300">
                Bridge Officer AI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-semibold">
                POLARIS COPILOT
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>IMO Polar Code Protocol Active</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-mono font-bold">{activePolarClass}</span>
            </div>
          </div>
        </div>

        {/* WINDOW CONTROLS */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (voiceEnabled) {
                handleStopSpeaking();
                setVoiceEnabled(false);
              } else {
                setVoiceEnabled(true);
                const lastCopilot = [...messages].reverse().find((m) => m.sender === "copilot" && (m.text || m.displayMarkdown));
                if (lastCopilot) {
                  handlePlayMessageVoice(lastCopilot);
                } else {
                  playTacticalAudioCue("ACKNOWLEDGE");
                }
              }
            }}
            title={
              voiceEnabled
                ? "Mute Copilot Voice (Active - click to silence)"
                : "Unmute & Speak (Muted - click to restore voice)"
            }
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              voiceEnabled
                ? "text-cyan-400 hover:bg-cyan-500/20"
                : "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30"
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {!voiceEnabled && (
              <span className="text-[9.5px] font-mono font-bold tracking-wider uppercase pr-0.5">UNMUTE</span>
            )}
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand Console" : "Minimize Console"}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              handleStopSpeaking();
              onClose();
            }}
            title="Close Bridge AI"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* TACTICAL FREQUENCY HUD / WAVEFORM STRIP */}
          <div className="px-4 py-2 bg-slate-900/60 border-b border-cyan-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(12)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isListening
                        ? "bg-cyan-400 animate-pulse"
                        : isSpeaking
                        ? "bg-emerald-400"
                        : isLoading
                        ? "bg-amber-400 animate-bounce"
                        : "bg-slate-700 h-2"
                    }`}
                    style={{
                      height: isListening
                        ? `${Math.max(4, ((i * 7 + 13) % 18) + 4)}px`
                        : isSpeaking
                        ? `${Math.max(4, ((i * 5 + 9) % 14) + 4)}px`
                        : undefined,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-300">
                {isListening ? (
                  <span className="text-cyan-400 font-semibold animate-pulse">● BRIDGE LISTENING (PTT ACTIVE)</span>
                ) : isSpeaking ? (
                  <span className="text-emerald-400 font-semibold">● COPILOT TRANSMITTING VOICE</span>
                ) : isLoading ? (
                  <span className="text-amber-400 font-semibold">● PROCESSING TACTICAL DIRECTIVE...</span>
                ) : (
                  <span className="text-slate-400">CH-16 POLARIS BRIDGE DUPLEX</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isSpeaking ? (
                <button
                  onClick={handleStopSpeaking}
                  className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all font-mono flex items-center gap-1 cursor-pointer"
                  title="Mute current officer speech"
                >
                  <VolumeX className="w-3 h-3 text-rose-400" />
                  <span>MUTE / HUSH</span>
                </button>
              ) : latestCopilotMsg ? (
                <button
                  onClick={() => handlePlayMessageVoice(latestCopilotMsg)}
                  className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 hover:text-white transition-all font-mono flex items-center gap-1 cursor-pointer shadow-sm shadow-cyan-950"
                  title="Replay latest officer voice feedback"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span>SPEAK LAST</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* CHAT LOG STREAM */}
          <div
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-cyan-900/40 scrollbar-track-transparent"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className={`mb-1 px-1 ${msg.sender === "user" ? "flex items-center gap-1.5" : "w-full max-w-[90%] flex items-center justify-between"}`}>
                  {msg.sender === "user" ? (
                    <>
                      <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                      <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase">
                        NAV OFFICER
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1">
                          <Ship className="w-3 h-3 text-cyan-400" />
                          POLARIS COPILOT
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                      </div>

                      <button
                        onClick={() => handlePlayMessageVoice(msg)}
                        title={isSpeaking && speakingMessageId === msg.id ? "Stop voice reading" : "Read message aloud"}
                        className={`text-[9.5px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                          isSpeaking && speakingMessageId === msg.id
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                            : "bg-slate-800/90 text-cyan-300 hover:bg-cyan-900/60 hover:text-white border border-cyan-800/40"
                        }`}
                      >
                        {isSpeaking && speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-400" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-cyan-400" />
                            <span>Speak</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>

                <div
                  className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-cyan-950/70 border border-cyan-600/40 text-cyan-100 shadow-md shadow-cyan-950/50"
                      : "bg-slate-900/90 border border-slate-800 text-slate-200 shadow-lg shadow-black/40"
                  }`}
                >
                  {msg.displayMarkdown ? (
                    <div className="space-y-1.5 whitespace-pre-wrap font-sans">
                      {msg.displayMarkdown.split("\n").map((line, idx) => {
                        if (line.startsWith("### ")) {
                          return (
                            <h4 key={idx} className="font-bold text-cyan-300 text-sm mt-1">
                              {line.replace("### ", "")}
                            </h4>
                          );
                        }
                        if (line.startsWith("- ")) {
                          return (
                            <div key={idx} className="flex items-start gap-1.5 pl-1 text-slate-300">
                              <span className="text-cyan-400 font-bold">•</span>
                              <span>{line.replace("- ", "")}</span>
                            </div>
                          );
                        }
                        return <p key={idx}>{line}</p>;
                      })}
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}

                  {msg.action && msg.action.type !== "NONE" && (
                    <div className="mt-2.5 pt-2 border-t border-cyan-800/40 flex items-center justify-between text-[11px] font-mono text-cyan-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        EXEC: {msg.action.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        APPLIED
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
                    POLARIS COPILOT
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-cyan-300">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating polar dynamics & telemetry...</span>
                </div>
              </div>
            )}
          </div>

          {/* QUICK DIRECTIVES CHIPS */}
          <div className="px-3 py-2 bg-slate-950 border-t border-cyan-950/70 overflow-x-auto flex gap-1.5 scrollbar-none">
            {QUICK_DIRECTIVES.map((directive, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(directive.query)}
                disabled={isLoading}
                className="whitespace-nowrap text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-900/90 border border-cyan-900/60 hover:border-cyan-400/80 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/60 transition-all active:scale-95 disabled:opacity-40"
              >
                {directive.label}
              </button>
            ))}
          </div>

          {/* INPUT BAR WITH PTT MIC BUTTON */}
          <div className="p-3 border-t border-cyan-900/40 bg-slate-900/80 rounded-b-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery(inputText);
              }}
              className="flex items-center gap-2"
            >
              {/* PTT MIC BUTTON */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                title={isListening ? "Stop Listening" : "Push to Talk (Voice Directive)"}
                className={`relative p-2.5 rounded-xl font-medium transition-all ${
                  isListening
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-400/50 ring-2 ring-cyan-300 animate-pulse"
                    : "bg-slate-800 hover:bg-cyan-950 text-cyan-400 border border-cyan-800/60 hover:border-cyan-500"
                }`}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening && (
                  <span className="absolute inset-0 rounded-xl border border-cyan-300 animate-ping opacity-75" />
                )}
              </button>

              {/* TEXT DIRECTIVE INPUT */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening to voice directive..."
                      : "Type directive (e.g. 'check under keel clearance', 'switch to PC-2')..."
                  }
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* TRANSMIT BUTTON */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-cyan-950 active:scale-95"
                title="Transmit Directive"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-cyan-500" />
                Speech Synthesis: {voiceEnabled ? "ACTIVE" : "MUTED"}
              </span>
              <span>{speechSupported ? "WebSpeech API Ready" : "Keyboard Directives Only"}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
