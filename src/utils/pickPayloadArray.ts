/** Unwrap common API list shapes (Orval / legacy wrappers). */
export function pickArray(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const p = payload as Record<string, unknown>;

  if (p["data"] != null && !Array.isArray(p["data"])) {
    const nested = pickArray(p["data"]);
    if (nested.length) return nested;
  }

  if (Array.isArray(p["data"])) return p["data"];
  if (Array.isArray(p["items"])) return p["items"];
  if (Array.isArray(p["ovpnFiles"])) return p["ovpnFiles"];
  if (Array.isArray(p["issuedOvpnFile"])) return p["issuedOvpnFile"];
  if (Array.isArray(p["issuedOvpnFiles"])) return p["issuedOvpnFiles"];

  if (Array.isArray(p["serverCertificates"])) return p["serverCertificates"];
  if (Array.isArray(p["certificates"])) return p["certificates"];
  if (Array.isArray(p["monitorServerCertificates"])) return p["monitorServerCertificates"];

  if (typeof payload === "object" && payload !== null) {
    for (const k of Object.keys(p)) {
      const v = p[k];
      if (Array.isArray(v)) return v;
    }
  }

  return [];
}
