"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { inr } from "@/lib/constants";
import { cartTotals } from "@/lib/checkout";
import { placeOrder, type ShopState } from "./actions";

type Product = { id: number; name: string; category: string; price: number; stock: number; memberPrice: number };

export function ShopOrder({ products, plan }: { products: Product[]; plan: { name: string; shopDiscount: number; courtRate: number; barDiscount: number } | null }) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  const [state, action, pending] = useActionState<ShopState, FormData>(placeOrder, {});

  useEffect(() => {
    if (state.ok) setCart({});
  }, [state.ok, state.at]);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ productId: Number(id), qty, product: products.find((p) => p.id === Number(id))! }))
    .filter((l) => l.product);
  const t = cartTotals(lines.map((l) => ({ unitPrice: l.product.price, qty: l.qty })), plan, "shop");
  const change = (p: Product, d: number) => setCart((c) => ({ ...c, [p.id]: Math.max(0, Math.min(p.stock, 10, (c[p.id] ?? 0) + d)) }));
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <form action={action} className="grid gap-3.5">
      <input type="hidden" name="items" value={JSON.stringify(lines.map(({ productId, qty }) => ({ productId, qty })))} />
      <input type="hidden" name="fulfilment" value={fulfilment} />

      {categories.map((cat) => (
        <section key={cat} className="mx-4 grid gap-2">
          <h2 className="mt-1 text-[17px] font-bold capitalize text-forest">{cat}</h2>
          {products
            .filter((p) => p.category === cat)
            .map((p) => {
              const qty = cart[p.id] ?? 0;
              const out = p.stock <= 0;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2.5 rounded-[14px] border border-line bg-paper px-3 py-2.5">
                  <div className="min-w-0">
                    <strong className="text-[15px]">{p.name}</strong>
                    <div className="text-[13.5px] tabular-nums text-muted">
                      {plan && p.memberPrice < p.price ? (
                        <>
                          <span className="font-semibold text-ink">{inr(p.memberPrice)}</span> <s>{inr(p.price)}</s>
                        </>
                      ) : (
                        inr(p.price)
                      )}
                      {" · "}
                      {out ? <span>sold out</span> : p.stock <= 3 ? <span className="text-[#a8411f]">only {p.stock} left</span> : "in stock"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Remove one ${p.name}`} disabled={qty === 0} onClick={() => change(p, -1)} className="size-11 rounded-full border-[1.5px] border-forest text-[20px] text-forest disabled:opacity-35">
                      −
                    </button>
                    <span className="min-w-4 text-center font-extrabold tabular-nums" aria-live="polite">
                      {qty}
                    </span>
                    <button type="button" aria-label={`Add one ${p.name}`} disabled={out || qty >= p.stock} onClick={() => change(p, 1)} className="size-11 rounded-full bg-forest text-[20px] text-cream disabled:opacity-35">
                      +
                    </button>
                  </div>
                </div>
              );
            })}
        </section>
      ))}

      <div className="sticky bottom-[68px] z-20 mx-3 grid gap-2.5 rounded-[20px] bg-forest-deep/90 px-4 py-3.5 text-white">
        <div role="radiogroup" aria-label="How do you want it" className="grid grid-cols-2 gap-2">
          {(["pickup", "delivery"] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={fulfilment === f} onClick={() => setFulfilment(f)} className={`min-h-10 rounded-full border-[1.5px] text-[14px] font-bold ${fulfilment === f ? "border-ball bg-ball text-forest-deep" : "border-white/40 text-white"}`}>
              {f === "pickup" ? "Collect at club" : "Deliver to me"}
            </button>
          ))}
        </div>
        {fulfilment === "delivery" && <input name="address" placeholder="House, street, area, city" autoComplete="street-address" className="min-h-11 rounded-xl border-0 bg-white px-3 text-[15px] text-ink outline-none" />}
        <div className="flex justify-between gap-2 text-[14px]">
          <span>
            {lines.reduce((n, l) => n + l.qty, 0)} items · {inr(t.subtotal)}
          </span>
          {t.discount > 0 && <span className="text-ball">−{inr(t.discount)} member price</span>}
        </div>
        {(state.ok || state.error) && (
          <p role="status" className={`rounded-[10px] px-2.5 py-2 text-[14px] ${state.error ? "bg-clay-soft text-[#7a2f14]" : "bg-[#e3efc7] text-[#2f4a0a]"}`}>
            {state.error ?? state.ok}
          </p>
        )}
        <button type="submit" disabled={pending || lines.length === 0} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ball p-[13px] font-extrabold text-forest-deep disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Place order · {inr(t.total)}
        </button>
      </div>
    </form>
  );
}
