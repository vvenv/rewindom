import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@be-water/ui/tooltip";
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

/*
 * 「账户入口」这个开关照常显示、但点不动并写明原因。
 *
 * 藏起来的话租户会以为页头本来就没有账户入口这回事；照常可点的话（原来的行为）
 * 他打开开关、预览里看得见按钮，线上却什么都不出现，也没人告诉他为什么。
 */
describe("SectionSettingsForm 未开通的能力", () => {
  function renderHeaderForm(unavailable?: Record<string, string>) {
    render(
      // 页头几个开关都挂了说明气泡，Radix Tooltip 必须有 Provider
      <TooltipProvider>
        <SectionSettingsForm
          section={createSection("header")}
          unavailable={unavailable}
          locale="zh-CN"
          defaultLocale="zh-CN"
          onChangeSettings={vi.fn()}
          onChangeBlockSettings={vi.fn()}
        />
      </TooltipProvider>,
    );
    return screen.getByRole("checkbox", { name: /账户入口/u });
  }

  it("能力具备时开关可点，也不显示说明", () => {
    const checkbox = renderHeaderForm();
    expect(checkbox).not.toBeDisabled();
    expect(screen.queryByText("未开通会员")).toBeNull();
  });

  it("能力不具备时置灰并写明原因", () => {
    const checkbox = renderHeaderForm({ show_account: "未开通会员" });
    expect(checkbox).toBeDisabled();
    expect(screen.getByText("未开通会员")).toBeTruthy();
  });
});
