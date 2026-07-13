import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

interface SurroundingsMonitorProps {
  micActive: boolean;
  onToggleMic: () => void;
  deviceName: string;
}

export default function SurroundingsMonitor({ micActive, onToggleMic, deviceName }: SurroundingsMonitorProps) {
  const [dbLevel, setDbLevel] = useState(-80);
  const [frequencyData, setFrequencyData] = useState<number[]>(Array(16).fill(0));
  const [detectedAcousticEvent, setDetectedAcousticEvent] = useState("Ambient Silence");
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!micActive) {
      setDbLevel(-80);
      setFrequencyData(Array(16).fill(0));
      setDetectedAcousticEvent("Perimeter Guard Off");
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    // Acoustic simulator to mimic real-world active microphone monitoring
    const updateAcoustics = () => {
      // Simulate real-time DB level fluctuation
      const base = -55 + Math.sin(Date.now() / 1500) * 10;
      const noise = Math.random() * 8;
      const finalDb = Math.round(base + noise);
      setDbLevel(finalDb);

      // Simulate 16 frequency bands
      const newFrequencies = Array(16)
        .fill(0)
        .map((_, i) => {
          const wave = Math.sin(Date.now() / (300 + i * 50)) * 25 + 30;
          const rand = Math.random() * 20;
          return Math.max(5, Math.min(100, Math.round(wave + rand)));
        });
      setFrequencyData(newFrequencies);

      // Dynamic AI sound profiling prediction based on frequency peaks
      const maxVal = Math.max(...newFrequencies);
      if (maxVal > 85) {
        setDetectedAcousticEvent("AI-Profile: Possible Footsteps / Motion");
      } else if (maxVal > 70) {
        setDetectedAcousticEvent("AI-Profile: Keyboard Typing / Voice Activity");
      } else if (maxVal > 45) {
        setDetectedAcousticEvent("AI-Profile: Fan Hum / Low HVAC Hum");
      } else {
        setDetectedAcousticEvent("AI-Profile: Stable Quiet Room");
      }

      animationRef.current = requestAnimationFrame(updateAcoustics);
    };

    updateAcoustics();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [micActive]);

  // DB rating categories
  const getDbRating = (db: number) => {
    if (!micActive) return { text: "MUTED", color: "text-gray-400" };
    if (db > -40) return { text: "CRITICAL", color: "text-red-500 font-bold" };
    if (db > -55) return { text: "WARNING", color: "text-yellow-500" };
    return { text: "SECURE", color: "text-emerald-500" };
  };

  const rating = getDbRating(dbLevel);

  return (
    <div id="surroundings-monitor-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${micActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Acoustic Surroundings Monitor</h3>
            <p className="text-xs text-slate-400">Device: {deviceName}</p>
          </div>
        </div>

        <button
          onClick={onToggleMic}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
            micActive
              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
          }`}
        >
          {micActive ? (
            <>
              <MicOff className="h-3.5 w-3.5" />
              Disable Microphone
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" />
              Enable Monitoring
            </>
          )}
        </button>
      </div>

      {/* DB Level display & Status */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
        <div>
          <span className="text-xs text-slate-500 block">Ambient Amplitude</span>
          <span className="text-xl font-bold font-mono text-slate-200">
            {micActive ? `${dbLevel} dB` : "OFFLINE"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 block">Threat Classification</span>
          <span className={`text-sm font-semibold ${rating.color}`}>
            {rating.text}
          </span>
        </div>
      </div>

      {/* Visual Frequency Spectrum */}
      <div className="h-28 flex items-end gap-1 px-2 pt-4 bg-slate-950 rounded-lg border border-slate-800 mb-4 relative">
        {!micActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-500 text-xs">
            <ShieldAlert className="h-5 w-5 mb-1.5 opacity-50 text-slate-400" />
            Microphone monitoring is disabled.
          </div>
        )}

        {frequencyData.map((val, idx) => (
          <div key={idx} className="flex-1 flex flex-col justify-end h-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${val}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={`w-full rounded-t-sm transition-colors duration-200 ${
                val > 80
                  ? "bg-red-500"
                  : val > 60
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
              }`}
              style={{
                opacity: micActive ? 0.35 + (val / 100) * 0.65 : 0.05,
              }}
            />
          </div>
        ))}
      </div>

      {/* Sound Profiling Text */}
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <Volume2 className={`h-4 w-4 ${micActive ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
        <span className="font-mono tracking-wide">{detectedAcousticEvent}</span>
      </div>
    </div>
  );
}
