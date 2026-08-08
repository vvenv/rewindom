import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTaskCenter } from "../../../background-job/client/hooks/useTaskCenter.js";

import { ActivityCenter } from "./ActivityCenter.js";

// useTaskCenter 是 context hook（内部 useContext，无 api.get/post 调用），
// 且测试需精确控制 badgeCount / taskCenterOpen 以验证 ActivityCenter 逻辑，故保留 mock。
vi.mock("../../../background-job/client/hooks/useTaskCenter.js", () => ({
  useTaskCenter: vi.fn(),
}));

vi.mock("../../../background-job/client/components/TaskCenter.js", () => ({
  TaskCenterContent: () => <div>任务内容</div>,
}));

function mockUseTaskCenterValue(
  overrides: Partial<ReturnType<typeof useTaskCenter>> = {},
): ReturnType<typeof useTaskCenter> {
  return {
    tasks: [],
    runningCount: 0,
    badgeCount: 0,
    taskCenterOpen: true,
    setTaskCenterOpen: vi.fn(),
    activityCenterTab: "tasks",
    setActivityCenterTab: vi.fn(),
    openTaskCenter: vi.fn(),
    dismissTask: vi.fn(),
    cancelTask: vi.fn(),
    clearFinished: vi.fn(),
    runTask: vi.fn(),
    runServerBackedTask: vi.fn(),
    updateTask: vi.fn(),
    refreshTasks: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useTaskCenter>;
}

describe("ActivityCenter", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

  it("renders activity center trigger button", async () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ taskCenterOpen: false }),
    );

    render(<ActivityCenter />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTitle("活动中心")).toBeInTheDocument();
    });
  });

  it("shows task badge count", async () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ badgeCount: 3 }),
    );

    render(<ActivityCenter />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("caps badge at 99+", async () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ badgeCount: 105 }),
    );

    render(<ActivityCenter />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("99+")).toBeInTheDocument();
    });
  });

  it("renders task center content", async () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ taskCenterOpen: true }),
    );

    render(<ActivityCenter />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("后台任务")).toBeInTheDocument();
      expect(screen.getByText("任务内容")).toBeInTheDocument();
    });
  });
});
