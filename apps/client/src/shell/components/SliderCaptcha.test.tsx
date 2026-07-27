import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { SliderCaptcha } from "./SliderCaptcha";

vi.mock("@be-water/client-kit", () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      id: "captcha1",
      token: "token1",
      targetX: 100,
      targetY: 50,
    }),
    post: vi.fn(),
  },
  isTransientApiError: () => false,
}));

describe("SliderCaptcha", () => {
  it("加载后应显示滑动提示", async () => {
    render(<SliderCaptcha onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("向右滑动完成验证")).toBeInTheDocument();
    });
  });

  it("加载失败应显示错误信息", async () => {
    const { api } = await import("@be-water/client-kit");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("网络错误"));

    render(<SliderCaptcha onSuccess={vi.fn()} onError={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("网络错误")).toBeInTheDocument();
    });
  });
});
