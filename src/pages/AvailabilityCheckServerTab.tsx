import { useEffect, useState } from "react";
import { FaGlobe, FaSave, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetApiAvailabilityCheckStatusQueryKey,
  useGetApiAvailabilityCheckStatus,
  usePostApiAvailabilityCheckCheck,
  usePutApiAvailabilityCheckSettings,
} from "../api/orval/availability-check/availability-check";
import type {
  AvailabilityCheckStatusResponse,
  UpdateAvailabilityCheckSettingsRequest,
} from "../api/orvalModelShim";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { ServerAccessDenied } from "../components/ServerAccessDenied";
import { errorMessage } from "../utils/errorMessage";
import { formatDateWithOffset } from "../utils/utils";
import "../css/Settings.css";
import "../css/ServerDetails.css";

const DEFAULT_TARGET = "https://xs1-hel.datagateapp.com:9443/";
const DEFAULT_PROBE = "https://status.rackot.ru/check.cgi";

function unwrapStatus(data: unknown): AvailabilityCheckStatusResponse | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as { data?: AvailabilityCheckStatusResponse } & AvailabilityCheckStatusResponse;
  if (obj.data && typeof obj.data === "object") return obj.data;
  if ("enabled" in obj || "targetUrl" in obj || "lastResult" in obj) return obj;
  return undefined;
}

export function AvailabilityCheckServerTab() {
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [targetUrl, setTargetUrl] = useState(DEFAULT_TARGET);
  const [probeUrl, setProbeUrl] = useState(DEFAULT_PROBE);

  const statusQuery = useGetApiAvailabilityCheckStatus({
    query: { enabled: admin, staleTime: 15_000, refetchInterval: 60_000 },
  });

  const status = unwrapStatus(statusQuery.data);

  useEffect(() => {
    if (!status) return;
    setEnabled(Boolean(status.enabled));
    setTargetUrl(status.targetUrl?.trim() || DEFAULT_TARGET);
    setProbeUrl(status.probeUrl?.trim() || DEFAULT_PROBE);
  }, [status?.enabled, status?.targetUrl, status?.probeUrl]);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: getGetApiAvailabilityCheckStatusQueryKey() });

  const saveMutation = usePutApiAvailabilityCheckSettings({
    mutation: {
      onSuccess: () => {
        toast.success("Availability check settings saved.");
        invalidate();
      },
      onError: (err) => toast.error(errorMessage(err)),
    },
  });

  const checkMutation = usePostApiAvailabilityCheckCheck({
    mutation: {
      onSuccess: () => {
        toast.success("Probe completed.");
        invalidate();
      },
      onError: (err) => toast.error(errorMessage(err)),
    },
  });

  if (!admin) return <ServerAccessDenied />;

  const result = status?.lastResult;
  const reachable = result?.reachable === true && !status?.lastError;
  const busy = saveMutation.isPending || checkMutation.isPending;

  const save = () => {
    const body: UpdateAvailabilityCheckSettingsRequest = {
      enabled,
      targetUrl: targetUrl.trim() || DEFAULT_TARGET,
      probeUrl: probeUrl.trim() || DEFAULT_PROBE,
    };
    saveMutation.mutate({ data: body });
  };

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaGlobe className="icon" aria-hidden />
        <span>Check available service</span>
      </h2>
      <div className="settings-divider" />

      <p className="settings-item-description">
        Periodically probes a target URL through a compatible availability endpoint (default{" "}
        <a href="https://status.rackot.ru/" target="_blank" rel="noreferrer">
          status.rackot.ru
        </a>
        ). The probe must accept <code>?target=</code> and return the shared JSON contract. Background
        checks run every 5 minutes when enabled.
      </p>

      <div className="settings-group">
        <h4>Settings</h4>
        <div className="settings-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={busy}
            />
            <span className="checkbox-title">Enable availability checks</span>
          </label>
        </div>
        <div className="settings-item">
          <label htmlFor="availability-check-probe-url">Probe URL</label>
          <input
            id="availability-check-probe-url"
            className="input"
            type="url"
            value={probeUrl}
            onChange={(e) => setProbeUrl(e.target.value)}
            disabled={busy}
            placeholder={DEFAULT_PROBE}
          />
        </div>
        <p className="settings-item-description">
          External checker endpoint (must return the availability probe JSON). Default: {DEFAULT_PROBE}
        </p>
        <div className="settings-item">
          <label htmlFor="availability-check-target-url">Target URL</label>
          <input
            id="availability-check-target-url"
            className="input"
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            disabled={busy}
            placeholder={DEFAULT_TARGET}
          />
        </div>
        <p className="settings-item-description">URL passed to the probe as <code>target</code>. Default: {DEFAULT_TARGET}</p>
        <div className="settings-item" style={{ gap: 8 }}>
          <button type="button" className="btn primary" disabled={busy} onClick={save}>
            <FaSave className="icon" aria-hidden /> Save
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => checkMutation.mutate()}
          >
            <FaSync className={`icon${checkMutation.isPending ? " spin" : ""}`} aria-hidden /> Check
            now
          </button>
        </div>
      </div>

      <h3 className="settings-card__h3-with-icon" style={{ marginTop: 24 }}>
        <FaGlobe className="icon" aria-hidden />
        <span>Last probe</span>
      </h3>
      <div className="settings-divider" />

      {statusQuery.isLoading ? (
        <p className="settings-item-description">Loading…</p>
      ) : statusQuery.isError ? (
        <p className="settings-item-description">{errorMessage(statusQuery.error)}</p>
      ) : (
        <div className="settings-group">
          <div className="settings-item">
            <span>Status</span>
            <strong className={reachable ? "pihole-step-value--ok" : "pihole-step-value--error"}>
              {status?.lastError
                ? "probe error"
                : result
                  ? reachable
                    ? "reachable"
                    : result.summary || "unreachable"
                  : "no data yet"}
            </strong>
          </div>
          <div className="settings-item">
            <span>Checked at</span>
            <span>
              {status?.lastCheckedAtUtc
                ? formatDateWithOffset(new Date(status.lastCheckedAtUtc))
                : "—"}
              {status?.lastDurationMs != null ? ` (${status.lastDurationMs} ms)` : ""}
            </span>
          </div>
          <div className="settings-item">
            <span>Probe from</span>
            <span>{result?.probeFrom ?? "—"}</span>
          </div>
          {status?.lastError ? (
            <div className="settings-item">
              <span>Error</span>
              <span className="pihole-step-value--error">{status.lastError}</span>
            </div>
          ) : null}

          {result?.dns ? (
            <div className="settings-item">
              <span>DNS</span>
              <span>
                {result.dns.ok ? "ok" : "fail"}
                {result.dns.addresses?.length ? `: ${result.dns.addresses.join(", ")}` : ""}
                {result.dns.latencyMs != null ? ` (${result.dns.latencyMs} ms)` : ""}
                {result.dns.error ? ` — ${result.dns.error}` : ""}
              </span>
            </div>
          ) : null}

          {result?.ports?.length ? (
            <div className="settings-item">
              <span>Ports</span>
              <span>
                {result.ports
                  .map(
                    (p) =>
                      `${p.port}: ${p.ok ? "ok" : "fail"}${
                        p.latencyMs != null ? ` (${p.latencyMs} ms)` : ""
                      }${p.error ? ` — ${p.error}` : ""}`,
                  )
                  .join("; ")}
              </span>
            </div>
          ) : null}

          {result?.http ? (
            <div className="settings-item">
              <span>HTTP</span>
              <span>
                {result.http.ok ? "ok" : "fail"}
                {result.http.statusCode != null ? ` ${result.http.statusCode}` : ""}
                {result.http.latencyMs != null ? ` (${result.http.latencyMs} ms)` : ""}
                {result.http.responseSummary
                  ? ` — ${result.http.responseSummary}`
                  : result.http.error
                    ? ` — ${result.http.error}`
                    : ""}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default AvailabilityCheckServerTab;
