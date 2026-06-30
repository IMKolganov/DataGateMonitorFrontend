import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaKey,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSync,
  FaShieldAlt,
  FaUser,
  FaCog,
  FaPaperPlane,
  FaClipboardList,
  FaListUl,
  FaChartBar,
  FaIdCard,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useGetApiUsersGetByIdId,
  getGetApiUsersGetAllQueryKey,
  useGetApiUsersEmailConfirmationStatusId,
  usePostApiUsersConfirmEmailId,
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
import {
  useGetApiUserRolesGetAllRoles,
  useGetApiUserRolesByUserUserId,
  usePutApiUserRolesSet,
  getGetApiUserRolesByUserUserIdQueryKey,
} from "../../api/orval/user-roles/user-roles";
import { useGetApiTgbotIncomingMessageLogsGetByTelegramUseridTelegramId } from "../../api/orval/telegram-bot-incoming-message-log/telegram-bot-incoming-message-log";
import type {
  QuotaPlanDto,
  QuotaPlansResponse,
  UserQuotaPlanDto,
  CreateOrUpdateUserQuotaPlanRequest,
  RoleDto,
  RolesResponse,
  UserRoleAssignmentResponse,
  UserResponsesGetUserEmailConfirmationStatusResponse,
} from "../../api/orvalModelShim";
import type { UsersResponse } from "../../api/orvalModelShim";
import type { GetUserQuotaPlansByUserIdResponse } from "../../api/orvalModelShim";
import type { GetByTelegramIdMessagesResponseApiResponse } from "../../api/orvalModelShim";
import type { MessageDto } from "../../api/orvalModelShim";
import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { isCanceledError } from "../../utils/queryCanceled";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { UserQuotaPlanAssignmentModal } from "./UserQuotaPlanAssignmentModal";
import { UserVpnConnectionsSection } from "./UserVpnConnectionsSection";
import { UserDnsQueriesSection } from "../../components/pihole/UserDnsQueriesSection";
import { UserTrafficQuotaProgress } from "../../components/quota/UserTrafficQuotaProgress";
import Grid from "../../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../../components/ui/ThemeProvider.tsx";
import type { GridColDef } from "@mui/x-data-grid";
import "../../css/Settings.css";
import "../../css/Table.css";
import { UserAvatar } from "../../components/ui/UserAvatar.tsx";
import { readOptionalAvatarUrl } from "../../utils/readOptionalAvatarUrl.ts";
import { telegramPhotoIdForProvider } from "../../utils/telegramNumericId.ts";

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
  const [telegramMessagesPageSize, setTelegramMessagesPageSize] = usePersistedPageSize(
    `user-detail-telegram:${userId ?? "0"}`,
    10,
    "5,10,20,50,100",
  );

  const createAssignmentMutation = usePostApiUserQuotaPlansCreate();
  const updateAssignmentMutation = usePutApiUserQuotaPlansUpdate();
  const deleteAssignmentMutation = useDeleteApiUserQuotaPlansDeleteId();

  const canManageRoles = isAdmin(getCurrentUser());
  const userIdValid = Number.isFinite(id) && id > 0;

  const { data: allRolesRaw, isLoading: rolesCatalogLoading } = useGetApiUserRolesGetAllRoles({
    query: {
      enabled: canManageRoles,
      staleTime: 60_000,
    },
  });

  const roleCatalog = useMemo(() => {
    if (!allRolesRaw) return [] as (RoleDto & { id: number })[];
    const r = unwrapMaybeApiResponse<RolesResponse>(
      allRolesRaw as RolesResponse | ApiEnvelope<RolesResponse> | undefined,
    );
    return (r?.roles ?? []).filter(
      (x): x is RoleDto & { id: number } => typeof x.id === "number" && x.id > 0,
    );
  }, [allRolesRaw]);

  const { data: userRoleRaw, isLoading: userRoleLoading } = useGetApiUserRolesByUserUserId(
    userIdValid ? id : 0,
    {
      query: {
        enabled: canManageRoles && userIdValid,
      },
    },
  );

  const currentRoleAssignment = useMemo(() => {
    if (!userRoleRaw) return undefined;
    const u = unwrapMaybeApiResponse<UserRoleAssignmentResponse>(
      userRoleRaw as UserRoleAssignmentResponse | ApiEnvelope<UserRoleAssignmentResponse> | undefined,
    );
    return u?.assignment ?? (userRoleRaw as UserRoleAssignmentResponse).assignment;
  }, [userRoleRaw]);

  const setRoleMutation = usePutApiUserRolesSet({
    mutation: {
      onSuccess: () => {
        toast.success("Role updated");
        void queryClient.invalidateQueries({
          queryKey: getGetApiUserRolesByUserUserIdQueryKey(id),
        });
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          err?.response?.data?.message ?? (err as Error)?.message ?? "Failed to update role",
        );
      },
    },
  });

  const roleIdFromServer = currentRoleAssignment?.roleId;
  const [roleSync, setRoleSync] = useState<{ roleId: number | undefined; pendingRoleId: number | "" }>({
    roleId: roleIdFromServer,
    pendingRoleId: "",
  });
  if (roleSync.roleId !== roleIdFromServer) {
    const nextPending: number | "" =
      roleIdFromServer != null && typeof roleIdFromServer === "number" ? roleIdFromServer : "";
    setRoleSync({ roleId: roleIdFromServer, pendingRoleId: nextPending });
  }
  const pendingRoleId = roleSync.pendingRoleId;
  const setPendingRoleId = (value: number | "") =>
    setRoleSync((s) => ({ ...s, pendingRoleId: value }));

  const [telegramPageState, setTelegramPageState] = useState({ userId, page: 0 });
  if (telegramPageState.userId !== userId) {
    setTelegramPageState({ userId, page: 0 });
  }
  const telegramMessagesPage = telegramPageState.page;
  const setTelegramMessagesPage = (page: number) =>
    setTelegramPageState((s) => ({ ...s, page }));

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
      page: telegramMessagesPage + 1,
      pageSize: telegramMessagesPageSize,
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

  const {
    data: emailStatusRaw,
    isLoading: emailStatusLoading,
    refetch: refetchEmailStatus,
  } = useGetApiUsersEmailConfirmationStatusId(userIdValid ? id : 0, {
    query: {
      enabled: userIdValid && Boolean(user?.email),
    },
  });

  const emailStatusPayload = unwrapMaybeApiResponse<UserResponsesGetUserEmailConfirmationStatusResponse>(
    emailStatusRaw as
      | UserResponsesGetUserEmailConfirmationStatusResponse
      | ApiEnvelope<UserResponsesGetUserEmailConfirmationStatusResponse>
      | undefined,
  );
  const isEmailConfirmed = emailStatusPayload?.isEmailConfirmed;

  const confirmEmailMutation = usePostApiUsersConfirmEmailId({
    mutation: {
      onSuccess: async () => {
        toast.success("Email confirmed");
        await queryClient.invalidateQueries({ queryKey: getGetApiUsersGetAllQueryKey() });
        await refetchEmailStatus();
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          err?.response?.data?.message ?? (err as Error)?.message ?? "Failed to confirm email",
        );
      },
    },
  });

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
          const payload = unwrapMaybeApiResponse<QuotaPlansResponse>(
            raw as QuotaPlansResponse | ApiEnvelope<QuotaPlansResponse> | undefined,
          );
          setQuotaPlans(payload?.quotaPlans ?? []);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation result reference is unstable; `mutate` is stable (TanStack Query v5)
  }, [id, getAllQuotaMutation.mutate]);

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

  const roleDirty =
    (typeof pendingRoleId === "number" ? pendingRoleId : null) !==
    (currentRoleAssignment?.roleId ?? null);

  const handleSaveRole = () => {
    if (!userIdValid) return;
    if (pendingRoleId === "" || typeof pendingRoleId !== "number") {
      toast.error("Select a role");
      return;
    }
    setRoleMutation.mutate({ data: { userId: id, roleId: pendingRoleId } });
  };

  const handleConfirmEmailManually = () => {
    if (!userIdValid || !user?.email) return;
    confirmEmailMutation.mutate({ id });
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

      <h2 className="settings-page__h2-with-icon">
        <FaIdCard className="icon" aria-hidden />
        <span>User details</span>
      </h2>

      <section className="settings-card settings-card--mb">
        <h3 className="settings-card__h3-with-icon">
          <FaUser className="icon" aria-hidden />
          <span>Profile</span>
        </h3>
        <div className="user-detail-profile-banner">
          <UserAvatar
            src={readOptionalAvatarUrl(user as object)}
            telegramPhotoTelegramId={telegramPhotoIdForProvider(user.provider, user.externalId)}
            name={user.displayName ?? user.email ?? `User #${user.id ?? ""}`}
            colorSeed={`${user.id ?? ""}|${user.email ?? ""}`}
            size={56}
          />
          <div className="user-detail-profile-banner__text">
            <p className="user-detail-profile-banner__name">{user.displayName?.trim() || "—"}</p>
            <p className="user-detail-profile-banner__sub">{user.email?.trim() || "No email"}</p>
          </div>
        </div>
        <dl className="user-detail-dl">
          <dt>ID</dt>
          <dd>{user.id ?? "—"}</dd>
          <dt>Display name</dt>
          <dd>{user.displayName ?? "—"}</dd>
          <dt>Email</dt>
          <dd>{user.email ?? "—"}</dd>
          <dt>Email confirmed</dt>
          <dd>
            {!user.email
              ? "No email"
              : emailStatusLoading
                ? "Loading..."
                : isEmailConfirmed === true
                  ? "Yes"
                  : isEmailConfirmed === false
                    ? "No"
                    : "—"}
          </dd>
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

      {user.id != null && (
        <section className="settings-card settings-card--mb">
          <h3 className="settings-card__h3-with-icon">
            <FaChartBar className="icon" aria-hidden />
            <span>Traffic quota</span>
          </h3>
          <UserTrafficQuotaProgress
            userId={user.id}
            externalId={user.externalId}
            quotaPlans={quotaPlans}
            userQuotaAssignments={userAssignments}
            suppressInlineTitle
          />
        </section>
      )}

      <UserVpnConnectionsSection externalId={user.externalId} />

      <UserDnsQueriesSection externalId={user.externalId} vpnServerId={0} />

      <section className="settings-card settings-card--mb">
        <h3 className="settings-card__h3-with-icon">
          <FaCog className="icon" aria-hidden />
          <span>Admin actions</span>
        </h3>
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
        <div className="mt-12">
          <button
            className="btn primary"
            onClick={handleConfirmEmailManually}
            disabled={confirmEmailMutation.isPending || !user.email || isEmailConfirmed === true}
          >
            <FaSave className="icon" /> Confirm email manually
          </button>
        </div>
      </section>

      {canManageRoles && (
        <section className="settings-card settings-card--mb">
          <h3 className="settings-card__h3-with-icon">
            <FaShieldAlt className="icon" aria-hidden />
            <span>Access role</span>
          </h3>
          <p className="settings-item-description">
            Role used for authorization on the server. The &quot;Admin&quot; field in the profile above may still
            reflect legacy data.
          </p>
          {rolesCatalogLoading || userRoleLoading ? (
            <p className="text-muted">Loading role…</p>
          ) : roleCatalog.length === 0 ? (
            <p className="error-message">No roles returned from the API. Check permissions or backend configuration.</p>
          ) : (
            <div className="settings-item settings-item--col-top">
              <label htmlFor="user-role-select" className="settings-item-label--wide">
                Role
              </label>
              <div className="flex-wrap-gap-12">
                <select
                  id="user-role-select"
                  className="input select-min-220"
                  value={pendingRoleId === "" ? "" : String(pendingRoleId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPendingRoleId(v === "" ? "" : Number(v));
                  }}
                  disabled={setRoleMutation.isPending}
                >
                  <option value="">— Select role —</option>
                  {roleCatalog.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name?.trim() || r.normalizedName || `Role #${r.id}`}
                      {r.isSystem ? " (system)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleSaveRole}
                  disabled={!roleDirty || setRoleMutation.isPending}
                >
                  <FaSave className="icon" aria-hidden /> Save role
                </button>
              </div>
              {currentRoleAssignment?.roleName != null && (
                <p className="text-muted-sm">
                  Current (from server): {currentRoleAssignment.roleName}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {isTelegramUser && (
        <section className="settings-card settings-card--mb">
          <h3 className="settings-card__h3-with-icon">
            <FaPaperPlane className="icon" aria-hidden />
            <span>Telegram bot messages</span>
          </h3>
          <p className="settings-item-description">
            Incoming messages from this user in the Telegram bot.
          </p>
          {telegramIdValid ? (
            <>
              <div className="header-bar header-bar--mb-8">
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
                <p className="error-message error-message--mb-8">❌ {telegramMessagesErrorMessage}</p>
              )}
              {!telegramMessagesLoading && telegramMessagesTotalCount === 0 ? (
                <p className="text-muted">No messages.</p>
              ) : (
              <div className="data-grid-wrap data-grid-wrap--inset">
                <CustomThemeProvider>
                  <Grid
                    gridId="user-telegram-messages"
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
                    pageSizeOptions={[5, 10, 20, 50, 100]}
                    paginationMode="server"
                    rowCount={telegramMessagesTotalCount}
                    paginationModel={{
                      page: telegramMessagesPage,
                      pageSize: telegramMessagesPageSize,
                    }}
                    onPaginationModelChange={(model) => {
                      setTelegramMessagesPage(model.page);
                      setTelegramMessagesPageSize(model.pageSize);
                    }}
                    loading={telegramMessagesLoading || telegramMessagesFetching}
                    slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                    localeText={{ noRowsLabel: "📭 No messages" }}
                  />
                </CustomThemeProvider>
              </div>
              )}
            </>
          ) : (
            <p className="text-muted">
              Telegram ID not available; cannot load messages.
            </p>
          )}
        </section>
      )}

      <section className="settings-card settings-card--mb">
        <h3 className="settings-card__h3-with-icon">
          <FaClipboardList className="icon" aria-hidden />
          <span>User quota plan assignments</span>
        </h3>
        <p className="settings-item-description">
          Assign quota plans to this user. Effective from/to define the period when the plan applies.
        </p>
        <div className="header-bar header-bar--mb-12">
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
        {userAssignments.length === 0 ? (
          <p className="text-muted">No assignments. Click «Assign plan» to add one.</p>
        ) : (
          <div className="table-container table-container--pad">
            <table className="user-quota-assignments-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Effective from</th>
                  <th>Effective to</th>
                  <th>Note</th>
                  <th className="th-actions">Actions</th>
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
        <h3 className="settings-card__h3-with-icon">
          <FaListUl className="icon" aria-hidden />
          <span>Available quota plans</span>
        </h3>
        <p className="settings-item-description">
          All quota plans defined in the system. Assign them above. Server-side restrictions may apply.
        </p>
        {quotaPlans.length === 0 ? (
          <p className="text-muted">No quota plans.</p>
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
