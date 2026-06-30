import { useMemo } from "react";
import {
  BsArrowRepeat,
  BsCheck2Circle,
  BsCloudUpload,
  BsDatabase,
  BsGlobe,
  BsToggleOn,
} from "react-icons/bs";
import { FaSync } from "react-icons/fa";
import type { PiHoleDiagnosticsResponse, VpnServerPiHoleConfigDto } from "../../api/orvalModelShim";
import {
  buildPiHolePipelineSteps,
  firstPiHolePipelineIssue,
  formatPiHoleStepValue,
  piHolePipelineOverallLabel,
  type PiHolePipelineStep,
  type PiHolePipelineStepStatus,
} from "../../utils/pihole/buildPiHolePipelineSteps";
import "../../css/ServerDetails.css";
import "../../css/Settings.css";

type PiHoleStatusPanelProps = {
  dashboardConfig?: VpnServerPiHoleConfigDto | null;
  serverPiHoleEnabled: boolean;
  serverApiUrl?: string | null;
  diagnostics?: PiHoleDiagnosticsResponse | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

const STEP_ICONS: Record<string, typeof BsDatabase> = {
  "dashboard-config": BsDatabase,
  "integration-flag": BsToggleOn,
  "runtime-push": BsCloudUpload,
  "pihole-api": BsGlobe,
  collector: BsArrowRepeat,
  storage: BsDatabase,
};

function valueStatusClass(status: PiHolePipelineStepStatus): string {
  switch (status) {
    case "error":
      return "pihole-step-value pihole-step-value--error";
    case "warning":
      return "pihole-step-value pihole-step-value--warning";
    case "pending":
      return "pihole-step-value pihole-step-value--pending";
    default:
      return "pihole-step-value";
  }
}

function PipelineDetailRow({ step }: { step: PiHolePipelineStep }) {
  const Icon = STEP_ICONS[step.id] ?? BsCheck2Circle;
  const value = formatPiHoleStepValue(step);

  return (
    <div className="detail-row">
      <Icon className="detail-icon" aria-hidden />
      <div className="detail-row-main">
        <span className="detail-label">
          {step.step}. {step.title}:
        </span>
        <span className={valueStatusClass(step.status)}>{value}</span>
      </div>
    </div>
  );
}

function PipelineSkeletonRow() {
  return (
    <div className="detail-row">
      <span className="detail-icon skeleton" style={{ width: 16, height: 16 }} aria-hidden />
      <div className="detail-row-main">
        <span className="skeleton" style={{ width: "72%", height: 14 }} aria-label="loading" />
      </div>
    </div>
  );
}

export function PiHoleStatusPanel({
  dashboardConfig,
  serverPiHoleEnabled,
  serverApiUrl,
  diagnostics,
  loading,
  error,
  onRefresh,
  refreshing,
}: PiHoleStatusPanelProps) {
  const steps = useMemo(
    () =>
      buildPiHolePipelineSteps({
        dashboardConfig,
        serverPiHoleEnabled,
        serverApiUrl,
        diagnostics,
        diagnosticsFetchError: error,
        diagnosticsLoading: loading,
      }),
    [dashboardConfig, serverPiHoleEnabled, serverApiUrl, diagnostics, error, loading],
  );

  const blocker = useMemo(() => firstPiHolePipelineIssue(steps), [steps]);
  const overall = useMemo(() => piHolePipelineOverallLabel(steps), [steps]);
  const showTroubleshooting = steps.some((s) => s.status === "error" || s.status === "warning" || s.fix);

  if (loading && !diagnostics) {
    return (
      <section className="settings-card settings-card--mb">
        <div className="server-info is-loading">
          <div className="server-header">
            <div className="server-meta">
              <strong className="server-name">Pi-hole integration</strong>
            </div>
          </div>
          <div className="server-details">
            {Array.from({ length: 6 }, (_, i) => (
              <PipelineSkeletonRow key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-card settings-card--mb">
      {onRefresh && (
        <div className="header-bar">
          <div className="left-buttons">
            <button
              type="button"
              className="btn secondary"
              onClick={onRefresh}
              disabled={refreshing || loading}
            >
              <FaSync className={`icon ${refreshing || loading ? "icon-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      )}

      <div className="server-info">
        <div className="server-header">
          <div className="server-meta">
            <strong className="server-name">Pi-hole integration</strong>
          </div>
          <div className={`server-status ${overall.healthy ? "status-online" : "status-offline"}`}>
            {overall.healthy ? "✅ " : "⚠️ "}
            {overall.text}
          </div>
        </div>

        {blocker && (blocker.status === "error" || blocker.status === "pending") && (
          <div className="server-details__alert" role="alert">
            <strong>
              Step {blocker.step}: {blocker.title}
            </strong>
            {blocker.error && <span> — {blocker.error}</span>}
            {!blocker.error && blocker.fix && <span> — {blocker.fix}</span>}
          </div>
        )}

        <div className="server-details">
          {steps.map((step) => (
            <PipelineDetailRow key={step.id} step={step} />
          ))}
        </div>

        {showTroubleshooting && (
          <details className="pihole-pipeline-details">
            <summary>Troubleshooting</summary>
            <ol className="pihole-pipeline-details__list">
              {steps.map((step) => (
                <li key={step.id}>
                  <strong>
                    {step.step}. {step.title}
                  </strong>
                  <span className="pihole-pipeline-details__flow">{step.flow}</span>
                  {step.fix && <p className="pihole-pipeline-details__fix">{step.fix}</p>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </section>
  );
}

export default PiHoleStatusPanel;
