import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaKey } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useGetApiUsersGetByIdId,
  getGetApiUsersGetAllQueryKey,
} from "../../api/orval/user/user";
import { usePostApiAuthForgotPassword } from "../../api/orval/auth/auth";
import { usePostApiQuotaPlansGetAll } from "../../api/orval/quota-plan/quota-plan";
import type { QuotaPlanDto, QuotaPlansResponse } from "../../api/orval/model";
import type { UsersResponse } from "../../api/orval/model";
import { useQueryClient } from "@tanstack/react-query";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import "../../css/Settings.css";

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
    <div className="content-wrapper">
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

      <section className="settings-card">
        <h3>Quota plans</h3>
        <p className="settings-item-description">
          All quota plans defined in the system. User assignment may be configured per server.
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
    </div>
  );
}

export default UserDetailPage;
