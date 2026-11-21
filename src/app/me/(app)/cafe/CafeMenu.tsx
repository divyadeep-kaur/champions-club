"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { inr } from "@/lib/constants";
import { applyDiscount } from "@/lib/pricing";
import { orderFood, type MeState } from "../../actions";

type Item = { id: number; name: string; category: string; price: number };

export function CafeMenu({ menu, tables, defaultTable, discount }: { menu: Item[]; tables: { id: number; label: string }[]; defaultTable?: number; discount: number }) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [state, action, pending] = useActionState<MeState, FormData>(orderFood, {});

  useEffect(() => {
    if (state.ok) setCart({});
  }, [state]);

  const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ id: Number(id), qty }));
  const subtotal = lines.reduce((s, l) => s + (menu.find((m) => m.id === l.id)?.price ?? 0) * l.qty, 0);
  const total = applyDiscount(subtotal, discount);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const change = (id: number, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] ?? 0) + d)) }));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <label className="block">
        <span className="text-[13px] font-semibold text-muted">Where are you sitting?</span>
        <select name="tableId" defaultValue={defaultTable ?? ""} className="mt-1 w-full border border-line bg-paper px-3 py-3 text-[16px] outline-none focus:border-forest">
          <option value="">At the counter</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {(["drinks", "food"] as const).map((cat) => (
        <section key={cat}>
          <h2 className="font-serif text-[22px] font-medium capitalize text-forest">{cat}</h2>
          <ul className="mt-2 divide-y divide-line border border-line bg-paper">
            {menu
              .filter((m) => m.category === cat)
              .map((m) => {
                const qty = cart[m.id] ?? 0;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-[14px] tabular-nums text-muted">
                        {discount ? (
                          <>
                            <span className="text-ink">{inr(applyDiscount(m.price, discount))}</span> <s>{inr(m.price)}</s>
                          </>
                        ) : (
                          inr(m.price)
                        )}
                      </p>
                    </div>
                    {qty === 0 ? (
                      <button type="button" onClick={() => change(m.id, 1)} className="border border-forest px-4 py-1.5 text-[14px] font-semibold text-forest">
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center border border-forest">
                        <button type="button" aria-label={`One less ${m.name}`} onClick={() => change(m.id, -1)} className="grid size-9 place-items-center text-forest">
                          <Minus className="size-4" />
                        </button>
                        <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">
                          {qty}
                        </span>
                        <button type="button" aria-label={`One more ${m.name}`} onClick={() => change(m.id, 1)} className="grid size-9 place-items-center text-forest">
                          <Plus className="size-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      <p role="status" aria-live="polite" className={`min-h-5 text-[14.5px] font-medium ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
        {state.error ?? state.ok}
      </p>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[64px] z-20 mx-auto max-w-[560px] px-3">
          <div className="flex items-center justify-between gap-3 border border-forest bg-forest p-3 pl-4 text-cream shadow-[0_-12px_40px_-12px_rgba(11,42,29,0.5)]">
            <div>
              <p className="text-[13px] text-cream/75">
                {count} {count === 1 ? "item" : "items"}
                {discount ? ` · ${inr(subtotal - total)} off` : ""}
              </p>
              <p className="font-serif text-[22px] font-semibold leading-none">{inr(total)}</p>
            </div>
            <button type="submit" disabled={pending} className="inline-flex items-center gap-2 bg-cream px-5 py-3 text-[15.5px] font-semibold text-forest disabled:opacity-70">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Add to my tab
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
