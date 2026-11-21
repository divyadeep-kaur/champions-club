import Link from "next/link";
import { db } from "@/lib/db";
import { menuPhoto } from "@/lib/menuPhotos";
import { requireStaff } from "@/lib/session";
import { AddItemForm, ItemRow } from "./MenuForms";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  await requireStaff(["owner", "bar"]);
  const items = await db.menuItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const categories = [...new Set(["drinks", "food", ...items.map((i) => i.category)])];

  return (
    <div className="grid content-start gap-5">
      <Link href="/staff/bar" className="text-[14px] font-semibold text-forest">
        ← Café &amp; bar
      </Link>
      <div>
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Café menu</h1>
        <p className="mt-1.5 text-muted">Add new items, change prices and hide what’s unavailable. Hidden items stay in old bills.</p>
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <div className="grid min-w-0 flex-[999_1_520px] gap-4">
          {categories
            .filter((c) => items.some((i) => i.category === c))
            .map((c) => {
              const list = items.filter((i) => i.category === c);
              return (
                <section key={c} className="border border-line bg-paper">
                  <h2 className="flex items-baseline justify-between border-b border-line px-4 py-3 text-[17px] font-semibold capitalize">
                    {c}
                    <span className="text-[13.5px] font-normal normal-case text-muted">
                      {list.filter((i) => i.active).length} on menu{list.some((i) => !i.active) ? ` · ${list.filter((i) => !i.active).length} hidden` : ""}
                    </span>
                  </h2>
                  {list.map((i) => (
                    <ItemRow key={i.id} item={{ id: i.id, name: i.name, price: i.price, active: i.active }} photo={menuPhoto(i)} />
                  ))}
                </section>
              );
            })}
          {items.length === 0 && (
            <p className="border border-dashed border-line bg-paper px-4 py-10 text-center text-muted">The menu is empty. Add your first item.</p>
          )}
        </div>
        <div className="min-w-0 flex-[1_1_320px]">
          <AddItemForm categories={categories} />
        </div>
      </div>
    </div>
  );
}
