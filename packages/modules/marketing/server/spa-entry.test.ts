import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  renderSpaBootstrapHtml,
  resetSpaEntryCache,
  resolveSpaEntrySrc,
} from "./spa-entry.js";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));

const isProduction = vi.hoisted(() => ({ value: true }));
vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    get server() {
      return { isProduction: isProduction.value };
    },
  },
}));

const readMock = vi.mocked(readFileSync);

/** 构建产物里的 index.html 长这样（vite 给入口加了内容哈希）。 */
const APP_HTML = `<!doctype html><html><head>
<script type="module" crossorigin src="/assets/index-BiyOPNPZ.js"></script>
<link rel="stylesheet" href="/assets/index-abc.css">
</head><body><div id="root"></div></body></html>`;

beforeEach(() => {
  vi.clearAllMocks();
  resetSpaEntryCache();
  isProduction.value = true;
});

describe("resolveSpaEntrySrc", () => {
  it("从 index.html 里取出带哈希的入口脚本", () => {
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

describe("renderSpaBootstrapHtml", () => {
  it("生产态引用构建产物里的哈希入口", () => {
    readMock.mockReturnValue(APP_HTML);
    expect(renderSpaBootstrapHtml()).toBe(
      '<script type="module" src="/assets/index-BiyOPNPZ.js"></script>',
    );
  });

  it("生产态没有产物就退化成纯静态页", () => {
    readMock.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(renderSpaBootstrapHtml()).toBe("");
  });

  /*
   * 开发态必须走 vite 的源码模块：`dist/` 里的哈希文件名 dev server 不 serve，
   * 浏览器只会拿到 404，租户站的交互层在本地整个是死的。而 `dist/` 常有上一次
   * 构建的残留，所以这里**不能**用「产物在不在」判断。
   */
  it("开发态改用 vite dev 的源码入口，不碰 dist", () => {
    isProduction.value = false;
    readMock.mockReturnValue(APP_HTML);

    const html = renderSpaBootstrapHtml();
    expect(html).toContain('src="/src/main.tsx"');
    expect(html).toContain('src="/@vite/client"');
    // @vitejs/plugin-react 检测不到前导会直接报错
    expect(html).toContain("__vite_plugin_react_preamble_installed__");
    expect(html).not.toContain("/assets/index-");
    expect(readMock).not.toHaveBeenCalled();
  });
});
