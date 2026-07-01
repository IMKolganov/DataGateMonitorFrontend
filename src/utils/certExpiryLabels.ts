import {
  EnumsCertExpiryProfileOutcome,
  EnumsCertExpiryRunStatus,
} from "../api/orval/model";
import type { CertExpiryCheckRunResponse } from "../api/orvalModelShim";

export function certExpiryRunStatusLabel(status: EnumsCertExpiryRunStatus | number | undefined): string {
  switch (status) {
    case EnumsCertExpiryRunStatus.NUMBER_0:
      return "Running";
    case EnumsCertExpiryRunStatus.NUMBER_1:
      return "Completed";
    case EnumsCertExpiryRunStatus.NUMBER_3:
      return "Skipped (busy)";
    case EnumsCertExpiryRunStatus.NUMBER_2:
      return "Failed";
    default:
      return "Failed";
  }
}

export function certExpiryProfileOutcomeLabel(
  outcome: EnumsCertExpiryProfileOutcome | number | undefined,
): string {
  switch (outcome) {
    case EnumsCertExpiryProfileOutcome.NUMBER_0:
      return "Healthy";
    case EnumsCertExpiryProfileOutcome.NUMBER_1:
      return "Expiring soon";
    case EnumsCertExpiryProfileOutcome.NUMBER_2:
      return "Expired";
    case EnumsCertExpiryProfileOutcome.NUMBER_3:
      return "Missing on node";
    default:
      return String(outcome ?? "—");
  }
}

export function certExpiryProfileHasIssue(
  outcome: EnumsCertExpiryProfileOutcome | number | undefined,
): boolean {
  return outcome != null && outcome !== EnumsCertExpiryProfileOutcome.NUMBER_0;
}

export function certExpiryRunHasIssues(
  run: Partial<Pick<CertExpiryCheckRunResponse, "status" | "summary" | "errorMessage">>,
): boolean {
  if (
    run.status === EnumsCertExpiryRunStatus.NUMBER_2 ||
    run.status === EnumsCertExpiryRunStatus.NUMBER_3
  ) {
    return true;
  }
  const s = run.summary;
  return Boolean(
    run.errorMessage ||
      (s && ((s.expired ?? 0) > 0 || (s.expiringSoon ?? 0) > 0 || (s.missingOnNode ?? 0) > 0 || (s.serverFailures ?? 0) > 0)),
  );
}
