import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { GridColDef } from "@mui/x-data-grid";
import { toast } from "react-toastify";
import { FaBell } from "react-icons/fa";
import "../css/Settings.css";
import "../css/Table.css";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import type {
  EnumsApplicationNotificationKind,
  GetVpnProfileNotificationPreferencesResponse,
} from "../api/orvalModelShim";
import {
  getGetApiVpnProfileNotificationPreferencesQueryKey,
  useGetApiVpnProfileNotificationPreferences,
  usePostApiVpnProfileNotificationPreferencesSetAllCategories,
  usePutApiVpnProfileNotificationPreferences,
} from "../api/orval/vpn-profile-notification-preferences/vpn-profile-notification-preferences";
import { errorMessage } from "../utils/errorMessage";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";

/** Matches backend ApplicationNotificationKind enum order (int values 0–26). */
type NotificationKindRow = {
  kind: number;
  section: string;
  title: string;
  description: string;
};

const KIND_ROWS: NotificationKindRow[] = [
  {
    kind: 0,
    section: "OpenVPN profiles (API)",
    title: "Read",
    description: "List or fetch profiles (by server, external id, token, etc.).",
  },
  {
    kind: 1,
    section: "OpenVPN profiles (API)",
    title: "Mutate",
    description: "Issue, revoke, or token-related changes.",
  },
  {
    kind: 2,
    section: "OpenVPN profiles (API)",
    title: "Download",
    description: "When a profile file is downloaded via the API.",
  },
  {
    kind: 3,
    section: "Xray client links (API)",
    title: "Read",
    description: "List or fetch client links (by server, external id, token, etc.).",
  },
  {
    kind: 4,
    section: "Xray client links (API)",
    title: "Mutate",
    description: "Issue, revoke, or token-related changes.",
  },
  {
    kind: 5,
    section: "Xray client links (API)",
    title: "Download",
    description: "When a client link payload is downloaded via the API.",
  },
  {
    kind: 6,
    section: "Certificate API",
    title: "Read all",
    description: "Certificate microservice: list or read certificate metadata.",
  },
  {
    kind: 7,
    section: "Certificate API",
    title: "Certificate created",
    description: "A new certificate was created.",
  },
  {
    kind: 8,
    section: "Certificate API",
    title: "Certificate revoked",
    description: "A certificate was revoked.",
  },
  {
    kind: 9,
    section: "VPN servers (OpenVPN API)",
    title: "Server became available",
    description: "A VPN server responded again after being unavailable.",
  },
  {
    kind: 10,
    section: "VPN servers (OpenVPN API)",
    title: "Server added",
    description: "A new OpenVPN server was registered.",
  },
  {
    kind: 11,
    section: "VPN servers (OpenVPN API)",
    title: "Server updated",
    description: "OpenVPN server configuration changed.",
  },
  {
    kind: 12,
    section: "VPN servers (OpenVPN API)",
    title: "Server deleted",
    description: "An OpenVPN server was removed.",
  },
  {
    kind: 13,
    section: "VPN servers (OpenVPN API)",
    title: "Server became unavailable",
    description: "A VPN server stopped responding or failed health checks.",
  },
  {
    kind: 14,
    section: "VPN servers (OpenVPN API)",
    title: "Server sync error",
    description: "Synchronization with the server API failed.",
  },
  {
    kind: 15,
    section: "VPN servers (OpenVPN API)",
    title: "Server no response",
    description: "The server API did not respond in time.",
  },
  {
    kind: 16,
    section: "OpenVPN microservice",
    title: "Send command failed",
    description: "Sending a command to the OpenVPN microservice failed.",
  },
  {
    kind: 17,
    section: "OpenVPN microservice",
    title: "Reconnect failed",
    description: "Reconnecting to the microservice failed.",
  },
  {
    kind: 18,
    section: "OpenVPN microservice",
    title: "Event hub connection failed",
    description: "Event hub connection to the microservice failed.",
  },
  {
    kind: 19,
    section: "OpenVPN microservice",
    title: "Proxy client lookup failed",
    description: "Resolving a client through the microservice proxy failed.",
  },
  {
    kind: 20,
    section: "GeoLite",
    title: "Auto update succeeded",
    description: "GeoLite database was updated successfully.",
  },
  {
    kind: 21,
    section: "GeoLite",
    title: "Auto update failed",
    description: "GeoLite automatic update failed.",
  },
  {
    kind: 22,
    section: "Application",
    title: "Unhandled exception",
    description: "An unhandled exception was reported by the backend.",
  },
  {
    kind: 23,
    section: "Application",
    title: "File created",
    description: "A monitored file was created.",
  },
  {
    kind: 24,
    section: "Application",
    title: "Certificate issued",
    description: "In-app certificate issuance event.",
  },
  {
    kind: 25,
    section: "Application",
    title: "Server monitor down",
    description: "A monitored dependency was reported as down.",
  },
  {
    kind: 26,
    section: "Application",
    title: "Server monitor up",
    description: "A monitored dependency recovered.",
  },
];

export default function NotificationVpnProfileSettings() {
  const [gridPage, setGridPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(
    "notification-vpn-profile-settings",
    10,
    "5,10,20,50,100",
  );
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);
  const queryClient = useQueryClient();

  const invalidatePrefs = () =>
    void queryClient.invalidateQueries({
      queryKey: getGetApiVpnProfileNotificationPreferencesQueryKey(),
    });

  const prefsQuery = useGetApiVpnProfileNotificationPreferences<GetVpnProfileNotificationPreferencesResponse>({
    query: { staleTime: 30_000 },
  });

  const putMutation = usePutApiVpnProfileNotificationPreferences({
    mutation: { onSuccess: invalidatePrefs },
  });

  const setAllMutation = usePostApiVpnProfileNotificationPreferencesSetAllCategories({
    mutation: { onSuccess: invalidatePrefs },
  });

  const payload = prefsQuery.data;

  const enabledByKind = useMemo(() => {
    const m = new Map<number, boolean>();
    if (!payload?.preferences) return m;
    for (const p of payload.preferences) {
      if (typeof p.kind === "number") m.set(p.kind, Boolean(p.enabled));
    }
    return m;
  }, [payload]);

  const handleToggleGlobal = async (next: boolean) => {
    setGlobalBusy(true);
    try {
      await putMutation.mutateAsync({ data: { globallyEnabled: next } });
      toast.success(next ? "All admin notifications enabled" : "All admin notifications disabled");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Failed to save");
    } finally {
      setGlobalBusy(false);
    }
  };

  const handleToggleRow = useCallback(
    async (row: NotificationKindRow, next: boolean) => {
      const key = String(row.kind);
      setSavingRowKey(key);
      try {
        await putMutation.mutateAsync({
          data: {
            preferences: [{ kind: row.kind as EnumsApplicationNotificationKind, enabled: next }],
          },
        });
        toast.success(`${row.section} — ${row.title}: saved`);
      } catch (e: unknown) {
        toast.error(errorMessage(e) || "Failed to save");
      } finally {
        setSavingRowKey(null);
      }
    },
    [putMutation],
  );

  const handleEnableAllKinds = async (enabled: boolean) => {
    try {
      await setAllMutation.mutateAsync({ data: { enabled } });
      toast.success(enabled ? "All notification kinds enabled" : "All notification kinds disabled");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Failed to save");
    }
  };

  const gridRows = useMemo(
    () =>
      KIND_ROWS.map((row) => ({
        ...row,
        enabled: enabledByKind.get(row.kind) ?? false,
      })),
    [enabledByKind],
  );

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "section", headerName: "Area", width: 220 },
      { field: "title", headerName: "Kind", width: 160 },
      { field: "description", headerName: "Description", flex: 1, minWidth: 220 },
      {
        field: "enabled",
        headerName: "Notify",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as NotificationKindRow & { enabled: boolean };
          const key = String(row.kind);
          const busy = savingRowKey === key;
          return (
            <label className="checkbox-label" style={{ margin: 0, alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={Boolean(params.value)}
                disabled={busy || putMutation.isPending || !payload?.globallyEnabled}
                onChange={(e) => {
                  void handleToggleRow(row, e.target.checked);
                }}
              />
            </label>
          );
        },
      },
    ],
    [handleToggleRow, payload?.globallyEnabled, putMutation.isPending, savingRowKey],
  );

  if (prefsQuery.isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading notification settings…</p>
      </div>
    );
  }

  if (prefsQuery.error) {
    return (
      <div className="settings-group">
        <p className="settings-error">Failed to load settings: {errorMessage(prefsQuery.error)}</p>
      </div>
    );
  }

  const globalOn = Boolean(payload?.globallyEnabled);

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaBell className="icon" aria-hidden />
        <span>VPN profile notifications</span>
      </h2>
      <p className="settings-description" style={{ marginBottom: 16 }}>
        Master switch turns off every admin notification covered below. When it is on, you can enable or disable each
        notification kind separately, or use bulk actions for all kinds at once. Numeric{" "}
        <code>kind</code> in the API matches the backend enum order (0–26).
      </p>

      <div className="settings-group" style={{ marginBottom: 16 }}>
        <h4>All admin notifications (this page)</h4>
        <label className="checkbox-label" style={{ gap: 10 }}>
          <input
            type="checkbox"
            checked={globalOn}
            disabled={globalBusy || putMutation.isPending}
            onChange={(e) => {
              void handleToggleGlobal(e.target.checked);
            }}
          />
          <span>Enabled</span>
        </label>
      </div>

      <div className="settings-item" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          className="btn secondary"
          disabled={!globalOn || setAllMutation.isPending}
          onClick={() => void handleEnableAllKinds(true)}
        >
          Enable all kinds
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={!globalOn || setAllMutation.isPending}
          onClick={() => void handleEnableAllKinds(false)}
        >
          Disable all kinds
        </button>
      </div>

      <div style={{ borderTop: "1px solid #d1d5da" }} />

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{
            backgroundColor: "var(--bg-body)",
            padding: 10,
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          <StyledDataGrid
            getRowId={(r) => r.kind}
            rows={gridRows}
            columns={columns}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            paginationMode="client"
            paginationModel={{ page: gridPage, pageSize }}
            onPaginationModelChange={(m) => {
              setGridPage(m.page);
              setPageSize(m.pageSize);
            }}
            disableRowSelectionOnClick
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{ noRowsLabel: "No rows" }}
          />
        </div>
      </CustomThemeProvider>
    </div>
  );
}
