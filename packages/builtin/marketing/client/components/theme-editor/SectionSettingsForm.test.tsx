import { render, screen } from "@testing-library/react";
import {
  createQueryWrapper,
  createTestQueryClient,
} from "@be-water/client-test";
import { describe, expect, it, vi } from "vitest";

import {
  createBlock,
  createSection,
  type PageSectionType,
} from "../../../shared/section-schema.js";

import { SectionSettingsForm } from "./SectionSettingsForm.js";

const wrapper = createQueryWrapper(createTestQueryClient());

function formProps(type: PageSectionType) {
  return {
    section: createSection(type),
    locale: "zh-CN" as const,
    defaultLocale: "zh-CN" as const,
    onChangeSettings: vi.fn(),
    onChangeBlockSettings: vi.fn(),
  };
}

function renderForm(type: PageSectionType) {
  return render(<SectionSettingsForm {...formProps(type)} />, { wrapper });
}

describe("SectionSettingsForm 页签", () => {
  it("内容、版式、外观都有字段时分三个页签", () => {
    renderForm("hero");
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("只有部分组有字段时只渲染有字段的页签", () => {
    renderForm("group");
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByText("列宽")).toBeTruthy();
  });

  it("切换 section 时若当前页签不存在则回退到第一个", () => {
    const { rerender } = renderForm("hero");
    rerender(<SectionSettingsForm {...formProps("group")} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("data-state", "active");
    expect(screen.getByText("列宽")).toBeTruthy();
  });
});

describe("SectionSettingsForm 未开通的能力", () => {
  function renderAccountBlock(unavailable?: Record<string, string>) {
    const accountBlock = createBlock("header", "chrome_account", {});
    const section = {
      ...createSection("header"),
      blocks: [...createSection("header").blocks, accountBlock],
    };
    render(
      <SectionSettingsForm
        section={section}
        blockId={accountBlock.id}
        unavailable={unavailable}
        locale="zh-CN"
        defaultLocale="zh-CN"
        onChangeSettings={vi.fn()}
        onChangeBlockSettings={vi.fn()}
      />,
      { wrapper },
    );
  }

  it("账户 block 无字段时只显示块名", () => {
    renderAccountBlock();
    expect(screen.getByText("账户入口")).toBeTruthy();
    expect(screen.queryByText("未开通会员")).toBeNull();
  });

  it("能力不具备时选中账户 block 会写明原因", () => {
    renderAccountBlock({ chrome_account: "未开通会员" });
    expect(screen.getByText("未开通会员")).toBeTruthy();
  });
});
