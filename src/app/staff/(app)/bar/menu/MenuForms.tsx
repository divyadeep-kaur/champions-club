"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { fieldCls, labelCls } from "@/components/staff/ui";
import { AddTile } from "@/components/staff/AddTile";
import { addMenuItem, updateMenuItem, type MenuState } from "./actions";

const small = "min-h-10 border border-[#b5aa98] bg-white px-2.5 text-[14.5px] outline-none focus:border-forest";

export function AddItemForm({ categories, framed = true }: { categories: string[]; framed?: boolean }) {
  const [state, action, pending] = useActionState<MenuState, FormData>(addMenuItem, {});
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
    <form ref={ref} action={action} className={`grid gap-3 bg-paper p-5 ${framed ? "border border-line" : ""}`} noValidate>
      {framed && <h2 className="text-[18px] font-semibold">Add a new item</h2>}
      <label className={labelCls}>
        Item name
        <input name="name" defaultValue={f.name} placeholder="e.g. Mango Smoothie" required className={fieldCls} />
      </label>
      <div className="grid grid-cols-2 gap-3">
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
        <label className={labelCls}>
          Price (₹)
          <input name="price" type="number" min={1} defaultValue={f.price} required className={fieldCls} />
        </label>
      </div>
      {category === "" && (
        <label className={labelCls}>
          New category name
          <input name="newCategory" defaultValue={f.newCategory} placeholder="e.g. desserts" className={fieldCls} />
        </label>
      )}
      <div className="grid gap-1.5">
        <label htmlFor="new-photo" className="text-[14px] font-semibold">
          Photo <span className="font-normal text-muted">(optional, up to 1 MB)</span>
        </label>
        <div className="flex items-center gap-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={preview} alt="" className="size-14 border border-line object-cover" />
          )}
          <input
            id="new-photo"
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
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 bg-forest px-4 font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />} Add to menu
      </button>
      <p role="status" aria-live="polite" className={`min-h-5 text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
        {state.error ?? state.ok}
      </p>
    </form>
  );
}

export function ItemRow({ item, photo }: { item: { id: number; name: string; price: number; active: boolean }; photo: string | null }) {
  const [state, action, pending] = useActionState<MenuState, FormData>(updateMenuItem, {});
  return (
    <form
      action={action}
      className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 sm:grid-cols-[56px_minmax(0,1fr)_auto]"
    >
      <input type="hidden" name="id" value={item.id} />
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- built-in or uploaded photo
        <img src={photo} alt="" className={`size-14 border border-line object-cover ${item.active ? "" : "opacity-40"}`} />
      ) : (
        <span aria-hidden="true" className="grid size-14 place-items-center border border-dashed border-line text-[11px] text-muted">
          No photo
        </span>
      )}
      <div className="min-w-0">
        <p className={`font-semibold ${item.active ? "" : "text-muted line-through"}`}>{item.name}</p>
        <label className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
          {photo ? "Replace photo" : "Add photo"}
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="max-w-[190px] text-[12px]" />
        </label>
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
        <label className="flex items-center gap-1 text-[14px]">
          <span className="text-muted">₹</span>
          <input
            name="price"
            type="number"
            min={1}
            defaultValue={item.price}
            aria-label={`${item.name} price`}
            className={`${small} w-[90px] text-right tabular-nums`}
          />
        </label>
        <label className="sr-only" htmlFor={`a${item.id}`}>
          {item.name} availability
        </label>
        <select id={`a${item.id}`} name="active" defaultValue={item.active ? "yes" : "no"} className={small}>
          <option value="yes">On menu</option>
          <option value="no">Hidden</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 border-[1.5px] border-forest px-3 text-[14px] font-semibold text-forest hover:bg-forest/5 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {(state.error || state.ok) && <span className={`text-[13px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>{state.error ?? "✓"}</span>}
      </div>
    </form>
  );
}

// The "+" tile at the end of the café counter's menu grid.
export function AddMenuItemTile({ categories }: { categories: string[] }) {
  return (
    <AddTile label="Add new item" title="Add a café or bar item">
      {() => <AddItemForm categories={categories} framed={false} />}
    </AddTile>
  );
}
