import { describe, it, expect } from "vitest";

import { optionsFromLabels } from "./filter-chip-options.js";

describe("filter-chip-options", () => {
  describe("optionsFromLabels", () => {
    it("把 {value,label}[] 映射为 {value,label,description}[]", () => {
      const result = optionsFromLabels([
        { value: "a", label: "选项A" },
        { value: "b", label: "选项B" },
      ]);
      expect(result).toEqual([
        { value: "a", label: "选项A", description: undefined },
        { value: "b", label: "选项B", description: undefined },
      ]);
    });

    it("descriptions 按 value 补描述", () => {
      const result = optionsFromLabels(
        [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        { a: "描述A", b: "描述B" },
      );
      expect(result[0].description).toBe("描述A");
      expect(result[1].description).toBe("描述B");
    });

    it("descriptions 只覆盖部分 value,其余为 undefined", () => {
      const result = optionsFromLabels(
        [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        { a: "仅A有描述" },
      );
      expect(result[0].description).toBe("仅A有描述");
      expect(result[1].description).toBeUndefined();
    });

    it("空数组返回空数组", () => {
      expect(optionsFromLabels([])).toEqual([]);
    });

    it("descriptions 含未出现 value 时被忽略", () => {
      const result = optionsFromLabels(
        [{ value: "a", label: "A" }],
        { a: "A描述", ghost: "不存在" },
      );
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("A描述");
    });
  });
});
