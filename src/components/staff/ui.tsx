export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <h1 className="font-serif text-[34px] font-semibold leading-none tracking-[-0.02em] text-forest sm:text-[40px]">{title}</h1>
        {description && <p className="mt-2 text-[15px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "warn" }) {
  return (
    <div className="border border-line bg-paper p-5">
      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className={`mt-2 font-serif text-[32px] font-semibold leading-none tracking-[-0.02em] ${tone === "warn" ? "text-clay" : "text-forest"}`}>{value}</p>
      {hint && <p className="mt-2 text-[13.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto border border-line bg-paper">
      <table className="w-full min-w-[640px] text-left text-[14.5px]">
        <thead className="border-b border-line bg-cream/60 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-muted">Nothing here yet.</p>}
    </div>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
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
