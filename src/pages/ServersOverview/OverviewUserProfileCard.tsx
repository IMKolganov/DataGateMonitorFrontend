import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useGetApiUsersGetAll } from "../../api/orval/user/user";
import { useGetApiOpenVpnClientsOverviewUsers } from "../../api/orval/vpn-server-clients/vpn-server-clients";
import type { GetAllUsersResponse, OverviewUsersResponse, UserDto } from "../../api/orvalModelShim";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { formatBytes } from "../../utils/utils";
import { UserTrafficQuotaProgress } from "../../components/quota/UserTrafficQuotaProgress";

import "../../css/Settings.css";

type Props = {
  externalId: string;
  vpnServerId?: number;
  from: Date;
  to: Date;
};

export function OverviewUserProfileCard({ externalId, vpnServerId, from, to }: Props) {
  const usersQuery = useGetApiUsersGetAll(
    { Page: 1, PageSize: 500 },
    { query: { enabled: true, staleTime: 60_000 } },
  );

  const dashboardUser = useMemo(() => {
    const payload = unwrapMaybeApiResponse<GetAllUsersResponse>(
      usersQuery.data as GetAllUsersResponse | ApiEnvelope<GetAllUsersResponse> | undefined,
    );
    const list = payload?.users ?? [];
    return (list as UserDto[]).find((u) => u.externalId === externalId) ?? null;
  }, [usersQuery.data, externalId]);

  const overviewParams = useMemo(
    () => ({
      From: from.toISOString(),
      To: to.toISOString(),
      ExternalId: externalId,
      VpnServerId: vpnServerId,
    }),
    [from, to, externalId, vpnServerId],
  );

  const overviewQuery = useGetApiOpenVpnClientsOverviewUsers<OverviewUsersResponse>(overviewParams, {
    query: {
      enabled: Boolean(overviewParams.From && overviewParams.To),
      staleTime: 10_000,
    },
  });

  const overviewRow = useMemo(() => {
    const items = overviewQuery.data?.overviewUserItems ?? [];
    return items[0] ?? null;
  }, [overviewQuery.data]);

  const isTelegramUser =
    dashboardUser != null &&
    (dashboardUser.provider?.toLowerCase().includes("telegram") ?? false);

  if (usersQuery.isLoading) {
    return (
      <section className="settings-card" style={{ marginBottom: 16 }}>
        <h3>User details</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>Loading dashboard user…</p>
      </section>
    );
  }

  if (dashboardUser) {
    return (
      <section className="settings-card" style={{ marginBottom: 16 }}>
        <h3>User details</h3>
        <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
          Profile
        </h4>
        <dl className="user-detail-dl">
          <dt>ID</dt>
          <dd>{dashboardUser.id ?? "—"}</dd>
          <dt>Display name</dt>
          <dd>{dashboardUser.displayName ?? "—"}</dd>
          <dt>Email</dt>
          <dd>{dashboardUser.email ?? "—"}</dd>
          <dt>Sign-in method</dt>
          <dd>
            {dashboardUser.provider
              ? isTelegramUser
                ? `Telegram${dashboardUser.externalId != null ? ` (ID: ${dashboardUser.externalId})` : ""}`
                : dashboardUser.provider
              : "—"}
          </dd>
          <dt>Provider</dt>
          <dd>{dashboardUser.provider ?? "—"}</dd>
          <dt>External ID</dt>
          <dd>{dashboardUser.externalId ?? "—"}</dd>
          <dt>Provider row ID</dt>
          <dd>{dashboardUser.providerRowId ?? "—"}</dd>
          <dt>Admin</dt>
          <dd>{dashboardUser.isAdmin ? "Yes" : "No"}</dd>
          <dt>Blocked</dt>
          <dd>{dashboardUser.isBlocked ? "Yes" : "No"}</dd>
          <dt>Dashboard access</dt>
          <dd>{dashboardUser.hasDashboardAccess ? "Yes" : "No"}</dd>
          <dt>Created</dt>
          <dd>
            {dashboardUser.createDate
              ? new Date(dashboardUser.createDate).toLocaleString()
              : "—"}
          </dd>
          <dt>Last update</dt>
          <dd>
            {dashboardUser.lastUpdate
              ? new Date(dashboardUser.lastUpdate).toLocaleString()
              : "—"}
          </dd>
        </dl>
        {dashboardUser.id != null && (
          <>
            <div style={{ marginTop: 16 }}>
              <UserTrafficQuotaProgress
                userId={dashboardUser.id}
                externalId={dashboardUser.externalId}
              />
            </div>
            <p style={{ margin: "12px 0 0 0", fontSize: 14 }}>
              <Link to={`/settings/users/${dashboardUser.id}`}>Open full user page in Settings</Link>
            </p>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="settings-card" style={{ marginBottom: 16 }}>
      <h3>User details</h3>
      <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-muted)" }}>
        No dashboard account with this OpenVPN external ID was found in the first 500 users. If the
        account exists, try opening it from{" "}
        <Link to="/settings/users">Settings → Users</Link>.
      </p>
      {overviewRow && (
        <>
          <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            OpenVPN activity (selected period)
          </h4>
          <dl className="user-detail-dl">
            <dt>External ID</dt>
            <dd>{overviewRow.externalId ?? externalId}</dd>
            <dt>Display name</dt>
            <dd>{overviewRow.displayName ?? "—"}</dd>
            <dt>VPN server</dt>
            <dd>
              {overviewRow.vpnServerId != null ? `#${overviewRow.vpnServerId}` : "—"}
            </dd>
            <dt>Sessions</dt>
            <dd>{overviewRow.sessions ?? "—"}</dd>
            <dt>Traffic in</dt>
            <dd>{formatBytes(overviewRow.trafficInBytes)}</dd>
            <dt>Traffic out</dt>
            <dd>{formatBytes(overviewRow.trafficOutBytes)}</dd>
            <dt>First seen</dt>
            <dd>
              {overviewRow.firstSeen ? new Date(overviewRow.firstSeen).toLocaleString() : "—"}
            </dd>
            <dt>Last seen</dt>
            <dd>
              {overviewRow.lastSeen ? new Date(overviewRow.lastSeen).toLocaleString() : "—"}
            </dd>
          </dl>
        </>
      )}
    </section>
  );
}
