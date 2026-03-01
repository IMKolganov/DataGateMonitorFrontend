import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaKey, FaPlus, FaEdit, FaTrash, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useGetApiUsersGetByIdId,
  getGetApiUsersGetAllQueryKey,
} from "../../api/orval/user/user";
import { usePostApiAuthForgotPassword } from "../../api/orval/auth/auth";
import { usePostApiQuotaPlansGetAll } from "../../api/orval/quota-plan/quota-plan";
import {
  useGetApiUserQuotaPlansGetByUserIdUserId,
  getGetApiUserQuotaPlansGetByUserIdUserIdQueryKey,
  usePostApiUserQuotaPlansCreate,
  usePutApiUserQuotaPlansUpdate,
  useDeleteApiUserQuotaPlansDeleteId,
} from "../../api/orval/user-quota-plan/user-quota-plan";
import { useGetApiTgbotIncomingMessageLogsGetByTelegramUseridTelegramId } from "../../api/orval/telegram-bot-incoming-message-log/telegram-bot-incoming-message-log";
import type {
  QuotaPlanDto,
  QuotaPlansResponse,
  UserQuotaPlanDto,
  CreateOrUpdateUserQuotaPlanRequest,
} from "../../api/orval/model";
import type { UsersResponse } from "../../api/orval/model";
import type { GetUserQuotaPlansByUserIdResponse } from "../../api/orval/model";
import type { GetByTelegramIdMessagesResponseApiResponse } from "../../api/orval/model";
import type { MessageDto } from "../../api/orval/model";
import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { isCanceledError } from "../../utils/queryCanceled";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { UserQuotaPlanAssignmentModal } from "./UserQuotaPlanAssignmentModal";
import StyledDataGrid from "../../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../../components/ui/ThemeProvider.tsx";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import "../../css/Settings.css";
import "../../css/Table.css";

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return String(n);
}

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = userId != null ? parseInt(userId, 10) : NaN;

  const { data: userData, isLoading, error } = useGetApiUsersGetByIdId(id);
  const user = (userData as UsersResponse | undefined)?.user ?? null;

  const [quotaPlans, setQuotaPlans] = useState<QuotaPlanDto[]>([]);
  const getAllQuotaMutation = usePostApiQuotaPlansGetAll();
  const forgotPasswordMutation = usePostApiAuthForgotPassword();

  const { data: userQuotaData } = useGetApiUserQuotaPlansGetByUserIdUserId(id);
  const userAssignments: UserQuotaPlanDto[] =
    (userQuotaData as GetUserQuotaPlansByUserIdResponse | undefined)?.items ?? [];

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserQuotaPlanDto | null>(null);

  const [telegramMessagesPagination, setTelegramMessagesPagination] =
    useState<GridPaginationModel>({ page: 0, pageSize: 10 });

  const createAssignmentMutation = usePostApiUserQuotaPlansCreate();
  const updateAssignmentMutation = usePutApiUserQuotaPlansUpdate();
  const deleteAssignmentMutation = useDeleteApiUserQuotaPlansDeleteId();

  const isTelegramUser =
    user != null &&
    (user.provider?.toLowerCase().includes("telegram") ?? false);
  const telegramId =
    user?.externalId != null ? parseInt(String(user.externalId), 10) : NaN;
  const telegramIdValid = Number.isFinite(telegramId) && telegramId > 0;

  const {
    data: telegramMessagesData,
    isLoading: telegramMessagesLoading,
    isFetching: telegramMessagesFetching,
    refetch: refetchTelegramMessages,
    error: telegramMessagesError,
  } = useGetApiTgbotIncomingMessageLogsGetByTelegramUseridTelegramId(
    telegramIdValid ? telegramId : 0,
    {
      page: telegramMessagesPagination.page + 1,
      pageSize: telegramMessagesPagination.pageSize,
    },
    {
      query: {
        enabled: isTelegramUser && telegramIdValid,
        placeholderData: keepPreviousData,
      },
    },
  );
  const messagesPayload = (telegramMessagesData as GetByTelegramIdMessagesResponseApiResponse | undefined)?.data?.messages;
  const telegramMessages: MessageDto[] = messagesPayload?.items ?? [];
  const telegramMessagesTotalCount = messagesPayload?.totalCount ?? 0;
  const telegramMessagesRefreshing = telegramMessagesFetching;
  const telegramMessagesErrorMessage = isCanceledError(telegramMessagesError)
    ? null
    : telegramMessagesError instanceof Error
      ? telegramMessagesError.message
      : telegramMessagesError
        ? "Failed to load messages"
        : null;

  const invalidateUserQuota = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiUserQuotaPlansGetByUserIdUserIdQueryKey(id),
    });

  const handleAssignmentSubmit = (data: CreateOrUpdateUserQuotaPlanRequest) => {
    const payload = { ...data, userId: id };
    const isEdit = data.id != null && data.id > 0;
    if (isEdit) {
      updateAssignmentMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast.success("Assignment updated");
            setAssignmentModalOpen(false);
            setEditingAssignment(null);
            invalidateUserQuota();
          },
          onError: (e: unknown) => {
            const err = e as { response?: { data?: { message?: string } }; message?: string };
            toast.error(err?.response?.data?.message ?? (err as Error)?.message ?? "Update failed");
          },
        }
      );
    } else {
      createAssignmentMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast.success("Quota plan assigned");
            setAssignmentModalOpen(false);
            invalidateUserQuota();
          },
          onError: (e: unknown) => {
            const err = e as { response?: { data?: { message?: string } }; message?: string };
            toast.error(err?.response?.data?.message ?? (err as Error)?.message ?? "Assign failed");
          },
        }
      );
    }
  };

  const handleDeleteAssignment = (assignmentId: number) => {
    if (!window.confirm("Remove this quota plan assignment?")) return;
    deleteAssignmentMutation.mutate(
      { id: assignmentId },
      {
        onSuccess: () => {
          toast.success("Assignment removed");
          invalidateUserQuota();
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } }; message?: string };
          toast.error(err?.response?.data?.message ?? (err as Error)?.message ?? "Delete failed");
        },
      }
    );
  };

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    getAllQuotaMutation.mutate(
      { data: { includeInactive: true } },
      {
        onSuccess: (raw) => {
          const payload = unwrapMaybeApiResponse<QuotaPlansResponse>(raw as any);
          setQuotaPlans(payload?.quotaPlans ?? []);
        },
      }
    );
  }, [id]);

  const handleSendResetCode = () => {
    if (!user) return;
    const loginOrEmail = user.email ?? user.displayName ?? String(user.id);
    if (!loginOrEmail) {
      toast.error("User has no email or display name to request reset.");
      return;
    }
    forgotPasswordMutation.mutate(
      { data: { loginOrEmail } },
      {
        onSuccess: () => {
          toast.success(
            "Password reset code requested. If the account exists, the code was written to the server console."
          );
          queryClient.invalidateQueries({ queryKey: getGetApiUsersGetAllQueryKey() });
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } }; message?: string };
          toast.error(
            err?.response?.data?.message ?? (err as Error)?.message ?? "Request failed"
          );
        },
      }
    );
  };

  if (!Number.isFinite(id)) {
    return (
      <div>
        <p className="error-message">Invalid user ID.</p>
        <button className="btn secondary" onClick={() => navigate("/settings/users")}>
          <FaArrowLeft className="icon" /> Back to users
        </button>
      </div>
    );
  }

  if (isLoading || (!user && !error)) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading user…</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <p className="error-message">
          {error instanceof Error ? error.message : "User not found."}
        </p>
        <button className="btn secondary" onClick={() => navigate("/settings/users")}>
          <FaArrowLeft className="icon" /> Back to users
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={() => navigate("/settings/users")}>
            <FaArrowLeft className="icon" /> Back to users
          </button>
        </div>
      </div>

      <h2>User details</h2>

      <section className="settings-card" style={{ marginBottom: 24 }}>
        <h3>Profile</h3>
        <dl className="user-detail-dl">
          <dt>ID</dt>
          <dd>{user.id ?? "—"}</dd>
          <dt>Display name</dt>
          <dd>{user.displayName ?? "—"}</dd>
          <dt>Email</dt>
          <dd>{user.email ?? "—"}</dd>
          <dt>Sign-in method</dt>
          <dd>
            {user.provider
              ? isTelegramUser
                ? `Telegram${user.externalId != null ? ` (ID: ${user.externalId})` : ""}`
                : user.provider
              : "—"}
          </dd>
          <dt>Provider</dt>
          <dd>{user.provider ?? "—"}</dd>
          <dt>External ID</dt>
          <dd>{user.externalId ?? "—"}</dd>
          <dt>Provider row ID</dt>
          <dd>{user.providerRowId ?? "—"}</dd>
          <dt>Admin</dt>
          <dd>{user.isAdmin ? "Yes" : "No"}</dd>
          <dt>Blocked</dt>
          <dd>{user.isBlocked ? "Yes" : "No"}</dd>
          <dt>Dashboard access</dt>
          <dd>{user.hasDashboardAccess ? "Yes" : "No"}</dd>
          <dt>Created</dt>
          <dd>
            {user.createDate
              ? new Date(user.createDate).toLocaleString()
              : "—"}
          </dd>
          <dt>Last update</dt>
          <dd>
            {user.lastUpdate
              ? new Date(user.lastUpdate).toLocaleString()
              : "—"}
          </dd>
        </dl>
      </section>

      <section className="settings-card" style={{ marginBottom: 24 }}>
        <h3>Admin actions</h3>
        <p className="settings-item-description">
          Request a one-time password reset code for this user. The code will be
          written to the server console (if the account exists and supports password login).
        </p>
        <button
          className="btn primary"
          onClick={handleSendResetCode}
          disabled={forgotPasswordMutation.isPending}
        >
          <FaKey className="icon" /> Send password reset code
        </button>
      </section>

      {isTelegramUser && (
        <section className="settings-card" style={{ marginBottom: 24 }}>
          <h3>Telegram bot messages</h3>
          <p className="settings-item-description">
            Incoming messages from this user in the Telegram bot.
          </p>
          {telegramIdValid ? (
            <>
              <div className="header-bar" style={{ marginBottom: 8 }}>
                <div className="left-buttons">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => refetchTelegramMessages()}
                    disabled={telegramMessagesRefreshing}
                  >
                    <FaSync className={`icon ${telegramMessagesRefreshing ? "icon-spin" : ""}`} /> Refresh
                  </button>
                </div>
              </div>
              {telegramMessagesErrorMessage && (
                <p className="error-message" style={{ marginBottom: 8 }}>❌ {telegramMessagesErrorMessage}</p>
              )}
              {!telegramMessagesLoading && telegramMessagesTotalCount === 0 ? (
                <p style={{ color: "#8b949e" }}>No messages.</p>
              ) : (
              <div className="data-grid-wrap" style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}>
                <CustomThemeProvider>
                  <StyledDataGrid
                    rows={telegramMessages.map((msg, idx) => ({
                      id: msg.id ?? `msg-${idx}`,
                      date: msg.receivedAt ?? msg.createDate
                        ? new Date((msg.receivedAt ?? msg.createDate) ?? "").toLocaleString()
                        : "—",
                      text: msg.messageText ?? "—",
                      file: [msg.fileType, msg.fileName].filter(Boolean).join(" · ") || "—",
                    }))}
                    columns={[
                      { field: "date", headerName: "Date", flex: 1, minWidth: 140 },
                      { field: "text", headerName: "Text", flex: 2, minWidth: 120 },
                      { field: "file", headerName: "File", flex: 1, minWidth: 100 },
                    ] as GridColDef[]}
                    pageSizeOptions={[5, 10, 20, 50]}
                    paginationMode="server"
                    rowCount={telegramMessagesTotalCount}
                    paginationModel={telegramMessagesPagination}
                    onPaginationModelChange={(model) => {
                      setTelegramMessagesPagination((prev) =>
                        prev.page !== model.page || prev.pageSize !== model.pageSize ? model : prev
                      );
                    }}
                    loading={telegramMessagesLoading || telegramMessagesFetching}
                    slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                    disableColumnFilter
                    disableColumnMenu
                    localeText={{ noRowsLabel: "📭 No messages" }}
                  />
                </CustomThemeProvider>
              </div>
              )}
            </>
          ) : (
            <p style={{ color: "#8b949e" }}>
              Telegram ID not available; cannot load messages.
            </p>
          )}
        </section>
      )}

      <section className="settings-card" style={{ marginBottom: 24 }}>
        <h3>User quota plan assignments</h3>
        <p className="settings-item-description">
          Assign quota plans to this user. Effective from/to define the period when the plan applies.
        </p>
        {userAssignments.length === 0 && (
          <div className="header-bar" style={{ marginBottom: 12 }}>
            <div className="left-buttons">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setEditingAssignment(null);
                  setAssignmentModalOpen(true);
                }}
                disabled={
                  quotaPlans.length === 0 ||
                  createAssignmentMutation.isPending ||
                  updateAssignmentMutation.isPending
                }
              >
                <FaPlus className="icon" /> Assign plan
              </button>
            </div>
          </div>
        )}
        {userAssignments.length === 0 ? (
          <p style={{ color: "#8b949e" }}>No assignments. Click «Assign plan» to add one.</p>
        ) : (
          <div className="table-container" style={{ padding: 10 }}>
            <table className="user-quota-assignments-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Effective from</th>
                  <th>Effective to</th>
                  <th>Note</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userAssignments.map((a) => {
                  const plan = quotaPlans.find((p) => p.id === a.quotaPlanId);
                  const planName = plan?.name ?? `Plan #${a.quotaPlanId ?? "?"}`;
                  return (
                    <tr key={a.id}>
                      <td>{planName}</td>
                      <td>
                        {a.effectiveFrom
                          ? new Date(a.effectiveFrom).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {a.effectiveTo
                          ? new Date(a.effectiveTo).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>{a.note ?? "—"}</td>
                      <td>
                        <div className="action-container">
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => {
                              setEditingAssignment(a);
                              setAssignmentModalOpen(true);
                            }}
                            disabled={
                              updateAssignmentMutation.isPending ||
                              deleteAssignmentMutation.isPending
                            }
                            title="Edit"
                          >
                            <FaEdit className="icon" />
                          </button>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => a.id != null && handleDeleteAssignment(a.id)}
                            disabled={
                              updateAssignmentMutation.isPending ||
                              deleteAssignmentMutation.isPending
                            }
                            title="Remove"
                          >
                            <FaTrash className="icon" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="settings-card">
        <h3>Available quota plans</h3>
        <p className="settings-item-description">
          All quota plans defined in the system. Assign them above. Server-side restrictions may apply.
        </p>
        {quotaPlans.length === 0 ? (
          <p style={{ color: "#8b949e" }}>No quota plans.</p>
        ) : (
          <ul className="quota-plan-list">
            {quotaPlans.map((p) => (
              <li key={p.id} className="quota-plan-item">
                <strong>{p.name ?? "—"}</strong>
                {p.isDefault && " (default)"}
                {p.description && ` — ${p.description}`}
                <span className="quota-plan-meta">
                  Daily: {formatBytes(p.dailyQuotaBytes)} · Monthly:{" "}
                  {formatBytes(p.monthlyQuotaBytes)}
                  {p.upKbps != null && ` · Up: ${p.upKbps} Kbps`}
                  {p.downKbps != null && ` · Down: ${p.downKbps} Kbps`}
                  {!p.isActive && " · Inactive"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <UserQuotaPlanAssignmentModal
        isOpen={assignmentModalOpen}
        userId={id}
        plans={quotaPlans}
        editItem={editingAssignment}
        onClose={() => {
          setAssignmentModalOpen(false);
          setEditingAssignment(null);
        }}
        onSubmit={handleAssignmentSubmit}
        isSubmitting={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}
      />
    </div>
  );
}

export default UserDetailPage;
