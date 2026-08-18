import { describe, expect, it } from "vitest";

import { resolveChromeText } from "./chrome-text.js";

describe("resolveChromeText", () => {
  it("{year}、{site}、{hostname}、{url} 一并替换", () => {
    expect(
      resolveChromeText("© {year} {site} · {hostname} · {url}", {
        siteName: "站点",
        year: 2026,
        origin: "https://yestino.com",
      }),
    ).toBe("© 2026 站点 · yestino.com · https://yestino.com");
  });

  it("从 origin 丢掉路径与默认端口；非默认端口留在 {url} 里", () => {
    expect(
      resolveChromeText("{hostname} {url}", {
        siteName: "站点",
        origin: "https://www.example.com/about",
      }),
    ).toBe("www.example.com https://www.example.com");
    expect(
      resolveChromeText("{hostname} {url}", {
        siteName: "站点",
        origin: "http://localhost:7300",
      }),
    ).toBe("localhost http://localhost:7300");
  });

  it("year 缺省用当前日历年", () => {
    expect(
      resolveChromeText("{year}", {
        siteName: "站点",
        origin: "https://x.test",
      }),
    ).toBe(String(new Date().getFullYear()));
  });

  it("origin 缺省时 {hostname} / {url} 换成空串，不把花括号留给访客", () => {
    expect(resolveChromeText("h={hostname};u={url}", { siteName: "站点" })).toBe(
      "h=;u=",
    );
  });

  it("非法 origin 当成缺省", () => {
    expect(
      resolveChromeText("{hostname}{url}", {
        siteName: "站点",
        origin: "not a url",
      }),
    ).toBe("");
  });

  it("未识别的 {foo} 原样留下，也不把 {domain} 当 hostname 别名", () => {
    expect(
      resolveChromeText("{site} {foo} {domain} {year}", {
        siteName: "Acme",
        year: 2026,
        origin: "https://acme.test",
      }),
    ).toBe("Acme {foo} {domain} 2026");
  });
});
