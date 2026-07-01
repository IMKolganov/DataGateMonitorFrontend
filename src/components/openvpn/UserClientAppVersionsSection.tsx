import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaMobileAlt, FaSync } from "react-icons/fa";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import { useGetApiOpenVpnEventsAppVersions } from "../../api/orval/vpn-server-event/vpn-server-event";
import type { VpnClientAppVersionSummaryItemDto } from "../../api/orvalModelShim";
import { unwrapMaybeApiResponse } from "../../pages/TelegramBotSettings/unwrapApiResponse";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { formatDateWithOffset } from "../../utils/utils";
import { parseIvGuiVer } from "../../utils/openVpn/parseIvGuiVer";
import "../../css/Settings.css";
import "../../css/Table.css";

export type UserClientAppVersionsSectionProps = {
  externalId: string | null | undefined;
  vpnServerId: number;
  selectedCn?: string | null;
};

type AppVersionRow = {
  id: string;
  clientLabel: string;
  appVersion: string;
  ivGuiVer: string;
  lastConnectedAtUtc: string;
  connectionCount: number;
};

export function UserClientAppVersionsSection({
  externalId,
  vpnServerId,
  selectedCn,
}: UserClientAppVersionsSectionProps) {
  const admin = isAdmin(getCurrentUser());
  const ext = typeof externalId === "string" ? externalId.trim() : "";
  const cn = selectedCn?.trim() ?? "";
  const enabled = admin && ext.length > 0 && vpnServerId > 0;

  const params = useMemo(
    () => ({
      VpnServerId: vpnServerId,
      ExternalId: cn ? undefined : ext,
      CommonName: cn || undefined,
    }),
    [vpnServerId, ext, cn],
  );

  const query = useGetApiOpenVpnEventsAppVersions(params, { query: { enabled } });

  const rows = useMemo<AppVersionRow[]>(() => {
    const unwrapped = unwrapMaybeApiResponse<VpnClientAppVersionSummaryItemDto[]>(query.data as never);
    const items = Array.isArray(unwrapped) ? unwrapped : [];
    return items.map((item) => {
      const parsed = parseIvGuiVer(item.ivGuiVer);
      const last = item.lastConnectedAtUtc ? formatDateWithOffset(new Date(item.lastConnectedAtUtc)) : "";
      return {
        id: item.ivGuiVer ?? parsed.raw,
        clientLabel: parsed.clientLabel,
        appVersion: parsed.appVersion,
        ivGuiVer: parsed.raw,
        lastConnectedAtUtc: last,
        connectionCount: item.connectionCount ?? 0,
      };
    });
  }, [query.data]);

  const columns = useMemo<GridColDef<AppVersionRow>[]>(
    () => [
      { field: "clientLabel", headerName: "Client", flex: 1, minWidth: 180 },
      { field: "appVersion", headerName: "Version", flex: 0.7, minWidth: 100 },
      { field: "lastConnectedAtUtc", headerName: "Last connected", flex: 1, minWidth: 170 },
      { field: "connectionCount", headerName: "Connects", width: 100, type: "number" },
      { field: "ivGuiVer", headerName: "IV_GUI_VER", flex: 1.2, minWidth: 220 },
    ],
    [],
  );

  if (!enabled) {
    return null;
  }

  return (
    <section className="settings-card settings-card--mb">
      <div className="settings-card__header">
        <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 0 }}>
          <FaMobileAlt className="icon" aria-hidden />
          Client app versions
        </h3>
        <button
          type="button"
          className="btn secondary"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <FaSync className={`icon ${query.isFetching ? "icon-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="server-details__intro" style={{ marginTop: 0, marginBottom: 12 }}>
        Distinct VPN client versions from connect events (OpenVPN IV_GUI_VER).
      </p>

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
        >
          <Grid
            gridId="user-client-app-versions"
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            loading={query.isLoading || query.isFetching}
            disableRowSelectionOnClick
            hideFooter
            autoHeight
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{
              noRowsLabel: "No client app versions recorded for this user on this server",
            }}
          />
        </div>
      </CustomThemeProvider>
    </section>
  );
}
