import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { invoiceTotals } from "@/lib/money";
import { btnOutline, fieldCls } from "@/components/staff/ui";
import { invoiceMembership } from "../actions";
import { NewInvoiceForm } from "./NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, members] = await Promise.all([
    db.invoice.findMany({ include: { lines: true }, orderBy: { issuedAt: "desc" }, take: 30 }),
    db.member.findMany({ include: { plan: true }, orderBy: { name: "asc" } }),
  ]);
  const now = new Date();

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="grid min-w-0 flex-[999_1_560px] gap-4">
        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[640px] text-[14.5px]">
            <thead>
              <tr className="text-left text-muted">
                {["Invoice", "Bill to", "Issued", "Total", "Status"].map((h) => (
                  <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => {
                const overdue = i.status !== "paid" && i.dueAt < now;
                return (
                  <tr key={i.id} className="relative border-t border-line hover:bg-cream">
                    <td className="px-3.5 py-3 font-semibold">
                      <Link href={`/staff/money/invoices/${i.id}`} className="after:absolute after:inset-0">
                        {i.number}
                      </Link>
                    </td>
                    <td className="px-3.5 py-3">{i.customerName}</td>
                    <td className="px-3.5 py-3">{i.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    <td className="px-3.5 py-3 font-semibold tabular-nums">{inr(invoiceTotals(i.lines).total)}</td>
                    <td className={`px-3.5 py-3 font-semibold ${i.status === "paid" ? "text-[#4d7a12]" : overdue ? "text-[#a8411f]" : "text-[#8a6d3b]"}`}>{i.status === "paid" ? "Paid" : overdue ? "Overdue" : "Unpaid"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {invoices.length === 0 && <p className="px-4 py-10 text-center text-muted">No invoices yet. Create one for a business client, or invoice a member’s plan.</p>}
        </div>

        <form action={invoiceMembership} className="flex flex-wrap items-end gap-2 border border-line bg-paper p-5">
          <label className="grid min-w-[240px] flex-1 gap-1.5 text-[14px] font-semibold">
            Invoice a member’s membership
            <select name="memberId" className={fieldCls}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.code} · {m.plan.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={btnOutline}>
            Create GST invoice
          </button>
        </form>
      </div>
      <div className="min-w-0 flex-[1_1_380px]">
        <NewInvoiceForm />
      </div>
    </div>
  );
}
