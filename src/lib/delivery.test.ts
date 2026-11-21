import { describe, expect, it } from "vitest";
import { formatAddress, isPincode, shippingFor } from "./delivery";

describe("delivery", () => {
  const rule = { fee: 99, freeOver: 1999 };
  it("charges shipping only for home delivery below the free amount", () => {
    expect(shippingFor("delivery", 500, rule)).toBe(99);
    expect(shippingFor("delivery", 1999, rule)).toBe(0);
    expect(shippingFor("club", 500, rule)).toBe(0);
    expect(shippingFor("delivery", 5000, { fee: 99, freeOver: 0 })).toBe(99);
  });
  it("accepts only valid Indian PIN codes", () => {
    expect(isPincode("144411")).toBe(true);
    expect(isPincode("044411")).toBe(false);
    expect(isPincode("14441")).toBe(false);
    expect(isPincode("14441a")).toBe(false);
  });
  it("formats an address on one line", () => {
    expect(formatAddress({ line1: "H.No 12", line2: "Model Town", landmark: "Gurudwara", city: "Phagwara", state: "Punjab", pincode: "144401" })).toBe(
      "H.No 12, Model Town, Near Gurudwara, Phagwara, Punjab 144401",
    );
  });
});
