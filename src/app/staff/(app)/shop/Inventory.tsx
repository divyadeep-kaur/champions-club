"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { inr } from "@/lib/constants";
import type { ProductPhoto } from "@/lib/productPhotos";
import { fieldCls, labelCls } from "@/components/staff/ui";
import { addProduct, restockProduct, type InventoryState } from "./actions";

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

function AddProduct({ categories, onClose }: { categories: string[]; onClose: () => void }) {
  const [state, action, pending] = useActionState<InventoryState, FormData>(addProduct, {});
  const [category, setCategory] = useState(categories[0] ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const f = state.fields ?? {};
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setPreview(null);
    }
  }, [state.ok, state.at]);

  return (
    <form ref={ref} action={action} className="grid gap-3 border border-forest bg-paper p-5" noValidate>
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold">Add a new product</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center text-muted hover:text-ink">
          <X className="size-5" />
        </button>
      </div>
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
        <div className="grid gap-1.5">
          <label htmlFor="product-photo" className="text-[14px] font-semibold">
            Photo <span className="font-normal text-muted">(optional, up to 1 MB)</span>
          </label>
          <div className="flex items-center gap-3">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- local preview
              <img src={preview} alt="" className="size-12 border border-line object-contain" />
            )}
            <input
              id="product-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
              className="text-[14px] file:mr-3 file:min-h-10 file:cursor-pointer file:border-[1.5px] file:border-forest file:bg-transparent file:px-3 file:font-semibold file:text-forest"
            />
          </div>
        </div>
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
                      {i.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- built-in or uploaded photo
                        <img
                          src={i.photo.src}
                          alt=""
                          className={`size-12 shrink-0 border border-line bg-white ${i.photo.fit === "cover" ? "object-cover" : "object-contain"}`}
                        />
                      ) : (
                        <span aria-hidden="true" className="size-12 shrink-0 border border-dashed border-line" />
                      )}
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
