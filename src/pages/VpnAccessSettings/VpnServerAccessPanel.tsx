import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaPlus, FaTrash, FaUserShield } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  useGetApiUserVpnServerAccessRulesGetByVpnServerIdVpnServerId,
  usePostApiUserVpnServerAccessRulesCreate,
  usePutApiUserVpnServerAccessRulesUpdate,
  useDeleteApiUserVpnServerAccessRulesDeleteId,
} from "../../api/orval/user-vpn-server-access-rule/user-vpn-server-access-rule";
import { useGetApiUsersGetAll } from "../../api/orval/user/user";
import type {
  EnumsVpnServerAccessRuleMode,
  GetAllUsersResponse,
  GetUserVpnServerAccessRulesByVpnServerIdResponse,
  UserDto,
  UserVpnServerAccessRuleDto,
} from "../../api/orvalModelShim";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { GridRowActions, RowActionButton, RowActionLink } from "../../components/ui/GridRowActions.tsx";
import { AccessUserPicker } from "./AccessUserPicker";
import { formatAccessUserFallback, formatAccessUserLabel } from "./accessUserLabel";
import { invalidateVpnAccessQueries } from "./invalidateVpnAccessQueries";
import "../../css/Settings.css";
import "../../css/Table.css";

const ALLOW = 1 as EnumsVpnServerAccessRuleMode;
const DENY = 2 as EnumsVpnServerAccessRuleMode;

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

function asUsersPayload(raw: unknown): GetAllUsersResponse | undefined {
  return unwrapMaybeApiResponse<GetAllUsersResponse>(
    raw as GetAllUsersResponse | ApiEnvelope<GetAllUsersResponse> | undefined,
  );
}

type Props = {
  vpnServerId: number;
  /** Optional card heading, e.g. the server name on the Settings page. */
  title?: string;
};

/**
 * Grant or block named users on one VPN server. Rules sit on top of the quota-plan allowlist.
 */
export function VpnServerAccessPanel({ vpnServerId, title }: Props) {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(() => new Set());
  const [modeToAdd, setModeToAdd] = useState<EnumsVpnServerAccessRuleMode>(ALLOW);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(userSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    setSelectedUserIds(new Set());
    setUserSearch("");
  }, [vpnServerId]);

  const { data: rulesData } = useGetApiUserVpnServerAccessRulesGetByVpnServerIdVpnServerId(
    vpnServerId,
    { query: { enabled: vpnServerId > 0 } },
  );
  const rules: UserVpnServerAccessRuleDto[] =
    unwrapMaybeApiResponse<GetUserVpnServerAccessRulesByVpnServerIdResponse>(
      rulesData as
        | GetUserVpnServerAccessRulesByVpnServerIdResponse
        | ApiEnvelope<GetUserVpnServerAccessRulesByVpnServerIdResponse>
        | undefined,
    )?.items ?? [];

  const directoryQuery = useGetApiUsersGetAll(
    { Page: 1, PageSize: 500 },
    { query: { enabled: vpnServerId > 0 } },
  );
  const searchQuery = useGetApiUsersGetAll(
    { Page: 1, PageSize: 50, Search: debouncedSearch },
    { query: { enabled: vpnServerId > 0 && debouncedSearch.length > 0 } },
  );

  const directoryUsers: UserDto[] = asUsersPayload(directoryQuery.data)?.users ?? [];
  const searchUsers: UserDto[] = asUsersPayload(searchQuery.data)?.users ?? [];
  const usersById = useMemo(() => {
    const map = new Map<number, UserDto>();
    for (const user of directoryUsers) {
      if (user.id != null) map.set(user.id, user);
    }
    for (const user of searchUsers) {
      if (user.id != null) map.set(user.id, user);
    }
    return map;
  }, [directoryUsers, searchUsers]);

  const ruledUserIds = useMemo(
    () => new Set(rules.map((rule) => rule.userId).filter((id): id is number => id != null)),
    [rules],
  );

  const pickerUsers = (debouncedSearch.length > 0 ? searchUsers : directoryUsers).filter(
    (user) => user.id != null && !ruledUserIds.has(user.id),
  );

  const createMutation = usePostApiUserVpnServerAccessRulesCreate();
  const updateMutation = usePutApiUserVpnServerAccessRulesUpdate();
  const deleteMutation = useDeleteApiUserVpnServerAccessRulesDeleteId();
  const isBusy =
    isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const handleAdd = async () => {
    const userIds = [...selectedUserIds];
    if (userIds.length === 0 || vpnServerId <= 0) return;
    setIsSubmitting(true);
    try {
      for (const userId of userIds) {
        await createMutation.mutateAsync({
          data: { userId, vpnServerId, mode: modeToAdd },
        });
      }
      const count = userIds.length;
      if (modeToAdd === DENY) {
        toast.success(count === 1 ? "User blocked" : `${count} users blocked`);
      } else {
        toast.success(count === 1 ? "Access granted" : `Access granted for ${count} users`);
      }
      setSelectedUserIds(new Set());
      invalidateVpnAccessQueries(queryClient);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to add rule"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = (rule: UserVpnServerAccessRuleDto) => {
    const nextMode = rule.mode === DENY ? ALLOW : DENY;
    updateMutation.mutate(
      {
        data: {
          id: rule.id,
          userId: rule.userId,
          vpnServerId: rule.vpnServerId ?? vpnServerId,
          mode: nextMode,
        },
      },
      {
        onSuccess: () => {
          toast.success(nextMode === DENY ? "User blocked" : "Access granted");
          invalidateVpnAccessQueries(queryClient);
        },
        onError: (e) => toast.error(errorMessage(e, "Failed to change rule")),
      },
    );
  };

  const handleRemove = (id: number) => {
    if (!window.confirm("Remove this rule? The quota plan alone will decide access.")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Rule removed");
          invalidateVpnAccessQueries(queryClient);
        },
        onError: (e) => toast.error(errorMessage(e, "Failed to remove rule")),
      },
    );
  };

  if (vpnServerId <= 0) return null;

  const addLabel =
    selectedUserIds.size <= 1 ? "Add people" : `Add ${selectedUserIds.size} people`;

  return (
    <section className="settings-card settings-card--mb">
      {title ? (
        <h3 className="settings-card__h3-with-icon">
          <FaUserShield className="icon" aria-hidden />
          <span>{title}</span>
        </h3>
      ) : null}
      <p className="settings-item-description">
        Tick one or more people, then grant or block this server for them. A grant opens a server
        the quota plan does not cover; a block wins over the plan.
      </p>

      <AccessUserPicker
        users={pickerUsers}
        selectedIds={selectedUserIds}
        search={userSearch}
        onSearchChange={setUserSearch}
        onChangeSelectedIds={setSelectedUserIds}
        disabled={isBusy}
      />

      <div className="header-bar header-bar--mb-12 vpn-access-toolbar">
        <div className="left-buttons">
          <select
            id="vpn-access-mode"
            name="vpnAccessMode"
            className="input input--mode"
            value={String(modeToAdd)}
            onChange={(e) => setModeToAdd(Number(e.target.value) as EnumsVpnServerAccessRuleMode)}
            disabled={isBusy}
            aria-label="Access rule"
          >
            <option value={String(ALLOW)}>Grant</option>
            <option value={String(DENY)}>Block</option>
          </select>
          <button
            type="button"
            className="btn primary"
            onClick={() => void handleAdd()}
            disabled={selectedUserIds.size === 0 || isBusy}
          >
            <FaPlus className="icon" /> {addLabel}
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-muted">
          No personal rules on this server. Access follows each user&apos;s quota plan.
        </p>
      ) : (
        <div className="table-container table-container--pad">
          <table className="user-quota-assignments-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Rule</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const userId = rule.userId;
                const user = userId != null ? usersById.get(userId) : undefined;
                const label = user
                  ? formatAccessUserLabel(user)
                  : formatAccessUserFallback(userId);
                return (
                  <tr key={rule.id ?? `${userId}-${rule.vpnServerId}`}>
                    <td>
                      {userId != null ? (
                        <Link to={`/settings/users/${userId}`}>{label}</Link>
                      ) : (
                        label
                      )}
                    </td>
                    <td>
                      <select
                        className="input input--mode"
                        value={String(rule.mode ?? ALLOW)}
                        onChange={() => handleToggleMode(rule)}
                        disabled={isBusy}
                        aria-label={`Rule for ${label}`}
                      >
                        <option value={String(ALLOW)}>Grant</option>
                        <option value={String(DENY)}>Block</option>
                      </select>
                    </td>
                    <td>
                      <GridRowActions>
                        {userId != null && (
                          <RowActionLink
                            to={`/settings/users/${userId}`}
                            title="Open user"
                            icon={<FaEye className="icon" />}
                          />
                        )}
                        <RowActionButton
                          variant="danger"
                          title="Remove"
                          disabled={isBusy}
                          onClick={() => rule.id != null && handleRemove(rule.id)}
                          icon={<FaTrash className="icon" />}
                        />
                      </GridRowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
