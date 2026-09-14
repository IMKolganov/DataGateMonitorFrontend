import type { XrayClientLinksResponsesDtoIssuedXrayClientLinkDto as IssuedXrayClientLinkDto } from "../api/orval/model/xrayClientLinksResponsesDtoIssuedXrayClientLinkDto";

export type XrayClientLinkRowInput =
  | IssuedXrayClientLinkDto
  | { issuedXrayClientLink?: IssuedXrayClientLinkDto }
  | { issuedOvpnFile?: IssuedXrayClientLinkDto }
  | Record<string, unknown>
  | null
  | undefined;

export function unwrapXrayClientLinkRow(x: XrayClientLinkRowInput): IssuedXrayClientLinkDto | null {
  if (!x) return null;
  if ((x as IssuedXrayClientLinkDto).commonName != null || (x as IssuedXrayClientLinkDto).id != null) {
    return x as IssuedXrayClientLinkDto;
  }
  const rec = x as Record<string, unknown>;
  for (const k of [
    "issuedXrayClientLink",
    "issuedXrayClientLinkDto",
    "issuedOvpnFile",
    "issuedOvpnFileDto",
    "ovpnFile",
    "file",
    "item",
    "value",
    "data",
  ]) {
    const v = rec[k];
    if (v && typeof v === "object" && v !== null) {
      const o = v as IssuedXrayClientLinkDto;
      if (o.commonName != null || o.id != null) return o;
    }
  }
  const payload = rec["payload"];
  if (payload && typeof payload === "object" && payload !== null) {
    const nested =
      (payload as Record<string, unknown>)["issuedXrayClientLink"] ??
      (payload as Record<string, unknown>)["issuedOvpnFile"];
    if (nested && typeof nested === "object") return nested as IssuedXrayClientLinkDto;
  }
  return null;
}

export function readIssuedXrayClientLinkMeta(
  result: unknown,
): { vpnServerId?: number; commonName?: string } {
  if (!result || typeof result !== "object") return {};

  const root = result as Record<string, unknown>;
  const nestedData = root.data;
  const fromNested =
    nestedData && typeof nestedData === "object"
      ? readIssuedXrayClientLinkMeta(nestedData)
      : {};
  if (fromNested.vpnServerId != null && fromNested.commonName)
    return fromNested;

  const file =
    root.issuedXrayClientLink ??
    root.IssuedXrayClientLink ??
    root.issuedOvpnFile ??
    root.IssuedOvpnFile;
  if (!file || typeof file !== "object") return fromNested;

  const record = file as Record<string, unknown>;
  const vpnServerIdRaw = record.vpnServerId ?? record.VpnServerId;
  const vpnServerId =
    typeof vpnServerIdRaw === "number" && Number.isFinite(vpnServerIdRaw) ? vpnServerIdRaw : undefined;
  const commonNameRaw = record.commonName ?? record.CommonName;
  const commonName = typeof commonNameRaw === "string" && commonNameRaw.trim() ? commonNameRaw.trim() : undefined;

  return { vpnServerId, commonName };
}
