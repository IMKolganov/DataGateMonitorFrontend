// src/pages/FreeTierEnforcementSettings.tsx
import { useMemo, useState } from "react";
import { FaBan, FaBolt, FaSave, FaSync, FaUserSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import Grid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { UserAvatar } from "../components/ui/UserAvatar.tsx";
import { useGetApiSettingsGet, usePostApiSettingsSet } from "../api/orval/settings/settings";
import {
  useGetApiFreeTierEnforcementCandidates,
  useGetApiFreeTierEnforcementDisconnectLog,
} from "../api/orval/free-tier-enforcement/free-tier-enforcement";
import { usePostApiOpenVpnClientsKill } from "../api/orval/vpn-server-clients/vpn-server-clients";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import { unwrapKillResponse } from "../utils/unwrapKillResponse";
import {
  DisconnectReason,
  type FreeTierEnforcementCandidateDto,
  type FreeTierDisconnectLogEntryDto,
  type GetFreeTierEnforcementCandidatesResponse,
  type GetFreeTierDisconnectLogResponse,
} from "../api/orvalModelShim";
import { formatDateWithOffset } from "../utils/utils";
import { errorMessage } from "../utils/errorMessage";
import "../css/Settings.css";
import "../css/Table.css";

const KEY_ENFORCE = "FreeTier_Enforce_OpenVpn_Sessions";
const KEY_INTERVAL_MINUTES = "FreeTier_Enforcement_Interval_Minutes";
const KEY_REVOKE_ON_ENFORCEMENT = "FreeTier_Revoke_Ovpn_On_Enforcement";

const REASON_LABELS: Record<number, string> = {
  [DisconnectReason.NUMBER_0]: "Enforcement",
  [DisconnectReason.NUMBER_1]: "Manual",
};

function pickSettingValue(resp: unknown): string | undefined {
  if (resp == null || typeof resp !== "object") return undefined;
  const r = resp as Record<string, unknown>;
  const data = r["data"] as Record<string, unknown> | undefined;
  const v = r["value"] ?? data?.["value"];
  return typeof v === "string" ? v : v != null ? String(v) : undefined;
}

export default function FreeTierEnforcementSettings() {
  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaUserSlash className="icon" aria-hidden />
        <span>Free tier enforcement</span>
      </h2>
      <p className="settings-description">
        Disconnects Free/Default-plan users who are not subscribed to the required Telegram
        channel and have not linked their account, and optionally revokes their OVPN
        certificate so they cannot immediately reconnect.
      </p>

      <EnforcementSettingsCard />
      <CandidatesCard />
      <DisconnectLogCard />
    </div>
  );
}

function EnforcementSettingsCard() {
  const [enforceEnabled, setEnforceEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [revokeOnEnforcement, setRevokeOnEnforcement] = useState(false);
  const [appliedKey, setAppliedKey] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const enforceQuery = useGetApiSettingsGet({ Key: KEY_ENFORCE }, { query: { staleTime: 0 } });
  const intervalQuery = useGetApiSettingsGet(
    { Key: KEY_INTERVAL_MINUTES },
    { query: { staleTime: 0 } },
  );
  const revokeQuery = useGetApiSettingsGet(
    { Key: KEY_REVOKE_ON_ENFORCEMENT },
    { query: { staleTime: 0 } },
  );

  const initialLoading = enforceQuery.isLoading || intervalQuery.isLoading || revokeQuery.isLoading;

  const snapshotKey = useMemo(
    () =>
      JSON.stringify({
        enforce: pickSettingValue(enforceQuery.data),
        interval: pickSettingValue(intervalQuery.data),
        revoke: pickSettingValue(revokeQuery.data),
      }),
    [enforceQuery.data, intervalQuery.data, revokeQuery.data],
  );

  if (snapshotKey !== appliedKey && !initialLoading) {
    setAppliedKey(snapshotKey);

    const enforceRaw = (pickSettingValue(enforceQuery.data) ?? "").toLowerCase();
    if (enforceRaw === "true") setEnforceEnabled(true);
    else if (enforceRaw === "false") setEnforceEnabled(false);

    const intervalRaw = Number(pickSettingValue(intervalQuery.data));
    if (!Number.isNaN(intervalRaw)) setIntervalMinutes(intervalRaw);

    const revokeRaw = (pickSettingValue(revokeQuery.data) ?? "").toLowerCase();
    if (revokeRaw === "true") setRevokeOnEnforcement(true);
    else if (revokeRaw === "false") setRevokeOnEnforcement(false);
  }

  const setSettingMutation = usePostApiSettingsSet();

  const handleSave = async () => {
    setErrorDetails(null);
    setSuccessMessage(null);

    if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
      setErrorDetails("Enforcement interval must be at least 1 minute.");
      return;
    }

    try {
      await Promise.all([
        setSettingMutation.mutateAsync({
          params: { Key: KEY_ENFORCE, Value: String(enforceEnabled), Type: "bool" },
        }),
        setSettingMutation.mutateAsync({
          params: { Key: KEY_INTERVAL_MINUTES, Value: String(intervalMinutes), Type: "int" },
        }),
        setSettingMutation.mutateAsync({
          params: { Key: KEY_REVOKE_ON_ENFORCEMENT, Value: String(revokeOnEnforcement), Type: "bool" },
        }),
      ]);
      setSuccessMessage("Settings successfully updated.");
    } catch (e: unknown) {
      setErrorDetails(errorMessage(e));
    }
  };

  if (initialLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-polling">
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorDetails && <p className="error-message">{errorDetails}</p>}

      <label className="settings-item settings-item--gap-10">
        <input
          id="free-tier-enforce-openvpn-sessions"
          name="freeTierEnforceOpenVpnSessions"
          type="checkbox"
          checked={enforceEnabled}
          onChange={(e) => setEnforceEnabled(e.target.checked)}
        />
        <span>Automatically disconnect non-compliant Free/Default users</span>
      </label>
      <p className="settings-item-description">
        When enabled, the background job periodically kills OpenVPN sessions of Free/Default
        plan users who are not subscribed to the required Telegram channel and have not linked
        their dashboard account (merged account).
      </p>

      <div className="settings-item settings-item--mt-12">
        <label htmlFor="free-tier-enforcement-interval" className="settings-item-label--320">
          Check interval (minutes)
        </label>
        <input
          id="free-tier-enforcement-interval"
          type="number"
          min={1}
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(Number(e.target.value))}
          className="input polling-interval-input"
        />
      </div>

      <label className="settings-item settings-item--gap-10 settings-item--mt-12">
        <input
          id="free-tier-revoke-on-enforcement"
          name="freeTierRevokeOnEnforcement"
          type="checkbox"
          checked={revokeOnEnforcement}
          onChange={(e) => setRevokeOnEnforcement(e.target.checked)}
        />
        <span>Revoke OVPN certificate when the enforcement job disconnects a client</span>
      </label>
      <p className="settings-item-description">
        Without this, a killed client's app may immediately reconnect using the same profile.
        Revoking the certificate forces the user to obtain a new one before they can connect
        again.
      </p>

      <div className="settings-item settings-item--mt-12">
        <button
          type="button"
          className="btn primary"
          onClick={() => void handleSave()}
          disabled={setSettingMutation.isPending}
        >
          <FaSave className="icon" aria-hidden /> Save
        </button>
      </div>
    </div>
  );
}

function CandidatesCard() {
  const [killBusyKey, setKillBusyKey] = useState<string | null>(null);
  const candidatesQuery = useGetApiFreeTierEnforcementCandidates<GetFreeTierEnforcementCandidatesResponse>({
    query: { enabled: false },
  });
  const killMutation = usePostApiOpenVpnClientsKill();

  const payload = unwrapMaybeApiResponse(candidatesQuery.data);
  const candidates = payload?.candidates ?? [];

  const handleRefresh = () => {
    void candidatesQuery.refetch();
  };

  const handleKill = async (candidate: FreeTierEnforcementCandidateDto, revoke: boolean) => {
    if (!candidate.vpnServerId || !candidate.commonName) return;
    const key = `${candidate.commonName}:${revoke ? "revoke" : "kill"}`;
    if (
      revoke &&
      !window.confirm(
        `Kill and revoke the OVPN certificate for "${candidate.displayName ?? candidate.commonName}"? They will need a new profile to reconnect.`,
      )
    ) {
      return;
    }
    setKillBusyKey(key);
    try {
      const resp = await killMutation.mutateAsync({
        data: {
          vpnServerId: candidate.vpnServerId,
          commonName: candidate.commonName,
          revokeCertificate: revoke,
        },
      });
      const result = unwrapKillResponse(resp);
      if (result && result.success === false) {
        toast.error(result.errorMessage ?? "Kill request failed.");
      } else {
        toast.success(revoke ? "Client killed and certificate revoked." : "Client killed.");
      }
      void candidatesQuery.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setKillBusyKey(null);
    }
  };

  const rows = candidates.map((c: FreeTierEnforcementCandidateDto, idx: number) => ({
    id: c.userId ?? idx + 1,
    displayName: c.displayName ?? "-",
    email: c.email ?? "-",
    telegramId: c.telegramId ?? null,
    activePlanName: c.activePlanName ?? "-",
    isMergedAccount: Boolean(c.isMergedAccount),
    isChannelSubscribed: Boolean(c.isChannelSubscribed),
    isConnected: Boolean(c.isConnected),
    vpnServerName: c.vpnServerName ?? "-",
    commonName: c.commonName ?? "",
    connectedSince: c.connectedSince ? formatDateWithOffset(new Date(c.connectedSince)) : "-",
    _candidate: c,
  }));

  const columns: GridColDef[] = [
    {
      field: "avatar",
      headerName: "",
      width: 56,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <UserAvatar name={params.row.displayName as string} colorSeed={String(params.row.id)} size={28} />
      ),
    },
    { field: "displayName", headerName: "Display Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "activePlanName", headerName: "Plan", flex: 0.6 },
    { field: "isMergedAccount", headerName: "Merged", type: "boolean", flex: 0.4 },
    { field: "isChannelSubscribed", headerName: "Subscribed", type: "boolean", flex: 0.5 },
    { field: "isConnected", headerName: "Online", type: "boolean", flex: 0.4 },
    { field: "vpnServerName", headerName: "VPN Server", flex: 0.7 },
    { field: "commonName", headerName: "Common Name", flex: 0.7 },
    { field: "connectedSince", headerName: "Connected Since", flex: 0.7 },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 280,
      renderCell: (params) => {
        const candidate = (params.row as { _candidate: FreeTierEnforcementCandidateDto })._candidate;
        if (!candidate.isConnected || !candidate.commonName) return null;
        const busyKill = killBusyKey === `${candidate.commonName}:kill`;
        const busyRevoke = killBusyKey === `${candidate.commonName}:revoke`;
        return (
          <div className="action-container">
            <button
              type="button"
              className="btn secondary"
              disabled={busyKill || busyRevoke}
              title="Disconnect the active OpenVPN session; the client can reconnect."
              onClick={() => void handleKill(candidate, false)}
            >
              <FaBolt className="icon" aria-hidden />
              {busyKill ? "…" : "Kill"}
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={busyKill || busyRevoke}
              title="Disconnect and revoke the OVPN certificate; the client cannot reconnect with this profile."
              onClick={() => void handleKill(candidate, true)}
            >
              <FaBan className="icon" aria-hidden />
              {busyRevoke ? "…" : "Revoke"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="settings-polling">
      <div className="header-bar">
        <h3 className="settings-card__h3-with-icon">
          <FaUserSlash className="icon" aria-hidden />
          <span>
            Candidates{" "}
            {payload ? `(${payload.totalCount ?? candidates.length}, ${payload.connectedCount ?? 0} online)` : ""}
          </span>
        </h3>
        <div className="left-buttons">
          <button
            type="button"
            className="btn secondary"
            onClick={handleRefresh}
            disabled={candidatesQuery.isFetching}
          >
            <FaSync className={`icon ${candidatesQuery.isFetching ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>
      <div className="settings-divider" />
      <p className="settings-item-description">
        Users on a Free/Default plan who are not subscribed to the Telegram channel and have not
        linked their dashboard account. This list is not auto-refreshed; click Refresh to
        re-check compliance (checks the Telegram channel membership API).
      </p>

      {candidatesQuery.error ? (
        <p className="error-message">{errorMessage(candidatesQuery.error)}</p>
      ) : null}

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: "10px", borderRadius: "8px" }}
        >
          <Grid
            gridId="free-tier-enforcement-candidates"
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 20, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            localeText={{ noRowsLabel: "📭 No candidates loaded — click Refresh" }}
            loading={candidatesQuery.isFetching}
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
          />
        </div>
      </CustomThemeProvider>
    </div>
  );
}

function DisconnectLogCard() {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });

  const logQuery = useGetApiFreeTierEnforcementDisconnectLog<GetFreeTierDisconnectLogResponse>(
    { Page: paginationModel.page + 1, PageSize: paginationModel.pageSize },
    { query: { placeholderData: (prev) => prev } },
  );

  const pagedEntries = unwrapMaybeApiResponse(logQuery.data)?.entries;
  const entries = pagedEntries?.items ?? [];
  const totalCount = pagedEntries?.totalCount ?? 0;

  const rows = entries.map((e: FreeTierDisconnectLogEntryDto) => ({
    id: e.id,
    createdAt: e.createdAt ? formatDateWithOffset(new Date(e.createdAt)) : "-",
    userDisplayName: e.userDisplayName ?? "-",
    vpnServerName: e.vpnServerName ?? "-",
    commonName: e.commonName ?? "-",
    reason: e.reason != null ? REASON_LABELS[e.reason] ?? String(e.reason) : "-",
    initiatedBy: e.initiatedByDisplayName ?? (e.reason === DisconnectReason.NUMBER_0 ? "Automatic" : "-"),
    killSucceeded: Boolean(e.killSucceeded),
    revokeRequested: Boolean(e.revokeRequested),
    revokeSucceeded: e.revokeRequested ? Boolean(e.revokeSucceeded) : null,
    errorMessage: e.errorMessage ?? "",
  }));

  const columns: GridColDef[] = [
    { field: "createdAt", headerName: "When", flex: 0.8 },
    { field: "userDisplayName", headerName: "User", flex: 0.8 },
    { field: "vpnServerName", headerName: "VPN Server", flex: 0.6 },
    { field: "commonName", headerName: "Common Name", flex: 0.7 },
    { field: "reason", headerName: "Reason", flex: 0.5 },
    { field: "initiatedBy", headerName: "Initiated By", flex: 0.6 },
    { field: "killSucceeded", headerName: "Killed", type: "boolean", flex: 0.4 },
    { field: "revokeRequested", headerName: "Revoke Requested", type: "boolean", flex: 0.5 },
    {
      field: "revokeSucceeded",
      headerName: "Revoked",
      flex: 0.4,
      renderCell: (params) => {
        const v = params.value as boolean | null;
        if (v == null) return <span>-</span>;
        return <span>{v ? "✅" : "❌"}</span>;
      },
    },
    { field: "errorMessage", headerName: "Error", flex: 1 },
  ];

  return (
    <div className="settings-polling">
      <div className="header-bar">
        <h3 className="settings-card__h3-with-icon">
          <FaBan className="icon" aria-hidden />
          <span>Disconnect log</span>
        </h3>
        <div className="left-buttons">
          <button
            type="button"
            className="btn secondary"
            onClick={() => void logQuery.refetch()}
            disabled={logQuery.isFetching}
          >
            <FaSync className={`icon ${logQuery.isFetching ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>
      <div className="settings-divider" />
      <p className="settings-item-description">
        Audit trail of every OpenVPN client disconnect, whether triggered by the automated
        enforcement job or an admin's manual kill.
      </p>

      {logQuery.error ? <p className="error-message">{errorMessage(logQuery.error)}</p> : null}

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: "10px", borderRadius: "8px" }}
        >
          <Grid
            gridId="free-tier-enforcement-disconnect-log"
            rows={rows}
            columns={columns}
            rowCount={totalCount}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50, 100]}
            localeText={{ noRowsLabel: "📭 No disconnects logged yet" }}
            loading={logQuery.isFetching}
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
          />
        </div>
      </CustomThemeProvider>
    </div>
  );
}
