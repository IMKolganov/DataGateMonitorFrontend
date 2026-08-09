import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import DateRangeFilter from "./DateRangeFilter";

describe("DateRangeFilter", () => {
  it("renders presets, grouping, and apply/reset", () => {
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-08T00:00:00Z");
    render(<DateRangeFilter from={from} to={to} grouping="days" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Last 24h/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Last 7 days/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Grouping/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apply/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
  });

  it("applies Last 24h preset via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-08T00:00:00Z");
    render(<DateRangeFilter from={from} to={to} grouping="days" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Last 24h/i }));
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0]![0] as { grouping: string; from: Date; to: Date };
    expect(arg.grouping).toBe("auto");
    expect(arg.to.getTime()).toBeGreaterThan(arg.from.getTime());
  });

  it("applies multi-day and month presets", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-08T00:00:00Z");
    render(<DateRangeFilter from={from} to={to} grouping="days" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Last 7 days/i }));
    await user.click(screen.getByRole("button", { name: /Last 30 days/i }));
    await user.click(screen.getByRole("button", { name: /This month/i }));
    await user.click(screen.getByRole("button", { name: /YTD/i }));
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("shows invalid range hint when from is after to", () => {
    render(
      <DateRangeFilter
        from={new Date("2024-02-01T00:00:00Z")}
        to={new Date("2024-01-01T00:00:00Z")}
        grouping="days"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/From must be before To/i)).toBeInTheDocument();
  });
});
