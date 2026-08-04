import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createSection,
  type PageSectionType,
} from "../../../shared/section-schema.js";

import { SectionSettingsForm } from "./SectionSettingsForm.js";

function renderForm(type: PageSectionType) {
  return render(
    <SectionSettingsForm
      section={createSection(type)}
      locale="zh-CN"
      defaultLocale="zh-CN"
      onChangeSettings={vi.fn()}
      onChangeBlockSettings={vi.fn()}
    />,
  );
}

describe("SectionSettingsForm 页签", () => {
  it("内容、版式、外观都有字段时分三个页签", () => {
    renderForm("hero");
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  // 分栏段没有正文字段，只有版式 + 外观——两个页签，不硬塞空的「内容」
  it("只有部分组有字段时只渲染有字段的页签", () => {
    renderForm("group");
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByText("列宽")).toBeTruthy();
  });
});
