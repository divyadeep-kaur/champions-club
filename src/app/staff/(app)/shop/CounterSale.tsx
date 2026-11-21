"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { inr } from "@/lib/constants";
import { cartTotals } from "@/lib/checkout";
import { counterSale, type SaleState } from "./actions";

type Product = { id: number; name: string; category: string; price: number; stock: number; lowStockAt: number; held: number };
type MemberOpt = { code: string; name: string; plan: string; shopDiscount: number; courtRate: number; barDiscount: number; expired: boolean };

const methods = [
  { v: "upi", l: "UPI" },
  { v: "card", l: "Card" },
  { v: "cash", l: "Cash" },
] as const;

export function CounterSale({ products, members }: { products: Product[]; members: MemberOpt[] }) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [memberRef, setMemberRef] = useState("");
  const [method, setMethod] = useState<"upi" | "card" | "cash">("upi");
  const [state, action, pending] = useActionState<SaleState, FormData>(counterSale, {});

  useEffect(() => {
    if (state.ok) {
      setCart({});
      setMemberRef("");
    }
  }, [state.ok, state.at]);

  const code = memberRef.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
  const member = members.find((m) => m.code === code);
  const plan = member && !member.expired ? member : null;
  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ productId: Number(id), qty, product: products.find((p) => p.id === Number(id))! }))
    .filter((l) => l.product);
  const totals = cartTotals(lines.map((l) => ({ unitPrice: l.product.price, qty: l.qty })), plan, "shop");
  const add = (p: Product, d: number) => setCart((c) => ({ ...c, [p.id]: Math.max(0, Math.min(p.stock, (c[p.id] ?? 0) + d)) }));

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="grid min-w-0 flex-[999_1_520px] grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3.5">
        {products.map((p) => {
          const inCart = cart[p.id] ?? 0;
          const left = p.stock - inCart;
          const low = p.stock <= p.lowStockAt;
          return (
            <div key={p.id} className="grid gap-2 border border-line bg-paper p-4">
              <div className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#8a6d3b]">{p.category}</div>
              <div className="min-h-[42px] font-semibold">{p.name}</div>
              <div className="flex justify-between text-[14.5px]">
                <span className="tabular-nums">{inr(p.price)}</span>
                <span className={`font-semibold ${p.stock <= 0 ? "text-muted" : low ? "text-[#a8411f]" : "text-[#4d7a12]"}`}>{p.stock <= 0 ? "Sold out" : `${left} left`}</span>
              </div>
              {p.held > 0 && <div className="text-[13px] text-muted">{p.held} held for pickup</div>}
              <button type="button" disabled={left <= 0} onClick={() => add(p, 1)} className="min-h-11 border-[1.5px] border-forest p-2.5 font-semibold text-forest hover:bg-forest/5 disabled:border-line disabled:text-muted">
                {inCart ? `Add another (${inCart})` : "Add"}
              </button>
            </div>
          );
        })}
      </div>

      <form action={action} className="grid min-w-0 flex-[1_1_320px] gap-3.5 border border-line bg-paper p-[22px]">
        <input type="hidden" name="items" value={JSON.stringify(lines.map(({ productId, qty }) => ({ productId, qty })))} />
        <input type="hidden" name="method" value={method} />
        <h2 className="font-serif text-[24px] text-forest">Counter sale</h2>
        <label className="grid gap-1.5 text-[14px] font-semibold">
          Member (optional)
          <input name="member" list="shop-members" value={memberRef} onChange={(e) => setMemberRef(e.target.value)} placeholder="Name, phone or CC- code" autoComplete="off" className="min-h-11 border border-[#b5aa98] bg-white p-3 font-normal outline-none focus:border-forest" />
          <datalist id="shop-members">
            {members.map((m) => (
              <option key={m.code} value={`${m.code} · ${m.name}`}>
                {m.plan}
              </option>
            ))}
          </datalist>
          {member && (
            <span className={`text-[13.5px] font-normal ${member.expired ? "text-clay" : "text-[#4d7a12]"}`}>
              {member.name} · {member.plan}, {member.expired ? "membership expired, no discount" : `${member.shopDiscount}% off`}
            </span>
          )}
        </label>

        {lines.length === 0 && <p className="text-[14.5px] text-muted">Add products to start a sale.</p>}
        {lines.map((l) => (
          <div key={l.productId} className="flex items-center justify-between gap-2 border-b border-[#ece5d6] py-2 text-[15px]">
            <span className="flex items-center gap-2">
              <button type="button" aria-label={`One less ${l.product.name}`} onClick={() => add(l.product, -1)} className="grid size-7 place-items-center border border-line text-muted hover:border-forest hover:text-forest">
                −
              </button>
              {l.qty} × {l.product.name}
            </span>
            <span className="tabular-nums">{inr(l.product.price * l.qty)}</span>
          </div>
        ))}

        <div className="grid gap-1.5 text-[15px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{inr(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#4d7a12]">
            <span>Member discount</span>
            <span className="tabular-nums">− {inr(totals.discount)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-[20px] font-bold">
            <span>Total</span>
            <span className="tabular-nums">{inr(totals.total)}</span>
          </div>
        </div>

        <div role="group" aria-label="Payment method" className="grid grid-cols-3 gap-2">
          {methods.map((m) => (
            <button key={m.v} type="button" aria-pressed={method === m.v} onClick={() => setMethod(m.v)} className={`min-h-11 border-[1.5px] border-forest p-2.5 font-semibold ${method === m.v ? "bg-forest text-cream" : "text-forest"}`}>
              {m.l}
            </button>
          ))}
        </div>
        <button type="submit" disabled={pending || lines.length === 0} className="flex min-h-12 items-center justify-center gap-2 bg-forest p-3.5 text-[16px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Take payment
        </button>
        {(state.ok || state.error) && (
          <p role="status" className={`px-3 py-2.5 text-[14.5px] ${state.error ? "bg-clay-soft text-[#7a2f14]" : "bg-[#e3efc7] text-[#2f4a0a]"}`}>
            {state.error ?? state.ok}
          </p>
        )}
      </form>
    </div>
  );
}
