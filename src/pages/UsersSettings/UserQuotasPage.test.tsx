import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("../../components/ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span data-testid="avatar" /> }));
vi.mock("../../components/quota/UserTrafficQuotaProgress", () => ({
  UserTrafficQuotaProgress: ({ userId }: { userId: number }) => (
    <div data-testid={`quota-${userId}`}>quota</div>
  ),
}));
vi.mock("../../hooks/useTelegramProfilePhotoIndex.ts", () => ({
  useTelegramProfilePhotoIndex: () => ({ index: undefined }),
}));
vi.mock("../../api/telegramProfilePhotoIndex.ts", () => ({
  telegramPhotoTelegramIdIfCached: () => undefined,
}));

vi.mock("./useUsers", () => ({
  useUsers: () => ({
    users: [
      {
        id: 5,
        displayName: "Quota User",
        email: "q@example.com",
        provider: "local",
        externalId: "ext-5",
      },
    ],
    totalCount: 1,
    paginationModel: { page: 0, pageSize: 10 },
    onPaginationModelChange: vi.fn(),
    pageSizeOptions: [10, 20],
    anyLoading: false,
    refreshing: false,
    errorMessage: null,
    handleRefresh: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueries: () => [{ data: { totals: { trafficTotalBytes: 100 } }, isPending: false }],
  };
});

import UserQuotasPage from "./UserQuotasPage";

describe("UserQuotasPage", () => {
  it("renders quotas heading, pager, and user row", () => {
    renderWithProviders(<UserQuotasPage />);

    expect(screen.getByRole("heading", { name: /User quotas/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Users table/i })).toHaveAttribute("href", "/settings/users");
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByText(/Per page/i)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 \/ 1/i)).toBeInTheDocument();
    expect(screen.getByText("Quota User")).toBeInTheDocument();
    expect(screen.getByTestId("quota-5")).toBeInTheDocument();
  });
});
