import { vi } from "vitest";

vi.mock("./job-exports.js", () => ({
  getBackgroundJobForUser: vi.fn().mockResolvedValue(null),
  listBackgroundJobsForUser: vi.fn().mockResolvedValue([]),
  cancelBackgroundJobForUser: vi.fn(),
}));
