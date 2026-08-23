import { useState } from "react";
import { FaPlus, FaTrash, FaUserShield } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  useGetApiUserVpnServerAccessRulesGetByUserIdUserId,
  getGetApiUserVpnServerAccessRulesGetByUserIdUserIdQueryKey,
  usePostApiUserVpnServerAccessRulesCreate,
  usePutApiUserVpnServerAccessRulesUpdate,
  useDeleteApiUserVpnServerAccessRulesDeleteId,
} from "../../api/orval/user-vpn-server-access-rule/user-vpn-server-access-rule";
import {
  useGetApiV3OpenVpnServersGetAll,
  getGetApiV3OpenVpnServersGetAllQueryKey,
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey,
} from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import type {
  EnumsVpnServerAccessRuleMode,
  GetUserVpnServerAccessRulesByUserIdResponse,
  UserVpnServerAccessRuleDto,
  VpnServersV3Response,
} from "../../api/orvalModelShim";
import { GridRowActions, RowActionButton } from "../../components/ui/GridRowActions.tsx";
import "../../css/Settings.css";
import "../../css/Table.css";

const ALLOW = 1 as EnumsVpnServerAccessRuleMode;
const DENY = 2 as EnumsVpnServerAccessRuleMode;

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

type Props = {
  userId: number;
};

/**
 * Per-user grants and blocks for individual VPN servers. These sit on top of the
 * quota plan allowlist: a grant adds a server the plan does not cover, a block
 * removes one the plan would otherwise allow.
 */
export function UserVpnServerAccessRulesSection({ userId }: Props) {
  const queryClient = useQueryClient();
  const [serverToAdd, setServerToAdd] = useState("");
  const [modeToAdd, setModeToAdd] = useState<EnumsVpnServerAccessRuleMode>(ALLOW);

  const { data: rulesData } = useGetApiUserVpnServerAccessRulesGetByUserIdUserId(userId, {
    query: { enabled: Number.isFinite(userId) && userId > 0 },
  });
  const rules: UserVpnServerAccessRuleDto[] =
    (rulesData as GetUserVpnServerAccessRulesByUserIdResponse | undefined)?.items ?? [];

  const { data: serversData } = useGetApiV3OpenVpnServersGetAll({});
  const servers = (serversData as VpnServersV3Response | undefined)?.vpnServers ?? [];

  const createMutation = usePostApiUserVpnServerAccessRulesCreate();
  const updateMutation = usePutApiUserVpnServerAccessRulesUpdate();
  const deleteMutation = useDeleteApiUserVpnServerAccessRulesDeleteId();
  const isBusy =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const ruledServerIds = new Set(
    rules.map((r) => r.vpnServerId).filter((id): id is number => id != null)
  );
  const availableServers = servers.filter((s) => s.id != null && !ruledServerIds.has(s.id));

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getGetApiUserVpnServerAccessRulesGetByUserIdUserIdQueryKey(userId),
    });
    queryClient.invalidateQueries({
      queryKey: getGetApiV3OpenVpnServersGetAllQueryKey(undefined),
    });
    queryClient.invalidateQueries({
      queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
    });
  };

  const handleAdd = () => {
    const vpnServerId = Number(serverToAdd);
    if (!vpnServerId) return;
    createMutation.mutate(
      { data: { userId, vpnServerId, mode: modeToAdd } },
      {
        onSuccess: () => {
          toast.success(modeToAdd === DENY ? "Server blocked" : "Server granted");
          setServerToAdd("");
          invalidate();
        },
        onError: (e) => toast.error(errorMessage(e, "Failed to add rule")),
      }
    );
  };

  const handleToggleMode = (rule: UserVpnServerAccessRuleDto) => {
    const nextMode = rule.mode === DENY ? ALLOW : DENY;
    updateMutation.mutate(
      {
        data: {
          id: rule.id,
          userId,
          vpnServerId: rule.vpnServerId,
          mode: nextMode,
        },
      },
      {
        onSuccess: () => {
          toast.success(nextMode === DENY ? "Server blocked" : "Server granted");
          invalidate();
        },
        onError: (e) => toast.error(errorMessage(e, "Failed to change rule")),
      }
    );
  };

  const handleRemove = (id: number) => {
    if (!window.confirm("Remove this rule? The quota plan alone will decide access.")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Rule removed");
          invalidate();
        },
        onError: (e) => toast.error(errorMessage(e, "Failed to remove rule")),
      }
    );
  };

  const getServerName = (vpnServerId: number | null | undefined) =>
    vpnServerId == null
      ? "—"
      : servers.find((s) => s.id === vpnServerId)?.serverName ?? `Server #${vpnServerId}`;

  return (
    <section className="settings-card settings-card--mb">
      <h3 className="settings-card__h3-with-icon">
        <FaUserShield className="icon" aria-hidden />
        <span>Personal VPN server access</span>
      </h3>
      <p className="settings-item-description">
        Grants and blocks for this user on top of the quota plan allowlist. A grant opens a
        server the plan does not cover; a block wins over the plan and over a grant.
      </p>

      <div className="header-bar header-bar--mb-12">
        <div className="left-buttons">
          <select
            id="user-access-rule-server"
            name="userAccessRuleServer"
            className="input"
            style={{ maxWidth: 280 }}
            value={serverToAdd}
            onChange={(e) => setServerToAdd(e.target.value)}
            disabled={availableServers.length === 0 || isBusy}
          >
            <option value="">Select server…</option>
            {availableServers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.serverName ?? `Server #${s.id}`}
              </option>
            ))}
          </select>
          <select
            id="user-access-rule-mode"
            name="userAccessRuleMode"
            className="input"
            style={{ maxWidth: 160 }}
            value={String(modeToAdd)}
            onChange={(e) => setModeToAdd(Number(e.target.value) as EnumsVpnServerAccessRuleMode)}
            disabled={isBusy}
          >
            <option value={String(ALLOW)}>Grant</option>
            <option value={String(DENY)}>Block</option>
          </select>
          <button
            type="button"
            className="btn primary"
            onClick={handleAdd}
            disabled={!serverToAdd || isBusy}
          >
            <FaPlus className="icon" /> Add rule
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-muted">
          No personal rules. Access follows the quota plan only.
        </p>
      ) : (
        <div className="table-container table-container--pad">
          <table className="user-quota-assignments-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>Rule</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{getServerName(r.vpnServerId)}</td>
                  <td>
                    <select
                      className="input"
                      style={{ maxWidth: 160 }}
                      value={String(r.mode ?? ALLOW)}
                      onChange={() => handleToggleMode(r)}
                      disabled={isBusy}
                      aria-label={`Rule for ${getServerName(r.vpnServerId)}`}
                    >
                      <option value={String(ALLOW)}>Grant</option>
                      <option value={String(DENY)}>Block</option>
                    </select>
                  </td>
                  <td>
                    <GridRowActions>
                      <RowActionButton
                        variant="danger"
                        title="Remove"
                        disabled={isBusy}
                        onClick={() => r.id != null && handleRemove(r.id)}
                        icon={<FaTrash className="icon" />}
                      />
                    </GridRowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default UserVpnServerAccessRulesSection;
