import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { UserTrafficQuotaProgress } from "./UserTrafficQuotaProgress";

vi.mock("../../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  useGetApiOpenVpnClientsOverviewSummary: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
  }),
}));

vi.mock("../../api/orval/user-quota-plan/user-quota-plan", () => ({
  useGetApiUserQuotaPlansGetByUserIdUserId: () => ({
    data: { items: [] },
    isLoading: false,
  }),
}));

vi.mock("../../api/orval/quota-plan/quota-plan", () => ({
  postApiQuotaPlansGetAll: vi.fn(),
}));

describe("UserTrafficQuotaProgress", () => {
  it("asks for external ID when missing", () => {
    renderWithProviders(
      <UserTrafficQuotaProgress
        userId={3}
        externalId={null}
        quotaPlans={[]}
        userQuotaAssignments={[]}
      />,
    );
    expect(screen.getByText(/external ID/i)).toBeInTheDocument();
  });

  it("renders traffic quota title when assignment+plan exist", () => {
    renderWithProviders(
      <UserTrafficQuotaProgress
        userId={3}
        externalId="ext-3"
        quotaPlans={[
          {
            id: 9,
            name: "Gold",
            monthlyQuotaBytes: 1024 * 1024 * 100,
            isActive: true,
            isDefault: false,
          },
        ]}
        userQuotaAssignments={[
          {
            id: 1,
            userId: 3,
            quotaPlanId: 9,
            effectiveFrom: "2020-01-01T00:00:00Z",
            effectiveTo: null,
          },
        ]}
      />,
    );
    expect(screen.getByText("Traffic quota")).toBeInTheDocument();
  });
});
