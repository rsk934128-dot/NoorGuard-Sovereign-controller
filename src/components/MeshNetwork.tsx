import React, { useState } from "react";
import { NetworkNode, NetworkConnection } from "@/src/types";
import { Share2, RefreshCw, Radio, HardDrive, Shield } from "lucide-react";

interface MeshNetworkProps {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export default function MeshNetwork({ nodes, connections, onTriggerSync, isSyncing }: MeshNetworkProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeConns = selectedNode
    ? connections.filter(c => c.from === selectedNodeId || c.to === selectedNodeId)
    : [];

  return (
    <div id="mesh-network-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Sovereign Mesh Linkage Topology</h3>
            <p className="text-xs text-slate-400">Offline P2P Decentralized Encryption Grid</p>
          </div>
        </div>

        <button
          onClick={onTriggerSync}
          disabled={isSyncing}
          className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Mesh..." : "Force Sync Grid"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Topology Map Canvas (SVG) */}
        <div className="lg:col-span-2 bg-slate-950 rounded-xl border border-slate-800/80 p-3 h-72 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* SVG Canvas */}
          <svg className="w-full h-full" viewBox="0 0 500 240">
            {/* Draw Links */}
            {connections.map((conn, idx) => {
              const nodeFrom = nodes.find(n => n.id === conn.from);
              const nodeTo = nodes.find(n => n.id === conn.to);
              if (!nodeFrom || !nodeTo) return null;

              const isWarning = conn.status === "warning";
              const isEncrypted = conn.status === "encrypted";

              // Color mapping
              const strokeColor = isWarning ? "#ef4444" : isEncrypted ? "#6366f1" : "#10b981";
              
              return (
                <g key={`conn-${idx}`}>
                  {/* Outer glowing path */}
                  <line
                    x1={nodeFrom.x}
                    y1={nodeFrom.y}
                    x2={nodeTo.x}
                    y2={nodeTo.y}
                    stroke={strokeColor}
                    strokeWidth={isWarning ? 3 : 2}
                    className={isWarning ? "opacity-30" : "opacity-15"}
                  />
                  {/* Dynamic pulse / moving packet simulation */}
                  <line
                    x1={nodeFrom.x}
                    y1={nodeFrom.y}
                    x2={nodeTo.x}
                    y2={nodeTo.y}
                    stroke={strokeColor}
                    strokeWidth={1.5}
                    strokeDasharray="8, 20"
                    strokeDashoffset={isSyncing ? (idx % 2 === 0 ? "100" : "-100") : "0"}
                    className={isSyncing ? "animate-[dash_3s_linear_infinite]" : "opacity-80"}
                  />
                </g>
              );
            })}

            {/* Draw Nodes */}
            {nodes.map(node => {
              const isSelected = node.id === selectedNodeId;
              const isAlert = node.status === "Alert";
              const isRestricted = node.status === "Restricted";

              // Color mapping
              const fillColor = isAlert 
                ? "fill-red-500" 
                : isRestricted 
                ? "fill-amber-500" 
                : "fill-emerald-500";
              const pulseColor = isAlert 
                ? "border-red-500 bg-red-500" 
                : isRestricted 
                ? "border-amber-500 bg-amber-500" 
                : "border-emerald-500 bg-emerald-500";

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                >
                  {/* Ring highlight on select */}
                  {isSelected && (
                    <circle r={14} className="fill-none stroke-indigo-400 stroke-2 animate-ping" />
                  )}

                  {/* Node outer pulse */}
                  <circle r={9} className="fill-none stroke-slate-700 stroke-1 opacity-70 group-hover:stroke-slate-400" />
                  
                  {/* Main Node Circle */}
                  <circle r={6} className={`${fillColor} transition-colors duration-200`} />

                  {/* Tooltip text anchor */}
                  <text
                    y={-14}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-slate-300 font-semibold opacity-70 group-hover:opacity-100 transition-opacity"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Canvas Help Legend */}
          <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-400 flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Safe</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span> Restricted</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span> Encrypted P2P</span>
          </div>
        </div>

        {/* Selected Link Info Panels */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5" />
              Peer Diagnostic Panel
            </h4>

            {selectedNode ? (
              <div className="space-y-3">
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200">{selectedNode.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      selectedNode.status === "Safe" 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {selectedNode.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">Node Type: {selectedNode.type}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Active Links ({selectedNodeConns.length})</span>
                  {selectedNodeConns.length > 0 ? (
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                      {selectedNodeConns.map((conn, i) => {
                        const targetNodeId = conn.from === selectedNodeId ? conn.to : conn.from;
                        const targetNode = nodes.find(n => n.id === targetNodeId);
                        return (
                          <div key={i} className="flex items-center justify-between bg-slate-900/40 p-1.5 rounded text-[11px] border border-slate-800/40 font-mono">
                            <span className="text-slate-300">↔ {targetNode?.name || targetNodeId}</span>
                            <span className="text-indigo-400 text-xs">{conn.latency} ms</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">No active adjacent links configured.</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
                <HardDrive className="h-8 w-8 mb-2 stroke-1 opacity-50" />
                <p className="text-xs">Click a node on the SVG grid map to run deep packet tracing diagnostics.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center gap-2 text-[10px] text-slate-400">
            <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>P2P cryptographic validation is active globally across mesh links.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
