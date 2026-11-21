import Image from "next/image";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { membershipStatus } from "@/lib/members";
import { requireMember } from "@/lib/memberSession";
import { shopPrice } from "@/lib/pricing";
import { productPhoto } from "@/lib/productPhotos";
import { ShopOrder } from "./ShopOrder";

export const dynamic = "force-dynamic";

const status: Record<string, string> = { pending: "Being packed", ready: "Ready", completed: "Done", cancelled: "Cancelled" };

export default async function MemberShop() {
  const member = await requireMember();
  const plan = membershipStatus(member.endDate).status === "expired" ? null : member.plan;
  const [products, orders] = await Promise.all([
    db.product.findMany({ orderBy: [{ category: "asc" }, { price: "desc" }] }),
    db.order.findMany({
      where: { memberId: member.id, channel: "online" },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <main className="grid content-start gap-3.5 pb-4">
      <div className="relative h-[170px] overflow-hidden">
        <Image src="/images/shop-rackets.jpg" alt="" aria-hidden="true" fill priority unoptimized sizes="560px" className="object-cover object-[50%_45%]" />
        <div className="absolute inset-x-4 bottom-3.5 rounded-2xl border border-white/30 bg-forest-deep/50 px-4 py-3 text-white backdrop-blur-md">
          <h1 className="text-[24px] font-extrabold">Pro shop</h1>
          <span className="text-[14px]">Order now, collect at the club or get it delivered{plan ? ` · ${plan.shopDiscount}% off` : ""}</span>
        </div>
      </div>

      {orders.length > 0 && (
        <section className="mx-4 grid gap-2">
          <h2 className="text-[17px] font-bold text-forest">Your orders</h2>
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 rounded-[14px] border border-line bg-paper px-3 py-2.5 text-[14px]">
              <div className="min-w-0">
                <strong>#{o.id}</strong> · {o.items.map((i) => i.product.name).join(", ")}
                <div className="text-muted">
                  {o.fulfilment === "delivery" ? "Delivery" : "Collect at desk"} · {inr(o.total)}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-bold ${o.status === "ready" ? "bg-ball text-forest-deep" : o.status === "pending" ? "bg-[#f6e7b8] text-[#5f4605]" : "bg-[#ece5d6] text-muted"}`}
              >
                {o.status === "ready" && o.fulfilment === "pickup" ? "Ready to collect" : (status[o.status] ?? o.status)}
              </span>
            </div>
          ))}
        </section>
      )}

      <ShopOrder
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          stock: p.stock,
          memberPrice: shopPrice(plan, p.price),
          photo: productPhoto(p.sku),
        }))}
        plan={plan ? { name: plan.name, shopDiscount: plan.shopDiscount, courtRate: plan.courtRate, barDiscount: plan.barDiscount } : null}
      />
    </main>
  );
}
