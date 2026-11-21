import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtTime } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { AttachMember } from "./AttachMember";
import { addItem, closeShift, removeItem, settleTab, startShift } from "./actions";

export const dynamic = "force-dynamic";

const METHODS = [
  { v: "upi", l: "UPI" },
  { v: "card", l: "Card" },
  { v: "cash", l: "Cash" },
];

export default async function BarPage({ searchParams }: { searchParams: Promise<{ tab?: string; table?: string; paid?: string; closed?: string }> }) {
  const staff = await requireStaff(["owner", "bar"]);
  const sp = await searchParams;

  const [shift, tables, openTabs, menu, members] = await Promise.all([
    db.shift.findFirst({ where: { staffId: staff.id, end: null }, orderBy: { start: "desc" } }),
    db.barTable.findMany({ orderBy: { id: "asc" } }),
    db.tab.findMany({ where: { status: "open" }, include: { member: { include: { plan: true } }, table: true, items: { include: { menuItem: true }, orderBy: { createdAt: "asc" } } }, orderBy: { openedAt: "asc" } }),
    db.menuItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    db.member.findMany({ include: { plan: true }, orderBy: { name: "asc" } }),
  ]);

  const shiftPayments = shift ? await db.payment.groupBy({ by: ["method"], where: { source: "bar", createdAt: { gte: shift.start } }, _sum: { amount: true } }) : [];
  const shiftTotal = shiftPayments.reduce((s, p) => s + (p._sum.amount ?? 0), 0);
  const byMethod = (m: string) => shiftPayments.find((p) => p.method === m)?._sum.amount ?? 0;

  const selectedTab = sp.tab ? openTabs.find((t) => t.id === Number(sp.tab)) : sp.table ? openTabs.find((t) => t.tableId === Number(sp.table)) : openTabs[0];
  const selectedTable = selectedTab?.table ?? (sp.table ? tables.find((t) => t.id === Number(sp.table)) : undefined);
  const label = selectedTable?.label ?? (selectedTab ? "Counter" : undefined);
  const counterTabs = openTabs.filter((t) => !t.tableId);

  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Café &amp; bar</h1>
        <div className="flex flex-wrap items-center gap-5 border border-line bg-paper px-4 py-2.5 text-[14.5px]">
          {shift ? (
            <>
              <span>
                Shift since {fmtTime(shift.start)} · earnings <strong className="tabular-nums">{inr(shiftTotal)}</strong>
              </span>
              <span className="text-muted tabular-nums">
                Cash {inr(byMethod("cash"))} · Card {inr(byMethod("card"))} · UPI {inr(byMethod("upi"))}
              </span>
              <form action={closeShift}>
                <button type="submit" className="min-h-11 border-[1.5px] border-forest px-3.5 font-semibold text-forest hover:bg-forest/5">
                  Close shift
                </button>
              </form>
            </>
          ) : (
            <>
              <span className="text-muted">{sp.closed ? "Shift closed." : "No shift open."}</span>
              <form action={startShift}>
                <button type="submit" className="min-h-11 bg-forest px-3.5 font-semibold text-cream hover:bg-forest-deep">
                  Start shift
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {sp.paid && (
        <p role="status" className="bg-[#e3efc7] px-4 py-3 text-[15px] text-[#2f4a0a]">
          {sp.paid}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div className="grid min-w-0 flex-[999_1_520px] gap-5">
          <section aria-label="Tables" className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {tables.map((t) => {
              const tab = openTabs.find((o) => o.tableId === t.id);
              const on = selectedTable?.id === t.id;
              return (
                <Link
                  key={t.id}
                  href={tab ? `/staff/bar?tab=${tab.id}` : `/staff/bar?table=${t.id}`}
                  aria-current={on ? "true" : undefined}
                  className={`min-h-[88px] p-3.5 text-left ${on ? "border-2 border-forest bg-forest text-cream" : tab ? "border border-line bg-paper text-ink hover:border-forest" : "border border-dashed border-[#b5aa98] bg-cream text-muted hover:border-forest"}`}
                >
                  <span className="block font-serif text-[22px]">{t.label}</span>
                  <span className="block truncate text-[13.5px]">{tab ? (tab.member?.name ?? tab.guestName ?? "Guest") : "Free"}</span>
                  {tab && <span className="block text-[13.5px] font-semibold tabular-nums">{inr(tab.total)}</span>}
                </Link>
              );
            })}
            {counterTabs.map((t) => (
              <Link key={t.id} href={`/staff/bar?tab=${t.id}`} className={`min-h-[88px] p-3.5 text-left ${selectedTab?.id === t.id ? "border-2 border-forest bg-forest text-cream" : "border border-line bg-paper hover:border-forest"}`}>
                <span className="block font-serif text-[22px]">Counter</span>
                <span className="block truncate text-[13.5px]">{t.member?.name ?? t.guestName ?? "Guest"}</span>
                <span className="block text-[13.5px] font-semibold tabular-nums">{inr(t.total)}</span>
              </Link>
            ))}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="mb-3.5 text-[18px] font-semibold">{label ? `Add to ${label}` : "Pick a table to start a tab"}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
              {menu.map((m) => (
                <form key={m.id} action={addItem}>
                  <input type="hidden" name="menuItemId" value={m.id} />
                  <input type="hidden" name="tabId" value={selectedTab?.id ?? ""} />
                  <input type="hidden" name="tableId" value={selectedTable?.id ?? ""} />
                  <button type="submit" disabled={!label} className="min-h-[60px] w-full border border-line bg-cream p-3 text-left hover:border-forest disabled:opacity-50">
                    <span className="block font-semibold">{m.name}</span>
                    <span className="text-[13.5px] tabular-nums text-muted">{inr(m.price)}</span>
                  </button>
                </form>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid min-w-0 flex-[1_1_320px] gap-3.5 border border-line bg-paper p-[22px]">
          {!label ? (
            <>
              <h2 className="font-serif text-[24px] text-forest">No tab selected</h2>
              <p className="text-[14.5px] text-muted">Pick a table. Members ordering from their phone show up here automatically.</p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-[24px] text-forest">{label} tab</h2>
              {selectedTab ? (
                <>
                  <div className="bg-cream px-3 py-2.5 text-[14.5px]">
                    {selectedTab.member ? (
                      <>
                        {selectedTab.member.name} · {selectedTab.member.plan.name} member
                        {selectedTab.discount ? ` · ${Math.round((selectedTab.discount / Math.max(1, selectedTab.subtotal)) * 100)}% off` : ""}
                      </>
                    ) : (
                      "Walk-in guest"
                    )}
                    <span className="block text-[13px] text-muted">Opened {fmtTime(selectedTab.openedAt)}</span>
                  </div>
                  {!selectedTab.member && <AttachMember tabId={selectedTab.id} members={members.map((m) => ({ code: m.code, name: m.name, plan: m.plan.name }))} />}
                  {selectedTab.items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-2 border-b border-[#ece5d6] py-2 text-[15px]">
                      <span className="flex items-center gap-2">
                        <form action={removeItem}>
                          <input type="hidden" name="itemId" value={i.id} />
                          <button type="submit" aria-label={`Remove one ${i.menuItem.name}`} className="grid size-7 place-items-center border border-line text-muted hover:border-forest hover:text-forest">
                            −
                          </button>
                        </form>
                        {i.qty} × {i.menuItem.name}
                      </span>
                      <span className="tabular-nums">{inr(i.unitPrice * i.qty)}</span>
                    </div>
                  ))}
                  {selectedTab.items.length === 0 && <p className="text-[14.5px] text-muted">No items yet.</p>}
                  <div className="grid gap-1.5 text-[15px]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{inr(selectedTab.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[#4d7a12]">
                      <span>{selectedTab.member ? `${selectedTab.member.plan.name} discount` : "Member discount"}</span>
                      <span className="tabular-nums">− {inr(selectedTab.discount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-line pt-2 text-[20px] font-bold">
                      <span>Total</span>
                      <span className="tabular-nums">{inr(selectedTab.total)}</span>
                    </div>
                  </div>
                  <form action={settleTab} className="grid gap-3.5">
                    <input type="hidden" name="tabId" value={selectedTab.id} />
                    <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2">
                      {METHODS.map((m, idx) => (
                        <label key={m.v} className="flex min-h-11 cursor-pointer items-center justify-center border-[1.5px] border-forest p-2.5 font-semibold text-forest has-checked:bg-forest has-checked:text-cream">
                          <input type="radio" name="method" value={m.v} defaultChecked={idx === 0} className="sr-only" />
                          {m.l}
                        </label>
                      ))}
                    </div>
                    <button type="submit" disabled={selectedTab.items.length === 0} className="min-h-12 bg-forest p-3.5 text-[16px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-60">
                      Close tab and take payment
                    </button>
                  </form>
                </>
              ) : (
                <p className="text-[14.5px] text-muted">{label} is free. Tap a menu item to open a tab.</p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
