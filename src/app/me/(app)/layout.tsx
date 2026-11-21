import { requireMember } from "@/lib/memberSession";
import { MemberTabs } from "./MemberTabs";

export const metadata = { title: "My club · The Champions Club" };

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  return (
    <div className="mx-auto min-h-[100svh] max-w-[560px] bg-cream pb-[72px]">
      {children}
      <MemberTabs />
    </div>
  );
}
