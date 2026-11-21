import { describe, expect, it } from "vitest";
import { gstFromInclusive, invoiceTotals, nextInvoiceNumber, gstSummary, monthRange } from "./money";

describe("gstFromInclusive", () => {
  it("splits a GST-inclusive price into taxable value and tax", () => {
    expect(gstFromInclusive(1180, 18)).toEqual({ taxable: 1000, gst: 180 });
    expect(gstFromInclusive(525, 5)).toEqual({ taxable: 500, gst: 25 });
    expect(gstFromInclusive(0, 18)).toEqual({ taxable: 0, gst: 0 });
  });
  it("handles refunds as negative amounts", () => {
    expect(gstFromInclusive(-1180, 18)).toEqual({ taxable: -1000, gst: -180 });
  });
});

describe("gstSummary", () => {
  it("groups payments by source with each source's rate", () => {
    const rows = gstSummary([
      { source: "court", amount: 1180 },
      { source: "court", amount: -1180 },
      { source: "bar", amount: 525 },
      { source: "membership", amount: 2360 },
    ]);
    expect(rows.find((r) => r.source === "court")).toMatchObject({ gross: 0, gst: 0 });
    expect(rows.find((r) => r.source === "bar")).toMatchObject({ gross: 525, taxable: 500, gst: 25, rate: 5 });
    expect(rows.find((r) => r.source === "membership")).toMatchObject({ gross: 2360, gst: 360, rate: 18 });
  });
});

describe("invoices", () => {
  it("numbers invoices per year", () => {
    expect(nextInvoiceNumber(null, 2026)).toBe("INV-2026-0001");
    expect(nextInvoiceNumber("INV-2026-0041", 2026)).toBe("INV-2026-0042");
    expect(nextInvoiceNumber("INV-2025-0310", 2026)).toBe("INV-2026-0001");
  });
  it("adds GST on top of exclusive line prices", () => {
    expect(invoiceTotals([{ qty: 20, unitPrice: 2000, gstRate: 18 }, { qty: 1, unitPrice: 500, gstRate: 5 }])).toEqual({ subtotal: 40500, gst: 7225, total: 47725 });
  });
});

describe("monthRange", () => {
  it("covers the whole calendar month", () => {
    const { from, to } = monthRange("2026-02");
    expect(from).toEqual(new Date(2026, 1, 1));
    expect(to).toEqual(new Date(2026, 2, 1));
  });
});
