export const GST_RATE: Record<string, number> = { court: 18, membership: 18, shop: 12, bar: 5 };
export const INCOME_SOURCES = ["court", "membership", "shop", "bar", "invoice"] as const;

export const EXPENSE_CATEGORIES = [
  { key: "stock", label: "Stock purchases" },
  { key: "salary", label: "Salaries & advances" },
  { key: "statutory", label: "PF, ESI & PT" },
  { key: "claims", label: "Staff claims" },
  { key: "rent", label: "Rent" },
  { key: "utilities", label: "Electricity & water" },
  { key: "other", label: "Other" },
] as const;

export function gstFromInclusive(amount: number, rate: number) {
  const taxable = Math.round((amount * 100) / (100 + rate));
  return { taxable, gst: amount - taxable };
}

export function gstSummary(payments: { source: string; amount: number; gst?: number | null }[]) {
  const rows = Object.entries(GST_RATE).map(([source, rate]) => {
    const gross = payments.filter((p) => p.source === source).reduce((s, p) => s + p.amount, 0);
    return { source, rate: rate as number | null, gross, ...gstFromInclusive(gross, rate) };
  });
  const invoiced = payments.filter((p) => p.source === "invoice");
  if (invoiced.length) {
    const gross = invoiced.reduce((s, p) => s + p.amount, 0);
    const gst = invoiced.reduce((s, p) => s + (p.gst ?? 0), 0);
    rows.push({ source: "invoice", rate: null, gross, taxable: gross - gst, gst });
  }
  return rows;
}

export const balanceDue = (price: number, paid: number) => Math.max(0, price - Math.max(0, paid));
export const refundable = (paid: number, cap?: number) => Math.max(0, cap === undefined ? paid : Math.min(paid, cap));

export function nextInvoiceNumber(last: string | null, year: number, prefix = "INV") {
  const m = last?.match(new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`));
  const n = m && Number(m[1]) === year ? Number(m[2]) + 1 : 1;
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export function invoiceTotals(lines: { qty: number; unitPrice: number; gstRate: number }[]) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const gst = lines.reduce((s, l) => s + Math.round((l.qty * l.unitPrice * l.gstRate) / 100), 0);
  return { subtotal, gst, total: subtotal + gst };
}

export function monthRange(month: string) {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const y = m ? Number(m[1]) : now.getFullYear();
  const mo = m ? Number(m[2]) - 1 : now.getMonth();
  return { from: new Date(y, mo, 1), to: new Date(y, mo + 1, 1) };
}

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const monthLabel = (d: Date) => d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export function profitAndLoss(income: { source: string; amount: number; gst?: number | null }[], costs: { category: string; amount: number }[]) {
  const gross = income.reduce((s, p) => s + p.amount, 0);
  const gst = gstSummary(income).reduce((s, r) => s + r.gst, 0);
  const netRevenue = gross - gst;
  const lines = EXPENSE_CATEGORIES.map((c) => ({ ...c, amount: costs.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0) }));
  const totalCosts = lines.reduce((s, l) => s + l.amount, 0);
  const profit = netRevenue - totalCosts;
  const staffCost = lines.filter((l) => ["salary", "statutory", "claims"].includes(l.key)).reduce((s, l) => s + l.amount, 0);
  return {
    gross,
    gst,
    netRevenue,
    lines,
    totalCosts,
    profit,
    margin: netRevenue > 0 ? Math.round((profit / netRevenue) * 1000) / 10 : 0,
    staffShare: netRevenue > 0 ? Math.round((staffCost / netRevenue) * 1000) / 10 : 0,
  };
}

export function cashCloseSummary(payments: { method: string; amount: number }[], paidOut: { method: string | null; amount: number }[], counted?: number) {
  const by = (m: string) => payments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0);
  const cashIn = by("cash");
  const cashOut = paidOut.filter((e) => e.method === "cash").reduce((s, e) => s + e.amount, 0);
  const expectedCash = cashIn - cashOut;
  const other = payments.filter((p) => !["cash", "upi", "card"].includes(p.method)).reduce((s, p) => s + p.amount, 0);
  return {
    cashIn,
    cashOut,
    expectedCash,
    upi: by("upi"),
    card: by("card"),
    other,
    total: payments.reduce((s, p) => s + p.amount, 0),
    variance: counted === undefined ? null : counted - expectedCash,
  };
}
