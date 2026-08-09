import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../api/apirequest", () => ({
  getApiBaseUrlResolved: async () => "https://api.example",
}));

import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders initials when no image src is provided", () => {
    const { container } = render(<UserAvatar name="Ada Lovelace" colorSeed="1" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders public http image when src is set", () => {
    const { container } = render(<UserAvatar name="Ada" src="https://cdn.example/a.png" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example/a.png");
  });
});
