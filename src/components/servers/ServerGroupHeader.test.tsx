import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServerGroupHeader } from "./ServerGroupHeader";

describe("ServerGroupHeader", () => {
  it("shows the group name with summed connected clients", () => {
    render(
      <ServerGroupHeader
        name="EU"
        count={3}
        connectedCount={7}
        collapsed={false}
        onToggleCollapse={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /EU, 3 servers, 7 online users/ })).toBeInTheDocument();
    expect(screen.getByTitle("3 servers, 7 online users")).toHaveTextContent("(3)7");
  });
});
