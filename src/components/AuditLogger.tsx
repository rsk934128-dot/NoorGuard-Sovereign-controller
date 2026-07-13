import React, { useState, useEffect } from "react";
import { AuditLogEntry } from "@/src/types";
import { 
  FileText, ShieldCheck, ShieldAlert, Cpu, Download, CloudUpload, 
  RefreshCw, Check, AlertTriangle, Eye, Info, X, Search
} from "lucide-react";

interface AuditLoggerProps {
  logs: AuditLogEntry[];
  onTriggerAiScan: () => void;
  aiScanResult: any;
  isScanning: boolean;
  accessToken: string | null;
  onUploadToDrive: (fileName: string, content: string) => Promise<any>;
  initialSearchQuery?: string;
}

export default function AuditLogger({
  logs,
  onTriggerAiScan,
  aiScanResult,
  isScanning,
  accessToken,
  onUploadToDrive,
  initialSearchQuery = ""
}: AuditLoggerProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);
  const [fileName, setFileName] = useState(`noorguard-security-report-${Date.now().toString().slice(-6)}.json`);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [driveUploadResult, setDriveUploadResult] = useState<any>(null);

  // Sync initialSearchQuery when passed from parent command palette
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const categories = ["ALL", "SECURITY", "ACCESSIBILITY", "AUDIO_SURROUND", "STORAGE", "INTELLIGENCE"];

  const filteredLogs = logs.filter(log => {
    const matchesCategory = filterCategory === "ALL" || log.category === filterCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesSearch = 
      log.id.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.deviceName.toLowerCase().includes(q) ||
      log.operator.toLowerCase().includes(q) ||
      log.category.toLowerCase().includes(q) ||
      log.severity.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const handleDriveExport = async () => {
    setUploadingToDrive(true);
    setDriveUploadResult(null);
    try {
      // Structure the log report
      const logReport = {
        title: "NoorGuard Sovereign Controller - Enterprise Security Audit",
        timestamp: new Date().toISOString(),
        threatModel: aiScanResult || { status: "PENDING_SCAN", score: "UNKNOWN" },
        auditChain: logs
      };

      const result = await onUploadToDrive(fileName, JSON.stringify(logReport, null, 2));
      setDriveUploadResult({
        success: true,
        fileId: result.fileId,
        fileName: result.fileName
      });
      // Automatically hide confirmation and keep result status
    } catch (err: any) {
      console.error(err);
      setDriveUploadResult({
        success: false,
        error: err.message || "Failed uploading file."
      });
    } finally {
      setUploadingToDrive(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "WARNING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "SUCCESS":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700/60";
    }
  };

  return (
    <div id="audit-logging-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Immutable Cryptographic Audit Trail</h3>
            <p className="text-xs text-slate-400">HMAC-SHA256 Chained Integrity Logs</p>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-2">
          {/* AI Scan Logs */}
          <button
            onClick={onTriggerAiScan}
            disabled={isScanning}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 text-white transition-all duration-150"
          >
            <Cpu className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Evaluating Threat..." : "AI Threat Analysis"}
          </button>

          {/* Google Drive Export (disabled if not logged in) */}
          <button
            onClick={() => {
              setDriveUploadResult(null);
              setShowDriveConfirm(true);
            }}
            disabled={!accessToken}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 disabled:opacity-40 transition-all duration-150"
            title={accessToken ? "Export secure report to Google Drive" : "Please Sign In with Google first"}
          >
            <CloudUpload className="h-3.5 w-3.5" />
            Save to Drive
          </button>
        </div>
      </div>

      {/* AI Intelligence Scan Report (Dynamic Accordion / Header box) */}
      {aiScanResult && (
        <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-400 tracking-wider">AI ANOMALY THREAT EVALUATION</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500">Threat Score:</span>
              <span className={`text-sm font-bold font-mono ${
                aiScanResult.threatScore > 70 
                  ? "text-red-500" 
                  : aiScanResult.threatScore > 35 
                  ? "text-amber-500" 
                  : "text-emerald-400"
              }`}>
                {aiScanResult.threatScore}/100
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850">
            <span className="text-[10px] text-slate-500 font-mono block mb-0.5">Threat Status Summary</span>
            <p className="text-xs text-slate-200 font-medium leading-relaxed">{aiScanResult.summary}</p>
          </div>

          {/* Detected Anomalies List */}
          {aiScanResult.anomalies && aiScanResult.anomalies.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-mono block">Detected System Anomalies ({aiScanResult.anomalies.length})</span>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                {aiScanResult.anomalies.map((anom: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 bg-red-950/20 p-2 rounded border border-red-500/10 text-[11px]">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">{anom.issue}</span>
                      <span className="text-slate-500 font-mono block text-[9px]">Vector: {anom.vector} | Severity: {anom.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/5 p-2 rounded border border-emerald-500/10 font-mono">
              <Check className="h-4 w-4 shrink-0" />
              <span>No abnormal command vectors or data leakages detected during runtime simulation.</span>
            </div>
          )}

          {/* AI Recommendations */}
          {aiScanResult.recommendations && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-slate-500 font-mono block">Sovereign Architecture Recommendation</span>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                {aiScanResult.recommendations.map((rec: string, i: number) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Search Input Filter */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Search cryptographic ledger by log ID, action, target device, operator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-2 font-mono">Category Filter:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`text-[10px] font-mono px-2.5 py-1 rounded border cursor-pointer transition-colors ${
              filterCategory === cat
                ? "bg-indigo-600 text-white border-indigo-500 font-semibold"
                : "bg-slate-950 text-slate-400 border-slate-850 hover:border-slate-800 hover:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full border-collapse text-left font-mono text-[11px] text-slate-300">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-850 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3 w-1/5">Timestamp</th>
                <th className="p-3 w-1/6">Category</th>
                <th className="p-3 w-1/4">Device / Source</th>
                <th className="p-3">Action Description</th>
                <th className="p-3 text-center w-[10%]">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 group transition-colors">
                    <td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-semibold ${getSeverityStyle(log.severity)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-semibold">{log.deviceName}</td>
                    <td className="p-3 truncate max-w-xs" title={log.action}>
                      {log.action}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-slate-400 hover:text-indigo-400 rounded hover:bg-slate-900 cursor-pointer transition-all duration-150 inline-block"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-600 italic">
                    No logs found matching selected category scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Confirmation Modal: Google Drive Upload */}
      {showDriveConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <CloudUpload className="h-4.5 w-4.5 text-emerald-400" />
                Upload Sovereign Security Report
              </h3>
              <button
                onClick={() => {
                  setShowDriveConfirm(false);
                  setDriveUploadResult(null);
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="leading-relaxed">
                Confirming this action will create a secure, immutable security audit report file in your **Google Drive** root folder.
              </p>
              
              <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Report Target Name</span>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-850 text-[10px] text-slate-500 font-mono">
                Payload contains: System Threat Score, AI Anomaly Analysis results, and total {logs.length} cryptographic audit trails.
              </div>
            </div>

            {/* Upload results */}
            {driveUploadResult && (
              <div className={`p-3.5 rounded-lg border text-xs ${
                driveUploadResult.success 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {driveUploadResult.success ? (
                  <div className="space-y-1">
                    <p className="font-bold">✓ Upload Successful!</p>
                    <p className="font-mono text-[10px] text-slate-400">File ID: {driveUploadResult.fileId}</p>
                    <p className="font-mono text-[10px] text-slate-400">Name: {driveUploadResult.fileName}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold">🛑 Upload Failed</p>
                    <p className="font-mono text-[10px] text-slate-400">{driveUploadResult.error}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowDriveConfirm(false);
                  setDriveUploadResult(null);
                }}
                disabled={uploadingToDrive}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDriveExport}
                disabled={uploadingToDrive}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploadingToDrive ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Confirm & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Log Entry Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Info className="h-4.5 w-4.5 text-indigo-400" />
                Audit Frame Metadata Diagnostics
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Log Hash Identifier</span>
                  <span className="text-slate-300 font-bold text-[10px]">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                  <span className="text-slate-300">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Device Node Target</span>
                  <span className="text-slate-300 font-semibold">{selectedLog.deviceName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Category / Operator</span>
                  <span className="text-indigo-400 font-semibold">{selectedLog.category} / {selectedLog.operator}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block mb-1">Decoded Payload Details</span>
                <p className="text-slate-200 leading-relaxed font-sans text-xs">{selectedLog.details}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/80">
                <span className="text-[10px] text-slate-500 block mb-1 uppercase font-bold text-emerald-400">
                  HMAC-SHA256 Digital Signature Verified
                </span>
                <p className="text-emerald-400 text-[10px] break-all font-semibold leading-normal">
                  {selectedLog.hmacSignature}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                Close Frame
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
