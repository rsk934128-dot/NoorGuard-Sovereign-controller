import React, { useState } from "react";
import { Device, DeviceStatus, DeviceType } from "@/src/types";
import { 
  Laptop, Smartphone, HardDrive, ShieldAlert, CheckCircle2, 
  Settings2, EyeOff, Mic, Cpu, HardDrive as StorageIcon, Key, Zap,
  Search, SlidersHorizontal, Activity, ArrowUpRight, ArrowDownLeft, Lock, Unlock, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SovereignDigitalAssetMatrixProps {
  devices: Device[];
  onToggleAccessibility: (id: string) => void;
  onToggleBlackScreen: (id: string) => void;
  onToggleMic: (id: string) => void;
  onRestrictDevice: (id: string) => void;
}

export default function SovereignDigitalAssetMatrix({ 
  devices, 
  onToggleAccessibility, 
  onToggleBlackScreen, 
  onToggleMic,
  onRestrictDevice
}: SovereignDigitalAssetMatrixProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DeviceStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | DeviceType>("ALL");
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
        return <Settings2 className="h-5 w-5 text-sky-400" />;
    }
  };

  const getStatusConfig = (status: DeviceStatus) => {
    switch (status) {
      case "Safe":
        return {
          label: "SAFE",
          colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          glowClass: "shadow-[0_0_12px_rgba(16,185,129,0.15)]",
          icon: <CheckCircle2 className="h-3 w-3" />
        };
      case "Monitoring":
        return {
          label: "MONITORING",
          colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
          glowClass: "shadow-[0_0_12px_rgba(99,102,241,0.15)]",
          icon: <Zap className="h-3 w-3 animate-pulse" />
        };
      case "Restricted":
        return {
          label: "RESTRICTED",
          colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          glowClass: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
          icon: <ShieldAlert className="h-3 w-3" />
        };
      case "Alert":
        return {
          label: "TRIPPED ALERT",
          colorClass: "text-red-400 bg-red-500/10 border-red-500/20 animate-pulse",
          glowClass: "shadow-[0_0_12px_rgba(239,68,68,0.25)]",
          icon: <ShieldAlert className="h-3 w-3" />
        };
      default:
        return {
          label: "UNKNOWN",
          colorClass: "text-slate-400 bg-slate-500/10 border-slate-500/20",
          glowClass: "",
          icon: <Settings2 className="h-3 w-3" />
        };
    }
  };

  const executeAccessibilitySim = (deviceId: string, actionName: string) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev?.accessibilityActive) {
      alert("Please authorize the 'Accessibility Engine' privilege layer for this device first.");
      return;
    }
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] Simulated click gesture payload sent: "${actionName}"`;
    setSimulatedActionLog(prev => [log, ...prev].slice(0, 15));
    setActionInput("");
  };

  // Filter devices based on user choices
  const filteredDevices = devices.filter(dev => {
    const matchesSearch = dev.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dev.ipAddress.includes(searchQuery) ||
                          dev.hardwareKeyId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || dev.status === statusFilter;
    const matchesType = typeFilter === "ALL" || dev.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div id="sovereign-digital-asset-matrix" className="space-y-6">
      
      {/* Search and Filters panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by node name, IP address, or cryptographic hardware key..."
              className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/80">
              <SlidersHorizontal className="h-3 w-3 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-[11px] font-mono text-slate-300 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Statuses</option>
                <option value="Safe">Safe</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Restricted">Restricted</option>
                <option value="Alert">Alert</option>
              </select>
            </div>

            {/* Type Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/80">
              <Activity className="h-3 w-3 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-transparent text-[11px] font-mono text-slate-300 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Node Types</option>
                <option value="Gateway">Gateway</option>
                <option value="Mobile Node">Mobile Node</option>
                <option value="Secure Vault">Secure Vault</option>
                <option value="Workstation">Workstation</option>
              </select>
            </div>

          </div>
        </div>

        {/* Counter breakdown */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-850">
          <span className="text-slate-500">Node Population Matrix:</span>
          <span>Showing <strong className="text-indigo-400">{filteredDevices.length}</strong> of <strong>{devices.length}</strong> secure assets</span>
          {filteredDevices.length < devices.length && (
            <button 
              onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setTypeFilter("ALL"); }}
              className="text-indigo-400 hover:underline hover:text-indigo-300 cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid of connected systems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDevices.map((device) => {
          const isSelected = selectedDeviceId === device.id;
          const statusConfig = getStatusConfig(device.status);

          return (
            <div
              key={device.id}
              className={`bg-slate-900 border rounded-xl overflow-hidden shadow-lg transition-all duration-300 relative ${
                isSelected 
                  ? "border-indigo-500 shadow-indigo-500/10 scale-[1.01]" 
                  : "border-slate-800 hover:border-slate-700 hover:shadow-slate-950/40"
              } ${statusConfig.glowClass}`}
            >
              {/* Highlight active restriction visually with overlays */}
              {device.status === "Restricted" && (
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-400 rounded-bl-lg animate-pulse z-10" />
              )}

              {/* Node Card Header */}
              <div 
                className="p-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between cursor-pointer"
                onClick={() => setSelectedDeviceId(isSelected ? null : device.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800/80">
                    {getDeviceIcon(device.type)}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1">
                      {device.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono block leading-none mt-1">
                      {device.ipAddress}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.colorClass}`}>
                    {statusConfig.icon} {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Node Telemetry Progress Meters */}
              <div className="p-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* CPU Progress */}
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-850">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1 font-semibold font-sans">
                        <Cpu className="h-3 w-3 text-indigo-400/80" /> CPU
                      </span>
                      <span className="font-mono">{device.telemetry.cpu}%</span>
                    </div>
                    <div className="w-full bg-slate-800/65 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          device.telemetry.cpu > 75 ? "bg-red-500" : "bg-emerald-400"
                        }`}
                        style={{ width: `${device.telemetry.cpu}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Progress */}
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-850">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1 font-semibold font-sans">
                        <StorageIcon className="h-3 w-3 text-purple-400/80" /> RAM
                      </span>
                      <span className="font-mono">{device.telemetry.memory}%</span>
                    </div>
                    <div className="w-full bg-slate-800/65 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${device.telemetry.memory}%` }}
                      />
                    </div>
                  </div>

                </div>

                {/* Network IO metrics */}
                <div className="grid grid-cols-2 gap-3 pt-0.5 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1 text-slate-500">
                    <ArrowDownLeft className="h-3 w-3 text-indigo-400/80" />
                    <span>Rx Rate:</span>
                    <strong className="text-slate-300 ml-auto">{device.telemetry.networkIn} MB/s</strong>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <ArrowUpRight className="h-3 w-3 text-emerald-400/80" />
                    <span>Tx Rate:</span>
                    <strong className="text-slate-300 ml-auto">{device.telemetry.networkOut} MB/s</strong>
                  </div>
                </div>

                {/* Privilege Control layers */}
                <div className="pt-3 border-t border-slate-800/50 space-y-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                    Zero-Trust Privilege Layer Controls
                  </span>
                  
                  {/* Toggle: Accessibility Mode */}
                  <div className="flex items-center justify-between bg-slate-950/45 px-2.5 py-1.5 rounded-lg border border-slate-850/60">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Accessibility Engine</span>
                      <span className="text-[9px] text-slate-500">Permit remote clicks & automation</span>
                    </div>
                    <button
                      onClick={() => onToggleAccessibility(device.id)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                        device.accessibilityActive ? "bg-indigo-500" : "bg-slate-800"
                      }`}
                      title={device.accessibilityActive ? "Revoke Accessibility" : "Authorize Accessibility"}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        device.accessibilityActive ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: Blackout Mode */}
                  <div className="flex items-center justify-between bg-slate-950/45 px-2.5 py-1.5 rounded-lg border border-slate-850/60">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Blackout Privacy Overlay</span>
                      <span className="text-[9px] text-slate-500">Hide hardware display outputs</span>
                    </div>
                    <button
                      onClick={() => onToggleBlackScreen(device.id)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                        device.blackScreenActive ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                      title={device.blackScreenActive ? "Deactivate Blackout Screen" : "Activate Blackout Screen"}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        device.blackScreenActive ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: Microphone Mode */}
                  <div className="flex items-center justify-between bg-slate-950/45 px-2.5 py-1.5 rounded-lg border border-slate-850/60">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">Surroundings Microphone</span>
                      <span className="text-[9px] text-slate-500">Allow acoustics environmental scans</span>
                    </div>
                    <button
                      onClick={() => onToggleMic(device.id)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                        device.micMonitoringActive ? "bg-purple-500" : "bg-slate-800"
                      }`}
                      title={device.micMonitoringActive ? "Mute Microphone Channel" : "Open Microphone Channel"}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        device.micMonitoringActive ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                </div>

                {/* Restrict action button */}
                <div className="pt-1.5">
                  <button
                    onClick={() => onRestrictDevice(device.id)}
                    className={`w-full text-xs font-bold py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      device.status === "Restricted"
                        ? "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-red-500/10 hover:bg-red-500/15 border-red-500/30 text-red-400"
                    }`}
                  >
                    {device.status === "Restricted" ? (
                      <>
                        <Unlock className="h-3.5 w-3.5" /> Lift Secure Quarantine
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Isolate & Quarantine Asset
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Cryptographic Device Key footer */}
              <div className="px-4 py-2 bg-slate-950/85 border-t border-slate-850 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Key className="h-3 w-3 text-indigo-400/80" /> CR_ID:
                </span>
                <span>{device.hardwareKeyId}</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Simulator Actions Board */}
      <AnimatePresence>
        {selectedDeviceId && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  Interactive Privilege Control Simulator
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Inject remote clicks and automation profiles directly into target node:{" "}
                  <strong className="text-indigo-400 font-mono">
                    {devices.find((d) => d.id === selectedDeviceId)?.name}
                  </strong>
                </p>
              </div>

              {devices.find((d) => d.id === selectedDeviceId)?.blackScreenActive && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 self-start sm:self-center">
                  <EyeOff className="h-3.5 w-3.5 animate-pulse" /> PHYSICAL SCREEN PRIVACY HIDDEN
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Interaction Panel */}
              <div className="space-y-3.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block border-b border-slate-800 pb-1 font-mono">
                  Gesture Injection
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => executeAccessibilitySim(selectedDeviceId, "Execute Handshake Calibration")}
                    className="bg-slate-950 hover:bg-slate-850/80 border border-slate-850 rounded py-2 text-[10.5px] text-slate-300 font-mono transition-all hover:border-indigo-500/30 cursor-pointer"
                  >
                    Calibrate Handshake
                  </button>
                  <button
                    onClick={() => executeAccessibilitySim(selectedDeviceId, "Trigger Biometric Verification Profile")}
                    className="bg-slate-950 hover:bg-slate-850/80 border border-slate-850 rounded py-2 text-[10.5px] text-slate-300 font-mono transition-all hover:border-indigo-500/30 cursor-pointer"
                  >
                    Verify Biometrics
                  </button>
                  <button
                    onClick={() => executeAccessibilitySim(selectedDeviceId, "Flush Memory Cache Daemon")}
                    className="bg-slate-950 hover:bg-slate-850/80 border border-slate-850 rounded py-2 text-[10.5px] text-slate-300 font-mono transition-all hover:border-indigo-500/30 cursor-pointer"
                  >
                    Flush Cache
                  </button>
                  <button
                    onClick={() => executeAccessibilitySim(selectedDeviceId, "Terminate Host App Process")}
                    className="bg-slate-950 hover:bg-slate-850/80 border border-slate-850 rounded py-2 text-[10.5px] text-slate-300 font-mono transition-all hover:border-indigo-500/30 cursor-pointer"
                  >
                    Kill Processes
                  </button>
                </div>

                <div className="pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="Send custom injection code..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/25 transition-all"
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
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 rounded font-bold cursor-pointer transition-colors"
                    >
                      Inject
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Mock Screen Visual Feed */}
              <div className="relative border border-slate-800/80 rounded-xl h-40 bg-slate-950 overflow-hidden flex flex-col items-center justify-center p-3">
                {devices.find((d) => d.id === selectedDeviceId)?.blackScreenActive ? (
                  <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-3 z-10">
                    <EyeOff className="h-8 w-8 text-emerald-500 mb-2 animate-pulse" />
                    <span className="text-[11px] font-bold text-slate-200 font-mono tracking-wide">
                      BLACK SCREEN PRIVACY ENGAGED
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-1 max-w-[200px]">
                      Display outputs dynamically masked via hardware overlay policy.
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-b border-slate-900 pb-1">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        LIVE DIAGNOSTIC SCREEN
                      </span>
                      <span>SECURE_FEED_STABLE</span>
                    </div>

                    {/* Minimalist Grid Matrix Lines inside Screen */}
                    <div className="flex-1 flex flex-col justify-center space-y-1.5 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-indigo-400">Core Temp:</span>
                        <span className="text-[10px] font-mono text-slate-300">42.5 °C</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-indigo-400">Active Sockets:</span>
                        <span className="text-[10px] font-mono text-slate-300">14 Links</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-indigo-400">Enclave Status:</span>
                        <span className="text-[10px] font-mono text-emerald-400">INTEGRITY_VERIFIED</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850 text-[8.5px] text-slate-400 font-mono truncate">
                      Last Handshake Hash: SHA256:{deviceHardwareKeyHash(devices.find(d => d.id === selectedDeviceId)?.hardwareKeyId || "")}
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Access Log */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 h-40 overflow-y-auto">
                <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block mb-2 border-b border-slate-900 pb-1.5 font-mono">
                  Privileged Execution Audit Trail
                </span>
                {simulatedActionLog.length > 0 ? (
                  <div className="space-y-1.5">
                    {simulatedActionLog.map((log, index) => (
                      <div key={index} className="text-[9.5px] font-mono text-slate-300 leading-relaxed border-l border-indigo-500/20 pl-2">
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-slate-600 italic py-9 text-center">
                    Activate "Accessibility Engine" privilege above, then execute gestures to populate real-time audit logs.
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple deterministic hash helper for keys
function deviceHardwareKeyHash(key: string) {
  if (!key) return "000000000000";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().substring(0, 12);
}
