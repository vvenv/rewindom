import { beforeAll, describe, expect, it } from "vitest";

import { THING_ENTITLEMENT } from "./entitlements.js";
import { uselessListSection } from "./sections/list/definition.js";
import { uselessThingSection } from "./sections/thing/definition.js";
import {
  emptyUselessContext,
  parseThingSlug,
  thingPath,
  uselessInterpolationValues,
} from "./useless-section-context.js";
import {
  registerUselessPageTemplates,
  USELESS_HOME_LAYOUT_KEY,
  USELESS_PAGE_TEMPLATE_GROUP,
  USELESS_THING_PAGE_KIND,
} from "./useless-page-templates.js";

import { getHomeLayout } from "@rewindom/builtin/marketing/shared/home-layouts.js";
import {
  getPageTemplateKind,
  HOME_PAGE_KIND,
  listPageTemplateKinds,
} from "@rewindom/builtin/marketing/shared/page-templates.js";
import { interpolationTokensFor } from "@rewindom/builtin/marketing/shared/interpolation-tokens.js";

describe("registerUselessPageTemplates", () => {
  beforeAll(() => {
    registerUselessPageTemplates();
  });

  it("登记首页版式与详情模板，详情有必备段", () => {
    const kinds = listPageTemplateKinds().filter(
      (item) => item.group === USELESS_PAGE_TEMPLATE_GROUP,
    );
    expect(kinds.map((item) => item.kind)).toEqual(["useless_thing"]);
    expect(kinds[0]?.entitlement).toBe(THING_ENTITLEMENT.key);
    expect(kinds[0]?.required_section).toBe("useless.thing");
    expect(getPageTemplateKind(USELESS_THING_PAGE_KIND)?.path).toBe("/:slug");

    const layout = getHomeLayout(USELESS_HOME_LAYOUT_KEY);
    expect(layout?.entitlement).toBe(THING_ENTITLEMENT.key);
    expect(layout?.group).toBe(USELESS_PAGE_TEMPLATE_GROUP);
    expect(layout?.preset.kind).toBe(HOME_PAGE_KIND);
    expect(layout?.preset.sections.map((section) => section.type)).toEqual([
      "useless.list",
    ]);
  });

  it("必备段 type 带 useless. 前缀，且只能落在自己那张页上", () => {
    expect(uselessListSection.type).toBe("useless.list");
    expect(uselessThingSection.type).toBe("useless.thing");
    expect(uselessListSection.page_kinds).toEqual([HOME_PAGE_KIND]);
    expect(uselessThingSection.page_kinds).toEqual(["useless_thing"]);
    expect(uselessListSection.entitlement).toBe(THING_ENTITLEMENT.key);
    expect(uselessThingSection.entitlement).toBe(THING_ENTITLEMENT.key);
  });

  it("填的每个 token 都登记过，登记的每个也都有人填", () => {
    const entitlements = new Set([THING_ENTITLEMENT.key]);
    const filled = new Set(
      Object.keys(uselessInterpolationValues(emptyUselessContext())),
    );
    const registered = new Set(
      interpolationTokensFor({
        pageKind: USELESS_THING_PAGE_KIND,
        entitlements,
      })
        .filter((token) => token.entitlement === THING_ENTITLEMENT.key)
        .map((token) => token.key),
    );
    expect([...registered].sort()).toEqual([...filled].sort());
  });

  it("没开通的站点一个都不列", () => {
    expect(
      interpolationTokensFor({ pageKind: USELESS_THING_PAGE_KIND }).every(
        (token) => token.entitlement === undefined,
      ),
    ).toBe(true);
  });

  it("同一进程再登记一次不抛", () => {
    expect(() => registerUselessPageTemplates()).not.toThrow();
  });
});

describe("公开路径", () => {
  it("详情在站点根，一段 slug", () => {
    expect(thingPath("一口气")).toBe("/%E4%B8%80%E5%8F%A3%E6%B0%94");
    expect(parseThingSlug("/一口气")).toBe("一口气");
    expect(parseThingSlug("/clock")).toBe("clock");
  });

  it("首页、多段、保留字都不是详情", () => {
    expect(parseThingSlug("/")).toBeNull();
    expect(parseThingSlug("/things/clock")).toBeNull();
    expect(parseThingSlug("/app")).toBeNull();
    expect(parseThingSlug("/login")).toBeNull();
    expect(parseThingSlug("/en")).toBeNull();
  });
});
