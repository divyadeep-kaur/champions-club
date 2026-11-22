import Image from "next/image";
import { db } from "@/lib/db";
import { benefitPlan } from "@/lib/membership";
import { requireMember } from "@/lib/memberSession";
import { CafeMenu } from "./CafeMenu";
import { menuPhoto } from "@/lib/menuPhotos";
import { cafeShift } from "@/lib/cafe";

export const dynamic = "force-dynamic";

export default async function MemberCafe() {
  const member = await requireMember();
  const [menu, tables, tab, shift] = await Promise.all([
    db.menuItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    db.barTable.findMany({ orderBy: { label: "asc" } }),
    db.tab.findFirst({ where: { memberId: member.id, status: "open" } }),
    cafeShift(),
  ]);
  const open = !!shift;
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-[24px] font-extrabold">Café &amp; bar</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold ${open ? "bg-ball text-forest-deep" : "bg-white/85 text-[#7a2f14]"}`}
            >
              <span className={`size-2 rounded-full ${open ? "bg-forest-deep" : "bg-clay"}`} />
              {open ? "Open now" : "Closed"}
            </span>
          </div>
          <span className="text-[14px]">
            {open ? "Order to your table" : "Ordering opens when the café team starts their shift"}
            {discount ? ` · ${discount}% ${member.plan.name} discount` : ""}
          </span>
        </div>
      </div>
      {!open && (
        <p role="status" className="mx-3 rounded-2xl border border-clay/30 bg-clay-soft px-4 py-3 text-[14.5px] font-semibold text-[#7a2f14] lg:mx-0">
          The café is closed right now. You can look at the menu, but orders can&apos;t be sent until it opens.
        </p>
      )}
      <CafeMenu
        menu={menu.map((m) => ({ id: m.id, name: m.name, category: m.category, price: m.price, photo: menuPhoto(m) }))}
        tables={tables.map((t) => ({ id: t.id, label: t.label }))}
        defaultTable={tab?.tableId ?? undefined}
        discount={discount}
        openTab={tab ? { subtotal: tab.subtotal } : null}
        open={open}
      />
    </main>
  );
}
