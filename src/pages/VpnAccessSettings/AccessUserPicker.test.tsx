import { useState } from "react";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { AccessUserPicker } from "./AccessUserPicker";
import type { UserDto } from "../../api/orvalModelShim";

const users: UserDto[] = [
  { id: 10, displayName: "Alice", email: "alice@example.com" },
  { id: 11, displayName: "Bob", email: "bob@example.com" },
];

function PickerHarness() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [search, setSearch] = useState("");
  return (
    <AccessUserPicker
      users={users}
      selectedIds={selectedIds}
      search={search}
      onSearchChange={setSearch}
      onChangeSelectedIds={setSelectedIds}
    />
  );
}

describe("AccessUserPicker", () => {
  it("selects several people, including select-all", async () => {
    const user = userEvent.setup();
    render(<PickerHarness />);

    await user.click(screen.getByRole("checkbox", { name: "Alice (alice@example.com)" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Select all visible users" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Bob (bob@example.com)" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("No people selected")).toBeInTheDocument();
  });
});
