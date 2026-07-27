import { describe, it, expect } from "vitest";

import { TaskContext } from "./TaskContext.js";

describe("TaskContext", () => {
  it("应该定义 context 对象", () => {
    expect(TaskContext).toBeDefined();
  });

  it("context 应该有正确的类型", () => {
    // 验证 context 是一个 React Context 对象
    expect(TaskContext).toHaveProperty("_currentValue");
    expect(TaskContext).toHaveProperty("Provider");
    expect(TaskContext).toHaveProperty("Consumer");
  });
});
