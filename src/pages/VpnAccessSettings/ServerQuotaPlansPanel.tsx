import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaClipboardList } from "react-icons/fa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { postApiQuotaPlansGetAll } from "../../api/orval/quota-plan/quota-plan";
import {
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey,
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId,
  usePostApiQuotaPlanAllowedServersCreate,
  useDeleteApiQuotaPlanAllowedServersDeleteId,
} from "../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import {
  getGetApiV3OpenVpnServersGetAllQueryKey,
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey,
} from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import type {
  GetQuotaPlanAllowedServersByVpnServerIdResponse,
  QuotaPlanAllowedServerDto,
  QuotaPlanDto,
  QuotaPlansResponse,
} from "../../api/orvalModelShim";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import "../../css/Settings.css";

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "None";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return String(n);
}

function planLimits(plan: QuotaPlanDto): string {
  return `Daily ${formatBytes(plan.dailyQuotaBytes)} · Monthly ${formatBytes(plan.monthlyQuotaBytes)}`;
}

type Props = {
  vpnServerId: number;
};

/**
 * Choose which quota plans may use this VPN server (Free, Default, Standard, Pro, Unlimited, …).
 */
export function ServerQuotaPlansPanel({ vpnServerId }: Props) {
  const queryClient = useQueryClient();
  const [pendingPlanId, setPendingPlanId] = useState<number | null>(null);

  const plansQuery = useQuery({
    queryKey: ["/api/quota-plans/get-all", { includeInactive: true }],
    queryFn: async () => {
      const raw = await postApiQuotaPlansGetAll({ includeInactive: true });
      return (
        unwrapMaybeApiResponse<QuotaPlansResponse>(
          raw as QuotaPlansResponse | ApiEnvelope<QuotaPlansResponse> | undefined,
        )?.quotaPlans ?? []
      );
    },
    enabled: vpnServerId > 0,
  });

  const { data: allowedData } = useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId(
    vpnServerId,
    { query: { enabled: vpnServerId > 0 } },
  );
  const allowed: QuotaPlanAllowedServerDto[] =
    unwrapMaybeApiResponse<GetQuotaPlanAllowedServersByVpnServerIdResponse>(
      allowedData as
        | GetQuotaPlanAllowedServersByVpnServerIdResponse
        | ApiEnvelope<GetQuotaPlanAllowedServersByVpnServerIdResponse>
        | undefined,
    )?.items ?? [];

  const allowedByPlanId = useMemo(() => {
    const map = new Map<number, QuotaPlanAllowedServerDto>();
    for (const row of allowed) {
      if (row.quotaPlanId != null) map.set(row.quotaPlanId, row);
    }
    return map;
  }, [allowed]);

  const createMutation = usePostApiQuotaPlanAllowedServersCreate();
  const deleteMutation = useDeleteApiQuotaPlanAllowedServersDeleteId();
  const isBusy = pendingPlanId != null || createMutation.isPending || deleteMutation.isPending;

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey(vpnServerId),
    });
    queryClient.invalidateQueries({
      predicate: (query) =>
        String(query.queryKey[0] ?? "").includes("/api/quota-plan-allowed-servers/"),
    });
    queryClient.invalidateQueries({ queryKey: getGetApiV3OpenVpnServersGetAllQueryKey(undefined) });
    queryClient.invalidateQueries({
      queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
    });
  };

  const togglePlan = async (plan: QuotaPlanDto, nextChecked: boolean) => {
    const planId = plan.id;
    if (planId == null || vpnServerId <= 0) return;
    setPendingPlanId(planId);
    try {
      if (nextChecked) {
        await createMutation.mutateAsync({
          data: { quotaPlanId: planId, vpnServerId },
        });
        toast.success(`${plan.name ?? "Plan"} can use this server`);
      } else {
        const row = allowedByPlanId.get(planId);
        if (row?.id == null) return;
        await deleteMutation.mutateAsync({ id: row.id });
        toast.success(`${plan.name ?? "Plan"} removed from this server`);
      }
      invalidate();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to update quota plans"));
    } finally {
      setPendingPlanId(null);
    }
  };

  if (vpnServerId <= 0) return null;

  const plans = plansQuery.data ?? [];

  return (
    <section className="settings-card settings-card--mb">
      <h3 className="settings-card__h3-with-icon">
        <FaClipboardList className="icon" aria-hidden />
        <span>Quota plans</span>
      </h3>
      <p className="settings-item-description">
        Tick every plan that may use this server — Free, Default, Standard, Pro, Unlimited, and any
        custom plans. People on a ticked plan can connect unless a personal block overrides it.
        Unticked plans cannot use this server unless you grant a person separately below. Plan
        limits themselves are edited in{" "}
        <Link to="/settings/quotas" className="vpn-access-inline-link">
          Settings → Quotas
        </Link>
        .
      </p>

      {plansQuery.isLoading ? (
        <p className="text-muted">Loading quota plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-muted">No quota plans yet. Create them in Settings → Quotas.</p>
      ) : (
        <ul className="vpn-access-picker__list">
          {plans.map((plan) => {
            if (plan.id == null) return null;
            const checked = allowedByPlanId.has(plan.id);
            const name = plan.name?.trim() || `Plan #${plan.id}`;
            const description = plan.description?.trim();
            return (
              <li key={plan.id} className="vpn-access-picker__row">
                <label className="vpn-access-picker__label vpn-access-plan__label">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isBusy}
                    onChange={(e) => void togglePlan(plan, e.target.checked)}
                    aria-label={name}
                  />
                  <span className="vpn-access-picker__meta">
                    <strong>
                      {name}
                      {plan.isDefault ? (
                        <span className="vpn-access-plan__badge">Default</span>
                      ) : null}
                      {plan.isActive === false ? (
                        <span className="vpn-access-plan__badge">Inactive</span>
                      ) : null}
                    </strong>
                    {description ? <span>{description}</span> : null}
                    <span>{planLimits(plan)}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
