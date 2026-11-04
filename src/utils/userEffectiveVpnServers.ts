import type {
  QuotaPlanAllowedServerDto,
  UserQuotaPlanDto,
  UserVpnServerAccessRuleDto,
} from "../api/orvalModelShim";

/** Matches backend `VpnServerAccessRuleMode`: Allow = 1, Deny = 2. */
export const VPN_SERVER_ACCESS_ALLOW = 1;
export const VPN_SERVER_ACCESS_DENY = 2;

/**
 * Matches backend `GetActiveByUserId`: open assignment with `EffectiveTo == null`.
 * At most one per user by unique index; if several exist, prefer newest `EffectiveFrom`.
 */
export function pickActiveUserQuotaAssignment(
  assignments: UserQuotaPlanDto[],
): UserQuotaPlanDto | null {
  const open = assignments.filter((a) => a.effectiveTo == null);
  if (open.length === 0) return null;
  return open.sort((a, b) => {
    const af = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
    const bf = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
    return bf - af;
  })[0];
}

function collectPersonalRules(personalRules: UserVpnServerAccessRuleDto[]): {
  grants: Set<number>;
  blocks: Set<number>;
} {
  const grants = new Set<number>();
  const blocks = new Set<number>();
  for (const rule of personalRules) {
    const id = rule.vpnServerId;
    if (id == null || !Number.isFinite(id)) continue;
    if (rule.mode === VPN_SERVER_ACCESS_DENY) blocks.add(id);
    else grants.add(id);
  }
  return { grants, blocks };
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

  const { grants, blocks } = collectPersonalRules(input.personalRules);

  const effective = new Set<number>([...fromPlan, ...grants]);
  for (const id of blocks) effective.delete(id);
  return [...effective].sort((a, b) => a - b);
}

/**
 * Ids to show in Available-servers UI.
 * - Active plan: plan ∪ grants − denies, intersected with live (non-deleted) servers.
 * - No active plan: unrestricted like backend — all live servers minus personal denies.
 */
export function resolveDisplayableVpnServerIds(input: {
  hasActivePlan: boolean;
  planAllowed: QuotaPlanAllowedServerDto[];
  personalRules: UserVpnServerAccessRuleDto[];
  liveServerIds: number[];
}): number[] {
  const live = [...new Set(input.liveServerIds.filter((id) => Number.isFinite(id)))].sort(
    (a, b) => a - b,
  );
  const liveSet = new Set(live);
  const { blocks } = collectPersonalRules(input.personalRules);

  if (!input.hasActivePlan) {
    return live.filter((id) => !blocks.has(id));
  }

  return resolveEffectiveVpnServerIds({
    planAllowed: input.planAllowed,
    personalRules: input.personalRules,
  }).filter((id) => liveSet.has(id));
}

/** Map effective ids to display names; drop soft-deleted / unknown orphans. */
export function namesForKnownVpnServers(
  ids: number[],
  servers: { id?: number; serverName?: string | null; isDeleted?: boolean }[],
): string[] {
  const byId = new Map(
    servers
      .filter((s) => s.id != null && !s.isDeleted)
      .map((s) => [s.id as number, s.serverName?.trim() || `Server #${s.id}`]),
  );
  return ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}
