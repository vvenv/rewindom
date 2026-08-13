import { useEffect } from "react";

import { server } from "@rewindom/client-test/server";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useTaskCenter } from "../hooks/useTaskCenter.js";

import { TaskCenterContent } from "./TaskCenter.js";

import type { BackgroundTask } from "../contexts/TaskContext.js";

const mockDismissTask = vi.fn();
const mockCancelTask = vi.fn();
const mockClearFinished = vi.fn();

const progressRunningTask: BackgroundTask = {
  id: "task-with-progress",
  title: "数据备份",
  status: "running",
  createdAt: 1_700_000_000_000,
  description: "正在处理 2/5：users",
  moduleProgress: {
    run_id: "run-1",
    steps_total: 5,
    steps_processed: 2,
    current_step: "users",
  },
};

const runningTask: BackgroundTask = {
  id: "task-running",
  title: "数据同步",
  status: "running",
  createdAt: 1_700_000_000_000,
  description: "同步中…",
};

const successTask: BackgroundTask = {
  id: "task-success",
  title: "报表生成",
  status: "success",
  createdAt: 1_700_000_000_000,
  finishedAt: 1_700_000_005_000,
  description: "已完成",
};

const errorTask: BackgroundTask = {
  id: "task-error",
  title: "失败任务",
  status: "error",
  createdAt: 1_700_000_000_000,
  finishedAt: 1_700_000_003_000,
  errorDetails: ["Excel 文件为空"],
};

const warningTaskWithErrors: BackgroundTask = {
  id: "task-warning",
  title: "导入数据：records.xlsx",
  status: "warning",
  createdAt: 1_700_000_000_000,
  finishedAt: 1_700_000_004_000,
  description: "更新 1 条，跳过 0 条，2 条错误",
  errorDetails: ["第 2 行：来源不存在", "第 3 行：ID 不存在"],
};

const successTaskWithSkips: BackgroundTask = {
  id: "task-skipped",
  title: "导入数据：导入文档.xlsx",
  status: "success",
  createdAt: 1_700_000_000_000,
  finishedAt: 1_700_000_004_000,
  description: "更新 2 条，跳过 4577 条",
  skipDetails: {
    summary: [{ reason: "无数据变更", count: 4575 }],
    details: ["第 2 行（ID doc-1）：无数据变更"],
    truncated: true,
  },
};

const systemDataBackupTask: BackgroundTask = {
  id: "task-system-backup",
  serverJobId: "job-system-backup",
  title: "系统基础数据备份",
  status: "success",
  createdAt: 1_700_000_000_000,
  finishedAt: 1_700_000_010_000,
  exportFilename: "system.json.gz",
};

// useTaskCenter 是 context hook（依赖 TaskProvider + AuthProvider + 后台任务轮询），
// 与 useAuth/useTheme 同属合理的 context 隔离，保留 mock 以便精确控制任务状态。
vi.mock("../hooks/useTaskCenter.js", () => ({
  useTaskCenter: vi.fn(),
}));

const { MockTaskCardExtras } = vi.hoisted(() => ({
  MockTaskCardExtras: ({
    task,
    onProgressVisible,
  }: {
    task: BackgroundTask;
    onProgressVisible?: (visible: boolean) => void;
  }) => {
    useEffect(() => {
      const visible = task.id === "task-with-progress";
      onProgressVisible?.(visible);
      return () => onProgressVisible?.(false);
    }, [onProgressVisible, task.id]);

    if (task.id !== "task-with-progress") {
      return null;
    }

    return (
      <div>
        <p>正在采集：FDA Labeling</p>
        <span>2/5</span>
        <div role="progressbar" aria-label="采集进度" />
      </div>
    );
  },
}));

vi.mock("../shell/task-center-slots.js", () => ({
  taskCardExtrasSlot: {
    useSlot: () => MockTaskCardExtras,
  },
}));

// 只覆盖 useAuth，其余保留真实实现——`api` 也在本包内，整包 mock 会让
// 请求发不出去（下载用例依赖真实 api.post 命中 MSW）。
vi.mock("@rewindom/client-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rewindom/client-kit")>()),
  useAuth: vi.fn(() => ({
    user: { role: "ADMIN" },
    isAuthenticated: true,
    isLoading: false,
  })),
}));

function mockUseTaskCenterValue(
  overrides: Partial<ReturnType<typeof useTaskCenter>> = {},
): ReturnType<typeof useTaskCenter> {
  return {
    tasks: [],
    runningCount: 0,
    badgeCount: 0,
    taskCenterOpen: false,
    setTaskCenterOpen: vi.fn(),
    activityCenterTab: "tasks",
    setActivityCenterTab: vi.fn(),
    openTaskCenter: vi.fn(),
    dismissTask: mockDismissTask,
    cancelTask: mockCancelTask,
    clearFinished: mockClearFinished,
    runTask: vi.fn(),
    runServerBackedTask: vi.fn(),
    updateTask: vi.fn(),
    refreshTasks: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useTaskCenter>;
}

describe("TaskCenterContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no tasks", () => {
    vi.mocked(useTaskCenter).mockReturnValue(mockUseTaskCenterValue());

    render(<TaskCenterContent />);

    expect(screen.getByText("暂无任务")).toBeInTheDocument();
  });

  it("lists tasks with titles and descriptions", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({
        tasks: [runningTask, successTask, errorTask],
        runningCount: 1,
        badgeCount: 1,
      }),
    );

    render(<TaskCenterContent />);

    expect(screen.getByText("数据同步")).toBeInTheDocument();
    expect(screen.getByText("报表生成")).toBeInTheDocument();
    expect(screen.getByText("失败任务")).toBeInTheDocument();
    expect(screen.getByText("同步中…")).toBeInTheDocument();
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });

  it("shows module progress from task card extras slot", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [progressRunningTask] }),
    );

    render(<TaskCenterContent />);

    expect(screen.getByText("正在采集：FDA Labeling")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows duration for finished tasks", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [successTask] }),
    );

    render(<TaskCenterContent />);

    expect(screen.getByText(/耗时 5s/)).toBeInTheDocument();
  });

  it("shows clear finished button when there are non-running tasks", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [runningTask, successTask] }),
    );

    render(<TaskCenterContent />);

    expect(screen.getByText("清除已完成")).toBeInTheDocument();
  });

  it("hides clear finished button when only running tasks exist", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({
        tasks: [runningTask],
        runningCount: 1,
        badgeCount: 1,
      }),
    );

    render(<TaskCenterContent />);

    expect(screen.queryByText("清除已完成")).not.toBeInTheDocument();
  });

  it("calls clearFinished when clicking clear finished", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [successTask] }),
    );

    render(<TaskCenterContent />);

    fireEvent.click(screen.getByText("清除已完成"));

    expect(mockClearFinished).toHaveBeenCalledTimes(1);
  });

  it("calls dismissTask when removing a finished task", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [successTask, errorTask] }),
    );

    render(<TaskCenterContent />);

    const removeButtons = screen.getAllByTitle("移除");
    fireEvent.click(removeButtons[0]);

    expect(mockDismissTask).toHaveBeenCalledWith("task-success");
  });

  it("shows cancel button for running tasks", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({
        tasks: [runningTask],
        runningCount: 1,
        badgeCount: 1,
      }),
    );

    render(<TaskCenterContent />);

    expect(screen.getByTitle("取消任务")).toBeInTheDocument();
    expect(screen.queryByTitle("移除")).not.toBeInTheDocument();
  });

  it("calls cancelTask when cancelling a running task", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({
        tasks: [runningTask],
        runningCount: 1,
        badgeCount: 1,
      }),
    );

    render(<TaskCenterContent />);

    fireEvent.click(screen.getByTitle("取消任务"));

    expect(mockCancelTask).toHaveBeenCalledWith("task-running");
  });

  it("shows expandable error details for failed tasks", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [errorTask] }),
    );

    render(<TaskCenterContent />);

    expect(screen.getByText("查看错误详情")).toBeInTheDocument();
    expect(screen.queryByText("Excel 文件为空")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("查看错误详情"));

    expect(screen.getByText("Excel 文件为空")).toBeInTheDocument();
    expect(screen.getByText("收起错误详情")).toBeInTheDocument();
  });

  it("shows summary and expandable errors for warning tasks", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [warningTaskWithErrors] }),
    );

    render(<TaskCenterContent />);

    expect(
      screen.getByText("更新 1 条，跳过 0 条，2 条错误"),
    ).toBeInTheDocument();
    expect(screen.getByText("查看错误详情 (2)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("查看错误详情 (2)"));

    expect(screen.getByText("第 2 行：来源不存在")).toBeInTheDocument();
    expect(screen.getByText("第 3 行：ID 不存在")).toBeInTheDocument();
  });

  it("shows expandable skip details for import tasks", () => {
    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [successTaskWithSkips] }),
    );

    render(<TaskCenterContent />);

    expect(screen.getByText("更新 2 条，跳过 4577 条")).toBeInTheDocument();
    expect(screen.getByText("查看跳过详情 (4575)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("查看跳过详情 (4575)"));

    expect(screen.getByText("无数据变更：4575 条")).toBeInTheDocument();
    expect(
      screen.getByText("第 2 行（ID doc-1）：无数据变更"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("仅显示前 1 条记录，其余已省略"),
    ).toBeInTheDocument();
  });

  it("downloads scoped data backup via platform backup endpoint", async () => {
    // 真实数据流：点击下载 → downloadPlatformDatabaseBackup → api.post → MSW 拦截
    const downloadTokenSpy = vi.fn();
    server.use(
      http.post(
        "/api/platform/backup/jobs/:jobId/download-token",
        ({ params }) => {
          downloadTokenSpy(params.jobId);
          return HttpResponse.json({ data: { download_token: "test-token" } });
        },
      ),
    );

    vi.mocked(useTaskCenter).mockReturnValue(
      mockUseTaskCenterValue({ tasks: [systemDataBackupTask] }),
    );

    render(<TaskCenterContent />);

    fireEvent.click(screen.getByText("下载文件"));

    await waitFor(() => {
      expect(downloadTokenSpy).toHaveBeenCalledWith("job-system-backup");
    });
  });
});
