import { vi } from "vitest";

import { createPrismaMock, type PrismaMock } from "./prisma-mock.js";

export const prismaMock: PrismaMock = createPrismaMock();

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: prismaMock,
}));
