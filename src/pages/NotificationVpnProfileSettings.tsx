import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GridColDef } from "@mui/x-data-grid";
import { toast } from "react-toastify";
import { FaBell } from "react-icons/fa";
import "../css/Settings.css";
import "../css/Table.css";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { apiRequest } from "../api/apirequest.ts";
import { errorMessage } from "../utils/errorMessage";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";

type StackLabel = "OpenVPN" | "Xray";
type CategoryLabel = "Read" | "Mutate" | "Download";

/** Matches backend enum int values. */
const StackOpenVpn = 0;
const StackXray = 1;
const CatRead = 0;
const CatMutate = 1;
const CatDownload = 2;

type PrefItem = {
  stack: number;
  category: number;
  enabled: boolean;
};

type PrefsPayload = {
  globallyEnabled: boolean;
  preferences: PrefItem[];
};

type NotificationVpnRowDef = {
  gridId: number;
  stack: StackLabel;
  stackValue: number;
  category: CategoryLabel;
  categoryValue: number;
  description: string;
};

const ROWS: NotificationVpnRowDef[] = [
  {
    gridId: 1,
    stack: "OpenVPN",
    stackValue: StackOpenVpn,
    category: "Read",
    categoryValue: CatRead,
    description: "List or fetch profiles (by server, external id, token, etc.).",
  },
  {
    gridId: 2,
    stack: "OpenVPN",
    stackValue: StackOpenVpn,
    category: "Mutate",
    categoryValue: CatMutate,
    description: "Issue, revoke, or token-related changes.",
  },
  {
    gridId: 3,
    stack: "OpenVPN",
    stackValue: StackOpenVpn,
    category: "Download",
    categoryValue: CatDownload,
    description: "When a profile file is downloaded via the API.",
  },
  {
    gridId: 4,
    stack: "Xray",
    stackValue: StackXray,
    category: "Read",
    categoryValue: CatRead,
    description: "List or fetch client links (by server, external id, token, etc.).",
  },
  {
    gridId: 5,
    stack: "Xray",
    stackValue: StackXray,
    category: "Mutate",
    categoryValue: CatMutate,
    description: "Issue, revoke, or token-related changes.",
  },
  {
    gridId: 6,
    stack: "Xray",
    stackValue: StackXray,
    category: "Download",
    categoryValue: CatDownload,
    description: "When a client link payload is downloaded via the API.",
  },
];

const PREFS_QUERY_KEY = ["vpn-profile-notification-preferences"] as const;

function unwrapData<T>(wrapper: unknown): T {
  if (wrapper && typeof wrapper === "object" && "data" in wrapper) {
    return (wrapper as { data: T }).data;
  }
  return wrapper as T;
}

export default function NotificationVpnProfileSettings() {
  const [gridPage, setGridPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(
    "notification-vpn-profile-settings",
    10,
    "5,10,20",
  );
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);
  const queryClient = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: PREFS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const res = await apiRequest<PrefsPayload>("get", "/api/vpn-profile-notification-preferences", { signal });
      return unwrapData<PrefsPayload>(res);
    },
    staleTime: 30_000,
  });

  const putMutation = useMutation({
    mutationFn: async (body: { globallyEnabled?: boolean; preferences?: PrefItem[] }) => {
      const res = await apiRequest<PrefsPayload>("put", "/api/vpn-profile-notification-preferences", {
        data: body,
      });
      return unwrapData<PrefsPayload>(res);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PREFS_QUERY_KEY });
    },
  });

  const setAllMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest<PrefsPayload>("post", "/api/vpn-profile-notification-preferences/set-all-categories", {
        data: { enabled },
      });
      return unwrapData<PrefsPayload>(res);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PREFS_QUERY_KEY });
    },
  });

  const payload = prefsQuery.data;
  const rowKey = (stack: number, cat: number) => `${stack}-${cat}`;

  const enabledByRow = useMemo(() => {
    const m: Record<string, boolean> = {};
    if (!payload?.preferences) return m;
    for (const p of payload.preferences) {
      m[rowKey(p.stack, p.category)] = p.enabled;
    }
    return m;
  }, [payload]);

  const handleToggleGlobal = async (next: boolean) => {
    setGlobalBusy(true);
    try {
      await putMutation.mutateAsync({ globallyEnabled: next });
      toast.success(next ? "All VPN profile notifications enabled" : "All VPN profile notifications disabled");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Failed to save");
    } finally {
      setGlobalBusy(false);
    }
  };

  const handleToggleRow = useCallback(
    async (row: NotificationVpnRowDef, next: boolean) => {
      const key = rowKey(row.stackValue, row.categoryValue);
      setSavingRowKey(key);
      try {
        await putMutation.mutateAsync({
          preferences: [
            {
              stack: row.stackValue,
              category: row.categoryValue,
              enabled: next,
            },
          ],
        });
        toast.success(`${row.stack} — ${row.category}: saved`);
      } catch (e: unknown) {
        toast.error(errorMessage(e) || "Failed to save");
      } finally {
        setSavingRowKey(null);
      }
    },
    [putMutation],
  );

  const handleEnableAllCategories = async (enabled: boolean) => {
    try {
      await setAllMutation.mutateAsync(enabled);
      toast.success(enabled ? "All categories enabled" : "All categories disabled");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Failed to save");
    }
  };

  const gridRows = useMemo(
    () =>
      ROWS.map((row) => ({
        ...row,
        enabled: enabledByRow[rowKey(row.stackValue, row.categoryValue)] ?? false,
      })),
    [enabledByRow],
  );

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "stack", headerName: "Stack", width: 110 },
      { field: "category", headerName: "Category", width: 100 },
      { field: "description", headerName: "Description", flex: 1, minWidth: 220 },
      {
        field: "enabled",
        headerName: "Notify",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row as NotificationVpnRowDef & { enabled: boolean };
          const key = rowKey(row.stackValue, row.categoryValue);
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
        Master switch turns off every admin notification for OpenVPN profiles and Xray client links. When it is on,
        you can enable or disable each stack and category separately, or use the bulk actions for all six categories.
      </p>

      <div className="settings-group" style={{ marginBottom: 16 }}>
        <h4>All VPN profile notifications</h4>
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
          onClick={() => void handleEnableAllCategories(true)}
        >
          Enable all categories
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={!globalOn || setAllMutation.isPending}
          onClick={() => void handleEnableAllCategories(false)}
        >
          Disable all categories
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
            getRowId={(r) => r.gridId}
            rows={gridRows}
            columns={columns}
            pageSizeOptions={[5, 10, 20]}
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
