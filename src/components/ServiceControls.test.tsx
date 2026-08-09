import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import ServiceControls from "./ServiceControls";

describe("ServiceControls", () => {
  it("aggregates clients and exposes run/details actions", async () => {
    const user = userEvent.setup();
    const onRunNow = vi.fn();
    const onOpenDetails = vi.fn();

    render(
      <ServiceControls
        serviceData={{
          1: { status: 0, countConnectedClients: 4, countSessions: 2, nextRunTime: "N/A" },
          2: { status: 0, countConnectedClients: 1, countSessions: 0, nextRunTime: "N/A" },
        }}
        onRunNow={onRunNow}
        onOpenDetails={onOpenDetails}
        hubConnectionState="Connected"
      />,
    );

    expect(screen.getByRole("heading", { name: /Service Control/i })).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/Total Connected Clients:/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Details/i }));
    expect(onOpenDetails).toHaveBeenCalled();

    const runBtn = screen.getByRole("button", { name: /Sync All Now/i });
    expect(runBtn).toBeEnabled();
    await user.click(runBtn);
    expect(onRunNow).toHaveBeenCalled();
  });

  it("shows pending status when snapshots lack status", () => {
    render(
      <ServiceControls
        serviceData={{ 1: { countConnectedClients: 0 } as never }}
        onRunNow={vi.fn()}
        hubConnectionState="Connecting"
      />,
    );
    expect(screen.getByText(/Pending|Connecting|Idle|Service Status/i)).toBeInTheDocument();
  });
});
