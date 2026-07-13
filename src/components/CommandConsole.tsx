import React, { useState } from "react";
import { Terminal, Cpu, ShieldCheck, CornerDownLeft, AlertCircle, HelpCircle } from "lucide-react";
import { Device } from "@/src/types";

interface CommandConsoleProps {
  devices: Device[];
  onExecuteAction: (actionType: string, targetDeviceId: string) => void;
}

interface IntentResponse {
  action: string;
  targetDeviceId: string;
  explanation: string;
  privilegesRequired: string[];
  authorized: boolean;
  confidenceScore: number;
}

export default function CommandConsole({ devices, onExecuteAction }: CommandConsoleProps) {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<IntentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const samplePrompts = [
    "Lock down all vulnerable systems",
    "Enable black screen on Noor-Mobile-X2",
    "Check surroundings sound for the secure vault",
    "Perform global network safety audit",
    "Turn on accessibility engine on Gate-Zero"
  ];

  const handleSendIntent = async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    setResponseLog(null);

    try {
      // Map names to IDs for active device context so Gemini has accurate data
      const activeDevicesContext = devices.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        accessibilityActive: d.accessibilityActive,
        blackScreenActive: d.blackScreenActive,
        micMonitoringActive: d.micMonitoringActive,
      }));

      const res = await fetch("/api/gemini/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIntent: text,
          activeDevices: activeDevicesContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.statusText}`);
      }

      const data: IntentResponse = await res.json();
      setResponseLog(data);

      if (data.authorized && data.action !== "UNKNOWN") {
        // Execute the reactive action directly on the dashboard state
        onExecuteAction(data.action, data.targetDeviceId);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Unable to parse security intent.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="command-console-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
          <Terminal className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Agentic Command Console</h3>
          <p className="text-xs text-slate-400">Zero-Trust Intent Interpreter powered by Explainable AI</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <Cpu className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleSendIntent(inputText);
              }
            }}
            placeholder="Type your supervisory intent (e.g. 'Lock the gateway node' or 'Silence mic monitor')..."
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600 font-mono"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendIntent(inputText)}
            disabled={isLoading || !inputText.trim()}
            className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer transition-all duration-150"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Preset suggestions */}
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(prompt);
                handleSendIntent(prompt);
              }}
              disabled={isLoading}
              className="text-[10px] font-mono bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-850 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-3 bg-indigo-500/5 p-4 rounded-lg border border-indigo-500/10 text-xs text-slate-400 font-mono animate-pulse">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
          Gemini parsing intent & checking authorization token signature...
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Security Supervisor Check Failed</p>
            <p className="font-mono text-slate-500 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Security Verification & Audit Report Log */}
      {responseLog && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Supervisor Check Report</span>
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              responseLog.authorized 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {responseLog.authorized ? "🛡️ AUTORIZED" : "🛑 BLOCKED"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block text-[10px]">Command Class</span>
              <span className="text-indigo-400 font-semibold text-[11px]">{responseLog.action}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Intent Confidence</span>
              <span className="text-slate-300 font-semibold">{(responseLog.confidenceScore * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-850">
            <span className="text-[10px] text-slate-500 block mb-1">Explainable AI (XAI) Verification Proof</span>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">{responseLog.explanation}</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-slate-500 block text-[10px]">Hardware Privilege Scopes Checked</span>
            <div className="flex flex-wrap gap-1.5">
              {responseLog.privilegesRequired.length > 0 ? (
                responseLog.privilegesRequired.map((priv, i) => (
                  <span key={i} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-2 py-0.5 rounded">
                    {priv}
                  </span>
                ))
              ) : (
                <span className="text-slate-600 italic text-[10px]">No advanced hardware privilege blocks required</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
