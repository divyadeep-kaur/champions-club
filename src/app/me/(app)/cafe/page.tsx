import Image from "next/image";
import { db } from "@/lib/db";
import { benefitPlan } from "@/lib/membership";
import { requireMember } from "@/lib/memberSession";
import { CafeMenu } from "./CafeMenu";
import { menuPhoto } from "@/lib/menuPhotos";

export const dynamic = "force-dynamic";

export default async function MemberCafe() {
  const member = await requireMember();
  const [menu, tables, tab] = await Promise.all([
    db.menuItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    db.barTable.findMany({ orderBy: { label: "asc" } }),
    db.tab.findFirst({ where: { memberId: member.id, status: "open" } }),
  ]);
  const discount = benefitPlan(member)?.barDiscount ?? 0;

  return (
    <main className="grid content-start gap-3.5 pb-4 lg:gap-6 lg:py-8">
      <div className="relative h-[170px] overflow-hidden lg:h-[240px] lg:rounded-3xl">
        <Image
          src="/images/cafe-bowl.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          unoptimized
          sizes="(min-width: 1024px) 1140px, 560px"
          className="object-cover"
        />
        <div className="absolute inset-x-4 bottom-3.5 lg:inset-x-6 lg:bottom-6 lg:max-w-[520px] rounded-2xl border border-white/30 bg-forest-deep/50 px-4 py-3 text-white backdrop-blur-md">
          <h1 className="text-[24px] font-extrabold">Café &amp; bar</h1>
          <span className="text-[14px]">Order to your table{discount ? ` · ${discount}% ${member.plan.name} discount` : ""}</span>
        </div>
      </div>
      <CafeMenu
        menu={menu.map((m) => ({ id: m.id, name: m.name, category: m.category, price: m.price, photo: menuPhoto(m) }))}
        tables={tables.map((t) => ({ id: t.id, label: t.label }))}
        defaultTable={tab?.tableId ?? undefined}
        discount={discount}
        openTab={tab ? { subtotal: tab.subtotal } : null}
      />
    </main>
  );
}
