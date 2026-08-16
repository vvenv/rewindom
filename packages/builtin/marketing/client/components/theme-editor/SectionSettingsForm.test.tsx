import { render, screen } from "@testing-library/react";
import {
  createQueryWrapper,
  createTestQueryClient,
} from "@rewindom/client-test";
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

describe("SectionSettingsForm 富文本全屏入口", () => {
  it("按钮与字段标签同一行，不是跟在十行高的 textarea 后面", () => {
    renderForm("prose");
    const button = screen.getByRole("button", { name: /全屏编辑/u });
    const label = screen.getByText("正文（Markdown）");
    expect(button.parentElement).toBe(label.closest("label")?.parentElement);
  });

  /* 纯文本 / 清单字段没有 Markdown 可言，不该多这颗按钮 */
  it("非富文本字段不给全屏入口", () => {
    renderForm("hero");
    expect(screen.queryByRole("button", { name: /全屏编辑/u })).toBeNull();
  });
});

describe("SectionSettingsForm 从页头复制", () => {
  const chromeFormProps = {
    locale: "zh-CN" as const,
    defaultLocale: "zh-CN" as const,
    onChangeSettings: vi.fn(),
    onChangeBlockSettings: vi.fn(),
  };

  it("页头导航不显示从页头复制", () => {
    const section = createSection("header");
    const nav = section.blocks.find((block) => block.type === "chrome_nav");
    expect(nav).toBeTruthy();
    render(
      <SectionSettingsForm
        {...chromeFormProps}
        section={section}
        blockId={nav!.id}
      />,
      { wrapper },
    );
    expect(screen.queryByText("从页头复制")).toBeNull();
  });

  it("页脚导航显示从页头复制", () => {
    const nav = createBlock("footer", "chrome_nav", {});
    const section = { ...createSection("footer"), blocks: [nav] };
    render(
      <SectionSettingsForm
        {...chromeFormProps}
        section={section}
        blockId={nav.id}
      />,
      { wrapper },
    );
    expect(screen.getByText("从页头复制")).toBeTruthy();
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
