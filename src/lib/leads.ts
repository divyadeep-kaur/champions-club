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

export type TrialDecision = "pending" | "approved" | "declined";

export const DECISION_KINDS = ["approved", "declined"];

// Where a website trial request stands. Only trial requests have one.
export function trialDecision(lead: { interest: string; status: string }, kinds: string[]): TrialDecision | null {
  if (lead.interest !== "trial") return null;
  if (kinds.includes("declined")) return "declined";
  if (kinds.includes("approved") || lead.status === "won") return "approved";
  if (lead.status === "lost") return "declined";
  return "pending";
}

// The website saves the court, plan and note as "Court: X · Plan: Y · note".
export function requestDetails(message: string | null) {
  const out: { court?: string; plan?: string; note?: string } = {};
  const notes: string[] = [];
  for (const part of (message ?? "").split(" · ")) {
    if (part.startsWith("Court: ")) out.court = part.slice(7);
    else if (part.startsWith("Plan: ")) out.plan = part.slice(6);
    else if (part.trim()) notes.push(part);
  }
  if (notes.length) out.note = notes.join(" · ");
  return out;
}
