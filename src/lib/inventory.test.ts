import { describe, expect, it } from "vitest";
import { nextSku, skuPrefix } from "./inventory";

describe("product codes", () => {
  it("uses the shop's prefixes for known categories", () => {
    expect(skuPrefix("accessories")).toBe("ACC");
    expect(skuPrefix("Rackets")).toBe("RKT");
  });
  it("makes a prefix for a new category", () => {
    expect(skuPrefix("bags")).toBe("BAG");
    expect(skuPrefix("x")).toBe("XXX");
  });
  it("continues the numbering within a category", () => {
    expect(nextSku("accessories", ["ACC-001", "ACC-003", "BAL-009"])).toBe("ACC-004");
    expect(nextSku("bags", ["ACC-001"])).toBe("BAG-001");
  });
});
