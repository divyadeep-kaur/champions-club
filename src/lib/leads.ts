export const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "trial", label: "Trial booked" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Joined" },
] as const;

export type LeadStatus = (typeof STAGES)[number]["key"] | "lost";

export const stageIndex = (status: string) => STAGES.findIndex((s) => s.key === status);

export const stageLabel = (status: string) => (status === "lost" ? "Lost" : (STAGES.find((s) => s.key === status)?.label ?? status));

export function canMove(from: string, to: string) {
  if (from === to) return false;
  if (from === "won") return false;
  if (from === "lost") return to === "contacted";
  if (to === "lost") return true;
  const a = stageIndex(from);
  const b = stageIndex(to);
  return a >= 0 && b > a;
}
