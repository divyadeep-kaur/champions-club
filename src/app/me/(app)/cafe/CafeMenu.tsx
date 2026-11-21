"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { inr } from "@/lib/constants";
import { applyDiscount } from "@/lib/pricing";
import { orderFood, type MeState } from "../../actions";

type Item = { id: number; name: string; category: string; price: number; photo: string | null };

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
  const [table, setTable] = useState(defaultTable ? String(defaultTable) : "");
  const categories = [...new Set(["drinks", "food", ...menu.map((m) => m.category)])].filter((c) => menu.some((m) => m.category === c));
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
      <input type="hidden" name="tableId" value={table} />
      <section aria-labelledby="table-title" className="mx-4 grid gap-2 lg:mx-0">
        <h2 id="table-title" className="text-[17px] font-bold text-forest lg:text-[20px]">
          Where are you sitting?
        </h2>
        <div role="radiogroup" aria-labelledby="table-title" className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
          {[{ id: "", label: "Counter" }, ...tables.map((t) => ({ id: String(t.id), label: t.label }))].map((t) => (
            <button
              key={t.id || "counter"}
              type="button"
              role="radio"
              aria-checked={table === t.id}
              onClick={() => setTable(t.id)}
              className={`min-h-14 rounded-[14px] border-[1.5px] px-2 text-center font-serif text-[18px] ${table === t.id ? "border-forest bg-forest text-cream" : "border-line bg-paper text-ink hover:border-forest"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {categories.map((cat) => (
        <section key={cat} className="mx-4 grid gap-2.5 lg:mx-0">
          <h2 className="mt-1 text-[17px] font-bold capitalize text-forest lg:text-[20px]">{cat}</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] lg:gap-3">
            {menu
              .filter((m) => m.category === cat)
              .map((m) => {
                const qty = cart[m.id] ?? 0;
                return (
                  <article
                    key={m.id}
                    className={`group flex flex-col overflow-hidden rounded-[14px] border bg-paper transition-colors ${qty ? "border-forest" : "border-line hover:border-forest"}`}
                  >
                    <button
                      type="button"
                      onClick={() => change(m.id, 1)}
                      aria-label={`Add one ${m.name}`}
                      className="relative block aspect-[4/3] overflow-hidden bg-forest-deep"
                    >
                      {m.photo ? (
                        <Image
                          src={m.photo}
                          alt=""
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 220px, 50vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="grid h-full place-items-center font-serif text-[30px] text-cream/80">{m.name.slice(0, 1)}</span>
                      )}
                      {qty > 0 && (
                        <span
                          key={qty}
                          className="cc-pop-in absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-ball text-[14px] font-extrabold text-forest-deep shadow"
                        >
                          {qty}
                        </span>
                      )}
                    </button>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div>
                        <strong className="block text-[15px] leading-snug">{m.name}</strong>
                        <span className="text-[13.5px] tabular-nums text-muted">
                          {discount ? (
                            <>
                              <span className="font-semibold text-ink">{inr(applyDiscount(m.price, discount))}</span> <s>{inr(m.price)}</s>
                            </>
                          ) : (
                            inr(m.price)
                          )}
                        </span>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <button
                          type="button"
                          aria-label={`Remove one ${m.name}`}
                          disabled={qty === 0}
                          onClick={() => change(m.id, -1)}
                          className="size-10 rounded-full border-[1.5px] border-forest text-[20px] text-forest disabled:opacity-35"
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
                          className="size-10 rounded-full bg-forest text-[20px] text-cream"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-[68px] z-20 mx-3 grid gap-2 rounded-[20px] bg-forest-deep/90 px-4 py-3.5 text-white lg:bottom-6 lg:mx-auto lg:w-full lg:max-w-[680px]">
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
