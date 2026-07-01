import { FaArrowLeft, FaCertificate } from "react-icons/fa";
import { Link, useLocation, useParams } from "react-router-dom";
import { useGetApiCertExpiryRunsRunId } from "../api/orval/cert-expiry/cert-expiry.ts";
import type { CertExpiryCheckRunResponse } from "../api/orvalModelShim";
import CertExpiryRunDetailView from "../components/certExpiry/CertExpiryRunDetailView.tsx";
import { errorMessage } from "../utils/errorMessage.ts";
import "../css/Settings.css";

function unwrapCertExpiryRun(raw: unknown): CertExpiryCheckRunResponse {
  return raw as CertExpiryCheckRunResponse;
}

export default function CertExpiryRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const location = useLocation();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? "/settings/cert-expiry";

  const runQuery = useGetApiCertExpiryRunsRunId(runId ?? "", {
    query: { enabled: Boolean(runId), retry: 1 },
  });

  const run = runQuery.data ? unwrapCertExpiryRun(runQuery.data) : null;

  return (
    <div>
      <div className="header-bar" style={{ marginBottom: 16 }}>
        <div className="left-buttons">
          <Link to={returnTo} className="btn secondary">
            <FaArrowLeft className="icon" aria-hidden /> Back to cert expiry
          </Link>
        </div>
      </div>

      <h2 className="settings-page__h2-with-icon">
        <FaCertificate className="icon" aria-hidden />
        <span>Certificate expiry check — {run?.scopeLabel ?? "…"}</span>
      </h2>
      <div className="settings-divider" />

      {runQuery.isLoading ? <p>Loading run details…</p> : null}

      {runQuery.isError ? (
        <p className="message-error">{errorMessage(runQuery.error)}</p>
      ) : null}

      {!runQuery.isLoading && !runQuery.isError && !run ? (
        <p className="message-error">Run not found. It may have expired from the in-memory log after a backend restart.</p>
      ) : null}

      {run ? <CertExpiryRunDetailView run={run} /> : null}
    </div>
  );
}
