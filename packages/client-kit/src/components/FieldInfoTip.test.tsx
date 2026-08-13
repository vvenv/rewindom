import { render, screen } from "@testing-library/react";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { describe, expect, it } from "vitest";

import { FieldInfoTip } from "./FieldInfoTip.js";

function renderTip(text: string) {
  // 不套 TooltipProvider：这颗气泡自带 Provider，缺了就该在这儿炸出来
  render(
    <Field>
      <FieldLabel htmlFor="slug" className="flex items-center gap-1">
        路径
        <FieldInfoTip text={text} side="left" />
      </FieldLabel>
      <Input id="slug" />
    </Field>,
  );
  return screen.getByRole("button");
}

describe("FieldInfoTip", () => {
  /*
   * 说明搬进气泡后只剩 hover 能看到，键盘与读屏得另有入口：触发器必须进 tab 序
   * （Radix Tooltip 认焦点才展开），原文同时写进无障碍名，不打开气泡也读得到。
   */
  it("触发器进 tab 序，说明原文留给读屏", () => {
    const trigger = renderTip("留空则按标题自动生成");

    expect(trigger.tabIndex).not.toBe(-1);
    expect(trigger).toHaveAccessibleName(/留空则按标题自动生成/u);
  });

  /*
   * 无障碍名必须写在 `aria-label` 上：只塞 sr-only 文字的话，外层 `<label>`
   * 会把名字抢过去（读成「路径」），说明反而丢了。
   */
  it("无障碍名带说明前缀，且不被外层标签抢走", () => {
    const trigger = renderTip("留空则按标题自动生成");

    expect(trigger).toHaveAccessibleName("说明：留空则按标题自动生成");
  });
});
