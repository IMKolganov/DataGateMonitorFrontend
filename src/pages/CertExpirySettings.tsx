import { useEffect, useMemo, useState } from "react";
import { FaCertificate, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import CertExpiryCheckPanel from "../components/certExpiry/CertExpiryCheckPanel.tsx";
import { useGetApiSettingsGet, usePostApiSettingsSet } from "../api/orval/settings/settings";
import type { PostApiSettingsSetParams, SettingResponse } from "../api/orvalModelShim";
import { getApiV3OpenVpnServersGetAllWithStatus } from "../api/orval/vpn-servers-v3/vpn-servers-v3";
import { useQuery } from "@tanstack/react-query";
import type { VpnServerWithStatusesV3Response } from "../api/orvalModelShim";
import { errorMessage } from "../utils/errorMessage";
import "../css/Settings.css";

const WARNING_DAYS_KEY = "OvpnCertExpiry_Warning_Days";

export default function CertExpirySettings() {
  const [warningDaysInput, setWarningDaysInput] = useState("30");
  const [selectedServerId, setSelectedServerId] = useState<string>("");

  const warningDaysQuery = useGetApiSettingsGet<SettingResponse>({ Key: WARNING_DAYS_KEY });
  const setSetting = usePostApiSettingsSet();

  const serversQuery = useQuery({
    queryKey: ["vpn-servers-openvpn-eligible"],
    queryFn: () => getApiV3OpenVpnServersGetAllWithStatus(),
    staleTime: 30_000,
  });

  const eligibleServers = useMemo(() => {
    const payload = serversQuery.data as VpnServerWithStatusesV3Response | undefined;
    const list = payload?.vpnServerWithStatuses ?? [];
    return list
      .map((row) => row.vpnServerResponses?.vpnServer ?? row.openVpnServerResponses?.vpnServer)
      .filter(
        (s): s is NonNullable<typeof s> =>
          Boolean(
            s &&
              s.serverType === 0 &&
              !s.isDisabled &&
              !s.isDeleted &&
              Boolean(s.apiUrl?.trim()),
          ),
      );
  }, [serversQuery.data]);

  const appliedWarningDays = warningDaysQuery.data?.value;

  useEffect(() => {
    if (appliedWarningDays != null) setWarningDaysInput(String(appliedWarningDays));
  }, [appliedWarningDays]);

  const saveWarningDays = async () => {
    const n = Math.max(1, Math.floor(Number(warningDaysInput)));
    if (!Number.isFinite(n)) {
      toast.error("Warning days must be a positive integer.");
      return;
    }
    try {
      await setSetting.mutateAsync({
        params: {
          Key: WARNING_DAYS_KEY,
          Value: String(n),
          Type: "int",
        } as PostApiSettingsSetParams,
      });
      toast.success("Warning window updated.");
      warningDaysQuery.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const perServerId = selectedServerId ? Number(selectedServerId) : undefined;
  const perServerName = eligibleServers.find((s) => s?.id === perServerId)?.serverName;

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaCertificate className="icon" aria-hidden />
        <span>OVPN certificate expiry</span>
      </h2>
      <div className="settings-divider" />

      <div className="settings-group">
        <h4>Warning window (days before expiry)</h4>
        <div className="settings-item">
          <input
            id="ovpn-cert-expiry-warning-days"
            type="number"
            min={1}
            className="input"
            value={warningDaysInput}
            onChange={(e) => setWarningDaysInput(e.target.value)}
          />
          <button type="button" className="btn primary" onClick={() => void saveWarningDays()} disabled={setSetting.isPending}>
            <FaSave className="icon" aria-hidden /> Save
          </button>
        </div>
        <p className="settings-item-description">
          Profiles whose PKI certificate expires within this window trigger expiring-soon alerts during scheduled hourly
          checks.
        </p>
      </div>

      <h3 className="settings-card__h3-with-icon" style={{ marginTop: 8 }}>
        <FaCertificate className="icon" aria-hidden />
        <span>Manual check — all servers</span>
      </h3>
      <div className="settings-divider" />
      <CertExpiryCheckPanel showHistory historyLimit={30} />

      <h3 className="settings-card__h3-with-icon" style={{ marginTop: 32 }}>
        <FaCertificate className="icon" aria-hidden />
        <span>Manual check — one server</span>
      </h3>
      <div className="settings-divider" />

      <div className="settings-item" style={{ marginBottom: 12 }}>
        <label htmlFor="cert-expiry-server-select">OpenVPN server</label>
        <select
          id="cert-expiry-server-select"
          className="input"
          value={selectedServerId}
          onChange={(e) => setSelectedServerId(e.target.value)}
        >
          <option value="">Select server…</option>
          {eligibleServers.map((s) =>
            s?.id != null ? (
              <option key={s.id} value={String(s.id)}>
                {s.serverName} (#{s.id})
              </option>
            ) : null,
          )}
        </select>
      </div>

      {perServerId ? (
        <CertExpiryCheckPanel vpnServerId={perServerId} serverName={perServerName ?? undefined} showHistory={false} />
      ) : (
        <p className="settings-item-description">Choose a server to run a targeted check and see results below.</p>
      )}
    </div>
  );
}
