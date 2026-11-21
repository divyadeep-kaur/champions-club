import { requireStaff } from "@/lib/session";
import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { isoDate } from "@/lib/dates";
import { SOURCE_LABEL } from "@/lib/reports";
import { daySummary } from "@/lib/cashClose";
import { CloseForm } from "./CloseForm";

export const dynamic = "force-dynamic";

const long = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

export default async function ClosePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  await requireStaff(["owner"]);
  const sp = await searchParams;
  const today = isoDate(new Date());
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && sp.day <= today ? sp.day : today;
  const prev = isoDate(new Date(new Date(`${day}T12:00:00`).getTime() - 86_400_000));
  const next = isoDate(new Date(new Date(`${day}T12:00:00`).getTime() + 86_400_000));
  const [s, closed, history] = await Promise.all([
    daySummary(day),
    db.cashClose.findUnique({ where: { day } }),
    db.cashClose.findMany({ orderBy: { day: "desc" }, take: 14 }),
  ]);
  const sources = Object.keys(SOURCE_LABEL)
    .map((k) => ({ k, amount: s.payments.filter((p) => p.source === k).reduce((n, p) => n + p.amount, 0) }))
    .filter((r) => r.amount !== 0);
  const shortTotal = history.reduce((n, h) => n + Math.min(0, h.variance), 0);
  const recent = Array.from({ length: 7 }, (_, i) => isoDate(new Date(Date.now() - (i + 1) * 86_400_000)));
  const open = recent.filter((d) => !history.some((h) => h.day === d));

  return (
    <div className="grid content-start gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/staff/money/close?day=${prev}`}
          aria-label="Previous day"
          className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5"
        >
          ‹
        </Link>
        <span className="px-2 text-[17px] font-semibold">{day === today ? `Today · ${long(day)}` : long(day)}</span>
        {day < today && (
          <Link
            href={`/staff/money/close?day=${next}`}
            aria-label="Next day"
            className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5"
          >
            ›
          </Link>
        )}
      </div>

      {open.length > 0 && (
        <p className="border border-clay/50 bg-paper px-4 py-2.5 text-[14px]">
          <strong className="text-clay">
            {open.length} recent day{open.length > 1 ? "s" : ""} not closed:
          </strong>{" "}
          {open.map((d, i) => (
            <span key={d}>
              {i > 0 && ", "}
              <Link href={`/staff/money/close?day=${d}`} className="font-semibold text-forest underline underline-offset-4">
                {new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <div className="bg-forest p-4 text-cream">
          <p className="text-[13.5px] opacity-85">Taken today</p>
          <p className="font-serif text-[28px] tabular-nums">{inr(s.total)}</p>
        </div>
        {[
          ["Cash", s.cashIn],
          ["UPI", s.upi],
          ["Card", s.card],
          ["Bank / online", s.other],
        ].map(([l, v]) => (
          <div key={l as string} className="border border-line bg-paper p-4">
            <p className="text-[13.5px] text-muted">{l}</p>
            <p className="font-serif text-[24px] text-forest tabular-nums">{inr(v as number)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-paper p-5">
          <h2 className="mb-2 text-[18px] font-semibold">Cash drawer</h2>
          <div className="flex justify-between border-t border-line py-2 text-[14.5px]">
            <span>Cash taken (after cash refunds)</span>
            <span className="tabular-nums">{inr(s.cashIn)}</span>
          </div>
          <div className="flex justify-between border-t border-line py-2 text-[14.5px]">
            <span>Cash paid out (claims, advances, bills)</span>
            <span className="tabular-nums">− {inr(s.cashOut)}</span>
          </div>
          <div className="flex justify-between border-t border-line py-2 text-[15px] font-semibold">
            <span>Expected in the drawer</span>
            <span className="tabular-nums">{inr(s.expectedCash)}</span>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            {closed ? (
              <div className={`grid gap-1 p-3 text-[14.5px] ${closed.variance === 0 ? "bg-[#e3efc7] text-[#2f4a0a]" : "bg-clay-soft text-[#7a2f14]"}`}>
                <strong>
                  Closed by {closed.staffName} · counted {inr(closed.countedCash)}
                  {closed.variance === 0 ? " · matches" : ` · ${closed.variance > 0 ? "surplus" : "short"} ${inr(Math.abs(closed.variance))}`}
                </strong>
                {closed.expectedCash !== s.expectedCash && <span>Cash records changed after closing: expected is now {inr(s.expectedCash)}.</span>}
                {closed.note && <span>Note: {closed.note}</span>}
              </div>
            ) : (
              <CloseForm day={day} expected={s.expectedCash} />
            )}
          </div>
        </section>

        <section className="border border-line bg-paper p-5">
          <h2 className="mb-2 text-[18px] font-semibold">Where today’s money came from</h2>
          {sources.length === 0 && <p className="text-muted">No payments on this day.</p>}
          {sources.map((r) => (
            <div key={r.k} className="flex justify-between border-t border-line py-2 text-[14.5px]">
              <span>{SOURCE_LABEL[r.k]}</span>
              <span className="tabular-nums">{inr(r.amount)}</span>
            </div>
          ))}
          {s.paidOut.length > 0 && (
            <>
              <h3 className="mt-4 mb-1 text-[15px] font-semibold">Paid out today</h3>
              {s.paidOut.map((e, i) => (
                <div key={i} className="flex justify-between gap-3 border-t border-line py-1.5 text-[13.5px]">
                  <span className="min-w-0 truncate">{e.description}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {inr(e.amount)} · {(e.method ?? "").toUpperCase()}
                  </span>
                </div>
              ))}
            </>
          )}
        </section>
      </div>

      <section className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <caption className="px-4 pt-4 pb-2 text-left text-[18px] font-semibold">
            Recent closes{shortTotal < 0 ? ` · ${inr(-shortTotal)} short in total` : ""}
          </caption>
          <thead className="text-muted">
            <tr>
              {["Day", "Expected cash", "Counted", "Difference", "UPI", "Card", "By"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line">
            {history.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-2.5">
                  <Link href={`/staff/money/close?day=${h.day}`} className="font-semibold text-forest hover:underline">
                    {new Date(`${h.day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </Link>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{inr(h.expectedCash)}</td>
                <td className="px-4 py-2.5 tabular-nums">{inr(h.countedCash)}</td>
                <td className={`px-4 py-2.5 font-semibold tabular-nums ${h.variance === 0 ? "text-[#4d7a12]" : "text-clay"}`}>
                  {h.variance === 0 ? "—" : inr(h.variance)}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{inr(h.upi)}</td>
                <td className="px-4 py-2.5 tabular-nums">{inr(h.card)}</td>
                <td className="px-4 py-2.5">{h.staffName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <p className="px-4 pb-5 text-muted">No days closed yet.</p>}
      </section>
    </div>
  );
}
