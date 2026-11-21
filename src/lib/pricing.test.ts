import { describe, expect, it } from "vitest";
import { applyDiscount, courtPrice, sampleVisit } from "./pricing";

const silver = { name: "Silver", courtRate: 300, shopDiscount: 10, barDiscount: 10 };
const gold = { name: "Gold", courtRate: 0, shopDiscount: 15, barDiscount: 20 };

describe("pricing", () => {
  it("charges walk-ins the court rate and members their plan rate", () => {
    expect(courtPrice(null, 800)).toBe(800);
    expect(courtPrice(silver, 800)).toBe(300);
    expect(courtPrice(gold, 800)).toBe(0);
  });

  it("rounds discounts to the nearest rupee", () => {
    expect(applyDiscount(499, 15)).toBe(424);
    expect(applyDiscount(180, 0)).toBe(180);
  });

  it("prices the same sample visit for every plan", () => {
    const visit = { walkInRate: 800, shopItem: 499, barItem: 180 };
    expect(sampleVisit(null, visit)).toEqual({ court: 800, shop: 499, bar: 180, total: 1479 });
    expect(sampleVisit(silver, visit)).toEqual({ court: 300, shop: 449, bar: 162, total: 911 });
    expect(sampleVisit(gold, visit)).toEqual({ court: 0, shop: 424, bar: 144, total: 568 });
  });
});
