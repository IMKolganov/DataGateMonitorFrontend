import type {
  QuotaPlanAllowedServerDto,
  UserQuotaPlanDto,
  UserVpnServerAccessRuleDto,
} from "../api/orvalModelShim";

/** Matches backend `VpnServerAccessRuleMode`: Allow = 1, Deny = 2. */
export const VPN_SERVER_ACCESS_ALLOW = 1;
export const VPN_SERVER_ACCESS_DENY = 2;

export function pickActiveUserQuotaAssignment(
  assignments: UserQuotaPlanDto[],
  now = new Date(),
): UserQuotaPlanDto | null {
  const t = now.getTime();
  const valid = assignments.filter((a) => {
    const from = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : -Infinity;
    const to = a.effectiveTo != null ? new Date(a.effectiveTo).getTime() : Infinity;
    return from <= t && t <= to;
  });
  if (valid.length === 0) return null;
  return valid.sort((a, b) => {
    const af = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
    const bf = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
    return bf - af;
  })[0];
}

/**
 * Effective VPN servers for a user: plan allowlist ∪ personal grants − personal blocks.
 * An empty plan allowlist contributes no servers (grants still apply).
 */
export function resolveEffectiveVpnServerIds(input: {
  planAllowed: QuotaPlanAllowedServerDto[];
  personalRules: UserVpnServerAccessRuleDto[];
}): number[] {
  const fromPlan = new Set<number>();
  for (const row of input.planAllowed) {
    if (row.vpnServerId != null && Number.isFinite(row.vpnServerId)) {
      fromPlan.add(row.vpnServerId);
    }
  }

  const grants = new Set<number>();
  const blocks = new Set<number>();
  for (const rule of input.personalRules) {
    const id = rule.vpnServerId;
    if (id == null || !Number.isFinite(id)) continue;
    if (rule.mode === VPN_SERVER_ACCESS_DENY) blocks.add(id);
    else grants.add(id);
  }

  const effective = new Set<number>([...fromPlan, ...grants]);
  for (const id of blocks) effective.delete(id);
  return [...effective].sort((a, b) => a - b);
}
