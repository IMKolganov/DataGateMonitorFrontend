// ServiceEntry is a UI-facing shape for ServiceControls
export type ServiceEntry = {
  status: string; // "Idle" | "Running" | "Error" | "Unknown"
  errorMessage: string | null;
  nextRunTime: string; // ISO string or "N/A"
  countConnectedClients?: number;
  countSessions?: number;
};
