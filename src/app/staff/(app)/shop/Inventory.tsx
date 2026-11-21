"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Plus, X } from "lucide-react";
import { inr } from "@/lib/constants";
import type { ProductPhoto } from "@/lib/productPhotos";
import { fieldCls, labelCls } from "@/components/staff/ui";
import { PhotoPicker } from "@/components/staff/PhotoPicker";
import { addProduct, restockProduct, setProductPhoto, type InventoryState } from "./actions";

type Item = {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStockAt: number;
  held: number;
  photo: ProductPhoto | null;
};

const small = "min-h-10 border border-[#b5aa98] bg-white px-2.5 text-[14.5px] outline-none focus:border-forest";

function Restock({ item }: { item: Item }) {
  const [state, action, pending] = useActionState<InventoryState, FormData>(restockProduct, {});
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setOpen(false);
    }
  }, [state.ok, state.at]);

  return (
    <div className="grid justify-items-start gap-1.5">
      {open ? (
        <form ref={ref} action={action} className="grid gap-2 border border-line bg-cream p-3" aria-label={`Restock ${item.name}`}>
          <input type="hidden" name="productId" value={item.id} />
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-[12.5px] font-semibold text-muted">
              Quantity
              <input name="qty" type="number" min={1} max={1000} defaultValue={Math.max(5, item.lowStockAt * 2)} required className={`${small} w-[90px]`} />
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold text-muted">
              Cost paid (₹, optional)
              <input name="cost" type="number" min={1} className={`${small} w-[130px]`} />
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold text-muted">
              Supplier (optional)
              <input name="supplier" maxLength={80} className={`${small} w-[160px]`} />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center gap-2 bg-forest px-3.5 text-[14px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />} Add stock
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-10 px-2 text-[14px] text-muted hover:text-ink">
              Cancel
            </button>
          </div>
          {state.error && (
            <p role="alert" className="text-[13.5px] font-semibold text-clay">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Restock ${item.name}`}
          className="min-h-10 border-[1.5px] border-forest px-3 text-[14px] font-semibold text-forest hover:bg-forest/5"
        >
          Restock
        </button>
      )}
      {state.ok && !open && (
        <p role="status" className="text-[13px] font-semibold text-[#4d7a12]">
          {state.ok}
        </p>
      )}
    </div>
  );
}

export function AddProduct({ categories, onClose, framed = true }: { categories: string[]; onClose: () => void; framed?: boolean }) {
  const [state, action, pending] = useActionState<InventoryState, FormData>(addProduct, {});
  // React clears a form after every submit, so the photo box starts fresh each time too.
  const [round, setRound] = useState(0);
  useEffect(() => setRound((r) => r + 1), [state]);
  const [category, setCategory] = useState(categories[0] ?? "");
  const ref = useRef<HTMLFormElement>(null);
  const f = state.fields ?? {};
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state.at]);

  return (
    <form ref={ref} action={action} className={`grid gap-3 bg-paper p-5 ${framed ? "border border-forest" : ""}`} noValidate>
      {framed && (
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold">Add a new product</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center text-muted hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
      )}
      <PhotoPicker key={round} label="Product photo" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`${labelCls} sm:col-span-2`}>
          Product name
          <input name="name" defaultValue={f.name} placeholder="e.g. Padel Balls (can of 3)" required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Category
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c[0]!.toUpperCase() + c.slice(1)}
              </option>
            ))}
            <option value="">New category…</option>
          </select>
        </label>
        {category === "" ? (
          <label className={labelCls}>
            New category name
            <input name="newCategory" defaultValue={f.newCategory} placeholder="e.g. bags" className={fieldCls} />
          </label>
        ) : (
          <span className="hidden sm:block" />
        )}
        <label className={labelCls}>
          Price (₹)
          <input name="price" type="number" min={1} defaultValue={f.price} required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Opening stock
          <input name="stock" type="number" min={0} defaultValue={f.stock ?? "0"} required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Warn when stock is at or below
          <input name="lowStockAt" type="number" min={0} defaultValue={f.lowStockAt ?? "5"} className={fieldCls} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 bg-forest px-5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Add product
        </button>
        <p role="status" aria-live="polite" className={`text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
          {state.error ?? state.ok}
        </p>
      </div>
      <p className="text-[13px] text-muted">A product code is created automatically. The product appears at the counter and in the member app straight away.</p>
    </form>
  );
}

// Product photo in the inventory table. Picking a file saves it straight away.
function PhotoCell({ item }: { item: Item }) {
  const [state, action, pending] = useActionState<InventoryState, FormData>(setProductPhoto, {});
  const form = useRef<HTMLFormElement>(null);
  const id = `photo-${item.id}`;
  return (
    <form ref={form} action={action} className="grid shrink-0 justify-items-center gap-1">
      <input type="hidden" name="productId" value={item.id} />
      <label htmlFor={id} className="relative block size-12 cursor-pointer" title={item.photo ? "Change photo" : "Add photo"}>
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- built-in or uploaded photo
          <img
            src={item.photo.src}
            alt=""
            className={`size-12 border border-line bg-white ${item.photo.fit === "cover" ? "object-cover" : "object-contain"}`}
          />
        ) : (
          <span aria-hidden="true" className="grid size-12 place-items-center border border-dashed border-forest/40 text-forest">
            <Camera className="size-5" />
          </span>
        )}
        {pending && (
          <span className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="size-4 animate-spin" />
          </span>
        )}
      </label>
      <label htmlFor={id} className="cursor-pointer text-[11.5px] font-semibold text-forest underline underline-offset-2">
        {item.photo ? "Change" : "Add photo"}
      </label>
      <input
        id={id}
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={`${item.photo ? "Change" : "Add"} photo for ${item.name}`}
        className="sr-only"
        onChange={(e) => e.target.files?.length && form.current?.requestSubmit()}
      />
      {state.error && (
        <span role="alert" className="max-w-[120px] text-center text-[11.5px] font-semibold text-clay">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function Inventory({ items }: { items: Item[] }) {
  const [adding, setAdding] = useState(false);
  const categories = [...new Set(["accessories", "apparel", "balls", "rackets", "shoes", ...items.map((i) => i.category)])].sort();
  const totalUnits = items.reduce((t, i) => t + i.stock, 0);
  const value = items.reduce((t, i) => t + i.stock * i.price, 0);

  return (
    <div className="grid content-start gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14.5px] text-muted">
          {items.length} products · {totalUnits} items in stock · worth {inr(value)} at shop prices
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-11 items-center gap-2 bg-forest px-4 font-semibold text-cream hover:bg-forest-deep"
          >
            <Plus className="size-[18px]" aria-hidden="true" /> Add product
          </button>
        )}
      </div>
      {adding && <AddProduct categories={categories} onClose={() => setAdding(false)} />}

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[820px] text-left text-[14.5px]">
          <caption className="sr-only">Shop inventory</caption>
          <thead className="text-[13.5px] text-muted">
            <tr>
              {["Product", "Category", "Price", "In stock", "Restock"].map((h) => (
                <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line">
            {items.map((i) => {
              const low = i.stock <= i.lowStockAt;
              return (
                <tr key={i.id} className="align-top">
                  <td className="px-3.5 py-3">
                    <span className="flex items-center gap-3">
                      <PhotoCell item={i} />
                      <span>
                        <strong>{i.name}</strong>
                        <span className="block text-[12.5px] text-muted">{i.sku}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3.5 py-3 capitalize">{i.category}</td>
                  <td className="px-3.5 py-3 tabular-nums">{inr(i.price)}</td>
                  <td className="px-3.5 py-3">
                    <strong className={`tabular-nums ${i.stock === 0 ? "text-muted" : low ? "text-clay" : "text-[#4d7a12]"}`}>
                      {i.stock === 0 ? "Sold out" : i.stock}
                    </strong>
                    {low && i.stock > 0 && <span className="block text-[12.5px] text-clay">Low (alert at {i.lowStockAt})</span>}
                    {i.held > 0 && <span className="block text-[12.5px] text-muted">{i.held} held for pickup</span>}
                  </td>
                  <td className="px-3.5 py-3">
                    <Restock item={i} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
