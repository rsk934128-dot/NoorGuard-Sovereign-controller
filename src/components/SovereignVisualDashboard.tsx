import React, { useMemo } from "react";
import { AuditLogEntry, Device } from "@/src/types";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area
} from "recharts";
import { Shield, ShieldAlert, ShieldCheck, Activity, Zap, AlertTriangle, TrendingUp, Cpu } from "lucide-react";
import { motion } from "motion/react";

interface SovereignVisualDashboardProps {
  logs: AuditLogEntry[];
  devices: Device[];
  aiScanResult: any;
}

export default function SovereignVisualDashboard({ logs, devices, aiScanResult }: SovereignVisualDashboardProps) {
  
  // Calculate dynamic stats based on real-time log history
  const dashboardStats = useMemo(() => {
    // 1. Calculate a dynamic, rolling Threat Index from current active logs
    // Base threat starts at 10. If we have recent alerts, warnings or quarantined devices, it goes up.
    let baseThreat = 12;

    // Weight active device states
    devices.forEach(dev => {
      if (dev.status === "Restricted") baseThreat += 8; // quarantined node
      if (dev.accessibilityActive) baseThreat += 12; // active automation tunnel
      if (dev.micMonitoringActive) baseThreat += 10; // mic channel listening
    });

    // Weight recent log events (last 15 logs)
    const recentLogs = logs.slice(0, 15);
    recentLogs.forEach(log => {
      if (log.severity === "CRITICAL") baseThreat += 15;
      if (log.severity === "WARNING") baseThreat += 8;
      if (log.severity === "SUCCESS") baseThreat -= 2;
    });

    // Normalize between 0 and 100
    const currentThreatScore = Math.min(Math.max(baseThreat, 5), 98);

    // 2. Map Category distribution for the BarChart
    const categoriesMap: Record<string, number> = {
      SECURITY: 0,
      ACCESSIBILITY: 0,
      STORAGE: 0,
      INTELLIGENCE: 0,
      AUDIO_SURROUND: 0
    };
    
    logs.forEach(log => {
      if (categoriesMap[log.category] !== undefined) {
        categoriesMap[log.category]++;
      } else {
        categoriesMap[log.category] = 1;
      }
    });

    const categoryData = Object.keys(categoriesMap).map(key => ({
      name: key.replace("_", " "),
      count: categoriesMap[key]
    }));

    // 3. Map Severity distribution for the PieChart
    const severitiesMap: Record<string, number> = {
      INFO: 0,
      SUCCESS: 0,
      WARNING: 0,
      CRITICAL: 0
    };

    logs.forEach(log => {
      if (severitiesMap[log.severity] !== undefined) {
        severitiesMap[log.severity]++;
      }
    });

    const severityData = Object.keys(severitiesMap).map(key => ({
      name: key,
      value: severitiesMap[key] || 0.1 // avoid division by zero or completely empty slices
    })).filter(item => item.value > 0);

    // 4. Build rolling Threat Timeline Chart data
    // We parse logs from oldest to newest to plot how threat index shifted with each event.
    let runningThreat = 15;
    const sortedLogs = [...logs].reverse().slice(-12); // last 12 historical events
    
    const timelineData = sortedLogs.map((log, index) => {
      if (log.severity === "CRITICAL") runningThreat += 18;
      else if (log.severity === "WARNING") runningThreat += 10;
      else if (log.severity === "SUCCESS") runningThreat -= 4;
      else runningThreat += 1;

      runningThreat = Math.min(Math.max(runningThreat, 8), 95);
      
      const timeString = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        id: log.id,
        time: timeString,
        threat: runningThreat,
        event: log.action.length > 25 ? log.action.substring(0, 25) + "..." : log.action
      };
    });

    // If we don't have enough timeline points, let's bootstrap some initial steady points
    if (timelineData.length === 0) {
      timelineData.push({ id: "init", time: "00:00:00", threat: 15, event: "Initialization" });
    }

    return {
      currentThreatScore,
      categoryData,
      severityData,
      timelineData
    };
  }, [logs, devices]);

  // Status mapping
  const getThreatLabel = (score: number) => {
    if (score < 25) return { text: "SECURE (OMNI-GREEN)", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <ShieldCheck className="h-5 w-5 text-emerald-400" /> };
    if (score < 50) return { text: "MONITORING (ACTIVE)", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: <Activity className="h-5 w-5 text-indigo-400 animate-pulse" /> };
    if (score < 75) return { text: "ELEVATED RISK (RESTRICTED)", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <AlertTriangle className="h-5 w-5 text-amber-400 animate-bounce" /> };
    return { text: "CRITICAL BREACH THREAT", color: "text-red-400 bg-red-500/10 border-red-500/20 animate-pulse", icon: <ShieldAlert className="h-5 w-5 text-red-400" /> };
  };

  const threatLabel = getThreatLabel(dashboardStats.currentThreatScore);

  // Custom colors for charts
  const severityColors: Record<string, string> = {
    SUCCESS: "#10b981", // Emerald
    INFO: "#38bdf8",    // Sky
    WARNING: "#f59e0b", // Amber
    CRITICAL: "#ef4444" // Red
  };

  const categoryColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

  return (
    <div id="sovereign-visual-dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Metric Dial Summary Enclave */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Threat Assessment Engine
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-slate-800/80">
              Live Heuristics
            </span>
          </div>

          {/* Large dynamic Threat Meter display */}
          <div className="text-center py-6">
            <div className="relative inline-flex items-center justify-center">
              {/* Circular track border */}
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-slate-800/80"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="transition-all duration-1000 ease-out"
                  stroke={
                    dashboardStats.currentThreatScore < 25 ? "#10b981" : 
                    dashboardStats.currentThreatScore < 50 ? "#6366f1" : 
                    dashboardStats.currentThreatScore < 75 ? "#f59e0b" : "#ef4444"
                  }
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 62}`}
                  strokeDashoffset={`${2 * Math.PI * 62 * (1 - dashboardStats.currentThreatScore / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold font-display tracking-tight text-slate-50">
                  {dashboardStats.currentThreatScore}
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                  Threat Index
                </span>
              </div>
            </div>
          </div>

          {/* Current Threat Classification badge */}
          <div className={`mt-2 p-3 rounded-xl border flex items-center gap-2.5 ${threatLabel.color}`}>
            {threatLabel.icon}
            <div>
              <span className="text-[10px] text-slate-400 font-mono block font-semibold leading-none">Security Rating</span>
              <strong className="text-xs sm:text-sm font-bold tracking-tight block mt-1">{threatLabel.text}</strong>
            </div>
          </div>
        </div>

        {/* Quick dynamic assessment recommendations */}
        <div className="mt-5 pt-4 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono space-y-2">
          <div className="flex items-start gap-1.5">
            <Zap className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              {dashboardStats.currentThreatScore < 25 
                ? "Cryptographic linkages verified. Secure enclaves operating cleanly."
                : dashboardStats.currentThreatScore < 50 
                  ? "Slight privilege creep detected. Review active accessibility channels."
                  : "Quarantine triggered or active alerts logged. Initiate a Supervisor System Audit."}
            </span>
          </div>
          {aiScanResult && aiScanResult.recommendations && (
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-850 text-[10px] text-indigo-300 mt-2">
              <strong className="block text-slate-400 mb-1 uppercase text-[9px] tracking-wider">AI RECOMMENDATION:</strong>
              {aiScanResult.recommendations[0]}
            </div>
          )}
        </div>

      </div>

      {/* 2. Threat Vector Trend Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between lg:col-span-2">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Real-Time Security Threat Timeline
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              <span>Continuous Tracking</span>
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-52 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dashboardStats.timelineData}
                margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="time" 
                  stroke="#475569" 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <YAxis 
                  domain={[0, 100]} 
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
                  formatter={(value: any, name: any, props: any) => [
                    `${value}/100`, 
                    `Threat Index (Event: ${props.payload.event})`
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="threat" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorThreat)" 
                  activeDot={{ r: 6, stroke: '#818cf8', strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Timeline Insight Footer */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-800/60 mt-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
            <span>Latest:</span>
            <strong className="text-slate-300">
              {dashboardStats.timelineData[dashboardStats.timelineData.length - 1]?.event || "No events logged"}
            </strong>
          </div>
          <span className="text-[9px] text-slate-500">
            Plot updates as system events change
          </span>
        </div>
      </div>

      {/* 3. Vulnerability Distribution Charts Row */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
        
        {/* Category Distribution BarChart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Logs Distribution by Security Category
            </span>
            <span className="text-[9px] font-mono text-indigo-400">Mesh Log Frequency</span>
          </div>

          <div className="h-44 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboardStats.categoryData}
                margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <YAxis 
                  stroke="#475569" 
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f1f5f9"
                  }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {dashboardStats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution PieChart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Audit Entry Severity Profiler
            </span>
            <span className="text-[9px] font-mono text-indigo-400">Proportional Threat Shares</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-1">
            {/* PieChart container */}
            <div className="h-36 w-36 text-xs font-mono relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardStats.severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dashboardStats.severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={severityColors[entry.name] || "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      color: "#f1f5f9"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Shield className="h-4.5 w-4.5 text-slate-500" />
                <span className="text-[8px] font-mono text-slate-500 font-bold uppercase mt-0.5">Sovereign</span>
              </div>
            </div>

            {/* Custom Legend to make it extremely beautiful */}
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 text-[10px] font-mono w-full max-w-[200px]">
              {dashboardStats.severityData.map((item) => {
                const percentage = logs.length > 0 
                  ? Math.round((item.value / logs.length) * 100) 
                  : 0;

                return (
                  <div key={item.name} className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded border border-slate-850">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-2.5 h-2.5 rounded-sm shrink-0" 
                        style={{ backgroundColor: severityColors[item.name] || "#6366f1" }} 
                      />
                      <span className="text-slate-300 font-medium">{item.name}</span>
                    </div>
                    <span className="text-slate-500 font-bold">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
