export const GST_RATE: Record<string, number> = { court: 18, membership: 18, shop: 12, bar: 5 };

export const EXPENSE_CATEGORIES = [
  { key: "stock", label: "Stock purchases" },
  { key: "salary", label: "Salaries" },
  { key: "rent", label: "Rent" },
  { key: "utilities", label: "Electricity & water" },
  { key: "other", label: "Other" },
] as const;

export function gstFromInclusive(amount: number, rate: number) {
  const taxable = Math.round((amount * 100) / (100 + rate));
  return { taxable, gst: amount - taxable };
}

export function gstSummary(payments: { source: string; amount: number }[]) {
  return Object.entries(GST_RATE).map(([source, rate]) => {
    const gross = payments.filter((p) => p.source === source).reduce((s, p) => s + p.amount, 0);
    return { source, rate, gross, ...gstFromInclusive(gross, rate) };
  });
}

export function nextInvoiceNumber(last: string | null, year: number) {
  const m = last?.match(/^INV-(\d{4})-(\d+)$/);
  const n = m && Number(m[1]) === year ? Number(m[2]) + 1 : 1;
  return `INV-${year}-${String(n).padStart(4, "0")}`;
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
