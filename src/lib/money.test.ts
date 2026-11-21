import { describe, expect, it } from "vitest";
import { balanceDue, gstFromInclusive, invoiceTotals, nextInvoiceNumber, gstSummary, monthRange, profitAndLoss, refundable } from "./money";

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
    expect(nextInvoiceNumber("SAL-2026-0009", 2026, "SAL")).toBe("SAL-2026-0010");
    expect(nextInvoiceNumber("INV-2026-0009", 2026, "SAL")).toBe("SAL-2026-0001");
  });
  it("adds GST on top of exclusive line prices", () => {
    expect(
      invoiceTotals([
        { qty: 20, unitPrice: 2000, gstRate: 18 },
        { qty: 1, unitPrice: 500, gstRate: 5 },
      ]),
    ).toEqual({ subtotal: 40500, gst: 7225, total: 47725 });
  });
});

describe("monthRange", () => {
  it("covers the whole calendar month", () => {
    const { from, to } = monthRange("2026-02");
    expect(from).toEqual(new Date(2026, 1, 1));
    expect(to).toEqual(new Date(2026, 2, 1));
  });
});

describe("profitAndLoss", () => {
  it("takes GST out of takings before subtracting costs", () => {
    const r = profitAndLoss(
      [
        { source: "court", amount: 11800 },
        { source: "bar", amount: 1050 },
      ],
      [
        { category: "salary", amount: 6000 },
        { category: "statutory", amount: 1000 },
        { category: "rent", amount: 2000 },
      ],
    );
    expect(r.gross).toBe(12850);
    expect(r.gst).toBe(1800 + 50);
    expect(r.netRevenue).toBe(11000);
    expect(r.totalCosts).toBe(9000);
    expect(r.profit).toBe(2000);
    expect(r.margin).toBe(18.2);
    expect(r.staffShare).toBe(63.6);
  });
  it("reports zero margin with no revenue", () => {
    expect(profitAndLoss([], [{ category: "rent", amount: 100 }])).toMatchObject({ profit: -100, margin: 0 });
  });
});

describe("invoice GST", () => {
  it("uses the exact GST stored on invoice payments instead of a guessed rate", () => {
    const rows = gstSummary([
      { source: "invoice", amount: 1120, gst: 120 },
      { source: "invoice", amount: 525, gst: 25 },
      { source: "court", amount: 1180 },
    ]);
    expect(rows.find((r) => r.source === "invoice")).toEqual({ source: "invoice", rate: null, gross: 1645, taxable: 1500, gst: 145 });
    expect(rows.find((r) => r.source === "court")?.gst).toBe(180);
  });
  it("adds no invoice row when there are no invoice payments", () => {
    expect(gstSummary([{ source: "bar", amount: 105 }]).some((r) => r.source === "invoice")).toBe(false);
  });
});

describe("balances and refunds", () => {
  it("never asks for more than the price or less than zero", () => {
    expect(balanceDue(600, 0)).toBe(600);
    expect(balanceDue(600, 600)).toBe(0);
    expect(balanceDue(600, 900)).toBe(0);
    expect(balanceDue(600, -200)).toBe(600);
  });
  it("refunds at most what was paid and at most the cap", () => {
    expect(refundable(400)).toBe(400);
    expect(refundable(800, 200)).toBe(200);
    expect(refundable(-50)).toBe(0);
  });
});
