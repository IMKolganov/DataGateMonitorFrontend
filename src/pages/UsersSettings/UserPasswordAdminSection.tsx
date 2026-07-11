import { useMemo, useState } from "react";
import { FaHistory, FaKey, FaUndo } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetApiUsersIdPasswordHistoryQueryKey,
  useGetApiUsersIdPasswordHistory,
  usePostApiUsersIdPasswordHistoryHistoryIdRestore,
  usePostApiUsersIdSetPassword,
} from "../../api/orval/user/user";
import type {
  UserDtoUserPasswordHistoryItemDto,
  UserResponsesAdminSetUserPasswordResponse,
  UserResponsesGetUserPasswordHistoryResponse,
  UserResponsesRestoreUserPasswordResponse,
} from "../../api/orvalModelShim";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";

function actorLabel(item: UserDtoUserPasswordHistoryItemDto): string {
  const name = item.setByDisplayName?.trim();
  switch (item.setByActor) {
    case 0:
      return name ? `User (${name})` : "User";
    case 1:
      return name ? `Admin (${name})` : "Admin";
    case 2:
      return "System";
    default:
      return "—";
  }
}

type Props = {
  userId: number;
};

export function UserPasswordAdminSection({ userId }: Props) {
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [reason, setReason] = useState("");

  const { data: historyRaw, isLoading, isFetching, refetch } = useGetApiUsersIdPasswordHistory(
    userId,
    { query: { enabled: userId > 0 } },
  );

  const historyPayload = useMemo(() => {
    if (!historyRaw) return [] as UserDtoUserPasswordHistoryItemDto[];
    const u = unwrapMaybeApiResponse<UserResponsesGetUserPasswordHistoryResponse>(
      historyRaw as UserResponsesGetUserPasswordHistoryResponse | ApiEnvelope<UserResponsesGetUserPasswordHistoryResponse>,
    );
    return u?.items ?? (historyRaw as UserResponsesGetUserPasswordHistoryResponse).items ?? [];
  }, [historyRaw]);

  const invalidateHistory = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiUsersIdPasswordHistoryQueryKey(userId) });

  const setPasswordMutation = usePostApiUsersIdSetPassword({
    mutation: {
      onSuccess: async (raw) => {
        const body = raw as UserResponsesAdminSetUserPasswordResponse;
        if (body?.success) {
          toast.success(body.message ?? "Password updated.");
          setNewPassword("");
          setReason("");
          await invalidateHistory();
        } else {
          toast.error(body?.message ?? "Failed to set password.");
        }
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        toast.error(err?.response?.data?.message ?? (err as Error)?.message ?? "Failed to set password.");
      },
    },
  });

  const restoreMutation = usePostApiUsersIdPasswordHistoryHistoryIdRestore({
    mutation: {
      onSuccess: async (raw) => {
        const body = raw as UserResponsesRestoreUserPasswordResponse;
        if (body?.success) {
          toast.success(body.message ?? "Password restored.");
          await invalidateHistory();
        } else {
          toast.error(body?.message ?? "Failed to restore password.");
        }
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        toast.error(err?.response?.data?.message ?? (err as Error)?.message ?? "Failed to restore password.");
      },
    },
  });

  const handleSetPassword = () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setPasswordMutation.mutate({
      id: userId,
      data: {
        newPassword,
        reason: reason.trim() || undefined,
      },
    });
  };

  const handleRestore = (item: UserDtoUserPasswordHistoryItemDto) => {
    if (item.id == null) return;
    if (item.isCurrent) {
      toast.info("This hash is already the active password.");
      return;
    }
    const when = item.recordedAtUtc
      ? new Date(item.recordedAtUtc).toLocaleString()
      : `#${item.id}`;
    if (!window.confirm(`Restore password from history entry (${when})?`)) return;
    restoreMutation.mutate({ id: userId, historyId: item.id });
  };

  return (
    <section className="settings-card settings-card--mb">
      <h3 className="settings-card__h3-with-icon">
        <FaKey className="icon" aria-hidden />
        <span>Password (admin)</span>
      </h3>
      <p className="settings-item-description">
        Force-set a new password or roll back to a previous hash from history. Each change records who
        applied it: user, admin, or system.
      </p>

      <div className="settings-item settings-item--col-top">
        <label htmlFor="admin-new-password" className="settings-item-label--wide">
          New password
        </label>
        <input
          id="admin-new-password"
          type="password"
          className="input"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={setPasswordMutation.isPending}
          minLength={8}
        />
      </div>
      <div className="settings-item settings-item--col-top mt-12">
        <label htmlFor="admin-password-reason" className="settings-item-label--wide">
          Reason (optional)
        </label>
        <input
          id="admin-password-reason"
          type="text"
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={setPasswordMutation.isPending}
          maxLength={256}
          placeholder="e.g. support ticket #123"
        />
      </div>
      <div className="mt-12">
        <button
          type="button"
          className="btn primary"
          onClick={handleSetPassword}
          disabled={setPasswordMutation.isPending || newPassword.length < 8}
        >
          <FaKey className="icon" /> Set password
        </button>
      </div>

      <p className="settings-item-description settings-item-description--section-title">
        <FaHistory className="icon" aria-hidden /> Password history
      </p>
      {isLoading ? (
        <p className="text-muted">Loading history…</p>
      ) : historyPayload.length === 0 ? (
        <p className="text-muted">No password history yet.</p>
      ) : (
        <div className="table-container table-container--pad">
          <table className="user-quota-assignments-table">
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Set by</th>
                <th>Reason</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyPayload.map((item) => (
                <tr key={item.id ?? `${item.recordedAtUtc}-${item.reason}`}>
                  <td>
                    {item.recordedAtUtc
                      ? new Date(item.recordedAtUtc).toLocaleString()
                      : "—"}
                  </td>
                  <td>{actorLabel(item)}</td>
                  <td>{item.reason?.trim() || "—"}</td>
                  <td>{item.isCurrent ? "Current" : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn secondary"
                      title="Restore this password hash"
                      onClick={() => handleRestore(item)}
                      disabled={
                        restoreMutation.isPending ||
                        item.isCurrent === true ||
                        item.id == null
                      }
                    >
                      <FaUndo className="icon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-12">
        <button
          type="button"
          className="btn secondary"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Refresh history
        </button>
      </div>
    </section>
  );
}

export default UserPasswordAdminSection;
