import React, { useState, useEffect, useRef, useMemo } from "react";
import { Device, AuditLogEntry } from "@/src/types";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { 
  Cpu, Activity, Zap, ShieldAlert, CheckCircle, Sliders, Play, Square, 
  RefreshCw, Terminal, Thermometer, Database, Network, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EdgeTelemetryMonitorProps {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  addSystemLog: (
    category: string,
    severity: string,
    deviceId: string,
    deviceName: string,
    action: string,
    details: string,
    customOperator?: string
  ) => Promise<void>;
}

interface TelemetryPoint {
  time: string;
  cpu: number;
  memory: number;
  temperature: number;
  networkIn: number;
  networkOut: number;
  status: "Normal" | "Anomaly";
  trippedRule?: string;
}

export default function EdgeTelemetryMonitor({ 
  devices, 
  setDevices, 
  addSystemLog 
}: EdgeTelemetryMonitorProps) {
  // Config States
  const [isRunning, setIsRunning] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("dev-gate");
  const [samplingRate, setSamplingRate] = useState<number>(1500); // ms
  const [simulationMode, setSimulationMode] = useState<"normal" | "miner" | "ddos" | "memory_leak" | "thermal_failure">("normal");
  
  // History and anomaly data states
  const [history, setHistory] = useState<Record<string, TelemetryPoint[]>>({
    "dev-gate": [],
    "dev-mobile": [],
    "dev-vault": [],
    "dev-workstation": []
  });
  const [anomalyLogs, setAnomalyLogs] = useState<Array<{
    id: string;
    timestamp: string;
    deviceId: string;
    deviceName: string;
    type: string;
    details: string;
    severity: "WARNING" | "CRITICAL";
  }>>([]);

  // For simulation state accumulation (like memory leak & thermal failure)
  const leakAccumulator = useRef<number>(35);
  const thermalAccumulator = useRef<number>(42);
  const lastActiveMode = useRef<string>("normal");

  // Local edge anomaly rules engine configurations (Heuristics)
  const rules = useMemo(() => [
    { id: "RULE_CPU_MINER", field: "cpu", threshold: 90, operator: ">", severity: "CRITICAL", title: "Cryptocurrency Mining / CPU Overrun", description: "Edge CPU consumption exceeds 90% under sustained processing." },
    { id: "RULE_MEM_PRESSURE", field: "memory", threshold: 92, operator: ">", severity: "CRITICAL", title: "Memory Buffer Overflow Threat", description: "Available application cache limits depleted (Memory usage exceeds 92%)." },
    { id: "RULE_THERMAL_FAIL", field: "temperature", threshold: 82, operator: ">", severity: "WARNING", title: "Thermal Throttling Threshold Breached", description: "Device motherboard temperature rises above safety threshold of 82°C." },
    { id: "RULE_NET_DDOS_IN", field: "networkIn", threshold: 45, operator: ">", severity: "CRITICAL", title: "Potential network Inflow DDoS Infiltration", description: "Unusually high external ingress data packet rates exceeds 45 MB/s." },
    { id: "RULE_NET_DDOS_OUT", field: "networkOut", threshold: 35, operator: ">", severity: "CRITICAL", title: "Potential network Outflow Data Exfiltration", description: "Aggressive outbound transfers detected exceeding 35 MB/s." }
  ], []);

  // Sync / Reset accumulators on simulation mode changes
  useEffect(() => {
    if (simulationMode !== lastActiveMode.current) {
      if (simulationMode === "memory_leak") {
        leakAccumulator.current = 45;
      } else if (simulationMode === "thermal_failure") {
        thermalAccumulator.current = 52;
      }
      lastActiveMode.current = simulationMode;
    }
  }, [simulationMode]);

  // Periodic Telemetry Generation Loop (Edge Service Emulator)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Find current state of selected device to preserve other fields
      const targetDevice = devices.find(d => d.id === selectedDeviceId);
      if (!targetDevice) return;

      // 1. Generate local telemetry according to current active scenario
      let cpu = 15;
      let memory = 38;
      let temperature = 42;
      let networkIn = 3.2;
      let networkOut = 2.1;

      switch (simulationMode) {
        case "miner":
          cpu = Math.floor(Math.random() * 8) + 91; // 91-99%
          memory = Math.floor(Math.random() * 10) + 72; // 72-82%
          temperature = Math.floor(Math.random() * 8) + 84; // 84-92°C
          networkIn = parseFloat((Math.random() * 4 + 1.5).toFixed(1));
          networkOut = parseFloat((Math.random() * 8 + 8).toFixed(1));
          break;

        case "ddos":
          cpu = Math.floor(Math.random() * 15) + 72; // 72-87%
          memory = Math.floor(Math.random() * 12) + 60; // 60-72%
          temperature = Math.floor(Math.random() * 10) + 66; // 66-76°C
          networkIn = parseFloat((Math.random() * 25 + 71).toFixed(1)); // 71-96 MB/s (trips DDoS IN)
          networkOut = parseFloat((Math.random() * 20 + 36).toFixed(1)); // 36-56 MB/s (trips DDoS OUT)
          break;

        case "memory_leak":
          // Stepped build-up simulation
          leakAccumulator.current = Math.min(99.5, leakAccumulator.current + (Math.random() * 3 + 1.5));
          cpu = Math.floor(Math.random() * 12) + 20; // 20-32%
          memory = parseFloat(leakAccumulator.current.toFixed(1));
          temperature = Math.floor(Math.random() * 6) + 48; // 48-54°C
          networkIn = parseFloat((Math.random() * 1 + 0.2).toFixed(1));
          networkOut = parseFloat((Math.random() * 1 + 0.1).toFixed(1));
          break;

        case "thermal_failure":
          // Stepped temperature climbing while CPU throttles down
          thermalAccumulator.current = Math.min(108, thermalAccumulator.current + (Math.random() * 4 + 2));
          cpu = Math.max(4, Math.floor(40 - (thermalAccumulator.current - 50) * 0.6)); // cpu throttles from ~40 down to ~5%
          memory = Math.floor(Math.random() * 8) + 38;
          temperature = parseFloat(thermalAccumulator.current.toFixed(1));
          networkIn = 0.4;
          networkOut = 0.2;
          break;

        case "normal":
        default:
          cpu = Math.floor(Math.random() * 15) + 12; // 12-27%
          memory = Math.floor(Math.random() * 10) + 34; // 34-44%
          temperature = Math.floor(Math.random() * 6) + 40; // 40-46°C
          networkIn = parseFloat((Math.random() * 3 + 1).toFixed(1));
          networkOut = parseFloat((Math.random() * 2 + 0.5).toFixed(1));
          break;
      }

      // 2. Perform Local edge rule verification checks
      let trippedRule: any = null;
      let status: "Normal" | "Anomaly" = "Normal";

      for (const rule of rules) {
        let valueToCheck = 0;
        if (rule.field === "cpu") valueToCheck = cpu;
        else if (rule.field === "memory") valueToCheck = memory;
        else if (rule.field === "temperature") valueToCheck = temperature;
        else if (rule.field === "networkIn") valueToCheck = networkIn;
        else if (rule.field === "networkOut") valueToCheck = networkOut;

        if (valueToCheck > rule.threshold) {
          status = "Anomaly";
          trippedRule = rule;
          break; // trigger first detected anomaly
        }
      }

      const timestamp = new Date().toISOString();
      const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 3. Log newly discovered anomaly in-app if it transitioned
      if (status === "Anomaly" && trippedRule) {
        const isNewInstance = !anomalyLogs.some(
          a => a.deviceId === selectedDeviceId && 
          a.type === trippedRule.id && 
          (new Date().getTime() - new Date(a.timestamp).getTime()) < 12000
        );

        if (isNewInstance) {
          const newAnomaly = {
            id: `ANOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            timestamp,
            deviceId: selectedDeviceId,
            deviceName: targetDevice.name,
            type: trippedRule.id,
            details: `Trip: [${trippedRule.field}] current is ${
              trippedRule.field === "temperature" ? temperature + "°C" :
              trippedRule.field === "cpu" ? cpu + "%" :
              trippedRule.field === "memory" ? memory + "%" :
              trippedRule.field === "networkIn" ? networkIn + " MB/s" :
              networkOut + " MB/s"
            } exceeding limit ${trippedRule.threshold}`,
            severity: trippedRule.severity as any
          };

          setAnomalyLogs(prev => [newAnomaly, ...prev].slice(0, 30));

          // Trigger cryptographic audit logging to main NoorGuard system cleanly!
          addSystemLog(
            "INTELLIGENCE",
            trippedRule.severity,
            selectedDeviceId,
            targetDevice.name,
            `Edge compute anomaly triggered: ${trippedRule.title}`,
            `Heuristic analyzer detected rule break locally on device. ${newAnomaly.details}`
          );
        }
      }

      // 4. Update parent states to show real-time changes across the active application
      setDevices(prev => prev.map(dev => {
        if (dev.id === selectedDeviceId) {
          return {
            ...dev,
            status: status === "Anomaly" ? "Alert" : dev.status === "Alert" ? "Safe" : dev.status,
            telemetry: { cpu, memory, storage: dev.telemetry.storage, networkIn, networkOut },
            lastSync: timestamp
          };
        }
        return dev;
      }));

      // 5. Save locally generated point to rolling timeline history state (last 15 points)
      const newPoint: TelemetryPoint = {
        time: timeLabel,
        cpu,
        memory,
        temperature,
        networkIn,
        networkOut,
        status,
        trippedRule: trippedRule ? trippedRule.title : undefined
      };

      setHistory(prev => ({
        ...prev,
        [selectedDeviceId]: [...(prev[selectedDeviceId] || []), newPoint].slice(-15)
      }));

    }, samplingRate);

    return () => clearInterval(interval);
  }, [isRunning, selectedDeviceId, samplingRate, simulationMode, devices, rules]);

  // Clean local history helper
  const handleClearLocalHistory = () => {
    setHistory(prev => ({
      ...prev,
      [selectedDeviceId]: []
    }));
    setAnomalyLogs([]);
  };

  // Get current active device telemetry points
  const activeDeviceHistory = history[selectedDeviceId] || [];
  const currentDeviceState = devices.find(d => d.id === selectedDeviceId);

  // Stats calculation
  const totalAnomaliesCount = anomalyLogs.length;
  const currentStatus = activeDeviceHistory[activeDeviceHistory.length - 1]?.status || "Normal";

  return (
    <div className="space-y-6">
      
      {/* Top Controller Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Control Dashboard Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Edge Engine Controller
              </span>
              <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                isRunning 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse" 
                  : "bg-slate-950 border-slate-800 text-slate-500"
              }`}>
                {isRunning ? "SERVICE_ACTIVE" : "PAUSED"}
              </span>
            </div>

            {/* Select node to supervise */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-mono block">Selected Secure Node:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition-all"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[10px] text-slate-400">
                <span>Sampling Frequency:</span>
                <span className="text-emerald-400 font-bold">{samplingRate / 1000}s Interval</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="5000" 
                step="500"
                value={samplingRate}
                onChange={(e) => setSamplingRate(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* On-Off Core switches */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-pointer border transition-all ${
                  isRunning 
                    ? "bg-red-500/10 hover:bg-red-500/15 border-red-500/20 text-red-400" 
                    : "bg-emerald-500 hover:bg-emerald-400 border-transparent text-slate-950"
                }`}
              >
                {isRunning ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Pause Core Engine
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Start Core Engine
                  </>
                )}
              </button>

              <button
                onClick={handleClearLocalHistory}
                className="px-3.5 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-300 border border-slate-800 rounded-xl transition-all cursor-pointer"
                title="Flush Local Buffer Logs"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/60 text-[10.5px] text-slate-400 font-mono leading-relaxed space-y-1">
            <span className="text-slate-500 uppercase text-[9px] tracking-wider block font-bold">Local Topology Mode:</span>
            <p>Runs fully within browser sandbox space. Emulates Edge Zero-Trust container loop with cryptographic ledger syncing.</p>
          </div>
        </div>

        {/* Anomaly Simulation Controller */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Activity className="h-4 w-4 text-indigo-400 animate-pulse" />
              Real-Time Payload Simulation
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => setSimulationMode("normal")}
                className={`py-2 px-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  simulationMode === "normal"
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                }`}
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                <div className="text-left overflow-hidden">
                  <span className="text-[11px] font-bold block">Normal Cycle</span>
                  <span className="text-[8px] font-mono text-slate-500 block leading-none mt-0.5">Stable Heuristics</span>
                </div>
              </button>

              <button
                onClick={() => setSimulationMode("miner")}
                className={`py-2 px-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  simulationMode === "miner"
                    ? "bg-amber-500/10 border-amber-500/35 text-amber-400"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                }`}
              >
                <Cpu className="h-4 w-4 shrink-0" />
                <div className="text-left overflow-hidden">
                  <span className="text-[11px] font-bold block">Miner Script Payload</span>
                  <span className="text-[8px] font-mono text-slate-500 block leading-none mt-0.5">Trips: RULE_CPU_MINER</span>
                </div>
              </button>

              <button
                onClick={() => setSimulationMode("ddos")}
                className={`py-2 px-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  simulationMode === "ddos"
                    ? "bg-red-500/10 border-red-500/35 text-red-400"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                }`}
              >
                <Network className="h-4 w-4 shrink-0" />
                <div className="text-left overflow-hidden">
                  <span className="text-[11px] font-bold block">DDoS Flood Ingress</span>
                  <span className="text-[8px] font-mono text-slate-500 block leading-none mt-0.5">Trips: RULE_NET_DDOS</span>
                </div>
              </button>

              <button
                onClick={() => setSimulationMode("memory_leak")}
                className={`py-2 px-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  simulationMode === "memory_leak"
                    ? "bg-purple-500/10 border-purple-500/35 text-purple-400"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                }`}
              >
                <Database className="h-4 w-4 shrink-0" />
                <div className="text-left overflow-hidden">
                  <span className="text-[11px] font-bold block">Memory Buffer Leak</span>
                  <span className="text-[8px] font-mono text-slate-500 block leading-none mt-0.5">Trips: RULE_MEM_PRESSURE</span>
                </div>
              </button>

              <button
                onClick={() => setSimulationMode("thermal_failure")}
                className={`py-2 px-3 rounded-xl border text-left flex items-center gap-2 transition-all sm:col-span-2 cursor-pointer ${
                  simulationMode === "thermal_failure"
                    ? "bg-amber-600/15 border-amber-600/30 text-amber-500"
                    : "bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                }`}
              >
                <Thermometer className="h-4 w-4 shrink-0" />
                <div className="text-left overflow-hidden">
                  <span className="text-[11px] font-bold block">Motherboard cooling collapse</span>
                  <span className="text-[8px] font-mono text-slate-500 block leading-none mt-0.5">Trips: RULE_THERMAL_FAIL & Throttles CPU output</span>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl mt-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="text-[10px] font-mono text-indigo-300">
              Active Simulator Payload: <strong className="uppercase">{simulationMode.replace("_", " ")}</strong>
            </span>
          </div>
        </div>

        {/* Live Heuristic Status Board */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-indigo-400" />
              Edge Intelligence Status
            </span>

            {/* Massive Status Circular Ring */}
            <div className="flex items-center gap-4 py-1">
              <div className="relative shrink-0 flex items-center justify-center">
                <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${
                  currentStatus === "Anomaly" 
                    ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" 
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                }`}>
                  {currentStatus === "Anomaly" ? (
                    <ShieldAlert className="h-9 w-9 animate-bounce" style={{ animationDuration: "2s" }} />
                  ) : (
                    <CheckCircle className="h-9 w-9" />
                  )}
                </div>
              </div>

              <div className="text-left space-y-1 select-none">
                <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">Dynamic Assessment</span>
                <h4 className={`text-base font-extrabold tracking-tight ${
                  currentStatus === "Anomaly" ? "text-red-400" : "text-emerald-400"
                }`}>
                  {currentStatus === "Anomaly" ? "Anomaly Flagged" : "Edge Core Safe"}
                </h4>
                <p className="text-[10.5px] text-slate-400 leading-normal font-mono">
                  {currentStatus === "Anomaly" 
                    ? `Warning: Local rule check fail. Quarantine recommended.` 
                    : `Decentralized enclaves operating at stable latency parameters.`}
                </p>
              </div>
            </div>

            {/* Microstats */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-3">
              <div className="bg-slate-950/60 border border-slate-850 p-2 rounded-lg">
                <span className="text-[9px] text-slate-500 font-mono block">BUFFERED LOGS</span>
                <span className="text-sm font-extrabold text-slate-300 font-mono">{activeDeviceHistory.length}/15</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-850 p-2 rounded-lg">
                <span className="text-[9px] text-slate-500 font-mono block">ANOMALIES LOGGED</span>
                <span className="text-sm font-extrabold text-red-400 font-mono">{totalAnomaliesCount} times</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Live running graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              Live Edge Performance stream ({currentDeviceState?.name})
            </h4>
            <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
              Running telemetry metrics captured locally by in-browser worker simulator
            </p>
          </div>
          <div className="flex gap-2 text-[9px] font-mono">
            <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              CPU %
            </span>
            <span className="flex items-center gap-1 text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Memory %
            </span>
            <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Temp °C
            </span>
            <span className="flex items-center gap-1 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Net Traffic (MB/s)
            </span>
          </div>
        </div>

        {activeDeviceHistory.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-8 bg-slate-950/20 text-center select-none">
            <Activity className="h-8 w-8 text-slate-600 animate-pulse mb-3" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Telemetry Buffers Empty</span>
            <p className="text-[10.5px] text-slate-500 mt-1 max-w-sm">
              Start the Edge simulation engine or select another device node to begin monitoring live performance streams.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeDeviceHistory}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="time" 
                  stroke="#475569" 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <YAxis 
                  domain={[0, 110]} 
                  stroke="#475569" 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f1f5f9"
                  }}
                  itemStyle={{ color: "#818cf8" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  name="CPU Utilization %"
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={0.03} 
                  fill="#6366f1" 
                />
                <Area 
                  type="monotone" 
                  dataKey="memory" 
                  name="Memory Utilization %"
                  stroke="#a855f7" 
                  strokeWidth={2}
                  fillOpacity={0.03} 
                  fill="#a855f7" 
                />
                <Area 
                  type="monotone" 
                  dataKey="temperature" 
                  name="Motherboard Temp °C"
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fillOpacity={0.03} 
                  fill="#f59e0b" 
                />
                <Area 
                  type="monotone" 
                  dataKey="networkIn" 
                  name="Network Ingress (MB/s)"
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  fillOpacity={0.03} 
                  fill="#06b6d4" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Rules Engine and Detected Anomaly Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Local Heuristic Rules Evaluator */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Terminal className="h-4 w-4 text-emerald-400" />
              Decentralized Edge Heuristics (Zero-Trust Local Rules)
            </span>

            <div className="space-y-2.5">
              {rules.map(rule => {
                const latestMetric = activeDeviceHistory[activeDeviceHistory.length - 1];
                let val = 0;
                if (latestMetric) {
                  if (rule.field === "cpu") val = latestMetric.cpu;
                  else if (rule.field === "memory") val = latestMetric.memory;
                  else if (rule.field === "temperature") val = latestMetric.temperature;
                  else if (rule.field === "networkIn") val = latestMetric.networkIn;
                  else if (rule.field === "networkOut") val = latestMetric.networkOut;
                }

                const isTripped = latestMetric && val > rule.threshold;

                return (
                  <div key={rule.id} className={`p-3 rounded-xl border transition-all ${
                    isTripped 
                      ? "bg-red-500/5 border-red-500/25 text-red-200" 
                      : latestMetric 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-slate-300"
                        : "bg-slate-950/40 border-slate-850 text-slate-400"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold tracking-tight">
                        {rule.id}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isTripped 
                          ? "bg-red-500/20 text-red-400 animate-pulse" 
                          : latestMetric 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-slate-950/60 text-slate-500"
                      }`}>
                        {isTripped ? "RULE_TRIPPED" : latestMetric ? "RULE_PASSED" : "IDLE"}
                      </span>
                    </div>

                    <div className="mt-1.5">
                      <strong className="text-[11.5px] block font-semibold text-slate-200">{rule.title}</strong>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{rule.description}</p>
                    </div>

                    <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-slate-500 pt-1.5 border-t border-slate-800/40">
                      <span>Condition: {rule.field} {rule.operator} {rule.threshold}</span>
                      {latestMetric && (
                        <span>Current Evaluate: <strong className={isTripped ? "text-red-400" : "text-emerald-400"}>
                          {val}{rule.field === "temperature" ? "°C" : rule.field.startsWith("network") ? " MB/s" : "%"}
                        </strong></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Anomaly Logs Feed Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                Local Anomaly Alarm Feed
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                Self-contained container alerts
              </span>
            </div>

            <div className="space-y-2 h-[410px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {anomalyLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none border border-dashed border-slate-800/60 rounded-xl bg-slate-950/10">
                  <CheckCircle className="h-8 w-8 text-emerald-500/40 mb-2.5" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">No Anomalies Logged</span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                    Current environment heuristics are clean. Use the scenario payload simulator to inject threats.
                  </p>
                </div>
              ) : (
                anomalyLogs.map(anomaly => (
                  <div key={anomaly.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                        <span className="text-[10px] font-mono text-red-400 font-bold uppercase">
                          {anomaly.severity}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">
                        {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div>
                      <strong className="text-[11.5px] text-slate-200 block font-semibold leading-tight">
                        {anomaly.type === "RULE_CPU_MINER" ? "Cryptocurrency Mining Triggered" :
                         anomaly.type === "RULE_MEM_PRESSURE" ? "Memory Buffer Leak Risk" :
                         anomaly.type === "RULE_THERMAL_FAIL" ? "Hardware Thermal Failure" :
                         "DoS Traffic Surge Inbound"}
                      </strong>
                      <p className="text-[10px] font-mono text-indigo-300 mt-1">
                        Node: {anomaly.deviceName} | Signature: {anomaly.id}
                      </p>
                      <p className="text-[10.5px] text-slate-400 mt-1.5 leading-normal">
                        {anomaly.details}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
