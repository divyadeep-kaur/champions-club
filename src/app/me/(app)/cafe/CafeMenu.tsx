"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { inr } from "@/lib/constants";
import { applyDiscount } from "@/lib/pricing";
import { orderFood, type MeState } from "../../actions";

type Item = { id: number; name: string; category: string; price: number };

export function CafeMenu({
  menu,
  tables,
  defaultTable,
  discount,
  openTab,
}: {
  menu: Item[];
  tables: { id: number; label: string }[];
  defaultTable?: number;
  discount: number;
  openTab: { subtotal: number } | null;
}) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [state, action, pending] = useActionState<MeState, FormData>(orderFood, {});

  useEffect(() => {
    if (state.ok) setCart({});
  }, [state]);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ id: Number(id), qty }));
  const orderSub = lines.reduce((s, l) => s + (menu.find((m) => m.id === l.id)?.price ?? 0) * l.qty, 0);
  const before = openTab?.subtotal ?? 0;
  const after = applyDiscount(before + orderSub, discount);
  const saved = before + orderSub - after;
  const change = (id: number, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] ?? 0) + d)) }));

  return (
    <form action={action} className="grid gap-3.5">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <label className="mx-4 grid gap-1.5 text-[14px] font-bold">
        Your table
        <select
          name="tableId"
          defaultValue={defaultTable ?? ""}
          className="min-h-12 rounded-xl border border-[#b5aa98] bg-white p-3 font-normal outline-none focus:border-forest"
        >
          <option value="">At the counter</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {(["drinks", "food"] as const).map((cat) => (
        <section key={cat} className="mx-4 grid gap-2">
          <h2 className="mt-1 text-[17px] font-bold capitalize text-forest">{cat}</h2>
          {menu
            .filter((m) => m.category === cat)
            .map((m) => {
              const qty = cart[m.id] ?? 0;
              return (
                <div key={m.id} className="flex items-center justify-between gap-2.5 rounded-[14px] border border-line bg-paper px-3 py-2.5">
                  <div>
                    <strong className="text-[15px]">{m.name}</strong>
                    <div className="text-[13.5px] tabular-nums text-muted">
                      {inr(m.price)}
                      {discount ? ` · ${inr(applyDiscount(m.price, discount))} for you` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Remove one ${m.name}`}
                      disabled={qty === 0}
                      onClick={() => change(m.id, -1)}
                      className="size-11 rounded-full border-[1.5px] border-forest text-[20px] text-forest disabled:opacity-35"
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center font-extrabold tabular-nums" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${m.name}`}
                      onClick={() => change(m.id, 1)}
                      className="size-11 rounded-full bg-forest text-[20px] text-cream"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
        </section>
      ))}

      <div className="sticky bottom-[68px] z-20 mx-3 grid gap-2 rounded-[20px] bg-forest-deep/90 px-4 py-3.5 text-white">
        <div className="flex justify-between gap-2 text-[14px]">
          <span>
            Open tab {inr(before)} + this order {inr(orderSub)}
          </span>
          {saved > 0 && <span className="text-ball">−{inr(saved)}</span>}
        </div>
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
          Send to kitchen · tab {inr(after)}
        </button>
      </div>
    </form>
  );
}
