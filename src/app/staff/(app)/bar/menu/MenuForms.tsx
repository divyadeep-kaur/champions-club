"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { fieldCls, labelCls } from "@/components/staff/ui";
import { AddTile } from "@/components/staff/AddTile";
import { CategoryField } from "@/components/staff/CategoryField";
import { PhotoPicker } from "@/components/staff/PhotoPicker";
import { addMenuItem, editMenuItem, updateMenuItem, type MenuState } from "./actions";

const small = "min-h-10 border border-[#b5aa98] bg-white px-2.5 text-[14.5px] outline-none focus:border-forest";

export function AddItemForm({ categories, framed = true }: { categories: string[]; framed?: boolean }) {
  const [state, action, pending] = useActionState<MenuState, FormData>(addMenuItem, {});
  // React clears a form after every submit, so the photo box starts fresh each time too.
  const [round, setRound] = useState(0);
  useEffect(() => setRound((r) => r + 1), [state]);
  const ref = useRef<HTMLFormElement>(null);
  const f = state.fields ?? {};
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
    }
  }, [state.ok, state.at]);

  return (
    <form ref={ref} action={action} className={`grid gap-3 bg-paper p-5 ${framed ? "border border-line" : ""}`} noValidate>
      {framed && <h2 className="text-[18px] font-semibold">Add a new item</h2>}
      <PhotoPicker key={round} label="Item photo" />
      <label className={labelCls}>
        Item name
        <input name="name" defaultValue={f.name} placeholder="e.g. Mango Smoothie" required className={fieldCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <CategoryField key={round} categories={categories} initial={f.category} newCategory={f.newCategory} placeholder="e.g. desserts" />
        <label className={labelCls}>
          Price (₹)
          <input name="price" type="number" min={1} defaultValue={f.price} required className={fieldCls} />
        </label>
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

type MenuRow = { id: number; name: string; category: string; price: number; active: boolean };

function EditItemForm({ item, photo, categories, onDone }: { item: MenuRow; photo: string | null; categories: string[]; onDone: (msg: string) => void }) {
  const [state, action, pending] = useActionState<MenuState, FormData>(editMenuItem, {});
  // React clears a form after every submit; remounting the fields keeps the category right.
  const [round, setRound] = useState(0);
  useEffect(() => setRound((r) => r + 1), [state]);
  const f = state.fields ?? {};
  useEffect(() => {
    if (state.ok) onDone(state.ok);
  }, [state.ok, state.at, onDone]);

  return (
    <form action={action} className="grid gap-3 border-t border-dashed border-line bg-cream px-4 py-4" noValidate aria-label={`Edit ${item.name}`}>
      <input type="hidden" name="id" value={item.id} />
      <PhotoPicker key={round} current={photo} label="Item photo" />
      <div key={round} className="grid gap-3 sm:grid-cols-2">
        <label className={`${labelCls} sm:col-span-2`}>
          Item name
          <input name="name" defaultValue={f.name ?? item.name} required className={fieldCls} />
        </label>
        <CategoryField key={round} categories={categories} initial={f.category ?? item.category} newCategory={f.newCategory} placeholder="e.g. desserts" />
        <label className={labelCls}>
          Price (₹)
          <input name="price" type="number" min={1} defaultValue={f.price ?? item.price} required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Availability
          <select name="active" defaultValue={f.active ?? (item.active ? "yes" : "no")} className={fieldCls}>
            <option value="yes">On menu</option>
            <option value="no">Hidden</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 bg-forest px-5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Save changes
        </button>
        <button type="button" onClick={() => onDone("")} className="min-h-11 px-2 text-[14.5px] text-muted hover:text-ink">
          Cancel
        </button>
        {state.error && (
          <p role="alert" className="text-[14px] font-semibold text-clay">
            {state.error}
          </p>
        )}
      </div>
      <p className="text-[13px] text-muted">A new price applies to new orders. Items already on a tab keep the price they were added at.</p>
    </form>
  );
}

export function ItemRow({ item, photo, categories }: { item: MenuRow; photo: string | null; categories: string[] }) {
  const [state, action, pending] = useActionState<MenuState, FormData>(updateMenuItem, {});
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState("");
  const done = useCallback((msg: string) => {
    setEditing(false);
    setSaved(msg);
  }, []);

  return (
    <div className="border-t border-line first:border-t-0">
      <form action={action} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[56px_minmax(0,1fr)_auto]">
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
          {saved && !editing && <p className="text-[13px] font-semibold text-[#4d7a12]">{saved}</p>}
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1">
          <label className="flex items-center gap-1 text-[14px]">
            <span className="text-muted">₹</span>
            <input
              key={item.price}
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
          <select key={String(item.active)} id={`a${item.id}`} name="active" defaultValue={item.active ? "yes" : "no"} className={small}>
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
          <button
            type="button"
            onClick={() => {
              setSaved("");
              setEditing((e) => !e);
            }}
            aria-expanded={editing}
            aria-label={`Edit ${item.name}`}
            className="inline-flex min-h-10 items-center gap-1.5 px-2 text-[14px] font-semibold text-forest underline-offset-4 hover:underline"
          >
            <Pencil className="size-3.5" aria-hidden="true" /> Edit
          </button>
          {(state.error || state.ok) && (
            <span className={`text-[13px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>{state.error ?? "✓"}</span>
          )}
        </div>
      </form>
      {editing && <EditItemForm item={item} photo={photo} categories={categories} onDone={done} />}
    </div>
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
