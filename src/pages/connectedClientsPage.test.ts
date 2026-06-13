import { describe, expect, it } from "vitest";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import type { ConnectedClientsResponse } from "../api/orvalModelShim";

function parseConnectedClientsPage(raw: unknown): ConnectedClientsResponse | undefined {
  return unwrapMaybeApiResponse<ConnectedClientsResponse>(raw as never);
}

describe("parseConnectedClientsPage", () => {
  it("reads totalCount and vpnClients from a plain payload", () => {
    expect(
      parseConnectedClientsPage({
        totalCount: 42,
        vpnClients: [{ id: 1, commonName: "alice" }],
      }),
    ).toEqual({
      totalCount: 42,
      vpnClients: [{ id: 1, commonName: "alice" }],
    });
  });

  it("unwraps ApiResponse envelope before reading pagination fields", () => {
    expect(
      parseConnectedClientsPage({
        success: true,
        data: {
          totalCount: 99,
          vpnClients: [{ id: 2, commonName: "bob" }],
        },
      }),
    ).toEqual({
      totalCount: 99,
      vpnClients: [{ id: 2, commonName: "bob" }],
    });
  });
});
