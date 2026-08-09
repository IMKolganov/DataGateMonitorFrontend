import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));

import EventsTable from "./EventsTable";

describe("EventsTable pagination", () => {
  it("renders server rows and notifies parent on page/pageSize change", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <EventsTable
        events={[
          {
            id: 11,
            vpnServerId: 1,
            eventType: "CONNECT",
            commonName: "alice",
            realAddress: "1.1.1.1",
            virtualAddress: "10.0.0.2",
            connectedSince: "2024-01-01T00:00:00Z",
            message: null,
            createDate: "2024-01-01T00:00:00Z",
            lastUpdate: "2024-01-01T00:00:00Z",
          },
        ]}
        totalEvents={25}
        page={0}
        pageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        loading={false}
      />,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "25");
    expect(screen.getByTestId("row-11")).toHaveTextContent("alice");

    await user.click(screen.getByTestId("next-page"));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(10);

    await user.click(screen.getByTestId("set-page-size-20"));
    expect(onPageChange).toHaveBeenCalledWith(0);
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
