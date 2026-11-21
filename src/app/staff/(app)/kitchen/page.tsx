import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { AutoRefresh } from "./AutoRefresh";
import { markItems } from "./actions";

export const dynamic = "force-dynamic";

type Item = { id: number; qty: number; name: string; category: string; status: string; createdAt: Date; readyAt: Date | null };
type Ticket = { key: string; tabId: number; where: string; who: string; at: Date; items: Item[] };

const ago = (d: Date, now: Date) => {
  const m = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60_000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
};

function group(items: (Item & { tabId: number; where: string; who: string })[], by: "createdAt" | "readyAt") {
  const tickets = new Map<string, Ticket>();
  for (const i of items) {
    const t = (by === "readyAt" ? i.readyAt : i.createdAt) ?? i.createdAt;
    const key = `${i.tabId}-${Math.floor(t.getTime() / (3 * 60_000))}`;
    const ticket = tickets.get(key) ?? { key, tabId: i.tabId, where: i.where, who: i.who, at: t, items: [] };
    ticket.items.push(i);
    if (t < ticket.at) ticket.at = t;
    tickets.set(key, ticket);
  }
  return [...tickets.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
}

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ only?: string }> }) {
  await requireStaff(["owner", "bar"]);
  const only = (await searchParams).only;
  const now = new Date();

  const rows = await db.tabItem.findMany({
    where: { status: { in: ["new", "ready"] }, tab: { status: "open" }, ...(only === "food" || only === "drinks" ? { menuItem: { category: only } } : {}) },
    include: { menuItem: true, tab: { include: { table: true, member: true } } },
    orderBy: { createdAt: "asc" },
  });
  const items = rows.map((r) => ({
    id: r.id,
    qty: r.qty,
    name: r.menuItem.name,
    category: r.menuItem.category,
    status: r.status,
    createdAt: r.createdAt,
    readyAt: r.readyAt,
    tabId: r.tabId,
    where: r.tab.table?.label ?? "Counter",
    who: r.tab.member?.name ?? r.tab.guestName ?? "Guest",
  }));
  const toMake = group(items.filter((i) => i.status === "new"), "createdAt");
  const ready = group(items.filter((i) => i.status === "ready"), "readyAt");

  const column = (title: string, tickets: Ticket[], to: "ready" | "served", tone: string) => (
    <section className="grid content-start gap-3 bg-[#ece5d6] p-3.5" aria-label={title}>
      <h2 className="flex justify-between text-[16px] font-semibold">
        <span>{title}</span>
        <span className="text-muted">{tickets.reduce((n, t) => n + t.items.reduce((m, i) => m + i.qty, 0), 0)} items</span>
      </h2>
      {tickets.length === 0 && <p className="text-[14px] text-muted">{to === "ready" ? "Nothing to make. " : "Nothing waiting. "}</p>}
      {tickets.map((t) => {
        const late = to === "ready" && now.getTime() - t.at.getTime() > 15 * 60_000;
        return (
          <article key={t.key} className="grid gap-2.5 border border-line border-t-[3px] bg-paper p-3.5" style={{ borderTopColor: late ? "#a8411f" : tone }}>
            <div className="flex items-baseline justify-between gap-2">
              <Link href={`/staff/bar?tab=${t.tabId}`} className="font-serif text-[24px] leading-none text-forest hover:underline">
                {t.where}
              </Link>
              <span className={`text-[13px] ${late ? "font-semibold text-[#a8411f]" : "text-muted"}`}>{ago(t.at, now)}</span>
            </div>
            <div className="text-[14px] text-muted">{t.who}</div>
            <ul className="grid gap-1.5">
              {t.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 border-t border-[#ece5d6] pt-1.5 text-[15.5px]">
                  <span>
                    <strong className="tabular-nums">{i.qty} ×</strong> {i.name}
                    {i.category === "drinks" && <span className="ml-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8a6d3b]">drink</span>}
                  </span>
                  <form action={markItems}>
                    <input type="hidden" name="ids" value={i.id} />
                    <input type="hidden" name="to" value={to} />
                    <button type="submit" className="min-h-9 border border-line px-2.5 text-[13px] font-semibold text-forest hover:border-forest">
                      {to === "ready" ? "Ready" : "Served"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            {t.items.length > 1 && (
              <form action={markItems}>
                <input type="hidden" name="ids" value={t.items.map((i) => i.id).join(",")} />
                <input type="hidden" name="to" value={to} />
                <button type="submit" className="min-h-10 w-full bg-forest font-semibold text-cream hover:bg-forest-deep">
                  {to === "ready" ? "All ready" : "All served"}
                </button>
              </form>
            )}
          </article>
        );
      })}
    </section>
  );

  return (
    <div className="grid content-start gap-5">
      <AutoRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Kitchen</h1>
          <p className="mt-1.5 text-muted">Every order from the bar and from members’ phones, oldest first. Updates by itself.</p>
        </div>
        <div role="group" aria-label="Show" className="flex border-[1.5px] border-forest">
          {[
            ["all", "Everything"],
            ["food", "Food"],
            ["drinks", "Drinks"],
          ].map(([k, l]) => (
            <Link key={k} href={k === "all" ? "/staff/kitchen" : `/staff/kitchen?only=${k}`} aria-current={(only ?? "all") === k ? "true" : undefined} className={`flex min-h-11 items-center px-4 font-semibold ${(only ?? "all") === k ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}>
              {l}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {column("To make", toMake, "ready", "#c4572f")}
        {column("Ready to serve", ready, "served", "#4d7a12")}
      </div>
      <p className="text-[13.5px] text-muted">Tickets older than 15 minutes turn red. Tap a table name to open its tab.</p>
    </div>
  );
}
