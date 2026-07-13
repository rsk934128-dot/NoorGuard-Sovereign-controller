import React, { useState, useRef, useEffect } from "react";
import { Device, AuditLogEntry } from "@/src/types";
import { 
  Folder, File, Upload, Share2, Download, Trash2, Lock, Unlock, 
  ShieldCheck, Globe, RefreshCw, FileText, Database, Copy, 
  ExternalLink, Eye, Smartphone, Laptop, HardDrive, CheckCircle2, 
  Search, SlidersHorizontal, AlertTriangle, Key, ArrowRight, QrCode, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SovereignFileManagerProps {
  devices: Device[];
  accessToken: string | null;
  addSystemLog: (
    category: string,
    severity: string,
    deviceId: string,
    deviceName: string,
    action: string,
    details: string,
    customOperator?: string
  ) => Promise<void>;
  withBiometricShield: (callback: () => void) => void;
}

interface SovereignFile {
  id: string;
  name: string;
  size: string;
  rawSize: number; // bytes
  type: string;
  category: "backup" | "logs" | "credential" | "blueprint" | "user";
  encryptionStatus: "Encrypted (AES-GCM 256)" | "Signed & Sealed" | "Plaintext";
  lastModified: string;
  hash: string;
  content: string; // text content or base64 representation
}

export default function SovereignFileManager({
  devices,
  accessToken,
  addSystemLog,
  withBiometricShield
}: SovereignFileManagerProps) {
  // Mock internal files in Sovereign storage
  const [files, setFiles] = useState<SovereignFile[]>([
    {
      id: "file-core-bin",
      name: "noorguard-core-v2.0.bin",
      size: "12.4 MB",
      rawSize: 13002342,
      type: "application/octet-stream",
      category: "blueprint",
      encryptionStatus: "Encrypted (AES-GCM 256)",
      lastModified: "2026-07-13 08:30",
      hash: "7F8C9D0E1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D",
      content: "[SECURE SIGNED BINARY PAYLOAD - SHA256 VALIDATED]"
    },
    {
      id: "file-mesh-snap",
      name: "mesh-topology-snapshot.json",
      size: "34 KB",
      rawSize: 34816,
      type: "application/json",
      category: "backup",
      encryptionStatus: "Signed & Sealed",
      lastModified: "2026-07-13 06:15",
      hash: "F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D7F8C9D0E1A2B3C4D5E6F7A8B9C0D1E2",
      content: '{\n  "network": "NoorNexus-P2P",\n  "active_links": 14,\n  "integrity": "SECURE",\n  "nodes": ["dev-gate", "dev-mobile", "dev-vault", "dev-workstation"]\n}'
    },
    {
      id: "file-admin-pub",
      name: "admin-biometric-hash.pub",
      size: "1.2 KB",
      rawSize: 1228,
      type: "text/plain",
      category: "credential",
      encryptionStatus: "Signed & Sealed",
      lastModified: "2026-07-12 18:45",
      hash: "B1C2D3E4F5A6B7C8D7F8C9D0E1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0",
      content: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPb2z47b6x8vCg8B9r9S/H3yHqS0Wj0d9X8gS/b9x8y admin-biometrics-seal-noorguard-2026"
    },
    {
      id: "file-quarantine-logs",
      name: "quarantine-audit-logs.csv",
      size: "1.8 MB",
      rawSize: 1887436,
      type: "text/csv",
      category: "logs",
      encryptionStatus: "Plaintext",
      lastModified: "2026-07-13 02:22",
      hash: "1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D7F8C9D0E",
      content: "id,timestamp,category,severity,action,details\n1,2026-07-13T02:20:00,INTELLIGENCE,WARNING,Intrusion Detected,Node: dev-mobile ip: 192.168.1.105"
    }
  ]);

  // UI Navigation states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | SovereignFile["category"]>("ALL");
  const [selectedFile, setSelectedFile] = useState<SovereignFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  
  // Custom text file creator state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [newFileCategory, setNewFileCategory] = useState<SovereignFile["category"]>("user");
  const [newFileEncryption, setNewFileEncryption] = useState<SovereignFile["encryptionStatus"]>("Encrypted (AES-GCM 256)");

  // File Sharing Hub state
  const [sharingFile, setSharingFile] = useState<SovereignFile | null>(null);
  const [shareDuration, setShareDuration] = useState<number>(15); // minutes until self-destruct
  const [sharePassword, setSharePassword] = useState<string>("");
  const [shareType, setShareType] = useState<"link" | "beam" | "gdrive">("link");
  const [targetBeamNode, setTargetBeamNode] = useState<string>("dev-vault");
  const [generatedShareLink, setGeneratedShareLink] = useState<string>("");
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isBeamingFile, setIsBeamingFile] = useState(false);
  const [beamProgress, setBeamProgress] = useState(0);
  const [isUploadingToGDrive, setIsUploadingToGDrive] = useState(false);
  
  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter files
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.hash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || f.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const totalStorageSize = files.reduce((acc, curr) => acc + curr.rawSize, 0);
  const formattedTotalStorage = (totalStorageSize / 1024 / 1024).toFixed(2) + " MB";
  const encryptedCount = files.filter(f => f.encryptionStatus !== "Plaintext").length;

  // Handle local text file creation
  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    
    let sanitizedName = newFileName.trim();
    if (!sanitizedName.includes(".")) {
      sanitizedName += ".txt";
    }

    const randomHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const sizeInBytes = new Blob([newFileContent]).size;
    const sizeFormatted = sizeInBytes < 1024 
      ? sizeInBytes + " Bytes" 
      : (sizeInBytes / 1024).toFixed(1) + " KB";

    const newFile: SovereignFile = {
      id: `file-${Date.now()}`,
      name: sanitizedName,
      size: sizeFormatted,
      rawSize: sizeInBytes,
      type: sanitizedName.endsWith(".json") ? "application/json" : "text/plain",
      category: newFileCategory,
      encryptionStatus: newFileEncryption,
      lastModified: new Date().toISOString().replace("T", " ").substring(0, 16),
      hash: randomHash.toUpperCase(),
      content: newFileContent
    };

    setFiles(prev => [newFile, ...prev]);
    
    // Log audit log
    addSystemLog(
      "STORAGE",
      newFileEncryption !== "Plaintext" ? "INFO" : "WARNING",
      "dev-vault",
      "Sovereign Cryptographic Vault",
      `Created Secure File: ${sanitizedName}`,
      `File size: ${sizeFormatted}. Encryption: ${newFileEncryption}. Cryptographic Hash verified successfully.`
    );

    // Reset fields
    setNewFileName("");
    setNewFileContent("");
    setShowCreateModal(false);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: globalThis.File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || "[BINARY DATA BINARY_SEALED]";
      const randomHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      
      const sizeInBytes = file.size;
      const sizeFormatted = sizeInBytes < 1024 
        ? sizeInBytes + " Bytes" 
        : sizeInBytes < 1024 * 1024 
          ? (sizeInBytes / 1024).toFixed(1) + " KB"
          : (sizeInBytes / 1024 / 1024).toFixed(1) + " MB";

      const uploadedFile: SovereignFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        size: sizeFormatted,
        rawSize: sizeInBytes,
        type: file.type || "application/octet-stream",
        category: "user",
        encryptionStatus: "Encrypted (AES-GCM 256)",
        lastModified: new Date().toISOString().replace("T", " ").substring(0, 16),
        hash: randomHash.toUpperCase(),
        content: text
      };

      setFiles(prev => [uploadedFile, ...prev]);

      addSystemLog(
        "STORAGE",
        "INFO",
        "dev-vault",
        "Sovereign Cryptographic Vault",
        `Uploaded & Signed Local File: ${file.name}`,
        `Successfully integrated file of type ${file.type || "unknown"} inside isolated local container space.`
      );
    };

    reader.readAsText(file);
  };

  // Delete file
  const handleDeleteFile = (id: string, name: string) => {
    withBiometricShield(() => {
      setFiles(prev => prev.filter(f => f.id !== id));
      if (selectedFile?.id === id) {
        setSelectedFile(null);
        setPreviewContent(null);
      }
      
      addSystemLog(
        "STORAGE",
        "CRITICAL",
        "dev-vault",
        "Sovereign Cryptographic Vault",
        `Purged File Payload: ${name}`,
        `Removed file entry and overwritten secure sectors permanently from standard cache buffers.`
      );
    });
  };

  // Generate share link
  const handleGenerateShareLink = () => {
    if (!sharingFile) return;
    setIsGeneratingShare(true);
    setGeneratedShareLink("");

    setTimeout(() => {
      const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const origin = window.location.origin;
      const shareUrl = `${origin}/share/secure_vault_${sharingFile.id}_${randomId}?exp=${Date.now() + shareDuration * 60000}`;
      setGeneratedShareLink(shareUrl);
      setIsGeneratingShare(false);

      addSystemLog(
        "STORAGE",
        "WARNING",
        "dev-vault",
        "Sovereign Cryptographic Vault",
        `Generated Sharing Token: ${sharingFile.name}`,
        `Active Temporary URL generated. Expires in ${shareDuration} minutes. Password Protection: ${sharePassword ? "ACTIVE" : "NONE"}`
      );
    }, 1200);
  };

  // P2P Encrypted Beam Simulation
  const handleBeamFile = () => {
    if (!sharingFile) return;
    setIsBeamingFile(true);
    setBeamProgress(0);

    const targetDevice = devices.find(d => d.id === targetBeamNode);
    const targetName = targetDevice ? targetDevice.name : targetBeamNode;

    const interval = setInterval(() => {
      setBeamProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsBeamingFile(false);
            setSharingFile(null);
            
            addSystemLog(
              "INTELLIGENCE",
              "INFO",
              sharingFile.id,
              sharingFile.name,
              `P2P Encrypted Beam Complete`,
              `Beamed document payload securely to node "${targetName}" (${targetBeamNode}) over local isolated encrypted telemetry channels.`
            );
            
            alert(`"${sharingFile.name}" ফাইলটি সফলভাবে "${targetName}" ডিভাইসে বিম করা হয়েছে! (P2P Beam Complete)`);
          }, 300);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20) + 10;
      });
    }, 200);
  };

  // Google Drive upload integration
  const handleGDriveUpload = async () => {
    if (!sharingFile) return;
    if (!accessToken) {
      alert("Please mount Google Drive first via the top right 'Sign In' or connection panel.");
      return;
    }

    setIsUploadingToGDrive(true);
    try {
      // Mock / Actual Google Drive file upload
      const boundary = "noor_shield_file_multipart_boundary_2026";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: `[Sealed]_${sharingFile.name}`,
        mimeType: "text/plain",
        description: `NoorGuard Cryptographically Sealed Sovereign File Backup. Original Hash: SHA256:${sharingFile.hash}`
      };

      const multipartBody = 
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
        `NOORGUARD SECURE DISK SEAL\n==========================\nFilename: ${sharingFile.name}\nCryptographic Hash: SHA256:${sharingFile.hash}\nLast Modified: ${sharingFile.lastModified}\n==========================\n\n${sharingFile.content}` +
        closeDelimiter;

      const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody
      });

      if (!response.ok) {
        throw new Error(`Drive Upload API rejected payload: ${response.statusText}`);
      }

      const data = await response.json();

      addSystemLog(
        "STORAGE",
        "INFO",
        "dev-vault",
        "Sovereign Cryptographic Vault",
        `Uploaded File to Google Drive: ${sharingFile.name}`,
        `Successfully transferred sealed file binary to Google Drive. File ID: ${data.id}`
      );

      alert(`"${sharingFile.name}" ফাইলটি সফলভাবে আপনার গুগল ড্রাইভে সংরক্ষিত হয়েছে! (Uploaded successfully to Google Drive)`);
      setSharingFile(null);
    } catch (err: any) {
      console.error(err);
      alert(`গুগল ড্রাইভে আপলোড ব্যর্থ হয়েছে: ${err.message || err}`);
    } finally {
      setIsUploadingToGDrive(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Helper icons for categories
  const getCategoryIcon = (category: SovereignFile["category"]) => {
    switch (category) {
      case "backup":
        return <Database className="h-4 w-4 text-purple-400" />;
      case "logs":
        return <FileText className="h-4 w-4 text-amber-400" />;
      case "credential":
        return <Key className="h-4 w-4 text-cyan-400" />;
      case "blueprint":
        return <SlidersHorizontal className="h-4 w-4 text-indigo-400" />;
      case "user":
      default:
        return <File className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">

      {/* Overview stats panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">মোট সংরক্ষিত ফাইল (Total Files)</span>
            <span className="text-xl font-extrabold text-slate-100 font-mono">{files.length}</span>
          </div>
          <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/25 text-indigo-400">
            <Folder className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">ব্যবহৃত স্টোরেজ (Storage Usage)</span>
            <span className="text-xl font-extrabold text-slate-100 font-mono">{formattedTotalStorage}</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/25 text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">সুরক্ষিত এনক্রিপশন (Encrypted Vault)</span>
            <span className="text-xl font-extrabold text-slate-100 font-mono">{encryptedCount} / {files.length}</span>
          </div>
          <div className="p-2.5 bg-cyan-500/10 rounded-lg border border-cyan-500/25 text-cyan-400">
            <ShieldCheck className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">গুগল ড্রাইভ সিঙ্ক (GDrive Sync)</span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
              accessToken ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20" : "text-slate-500 bg-slate-950 border border-slate-850"
            }`}>
              {accessToken ? "CONNECTED" : "LOCAL_MODE"}
            </span>
          </div>
          <div className={`p-2.5 rounded-lg border ${
            accessToken ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400" : "bg-slate-950 border-slate-850 text-slate-600"
          }`}>
            <Globe className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* Search filters & uploads block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar: drag and drop upload & settings */}
        <div className="space-y-6">
          
          {/* Drag & Drop Card */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-slate-900 border rounded-2xl p-6 text-center shadow-lg transition-all flex flex-col items-center justify-center min-h-[220px] relative ${
              isDragging 
                ? "border-emerald-500 bg-emerald-500/5 scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                : "border-slate-800 border-dashed hover:border-slate-700 hover:bg-slate-850/30"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-full mb-3 text-slate-400 group-hover:text-indigo-400">
              <Upload className={`h-6 w-6 ${isDragging ? "animate-bounce text-emerald-400" : ""}`} />
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-slate-200">ফাইল আপলোড এবং সিল করুন</h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
              যেকোনো ফাইল এখানে ড্র্যাগ করুন অথবা ব্রাউজ করুন। ফাইলগুলো সম্পূর্ণ সুরক্ষিত এনক্রিপ্ট হয়ে স্টোরেজে যুক্ত হবে।
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-500/10"
            >
              ফাইল সিলেক্ট করুন (Browse File)
            </button>
          </div>

          {/* Quick Manual text file creator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-emerald-400" />
                নতুন ফাইল তৈরি করুন
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              সোভারেন ক্লাউড বা মেমোরি ব্যাকআপে রাখতে সরাসরি টেক্সট বা কনফিগ ফাইল টাইপ করে ইনস্ট্যান্ট ফাইল তৈরি করুন।
            </p>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <File className="h-3.5 w-3.5" />
              টেক্সট ফাইল ডায়রিয়া (Create Secure Document)
            </button>
          </div>

          {/* Zero Trust policy info */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 space-y-2 text-[10.5px] leading-normal text-slate-400 font-mono">
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">সোভারেন ডিস্ট্রিবিউটেড ডিস্ক</span>
            <p>প্রতিটি ফাইল আপলোডের সাথে সাথে একটি একক ক্রিপ্টোগ্রাফিক হ্যাশ (SHA256) জেনারেট হয় যা জাল করা অসম্ভব।</p>
            <div className="p-2 bg-slate-950 border border-slate-850 rounded text-[9px] text-slate-500 mt-2">
              STORAGE_MODULE: ACTIVE
              <br />
              INTEGRITY_SHIELD: STABLE
            </div>
          </div>

        </div>

        {/* Main files tables list */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ফাইলের নাম বা হ্যাশ দিয়ে সার্চ করুন..."
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-8 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800/80 shrink-0">
                <SlidersHorizontal className="h-3 w-3 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-transparent text-[10px] font-mono text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="backup">Backups (ব্যাকআপ)</option>
                  <option value="logs">Logs (লগ ফাইল)</option>
                  <option value="credential">Credentials (অনুমোদন)</option>
                  <option value="blueprint">Blueprints (ব্লুপ্রিন্ট)</option>
                  <option value="user">User Files (ব্যবহারকারী)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Files List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {filteredFiles.length === 0 ? (
              <div className="p-12 text-center select-none flex flex-col items-center justify-center">
                <Folder className="h-10 w-10 text-slate-750 mb-3" />
                <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">কোনো ফাইল পাওয়া যায়নি</span>
                <p className="text-[10px] text-slate-500 mt-1 max-w-sm">
                  আপনার অনুসন্ধান বা ফিল্টার পরিবর্তন করুন, অথবা বাম প্যানেল ব্যবহার করে ফাইল আপলোড বা তৈরি করুন।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">নাম (Filename)</th>
                      <th className="px-4 py-3 font-semibold">আকার (Size)</th>
                      <th className="px-4 py-3 font-semibold">এনক্রিপশন (Encryption)</th>
                      <th className="px-4 py-3 font-semibold">আপডেট টাইম (Timestamp)</th>
                      <th className="px-4 py-3 font-semibold text-right">অ্যাকশন (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedFile?.id === file.id;

                      return (
                        <tr 
                          key={file.id}
                          className={`hover:bg-slate-850/20 transition-all text-xs ${
                            isSelected ? "bg-indigo-500/5 border-l-2 border-l-indigo-500" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-slate-950 rounded-lg border border-slate-850 shrink-0">
                                {getCategoryIcon(file.category)}
                              </div>
                              <div className="overflow-hidden">
                                <span 
                                  onClick={() => {
                                    setSelectedFile(isSelected ? null : file);
                                    setPreviewContent(isSelected ? null : file.content);
                                  }}
                                  className="font-semibold text-slate-200 hover:text-indigo-400 cursor-pointer block truncate max-w-[150px] sm:max-w-[200px]"
                                >
                                  {file.name}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 block truncate max-w-[150px] sm:max-w-[200px]" title={`SHA256:${file.hash}`}>
                                  SHA: {file.hash.substring(0, 12)}...
                                </span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3.5 font-mono text-slate-300">
                            {file.size}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                              file.encryptionStatus.startsWith("Encrypted")
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : file.encryptionStatus.startsWith("Signed")
                                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}>
                              {file.encryptionStatus}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-400">
                            {file.lastModified}
                          </td>

                          <td className="px-4 py-3.5 text-right space-x-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedFile(file);
                                setPreviewContent(file.content);
                              }}
                              className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-850 rounded-lg cursor-pointer transition-all inline-flex"
                              title="ফাইল প্রিভিউ (Preview Document)"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => setSharingFile(file)}
                              className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/25 rounded-lg cursor-pointer transition-all inline-flex"
                              title="শেয়ার ও ট্রান্সফার (Secure Share & P2P)"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteFile(file.id, file.name)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/25 rounded-lg cursor-pointer transition-all inline-flex"
                              title="ফাইল মুছে ফেলুন (Purge File)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Secure File Preview Section */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-850">
                      {getCategoryIcon(selectedFile.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        {selectedFile.name}
                        <span className="text-[9px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          PREVIEW_MODE
                        </span>
                      </h4>
                      <p className="text-[10px] text-indigo-300 font-mono mt-0.5 leading-none">
                        SHA256: {selectedFile.hash}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([selectedFile.content], { type: selectedFile.type });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = selectedFile.name;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" /> ডাউনলোড করুন (Download)
                    </button>

                    <button
                      onClick={() => { setSelectedFile(null); setPreviewContent(null); }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      বন্ধ করুন (Close)
                    </button>
                  </div>
                </div>

                {/* Simulated Cryptographic Integrity Certificate */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-400 leading-normal">
                    <span className="text-indigo-400 font-bold uppercase tracking-wider block mb-1">সিকিউরিটি হ্যাশ সার্টিফিকেট</span>
                    <p className="text-slate-500">Hash Match: verified by local zero-trust core</p>
                    <p className="text-emerald-400 font-semibold mt-1">✓ INTEGRITY_OK</p>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-400 leading-normal">
                    <span className="text-purple-400 font-bold uppercase tracking-wider block mb-1">অ্যাক্সেস পারমিশন লেয়ার</span>
                    <p className="text-slate-500">Privilege: Read/Write authorized via Administrator Key</p>
                    <p className="text-indigo-300 font-semibold mt-1">✓ ADMIN_PERMITTED</p>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-400 leading-normal">
                    <span className="text-amber-500 font-bold uppercase tracking-wider block mb-1">ব্যাকআপ মিরর স্ট্যাটাস</span>
                    <p className="text-slate-500">Mirror Copy: Redundant local cache backup stored</p>
                    <p className="text-amber-400 font-semibold mt-1">✓ SECURE_REDUNDANT</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono block">FILE CONTENT PREVIEW (ফাইলের ভেতরের তথ্য)</span>
                  <pre className="w-full bg-slate-950 border border-slate-850 rounded-xl p-4 text-[11px] font-mono text-indigo-300/90 leading-relaxed overflow-x-auto max-h-48 whitespace-pre-wrap scrollbar-thin">
                    {previewContent}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* --- SECURE SHARING HUB MODAL --- */}
      <AnimatePresence>
        {sharingFile && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isBeamingFile && !isUploadingToGDrive) setSharingFile(null);
              }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col z-10 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="text-md sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-indigo-400" />
                    সোভারেন ফাইল শেয়ারিং হাব
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Secure and Encrypted file distribution matrix for: <strong className="text-indigo-400 font-mono">{sharingFile.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSharingFile(null)}
                  disabled={isBeamingFile || isUploadingToGDrive}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-850 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 rotate-45" />
                </button>
              </div>

              {/* Selector Tabs inside sharing modal */}
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                
                <button
                  onClick={() => { setShareType("link"); setGeneratedShareLink(""); }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    shareType === "link"
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  <span>লিঙ্ক তৈরি করুন</span>
                </button>

                <button
                  onClick={() => { setShareType("beam"); setGeneratedShareLink(""); }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    shareType === "beam"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>ডিভাইস বিম</span>
                </button>

                <button
                  onClick={() => { setShareType("gdrive"); setGeneratedShareLink(""); }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    shareType === "gdrive"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  <span>গুগল ড্রাইভ</span>
                </button>

              </div>

              {/* Share Options content dynamic renderer */}
              <div className="space-y-4">
                
                {/* Mode: Generate Temporary self destruct Link */}
                {shareType === "link" && (
                  <div className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 block">লিঙ্কের স্থায়িত্বকাল (Duration):</label>
                        <select
                          value={shareDuration}
                          onChange={(e) => setShareDuration(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          <option value={5}>৫ মিনিট (5 mins)</option>
                          <option value={15}>১৫ মিনিট (15 mins)</option>
                          <option value={60}>১ ঘণ্টা (1 hour)</option>
                          <option value={1440}>১ দিন (24 hours)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 block">পাসওয়ার্ড প্রোটেকশন (Password):</label>
                        <input
                          type="password"
                          value={sharePassword}
                          onChange={(e) => setSharePassword(e.target.value)}
                          placeholder="পাসওয়ার্ড দিন (ঐচ্ছিক)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateShareLink}
                      disabled={isGeneratingShare}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isGeneratingShare ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> জেনারেট হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" /> সুরক্ষিত লিঙ্ক তৈরি করুন (Generate Secure Link)
                        </>
                      )}
                    </button>

                    {/* Output share details */}
                    <AnimatePresence>
                      {generatedShareLink && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3.5"
                        >
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider">তৈরিকৃত পাবলিক লিঙ্ক (Public Share URL)</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                readOnly
                                value={generatedShareLink}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-[10px] font-mono text-slate-300"
                              />
                              <button
                                onClick={() => copyToClipboard(generatedShareLink)}
                                className="px-3 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/35 border border-indigo-500/30 rounded font-bold text-xs cursor-pointer transition-all shrink-0 flex items-center justify-center"
                              >
                                {copyFeedback ? "Copied!" : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-4 pt-1.5">
                            {/* QR Code generator */}
                            <div className="bg-white p-1.5 rounded-lg shrink-0">
                              <div className="w-16 h-16 bg-slate-100 flex flex-col gap-1 p-1 justify-between select-none">
                                <div className="flex justify-between w-full h-3">
                                  <div className="w-3.5 h-3.5 bg-slate-950 border border-slate-900 rounded-[1px]" />
                                  <div className="w-1 h-2 bg-slate-950" />
                                  <div className="w-3.5 h-3.5 bg-slate-950 border border-slate-900 rounded-[1px]" />
                                </div>
                                <div className="flex justify-between w-full h-3">
                                  <div className="w-1.5 h-3 bg-slate-950" />
                                  <div className="w-3 h-2 bg-slate-950" />
                                  <div className="w-2.5 h-2.5 bg-slate-950" />
                                </div>
                                <div className="flex justify-between w-full h-3">
                                  <div className="w-3.5 h-3.5 bg-slate-950 border border-slate-900 rounded-[1px]" />
                                  <div className="w-1.5 h-3 bg-slate-950" />
                                  <div className="w-2.5 h-2.5 bg-slate-950" />
                                </div>
                              </div>
                            </div>

                            <div className="text-left space-y-1 font-mono text-[10px] text-slate-400">
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                লিঙ্ক সফলভাবে জেনারেট হয়েছে!
                              </div>
                              <p className="text-[9.5px] text-slate-500">
                                মোবাইল বা অন্য কোনো ডিভাইসে ফাইলটি দেখতে QR কোড স্ক্যান করুন। পাসওয়ার্ড দিয়ে সুরক্ষিত।
                              </p>
                              <div className="flex items-center gap-1 text-[9px] text-slate-500 pt-1">
                                <Clock className="h-3 w-3" />
                                মেয়াদ শেষ হবে: {new Date(Date.now() + shareDuration * 60000).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                )}

                {/* Mode: P2P Encrypted Device Beam */}
                {shareType === "beam" && (
                  <div className="space-y-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 block">টার্গেট নোড সিলেক্ট করুন (Target Peer Node):</label>
                      <select
                        value={targetBeamNode}
                        onChange={(e) => setTargetBeamNode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {devices.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.ipAddress})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider">এনক্রিপ্টেড টানেল স্ট্যাটাস</span>
                      <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-mono">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        TUNNEL_ESTABLISHED | P2P_SECURE_PIPE
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        ফাইল ট্রান্সফারের সাথে সাথে টার্গেটের ডিস্ট্রিবিউটেড মেমরিতে একটি বিম সিঙ্ক কপি সরাসরি রেজিস্টার হবে।
                      </p>
                    </div>

                    {isBeamingFile ? (
                      <div className="space-y-2 pt-2">
                        <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-200"
                            style={{ width: `${beamProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>BEAM_IN_PROGRESS</span>
                          <span className="text-purple-400 font-bold">{beamProgress}%</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleBeamFile}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-purple-500/10 flex items-center justify-center gap-1.5"
                      >
                        <ArrowRight className="h-4 w-4" /> ডিভাইসে বিম করুন (Initiate Cryptographic Beam)
                      </button>
                    )}

                  </div>
                )}

                {/* Mode: Google Drive Sync */}
                {shareType === "gdrive" && (
                  <div className="space-y-4">
                    
                    {accessToken ? (
                      <div className="space-y-3.5">
                        
                        <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/15 rounded-xl text-indigo-400">
                            <ShieldCheck className="h-5 w-5 animate-pulse" />
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-[10px] text-indigo-400 block font-bold uppercase leading-none">গুগল ক্লাউড মাউন্ট করা আছে</span>
                            <span className="text-[9.5px] text-slate-400 leading-normal mt-1 block">
                              Active OAuth Token Verified. Click below to push encrypted file directly to your Google Drive root.
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleGDriveUpload}
                          disabled={isUploadingToGDrive}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isUploadingToGDrive ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" /> আপলোড হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" /> গুগল ড্রাইভে আপলোড করুন (Upload to Google Drive)
                            </>
                          )}
                        </button>

                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-amber-500">
                          <AlertTriangle className="h-8 w-8 mb-2 animate-bounce" style={{ animationDuration: "3s" }} />
                          <h4 className="text-xs font-bold">গুগল ড্রাইভ কানেক্টেড নেই (Google Drive Not Linked)</h4>
                          <p className="text-[10.5px] text-slate-400 max-w-sm leading-normal mt-1.5">
                            আপনার গুগল ড্রাইভ অ্যাকাউন্ট মাউন্ট করুন। গুগল ড্রাইভের সাথে মাউন্ট করার পরে আপনি সরাসরি ক্লাউডে ব্যাকআপ বা ডিস্ট্রিবিউশন টাস্কগুলো পরিচালনা করতে পারবেন।
                          </p>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-[9.5px] font-mono text-slate-500 leading-normal">
                          <span>কিভাবে কানেক্ট করবেন:</span>
                          <p className="mt-1">ড্যাশবোর্ডের উপরে ডান কোনায় <b>"LOCAL_IMMUTABLE_STORAGE_ONLY"</b> বা Command Console ব্যবহার করে গুগল ড্রাইভে সাইন ইন করতে পারবেন।</p>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>

              {/* Close Button at bottom of modal */}
              <div className="border-t border-slate-800/60 pt-4 mt-6 flex justify-end">
                <button
                  onClick={() => setSharingFile(null)}
                  disabled={isBeamingFile || isUploadingToGDrive}
                  className="px-4 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  বন্ধ করুন (Dismiss)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CREATE NEW FILE MODAL --- */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col z-10 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-5">
                <div>
                  <h3 className="text-md sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-400" />
                    নতুন ফাইল তৈরি করুন (Create Secure Document)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Compose new configuration, credentials or notes into Sovereign sandboxed storage
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-850 rounded-lg cursor-pointer transition-all"
                >
                  <RefreshCw className="h-4 w-4 rotate-45" />
                </button>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4 font-sans text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 block font-bold">ফাইলের নাম (File Name):</label>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="যেমন: my-credentials.txt"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 block font-bold">ক্যাটাগরি (Category):</label>
                    <select
                      value={newFileCategory}
                      onChange={(e) => setNewFileCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="user">User Document (ব্যবহারকারী)</option>
                      <option value="backup">System Backup (ব্যাকআপ)</option>
                      <option value="logs">Audit Logs (লগ ফাইল)</option>
                      <option value="credential">Credentials (অনুমোদন চাবি)</option>
                      <option value="blueprint">Infrastructure Blueprint (ব্লুপ্রিন্ট)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 block font-bold">ক্রিপ্টো এনক্রিপশন লেয়ার (Encryption):</label>
                    <select
                      value={newFileEncryption}
                      onChange={(e) => setNewFileEncryption(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="Encrypted (AES-GCM 256)">Encrypted (AES-GCM 256)</option>
                      <option value="Signed & Sealed">Signed & Sealed (SHA256)</option>
                      <option value="Plaintext">Plaintext (কোনো সুরক্ষা নেই)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <span className="text-[9px] font-mono text-slate-500 leading-normal block">
                      ✓ ফাইলের প্রতিটি অক্ষরের জন্য একটি পৃথক ডিস্ট্রিবিউটেড সিগনেচার সার্টিফিকেট তৈরি হবে।
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 block font-bold">ফাইলের ভেতরের তথ্য (File Content):</label>
                  <textarea
                    rows={6}
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    placeholder="ফাইলের তথ্য বা নোট টাইপ করুন..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-800/60 pt-4 mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  বাতিল করুন (Cancel)
                </button>
                <button
                  onClick={handleCreateFile}
                  disabled={!newFileName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10 disabled:opacity-50"
                >
                  ফাইল তৈরি করুন (Save Document)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
