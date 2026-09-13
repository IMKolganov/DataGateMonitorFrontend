import { useMemo } from "react";
import { useGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanId } from "../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import { useGetApiUserQuotaPlansGetByUserIdUserId } from "../../api/orval/user-quota-plan/user-quota-plan";
import { useGetApiUserVpnServerAccessRulesGetByUserIdUserId } from "../../api/orval/user-vpn-server-access-rule/user-vpn-server-access-rule";
import { useGetApiV3OpenVpnServersGetAll } from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import type {
  GetQuotaPlanAllowedServersByQuotaPlanIdResponse,
  GetUserQuotaPlansByUserIdResponse,
  GetUserVpnServerAccessRulesByUserIdResponse,
  QuotaPlanAllowedServerDto,
  UserQuotaPlanDto,
  UserVpnServerAccessRuleDto,
  VpnServersV3Response,
} from "../../api/orvalModelShim";
import {
  pickActiveUserQuotaAssignment,
  resolveEffectiveVpnServerIds,
} from "../../utils/userEffectiveVpnServers";

export type UserAvailableServersChipsProps = {
  userId: number;
  /** Tighter layout for DataGrid cells. */
  compact?: boolean;
  /** Max chips before "+N more" (default: compact 3, else unlimited). */
  maxVisible?: number;
};

export function UserAvailableServersChips({
  userId,
  compact = false,
  maxVisible,
}: UserAvailableServersChipsProps) {
  const enabled = Number.isFinite(userId) && userId > 0;
  const limit = maxVisible ?? (compact ? 3 : undefined);

  const { data: assignmentsRaw, isLoading: assignmentsLoading } =
    useGetApiUserQuotaPlansGetByUserIdUserId(userId, {
      query: { enabled, staleTime: 30_000 },
    });
  const assignments: UserQuotaPlanDto[] =
    (assignmentsRaw as GetUserQuotaPlansByUserIdResponse | undefined)?.items ?? [];
  const active = useMemo(() => pickActiveUserQuotaAssignment(assignments), [assignments]);
  const planId = active?.quotaPlanId;

  const { data: allowedRaw, isLoading: allowedLoading } =
    useGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanId(planId ?? 0, {
      query: {
        enabled: enabled && planId != null && planId > 0,
        staleTime: 60_000,
      },
    });
  const planAllowed: QuotaPlanAllowedServerDto[] =
    (allowedRaw as GetQuotaPlanAllowedServersByQuotaPlanIdResponse | undefined)?.items ?? [];

  const { data: rulesRaw, isLoading: rulesLoading } =
    useGetApiUserVpnServerAccessRulesGetByUserIdUserId(userId, {
      query: { enabled, staleTime: 30_000 },
    });
  const personalRules: UserVpnServerAccessRuleDto[] =
    (rulesRaw as GetUserVpnServerAccessRulesByUserIdResponse | undefined)?.items ?? [];

  const { data: serversRaw, isLoading: serversLoading } = useGetApiV3OpenVpnServersGetAll(
    {},
    { query: { enabled, staleTime: 60_000 } },
  );
  const servers = (serversRaw as VpnServersV3Response | undefined)?.vpnServers ?? [];

  const names = useMemo(() => {
    const ids = resolveEffectiveVpnServerIds({ planAllowed, personalRules });
    const byId = new Map(
      servers
        .filter((s) => s.id != null)
        .map((s) => [s.id as number, s.serverName?.trim() || `Server #${s.id}`]),
    );
    return ids.map((id) => byId.get(id) ?? `Server #${id}`);
  }, [planAllowed, personalRules, servers]);

  const loading =
    assignmentsLoading ||
    (planId != null && planId > 0 && allowedLoading) ||
    rulesLoading ||
    serversLoading;

  if (!enabled) return null;

  if (loading) {
    return <span className="user-servers-chips__muted">{compact ? "…" : "Loading servers…"}</span>;
  }

  if (names.length === 0) {
    return <span className="user-servers-chips__muted">{compact ? "None" : "No servers available"}</span>;
  }

  const visible = limit != null ? names.slice(0, limit) : names;
  const rest = limit != null ? Math.max(0, names.length - limit) : 0;

  return (
    <div
      className={["user-servers-chips", compact && "user-servers-chips--compact"].filter(Boolean).join(" ")}
      title={names.join(", ")}
    >
      {visible.map((name, i) => (
        <span key={`${name}-${i}`} className="user-servers-chips__chip">
          {name}
        </span>
      ))}
      {rest > 0 ? <span className="user-servers-chips__more">+{rest}</span> : null}
    </div>
  );
}
