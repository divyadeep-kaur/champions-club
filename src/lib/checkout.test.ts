import { describe, expect, it } from "vitest";
import { cartTotals, stockError } from "./checkout";

const silver = { courtRate: 300, shopDiscount: 10, barDiscount: 10 };
const gold = { courtRate: 0, shopDiscount: 15, barDiscount: 20 };

describe("cartTotals", () => {
  it("adds up lines with no discount for walk-ins", () => {
    expect(cartTotals([{ unitPrice: 7499, qty: 1 }, { unitPrice: 499, qty: 2 }], null, "shop")).toEqual({ subtotal: 8497, discount: 0, total: 8497 });
  });
  it("uses the shop discount at the counter and the bar discount at the bar", () => {
    expect(cartTotals([{ unitPrice: 7499, qty: 1 }], silver, "shop")).toEqual({ subtotal: 7499, discount: 750, total: 6749 });
    expect(cartTotals([{ unitPrice: 260, qty: 1 }, { unitPrice: 180, qty: 2 }], gold, "bar")).toEqual({ subtotal: 620, discount: 124, total: 496 });
  });
  it("is zero for an empty cart", () => {
    expect(cartTotals([], gold, "bar")).toEqual({ subtotal: 0, discount: 0, total: 0 });
  });
});

describe("stockError", () => {
  const shelf = [
    { id: 1, name: "All Court Shoes", stock: 1 },
    { id: 2, name: "Tennis Balls", stock: 40 },
  ];
  it("allows a sale that fits the shelf", () => {
    expect(stockError([{ productId: 1, qty: 1 }, { productId: 2, qty: 3 }], shelf)).toBeNull();
  });
  it("refuses selling more than is on the shelf", () => {
    expect(stockError([{ productId: 1, qty: 2 }], shelf)).toMatch(/Only 1 All Court Shoes left/);
  });
  it("adds up repeated lines for the same product", () => {
    expect(stockError([{ productId: 1, qty: 1 }, { productId: 1, qty: 1 }], shelf)).toMatch(/Only 1/);
  });
  it("refuses unknown products and empty carts", () => {
    expect(stockError([{ productId: 9, qty: 1 }], shelf)).toMatch(/no longer/);
    expect(stockError([], shelf)).toMatch(/Add/);
  });
});
