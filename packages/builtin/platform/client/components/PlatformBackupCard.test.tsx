import { createQueryWrapper, createTestQueryClient } from "@rewindom/client-test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskCenter } from "../../../background-job/client/hooks/useTaskCenter.js";

import { PlatformBackupCard } from "./PlatformBackupCard.js";

const runServerBackedTask = vi.fn();
const openTaskCenter = vi.fn();

vi.mock("../../../background-job/client/hooks/useTaskCenter.js", () => ({
  useTaskCenter: vi.fn(),
}));

// 卡片内嵌了还原抽屉，后者要 ConfirmProvider；这里只测卡片，给个桩即可
vi.mock("@rewindom/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@rewindom/client-kit")>();
  return {
    ...actual,
    useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(false) }),
  };
});

function renderCard() {
  const wrapper = createQueryWrapper(createTestQueryClient());
  return render(<PlatformBackupCard />, { wrapper });
}

beforeEach(() => {
  runServerBackedTask.mockReset();
  openTaskCenter.mockReset();
  vi.mocked(useTaskCenter).mockReturnValue({
    runServerBackedTask,
    openTaskCenter,
  } as unknown as ReturnType<typeof useTaskCenter>);
});

describe("PlatformBackupCard", () => {
  it("同时提供备份与还原两个入口", () => {
    renderCard();

    expect(
      screen.getByRole("button", { name: /开始备份/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /还原数据/ })).toBeInTheDocument();
  });

  it("点击备份后以任务中心可识别的标题发起后台任务", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /开始备份/ }));

    await waitFor(() => expect(runServerBackedTask).toHaveBeenCalledTimes(1));
    const options = runServerBackedTask.mock.calls[0]![0] as { title: string };
    // 标题前缀决定任务中心是否给这张卡片显示「下载」按钮
    expect(options.title).toBe("数据备份");
    expect(openTaskCenter).toHaveBeenCalled();
  });
});
