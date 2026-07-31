import { setupI18n } from "@be-water/client-kit/i18n/setup";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import { DateTimeRangePicker } from "./DateTimeRangePicker.js";

describe("DateTimeRangePicker", () => {
  afterEach(() => {
    setupI18n("zh-CN");
  });

  it("应该渲染占位符", () => {
    render(<DateTimeRangePicker />);

    expect(screen.getByText("时间范围")).toBeInTheDocument();
  });

  it("英文语言下渲染翻译后的占位符与快捷项", async () => {
    setupI18n("en");
    render(<DateTimeRangePicker />);

    expect(screen.getByText("Date range")).toBeInTheDocument();
  });

  it("应该支持自定义占位符", () => {
    render(<DateTimeRangePicker placeholder="付款时间" />);

    expect(screen.getByText("付款时间")).toBeInTheDocument();
  });

  it("应该显示自定义 displayLabel", () => {
    render(<DateTimeRangePicker displayLabel="2026-01-01 ~ 2026-01-31" />);

    expect(screen.getByText("2026-01-01 ~ 2026-01-31")).toBeInTheDocument();
  });

  it("自定义范围时展示缩短后的日期标签", () => {
    render(
      <DateTimeRangePicker
        placeholder="选择时间范围"
        value={{
          from: new Date("2025-06-01T09:00:00+08:00"),
          to: new Date("2025-06-27T18:30:00+08:00"),
        }}
      />,
    );

    expect(screen.getByText(/2025-06-01/)).toBeInTheDocument();
    expect(screen.queryByText("选择时间范围")).not.toBeInTheDocument();
  });
});
