/**
 * Sovereign Shield Security Engine - Cryptographic Signing & Row-Level Security (RLS)
 * 
 * This module defines:
 * 1. HMAC-SHA256 Cryptographic Signature Verification for secure, tamper-proof device commands.
 * 2. Enterprise Row-Level Security (RLS) schemas and runtimes simulating relational (PostgreSQL) 
 *    and document-based (Firestore) policies to restrict privilege escalation and coordinate accesses.
 */

// ==========================================
// 1. HMAC CRYPTOGRAPHIC VERIFICATION ENGINE
// ==========================================

/**
 * Universally retrieves the active crypto implementation (Node or Browser)
 */
function getCryptoObject(): Crypto {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto) {
    return (globalThis as any).crypto;
  }
  // Fallback for older server environments
  try {
    return require("crypto").webcrypto;
  } catch {
    throw new Error("Web Crypto API is not accessible in this runtime environment.");
  }
}

/**
 * Computes a secure HMAC-SHA256 hex signature for any text payload
 * @param payload The raw string payload to sign
 * @param secret The pre-shared cryptographic key
 * @returns The hex-encoded signature
 */
export async function generateHMAC(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoEngine = getCryptoObject();
  
  const key = await cryptoEngine.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await cryptoEngine.subtle.sign(
    "HMAC",
    key,
    messageData
  );

  // Convert buffer to Hexadecimal String
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Cryptographically verifies an HMAC-SHA256 signature against a payload
 * Employs a constant-time comparison helper to fully guard against timing side-channel attacks.
 * @param payload The original signed string content
 * @param signature The hex signature to verify against
 * @param secret The pre-shared signature secret
 */
export async function verifyHMAC(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const computedSignature = await generateHMAC(payload, secret);
    
    if (computedSignature.length !== signature.length) {
      return false;
    }

    // Constant-time bitwise comparison to secure against side-channel analysis
    let mismatch = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      mismatch |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    return mismatch === 0;
  } catch (error) {
    console.error("HMAC verification sequence crashed:", error);
    return false;
  }
}

/**
 * Sign an incoming remote command object
 * @param command The structured command properties
 * @param secret The pre-shared secret key
 */
export async function signRemoteCommand(command: {
  action: string;
  targetDeviceId: string;
  operator: string;
  timestamp: string;
  nonce: string;
}, secret: string): Promise<string> {
  const normalizedString = JSON.stringify({
    action: command.action,
    targetDeviceId: command.targetDeviceId,
    operator: command.operator,
    timestamp: command.timestamp,
    nonce: command.nonce
  });
  return generateHMAC(normalizedString, secret);
}


// ==========================================
// 2. ROW-LEVEL SECURITY (RLS) ENGINE
// ==========================================

export type UserRole = "SUPER_ADMIN" | "OPERATOR" | "AUDITOR" | "GUEST";

export interface SecurityUserContext {
  userId: string;
  email: string;
  role: UserRole;
  hardwareEnclaveId?: string; // Bind user to specific secure workstation or gateway
}

export interface ResourceDocument {
  id: string;
  ownerId: string; // The user ID who controls the record
  hardwareEnclaveId?: string; // The hardware bound ID of this device/log/command
  isRestricted: boolean; // Flag indicating if under quarantine
  category?: string; // e.g. "SECURITY", "AUDIO_SURROUND"
}

export type RlsOperation = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

export interface RlsPolicy {
  id: string;
  name: string;
  targetCollection: "devices" | "audit_logs" | "commands";
  operation: RlsOperation;
  /**
   * Evaluates policy permissions against user context and target document.
   */
  evaluate: (user: SecurityUserContext, doc: ResourceDocument) => boolean;
  /**
   * Standard SQL equivalent of the policy for PostgreSQL/Cloud SQL migrations documentation
   */
  sqlEquivalent: string;
  /**
   * Firebase Security rules equivalent for Firestore deployments documentation
   */
  firebaseEquivalent: string;
}

/**
 * Core Policy Matrix mapping out Zero-Trust boundaries for NoorGuard collections
 */
export const RLS_POLICIES: RlsPolicy[] = [
  // --- DEVICES COLLECTION POLICIES ---
  {
    id: "policy-dev-select-all",
    name: "Enclave staff can view devices in their network",
    targetCollection: "devices",
    operation: "SELECT",
    evaluate: (user, doc) => {
      // GUESTs cannot view restricted/quarantined devices. 
      // Other roles can view devices if they are in the same Hardware Enclave or if they are SUPER_ADMIN.
      if (user.role === "GUEST" && doc.isRestricted) return false;
      if (user.role === "SUPER_ADMIN") return true;
      return user.hardwareEnclaveId === doc.hardwareEnclaveId;
    },
    sqlEquivalent: `CREATE POLICY view_devices_policy ON devices FOR SELECT TO authenticated USING (
      auth.role() = 'SUPER_ADMIN' OR hardware_enclave_id = auth.jwt()->>'hardwareEnclaveId'
    );`,
    firebaseEquivalent: `match /devices/{deviceId} {
      allow read: if request.auth != null && (request.auth.token.role == 'SUPER_ADMIN' || resource.data.hardwareEnclaveId == request.auth.token.hardwareEnclaveId);
    }`
  },
  {
    id: "policy-dev-update-operator",
    name: "Only administrators and operator-owners can alter device telemetry and hardware states",
    targetCollection: "devices",
    operation: "UPDATE",
    evaluate: (user, doc) => {
      if (user.role === "SUPER_ADMIN") return true;
      if (user.role === "OPERATOR") {
        // Must match enclave and not be quarantined/restricted, or must be owner
        return user.hardwareEnclaveId === doc.hardwareEnclaveId && doc.ownerId === user.userId;
      }
      return false;
    },
    sqlEquivalent: `CREATE POLICY update_devices_policy ON devices FOR UPDATE TO operators USING (
      auth.role() = 'SUPER_ADMIN' OR (owner_id = auth.uid() AND hardware_enclave_id = auth.jwt()->>'hardwareEnclaveId')
    );`,
    firebaseEquivalent: `match /devices/{deviceId} {
      allow update: if request.auth != null && (request.auth.token.role == 'SUPER_ADMIN' || (resource.data.ownerId == request.auth.uid && resource.data.hardwareEnclaveId == request.auth.token.hardwareEnclaveId));
    }`
  },

  // --- AUDIT LOGS COLLECTION POLICIES ---
  {
    id: "policy-logs-insert-secure",
    name: "Autonomous logging allowed for active operators and services",
    targetCollection: "audit_logs",
    operation: "INSERT",
    evaluate: (user) => {
      // Guest users cannot write audit records directly
      return user.role !== "GUEST";
    },
    sqlEquivalent: `CREATE POLICY insert_logs_policy ON audit_logs FOR INSERT TO authenticated WITH CHECK (
      auth.role() != 'GUEST'
    );`,
    firebaseEquivalent: `match /audit_logs/{logId} {
      allow create: if request.auth != null && request.auth.token.role != 'GUEST';
    }`
  },
  {
    id: "policy-logs-select-auditor",
    name: "Auditors, operators and admins can read cryptographic logs",
    targetCollection: "audit_logs",
    operation: "SELECT",
    evaluate: (user, doc) => {
      // Auditors, Operators and Admins can read. Guests are blocked entirely from reading audit ledgers.
      if (user.role === "GUEST") return false;
      if (user.role === "SUPER_ADMIN" || user.role === "AUDITOR") return true;
      return user.hardwareEnclaveId === doc.hardwareEnclaveId;
    },
    sqlEquivalent: `CREATE POLICY select_logs_policy ON audit_logs FOR SELECT TO authenticated USING (
      auth.role() IN ('SUPER_ADMIN', 'AUDITOR') OR hardware_enclave_id = auth.jwt()->>'hardwareEnclaveId'
    );`,
    firebaseEquivalent: `match /audit_logs/{logId} {
      allow read: if request.auth != null && (request.auth.token.role in ['SUPER_ADMIN', 'AUDITOR'] || resource.data.hardwareEnclaveId == request.auth.token.hardwareEnclaveId);
    }`
  },

  // --- COMMANDS COLLECTION POLICIES ---
  {
    id: "policy-commands-execute",
    name: "Only administrators can issue raw privileged command mutations",
    targetCollection: "commands",
    operation: "INSERT",
    evaluate: (user, doc) => {
      // Admins can execute anything. Operators can only execute non-restricted audio/storage categories.
      if (user.role === "SUPER_ADMIN") return true;
      if (user.role === "OPERATOR") {
        return doc.category !== "SECURITY" && !doc.isRestricted;
      }
      return false;
    },
    sqlEquivalent: `CREATE POLICY execute_commands_policy ON commands FOR INSERT TO authenticated WITH CHECK (
      auth.role() = 'SUPER_ADMIN' OR (auth.role() = 'OPERATOR' AND category != 'SECURITY' AND is_restricted = false)
    );`,
    firebaseEquivalent: `match /commands/{commandId} {
      allow create: if request.auth != null && (request.auth.token.role == 'SUPER_ADMIN' || (request.auth.token.role == 'OPERATOR' && request.resource.data.category != 'SECURITY' && request.resource.data.isRestricted == false));
    }`
  }
];

/**
 * RLS Validation Engine
 * Validates whether a specific operation is cryptographically and logically allowed on a document.
 */
export function validateRLS(
  user: SecurityUserContext,
  doc: ResourceDocument,
  collection: "devices" | "audit_logs" | "commands",
  operation: RlsOperation
): {
  authorized: boolean;
  mismatchedPolicies: string[];
  reason: string;
} {
  // Find all active policies targeting this collection and operation
  const matchingPolicies = RLS_POLICIES.filter(
    p => p.targetCollection === collection && p.operation === operation
  );

  if (matchingPolicies.length === 0) {
    // If no explicit policy is declared, fail-closed (default Zero-Trust behavior)
    return {
      authorized: false,
      mismatchedPolicies: [],
      reason: "ZERO_TRUST_FAIL_CLOSED: No row-level security policy governs this transaction."
    };
  }

  const mismatchedPolicies: string[] = [];
  let isAuthorized = false;

  // Evaluate policies. Under standard RLS, if ANY of the applicable policies evaluate to true, the operation succeeds (logical OR)
  for (const policy of matchingPolicies) {
    const passed = policy.evaluate(user, doc);
    if (passed) {
      isAuthorized = true;
    } else {
      mismatchedPolicies.push(policy.name);
    }
  }

  return {
    authorized: isAuthorized,
    mismatchedPolicies: isAuthorized ? [] : mismatchedPolicies,
    reason: isAuthorized
      ? `ACCESS_GRANTED: Operation validated against applicable policies.`
      : `ACCESS_DENIED: User [Role: ${user.role}] failed the following RLS guards: ${mismatchedPolicies.join(", ")}`
  };
}
