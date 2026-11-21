import { requireStaff } from "@/lib/session";
import { MoneyTabs } from "./MoneyTabs";

export default async function MoneyLayout({ children }: { children: React.ReactNode }) {
  await requireStaff(["owner"]);
  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Income</h1>
        <MoneyTabs />
      </div>
      {children}
    </div>
  );
}
