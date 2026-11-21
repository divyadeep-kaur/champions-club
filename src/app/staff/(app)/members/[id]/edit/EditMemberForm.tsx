"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { fieldCls, labelCls, btnOutline } from "@/components/staff/ui";
import { updateMemberProfile, type ActionState } from "../../membershipActions";

type Values = { id: number; name: string; phone: string; email: string; birthDate: string; notes: string; photo: string | null };

export function EditMemberForm({ initial }: { initial: Values }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateMemberProfile, {});
  const v = { ...initial, ...(state.fields ?? {}) };
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const photo = preview ?? (remove ? null : initial.photo);

  return (
    <form action={action} className="grid gap-4 border border-line bg-paper p-5 sm:grid-cols-2 sm:p-6" noValidate>
      <input type="hidden" name="memberId" value={initial.id} />
      <div className="flex items-center gap-4 sm:col-span-2">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview or inline photo
          <img src={photo} alt="" className="size-[72px] rounded-full border border-line object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-[72px] place-items-center rounded-full bg-[#dfe8d4] text-[24px] font-semibold text-forest">
            {v.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="grid gap-1.5">
          <label htmlFor="photo" className="text-[14px] font-semibold">
            Photograph <span className="font-normal text-muted">(optional, JPG, PNG or WebP up to 1 MB)</span>
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
            className="text-[14px] file:mr-3 file:min-h-10 file:cursor-pointer file:border-[1.5px] file:border-forest file:bg-transparent file:px-3 file:font-semibold file:text-forest"
          />
          {initial.photo && !preview && (
            <label className="flex items-center gap-2 text-[13.5px]">
              <input type="checkbox" name="removePhoto" checked={remove} onChange={(e) => setRemove(e.target.checked)} /> Remove current photo
            </label>
          )}
        </div>
      </div>
      <label className={labelCls}>
        Full name
        <input name="name" defaultValue={v.name} required className={fieldCls} />
      </label>
      <label className={labelCls}>
        Phone number
        <input name="phone" defaultValue={v.phone} inputMode="tel" required className={fieldCls} />
      </label>
      <label className={labelCls}>
        Email
        <input name="email" type="email" defaultValue={v.email} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Date of birth
        <input name="birthDate" type="date" defaultValue={v.birthDate} className={fieldCls} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>
        Notes
        <textarea name="notes" defaultValue={v.notes} rows={2} maxLength={300} className={fieldCls} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 bg-forest px-5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Save profile
        </button>
        <Link href={`/staff/members/${initial.id}`} className={btnOutline}>
          Cancel
        </Link>
        <p role="alert" className="text-[14px] font-semibold text-clay">
          {state.error}
        </p>
      </div>
      <p className="text-[13px] text-muted sm:col-span-2">
        Plan, dates and payments are changed from the profile with Change plan, Renew or Extend, so they stay in the history.
      </p>
    </form>
  );
}
