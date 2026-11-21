import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { gstSummary, monthKey, monthLabel, monthRange } from "@/lib/money";
import { SOURCE_LABEL } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function GstPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await searchParams).month ?? monthKey();
  const { from, to } = monthRange(month);
  const prev = monthKey(new Date(from.getFullYear(), from.getMonth() - 1, 1));
  const next = monthKey(new Date(from.getFullYear(), from.getMonth() + 1, 1));
  const payments = await db.payment.findMany({ where: { createdAt: { gte: from, lt: to } }, select: { source: true, amount: true } });
  const rows = gstSummary(payments);
  const totals = rows.reduce((t, r) => ({ gross: t.gross + r.gross, taxable: t.taxable + r.taxable, gst: t.gst + r.gst }), { gross: 0, taxable: 0, gst: 0 });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/staff/money/gst?month=${prev}`} aria-label="Previous month" className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5">
          ‹
        </Link>
        <span className="px-2 text-[17px] font-semibold">{monthLabel(from)}</span>
        <Link href={`/staff/money/gst?month=${next}`} aria-label="Next month" className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5">
          ›
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="bg-forest p-5 text-cream">
          <div className="text-[14px] opacity-85">GST collected</div>
          <div className="font-serif text-[34px] tabular-nums">{inr(totals.gst)}</div>
        </div>
        <div className="border border-line bg-paper p-5">
          <div className="text-[14px] text-muted">Taxable value</div>
          <div className="font-serif text-[30px] text-forest tabular-nums">{inr(totals.taxable)}</div>
        </div>
        <div className="border border-line bg-paper p-5">
          <div className="text-[14px] text-muted">Sales including GST</div>
          <div className="font-serif text-[30px] text-forest tabular-nums">{inr(totals.gross)}</div>
        </div>
      </div>

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[640px] text-[14.5px]">
          <thead>
            <tr className="text-left text-muted">
              {["Source", "Rate", "Sales incl. GST", "Taxable value", "CGST", "SGST", "Total GST"].map((h) => (
                <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} className="border-t border-line">
                <td className="px-3.5 py-3 font-semibold">{SOURCE_LABEL[r.source]}</td>
                <td className="px-3.5 py-3">{r.rate}%</td>
                <td className="px-3.5 py-3 tabular-nums">{inr(r.gross)}</td>
                <td className="px-3.5 py-3 tabular-nums">{inr(r.taxable)}</td>
                <td className="px-3.5 py-3 tabular-nums">{inr(Math.floor(r.gst / 2))}</td>
                <td className="px-3.5 py-3 tabular-nums">{inr(r.gst - Math.floor(r.gst / 2))}</td>
                <td className="px-3.5 py-3 font-semibold tabular-nums">{inr(r.gst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13.5px] text-muted">
        Estimate for filing. Prices are treated as GST-inclusive, at 18% for court time and memberships, 12% for shop goods and 5% for café food and drinks. Check the rates with your accountant before filing GSTR-1 / GSTR-3B. Refunds reduce the totals.
      </p>
    </>
  );
}
