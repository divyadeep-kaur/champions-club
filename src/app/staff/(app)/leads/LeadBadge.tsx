import { stageLabel } from "@/lib/leads";
import { Badge } from "@/components/staff/ui";

const tone: Record<string, "green" | "clay" | "gray" | "gold"> = { new: "clay", contacted: "gold", trial: "gold", quoted: "gold", won: "green", lost: "gray" };

export function LeadBadge({ status }: { status: string }) {
  return <Badge tone={tone[status] ?? "gray"}>{stageLabel(status)}</Badge>;
}
