export type DeviceType = "Gateway" | "Mobile Node" | "Secure Vault" | "Workstation";
export type DeviceStatus = "Safe" | "Monitoring" | "Restricted" | "Alert";

export interface DeviceTelemetry {
  cpu: number;
  memory: number;
  storage: number;
  networkIn: number;
  networkOut: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  ipAddress: string;
  telemetry: DeviceTelemetry;
  accessibilityActive: boolean;
  blackScreenActive: boolean;
  micMonitoringActive: boolean;
  lastSync: string;
  hardwareKeyId: string;
}

export type LogCategory = "SECURITY" | "ACCESSIBILITY" | "AUDIO_SURROUND" | "STORAGE" | "INTELLIGENCE";
export type LogSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  severity: LogSeverity;
  deviceId: string;
  deviceName: string;
  action: string;
  operator: string;
  details: string;
  hmacSignature: string;
}

export interface NetworkConnection {
  from: string;
  to: string;
  status: "active" | "encrypted" | "warning";
  latency: number;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  status: DeviceStatus;
}
