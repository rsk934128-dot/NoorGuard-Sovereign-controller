import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { Device, AuditLogEntry, NetworkNode, NetworkConnection } from "@/src/types";
import { googleSignIn, googleSignOut, initAuth } from "@/src/lib/firebase";
import SovereignDigitalAssetMatrix from "./SovereignDigitalAssetMatrix";
import SovereignVisualDashboard from "./SovereignVisualDashboard";
import MeshNetwork from "./MeshNetwork";
import CommandConsole from "./CommandConsole";
import AuditLogger from "./AuditLogger";
import SurroundingsMonitor from "./SurroundingsMonitor";
import EdgeTelemetryMonitor from "./EdgeTelemetryMonitor";
import SovereignFileManager from "./SovereignFileManager";
import { uploadSealedLogsToDrive } from "../lib/driveService";
import { 
  ShieldAlert, ShieldCheck, Key, LogOut, Radio, Cpu, Share2, FileText, Globe, RefreshCw,
  LayoutDashboard, Network, ScrollText, Menu, X, Terminal, Volume2, Search, Fingerprint,
  Download, Laptop, Smartphone, QrCode, Activity, Folder
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function SovereignDashboard() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active state
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "dev-gate",
      name: "Gate-Zero Gateway",
      type: "Gateway",
      status: "Safe",
      ipAddress: "192.168.1.1",
      telemetry: { cpu: 14, memory: 38, storage: 21, networkIn: 8.4, networkOut: 12.2 },
      accessibilityActive: false,
      blackScreenActive: false,
      micMonitoringActive: false,
      lastSync: new Date().toISOString(),
      hardwareKeyId: "HW-GATEWAY-0A-9B-C3"
    },
    {
      id: "dev-mobile",
      name: "Noor-Mobile-X2",
      type: "Mobile Node",
      status: "Safe",
      ipAddress: "192.168.1.104",
      telemetry: { cpu: 22, memory: 52, storage: 61, networkIn: 1.5, networkOut: 0.8 },
      accessibilityActive: false,
      blackScreenActive: false,
      micMonitoringActive: false,
      lastSync: new Date().toISOString(),
      hardwareKeyId: "HW-MOBILE-88-72-D1"
    },
    {
      id: "dev-vault",
      name: "Vault-Sovereign",
      type: "Secure Vault",
      status: "Safe",
      ipAddress: "10.0.0.22",
      telemetry: { cpu: 4, memory: 15, storage: 8, networkIn: 0.1, networkOut: 0.1 },
      accessibilityActive: false,
      blackScreenActive: false,
      micMonitoringActive: false,
      lastSync: new Date().toISOString(),
      hardwareKeyId: "HW-VAULT-99-AA-FF"
    },
    {
      id: "dev-workstation",
      name: "Workstation-Delta",
      type: "Workstation",
      status: "Safe",
      ipAddress: "192.168.1.200",
      telemetry: { cpu: 32, memory: 64, storage: 44, networkIn: 12.6, networkOut: 18.5 },
      accessibilityActive: false,
      blackScreenActive: false,
      micMonitoringActive: false,
      lastSync: new Date().toISOString(),
      hardwareKeyId: "HW-WORKSTATION-DD-88"
    }
  ]);

  // Mesh Topology Coordinates
  const [meshNodes, setMeshNodes] = useState<NetworkNode[]>([
    { id: "dev-gate", name: "Gateway", type: "Gateway", x: 250, y: 50, status: "Safe" },
    { id: "dev-mobile", name: "Mobile-X2", type: "Mobile Node", x: 100, y: 160, status: "Safe" },
    { id: "dev-vault", name: "Vault", type: "Secure Vault", x: 250, y: 190, status: "Safe" },
    { id: "dev-workstation", name: "Workstation", type: "Workstation", x: 400, y: 160, status: "Safe" }
  ]);

  const [meshConnections, setMeshConnections] = useState<NetworkConnection[]>([
    { from: "dev-gate", to: "dev-mobile", status: "encrypted", latency: 12 },
    { from: "dev-gate", to: "dev-workstation", status: "encrypted", latency: 8 },
    { from: "dev-gate", to: "dev-vault", status: "encrypted", latency: 5 },
    { from: "dev-mobile", to: "dev-vault", status: "encrypted", latency: 15 },
    { from: "dev-workstation", to: "dev-vault", status: "encrypted", latency: 9 }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isSyncingMesh, setIsSyncingMesh] = useState(false);
  const [isScanningLogs, setIsScanningLogs] = useState(false);
  const [aiAnalysisReport, setAiAnalysisReport] = useState<any>(null);

  // Biometric protection states
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [biometricMethod, setBiometricMethod] = useState<"fingerprint" | "faceid">("fingerprint");
  const [isScanningBiometrics, setIsScanningBiometrics] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusLog, setScanStatusLog] = useState<string[]>([]);
  const [rememberSession, setRememberSession] = useState(true);

  // Cinematic System Splash Screen States
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashLog, setSplashLog] = useState("SYSTEM: Loading cryptographic modules...");

  // Installer & PWA States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isDownloadingClient, setIsDownloadingClient] = useState(false);
  const [downloadPlatform, setDownloadPlatform] = useState<"apk" | "windows" | "macos" | "pwa">("apk");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusLog, setDownloadStatusLog] = useState<string[]>([]);

  // Helper to intercept admin functions
  const withBiometricShield = (action: () => void) => {
    if (!isBiometricVerified) {
      setPendingAction(() => action);
      setShowBiometricModal(true);
      // Reset scanning state
      setIsScanningBiometrics(false);
      setScanProgress(0);
      setScanStatusLog(["SYSTEM: Secure Enclave waiting for biometric dispatch..."]);
    } else {
      action();
    }
  };

  // Navigation shell state
  const [activeTab, setActiveTab] = useState<"overview" | "devices" | "mesh" | "ledger" | "edge" | "files">("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Command palette states
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteSearchQuery, setPaletteSearchQuery] = useState("");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(0);

  // Cinematic Splash screen progress simulation
  useEffect(() => {
    if (!showSplash) return;
    
    const logs = [
      "SYSTEM: Connecting to Secure Enclave hardware...",
      "SYSTEM: Checking local integrity signature...",
      "DECRYPTING: Rebuilding local keystore hashes...",
      "CONNECTING: Initiating Zero-Trust link tunnel...",
      "SYNCHRONIZING: Fetching node topology map...",
      "COMPILING: Verification modules operational...",
      "SUCCESS: NoorGuard Sovereign environment online!"
    ];

    let timer: NodeJS.Timeout;
    
    const updateProgress = () => {
      setSplashProgress(prev => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        if (next >= 100) {
          setSplashLog(logs[logs.length - 1]);
          setTimeout(() => {
            setShowSplash(false);
          }, 800);
          return 100;
        }

        // Map percentage to logs array
        const index = Math.floor((next / 100) * (logs.length - 1));
        setSplashLog(logs[index]);

        timer = setTimeout(updateProgress, 70 + Math.random() * 110);
        return next;
      });
    };

    timer = setTimeout(updateProgress, 250);
    return () => clearTimeout(timer);
  }, [showSplash]);

  // Keyboard listener for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen(prev => {
          if (!prev) {
            setPaletteSearchQuery("");
            setPaletteActiveIndex(0);
          }
          return !prev;
        });
      } else if (e.key === "Escape") {
        setIsPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Responsive mobile query helper for layout animations
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for Progressive Web App (PWA) installation events
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    
    addSystemLog(
      "SECURITY",
      "SUCCESS",
      "dev-gate",
      "Sovereign PWA Setup",
      `PWA installation authorized by supervisor. Choice: ${outcome}`,
      "Client environment has locked container locally."
    );
  };

  const handleStartClientDownload = (platform: "apk" | "windows" | "macos") => {
    setDownloadPlatform(platform);
    setIsDownloadingClient(true);
    setDownloadProgress(0);
    
    const platformName = platform === "apk" ? "Android Package (APK)" : platform === "windows" ? "Windows Client (EXE)" : "macOS DMG Bundle";
    setDownloadStatusLog([
      `SYSTEM: Connecting to package compilation server...`,
      `PLATFORM: Targeting ${platformName} build...`
    ]);

    const steps = [
      { progress: 20, msg: "COMPILING: Packaging security kernel assets & service worker..." },
      { progress: 45, msg: "SIGNING: Embedding SHA-256 local enclave fingerprint signature..." },
      { progress: 70, msg: "OPTIMIZING: Stripping unused debug logs & compressing binaries..." },
      { progress: 90, msg: "VERIFYING: Confirming package integrity hash..." },
      { progress: 100, msg: "SUCCESS: Package compiled! Launching file download..." }
    ];

    let currentStep = 0;
    const runStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        
        let p = currentStep > 0 ? steps[currentStep - 1].progress : 0;
        const interval = setInterval(() => {
          p += 2;
          if (p >= step.progress) {
            clearInterval(interval);
            setDownloadProgress(step.progress);
            setDownloadStatusLog(prev => [...prev, step.msg]);
            currentStep++;
            setTimeout(runStep, 400);
          } else {
            setDownloadProgress(p);
          }
        }, 15);
      } else {
        // Create actual download for user!
        setTimeout(() => {
          const fileName = platform === "apk" ? "NoorGuard-Sovereign-Android.txt" : platform === "windows" ? "NoorGuard-Sovereign-Windows.txt" : "NoorGuard-Sovereign-MacOS.txt";
          const fileContent = `========================================================================
NOORGUARD SOVEREIGN CONTROLLER - PREMIUM CLIENT SPECIFICATION
========================================================================
Platform: ${platformName}
Security Mode: Zero-Trust Remote Supervisor
Release: v2.0-Alpha Build-2026.07
Authorized to: ${user?.email || "rsk755734@gmail.com"}
Local Host Signature: SHA-256 / NOOR-SEC-ENCLAVE-0x5F98A7
========================================================================

INSTALLATION INSTRUCTIONS:
1. Extract or place this specification in your local security folder.
2. Open NoorGuard Web App on your browser: ${window.location.origin}
3. Click "PWA Install" in the header to run it as a standalone app on your PC or Phone!
4. To sync secondary nodes, scan the QR code located in the client dashboard.

THANK YOU FOR USING NOORGUARD SOVEREIGN CONTROLLER!
========================================================================`;
          
          const element = document.createElement("a");
          const file = new Blob([fileContent], { type: 'text/plain' });
          element.href = URL.createObjectURL(file);
          element.download = fileName;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);

          setIsDownloadingClient(false);
          addSystemLog(
            "SECURITY",
            "SUCCESS",
            "dev-gate",
            "Sovereign Client Downloader",
            `Sovereign client specification package downloaded for ${platformName}`,
            "File transfer completed successfully. Client signatures logged."
          );
        }, 800);
      }
    };

    setTimeout(runStep, 300);
  };

  // Initialize Auth Listener on Mount
  useEffect(() => {
    initAuth(
      (activeUser, activeToken) => {
        setUser(activeUser);
        setToken(activeToken);
        setNeedsAuth(false);
        addSystemLog(
          "SECURITY",
          "SUCCESS",
          "dev-gate",
          "Gate-Zero Gateway",
          `Authenticated supervisor session successfully: ${activeUser.email}`,
          "Sovereign Auth Protocol"
        );
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    // Bootstrap initial audit trail
    bootstrapInitialLogs();
  }, []);

  const bootstrapInitialLogs = async () => {
    const initialLogs: AuditLogEntry[] = [];
    const baseActions = [
      { cat: "SECURITY", sev: "SUCCESS", devId: "dev-gate", devName: "Gate-Zero Gateway", action: "Completed boot diagnostics. Secure enclave initialized successfully.", details: "Trust Engine validates boot partition SHA-512." },
      { cat: "STORAGE", sev: "INFO", devId: "dev-vault", devName: "Vault-Sovereign", action: "Zero-Trust storage sector mounted under device-enforced key ID.", details: "AES-256 partition unlocked using hardware security token." },
      { cat: "SECURITY", sev: "SUCCESS", devId: "dev-workstation", devName: "Workstation-Delta", action: "Biometric authentication profile synced with identity vault.", details: "FaceID and fingerprint matrix loaded to secure local ring." }
    ];

    for (const act of baseActions) {
      const logId = `LOG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const payload = { logId, action: act.action, devId: act.devId };
      const signature = await generateHmacLocal(payload);
      
      initialLogs.push({
        id: logId,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        category: act.cat as any,
        severity: act.sev as any,
        deviceId: act.devId,
        deviceName: act.devName,
        action: act.action,
        operator: "Sovereign OS Bootloader",
        details: act.details,
        hmacSignature: signature
      });
    }
    setAuditLogs(initialLogs);
  };

  // Local helper to compute HMAC-SHA256 signature for audit integrity
  const generateHmacLocal = async (payload: any): Promise<string> => {
    try {
      const res = await fetch("/api/security/hmac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.signature;
      }
    } catch (err) {
      console.error("Local HMAC generation failed:", err);
    }
    // Simple fallback signature if backend communication fails
    return "HMAC_FALLBACK_VAL_" + Math.random().toString(36).substring(4).toUpperCase();
  };

  // Function to push a new entry to the immutable log array
  const addSystemLog = async (
    category: string,
    severity: string,
    deviceId: string,
    deviceName: string,
    action: string,
    details: string,
    customOperator?: string
  ) => {
    const logId = `LOG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const payload = { logId, action, deviceId };
    const signature = await generateHmacLocal(payload);

    const newEntry: AuditLogEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      category: category as any,
      severity: severity as any,
      deviceId,
      deviceName,
      action,
      operator: customOperator || (user ? user.email || "Supervisor" : "Guest Supervisor"),
      details,
      hmacSignature: signature
    };

    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error("Authentication failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await googleSignOut();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    addSystemLog(
      "SECURITY",
      "INFO",
      "dev-gate",
      "Gate-Zero Gateway",
      "Supervisor user session logged out cleanly.",
      "In-memory token cache evicted successfully."
    );
  };

  // Toggles Accessibility Control Engine
  const handleToggleAccessibility = (id: string) => {
    setDevices(prev => prev.map(dev => {
      if (dev.id === id) {
        const nextState = !dev.accessibilityActive;
        addSystemLog(
          "ACCESSIBILITY",
          nextState ? "WARNING" : "INFO",
          dev.id,
          dev.name,
          `${nextState ? "Granted" : "Revoked"} accessibility control permissions for remote automation UI engine.`,
          nextState 
            ? "WARNING: Allows remote programmatic clicks, input injections, and screen simulations." 
            : "Accessibility UI dispatcher channel terminated cleanly."
        );
        return { ...dev, accessibilityActive: nextState, status: nextState ? "Monitoring" : "Safe" };
      }
      return dev;
    }));
  };

  // Toggles Black Screen Privacy Shield Overlay
  const handleToggleBlackScreen = (id: string) => {
    setDevices(prev => prev.map(dev => {
      if (dev.id === id) {
        const nextState = !dev.blackScreenActive;
        addSystemLog(
          "SECURITY",
          "INFO",
          dev.id,
          dev.name,
          `${nextState ? "Activated" : "Deactivated"} physical display blackout privacy shield overlay.`,
          nextState 
            ? "Hardware display overlay layer drawn. Physical monitors will show zeroed dark screen to prevent physical espionage."
            : "Black Screen privacy overlay unmounted. Monitors restored to default framebuffer."
        );
        return { ...dev, blackScreenActive: nextState };
      }
      return dev;
    }));
  };

  // Toggles Acoustics surroundings monitoring
  const handleToggleMic = (id: string) => {
    setDevices(prev => prev.map(dev => {
      if (dev.id === id) {
        const nextState = !dev.micMonitoringActive;
        addSystemLog(
          "AUDIO_SURROUND",
          nextState ? "WARNING" : "INFO",
          dev.id,
          dev.name,
          `${nextState ? "Enabled" : "Disabled"} ambient acoustic monitoring surroundings profile.`,
          nextState 
            ? "Acoustic envelope profiling active. Sounds processed using AI sound identification signatures."
            : "Microphone stream closed. Audio processing terminated."
        );
        return { ...dev, micMonitoringActive: nextState };
      }
      return dev;
    }));
  };

  // Restricts or unrestricts device access
  const handleRestrictDevice = (id: string) => {
    setDevices(prev => prev.map(dev => {
      if (dev.id === id) {
        const isCurrentlyRestricted = dev.status === "Restricted";
        const nextStatus = isCurrentlyRestricted ? "Safe" : "Restricted";
        addSystemLog(
          "SECURITY",
          isCurrentlyRestricted ? "SUCCESS" : "CRITICAL",
          dev.id,
          dev.name,
          isCurrentlyRestricted 
            ? "Restricted access rules lifted from sovereign network policies." 
            : "Emergency lock down protocol triggered: Device restricted immediately.",
          isCurrentlyRestricted 
            ? "Unrestricted device to return to normal operation queue."
            : "All physical outbound ports and virtual interfaces quarantined. Handshake authentication rejected."
        );
        return { ...dev, status: nextStatus };
      }
      return dev;
    }));
  };

  // Triggers offline mesh network synchronization simulator
  const handleTriggerMeshSync = () => {
    setIsSyncingMesh(true);
    addSystemLog(
      "INTELLIGENCE",
      "INFO",
      "dev-gate",
      "Mesh Linkage Protocol",
      "Starting global P2P decentralization hash-synchronization.",
      "Initiated block audit across all adjacent link channels."
    );

    setTimeout(() => {
      setIsSyncingMesh(false);
      // Slightly fluctuate latencies for realism
      setMeshConnections(prev => prev.map(conn => ({
        ...conn,
        latency: Math.max(3, conn.latency + Math.round((Math.random() - 0.5) * 4))
      })));
      addSystemLog(
        "INTELLIGENCE",
        "SUCCESS",
        "dev-gate",
        "Mesh Linkage Protocol",
        "Offline mesh state sync complete. All distributed databases consistent.",
        "Verified 5 linkages across all 4 operational nodes. Zero sync mismatches."
      );
    }, 2000);
  };

  // Evaluates entire log table for vulnerabilities using server-side Gemini Anomaly Detection
  const handleTriggerAiScan = async () => {
    setIsScanningLogs(true);
    addSystemLog(
      "SECURITY",
      "INFO",
      "dev-gate",
      "Intelligence Engine",
      "Deploying AI Anomaly Detection model to scan active audit logs.",
      "Packing historical logs into JSON frame for Gemini evaluation..."
    );

    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: auditLogs }),
      });

      if (!res.ok) {
        throw new Error("Log analysis endpoint returned error code.");
      }

      const report = await res.json();
      setAiAnalysisReport(report);

      addSystemLog(
        "INTELLIGENCE",
        "SUCCESS",
        "dev-gate",
        "Intelligence Engine",
        `AI Log Audit complete. Threat Level classified: ${report.status} (Score: ${report.threatScore}/100)`,
        `Gemini generated ${report.anomalies.length} anomaly detections and provided tactical recommendations.`
      );
    } catch (err: any) {
      console.error(err);
      addSystemLog(
        "SECURITY",
        "CRITICAL",
        "dev-gate",
        "Intelligence Engine",
        "AI Log scan failed due to a server-side communications block.",
        err.message || String(err)
      );
    } finally {
      setIsScanningLogs(false);
    }
  };

  // Triggers simulated biometric face/fingerprint scan
  const handleStartBiometricScan = () => {
    setIsScanningBiometrics(true);
    setScanProgress(0);
    setScanStatusLog([
      `SYSTEM: Contacting secure hardware enclave (${biometricMethod === "fingerprint" ? "TouchID Ring 0" : "FaceID Cam Grid"})...`
    ]);

    const logsAndDelays = [
      { progress: 15, msg: "SYSTEM: Activating biometric sensor arrays..." },
      { progress: 35, msg: biometricMethod === "fingerprint" 
        ? "ANALYZING: Scanning ridge details and minutiae coordinate mappings..."
        : "ANALYZING: Mapping 30,000 invisible infrared points for 3D face mesh..." 
      },
      { progress: 60, msg: "CRYPTOGRAPHY: Generating local ephemeral private key signature..." },
      { progress: 85, msg: "SECURITY: Validating biometric packet hash with secure enclave SHA-512..." },
      { progress: 100, msg: "SUCCESS: Biometric identity approved! Authorizing session tokens." }
    ];

    let currentStepIndex = 0;

    const runScanStep = () => {
      if (currentStepIndex < logsAndDelays.length) {
        const step = logsAndDelays[currentStepIndex];
        
        // Progressively set intermediate progress values
        const prevProgress = currentStepIndex > 0 ? logsAndDelays[currentStepIndex - 1].progress : 0;
        const targetProgress = step.progress;
        
        // Fast transition between percentages
        let p = prevProgress;
        const interval = setInterval(() => {
          p += 2;
          if (p >= targetProgress) {
            clearInterval(interval);
            setScanProgress(targetProgress);
            setScanStatusLog(prev => [...prev, step.msg]);
            currentStepIndex++;
            
            // Schedule the next main stage
            setTimeout(runScanStep, 500);
          } else {
            setScanProgress(p);
          }
        }, 15);
      } else {
        // Complete the verification!
        setTimeout(() => {
          setIsBiometricVerified(true);
          setShowBiometricModal(false);
          setIsScanningBiometrics(false);

          // Add a system log for biometric authentication
          addSystemLog(
            "SECURITY",
            "SUCCESS",
            "dev-gate",
            "Sovereign Auth Protocol",
            `Biometric verification approved. Supervisor authorization token created. (${biometricMethod === "fingerprint" ? "TouchID" : "FaceID"})`,
            "Cryptographic secure keys loaded to local memory space successfully."
          );

          // Execute the pending action if we have one!
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }, 600);
      }
    };

    // First step triggers after initial delay
    setTimeout(runScanStep, 400);
  };

  // Execute action from command console
  const handleExecuteConsoleAction = (actionType: string, targetDeviceId: string) => {
    // Resolve target IDs
    let targetIds: string[] = [];
    if (targetDeviceId === "ALL") {
      targetIds = devices.map(d => d.id);
    } else if (targetDeviceId && targetDeviceId !== "NONE") {
      targetIds = [targetDeviceId];
    } else {
      // Find matching device by keyword
      return;
    }

    setDevices(prev => prev.map(dev => {
      if (targetIds.includes(dev.id)) {
        if (actionType === "TOGGLE_BLACK_SCREEN") {
          return { ...dev, blackScreenActive: true };
        }
        if (actionType === "TOGGLE_ACCESSIBILITY") {
          return { ...dev, accessibilityActive: true, status: "Monitoring" };
        }
        if (actionType === "TOGGLE_MIC") {
          return { ...dev, micMonitoringActive: true };
        }
        if (actionType === "LOCK_DEVICE") {
          return { ...dev, status: "Restricted" };
        }
      }
      return dev;
    }));

    if (actionType === "SYSTEM_AUDIT") {
      handleTriggerAiScan();
    }
    if (actionType === "PEER_SYNC") {
      handleTriggerMeshSync();
    }
  };

  // Google Drive upload secure proxy trigger
  const handleUploadToDrive = async (fileName: string, logContent: string) => {
    if (!token) {
      throw new Error("No active Google OAuth token. Please sign in.");
    }
    
    // Call the dedicated drive service to cryptographically seal and upload logs
    const data = await uploadSealedLogsToDrive(token, fileName, auditLogs);
    
    // Log the successful Google Drive export with cryptographic integrity confirmation
    addSystemLog(
      "STORAGE",
      "SUCCESS",
      "dev-gate",
      "Google Drive Link",
      `Exported cryptographically sealed security audit trail to Google Drive: '${fileName}'`,
      `Stored under Google Drive Cloud sector with high-precision timestamp. File ID: ${data.fileId}. Root Hash: ${data.seal.blockChainRootHash.slice(0, 16)}...`
    );

    return data;
  };

  // Stats Counters
  const activeTunnelsCount = devices.filter(d => d.accessibilityActive).length;
  const restrictedNodesCount = devices.filter(d => d.status === "Restricted").length;

  // Sync active index when query shifts
  useEffect(() => {
    setPaletteActiveIndex(0);
  }, [paletteSearchQuery]);

  // Construct search scope with commands, devices, and logs
  const paletteResults = (() => {
    const query = paletteSearchQuery.toLowerCase().trim();
    const allCommands = [
      { name: "Switch to Analytics Overview", action: () => { setActiveTab("overview"); setIsPaletteOpen(false); }, icon: LayoutDashboard },
      { name: "Switch to Devices Matrix", action: () => { setActiveTab("devices"); setIsPaletteOpen(false); }, icon: Cpu },
      { name: "Switch to Mesh Network Map", action: () => { setActiveTab("mesh"); setIsPaletteOpen(false); }, icon: Network },
      { name: "Switch to Cryptographic Ledger", action: () => { setActiveTab("ledger"); setIsPaletteOpen(false); }, icon: ScrollText },
      { name: "Switch to Edge Telemetry Monitor", action: () => { setActiveTab("edge"); setIsPaletteOpen(false); }, icon: Activity },
      { name: "Switch to Secure File Manager & Share Hub", action: () => { setActiveTab("files"); setIsPaletteOpen(false); }, icon: Folder },
      { name: "Sync Mesh Topology Linkages", action: () => { withBiometricShield(() => { handleTriggerMeshSync(); }); setIsPaletteOpen(false); }, icon: RefreshCw },
      { name: "Execute AI Threat Scan", action: () => { withBiometricShield(() => { handleTriggerAiScan(); }); setIsPaletteOpen(false); }, icon: Cpu },
      { name: "Mount Google Drive Storage / Sign In", action: () => { handleLogin(); setIsPaletteOpen(false); }, icon: Key },
      { name: "Evict Credentials / Log Out", action: () => { handleLogout(); setIsPaletteOpen(false); }, icon: LogOut },
    ];

    if (!query) {
      return {
        commands: allCommands,
        devices: [],
        logs: []
      };
    }

    const matchedCommands = allCommands.filter(c => c.name.toLowerCase().includes(query));
    const matchedDevices = devices.filter(
      d => d.name.toLowerCase().includes(query) ||
           d.type.toLowerCase().includes(query) ||
           d.ipAddress.toLowerCase().includes(query) ||
           d.hardwareKeyId.toLowerCase().includes(query) ||
           d.status.toLowerCase().includes(query)
    );
    const matchedLogs = auditLogs.filter(
      l => l.id.toLowerCase().includes(query) ||
           l.action.toLowerCase().includes(query) ||
           l.details.toLowerCase().includes(query) ||
           l.deviceName.toLowerCase().includes(query) ||
           l.operator.toLowerCase().includes(query) ||
           l.category.toLowerCase().includes(query)
    ).slice(0, 8);

    return {
      commands: matchedCommands,
      devices: matchedDevices,
      logs: matchedLogs
    };
  })();

  // Construct flat list of items for unified keyboard navigation
  const flatPaletteItems: any[] = [];
  paletteResults.commands.forEach(cmd => {
    flatPaletteItems.push({
      id: `cmd-${cmd.name}`,
      label: cmd.name,
      sublabel: "System Command & View Controller",
      icon: cmd.icon,
      action: cmd.action,
      category: "COMMANDS"
    });
  });
  paletteResults.devices.forEach(dev => {
    flatPaletteItems.push({
      id: `dev-${dev.id}`,
      label: dev.name,
      sublabel: `${dev.type} • IP: ${dev.ipAddress} • ID: ${dev.hardwareKeyId}`,
      badge: dev.status,
      icon: Cpu,
      action: () => {
        setActiveTab("devices");
        setIsPaletteOpen(false);
      },
      category: "ASSET NODES"
    });
  });
  paletteResults.logs.forEach(log => {
    flatPaletteItems.push({
      id: `log-${log.id}`,
      label: log.action,
      sublabel: `Category: ${log.category} • Operator: ${log.operator} • ID: ${log.id}`,
      badge: log.severity,
      icon: ScrollText,
      action: () => {
        setLedgerSearchQuery(log.id);
        setActiveTab("ledger");
        setIsPaletteOpen(false);
      },
      category: "SECURITY LOGS"
    });
  });

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPaletteActiveIndex(prev => (prev + 1) % Math.max(1, flatPaletteItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPaletteActiveIndex(prev => (prev - 1 + flatPaletteItems.length) % Math.max(1, flatPaletteItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatPaletteItems[paletteActiveIndex]) {
        flatPaletteItems[paletteActiveIndex].action();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden">
      
      {/* --- CINEMATIC SYSTEM SPLASH SCREEN --- */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 select-none"
          >
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center_rgba(99,102,241,0.08),transparent_60%)] pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-md w-full flex flex-col items-center text-center"
            >
              {/* Spinning tech borders around logo */}
              <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                {/* Outermost dash border */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/20 animate-[spin_20s_linear_infinite]" />
                
                {/* Secondary cyan ring */}
                <div className="absolute inset-2 rounded-full border border-cyan-500/30 animate-[spin_10s_linear_infinite_reverse]" style={{ animationDirection: "reverse" }} />

                {/* Cyber hexagonal brackets simulation */}
                <div className="absolute -inset-1 border-y border-indigo-500/40 rounded-full animate-pulse" />

                {/* Logo Image */}
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500/40 bg-slate-900 shadow-2xl relative z-10">
                  <img 
                    src="/src/assets/images/noorguard_logo_1783956990608.jpg" 
                    alt="NoorGuard Premium Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* System Title */}
              <h1 className="text-2xl font-bold tracking-[0.2em] uppercase font-display bg-gradient-to-r from-slate-100 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
                NoorGuard
              </h1>
              <p className="text-[10px] font-mono text-indigo-400 tracking-[0.4em] uppercase mt-2 mb-10 font-semibold">
                Sovereign Controller
              </p>

              {/* Status and Progress Bar */}
              <div className="w-full max-w-xs space-y-3">
                <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 relative">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full"
                    animate={{ width: `${splashProgress}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>

                <div className="flex items-center justify-between font-mono text-[9px] text-slate-500 px-1">
                  <span className="animate-pulse tracking-wider truncate max-w-[200px]">
                    {splashLog}
                  </span>
                  <span className="font-bold text-indigo-400">
                    {splashProgress}%
                  </span>
                </div>
              </div>

              {/* Footer specs */}
              <div className="absolute bottom-[-100px] left-0 right-0 flex flex-col items-center font-mono text-[9px] text-slate-600 gap-1">
                <span>SECURE CRYPTO KERNEL V2.0-RELEASE</span>
                <span>ZERO-TRUST REMOTE SUPERVISOR ENGINE</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sovereign Grid Background Accents */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top_rgba(99,102,241,0.05),transparent_50%)] pointer-events-none z-0" />

      {/* --- SIDEBAR SHIFT / NAVIGATION SHELL --- */}
      {/* Mobile Top Header (only visible on mobile) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500/10 border border-indigo-500/25 rounded-lg overflow-hidden flex items-center justify-center">
            <img 
              src="/src/assets/images/noorguard_logo_1783956990608.jpg" 
              alt="NoorGuard Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-xs font-bold tracking-tight text-slate-100 font-display">NoorGuard</span>
        </div>
        
        <div className="flex items-center gap-2.5">
          {isBiometricVerified ? (
            <button 
              onClick={() => {
                setIsBiometricVerified(false);
                addSystemLog("SECURITY", "INFO", "dev-gate", "Supervisor Shell", "Manual biometric authorization lock triggered.", "Session keys revoked immediately.");
              }}
              className="p-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg cursor-pointer flex items-center justify-center"
              title="Verified. Tap to Lock."
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          ) : (
            <button 
              onClick={() => {
                setPendingAction(null);
                setShowBiometricModal(true);
                setIsScanningBiometrics(false);
                setScanProgress(0);
                setScanStatusLog(["SYSTEM: Secure Enclave waiting for biometric dispatch..."]);
              }}
              className="p-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg cursor-pointer animate-pulse flex items-center justify-center"
              title="Tap to verify biometrics"
            >
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            </button>
          )}

          {user && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              SEC_ACTIVE
            </span>
          )}
          
          <button
            onClick={() => {
              setPaletteSearchQuery("");
              setPaletteActiveIndex(0);
              setIsPaletteOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-800/50 rounded-lg border border-slate-700/80 cursor-pointer"
            title="Search command palette"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowInstallModal(true)}
            className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg cursor-pointer flex items-center justify-center"
            title="ডাউনলোড ও ইনস্টল করুন (Download / Install Client)"
          >
            <Download className="h-4 w-4 animate-bounce" style={{ animationDuration: "2s" }} />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-800/50 rounded-lg border border-slate-700/80 cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop Overlay */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Responsive Sidebar Menu */}
      <motion.aside 
        initial={isMobile ? { x: "-100%" } : { x: 0 }}
        animate={isMobile ? { x: isMobileMenuOpen ? 0 : "-100%" } : { x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between md:sticky md:h-screen md:top-0 md:shrink-0 md:translate-x-0"
      >
        <div>
          {/* Brand Identity / Logo */}
          <div className="p-5 border-b border-slate-800/80 bg-slate-950/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/25 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                    <img 
                      src="/src/assets/images/noorguard_logo_1783956990608.jpg" 
                      alt="NoorGuard Logo" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-100 font-display">
                    NoorGuard
                  </h1>
                  <span className="text-[9px] font-mono text-slate-400 leading-none">
                    v2.0-Alpha
                  </span>
                </div>
              </div>

              {/* Close Button on Mobile menu overlay */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Zero-Trust Device Supervisor Suite</p>
          </div>

          {/* Sidebar Nav Items */}
          <nav className="p-4 space-y-1.5">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider block px-2 mb-2">
              Supervision Shell
            </span>

            {/* Navigation Button: Overview */}
            <button
              onClick={() => { setActiveTab("overview"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Overview & Metrics</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === "overview" ? "bg-indigo-500/25 text-indigo-300 animate-pulse" : "bg-slate-950/50 text-slate-500"
              }`}>
                LIVE
              </span>
            </button>

            {/* Navigation Button: Device Matrix */}
            <button
              onClick={() => { setActiveTab("devices"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "devices"
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cpu className="h-4 w-4 shrink-0" />
                <span>Device Matrix</span>
              </div>
              {restrictedNodesCount > 0 ? (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse font-bold">
                  {restrictedNodesCount} LOCK
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/50 text-slate-500">
                  {devices.length}
                </span>
              )}
            </button>

            {/* Navigation Button: Mesh Network */}
            <button
              onClick={() => { setActiveTab("mesh"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "mesh"
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Network className="h-4 w-4 shrink-0" />
                <span>Mesh Linkages</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/50 text-slate-500">
                P2P
              </span>
            </button>

            {/* Navigation Button: Edge Telemetry */}
            <button
              onClick={() => { setActiveTab("edge"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "edge"
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 shrink-0" />
                <span>Edge Telemetry</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === "edge" ? "bg-indigo-500/25 text-indigo-300 animate-pulse" : "bg-slate-950/50 text-slate-500"
              }`}>
                EDGE
              </span>
            </button>

            {/* Navigation Button: Cryptographic Ledger */}
            <button
              onClick={() => { setActiveTab("ledger"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "ledger"
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ScrollText className="h-4 w-4 shrink-0" />
                <span>Crypto Ledger</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/50 text-slate-500">
                {auditLogs.length}
              </span>
            </button>

            {/* Navigation Button: File Manager & Share */}
            <button
              onClick={() => { setActiveTab("files"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all cursor-pointer ${
                activeTab === "files"
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="h-4 w-4 shrink-0" />
                <span>ফাইল ম্যানেজার শেয়ার</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                activeTab === "files" ? "bg-indigo-500/25 text-indigo-300 animate-pulse" : "bg-slate-950/50 text-slate-500"
              }`}>
                SHARE
              </span>
            </button>
          </nav>
        </div>

        {/* User Profile & Auth at Bottom of Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          {user ? (
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800/85 p-2.5 rounded-xl shadow-inner">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="profile" 
                    className="h-7 w-7 rounded-full border border-indigo-500/30 shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                    {user.email?.slice(0, 2)}
                  </div>
                )}
                <div className="text-left overflow-hidden">
                  <span className="text-[11px] font-semibold text-slate-200 block truncate leading-tight">
                    {user.displayName || user.email?.split("@")[0]}
                  </span>
                  <span className="text-[8px] text-emerald-400 font-mono block tracking-wider leading-none mt-1">SEC_ACTIVE</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-all cursor-pointer shrink-0"
                title="Disconnect security token"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full gsi-material-button shadow-md transform hover:scale-[1.01] transition-all flex items-center justify-center"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents text-xs">Sign in with Google</span>
              </div>
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Panel Frame Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        
        {/* Top bar on desktop containing secondary links / Quick action sync tools */}
        <header className="hidden md:flex items-center justify-between border-b border-slate-900 bg-slate-950/75 px-8 py-3.5 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">SYSTEM STABILITY MATRIX:</span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              SECURE_FEED_STABLE
            </span>
          </div>

          {/* Center Command Palette Quick Launcher */}
          <button 
            onClick={() => {
              setPaletteSearchQuery("");
              setPaletteActiveIndex(0);
              setIsPaletteOpen(true);
            }}
            className="flex items-center justify-between bg-slate-900/60 hover:bg-slate-850/80 text-slate-400 hover:text-slate-300 border border-slate-800/80 rounded-xl px-4 py-1.5 text-[11px] font-mono transition-all cursor-pointer w-80 shadow-md hover:shadow-indigo-500/5"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span>Search assets, logs, actions...</span>
            </div>
            <kbd className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-500 tracking-wider">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-4 text-xs font-mono">
            {isBiometricVerified ? (
              <button 
                onClick={() => {
                  setIsBiometricVerified(false);
                  addSystemLog("SECURITY", "INFO", "dev-gate", "Supervisor Shell", "Manual biometric authorization lock triggered.", "Session keys revoked immediately.");
                }}
                className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer shadow-md"
                title="Biometrics verified. Click to lock administrative controls."
              >
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                ADMIN_UNLOCKED
              </button>
            ) : (
              <button 
                onClick={() => {
                  setPendingAction(null);
                  setShowBiometricModal(true);
                  setIsScanningBiometrics(false);
                  setScanProgress(0);
                  setScanStatusLog(["SYSTEM: Secure Enclave waiting for biometric dispatch..."]);
                }}
                className="flex items-center gap-1.5 text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 transition-all cursor-pointer animate-pulse shadow-md"
                title="Click to authenticate via simulated biometrics"
              >
                <ShieldAlert className="h-3 w-3 text-amber-400" />
                ADMIN_LOCKED
              </button>
            )}

            {token ? (
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded">
                GDRIVE_CLOUD_MOUNTED
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                LOCAL_IMMUTABLE_STORAGE_ONLY
              </span>
            )}
            
            <button 
              onClick={() => withBiometricShield(handleTriggerMeshSync)}
              disabled={isSyncingMesh}
              className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-300 hover:text-indigo-400 bg-slate-900 hover:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncingMesh ? "animate-spin" : ""}`} />
              Sync Mesh Topology
            </button>

            <button 
              onClick={() => setShowInstallModal(true)}
              className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-400 hover:text-emerald-350 bg-emerald-500/10 hover:bg-emerald-500/15 px-3 py-1.5 rounded-lg border border-emerald-500/25 transition-all cursor-pointer shadow-md hover:shadow-emerald-500/5 animate-[pulse_3s_infinite]"
            >
              <Download className="h-3.5 w-3.5" />
              ডাউনলোড ও ইনস্টল
            </button>
          </div>
        </header>

        {/* --- MAIN RENDERING PORTAL --- */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto space-y-6">
          
          {/* Core Architectural Banner Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
            <div className="absolute top-0 left-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Sovereign Architecture Board 
                <span className="text-[10px] font-mono text-indigo-400 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                  {activeTab.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                A modern, decentralized zero-trust monitor built to supervise enterprise digital assets.
                Integrate Google Drive for immutable audit exporting, and use Gemini Anomaly Detection to map device threat vulnerabilities dynamically.
              </p>
            </div>

            <div className="flex gap-4 self-start md:self-center shrink-0">
              {/* Stat 1 */}
              <div className="bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold font-mono">Privilege Tunnels</span>
                <span className="text-sm font-bold text-indigo-400 font-mono">{activeTunnelsCount} active</span>
              </div>
              {/* Stat 2 */}
              <div className="bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold font-mono">Quarantine Queue</span>
                <span className="text-sm font-bold text-red-400 font-mono">{restrictedNodesCount} systems</span>
              </div>
            </div>
          </div>

          {/* Render Active View Tab */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Live Security Analytics & Threat Telemetry
                    </h3>
                  </div>
                  <SovereignVisualDashboard 
                    logs={auditLogs}
                    devices={devices}
                    aiScanResult={aiAnalysisReport}
                  />
                </div>
              )}

              {activeTab === "devices" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Operational Device Matrix</h3>
                    </div>
                    <SovereignDigitalAssetMatrix 
                      devices={devices}
                      onToggleAccessibility={(id) => withBiometricShield(() => handleToggleAccessibility(id))}
                      onToggleBlackScreen={(id) => withBiometricShield(() => handleToggleBlackScreen(id))}
                      onToggleMic={(id) => withBiometricShield(() => handleToggleMic(id))}
                      onRestrictDevice={(id) => withBiometricShield(() => handleRestrictDevice(id))}
                    />
                  </div>

                  {/* Side Panels helper for controls */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Acoustics surroundings</h3>
                      </div>
                      <SurroundingsMonitor 
                        micActive={devices.some(d => d.micMonitoringActive)}
                        onToggleMic={() => withBiometricShield(() => {
                          const anyActive = devices.some(d => d.micMonitoringActive);
                          setDevices(prev => prev.map(d => {
                            if (anyActive) {
                              return { ...d, micMonitoringActive: false };
                            } else {
                              if (d.id === "dev-mobile") {
                                { /* eslint-disable-next-line */ }
                                return { ...d, micMonitoringActive: true };
                              }
                            }
                            return d;
                          }));
                        })}
                        deviceName={devices.find(d => d.micMonitoringActive)?.name || "Noor-Mobile-X2"}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Supervisor Console</h3>
                      </div>
                      <CommandConsole 
                        devices={devices}
                        onExecuteAction={(action, deviceId) => withBiometricShield(() => handleExecuteConsoleAction(action, deviceId))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "mesh" && (
                <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Physical Linkages Map</h3>
                    </div>
                    <MeshNetwork 
                      nodes={meshNodes}
                      connections={meshConnections}
                      onTriggerSync={() => withBiometricShield(handleTriggerMeshSync)}
                      isSyncing={isSyncingMesh}
                    />
                  </div>
                </div>
              )}

              {activeTab === "ledger" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Security Cryptographic Ledger</h3>
                  </div>
                  <AuditLogger 
                    logs={auditLogs}
                    onTriggerAiScan={() => withBiometricShield(handleTriggerAiScan)}
                    aiScanResult={aiAnalysisReport}
                    isScanning={isScanningLogs}
                    accessToken={token}
                    onUploadToDrive={(fileName, logContent) => {
                      // Returns a promise that wraps handleUploadToDrive after verification
                      return new Promise((resolve, reject) => {
                        withBiometricShield(() => {
                          handleUploadToDrive(fileName, logContent).then(resolve).catch(reject);
                        });
                      });
                    }}
                    initialSearchQuery={ledgerSearchQuery}
                  />
                </div>
              )}

              {activeTab === "edge" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Decentralized Edge Telemetry & Local Anomaly Detection</h3>
                  </div>
                  <EdgeTelemetryMonitor 
                    devices={devices}
                    setDevices={setDevices}
                    addSystemLog={addSystemLog}
                  />
                </div>
              )}

              {activeTab === "files" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                      সোভারেন ফাইল ম্যানেজার ও এনক্রিপ্টেড শেয়ারিং হাব
                    </h3>
                  </div>
                  <SovereignFileManager 
                    devices={devices}
                    accessToken={token}
                    addSystemLog={addSystemLog}
                    withBiometricShield={withBiometricShield}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

        </main>

        {/* Styled Footer */}
        <footer className="border-t border-slate-900 mt-12 bg-slate-950/85 text-center py-6 text-xs text-slate-500 font-mono relative">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p>© 2026 NoorNexus Sovereign Architecture Security Grid. All Rights Reserved.</p>
            <div className="flex justify-center gap-4 text-[10px]">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Secure Frame Mode</span>
              <span>|</span>
              <span className="text-slate-400">rsk755734@gmail.com</span>
            </div>
          </div>
        </footer>

      </div>

      {/* --- COMMAND PALETTE OVERLAY CONSOLE --- */}
      <AnimatePresence>
        {isPaletteOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
            {/* Dark glassmorphic backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaletteOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Spotlight search layout card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] z-10 backdrop-blur-xl"
            >
              {/* Command input header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/40">
                <Search className="h-5 w-5 text-indigo-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Type a device name, command, or audit detail..."
                  value={paletteSearchQuery}
                  onChange={(e) => setPaletteSearchQuery(e.target.value)}
                  onKeyDown={handlePaletteKeyDown}
                  className="flex-1 bg-transparent text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded uppercase">
                  <span>ESC</span>
                </div>
              </div>

              {/* Dynamic results rendering */}
              <div className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[50vh] custom-scrollbar">
                {flatPaletteItems.length > 0 ? (
                  <div className="space-y-1">
                    {/* Render grouped sections */}
                    {["COMMANDS", "ASSET NODES", "SECURITY LOGS"].map((category) => {
                      const items = flatPaletteItems.filter(item => item.category === category);
                      if (items.length === 0) return null;

                      return (
                        <div key={category} className="space-y-0.5">
                          <div className="text-[9px] font-mono font-bold text-indigo-400 px-3 py-2 tracking-wider">
                            {category}
                          </div>
                          {items.map((item) => {
                            const itemIndex = flatPaletteItems.findIndex(i => i.id === item.id);
                            const isActive = itemIndex === paletteActiveIndex;
                            const Icon = item.icon;

                            return (
                              <div
                                key={item.id}
                                onClick={() => item.action()}
                                onMouseEnter={() => setPaletteActiveIndex(itemIndex)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                                  isActive
                                    ? "bg-indigo-600/15 border-indigo-500/30 text-slate-100"
                                    : "bg-transparent border-transparent hover:bg-slate-850/40 text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-950 text-slate-500"}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-mono font-semibold truncate text-slate-100">{item.label}</div>
                                    <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{item.sublabel}</div>
                                  </div>
                                </div>

                                {item.badge && (
                                  <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 uppercase ml-2 ${
                                    item.badge === "Safe" || item.badge === "SUCCESS"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                                      : item.badge === "Monitoring" || item.badge === "WARNING" || item.badge === "INFO"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
                                      : "bg-red-500/10 text-red-400 border-red-500/15"
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-mono text-xs italic">
                    No results found matching '{paletteSearchQuery}'
                  </div>
                )}
              </div>

              {/* Command Palette Helper Footer */}
              <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                </div>
                <div>
                  <span>NoorShield Sovereign Engine</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- BIOMETRIC VERIFICATION MODAL --- */}
      <AnimatePresence>
        {showBiometricModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isScanningBiometrics) {
                  setShowBiometricModal(false);
                  setPendingAction(null);
                }
              }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Verification Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 p-6 text-center"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2 text-left">
                  <Fingerprint className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                      Biometric Shield Entry
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      NoorShield Enclave v2.0
                    </p>
                  </div>
                </div>
                <button
                  disabled={isScanningBiometrics}
                  onClick={() => {
                    setShowBiometricModal(false);
                    setPendingAction(null);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Toggle Methods (Fingerprint vs FaceID) */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
                <button
                  disabled={isScanningBiometrics}
                  onClick={() => setBiometricMethod("fingerprint")}
                  className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    biometricMethod === "fingerprint"
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-500 hover:text-slate-300 border border-transparent"
                  }`}
                >
                  Fingerprint (TouchID)
                </button>
                <button
                  disabled={isScanningBiometrics}
                  onClick={() => setBiometricMethod("faceid")}
                  className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    biometricMethod === "faceid"
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-500 hover:text-slate-300 border border-transparent"
                  }`}
                >
                  Face Mesh (FaceID)
                </button>
              </div>

              {/* Scanner Frame Container */}
              <div className="flex flex-col items-center justify-center py-6 relative bg-slate-950/40 border border-slate-800/60 rounded-2xl mb-6 overflow-hidden">
                {/* Floating Scan Light line */}
                {isScanningBiometrics && (
                  <motion.div
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_10px_#6366f1] z-20 pointer-events-none"
                  />
                )}

                {/* Simulated fingerprint / Face scanner visual */}
                <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                  {/* Outer spinning ring or pulsing circle */}
                  <div className={`absolute inset-0 rounded-full border-2 border-dashed ${
                    isScanningBiometrics 
                      ? "border-indigo-500 animate-spin" 
                      : isBiometricVerified 
                      ? "border-emerald-500" 
                      : "border-slate-700"
                  } opacity-30`} style={{ animationDuration: "12s" }} />

                  {/* Dynamic pulse rings */}
                  {isScanningBiometrics && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-full bg-indigo-500/10 border border-indigo-500/30"
                    />
                  )}

                  {/* Core scanner graphics */}
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-slate-900 border ${
                    isScanningBiometrics 
                      ? "border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                      : "border-slate-800 text-slate-500 hover:text-slate-300"
                  } transition-all duration-300`}>
                    {biometricMethod === "fingerprint" ? (
                      <Fingerprint className={`h-8 w-8 ${isScanningBiometrics ? "animate-pulse" : ""}`} />
                    ) : (
                      // Custom Face Grid simulation
                      <svg className={`h-8 w-8 ${isScanningBiometrics ? "animate-pulse" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 18V20C4 20.55 4.45 21 5 21H7" />
                        <path d="M20 18V20C20 20.55 19.55 21 19 21H17" />
                        <path d="M4 6V4C4 3.45 4.45 3 5 3H7" />
                        <path d="M20 6V4C20 3.45 19.55 3 19 3H17" />
                        <circle cx="12" cy="10" r="3" />
                        <path d="M9 16C10 17.5 14 17.5 15 16" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="w-full max-w-[240px]">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1.5">
                    <span>STATUS SECURE CHANNEL</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Console log of current scan progress */}
              <div className="h-20 bg-slate-950 border border-slate-850 rounded-xl p-3 text-left overflow-y-auto font-mono text-[9px] text-slate-400 space-y-1 select-none scrollbar-thin scrollbar-thumb-slate-800">
                {scanStatusLog.map((log, index) => (
                  <div key={index} className={`${
                    log.startsWith("SUCCESS") 
                      ? "text-emerald-400" 
                      : log.startsWith("ERROR") 
                      ? "text-red-400" 
                      : log.startsWith("SYSTEM") 
                      ? "text-indigo-400" 
                      : "text-slate-400"
                  }`}>
                    {log}
                  </div>
                ))}
              </div>

              {/* Remember Option */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2.5 mb-6">
                <span className="text-left font-semibold">PERSIST SESSION AUTH</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="sr-only peer"
                    disabled={isScanningBiometrics}
                  />
                  <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-indigo-200"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                  type="button"
                  disabled={isScanningBiometrics}
                  onClick={() => {
                    setShowBiometricModal(false);
                    setPendingAction(null);
                  }}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={isScanningBiometrics}
                  onClick={handleStartBiometricScan}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs font-mono transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isScanningBiometrics ? "SCANNING..." : "INITIATE SCAN"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PREMIUM APP INSTALLER / DOWNLOADER MODAL --- */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDownloadingClient) setShowInstallModal(false);
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
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Download className="h-5 w-5 text-emerald-400 animate-pulse" />
                    NoorGuard ডাউনলোড ও ইনস্টল
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Setup standalone client secure container on mobile or desktop
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!isDownloadingClient) setShowInstallModal(false);
                  }}
                  disabled={isDownloadingClient}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-850 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Real PWA Quick Install Banner if applicable */}
              {isInstallable ? (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="text-xs font-bold text-emerald-400">সহজ ইনস্টলেশন উপলব্ধ! (Direct Install Available)</h4>
                    <p className="text-[10px] text-slate-300">
                      আপনার ব্রাউজার সরাসরি ইনস্টলেশন সমর্থন করে। কোনো ফাইল ডাউনলোড ছাড়াই লাইটওয়েট অ্যাপ ইনস্টল করুন।
                    </p>
                  </div>
                  <button
                    onClick={handlePwaInstall}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/10 shrink-0"
                  >
                    ইনস্টল করুন (Install Now)
                  </button>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="text-xs font-bold text-indigo-400">PWA লাইট ইনস্টলেশন (PWA Light Shortcut)</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      মোবাইল বা কম্পিউটারে ক্রোম বা সাফারি ব্রাউজারের <b>"Add to Home Screen"</b> অথবা <b>"Install App"</b> অপশন ব্যবহার করে সরাসরি ইনস্টল করুন।
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-1 rounded">
                    HIGHLY_STABLE
                  </span>
                </div>
              )}

              {/* Install Options Section */}
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold tracking-widest block uppercase mb-3">
                    ১. কম্পিউটার ডাউনলোড (Computer / PC Installation)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleStartClientDownload("windows")}
                      disabled={isDownloadingClient}
                      className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
                    >
                      <Laptop className="h-6 w-6 text-slate-400 group-hover:text-indigo-400 mb-2 transition-all" />
                      <span className="text-xs font-bold text-slate-200">Windows Client</span>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono">v2.0-win64.exe</span>
                    </button>

                    <button
                      onClick={() => handleStartClientDownload("macos")}
                      disabled={isDownloadingClient}
                      className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
                    >
                      <svg className="h-6 w-6 text-slate-400 group-hover:text-indigo-400 mb-2 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <span className="text-xs font-bold text-slate-200">macOS DMG Build</span>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono">v2.0-universal.dmg</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold tracking-widest block uppercase mb-3">
                    ২. মোবাইল ডাউনলোড ও সিঙ্ক (Mobile Setup & Sync)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* APK Download Card */}
                    <button
                      onClick={() => handleStartClientDownload("apk")}
                      disabled={isDownloadingClient}
                      className="flex flex-col items-center justify-center p-5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
                    >
                      <Smartphone className="h-7 w-7 text-slate-400 group-hover:text-cyan-400 mb-2.5 transition-all" />
                      <span className="text-xs font-bold text-slate-200">Android APK File</span>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono">noorguard-client.apk</span>
                    </button>

                    {/* QR Code Syncing block */}
                    <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                      <div className="p-1 bg-white rounded-lg shrink-0">
                        {/* Beautiful simulated vector QR Code */}
                        <div className="w-14 h-14 bg-slate-100 flex flex-col gap-1 p-1 justify-between select-none">
                          <div className="flex justify-between w-full h-3">
                            <div className="w-3 h-3 bg-slate-950 border border-slate-900 rounded-[1px]" />
                            <div className="w-1 h-2 bg-slate-950" />
                            <div className="w-3 h-3 bg-slate-950 border border-slate-900 rounded-[1px]" />
                          </div>
                          <div className="flex justify-between w-full h-3">
                            <div className="w-1 h-3 bg-slate-950" />
                            <div className="w-3 h-2 bg-slate-950" />
                            <div className="w-2 h-2 bg-slate-950" />
                          </div>
                          <div className="flex justify-between w-full h-3">
                            <div className="w-3 h-3 bg-slate-950 border border-slate-900 rounded-[1px]" />
                            <div className="w-1 h-3 bg-slate-950" />
                            <div className="w-2 h-2 bg-slate-950" />
                          </div>
                        </div>
                      </div>
                      <div className="text-left space-y-1">
                        <span className="text-[10px] font-bold text-slate-200 block">QR কোড স্ক্যান করুন</span>
                        <p className="text-[9px] text-slate-500 leading-normal">
                          মোবাইল ক্যামেরা দিয়ে স্ক্যান করে সরাসরি ফোনে অ্যাপটি লোড ও ইনস্টল করুন।
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Simulated Download Loading Overlay */}
              {isDownloadingClient && (
                <div className="absolute inset-0 bg-slate-950/95 rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
                    {/* Spinning tech border */}
                    <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/40 animate-spin" style={{ animationDuration: "8s" }} />
                    <div className="absolute inset-2 rounded-full bg-emerald-500/5 animate-pulse" />
                    <Download className="h-8 w-8 text-emerald-400 animate-[bounce_1.5s_infinite]" />
                  </div>

                  <h4 className="text-sm font-bold text-slate-100 font-mono tracking-wider">
                    COMPILING BINARY FOR SECURE DOWNLOAD
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs font-mono">
                    Compiling secure client bundle and signing certificate hashes...
                  </p>

                  <div className="w-full max-w-xs mt-8 space-y-2">
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>SECURE_PIPE_STABLE</span>
                      <span className="text-emerald-400 font-bold">{downloadProgress}%</span>
                    </div>
                  </div>

                  {/* Log stream */}
                  <div className="mt-6 w-full max-w-xs bg-slate-900 border border-slate-850 rounded-xl p-3 h-20 overflow-y-auto text-left font-mono text-[9px] text-slate-400 space-y-0.5 scrollbar-none">
                    {downloadStatusLog.map((log, index) => (
                      <div key={index} className={log.startsWith("SUCCESS") ? "text-emerald-400" : "text-slate-400"}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
