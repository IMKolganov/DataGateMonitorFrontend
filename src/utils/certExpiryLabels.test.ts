import { describe, expect, it } from "vitest";
import {
  certExpiryProfileHasIssue,
  certExpiryProfileOutcomeLabel,
  certExpiryRunHasIssues,
  certExpiryRunStatusLabel,
} from "./certExpiryLabels";

describe("certExpiryLabels", () => {
  it("maps run status labels", () => {
    expect(certExpiryRunStatusLabel(0)).toBe("Running");
    expect(certExpiryRunStatusLabel(1)).toBe("Completed");
    expect(certExpiryRunStatusLabel(2)).toBe("Failed");
    expect(certExpiryRunStatusLabel(3)).toBe("Skipped (busy)");
  });

  it("maps profile outcomes and issue flags", () => {
    expect(certExpiryProfileOutcomeLabel(0)).toBe("Healthy");
    expect(certExpiryProfileOutcomeLabel(2)).toBe("Expired");
    expect(certExpiryProfileHasIssue(0)).toBe(false);
    expect(certExpiryProfileHasIssue(1)).toBe(true);
  });

  it("detects runs with issues from summary", () => {
    expect(certExpiryRunHasIssues({ status: 1, summary: { expired: 0, expiringSoon: 0 } })).toBe(false);
    expect(certExpiryRunHasIssues({ status: 1, summary: { expired: 2 } })).toBe(true);
    expect(certExpiryRunHasIssues({ status: 2 })).toBe(true);
  });
});
