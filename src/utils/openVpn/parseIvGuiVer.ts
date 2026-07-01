export type ParsedIvGuiVer = {
  raw: string;
  clientLabel: string;
  appVersion: string;
  openVpnCore?: string;
};

/** Human-readable labels for common OpenVPN IV_GUI_VER patterns. */
export function parseIvGuiVer(raw: string | null | undefined): ParsedIvGuiVer {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) {
    return { raw: "", clientLabel: "Unknown client", appVersion: "—" };
  }

  const datagate = /^([\d.]+)_datagate_([a-z0-9]+)_([\d.]+)$/i.exec(s);
  if (datagate) {
    return {
      raw: s,
      openVpnCore: datagate[1],
      clientLabel: formatDatagatePlatform(datagate[2]),
      appVersion: datagate[3],
    };
  }

  const datagateShort = /^datagate_([a-z0-9]+)_([\d.]+)$/i.exec(s);
  if (datagateShort) {
    return {
      raw: s,
      clientLabel: formatDatagatePlatform(datagateShort[1]),
      appVersion: datagateShort[2],
    };
  }

  const dataGateMac = /^DataGateMac_([\d.]+)$/i.exec(s);
  if (dataGateMac) {
    return { raw: s, clientLabel: "DataGate macOS", appVersion: dataGateMac[1] };
  }

  const openVpnAndroid = /^net\.openvpn\.connect\.android_([\d.+-]+)$/i.exec(s);
  if (openVpnAndroid) {
    return { raw: s, clientLabel: "OpenVPN Connect (Android)", appVersion: openVpnAndroid[1] };
  }

  const openVpnIos = /^net\.openvpn\.connect\.ios_([\d.+-]+)$/i.exec(s);
  if (openVpnIos) {
    return { raw: s, clientLabel: "OpenVPN Connect (iOS)", appVersion: openVpnIos[1] };
  }

  const ocWindows = /^OCWindows_([\d.+-]+)$/i.exec(s);
  if (ocWindows) {
    return { raw: s, clientLabel: "OpenVPN Connect (Windows)", appVersion: ocWindows[1] };
  }

  const underscoreSplit = s.lastIndexOf("_");
  if (underscoreSplit > 0) {
    return {
      raw: s,
      clientLabel: s.slice(0, underscoreSplit).replace(/_/g, " "),
      appVersion: s.slice(underscoreSplit + 1),
    };
  }

  return { raw: s, clientLabel: s, appVersion: "—" };
}

function formatDatagatePlatform(platform: string): string {
  const p = platform.toLowerCase();
  if (p === "android") return "DataGate Android";
  if (p === "windows") return "DataGate Windows";
  if (p === "mac") return "DataGate macOS";
  if (p === "linux") return "DataGate Linux";
  if (p === "ios") return "DataGate iOS";
  return `DataGate ${platform}`;
}
