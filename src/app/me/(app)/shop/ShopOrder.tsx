"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { inr } from "@/lib/constants";
import { cartTotals } from "@/lib/checkout";
import type { ProductPhoto } from "@/lib/productPhotos";
import { ProductImage } from "@/components/ProductImage";
import { INDIAN_STATES, shippingFor, type ShippingRule } from "@/lib/delivery";
import { placeOrder, type ShopState } from "./actions";

type Product = { id: number; name: string; category: string; price: number; stock: number; memberPrice: number; photo: ProductPhoto | null };

const field =
  "min-h-11 w-full rounded-xl border border-[#b5aa98] bg-white px-3 text-[15px] text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const lbl = "grid gap-1 text-[13.5px] font-semibold";

export function ShopOrder({
  products,
  plan,
  spots,
  shipping,
  memberPhone,
}: {
  products: Product[];
  plan: { name: string; shopDiscount: number; courtRate: number; barDiscount: number } | null;
  spots: string[];
  shipping: ShippingRule;
  memberPhone: string;
}) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [fulfilment, setFulfilment] = useState<"club" | "delivery">("club");
  const [state, action, pending] = useActionState<ShopState, FormData>(placeOrder, {});
  const f = state.error ? (state.fields ?? {}) : {};

  useEffect(() => {
    if (state.ok) setCart({});
  }, [state.ok, state.at]);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ productId: Number(id), qty, product: products.find((p) => p.id === Number(id))! }))
    .filter((l) => l.product);
  const t = cartTotals(
    lines.map((l) => ({ unitPrice: l.product.price, qty: l.qty })),
    plan,
    "shop",
  );
  const ship = lines.length ? shippingFor(fulfilment, t.total, shipping) : 0;
  const toFree = fulfilment === "delivery" && shipping.freeOver > 0 && ship > 0 ? shipping.freeOver - t.total : 0;
  const change = (p: Product, d: number) => setCart((c) => ({ ...c, [p.id]: Math.max(0, Math.min(p.stock, 10, (c[p.id] ?? 0) + d)) }));
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <form action={action} className="grid gap-3.5">
      <input type="hidden" name="items" value={JSON.stringify(lines.map(({ productId, qty }) => ({ productId, qty })))} />
      <input type="hidden" name="fulfilment" value={fulfilment} />

      {categories.map((cat) => (
        <section key={cat} className="mx-4 grid gap-2 lg:mx-0 lg:grid-cols-2 lg:gap-3 xl:grid-cols-3">
          <h2 className="mt-1 text-[17px] font-bold capitalize text-forest lg:col-span-2 lg:text-[20px] xl:col-span-3">{cat}</h2>
          {products
            .filter((p) => p.category === cat)
            .map((p) => {
              const qty = cart[p.id] ?? 0;
              const out = p.stock <= 0;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2.5 rounded-[14px] border border-line bg-paper px-3 py-2.5">
                  {p.photo && (
                    <ProductImage
                      photo={p.photo}
                      name={p.name}
                      swatches={false}
                      sizes="72px"
                      className="w-[72px] shrink-0 overflow-hidden rounded-[10px] border border-line"
                    />
                  )}
                  <div className="min-w-0 flex-1">
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
                    <button
                      type="button"
                      aria-label={`Remove one ${p.name}`}
                      disabled={qty === 0}
                      onClick={() => change(p, -1)}
                      className="size-11 rounded-full border-[1.5px] border-forest text-[20px] text-forest disabled:opacity-35"
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center font-extrabold tabular-nums" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${p.name}`}
                      disabled={out || qty >= p.stock}
                      onClick={() => change(p, 1)}
                      className="size-11 rounded-full bg-forest text-[20px] text-cream disabled:opacity-35"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
        </section>
      ))}

      <section
        key={state.at ?? 0}
        className="mx-4 grid gap-3 rounded-[16px] border border-line bg-paper p-4 lg:mx-0 lg:max-w-[720px] lg:p-6"
        aria-labelledby="where"
      >
        <h2 id="where" className="text-[17px] font-bold text-forest">
          {fulfilment === "club" ? "Where in the club should we bring it?" : "Delivery address"}
        </h2>
        {fulfilment === "club" ? (
          <label className={lbl}>
            I’m at
            <select name="clubSpot" defaultValue={f.clubSpot ?? ""} required className={field}>
              <option value="" disabled>
                Choose a court or place
              </option>
              {spots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span className="text-[12.5px] font-normal text-muted">Staff bring it to you, usually within 15 minutes. No delivery charge.</span>
          </label>
        ) : (
          <>
            <label className={lbl}>
              House / flat no. and building
              <input name="line1" defaultValue={f.line1} autoComplete="address-line1" required minLength={5} className={field} />
            </label>
            <label className={lbl}>
              Street and area
              <input name="line2" defaultValue={f.line2} autoComplete="address-line2" required className={field} />
            </label>
            <label className={lbl}>
              Landmark (optional)
              <input name="landmark" defaultValue={f.landmark} className={field} />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={lbl}>
                City
                <input name="city" defaultValue={f.city} autoComplete="address-level2" required className={field} />
              </label>
              <label className={lbl}>
                PIN code
                <input
                  name="pincode"
                  defaultValue={f.pincode}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  pattern="[1-9][0-9]{5}"
                  maxLength={6}
                  required
                  className={field}
                />
              </label>
            </div>
            <label className={lbl}>
              State
              <select name="state" defaultValue={f.state ?? "Punjab"} className={field}>
                {INDIAN_STATES.map((st) => (
                  <option key={st}>{st}</option>
                ))}
              </select>
            </label>
            <label className={lbl}>
              Phone for the delivery
              <input name="phone" inputMode="tel" autoComplete="tel" defaultValue={f.phone ?? memberPhone} required className={field} />
            </label>
            <p className="text-[12.5px] text-muted">
              Shipping {inr(shipping.fee)}
              {shipping.freeOver > 0 ? `, free on orders of ${inr(shipping.freeOver)} or more` : ""}. Pay by cash or UPI when it arrives.
            </p>
          </>
        )}
      </section>

      <div className="sticky bottom-[68px] z-20 mx-3 grid gap-2.5 rounded-[20px] bg-forest-deep/90 px-4 py-3.5 text-white lg:bottom-6 lg:mx-auto lg:w-full lg:max-w-[720px]">
        <div role="radiogroup" aria-label="How do you want it" className="grid grid-cols-2 gap-2">
          {(["club", "delivery"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={fulfilment === f}
              onClick={() => setFulfilment(f)}
              className={`min-h-10 rounded-full border-[1.5px] text-[14px] font-bold ${fulfilment === f ? "border-ball bg-ball text-forest-deep" : "border-white/40 text-white"}`}
            >
              {f === "club" ? "In the club" : "Home delivery"}
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-2 text-[14px]">
          <span>
            {lines.reduce((n, l) => n + l.qty, 0)} items · {inr(t.subtotal)}
          </span>
          {t.discount > 0 && <span className="text-ball">−{inr(t.discount)} member price</span>}
        </div>
        {fulfilment === "delivery" && lines.length > 0 && (
          <div className="flex justify-between gap-2 text-[14px]">
            <span>Shipping{toFree > 0 ? ` · add ${inr(toFree)} more for free shipping` : ""}</span>
            <span className={ship ? "" : "text-ball"}>{ship ? inr(ship) : "Free"}</span>
          </div>
        )}
        {lines.length > 0 && (
          <div className="flex justify-between gap-2 text-[15px] font-bold">
            <span>Total</span>
            <span>{inr(t.total + ship)}</span>
          </div>
        )}
        {(state.ok || state.error) && (
          <p role="status" className={`rounded-[10px] px-2.5 py-2 text-[14px] ${state.error ? "bg-clay-soft text-[#7a2f14]" : "bg-[#e3efc7] text-[#2f4a0a]"}`}>
            {state.error ?? state.ok}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || lines.length === 0}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ball p-[13px] font-extrabold text-forest-deep disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Place order · {inr(t.total + ship)}
        </button>
      </div>
    </form>
  );
}
