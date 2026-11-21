"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { approveTrial, declineTrial, type LeadState } from "./actions";

export type TrialRequest = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  interest: string;
  wants: string | null;
  court: string | null;
  held: string | null;
  plan: string | null;
  note: string | null;
  received: string;
  ago: string;
};

function Row({ r }: { r: TrialRequest }) {
  const [approveState, approve, approving] = useActionState<LeadState, FormData>(approveTrial, {});
  const [declineState, decline, declining] = useActionState<LeadState, FormData>(declineTrial, {});
  const [asking, setAsking] = useState(false);
  const state = declineState.error || declineState.ok ? declineState : approveState;

  const details: [string, React.ReactNode][] = [
    ["Name", r.name],
    [
      "Mobile",
      <a key="p" href={`tel:+91${r.phone}`} className="font-semibold text-forest underline underline-offset-4">
        {r.phone}
      </a>,
    ],
    ["Email", r.email ?? "Not given"],
    ["Interested in", "Free trial"],
    ["Preferred day and time", r.wants ?? "Any time"],
    ["Court asked for", r.court ?? "Any court"],
    ["Court held", r.held ?? "None free at that time"],
    ["Plan looked at", r.plan ?? "Not picked"],
    ["Message", r.note ?? "No message"],
    ["Request sent", r.received],
  ];

  return (
    <li className="border border-line bg-paper">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-[#f6f1e6] [&::-webkit-details-marker]:hidden">
          <span className="size-2.5 shrink-0 rounded-full bg-clay" aria-hidden="true" />
          <strong className="min-w-[140px] text-[16px]">{r.name}</strong>
          <span className="text-[14px] text-[#3c4a43]">{r.wants ?? "Any time"}</span>
          <span className="text-[14px] text-muted">{r.held ?? "No court held"}</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="bg-[#f6e3c4] px-2 py-0.5 text-[12.5px] font-bold text-[#7a4b0c]">Waiting for approval</span>
            <span className="text-[13px] text-muted">{r.ago}</span>
            <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>

        <div className="border-t border-[#ece5d6] px-4 pb-4 pt-3">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {details.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted">{k}</dt>
                <dd className="mt-0.5 text-[15px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {r.held ? (
              <form action={approve}>
                <input type="hidden" name="leadId" value={r.id} />
                <button
                  type="submit"
                  disabled={approving}
                  className="inline-flex min-h-11 items-center gap-2 bg-forest px-4 py-2.5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
                >
                  {approving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve trial
                </button>
              </form>
            ) : (
              <Link
                href={`/staff/leads/${r.id}`}
                className="inline-flex min-h-11 items-center gap-2 bg-forest px-4 py-2.5 font-semibold text-cream hover:bg-forest-deep"
              >
                <Check className="size-4" /> Pick a slot and approve
              </Link>
            )}
            {asking ? (
              <form action={decline} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="leadId" value={r.id} />
                <input
                  name="reason"
                  placeholder="Reason (optional)"
                  aria-label="Reason for declining"
                  className="min-h-11 border border-[#b5aa98] bg-white px-3 text-[15px] outline-none focus:border-forest"
                />
                <button
                  type="submit"
                  disabled={declining}
                  className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-clay/60 px-4 py-2.5 font-semibold text-clay hover:bg-clay-soft disabled:opacity-70"
                >
                  {declining && <Loader2 className="size-4 animate-spin" />} Confirm decline
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAsking(true)}
                className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-clay/60 px-4 py-2.5 font-semibold text-clay hover:bg-clay-soft"
              >
                <X className="size-4" /> Decline
              </button>
            )}
            <Link href={`/staff/leads/${r.id}`} className="ml-auto text-[14px] font-semibold text-forest underline underline-offset-4">
              Open full lead
            </Link>
          </div>
          <p role="status" aria-live="polite" className={`mt-2 min-h-5 text-[13.5px] font-medium ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
            {state.error ?? state.ok}
          </p>
        </div>
      </details>
    </li>
  );
}

export function TrialRequests({ requests }: { requests: TrialRequest[] }) {
  return (
    <section aria-labelledby="trial-requests" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="trial-requests" className="text-[19px] font-semibold">
          Trial requests <span className="text-muted">({requests.length})</span>
        </h2>
        <p className="text-[13.5px] text-muted">New requests appear here on their own. Click a request to see everything they filled in.</p>
      </div>
      {requests.length === 0 ? (
        <p className="border border-dashed border-line bg-paper px-4 py-3.5 text-[14.5px] text-muted">
          No trial requests waiting. New ones from the website show up here.
        </p>
      ) : (
        <ul className="grid gap-2">
          {requests.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
