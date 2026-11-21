import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { CafeTeam } from "../bar/CafeTeam";
import { AutoRefresh } from "./AutoRefresh";
import { markItems, setAvailable } from "./actions";

export const dynamic = "force-dynamic";

type Item = { id: number; qty: number; name: string; category: string; status: string; createdAt: Date; readyAt: Date | null };
type Ticket = { key: string; tabId: number; where: string; who: string; at: Date; items: Item[] };
type Stage = "new" | "preparing" | "ready";

const LATE_MIN = 15;

const mins = (from: Date, to: Date) => Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
const ago = (d: Date, now: Date) => {
  const m = mins(d, now);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
};

// Items from the same tab ordered within a few minutes of each other make one ticket.
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

const STAGES: Record<Stage, { title: string; empty: string; tone: string; next: string; nextLabel: string; allLabel: string }> = {
  new: { title: "New orders", empty: "No new orders.", tone: "#c4572f", next: "preparing", nextLabel: "Start", allLabel: "Start all" },
  preparing: { title: "Cooking", empty: "Nothing on the stove.", tone: "#b8860b", next: "ready", nextLabel: "Ready", allLabel: "All ready" },
  ready: { title: "Ready to serve", empty: "Nothing waiting.", tone: "#4d7a12", next: "served", nextLabel: "Served", allLabel: "All served" },
};

function Move({ ids, to, label, strong }: { ids: number[]; to: string; label: string; strong?: boolean }) {
  return (
    <form action={markItems}>
      <input type="hidden" name="ids" value={ids.join(",")} />
      <input type="hidden" name="to" value={to} />
      <button
        type="submit"
        className={
          strong
            ? "min-h-10 w-full bg-forest px-3 font-semibold text-cream hover:bg-forest-deep"
            : "min-h-9 border border-line px-2.5 text-[13px] font-semibold text-forest hover:border-forest"
        }
      >
        {label}
      </button>
    </form>
  );
}

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ only?: string }> }) {
  await requireStaff(["owner", "bar"]);
  const only = (await searchParams).only;
  const kind = only === "food" || only === "drinks" ? only : null;
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [rows, madeToday, menu] = await Promise.all([
    db.tabItem.findMany({
      where: { status: { in: ["new", "preparing", "ready"] }, tab: { status: "open" }, ...(kind ? { menuItem: { category: kind } } : {}) },
      include: { menuItem: true, tab: { include: { table: true, member: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.tabItem.findMany({
      where: { readyAt: { gte: dayStart }, ...(kind ? { menuItem: { category: kind } } : {}) },
      select: { qty: true, createdAt: true, readyAt: true },
    }),
    db.menuItem.findMany({ where: kind ? { category: kind } : {}, orderBy: [{ active: "asc" }, { category: "asc" }, { name: "asc" }] }),
  ]);

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
  const tickets: Record<Stage, Ticket[]> = {
    new: group(
      items.filter((i) => i.status === "new"),
      "createdAt",
    ),
    preparing: group(
      items.filter((i) => i.status === "preparing"),
      "createdAt",
    ),
    ready: group(
      items.filter((i) => i.status === "ready"),
      "readyAt",
    ),
  };

  // The numbers across the top.
  const waiting = items.filter((i) => i.status !== "ready");
  const waitingQty = waiting.reduce((n, i) => n + i.qty, 0);
  const oldest = waiting[0];
  const late = [...tickets.new, ...tickets.preparing].filter((t) => mins(t.at, now) > LATE_MIN).length;
  const madeQty = madeToday.reduce((n, i) => n + i.qty, 0);
  const avgMake = madeToday.length ? Math.round(madeToday.reduce((n, i) => n + mins(i.createdAt, i.readyAt!), 0) / madeToday.length) : null;

  // Prep list: how many of each dish still have to be made.
  const prep = new Map<string, { qty: number; cooking: number }>();
  for (const i of waiting) {
    const p = prep.get(i.name) ?? { qty: 0, cooking: 0 };
    p.qty += i.qty;
    if (i.status === "preparing") p.cooking += i.qty;
    prep.set(i.name, p);
  }
  const prepList = [...prep.entries()].sort((a, b) => b[1].qty - a[1].qty);
  const soldOut = menu.filter((m) => !m.active).length;

  const column = (stage: Stage) => {
    const s = STAGES[stage];
    const list = tickets[stage];
    return (
      <section className="grid content-start gap-3 bg-[#ece5d6] p-3.5" aria-label={s.title}>
        <h2 className="flex justify-between text-[16px] font-semibold">
          <span>{s.title}</span>
          <span className="text-muted">{list.reduce((n, t) => n + t.items.reduce((m, i) => m + i.qty, 0), 0)} items</span>
        </h2>
        {list.length === 0 && <p className="text-[14px] text-muted">{s.empty}</p>}
        {list.map((t) => {
          const isLate = stage !== "ready" && mins(t.at, now) > LATE_MIN;
          const ids = t.items.map((i) => i.id);
          return (
            <article
              key={t.key}
              className="grid gap-2.5 border border-line border-t-[3px] bg-paper p-3.5"
              style={{ borderTopColor: isLate ? "#a8411f" : s.tone }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/staff/bar?tab=${t.tabId}`} className="font-serif text-[24px] leading-none text-forest hover:underline">
                  {t.where}
                </Link>
                <span className={`text-[13px] ${isLate ? "font-semibold text-[#a8411f]" : "text-muted"}`}>
                  {stage === "ready" ? `ready ${ago(t.at, now)}` : ago(t.at, now)}
                  {isLate && " · late"}
                </span>
              </div>
              <div className="text-[14px] text-muted">{t.who}</div>
              <ul className="grid gap-1.5">
                {t.items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 border-t border-[#ece5d6] pt-1.5 text-[15.5px]">
                    <span>
                      <strong className="tabular-nums">{i.qty} ×</strong> {i.name}
                      {i.category === "drinks" && <span className="ml-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8a6d3b]">drink</span>}
                    </span>
                    <span className="flex shrink-0 gap-1.5">
                      <Move ids={[i.id]} to={s.next} label={s.nextLabel} />
                      {stage === "new" && <Move ids={[i.id]} to="ready" label="Ready" />}
                      {stage === "ready" && <Move ids={[i.id]} to="back" label="Back" />}
                    </span>
                  </li>
                ))}
              </ul>
              {t.items.length > 1 && <Move ids={ids} to={s.next} label={s.allLabel} strong />}
            </article>
          );
        })}
      </section>
    );
  };

  const stat = (label: string, value: string, note?: string, alert?: boolean) => (
    <div className="border border-line bg-paper px-4 py-3">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1 text-[24px] font-semibold tabular-nums ${alert ? "text-[#a8411f]" : ""}`}>{value}</div>
      {note && <div className="text-[12.5px] text-muted">{note}</div>}
    </div>
  );

  return (
    <div className="grid content-start gap-5">
      <AutoRefresh seconds={15} />
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
            <Link
              key={k}
              href={k === "all" ? "/staff/kitchen" : `/staff/kitchen?only=${k}`}
              aria-current={(kind ?? "all") === k ? "true" : undefined}
              className={`flex min-h-11 items-center px-4 font-semibold ${(kind ?? "all") === k ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
            >
              {l}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Waiting to be made", String(waitingQty), oldest ? `oldest ${ago(oldest.createdAt, now)}` : "all caught up")}
        {stat("Late orders", String(late), `over ${LATE_MIN} minutes`, late > 0)}
        {stat("Made today", String(madeQty), "items marked ready")}
        {stat("Average make time", avgMake === null ? "–" : `${avgMake} min`, "from order to ready, today")}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {column("new")}
        {column("preparing")}
        {column("ready")}
      </div>
      <p className="-mt-2 text-[13.5px] text-muted">
        Start moves an order to Cooking. Back returns a dish from Ready to Cooking if it was marked by mistake. Tickets older than {LATE_MIN} minutes turn red.
        Tap a table name to open its tab.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-label="Prep list" className="border border-line bg-paper">
          <h2 className="flex items-baseline justify-between border-b border-line px-4 py-3 text-[16px] font-semibold">
            Prep list
            <span className="text-[13.5px] font-normal text-muted">everything still to make</span>
          </h2>
          {prepList.length === 0 ? (
            <p className="px-4 py-6 text-center text-[14px] text-muted">Nothing to prep right now.</p>
          ) : (
            <ul>
              {prepList.map(([name, p]) => (
                <li key={name} className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 first:border-t-0">
                  <span>{name}</span>
                  <span className="flex items-baseline gap-2">
                    {p.cooking > 0 && <span className="text-[12.5px] text-muted">{p.cooking} cooking</span>}
                    <strong className="text-[18px] tabular-nums">{p.qty}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Sold out" className="border border-line bg-paper">
          <h2 className="flex items-baseline justify-between border-b border-line px-4 py-3 text-[16px] font-semibold">
            Sold out
            <span className="text-[13.5px] font-normal text-muted">{soldOut ? `${soldOut} hidden from the menu` : "everything available"}</span>
          </h2>
          <ul className="max-h-[360px] overflow-y-auto">
            {menu.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 first:border-t-0">
                <span className={m.active ? "" : "text-muted line-through"}>{m.name}</span>
                <form action={setAvailable}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="active" value={m.active ? "no" : "yes"} />
                  <button
                    type="submit"
                    aria-label={m.active ? `Mark ${m.name} sold out` : `Put ${m.name} back on the menu`}
                    className={`min-h-9 px-2.5 text-[13px] font-semibold ${
                      m.active ? "border border-line text-clay hover:border-clay" : "bg-forest text-cream hover:bg-forest-deep"
                    }`}
                  >
                    {m.active ? "Sold out" : "Back on"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-muted">
            Sold-out dishes disappear from the counter and the member app until you put them back.
          </p>
        </section>
      </div>

      <CafeTeam />
    </div>
  );
}
