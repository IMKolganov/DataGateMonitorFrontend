import { type ServiceEntry } from "../types/ServiceEntry";
import type { VpnServersDtoServiceStatusDto } from "../api/orval/model/vpnServersDtoServiceStatusDto";
import type { EnumsServiceStatus } from "../api/orval/model/enumsServiceStatus";

type ServiceStatusEnum = EnumsServiceStatus | string | number | undefined;

/** SignalR may send camelCase DTOs or legacy PascalCase property names. */
type WsServiceStatusPayload = VpnServersDtoServiceStatusDto & {
  VpnServerId?: number;
  Status?: ServiceStatusEnum;
  ErrorMessage?: string | null;
  NextRunTime?: string;
  CountConnectedClients?: number;
  CountSessions?: number;
  TotalBytesIn?: number;
  TotalBytesOut?: number;
};

type WrappedWsServiceStatus = {
  serviceStatus?: WsServiceStatusPayload | null;
  ServiceStatus?: WsServiceStatusPayload | null;
};

function statusToString(s: ServiceStatusEnum): string {
  if (typeof s === "string") return s;
  switch (s) {
    case 0:
      return "Idle";
    case 1:
      return "Running";
    case 2:
      return "Error";
    default:
      return "Unknown";
  }
}

function getInnerStatus(item: unknown): WsServiceStatusPayload | null {
  if (!item || typeof item !== "object") return null;

  const anyItem = item as WrappedWsServiceStatus & WsServiceStatusPayload;
  const wrapped = anyItem.ServiceStatus ?? anyItem.serviceStatus;
  if (wrapped) return wrapped;

  return anyItem;
}

function pickNumber(a?: number, b?: number): number | undefined {
  return typeof a === "number" ? a : typeof b === "number" ? b : undefined;
}

function pickString(a?: string, b?: string): string | undefined {
  return typeof a === "string" ? a : typeof b === "string" ? b : undefined;
}

function pickNullableString(a?: string | null, b?: string | null): string | null | undefined {
  return typeof a === "string" || a === null ? a : typeof b === "string" || b === null ? b : undefined;
}

export function normalizeWsStatuses(input: unknown): Record<number, ServiceEntry> {
  if (!Array.isArray(input)) return {};

  const result: Record<number, ServiceEntry> = {};

  for (const item of input) {
    const raw = getInnerStatus(item);
    if (!raw) continue;

    const id = pickNumber(raw.vpnServerId, raw.VpnServerId);
    if (typeof id !== "number" || Number.isNaN(id) || id <= 0) continue;

    const statusStr = statusToString((raw.status ?? raw.Status) as ServiceStatusEnum);

    const nextRun = pickString(raw.nextRunTime, raw.NextRunTime) ?? "N/A";
    const err = pickNullableString(raw.errorMessage, raw.ErrorMessage) ?? null;

    const cc = pickNumber(raw.countConnectedClients, raw.CountConnectedClients);
    const cs = pickNumber(raw.countSessions, raw.CountSessions);

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
