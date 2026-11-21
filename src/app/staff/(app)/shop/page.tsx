import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { requireStaff } from "@/lib/session";
import { CounterSale } from "./CounterSale";
import { advanceOrder, cancelOrder, restock } from "./actions";

export const dynamic = "force-dynamic";

const statusText: Record<string, { label: string; cls: string }> = {
  pending: { label: "To pack", cls: "bg-[#f6e7b8] text-[#5f4605]" },
  ready: { label: "Ready", cls: "bg-[#e3efc7] text-[#2f4a0a]" },
  completed: { label: "Done", cls: "bg-[#ece5d6] text-muted" },
  cancelled: { label: "Cancelled", cls: "bg-[#ece5d6] text-muted line-through" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireStaff(["owner", "desk"]);
  const view = (await searchParams).view === "online" ? "online" : "counter";

  const [products, held, members, orders] = await Promise.all([
    db.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.orderItem.groupBy({ by: ["productId"], where: { order: { channel: "online", status: { in: ["pending", "ready"] } } }, _sum: { qty: true } }),
    db.member.findMany({ include: { plan: true }, orderBy: { name: "asc" } }),
    db.order.findMany({ where: { channel: "online" }, include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const low = products.filter((p) => p.stock <= p.lowStockAt);
  const today = new Date(new Date().toDateString());
  const toPack = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Shop</h1>
        <div role="tablist" aria-label="Shop view" className="flex border-[1.5px] border-forest">
          {[
            ["counter", "Counter"],
            ["online", `Online orders${toPack ? ` (${toPack})` : ""}`],
          ].map(([k, l]) => (
            <Link key={k} role="tab" aria-selected={view === k} href={k === "counter" ? "/staff/shop" : "/staff/shop?view=online"} className={`flex min-h-11 items-center px-[18px] font-semibold ${view === k ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}>
              {l}
            </Link>
          ))}
        </div>
      </div>

      {low.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-clay-soft px-4 py-3 text-[14.5px] text-[#7a2f14]">
          <span>
            <strong>Low stock:</strong> {low.map((p) => `${p.name} (${p.stock})`).join(", ")}
          </span>
          {low.slice(0, 3).map((p) => (
            <form key={p.id} action={restock} className="flex items-center gap-1">
              <input type="hidden" name="productId" value={p.id} />
              <input type="hidden" name="qty" value={Math.max(5, p.lowStockAt * 2)} />
              <button type="submit" className="border border-[#7a2f14]/40 px-2 py-1 text-[13px] font-semibold hover:bg-white/50">
                +{Math.max(5, p.lowStockAt * 2)} {p.name.split(" ")[0]}
              </button>
            </form>
          ))}
        </div>
      )}

      {view === "counter" ? (
        <CounterSale
          products={products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock, lowStockAt: p.lowStockAt, held: held.find((h) => h.productId === p.id)?._sum.qty ?? 0 }))}
          members={members.map((m) => ({ code: m.code, name: m.name, plan: m.plan.name, shopDiscount: m.plan.shopDiscount, courtRate: m.plan.courtRate, barDiscount: m.plan.barDiscount, expired: m.endDate < today }))}
        />
      ) : (
        <>
          <div className="overflow-x-auto border border-line bg-paper">
            <table className="w-full min-w-[760px] text-[14.5px]">
              <thead>
                <tr className="text-left text-muted">
                  {["Order", "Customer", "Items", "Fulfilment", "Status", "Total", ""].map((h) => (
                    <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const s = statusText[o.status] ?? statusText.pending;
                  return (
                    <tr key={o.id} className="border-t border-line">
                      <td className="px-3.5 py-3 font-semibold">#{o.id}</td>
                      <td className="px-3.5 py-3">
                        {o.customerName}
                        <span className="block text-[13px] text-muted">{o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </td>
                      <td className="px-3.5 py-3">{o.items.map((i) => `${i.product.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</td>
                      <td className="px-3.5 py-3 capitalize">
                        {o.fulfilment}
                        {o.address && <span className="block text-[13px] normal-case text-muted">{o.address}</span>}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 text-[13px] font-semibold ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold tabular-nums">
                        {inr(o.total)}
                        <span className="block text-[12.5px] font-normal text-muted">{o.paymentMethod ? `Paid · ${o.paymentMethod.toUpperCase()}` : "Pay on collection"}</span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex justify-end gap-2">
                          {(o.status === "pending" || o.status === "ready") && (
                            <>
                              <form action={advanceOrder} className="flex gap-1">
                                <input type="hidden" name="orderId" value={o.id} />
                                {o.status === "ready" && !o.paymentMethod && (
                                  <select name="method" aria-label="Paid by" defaultValue="upi" className="min-h-9 border border-[#b5aa98] bg-white px-1.5 text-[13.5px]">
                                    <option value="upi">UPI</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                  </select>
                                )}
                                <button type="submit" className="min-h-9 border-[1.5px] border-forest px-3 text-[13.5px] font-semibold text-forest hover:bg-forest/5">
                                  {o.status === "pending" ? "Mark packed" : `${o.fulfilment === "delivery" ? "Delivered" : "Collected"}${o.paymentMethod ? "" : " & paid"}`}
                                </button>
                              </form>
                              <form action={cancelOrder}>
                                <input type="hidden" name="orderId" value={o.id} />
                                <button type="submit" className="min-h-9 px-2 text-[13.5px] font-semibold text-[#a8411f] hover:underline">
                                  Cancel
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && <p className="px-4 py-10 text-center text-muted">No online orders yet.</p>}
          </div>
          <p className="text-[14px] text-muted">Online orders and counter sales take stock from the same products, so the counts on the counter are always the real shelf. Cancelling an order puts its items back and refunds it.</p>
        </>
      )}
    </div>
  );
}
