import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();
const deleteMany = vi.fn();
const decryptMock = vi.fn();
const encryptMock = vi.fn((plaintext: string) => `enc:${plaintext}`);

vi.mock("./prisma.js", () => ({
  prisma: {
    tenantSetting: {
      findUnique,
      upsert,
      deleteMany,
    },
  },
}));

vi.mock("./tenant-secret-crypto.js", () => ({
  decryptTenantSecret: (cipher: string) => decryptMock(cipher),
  encryptTenantSecret: (plaintext: string) => encryptMock(plaintext),
}));

vi.mock("./config.js", () => ({
  config: {
    openai: {
      apiKey: "sk-platform",
      baseUrl: "https://api.example.com/v1",
      model: "platform-model",
    },
  },
}));

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
  deleteMany.mockReset();
  decryptMock.mockReset();
  encryptMock.mockClear();
  vi.resetModules();
});

describe("resolveLlmConfig", () => {
  it("falls back to platform env when the site has no row", async () => {
    findUnique.mockResolvedValue(null);
    const { resolveLlmConfig } = await import("./tenant-llm.js");
    const resolved = await resolveLlmConfig("tenant-1");
    expect(resolved.apiKey).toBe("sk-platform");
    expect(resolved.model).toBe("platform-model");
    expect(resolved.temperature).toBe(0.2);
    expect(resolved.api_key_source).toBe("platform");
    expect(resolved.baseUrl).toBe("https://api.example.com/v1");
  });

  it("uses the site key and public overrides when present", async () => {
    findUnique.mockResolvedValue({
      secret: "cipher",
      value: { model: "site-model", temperature: 0.7 },
    });
    decryptMock.mockReturnValue("sk-site");
    const { resolveLlmConfig } = await import("./tenant-llm.js");
    const resolved = await resolveLlmConfig("tenant-1");
    expect(resolved.apiKey).toBe("sk-site");
    expect(resolved.model).toBe("site-model");
    expect(resolved.temperature).toBe(0.7);
    expect(resolved.api_key_source).toBe("tenant");
    expect(resolved.model_source).toBe("tenant");
    expect(resolved.temperature_source).toBe("tenant");
  });

  it("treats undecryptable ciphertext as missing", async () => {
    findUnique.mockResolvedValue({ secret: "cipher", value: null });
    decryptMock.mockImplementation(() => {
      throw new Error("bad");
    });
    const { resolveLlmConfig } = await import("./tenant-llm.js");
    const resolved = await resolveLlmConfig("tenant-1");
    expect(resolved.apiKey).toBe("sk-platform");
    expect(resolved.api_key_source).toBe("platform");
  });
});

describe("getTenantLlmStatus", () => {
  it("never includes the plaintext key", async () => {
    findUnique.mockResolvedValue({
      secret: "cipher",
      value: { model: "site-model", temperature: null },
    });
    decryptMock.mockReturnValue("sk-site-abcd");
    const { getTenantLlmStatus } = await import("./tenant-llm.js");
    const status = await getTenantLlmStatus("tenant-1");
    expect(status.configured).toBe(true);
    expect(status.source).toBe("tenant");
    expect(status.api_key_hint).toBe("…abcd");
    expect(status.model).toBe("site-model");
    expect(status.temperature).toBeNull();
    expect(JSON.stringify(status)).not.toContain("sk-site-abcd");
  });

  it("does not hint the platform key after the site override is cleared", async () => {
    findUnique.mockResolvedValue(null);
    const { getTenantLlmStatus } = await import("./tenant-llm.js");
    const status = await getTenantLlmStatus("tenant-1");
    expect(status.source).toBe("platform");
    expect(status.configured).toBe(true);
    expect(status.api_key_hint).toBeNull();
  });
});

describe("updateTenantLlmConfig", () => {
  it("encrypts a new key and keeps omitted public fields", async () => {
    findUnique.mockResolvedValue({
      secret: "cipher",
      value: { model: "kept-model", temperature: 0.4 },
    });
    decryptMock.mockReturnValue("sk-old");
    upsert.mockResolvedValue({});
    const { updateTenantLlmConfig } = await import("./tenant-llm.js");
    await updateTenantLlmConfig("tenant-1", { api_key: "sk-new" });
    expect(encryptMock).toHaveBeenCalledWith("sk-new");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          secret: "enc:sk-new",
          value: { model: "kept-model", temperature: 0.4 },
        }),
      }),
    );
  });

  it("clears only the site key when api_key is an empty string", async () => {
    findUnique.mockResolvedValue({
      secret: "cipher",
      value: { model: "kept-model", temperature: 0.4 },
    });
    decryptMock.mockReturnValue("sk-site");
    upsert.mockResolvedValue({});
    const { updateTenantLlmConfig } = await import("./tenant-llm.js");
    await updateTenantLlmConfig("tenant-1", { api_key: "" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          secret: null,
          value: { model: "kept-model", temperature: 0.4 },
        }),
      }),
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("clears the row when reverting every axis to platform", async () => {
    findUnique.mockResolvedValue({
      secret: "cipher",
      value: { model: "site-model", temperature: 0.4 },
    });
    decryptMock.mockReturnValue("sk-site");
    deleteMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValueOnce({
      secret: "cipher",
      value: { model: "site-model", temperature: 0.4 },
    });
    findUnique.mockResolvedValueOnce(null);
    const { updateTenantLlmConfig } = await import("./tenant-llm.js");
    const status = await updateTenantLlmConfig("tenant-1", {
      api_key: "",
      model: null,
      temperature: null,
    });
    expect(deleteMany).toHaveBeenCalled();
    expect(status.source).toBe("platform");
    expect(status.model).toBeNull();
  });

  it("rejects temperature outside 0–2", async () => {
    findUnique.mockResolvedValue(null);
    const { updateTenantLlmConfig } = await import("./tenant-llm.js");
    await expect(
      updateTenantLlmConfig("tenant-1", { temperature: 9 }),
    ).rejects.toMatchObject({ code: "openai.temperature_invalid" });
  });
});
