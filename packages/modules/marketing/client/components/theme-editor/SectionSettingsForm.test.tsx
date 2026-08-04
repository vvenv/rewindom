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
  it("内容与版式都有字段时分两个页签", () => {
    renderForm("hero");
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  // 分栏段的设置全在「版式」下：留一个点进去空空如也的「内容」页签没有意义
  it("只有一组有字段时不套页签，字段直接铺开", () => {
    renderForm("group");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByText("列宽")).toBeTruthy();
  });
});
