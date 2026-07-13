import React, { useState } from "react";
import { Device } from "@/src/types";
import { 
  Laptop, Smartphone, HardDrive, ShieldAlert, CheckCircle, 
  Settings2, EyeOff, Mic, Cpu, HardDrive as StorageIcon, Key, Zap
} from "lucide-react";
import { motion } from "motion/react";

interface DeviceMatrixProps {
  devices: Device[];
  onToggleAccessibility: (id: string) => void;
  onToggleBlackScreen: (id: string) => void;
  onToggleMic: (id: string) => void;
  onRestrictDevice: (id: string) => void;
}

export default function DeviceMatrix({ 
  devices, 
  onToggleAccessibility, 
  onToggleBlackScreen, 
  onToggleMic,
  onRestrictDevice
}: DeviceMatrixProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [simulatedActionLog, setSimulatedActionLog] = useState<string[]>([]);
  const [actionInput, setActionInput] = useState("");

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "Mobile Node":
        return <Smartphone className="h-5 w-5 text-indigo-400" />;
      case "Secure Vault":
        return <HardDrive className="h-5 w-5 text-purple-400" />;
      case "Workstation":
        return <Laptop className="h-5 w-5 text-emerald-400" />;
      default:
        return <Settings2 className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Safe":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle className="h-3 w-3" /> SAFE
          </span>
        );
      case "Monitoring":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            <Zap className="h-3 w-3 animate-pulse" /> MONITORING
          </span>
        );
      case "Restricted":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <ShieldAlert className="h-3 w-3" /> RESTRICTED
          </span>
        );
      case "Alert":
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">
            <ShieldAlert className="h-3 w-3" /> TRIPPED ALERT
          </span>
        );
      default:
        return null;
    }
  };

  const executeAccessibilitySim = (deviceId: string, actionName: string) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev?.accessibilityActive) {
      alert("Please enable the 'Accessibility Control' privilege toggle for this device before simulating UI actions.");
      return;
    }
    const log = `[${new Date().toLocaleTimeString()}] Simulated Accessibility Action on ${dev.name}: ${actionName}`;
    setSimulatedActionLog(prev => [log, ...prev].slice(0, 10));
    setActionInput("");
  };

  return (
    <div id="device-matrix-grid" className="space-y-6">
      {/* Grid of Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((device) => {
          const isSelected = selectedDeviceId === device.id;
          return (
            <div
              key={device.id}
              className={`bg-slate-900 border rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
                isSelected 
                  ? "border-indigo-500 shadow-indigo-500/10 scale-[1.01]" 
                  : "border-slate-800 hover:border-slate-700 hover:shadow-slate-950/40"
              }`}
            >
              {/* Card Title Header */}
              <div 
                className="p-4 bg-slate-950/45 border-b border-slate-800/80 flex items-center justify-between cursor-pointer"
                onClick={() => setSelectedDeviceId(isSelected ? null : device.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                    {getDeviceIcon(device.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{device.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{device.ipAddress}</span>
                  </div>
                </div>
                <div>{getStatusBadge(device.status)}</div>
              </div>

              {/* Hardware Telemetry Progress Bars */}
              <div className="p-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1 font-semibold"><Cpu className="h-3 w-3" /> CPU Load</span>
                      <span className="font-mono">{device.telemetry.cpu}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${device.telemetry.cpu > 80 ? "bg-red-500" : "bg-emerald-400"}`}
                        style={{ width: `${device.telemetry.cpu}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1 font-semibold"><StorageIcon className="h-3 w-3" /> RAM Use</span>
                      <span className="font-mono">{device.telemetry.memory}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-400 h-full rounded-full"
                        style={{ width: `${device.telemetry.memory}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Toggles (Accessibility, Black Screen, Mic monitoring) */}
                <div className="pt-2 border-t border-slate-800/50 space-y-2.5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Privileged Control Layers</span>
                  
                  {/* Toggle 1: Accessibility Engine */}
                  <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Accessibility Engine</span>
                      <span className="text-[9px] text-slate-500">Inject clicks & keyboard automation</span>
                    </div>
                    <button
                      onClick={() => onToggleAccessibility(device.id)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                        device.accessibilityActive ? "bg-indigo-500" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        device.accessibilityActive ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Toggle 2: Black Screen Mode Overlay */}
                  <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Blackout Privacy Screen</span>
                      <span className="text-[9px] text-slate-500">Hide hardware desktop contents</span>
                    </div>
                    <button
                      onClick={() => onToggleBlackScreen(device.id)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                        device.blackScreenActive ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        device.blackScreenActive ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Toggle 3: Ambient Acoustics Monitor */}
                  <div className="flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Surroundings Audio</span>
                      <span className="text-[9px] text-slate-500">Enable micro-acoustics profiling</span>
                    </div>
                    <button
                      onClick={() => onToggleMic(device.id)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                        device.micMonitoringActive ? "bg-purple-500" : "bg-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        device.micMonitoringActive ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Admin restrictive actions */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => onRestrictDevice(device.id)}
                    className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg border transition-all cursor-pointer ${
                      device.status === "Restricted"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    {device.status === "Restricted" ? "Unrestrict Access" : "Restrict Asset"}
                  </button>
                </div>
              </div>

              {/* Hardware Device Fingerprint Key */}
              <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span className="flex items-center gap-1"><Key className="h-3 w-3 text-indigo-400" /> SEC_ID:</span>
                <span>{device.hardwareKeyId}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulator Actions Board (Only visible when at least one device is selected) */}
      {selectedDeviceId && (
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">
                Interactive Accessibility Simulator
              </h4>
              <p className="text-xs text-slate-400">
                Simulate remote-control gestures using the Accessibility Engine of:{" "}
                <span className="text-indigo-400 font-semibold font-mono">
                  {devices.find((d) => d.id === selectedDeviceId)?.name}
                </span>
              </p>
            </div>

            {devices.find((d) => d.id === selectedDeviceId)?.blackScreenActive && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <EyeOff className="h-3.5 w-3.5 animate-pulse" /> PRIVACY OBSCURITY ACTIVE
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action Simulator buttons */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Interactive UI Simulators</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => executeAccessibilitySim(selectedDeviceId, "Tap coordinate [x:120, y:480]")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded py-1.5 text-xs text-slate-200 cursor-pointer font-medium font-mono"
                >
                  Click Center
                </button>
                <button
                  onClick={() => executeAccessibilitySim(selectedDeviceId, "Swipe down gesture")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded py-1.5 text-xs text-slate-200 cursor-pointer font-medium font-mono"
                >
                  Swipe Down
                </button>
                <button
                  onClick={() => executeAccessibilitySim(selectedDeviceId, "Clear app memory")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded py-1.5 text-xs text-slate-200 cursor-pointer font-medium font-mono"
                >
                  Kill Process
                </button>
                <button
                  onClick={() => executeAccessibilitySim(selectedDeviceId, "Perform Biometric Authenticate")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded py-1.5 text-xs text-slate-200 cursor-pointer font-medium font-mono"
                >
                  Pass BioID
                </button>
              </div>

              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    placeholder="Enter custom key/click cmd..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && actionInput.trim()) {
                        executeAccessibilitySim(selectedDeviceId, actionInput.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (actionInput.trim()) {
                        executeAccessibilitySim(selectedDeviceId, actionInput.trim());
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded cursor-pointer font-semibold"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Live View Stream (Black Screen Mode or Mock desktop view) */}
            <div className="relative border border-slate-800 rounded-lg h-36 bg-slate-900 overflow-hidden flex items-center justify-center">
              {devices.find((d) => d.id === selectedDeviceId)?.blackScreenActive ? (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-3 z-10">
                  <EyeOff className="h-7 w-7 text-emerald-500 mb-1.5 opacity-80" />
                  <span className="text-[11px] font-bold text-slate-200 font-mono">BLACK SCREEN MODE ACTIVE</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">Desktop feed blocked to local viewers</span>
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-ping mr-1.5" />
                  <span className="text-[10px] font-mono text-slate-400">REMOTE VIEW ACTIVE</span>
                  <div className="mt-2 space-y-1">
                    <div className="w-24 h-2 bg-slate-800 rounded mx-auto" />
                    <div className="w-16 h-2 bg-slate-800 rounded mx-auto" />
                  </div>
                </div>
              )}
            </div>

            {/* Accessibility Execution Log */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 h-36 overflow-y-auto">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 border-b border-slate-800 pb-1">
                Accessibility Injection Log
              </span>
              {simulatedActionLog.length > 0 ? (
                <div className="space-y-1">
                  {simulatedActionLog.map((log, index) => (
                    <div key={index} className="text-[10px] font-mono text-slate-300 leading-normal">
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] font-mono text-slate-600 italic py-6 text-center">
                  Enable accessibility mode & trigger automated events to see audit stream.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
