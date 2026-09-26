// Tactical Bridge Audio Synthesis and Speech Processing Engine
// Zero-dependency Web Audio API sound generator + Web Speech API synthesis

class BridgeAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playCue(cue: "ACKNOWLEDGE" | "WARNING" | "COMPUTING" | "SUCCESS" | string) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (cue === "ACKNOWLEDGE") {
        // Dual-tone high-frequency bridge Roger ping (880Hz -> 1320Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (cue === "WARNING") {
        // Dual harsh pulse maritime caution sound (320Hz pulse)
        [0, 0.12].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(340, now + offset);
          osc.frequency.exponentialRampToValueAtTime(280, now + offset + 0.1);

          gain.gain.setValueAtTime(0.15, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.1);
        });
      } else if (cue === "COMPUTING") {
        // Uplifting sonar frequency sweep (440Hz -> 880Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (cue === "SUCCESS") {
        // Crisp navigational confirmation chime triad (C5 -> E5 -> G5)
        const freqs = [523.25, 659.25, 783.99];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);

          gain.gain.setValueAtTime(0.1, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.2);
        });
      }
    } catch {
      // Audio playback fails gracefully if user hasn't interacted yet
    }
  }
}

export const bridgeAudio = new BridgeAudioSynthesizer();

export function playTacticalAudioCue(cue: "ACKNOWLEDGE" | "WARNING" | "COMPUTING" | "SUCCESS" | string) {
  bridgeAudio.playCue(cue);
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function getSpeechRecognitionConstructor(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function speakOfficerFeedback(
  text: string,
  enabled: boolean = true,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    // Unblock speech engine in case previous speech was abruptly cancelled
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    // Clean markdown formatting before voice synthesis
    const cleanText = text
      .replace(/[*#_`>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Alert naval bridge pacing
    utterance.pitch = 0.98;

    // Pick crisp English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Daniel") || v.name.includes("David")))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onStart) utterance.onstart = onStart;
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    // Slight timeout avoids Chrome garbage collection glitch on SpeechSynthesisUtterance
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    }, 20);
  } catch {
    if (onEnd) onEnd();
  }
}

export function replayOfficerFeedback(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  speakOfficerFeedback(text, true, onStart, onEnd);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }
}
