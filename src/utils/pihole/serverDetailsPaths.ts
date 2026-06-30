/** Subpaths under `/servers/:id/...` that do not apply to Xray (OpenVPN-only UI). */
export function isXrayBlockedSubpath(relative: string): boolean {
  if (!relative) return false;
  const keys = ["console", "events", "pi-hole"];
  return keys.some((k) => relative === k || relative.startsWith(`${k}/`));
}

/** Admin-only server subpaths (non-admins are redirected to statistics). */
export function isNonAdminBlockedSubpath(relative: string): boolean {
  const keys = ["", "certificates", "console", "ovpn-file-config", "export-template", "events", "pi-hole"];
  return keys.some((k) => (k === "" ? relative === "" : relative === k || relative.startsWith(`${k}/`)));
}
