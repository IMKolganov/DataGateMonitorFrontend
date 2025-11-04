// Raw WS payload models coming from .NET (Newtonsoft.Json, PascalCase likely)
// Be tolerant to both PascalCase and camelCase just in case.

export type ServerStatusEnum = number | "Idle" | "Running" | "Error";

// Flat status (if server sends just BackgroundServerStatus)
export interface BackgroundServerStatus {
  VpnServerId?: number;
  Status?: ServerStatusEnum;
  ErrorMessage?: string | null;
  NextRunTime?: string; // DateTimeOffset -> ISO string
  CountConnectedClients?: number;
  CountSessions?: number;
  TotalBytesIn?: number;
  TotalBytesOut?: number;

  // camelCase variations (if adapted/changed)
  vpnServerId?: number;
  status?: ServerStatusEnum;
  errorMessage?: string | null;
  nextRunTime?: string;
  countConnectedClients?: number;
  countSessions?: number;
  totalBytesIn?: number;
  totalBytesOut?: number;
}

// Wrapped form (if server sends ServiceStatusResponse with { ServiceStatus: ... })
export interface ServiceStatusResponse {
  ServiceStatus?: BackgroundServerStatus;
  serviceStatus?: BackgroundServerStatus;
}
