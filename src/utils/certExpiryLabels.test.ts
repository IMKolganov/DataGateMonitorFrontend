import { describe, expect, it } from "vitest";
import {
  certExpiryProfileHasIssue,
  certExpiryProfileOutcomeLabel,
  certExpiryRunStatusLabel,
} from "./certExpiryLabels";
import {
  EnumsCertExpiryProfileOutcome,
  EnumsCertExpiryRunStatus,
} from "../api/orval/model";

describe("certExpiryLabels", () => {
  it("maps run statuses", () => {
    expect(certExpiryRunStatusLabel(EnumsCertExpiryRunStatus.NUMBER_0)).toBe("Running");
    expect(certExpiryRunStatusLabel(EnumsCertExpiryRunStatus.NUMBER_1)).toBe("Completed");
    expect(certExpiryRunStatusLabel(EnumsCertExpiryRunStatus.NUMBER_2)).toBe("Failed");
    expect(certExpiryRunStatusLabel(EnumsCertExpiryRunStatus.NUMBER_3)).toBe("Skipped (busy)");
  });

  it("maps profile outcomes and issue flag", () => {
    expect(certExpiryProfileOutcomeLabel(EnumsCertExpiryProfileOutcome.NUMBER_0)).toBe("Healthy");
    expect(certExpiryProfileOutcomeLabel(EnumsCertExpiryProfileOutcome.NUMBER_1)).toBe(
      "Expiring soon",
    );
    expect(certExpiryProfileHasIssue(EnumsCertExpiryProfileOutcome.NUMBER_0)).toBe(false);
    expect(certExpiryProfileHasIssue(EnumsCertExpiryProfileOutcome.NUMBER_2)).toBe(true);
  });
});
