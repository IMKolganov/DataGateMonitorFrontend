import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import ServerDetailsInfo from "./ServerDetailsInfo";

vi.mock("./VpnStackLogo", () => ({ VpnStackLogo: () => <span data-testid="stack-logo" /> }));

describe("ServerDetailsInfo", () => {
  it("renders online server details from nested vpnServerResponses", () => {
    render(
      <ServerDetailsInfo
        toHumanReadableSize={(n) => `${n} B`}
        configIp="10.0.0.1"
        configPort={1194}
        quotaPlanLabels={["Free", "Gold"]}
        serverInfo={{
          countConnectedClients: 2,
          countSessions: 1,
          vpnServerResponses: {
            vpnServer: {
              id: 5,
              serverName: "Detail-5",
              isOnline: true,
              serverType: 0,
              apiUrl: "https://node.example",
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/Online/i)).toBeInTheDocument();
    expect(screen.getByText("Detail-5")).toBeInTheDocument();
    expect(screen.getByText(/10\.0\.0\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Free/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows loading skeletons when loading", () => {
    render(
      <ServerDetailsInfo
        loading
        toHumanReadableSize={(n) => `${n} B`}
        serverInfo={null}
      />,
    );
    expect(screen.getAllByLabelText("loading").length).toBeGreaterThan(0);
  });
});
