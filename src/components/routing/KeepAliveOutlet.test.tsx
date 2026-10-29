import { describe, expect, it } from "vitest";
import { Route, Routes, Link, MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { KeepAliveOutlet } from "./KeepAliveOutlet";

function MountProbe({ name }: { name: string }) {
  const [mountId] = useState(() => `${name}-${Math.random().toString(36).slice(2, 7)}`);
  useEffect(() => {
    const key = `kaMount${name}` as "kaMountA" | "kaMountB";
    const prev = Number(document.body.dataset[key] ?? "0");
    document.body.dataset[key] = String(prev + 1);
    return () => {
      document.body.dataset[`kaUnmount${name}` as "kaUnmountA"] = "1";
    };
  }, [name]);
  return (
    <div data-testid={`pane-${name}`} data-mount-id={mountId}>
      {name}
    </div>
  );
}

function Shell() {
  return (
    <div>
      <Link to="/a">A</Link>
      <Link to="/b">B</Link>
      <KeepAliveOutlet />
    </div>
  );
}

describe("KeepAliveOutlet", () => {
  it("keeps the previous pane mounted when switching routes", async () => {
    document.body.dataset.kaMountA = "0";
    document.body.dataset.kaMountB = "0";
    delete document.body.dataset.kaUnmountA;

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="a" element={<MountProbe name="A" />} />
            <Route path="b" element={<MountProbe name="B" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("pane-A")).toBeInTheDocument();
    expect(document.body.dataset.kaMountA).toBe("1");
    const mountIdA = screen.getByTestId("pane-A").getAttribute("data-mount-id");

    await user.click(screen.getByRole("link", { name: "B" }));
    expect(screen.getByTestId("pane-B")).toBeInTheDocument();
    expect(screen.getByTestId("pane-A")).toBeInTheDocument();
    expect(document.body.dataset.kaUnmountA).toBeUndefined();

    await user.click(screen.getByRole("link", { name: "A" }));
    expect(screen.getByTestId("pane-A")).toBeVisible();
    expect(screen.getByTestId("pane-A").getAttribute("data-mount-id")).toBe(mountIdA);
    expect(document.body.dataset.kaMountA).toBe("1");
  });
});
