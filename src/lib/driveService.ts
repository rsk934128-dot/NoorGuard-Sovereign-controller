import { AuditLogEntry } from "../types";
import { generateHMAC } from "./security";

/**
 * NoorGuard Sovereign Drive & Cryptographic Sealing Service
 * 
 * Provides services to:
 * 1. Calculate progressive cryptographic blockchain-style chaining hashes for audit logs.
 * 2. Generate a tamper-proof cryptographic seal for audit logs using high-precision UTC timestamping and HMAC.
 * 3. Interact with the Google Drive API using authorized OAuth credentials.
 */

export interface CryptographicSeal {
  timestamp: string;
  recordCount: number;
  blockChainRootHash: string;
  hmacSignature: string;
  algorithm: string;
}

export interface SealedAuditPayload {
  seal: CryptographicSeal;
  records: AuditLogEntry[];
}

/**
 * Generates a progressive cryptographic chaining hash for a list of audit logs.
 * This guarantees that logs cannot be reordered, omitted, or modified without breaking the chain.
 */
export async function calculateChainedRootHash(logs: AuditLogEntry[], secret: string): Promise<string> {
  if (logs.length === 0) {
    return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // Empty SHA-256
  }

  let cumulativeHash = "INIT_NOOR_SHIELD_NEXUS_V1";

  for (const log of logs) {
    const logPayload = JSON.stringify({
      id: log.id,
      timestamp: log.timestamp,
      category: log.category,
      severity: log.severity,
      deviceId: log.deviceId,
      deviceName: log.deviceName,
      action: log.action,
      operator: log.operator,
      details: log.details,
      previousLink: cumulativeHash
    });

    cumulativeHash = await generateHMAC(logPayload, secret);
  }

  return cumulativeHash;
}

/**
 * Constructs an immutable SealedAuditPayload containing a cryptographic seal
 * and the verified audit logs.
 */
export async function sealAuditLogs(
  logs: AuditLogEntry[],
  secret: string = "NOOR_GUARD_SOVEREIGN_SYSTEM_SECRET_KEY_2026"
): Promise<SealedAuditPayload> {
  const timestamp = new Date().toISOString();
  const recordCount = logs.length;
  const rootHash = await calculateChainedRootHash(logs, secret);

  // Compute the final seal HMAC signature
  const sealPayload = JSON.stringify({
    timestamp,
    recordCount,
    rootHash,
    domain: "noorguard.sovereign.controller"
  });

  const hmacSignature = await generateHMAC(sealPayload, secret);

  return {
    seal: {
      timestamp,
      recordCount,
      blockChainRootHash: rootHash,
      hmacSignature,
      algorithm: "HMAC-SHA256"
    },
    records: logs
  };
}

/**
 * Direct client-side proxy helper to upload a raw or sealed file payload to Google Drive
 * utilizing the authorized OAuth access token.
 */
export async function uploadSealedLogsToDrive(
  token: string,
  fileName: string,
  logs: AuditLogEntry[],
  secretKey?: string
): Promise<{ success: boolean; fileId: string; fileName: string; seal: CryptographicSeal }> {
  if (!token) {
    throw new Error("No Google OAuth access token provided for upload.");
  }

  // Generates the immutable sealed audit structure
  const sealedPayload = await sealAuditLogs(logs, secretKey);
  const jsonContent = JSON.stringify(sealedPayload, null, 2);

  // Google Drive Multipart Upload boundary Setup
  const boundary = "noor_shield_drive_multipart_boundary_2026";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: "application/json",
    description: `NoorGuard Cryptographically Sealed Sovereign Audit Trail. Contains ${sealedPayload.seal.recordCount} verified events.`
  };

  const multipartBody = 
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    jsonContent +
    closeDelimiter;

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API failed to process upload request: ${response.statusText}. Details: ${errorText}`);
  }

  const responseData = await response.json();

  return {
    success: true,
    fileId: responseData.id,
    fileName: responseData.name || fileName,
    seal: sealedPayload.seal
  };
}
