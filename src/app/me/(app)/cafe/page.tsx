import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtTime } from "@/lib/dates";
import { membershipStatus } from "@/lib/members";
import { requireMember } from "@/lib/memberSession";
import { CafeMenu } from "./CafeMenu";

export const dynamic = "force-dynamic";

export default async function MemberCafe() {
  const member = await requireMember();
  const [menu, tables, tab] = await Promise.all([
    db.menuItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    db.barTable.findMany({ orderBy: { id: "asc" } }),
    db.tab.findFirst({ where: { memberId: member.id, status: "open" }, include: { items: { include: { menuItem: true }, orderBy: { createdAt: "asc" } }, table: true } }),
  ]);
  const discount = membershipStatus(member.endDate).status === "expired" ? 0 : member.plan.barDiscount;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-[30px] font-semibold leading-none tracking-[-0.02em] text-forest">Café & bar</h1>
        <p className="mt-2 text-[14.5px] text-muted">
          Order from your table. Everything goes on your tab{discount ? ` with your ${discount}% ${member.plan.name} discount` : ""}, settle before you leave.
        </p>
      </div>

      {tab && tab.items.length > 0 && (
        <section className="border border-line bg-paper p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Your open tab{tab.table ? ` · ${tab.table.label}` : ""}</h2>
            <span className="font-serif text-[20px] font-semibold text-forest">{inr(tab.total)}</span>
          </div>
          <ul className="mt-2 space-y-1 text-[14px] text-muted">
            {tab.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>
                  {i.qty} × {i.menuItem.name}
                </span>
                <span className="tabular-nums">{fmtTime(i.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CafeMenu
        menu={menu.map((m) => ({ id: m.id, name: m.name, category: m.category, price: m.price }))}
        tables={tables.map((t) => ({ id: t.id, label: t.label }))}
        defaultTable={tab?.tableId ?? undefined}
        discount={discount}
      />
    </div>
  );
}
