import type { MemberState } from "@/lib/membership";

const tones: Record<MemberState, string> = {
  active: "bg-[#e3f1c9] text-[#3d5a12]",
  ending: "bg-[#f6e7b8] text-[#7a5a06]",
  expired: "bg-clay-soft text-[#9a3b19]",
  suspended: "bg-[#ebe5d8] text-[#4b4b4b]",
};

export function StateBadge({ state, children }: { state: MemberState; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-2 py-0.5 text-[12.5px] font-semibold ${tones[state]}`}>{children}</span>;
}
