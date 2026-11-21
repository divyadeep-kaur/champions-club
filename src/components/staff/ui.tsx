export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-serif text-[32px] font-semibold leading-tight text-forest sm:text-[36px]">{title}</h1>
        {description && <p className="mt-1.5 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "warn" }) {
  return (
    <div className="border border-line bg-paper p-5">
      <p className="text-[14px] text-muted">{label}</p>
      <p className={`mt-1.5 font-serif text-[30px] leading-tight ${tone === "warn" ? "text-clay" : "text-forest"}`}>{value}</p>
      {hint && <p className="mt-2 text-[13.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto border border-line bg-paper">
      <table className="w-full min-w-[640px] text-left text-[14.5px]">
        <thead className="text-[14.5px] text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-line">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-muted">Nothing here yet.</p>}
    </div>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-3 align-middle ${className}`}>{children}</td>;
}

const badgeTones: Record<string, string> = {
  green: "bg-[#e3f1c9] text-[#3d5a12]",
  clay: "bg-clay-soft text-[#9a3b19]",
  gray: "bg-[#ebe5d8] text-muted",
  gold: "bg-[#f6e7b8] text-[#7a5a06]",
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: keyof typeof badgeTones }) {
  return <span className={`inline-flex items-center px-2 py-0.5 text-[12.5px] font-semibold ${badgeTones[tone]}`}>{children}</span>;
}

export function ComingNext({ items }: { items: string[] }) {
  return (
    <div className="border border-dashed border-line p-5 text-[14px] text-muted">
      <p className="font-semibold text-ink">Next for this module</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export const fieldCls =
  "min-h-11 w-full border border-[#b5aa98] bg-white p-3 text-[15px] font-normal text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
export const labelCls = "grid gap-1.5 text-[14px] font-semibold";
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 bg-forest px-4 py-2.5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-70";
export const btnOutline =
  "inline-flex min-h-11 items-center justify-center gap-2 border-[1.5px] border-forest px-4 py-2.5 font-semibold text-forest hover:bg-forest/5 disabled:opacity-70";
