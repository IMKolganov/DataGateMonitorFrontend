import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));

import TelegramBotMessagesTable from "./TelegramBotMessagesTable";

describe("TelegramBotMessagesTable pagination", () => {
  it("renders messages and reports page/pageSize as separate args", async () => {
    const user = userEvent.setup();
    const onPaginationModelChange = vi.fn();
    render(
      <TelegramBotMessagesTable
        messages={[{ id: 3, username: "tg_user", messageText: "hello", telegramId: 9 }]}
        loading={false}
        page={0}
        pageSize={10}
        totalMessages={33}
        onPaginationModelChange={onPaginationModelChange}
      />,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "33");
    expect(screen.getByTestId("row-3")).toHaveTextContent("tg_user");

    await user.click(screen.getByTestId("next-page"));
    expect(onPaginationModelChange).toHaveBeenCalledWith(1, 10);

    await user.click(screen.getByTestId("set-page-size-20"));
    expect(onPaginationModelChange).toHaveBeenCalledWith(0, 20);
  });
});
