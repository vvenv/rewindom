import { setupI18n } from "@rewindom/client-kit/i18n/setup";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import { DateTimePicker } from "./DateTimePicker.js";

describe("DateTimePicker", () => {
  afterEach(() => {
    setupI18n("zh-CN");
  });

  it("应该渲染占位符", () => {
    render(<DateTimePicker />);

    expect(screen.getByText("选择日期时间")).toBeInTheDocument();
  });

  it("英文语言下渲染翻译后的占位符", () => {
    setupI18n("en");
    render(<DateTimePicker />);

    expect(screen.getByText("Pick date and time")).toBeInTheDocument();
  });

  it("仅选日期时使用日期占位符", () => {
    render(<DateTimePicker dateOnly />);

    expect(screen.getByText("选择日期")).toBeInTheDocument();
  });

  it("应该支持自定义占位符", () => {
    render(<DateTimePicker placeholder="生效时间" />);

    expect(screen.getByText("生效时间")).toBeInTheDocument();
  });

  it("有值时展示格式化后的日期时间", () => {
    render(
      <DateTimePicker value={new Date("2025-06-01T09:00:00+08:00")} />,
    );

    expect(screen.getByText("2025-06-01 09:00:00")).toBeInTheDocument();
    expect(screen.queryByText("选择日期时间")).not.toBeInTheDocument();
  });
});
