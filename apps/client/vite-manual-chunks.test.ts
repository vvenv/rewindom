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

  it("routes radix-ui meta package into radix-vendor", () => {
    expect(
      manualChunks(
        "/app/node_modules/.pnpm/radix-ui@1.6.0/node_modules/radix-ui/dist/index.js",
      ),
    ).toBe("radix-vendor");
  });
});
