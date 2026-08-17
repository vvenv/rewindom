import { describe, expect, it } from "vitest";

import { inNodeModules, manualChunks } from "./vite-manual-chunks";

describe("inNodeModules", () => {
  it("matches real package folders", () => {
    expect(
      inNodeModules(
        "/app/node_modules/.pnpm/react-dom@19.2.7/node_modules/react-dom/client.js",
        "react-dom",
      ),
    ).toBe(true);
    expect(
      inNodeModules(
        "/app/node_modules/.pnpm/recharts@3.8.1_react-dom@19.2.7/node_modules/recharts/es6/index.js",
        "recharts",
      ),
    ).toBe(true);
  });

  it("does not match pnpm peer-dep names in store folder", () => {
    expect(
      inNodeModules(
        "/app/node_modules/.pnpm/@radix-ui+react-dialog@1.1.17_@types+react-dom@19.2.3/node_modules/@radix-ui/react-dialog/dist/index.js",
        "react-dom",
      ),
    ).toBe(false);
  });
});

describe("manualChunks", () => {
  it("routes react-dom and recharts into separate vendor chunks", () => {
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/react-dom@19.2.7/node_modules/react-dom/client.js",
      ),
    ).toBe("react-dom");
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/recharts@3.8.1_react-dom@19.2.7/node_modules/recharts/es6/index.js",
      ),
    ).toBe("recharts-vendor");
  });

  it("keeps the markdown editor out of the eager vendor chunk", () => {
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/@uiw+react-md-editor@4.1.1_react-dom@19.2.7/node_modules/@uiw/react-md-editor/esm/index.js",
      ),
    ).toBe("md-editor-vendor");
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/refractor@4.9.0/node_modules/refractor/lang/tsx.js",
      ),
    ).toBe("md-editor-vendor");
    // react-markdown is shared with the always-on `MarkdownProse` — pulling it
    // into the editor chunk would drag the editor along on every page.
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/react-markdown@10.1.0_react@19.2.8/node_modules/react-markdown/lib/index.js",
      ),
    ).toBe("vendor");
  });

  it("keeps i18next and react-i18next in one shared chunk", () => {
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/i18next@26.3.6/node_modules/i18next/dist/esm/i18next.js",
      ),
    ).toBe("i18n-vendor");
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/react-i18next@17.0.11_i18next@26.3.6_react@19.2.8/node_modules/react-i18next/dist/es/index.js",
      ),
    ).toBe("i18n-vendor");
  });

  it("routes radix-ui meta package into radix-vendor", () => {
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/radix-ui@1.6.0/node_modules/radix-ui/dist/index.js",
      ),
    ).toBe("radix-vendor");
  });
});
