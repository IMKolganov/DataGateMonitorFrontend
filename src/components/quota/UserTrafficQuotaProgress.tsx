import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGetApiOpenVpnClientsOverviewSummary } from "../../api/orval/open-vpn-server-clients/open-vpn-server-clients";
import { useGetApiUserQuotaPlansGetByUserIdUserId } from "../../api/orval/user-quota-plan/user-quota-plan";
import { postApiQuotaPlansGetAll } from "../../api/orval/quota-plan/quota-plan";
import type {
  GetApiOpenVpnClientsOverviewSummaryParams,
  GetUserQuotaPlansByUserIdResponse,
  OverviewTotalsResponse,
  QuotaPlanDto,
  QuotaPlansResponse,
  UserQuotaPlanDto,
} from "../../api/orval/model";
import type { ApiEnvelope } from "../../pages/TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../../pages/TelegramBotSettings/unwrapApiResponse";
import { formatBytes } from "../../utils/utils";

import "../../css/Settings.css";

export type UserTrafficQuotaProgressProps = {
  userId: number;
  /** Required for traffic totals from the overview API. */
  externalId: string | null | undefined;
  /** When provided, avoids extra fetches (e.g. User detail page). */
  quotaPlans?: QuotaPlanDto[] | null;
  /** When provided, avoids user-quota query (e.g. User detail page). */
  userQuotaAssignments?: UserQuotaPlanDto[] | null;
  /** Tighter layout for lists (e.g. User quotas page). */
  compact?: boolean;
  /** When true, do not render the inline "Traffic quota" label (parent supplies a section heading). */
  suppressInlineTitle?: boolean;
};

function pickActiveAssignment(assignments: UserQuotaPlanDto[], now = new Date()): UserQuotaPlanDto | null {
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

function periodBounds(
  kind: "monthly" | "daily",
  now: Date,
): { from: Date; to: Date } {
  if (kind === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { from, to };
}

export function UserTrafficQuotaProgress({
  userId,
  externalId,
  quotaPlans: quotaPlansProp,
  userQuotaAssignments: assignmentsProp,
  compact = false,
  suppressInlineTitle = false,
}: UserTrafficQuotaProgressProps) {
  const quotaPlansQuery = useQuery({
    queryKey: ["postApiQuotaPlansGetAll", "catalog", { includeInactive: true }] as const,
    queryFn: async ({ signal }) => {
      const raw = await postApiQuotaPlansGetAll({ includeInactive: true }, undefined, signal);
      const payload = unwrapMaybeApiResponse<QuotaPlansResponse>(
        raw as QuotaPlansResponse | ApiEnvelope<QuotaPlansResponse> | undefined,
      );
      return payload?.quotaPlans ?? [];
    },
    enabled: quotaPlansProp === undefined,
    staleTime: 10 * 60 * 1000,
  });

  const { data: assignmentsQueryData } = useGetApiUserQuotaPlansGetByUserIdUserId(userId, {
    query: {
      enabled: Number.isFinite(userId) && userId > 0 && assignmentsProp === undefined,
      staleTime: 30_000,
    },
  });

  const assignments = useMemo((): UserQuotaPlanDto[] => {
    if (assignmentsProp !== undefined) return assignmentsProp ?? [];
    return (
      (assignmentsQueryData as GetUserQuotaPlansByUserIdResponse | undefined)?.items ?? []
    );
  }, [assignmentsProp, assignmentsQueryData]);

  const quotaPlans: QuotaPlanDto[] =
    (quotaPlansProp !== undefined ? quotaPlansProp : quotaPlansQuery.data) ?? [];

  const activeAssignment = useMemo(() => pickActiveAssignment(assignments), [assignments]);

  const activePlan = useMemo(() => {
    if (!activeAssignment?.quotaPlanId) return null;
    return quotaPlans.find((p) => p.id === activeAssignment.quotaPlanId) ?? null;
  }, [activeAssignment, quotaPlans]);

  const quotaKindAndLimit = useMemo(() => {
    if (!activePlan) return null;
    const monthly = activePlan.monthlyQuotaBytes;
    const daily = activePlan.dailyQuotaBytes;
    if (monthly != null && monthly > 0) {
      return { kind: "monthly" as const, limitBytes: monthly, planName: activePlan.name ?? "Plan" };
    }
    if (daily != null && daily > 0) {
      return { kind: "daily" as const, limitBytes: daily, planName: activePlan.name ?? "Plan" };
    }
    return null;
  }, [activePlan]);

  const bounds = useMemo(() => {
    if (!quotaKindAndLimit) return null;
    return periodBounds(quotaKindAndLimit.kind, new Date());
  }, [quotaKindAndLimit]);

  const ext = typeof externalId === "string" ? externalId.trim() : "";
  const totalsParams = useMemo((): GetApiOpenVpnClientsOverviewSummaryParams | null => {
    if (!bounds) return null;
    return {
      From: bounds.from.toISOString(),
      To: bounds.to.toISOString(),
      ExternalId: ext || undefined,
    };
  }, [bounds, ext]);

  const summaryParamsPlaceholder: GetApiOpenVpnClientsOverviewSummaryParams = {
    From: "1970-01-01T00:00:00.000Z",
    To: "1970-01-01T00:00:00.000Z",
  };

  const totalsQuery = useGetApiOpenVpnClientsOverviewSummary(totalsParams ?? summaryParamsPlaceholder, {
    query: {
      enabled:
        totalsParams != null &&
        Boolean(totalsParams.From && totalsParams.To && ext) &&
        quotaKindAndLimit != null &&
        Number.isFinite(userId) &&
        userId > 0,
      staleTime: 30_000,
    },
  });

  const totalsResp = totalsQuery.data as OverviewTotalsResponse | undefined;
  const usedBytes = useMemo(() => {
    const t = totalsResp?.totals;
    if (!t) return 0;
    const explicit = t.trafficTotalBytes;
    if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;
    const inn = t.trafficInBytes ?? 0;
    const out = t.trafficOutBytes ?? 0;
    return inn + out;
  }, [totalsResp]);

  if (!Number.isFinite(userId) || userId <= 0) return null;

  const wrapClass = (extra: string) =>
    ["traffic-quota-progress", compact && "traffic-quota-progress--compact", extra]
      .filter(Boolean)
      .join(" ");

  if (!ext) {
    return (
      <div className={wrapClass("traffic-quota-progress--muted")}>
        <p className="traffic-quota-progress__note">
          Traffic quota usage needs an OpenVPN external ID on this account.
        </p>
      </div>
    );
  }

  if (!quotaKindAndLimit || !bounds) {
    return (
      <div className={wrapClass("traffic-quota-progress--muted")}>
        <p className="traffic-quota-progress__note">
          No daily or monthly traffic limit on the active quota plan (or no plan is active for today).
        </p>
      </div>
    );
  }

  const { limitBytes, kind, planName } = quotaKindAndLimit;
  const pct = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const over = usedBytes > limitBytes;
  const remaining = Math.max(0, limitBytes - usedBytes);
  const periodLabel = kind === "monthly" ? "This calendar month" : "Today";

  return (
    <div className={wrapClass("")}>
      <div className="traffic-quota-progress__header">
        {!compact && !suppressInlineTitle && <strong>Traffic quota</strong>}
        <span className="traffic-quota-progress__meta">
          {planName} · {periodLabel}
        </span>
      </div>
      {totalsQuery.isFetching && !totalsQuery.data ? (
        <p className="traffic-quota-progress__note">Loading usage…</p>
      ) : (
        <>
          <div
            className="traffic-quota-progress__bar"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Quota usage"
          >
            <div
              className={`traffic-quota-progress__fill${over ? " traffic-quota-progress__fill--over" : ""}`}
              style={{ width: `${Math.min(100, (usedBytes / limitBytes) * 100)}%` }}
            />
          </div>
          <div className="traffic-quota-progress__stats">
            <span>
              Used {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
              {` (${pct.toFixed(1)}%)`}
            </span>
            <span className="traffic-quota-progress__remaining">
              {over ? `Over by ${formatBytes(usedBytes - limitBytes)}` : `Remaining ${formatBytes(remaining)}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
