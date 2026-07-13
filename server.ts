import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Lazy-loaded Gemini AI client helper to avoid crashes on startup
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Security secret for simulated HMAC verification
const SHIELD_HMAC_SECRET = process.env.SHIELD_HMAC_SECRET || "SovereignShieldKeyNoorNexus2026";

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "NoorGuard Sovereign Controller Engine" });
});

// 2. Compute HMAC signature server-side (for hardware state synchronization)
app.post("/api/security/hmac", (req, res) => {
  const { payload } = req.body;
  if (!payload) {
    res.status(400).json({ error: "Missing payload to sign" });
    return;
  }
  const hmac = crypto.createHmac("sha256", SHIELD_HMAC_SECRET);
  hmac.update(JSON.stringify(payload));
  const signature = hmac.digest("hex");
  res.json({ signature, timestamp: new Date().toISOString() });
});

// Helper heuristics fallback for AI Log Analysis when Gemini is overloaded or unavailable
function fallbackLogAnalysis(logs: any[]) {
  const anomalies: any[] = [];
  let threatScore = 15; // default baseline security score
  let status = "SAFE";

  // Scan logs for warnings and critical severity
  for (const log of logs) {
    if (log.severity === "CRITICAL") {
      threatScore = Math.max(threatScore, 85);
      anomalies.push({
        logId: log.id || "UNKNOWN",
        issue: log.action || "Critical event detected",
        severity: "CRITICAL",
        vector: log.category === "ACCESSIBILITY" ? "Unauthorized Remote Access" :
                log.category === "AUDIO_SURROUND" ? "Acoustic Leakage Risk" : "Critical Operations Bypass"
      });
    } else if (log.severity === "WARNING") {
      threatScore = Math.max(threatScore, 45);
      anomalies.push({
        logId: log.id || "UNKNOWN",
        issue: log.action || "Warning event detected",
        severity: "MEDIUM",
        vector: log.category === "ACCESSIBILITY" ? "Accessibility Tunnel Active" : "Operational Security Threat"
      });
    }
  }

  if (threatScore >= 80) {
    status = "ALERT";
  } else if (threatScore >= 45) {
    status = "RESTRICTED";
  } else if (threatScore > 20) {
    status = "MONITORING";
  }

  const recommendations = [
    "Verify integrity of security tokens across the mesh networks.",
    "Perform a firmware hash audit on any flagged active nodes.",
    "Quarantine assets demonstrating anomalous accessibility loops."
  ];

  return {
    threatScore,
    status,
    summary: `[Sovereign Heuristics Engine] Automated local analysis complete. Detected ${anomalies.length} anomalous events. System state verified as ${status}.`,
    anomalies,
    recommendations
  };
}

// Helper heuristics fallback for AI Intent Parsing when Gemini is overloaded or unavailable
function fallbackIntentParsing(userIntent: string, activeDevices: any[]) {
  const intent = userIntent.toLowerCase();
  let action = "UNKNOWN";
  let targetDeviceId = "ALL";
  let explanation = "";
  let privilegesRequired: string[] = [];
  let authorized = true;
  let confidenceScore = 0.95;

  // Find target device if mentioned
  const matchingDevice = activeDevices.find(d => 
    intent.includes(d.name.toLowerCase()) || 
    intent.includes(d.id.toLowerCase()) ||
    (d.type && intent.includes(d.type.toLowerCase()))
  );

  if (matchingDevice) {
    targetDeviceId = matchingDevice.id;
  }

  if (intent.includes("lock") || intent.includes("restrict") || intent.includes("quarantine")) {
    action = "LOCK_DEVICE";
    explanation = `Emergency lockdown triggered for ${matchingDevice ? matchingDevice.name : 'assets'} under local Zero-Trust protocol.`;
    privilegesRequired = ["SCREEN_OVERLAY_PRIVILEGE"];
  } else if (intent.includes("black") || intent.includes("obscure") || intent.includes("blind") || intent.includes("screen")) {
    action = "TOGGLE_BLACK_SCREEN";
    explanation = `Activating blackout privacy overlays to obscure physical display outputs on ${matchingDevice ? matchingDevice.name : 'targeted devices'}.`;
    privilegesRequired = ["SCREEN_OVERLAY_PRIVILEGE"];
  } else if (intent.includes("access") || intent.includes("accessibility") || intent.includes("inject") || intent.includes("automation")) {
    action = "TOGGLE_ACCESSIBILITY";
    explanation = `Authorizing programmatic automation and click injection permissions on ${matchingDevice ? matchingDevice.name : 'targeted nodes'}.`;
    privilegesRequired = ["ACCESSIBILITY_CONTROL"];
  } else if (intent.includes("mic") || intent.includes("microphone") || intent.includes("sound") || intent.includes("acoustic") || intent.includes("surroundings")) {
    action = "TOGGLE_MIC";
    explanation = `Opening surround microphone channels to profile background room acoustics on ${matchingDevice ? matchingDevice.name : 'targeted nodes'}.`;
    privilegesRequired = ["MICROPHONE_MONITORING"];
  } else if (intent.includes("audit") || intent.includes("scan") || intent.includes("analyze") || intent.includes("threat") || intent.includes("log")) {
    action = "SYSTEM_AUDIT";
    explanation = "Deploying local heuristics engine to search for anomalies in the cryptographic audit ledger.";
    privilegesRequired = ["AUDIT_READ"];
  } else if (intent.includes("sync") || intent.includes("mesh") || intent.includes("link") || intent.includes("peer")) {
    action = "PEER_SYNC";
    explanation = "Triggering Peer-to-Peer decentralized hash synchronization across the linkages topology.";
    privilegesRequired = ["NETWORK_MESH_WRITE"];
  }

  if (action === "UNKNOWN") {
    authorized = false;
    explanation = `System received command: "${userIntent}", but could not safely match it to an authorized privilege block under Zero Trust.`;
    confidenceScore = 0.4;
  }

  return {
    action,
    targetDeviceId,
    explanation: `[Sovereign Heuristics Agent] ${explanation}`,
    privilegesRequired,
    authorized,
    confidenceScore
  };
}

// 3. AI Anomaly Detection endpoint using Gemini
app.post("/api/gemini/analyze", async (req, res) => {
  const { logs } = req.body;
  if (!logs || !Array.isArray(logs)) {
    res.status(400).json({ error: "Logs array is required for analysis." });
    return;
  }

  let parsedResult;
  try {
    const ai = getAiClient();
    
    const prompt = `
You are the AI Anomaly Detection Engine for NoorGuard Sovereign Controller, a high-security zero-trust device management suite.
Analyze the following JSON system logs to identify anomalies, evaluate potential cyber threat vectors, and provide a security audit report.

Logs:
${JSON.stringify(logs, null, 2)}

Provide your assessment in strict JSON format. Do not include markdown code block syntax or any leading/trailing text outside of the JSON object.
The output MUST match this schema exactly:
{
  "threatScore": number (0 to 100),
  "status": "SAFE" | "MONITORING" | "RESTRICTED" | "ALERT",
  "summary": "Brief natural language summary of the status",
  "anomalies": [
    {
      "logId": "string",
      "issue": "Description of anomalous activity",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "vector": "Threat vector, e.g. Unauthorized Remote Access, Audio Leakage Risk, Access Overlays Bypass"
    }
  ],
  "recommendations": [
    "Specific recommended architecture action 1",
    "Specific recommended architecture action 2"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini.");
    }
    
    parsedResult = JSON.parse(resultText.trim());
  } catch (error: any) {
    console.warn("Gemini Log Analysis failed or unavailable. Falling back to local sovereign heuristics engine. Error:", error.message || error);
    parsedResult = fallbackLogAnalysis(logs);
  }

  res.json(parsedResult);
});

// 4. Intent-Based Natural Language Command Console using Gemini (XAI)
app.post("/api/gemini/intent", async (req, res) => {
  const { userIntent, activeDevices } = req.body;
  if (!userIntent) {
    res.status(400).json({ error: "User intent string is required." });
    return;
  }

  let parsedResult;
  try {
    const ai = getAiClient();

    const prompt = `
You are the Supervisor Agent of NoorGuard Sovereign Controller (Explainable AI - XAI).
The user wants to execute a command through natural language. Your job is to parse their intention, translate it into target device actions, evaluate the security privileges, and explain the architectural reasoning.

Active Devices:
${JSON.stringify(activeDevices, null, 2)}

User Intent: "${userIntent}"

Map the intent to one of these action types if applicable:
- "TOGGLE_ACCESSIBILITY" (Accessibility control)
- "TOGGLE_BLACK_SCREEN" (Privacy overlay layer)
- "TOGGLE_MIC" (Surroundings monitoring)
- "LOCK_DEVICE" (Restricting access)
- "SYSTEM_AUDIT" (Analyzing logs)
- "PEER_SYNC" (Mesh network sync)
- "UNKNOWN" (If not mapping to these)

Provide your response in strict JSON format. Do not include markdown or external text.
Output schema:
{
  "action": "TOGGLE_ACCESSIBILITY" | "TOGGLE_BLACK_SCREEN" | "TOGGLE_MIC" | "LOCK_DEVICE" | "SYSTEM_AUDIT" | "PEER_SYNC" | "UNKNOWN",
  "targetDeviceId": "string" (matching an active device's id, or "ALL" or "NONE"),
  "explanation": "Explain why this action is requested and how the privilege model validates it under Zero Trust.",
  "privilegesRequired": ["ACCESSIBILITY_CONTROL" | "MICROPHONE_MONITORING" | "SCREEN_OVERLAY_PRIVILEGE" | "AUDIT_READ" | "NETWORK_MESH_WRITE"],
  "authorized": boolean,
  "confidenceScore": number (0.0 to 1.0)
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini.");
    }

    parsedResult = JSON.parse(resultText.trim());
  } catch (error: any) {
    console.warn("Gemini Intent Parsing failed or unavailable. Falling back to local sovereign heuristics engine. Error:", error.message || error);
    parsedResult = fallbackIntentParsing(userIntent, activeDevices || []);
  }

  res.json(parsedResult);
});

// 5. Proxy to Google Drive: Upload Security Log
app.post("/api/drive/upload-log", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Bearer access token." });
      return;
    }

    const token = authHeader.split(" ")[1];
    const { logContent, fileName } = req.body;

    if (!logContent) {
      res.status(400).json({ error: "logContent is required." });
      return;
    }

    const name = fileName || `noorguard-audit-${Date.now()}.json`;

    // Google Drive Multipart Upload Format
    const boundary = "noor_nexus_guard_boundary_2026";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name,
      mimeType: "application/json",
      description: "Secure Audit Log from NoorGuard Sovereign Controller"
    };

    const multipartBody = 
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
      (typeof logContent === "string" ? logContent : JSON.stringify(logContent, null, 2)) +
      closeDelimiter;

    const driveResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(Buffer.byteLength(multipartBody)),
      },
      body: multipartBody,
    });

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error("Google Drive API response error:", errorText);
      res.status(driveResponse.status).json({
        error: "Google Drive API returned an error.",
        details: errorText,
      });
      return;
    }

    const responseData = await driveResponse.json();
    res.json({
      success: true,
      fileId: responseData.id,
      fileName: responseData.name,
      message: "Security log uploaded securely to Google Drive."
    });
  } catch (error: any) {
    console.error("Google Drive upload proxy failed:", error);
    res.status(500).json({
      error: "Failed to upload log securely to Google Drive.",
      details: error.message || String(error),
    });
  }
});

// Vite Middleware for Hot Module Replacement (HMR) and static hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback route
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NoorGuard Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
