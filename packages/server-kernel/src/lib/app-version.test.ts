import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
}));

describe("getAppVersion", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns version from VERSION file when it exists", async () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith("VERSION"));
    mockReadFileSync.mockReturnValue("v1.2.3\n");

    const { getAppVersion } = await import("./app-version.js");
    expect(getAppVersion()).toBe("v1.2.3");
  });

  it("returns version from package.json when VERSION file is absent", async () => {
    mockExistsSync.mockImplementation((p: string) =>
      p.endsWith("package.json"),
    );
    mockReadFileSync.mockReturnValue(JSON.stringify({ version: "2.0.0" }));

    const { getAppVersion } = await import("./app-version.js");
    expect(getAppVersion()).toBe("v2.0.0");
  });

  it("falls back to 'dev' when package.json has no version field", async () => {
    mockExistsSync.mockImplementation((p: string) =>
      p.endsWith("package.json"),
    );
    mockReadFileSync.mockReturnValue(JSON.stringify({}));

    const { getAppVersion } = await import("./app-version.js");
    expect(getAppVersion()).toBe("dev");
  });

  it("returns 'dev' when neither VERSION nor package.json exists", async () => {
    mockExistsSync.mockReturnValue(false);

    const { getAppVersion } = await import("./app-version.js");
    expect(getAppVersion()).toBe("dev");
  });

  it("caches the version on repeated calls", async () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith("VERSION"));
    mockReadFileSync.mockReturnValue("v3.0.0");

    const { getAppVersion } = await import("./app-version.js");
    const first = getAppVersion();
    const second = getAppVersion();

    expect(first).toBe("v3.0.0");
    expect(second).toBe("v3.0.0");
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });
});
