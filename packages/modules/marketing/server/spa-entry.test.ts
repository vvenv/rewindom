import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetSpaEntryCache, resolveSpaEntrySrc } from "./spa-entry.js";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));

const readMock = vi.mocked(readFileSync);

/** 构建产物里的 app.html 长这样（vite 给入口加了内容哈希）。 */
const APP_HTML = `<!doctype html><html><head>
<script type="module" crossorigin src="/assets/index-BiyOPNPZ.js"></script>
<link rel="stylesheet" href="/assets/index-abc.css">
</head><body><div id="root"></div></body></html>`;

beforeEach(() => {
  vi.clearAllMocks();
  resetSpaEntryCache();
});

describe("resolveSpaEntrySrc", () => {
  it("从 app.html 里取出带哈希的入口脚本", () => {
    readMock.mockReturnValue(APP_HTML);
    expect(resolveSpaEntrySrc()).toBe("/assets/index-BiyOPNPZ.js");
  });

  // 样式表也带 src-like 属性，不能把 <link> 当成入口
  it("只认 type=module 的 script", () => {
    readMock.mockReturnValue(
      `<html><head><link rel="stylesheet" href="/assets/a.css">
       <script src="/legacy.js"></script></head></html>`,
    );
    expect(resolveSpaEntrySrc()).toBeNull();
  });

  /*
   * 开发态客户端跑 vite dev server、根本没有 dist；只跑服务端时也一样。
   * 这时页面退化成纯静态 HTML，但**必须能打开**——不能因为读不到产物就 500。
   */
  it("读不到产物时返回 null 而不是抛", () => {
    readMock.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(resolveSpaEntrySrc()).toBeNull();
  });

  it("第一个候选路径读不到时换下一个", () => {
    readMock
      .mockImplementationOnce(() => {
        throw new Error("ENOENT");
      })
      .mockReturnValueOnce(APP_HTML);
    expect(resolveSpaEntrySrc()).toBe("/assets/index-BiyOPNPZ.js");
    expect(readMock).toHaveBeenCalledTimes(2);
  });

  // 每个页面请求都会走这里，产物在进程生命周期内不会变
  it("解析一次后缓存，包括「没找到」这个结果", () => {
    readMock.mockReturnValue(APP_HTML);
    resolveSpaEntrySrc();
    const afterFirst = readMock.mock.calls.length;
    resolveSpaEntrySrc();
    resolveSpaEntrySrc();
    expect(readMock.mock.calls.length).toBe(afterFirst);

    resetSpaEntryCache();
    readMock.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(resolveSpaEntrySrc()).toBeNull();
    const afterMiss = readMock.mock.calls.length;
    expect(resolveSpaEntrySrc()).toBeNull();
    expect(readMock.mock.calls.length).toBe(afterMiss);
  });
});
