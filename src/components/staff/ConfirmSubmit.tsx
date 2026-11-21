"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// A submit button that needs a second click for actions that are hard to undo.
// The first click arms it and changes the label; it disarms itself after a few seconds.
export function ConfirmSubmit({
  children,
  confirmLabel,
  pending = false,
  disabled = false,
  needsConfirm = true,
  className = "",
}: {
  children: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  disabled?: boolean;
  needsConfirm?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(e) => {
        if (needsConfirm && !armed) {
          e.preventDefault();
          setArmed(true);
        } else {
          setArmed(false);
        }
      }}
      aria-live="polite"
      className={`${className} ${armed ? "ring-2 ring-clay ring-offset-2" : ""}`}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {armed ? confirmLabel : children}
    </button>
  );
}
