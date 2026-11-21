import { requireStaff } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { invoiceTotals } from "@/lib/money";
import { markInvoicePaid } from "../../actions";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["owner"]);
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where: { id: Number(id) || 0 }, include: { lines: true } });
  if (!invoice) notFound();
  const t = invoiceTotals(invoice.lines);
  const byRate = [...new Set(invoice.lines.map((l) => l.gstRate))].map((rate) => {
    const taxable = invoice.lines.filter((l) => l.gstRate === rate).reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const gst = invoice.lines.filter((l) => l.gstRate === rate).reduce((s, l) => s + Math.round((l.qty * l.unitPrice * l.gstRate) / 100), 0);
    return { rate, taxable, cgst: Math.floor(gst / 2), sgst: gst - Math.floor(gst / 2) };
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/staff/money/invoices" className="text-[14.5px] font-semibold text-forest">
          ← Invoices
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          {invoice.status !== "paid" && (
            <form action={markInvoicePaid} className="flex gap-1">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <select name="method" defaultValue="upi" aria-label="Paid by" className="min-h-11 border border-[#b5aa98] bg-white px-2">
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="online">Bank transfer</option>
              </select>
              <button type="submit" className="min-h-11 bg-forest px-4 font-semibold text-cream hover:bg-forest-deep">
                Mark paid
              </button>
            </form>
          )}
        </div>
      </div>

      <article className="mx-auto w-full max-w-[820px] border border-line bg-white p-8 text-[14.5px] text-ink print:border-0 print:p-0 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="font-serif text-[26px] text-forest">The Champions Club</p>
            <p className="mt-1 text-muted">Courts · Memberships · Pro shop · Café</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-muted">Tax invoice</p>
            <p className="text-[20px] font-bold">{invoice.number}</p>
            <p className="text-muted">Issued {fmtDate(invoice.issuedAt)}</p>
            <p className="text-muted">Due {fmtDate(invoice.dueAt)}</p>
            <p
              className={`mt-1 inline-block px-2 py-0.5 text-[13px] font-bold ${invoice.status === "paid" ? "bg-[#e3efc7] text-[#2f4a0a]" : "bg-[#f6e7b8] text-[#5f4605]"}`}
            >
              {invoice.status === "paid" ? `Paid ${invoice.paidAt ? fmtDate(invoice.paidAt) : ""}` : "Unpaid"}
            </p>
          </div>
        </header>

        <section className="py-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-muted">Bill to</p>
          <p className="mt-1 text-[16px] font-semibold">{invoice.customerName}</p>
          {invoice.customerAddress && <p>{invoice.customerAddress}</p>}
          {invoice.customerGstin && <p>GSTIN {invoice.customerGstin}</p>}
        </section>

        <table className="w-full">
          <thead>
            <tr className="border-y border-line text-left text-muted">
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">GST</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id} className="border-b border-[#ece5d6]">
                <td className="py-2.5">{l.description}</td>
                <td className="py-2.5 text-right tabular-nums">{l.qty}</td>
                <td className="py-2.5 text-right tabular-nums">{inr(l.unitPrice)}</td>
                <td className="py-2.5 text-right tabular-nums">{l.gstRate}%</td>
                <td className="py-2.5 text-right tabular-nums">{inr(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 grid max-w-[320px] gap-1.5">
          <div className="flex justify-between">
            <span>Taxable value</span>
            <span className="tabular-nums">{inr(t.subtotal)}</span>
          </div>
          {byRate.map((r) => (
            <div key={r.rate} className="grid gap-1 text-muted">
              <div className="flex justify-between">
                <span>CGST {r.rate / 2}%</span>
                <span className="tabular-nums">{inr(r.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST {r.rate / 2}%</span>
                <span className="tabular-nums">{inr(r.sgst)}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 text-[18px] font-bold">
            <span>Total</span>
            <span className="tabular-nums">{inr(t.total)}</span>
          </div>
        </div>

        {invoice.notes && <p className="mt-8 border-t border-line pt-4 text-muted">{invoice.notes}</p>}
      </article>
    </div>
  );
}
