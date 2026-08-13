import { createQueryWrapper, createTestQueryClient } from "@rewindom/client-test";
import { server } from "@rewindom/client-test/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTaskCenter } from "../../../background-job/client/hooks/useTaskCenter.js";

import { PlatformRestoreSheet } from "./PlatformRestoreSheet.js";

import type { LocalRestoreCandidate } from "../../shared/index.js";

interface ConfirmArgs {
  title?: unknown;
  description?: unknown;
  destructive?: boolean;
}

const confirmMock = vi.fn<(options: ConfirmArgs) => Promise<boolean>>();

vi.mock("@rewindom/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@rewindom/client-kit")>();
  return {
    ...actual,
    useConfirm: () => ({ confirm: confirmMock }),
  };
});

const runServerBackedTask = vi.fn();
const openTaskCenter = vi.fn();

vi.mock("../../../background-job/client/hooks/useTaskCenter.js", () => ({
  useTaskCenter: vi.fn(),
}));

const CANDIDATES_URL = "/api/platform/restore/local-candidates";

function candidate(
  overrides: Partial<LocalRestoreCandidate> = {},
): LocalRestoreCandidate {
  return {
    file_path: "/var/backups/rewindom_backup_1.dump",
    filename: "rewindom_backup_1.dump",
    size_bytes: 5 * 1024 * 1024,
    modified_at: 1_700_000_000_000,
    ...overrides,
  };
}

function mockCandidates(candidates: LocalRestoreCandidate[]): void {
  server.use(
    http.get(CANDIDATES_URL, () => HttpResponse.json({ data: { candidates } })),
  );
}

function renderSheet() {
  const wrapper = createQueryWrapper(createTestQueryClient());
  return render(<PlatformRestoreSheet />, { wrapper });
}

function openSheet() {
  fireEvent.click(screen.getByRole("button", { name: /还原数据/ }));
}

beforeEach(() => {
  confirmMock.mockReset();
  runServerBackedTask.mockReset();
  openTaskCenter.mockReset();
  vi.mocked(useTaskCenter).mockReturnValue({
    runServerBackedTask,
    openTaskCenter,
  } as unknown as ReturnType<typeof useTaskCenter>);
});

describe("PlatformRestoreSheet", () => {
  it("关闭时不扫盘", () => {
    let requested = false;
    server.use(
      http.get(CANDIDATES_URL, () => {
        requested = true;
        return HttpResponse.json({ data: { candidates: [] } });
      }),
    );

    renderSheet();

    expect(requested).toBe(false);
  });

  it("打开后列出本地备份文件及其体积", async () => {
    mockCandidates([candidate()]);
    renderSheet();

    openSheet();

    expect(
      await screen.findByText("rewindom_backup_1.dump"),
    ).toBeInTheDocument();
    expect(screen.getByText(/5\.0 MB/)).toBeInTheDocument();
  });

  it("备份目录为空时给出排查提示", async () => {
    mockCandidates([]);
    renderSheet();

    openSheet();

    expect(
      await screen.findByText(/DATABASE_RESTORE_LOCAL_PATHS/),
    ).toBeInTheDocument();
  });

  it("未选文件就提交时不发起任务", async () => {
    mockCandidates([candidate()]);
    renderSheet();
    openSheet();
    await screen.findByText("rewindom_backup_1.dump");

    fireEvent.click(screen.getByRole("button", { name: /开始还原/ }));

    await waitFor(() => expect(confirmMock).not.toHaveBeenCalled());
    expect(runServerBackedTask).not.toHaveBeenCalled();
  });

  it("确认框被取消时不发起任务", async () => {
    confirmMock.mockResolvedValue(false);
    mockCandidates([candidate()]);
    renderSheet();
    openSheet();

    fireEvent.click(await screen.findByText("rewindom_backup_1.dump"));
    fireEvent.click(screen.getByRole("button", { name: /开始还原/ }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(runServerBackedTask).not.toHaveBeenCalled();
  });

  it("确认后按所选路径发起还原任务", async () => {
    confirmMock.mockResolvedValue(true);
    mockCandidates([candidate()]);
    renderSheet();
    openSheet();

    fireEvent.click(await screen.findByText("rewindom_backup_1.dump"));
    fireEvent.click(screen.getByRole("button", { name: /开始还原/ }));

    await waitFor(() => expect(runServerBackedTask).toHaveBeenCalledTimes(1));
    const options = runServerBackedTask.mock.calls[0]![0] as {
      title: string;
      startJob: () => Promise<{ job_id: string }>;
    };
    expect(options.title).toBe("数据还原：rewindom_backup_1.dump");
    expect(openTaskCenter).toHaveBeenCalled();
  });

  it("确认框以文件名说明将被覆盖的内容", async () => {
    confirmMock.mockResolvedValue(true);
    mockCandidates([candidate()]);
    renderSheet();
    openSheet();

    fireEvent.click(await screen.findByText("rewindom_backup_1.dump"));
    fireEvent.click(screen.getByRole("button", { name: /开始还原/ }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    const options = confirmMock.mock.calls[0]![0];
    expect(options.destructive).toBe(true);
    expect(String(options.description)).toContain("rewindom_backup_1.dump");
  });
});
