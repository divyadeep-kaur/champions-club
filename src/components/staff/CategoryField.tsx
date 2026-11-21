"use client";

import { useState } from "react";
import { fieldCls, labelCls } from "@/components/staff/ui";

// Category picker with a "New category…" option. Give it a new key after each submit:
// React resets the form then, and remounting keeps the picker showing the right choice.
export function CategoryField({
  categories,
  initial,
  newCategory,
  placeholder,
}: {
  categories: string[];
  initial?: string;
  newCategory?: string;
  placeholder: string;
}) {
  const [category, setCategory] = useState(initial ?? categories[0] ?? "");
  return (
    <>
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
          <input name="newCategory" defaultValue={newCategory} placeholder={placeholder} className={fieldCls} />
        </label>
      ) : (
        <span className="hidden sm:block" />
      )}
    </>
  );
}
