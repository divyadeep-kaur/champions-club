import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isoDate } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { EditMemberForm } from "./EditMemberForm";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["owner"]);
  const { id } = await params;
  const m = await db.member.findUnique({ where: { id: Number(id) || 0 } });
  if (!m) notFound();
  return (
    <div className="grid max-w-[820px] gap-4">
      <div>
        <h2 className="text-[22px] font-semibold">Edit {m.name}</h2>
        <p className="text-[14.5px] text-muted">{m.code}</p>
      </div>
      <EditMemberForm
        initial={{
          id: m.id,
          name: m.name,
          phone: m.phone,
          email: m.email ?? "",
          birthDate: m.birthDate ? isoDate(m.birthDate) : "",
          notes: m.notes ?? "",
          photo: m.photo,
        }}
      />
    </div>
  );
}
