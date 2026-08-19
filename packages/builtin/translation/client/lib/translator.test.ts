import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTranslator } from "./translator.js";

import { defaultTranslationConfig } from "../../shared/translation.js";

import type { TranslationEngineAdapter } from "../engines/index.js";

function fakeEngine(
  impl: (texts: string[]) => string[] | Promise<string[]>,
): TranslationEngineAdapter {
  return {
    id: "browser",
    available: async () => true,
    translate: async (texts) => impl(texts),
  };
}

const config = { ...defaultTranslationConfig(), enabled: true };

function translator(engine: TranslationEngineAdapter) {
  return createTranslator({ config, target: "zh-CN", source: "en", engine });
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("createTranslator", () => {
  it("译文还原术语后写回", async () => {
    const engine = fakeEngine((texts) => texts.map((t) => t.replace("ships", "发布")));
    const out = await translator(engine).translate(["OpenAI ships v1.2.3"]);
    expect(out[0]).toBe("OpenAI 发布 v1.2.3");
  });

  it("引擎吃掉占位符时保留原文 —— 宁可不译也不给译坏的专有名词", async () => {
    const engine = fakeEngine(() => ["OpenAI 发布了新版本"]);
    const out = await translator(engine).translate(["OpenAI ships v1.2.3"]);
    expect(out[0]).toBe("OpenAI ships v1.2.3");
  });

  it("引擎抛错整批回原文，不抛给调用方", async () => {
    const engine = fakeEngine(() => {
      throw new Error("boom");
    });
    const out = await translator(engine).translate(["hello world"]);
    expect(out).toEqual(["hello world"]);
  });

  it("纯数字 / 空白不送去翻译", async () => {
    const translate = vi.fn(async (texts: string[]) => texts);
    const out = await translator({
      id: "browser",
      available: async () => true,
      translate,
    }).translate(["  ", "42", "—"]);
    expect(translate).not.toHaveBeenCalled();
    expect(out).toEqual(["  ", "42", "—"]);
  });

  it("第二次调用命中 sessionStorage 缓存，不再打引擎", async () => {
    const translate = vi.fn(async (texts: string[]) =>
      texts.map((t) => `${t} zh`),
    );
    const engine: TranslationEngineAdapter = {
      id: "browser",
      available: async () => true,
      translate,
    };
    await translator(engine).translate(["fresh outage report"]);
    const second = await translator(engine).translate(["fresh outage report"]);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(second[0]).toBe("fresh outage report zh");
  });

  it("返回值恒与入参等长同序", async () => {
    const engine = fakeEngine((texts) => texts.slice(0, 1));
    const out = await translator(engine).translate(["alpha beta", "gamma delta"]);
    expect(out).toHaveLength(2);
    expect(out[1]).toBe("gamma delta");
  });
});
