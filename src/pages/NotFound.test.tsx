import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./NotFound";

describe("NotFound", () => {
  it("renders 404 heading", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: /404 - Page Not Found/i })).toBeInTheDocument();
  });
});
