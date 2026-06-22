import type { PiHoleDiagnosticsResponse } from "../../api/orvalModelShim";
import { formatDateWithOffset } from "../../utils/utils";

type PiHoleStatusPanelProps = {
  diagnostics: PiHoleDiagnosticsResponse | null | undefined;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

function fmtUtc(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : formatDateWithOffset(d);
}

function healthClass(health?: string | null): string {
  switch ((health ?? "").toLowerCase()) {
    case "ok":
      return "pihole-status__health pihole-status__health--ok";
    case "warning":
      return "pihole-status__health pihole-status__health--warning";
    case "error":
      return "pihole-status__health pihole-status__health--error";
    case "disabled":
      return "pihole-status__health pihole-status__health--disabled";
    default:
      return "pihole-status__health";
  }
}

export function PiHoleStatusPanel({
  diagnostics,
  loading,
  error,
  onRefresh,
  refreshing,
}: PiHoleStatusPanelProps) {
  if (loading && !diagnostics) {
    return (
      <section className="settings-section pihole-status">
        <h3>Pi-hole status</h3>
        <p className="muted">Loading diagnostics…</p>
      </section>
    );
  }

  if (error && !diagnostics) {
    return (
      <section className="settings-section pihole-status">
        <div className="settings-section__header">
          <h3>Pi-hole status</h3>
          {onRefresh && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={refreshing}>
              Retry
            </button>
          )}
        </div>
        <p className="pihole-status__error">{error}</p>
      </section>
    );
  }

  if (!diagnostics) return null;

  const d = diagnostics;
  const probeError = d.error?.trim();
  const pollError = d.lastPollError?.trim();

  return (
    <section className="settings-section pihole-status">
      <div className="settings-section__header">
        <h3>Pi-hole status</h3>
        {onRefresh && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh status"}
          </button>
        )}
      </div>

      <div className="pihole-status__summary">
        <span className={healthClass(d.health)}>{d.health ?? "Unknown"}</span>
        {d.healthMessage && <p className="pihole-status__message">{d.healthMessage}</p>}
      </div>

      {(probeError || pollError) && (
        <div className="pihole-status__alerts">
          {probeError && (
            <p className="pihole-status__alert pihole-status__alert--error">
              <strong>Probe error:</strong> {probeError}
            </p>
          )}
          {pollError && (
            <p className="pihole-status__alert pihole-status__alert--error">
              <strong>Last poll error:</strong> {pollError}
            </p>
          )}
        </div>
      )}

      <dl className="pihole-status__grid">
        <div><dt>Checked at</dt><dd>{fmtUtc(d.checkedAtUtc)}</dd></div>
        <div><dt>Base URL</dt><dd><code>{d.baseUrl || "—"}</code></dd></div>
        <div><dt>Authenticated</dt><dd>{d.authenticated ? "Yes" : "No"}</dd></div>
        <div><dt>App password</dt><dd>{d.hasAppPassword ? "Set" : "Not set"}</dd></div>
        <div><dt>Collector</dt><dd>{d.collectorRunning ? "Running" : "Stopped"}</dd></div>
        <div><dt>Runtime applied</dt><dd>{fmtUtc(d.runtimeConfigAppliedAtUtc)}</dd></div>
        <div><dt>Last poll</dt><dd>{fmtUtc(d.lastPollAtUtc)}</dd></div>
        <div><dt>Last successful poll</dt><dd>{fmtUtc(d.lastSuccessfulPollAtUtc)}</dd></div>
        <div><dt>Poll interval</dt><dd>{d.pollIntervalSeconds ?? "—"}s</dd></div>
        <div><dt>Batch / lookback</dt><dd>{d.batchSize ?? "—"} / {d.lookbackSeconds ?? "—"}s</dd></div>
        <div><dt>Subnet prefix</dt><dd><code>{d.clientSubnetPrefix || "(all)"}</code></dd></div>
        <div><dt>Probe samples</dt><dd>{d.sampleQueryCount ?? 0}</dd></div>
        <div><dt>Last poll fetched</dt><dd>{d.lastPollQueriesFetched ?? 0}</dd></div>
        <div><dt>After filter / enriched</dt><dd>{d.lastPollQueriesAfterFilter ?? 0} / {d.lastPollQueriesEnriched ?? 0}</dd></div>
        <div><dt>Last poll forwarded</dt><dd>{d.lastPollQueriesForwarded ?? 0}</dd></div>
        <div><dt>Cursor until</dt><dd>{fmtUtc(d.lastCursorUntilUtc)}</dd></div>
        <div><dt>Stored in DB</dt><dd>{d.storedQueryCount ?? 0}</dd></div>
        <div><dt>Last stored query</dt><dd>{fmtUtc(d.lastStoredQueryAtUtc)}</dd></div>
      </dl>
    </section>
  );
}

export default PiHoleStatusPanel;
