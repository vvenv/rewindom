import { DEFAULT_LOCALE } from "@be-water/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  APP_LOCALE_DEFAULT_CACHE_KEY,
  APP_LOCALE_STORAGE_KEY,
  readStoredAppLocale,
} from "./read-stored-locale.js";

describe("read-stored-locale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("无任何存储值时返回 DEFAULT_LOCALE(zh-CN)", () => {
    expect(readStoredAppLocale()).toBe(DEFAULT_LOCALE);
  });

  it("用户选择 app-locale=en 优先于默认缓存", () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "en");
    localStorage.setItem(APP_LOCALE_DEFAULT_CACHE_KEY, "zh-CN");
    expect(readStoredAppLocale()).toBe("en");
  });

  it("app-locale 非法时回落到默认缓存", () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "fr-FR");
    localStorage.setItem(APP_LOCALE_DEFAULT_CACHE_KEY, "en");
    expect(readStoredAppLocale()).toBe("en");
  });

  it("app-locale 缺失时用服务端默认缓存", () => {
    localStorage.setItem(APP_LOCALE_DEFAULT_CACHE_KEY, "en");
    expect(readStoredAppLocale()).toBe("en");
  });

  it("默认缓存也非法时回落到 DEFAULT_LOCALE", () => {
    localStorage.setItem(APP_LOCALE_DEFAULT_CACHE_KEY, "klingon");
    expect(readStoredAppLocale()).toBe(DEFAULT_LOCALE);
  });

  it("预渲染环境(localStorage 未定义)回落 DEFAULT_LOCALE", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readStoredAppLocale()).toBe(DEFAULT_LOCALE);
  });
});
