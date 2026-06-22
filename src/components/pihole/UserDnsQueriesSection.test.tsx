import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: vi.fn(() => ({ roles: [] })),
  isAdmin: vi.fn(() => false),
}));

vi.mock("../../hooks/usePersistedPageSize", () => ({
  usePersistedPageSize: () => [25, vi.fn()],
}));

vi.mock("../../api/orval/vpn-dns-query/vpn-dns-query", () => ({
  getApiVpnDnsQueriesSearch: vi.fn(),
  getGetApiVpnDnsQueriesSearchQueryKey: vi.fn(() => ["dns-queries"]),
}));

vi.mock("../ui/TableStyle.tsx", () => ({ default: () => null }));
vi.mock("../ui/ThemeProvider.tsx", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../DateRangeFilter", () => ({ default: () => null }));
vi.mock("../../css/Table.css", () => ({}));

import { UserDnsQueriesSection } from "./UserDnsQueriesSection";

function renderSection(externalId = "ext-1") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UserDnsQueriesSection externalId={externalId} vpnServerId={1} />
    </QueryClientProvider>,
  );
}

describe("UserDnsQueriesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing for non-admin users", () => {
    const { container } = renderSection();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders placeholder for admin without externalId", async () => {
    const auth = await import("../../utils/auth/authSelectors");
    vi.mocked(auth.isAdmin).mockReturnValue(true);

    renderSection("");

    expect(screen.getByText(/No VPN identity/i)).toBeInTheDocument();
  });
});
