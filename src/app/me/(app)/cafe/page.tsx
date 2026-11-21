import Image from "next/image";
import { db } from "@/lib/db";
import { membershipStatus } from "@/lib/members";
import { requireMember } from "@/lib/memberSession";
import { CafeMenu } from "./CafeMenu";

export const dynamic = "force-dynamic";

export default async function MemberCafe() {
  const member = await requireMember();
  const [menu, tables, tab] = await Promise.all([
    db.menuItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    db.barTable.findMany({ orderBy: { id: "asc" } }),
    db.tab.findFirst({ where: { memberId: member.id, status: "open" } }),
  ]);
  const discount = membershipStatus(member.endDate).status === "expired" ? 0 : member.plan.barDiscount;

  return (
    <main className="grid content-start gap-3.5 pb-4">
      <div className="relative h-[170px] overflow-hidden">
        <Image src="/images/cafe-bowl.jpg" alt="" aria-hidden="true" fill priority unoptimized sizes="560px" className="object-cover" />
        <div className="absolute inset-x-4 bottom-3.5 rounded-2xl border border-white/30 bg-forest-deep/50 px-4 py-3 text-white backdrop-blur-md">
          <h1 className="text-[24px] font-extrabold">Café &amp; bar</h1>
          <span className="text-[14px]">
            Order to your table{discount ? ` · ${discount}% ${member.plan.name} discount` : ""}
          </span>
        </div>
      </div>
      <CafeMenu
        menu={menu.map((m) => ({ id: m.id, name: m.name, category: m.category, price: m.price }))}
        tables={tables.map((t) => ({ id: t.id, label: t.label }))}
        defaultTable={tab?.tableId ?? undefined}
        discount={discount}
        openTab={tab ? { subtotal: tab.subtotal } : null}
      />
    </main>
  );
}
