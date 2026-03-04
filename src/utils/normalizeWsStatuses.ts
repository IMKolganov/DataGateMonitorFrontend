import { type ServiceEntry } from "../types/ServiceEntry";
import type { BackgroundServerStatus, ServiceStatusResponse, ServerStatusEnum } from "../types/BackgroundServerStatus";

// Convert enum value to string label
function statusToString(s: ServerStatusEnum | undefined): string {
  if (typeof s === "string") return s;
  switch (s) {
    case 0: return "Idle";
    case 1: return "Running";
    case 2: return "Error";
    default: return "Unknown";
  }
}

// Extract BackgroundServerStatus from item that may be flat or wrapped
function getInnerStatus(item: unknown): BackgroundServerStatus | null {
  const anyItem = item as ServiceStatusResponse | BackgroundServerStatus | undefined;
  if (!anyItem) return null;

  const wrapped = (anyItem as ServiceStatusResponse).ServiceStatus ?? (anyItem as ServiceStatusResponse).serviceStatus;
  if (wrapped) return wrapped;

  return anyItem as BackgroundServerStatus;
}

// Safe pick with PascalCase/camelCase
function pickNumber(a?: number, b?: number): number | undefined {
  return typeof a === "number" ? a : (typeof b === "number" ? b : undefined);
}
function pickString(a?: string, b?: string): string | undefined {
  return typeof a === "string" ? a : (typeof b === "string" ? b : undefined);
}
function pickNullableString(a?: string | null, b?: string | null): string | null | undefined {
  return typeof a === "string" || a === null ? a : (typeof b === "string" || b === null ? b : undefined);
}

export function normalizeWsStatuses(input: unknown): Record<number, ServiceEntry> {
  if (!Array.isArray(input)) return {};

  const result: Record<number, ServiceEntry> = {};

  for (const item of input) {
    const raw = getInnerStatus(item);
    if (!raw) continue;

    const id = pickNumber(raw.VpnServerId, raw.vpnServerId);
    if (typeof id !== "number" || Number.isNaN(id) || id <= 0) continue;

    const statusStr = statusToString((raw.Status ?? raw.status) as ServerStatusEnum | undefined);

    const nextRun = pickString(raw.NextRunTime, raw.nextRunTime) ?? "N/A";
    const err = pickNullableString(raw.ErrorMessage, raw.errorMessage) ?? null;

    // Be forgiving: backend sends ints; we accept numbers or undefined
    const cc = pickNumber(raw.CountConnectedClients, raw.countConnectedClients);
    const cs = pickNumber(raw.CountSessions, raw.countSessions);

    result[id] = {
      status: statusStr,
      nextRunTime: nextRun,
      errorMessage: err,
      countConnectedClients: typeof cc === "number" ? cc : undefined,
      countSessions: typeof cs === "number" ? cs : undefined,
    };
  }

  return result;
}
