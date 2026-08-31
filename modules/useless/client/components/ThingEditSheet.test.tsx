import {
  createQueryWrapper,
  createTestQueryClient,
} from "@rewindom/client-test/react-query";
import { registerI18nBundles, setupI18n } from "@rewindom/module-sdk/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { USELESS_I18N } from "../i18n.js";

import { ThingEditSheet } from "./ThingEditSheet.js";

import type { Thing, ThingListItem } from "../../shared/index.js";

registerI18nBundles([USELESS_I18N]);
setupI18n("zh-CN");

const EMBED: Thing = {
  id: "thing-1",
  tenant_id: "tenant-1",
  kind: "embed",
  title: "时钟在撒谎",
  slug: "时钟在撒谎",
  text: "",
  html: "<div>HELLO-EMBED</div>",
  thumbnail: "",
  enabled: true,
  created_by: "u1",
  updated_by: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const LINE: Thing = {
  ...EMBED,
  id: "thing-2",
  kind: "text",
  title: "",
  text: "你昨天做的梦，今天已经想不起来了。",
  html: "",
};

function listItem(thing: Thing): ThingListItem {
  return {
    id: thing.id,
    kind: thing.kind,
    title: thing.title,
    slug: thing.slug,
    text: thing.text,
    html: thing.html,
    thumbnail: thing.thumbnail,
    enabled: thing.enabled,
    created_by: thing.created_by,
    updated_by: thing.updated_by,
    created_at: thing.created_at,
    updated_at: thing.updated_at,
  };
}

const getMock = vi.fn();

vi.mock("@rewindom/module-sdk/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@rewindom/module-sdk/client")>();
  return {
    ...actual,
    api: { ...actual.api, get: (...args: unknown[]) => getMock(...args) },
  };
});

vi.mock("../hooks/useThingMutations.js", () => ({
  useUpdateThing: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

function openSheet(thing: Thing) {
  getMock.mockReset();
  getMock.mockResolvedValue(thing);
  const wrapper = createQueryWrapper(createTestQueryClient());
  render(createElement(ThingEditSheet, { item: listItem(thing) }), { wrapper });
  fireEvent.click(screen.getByLabelText("编辑"));
}

/**
 * 回归：表单先挂载、detail 后到，受控 Select 的值因此是**改**出来的而不是挂上去的。
 * Radix 的隐藏原生 select 会在那一刻回吐一个空串，把 kind 抹平——类型显示为空、
 * 正文切回「一句话」那一栏（可交互的内容在 html 里，于是看着也是空的）。
 */
describe("ThingEditSheet 回填", () => {
  it("可交互：类型与 HTML 都填上，不被回吐的空值抹掉", async () => {
    openSheet(EMBED);

    await waitFor(() => {
      expect(screen.getByLabelText("名字（访客看不到）")).toHaveValue(
        "时钟在撒谎",
      );
    });
    // 等一轮，让 Radix 那个 change 事件有机会发出来
    await waitFor(() => {
      expect(screen.getByLabelText("类型")).toHaveTextContent("可交互");
    });
    expect(screen.getByLabelText("HTML", { selector: "textarea" })).toHaveValue(
      "<div>HELLO-EMBED</div>",
    );
    expect(screen.queryByLabelText("正文")).not.toBeInTheDocument();
  });

  it("一句话：类型与正文都填上", async () => {
    openSheet(LINE);

    await waitFor(() => {
      expect(screen.getByLabelText("正文")).toHaveValue(
        "你昨天做的梦，今天已经想不起来了。",
      );
    });
    expect(screen.getByLabelText("类型")).toHaveTextContent("一句话");
    expect(screen.queryByLabelText("HTML")).not.toBeInTheDocument();
  });
});
