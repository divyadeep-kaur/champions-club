"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({ label, name, autoComplete, className }: { label: string; name: string; autoComplete?: string; className?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-[14px] font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required className={`${className ?? ""} pr-12`} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          aria-controls={id}
          className="absolute right-1 top-1/2 mt-[3px] grid size-11 -translate-y-1/2 place-items-center text-muted hover:text-forest"
        >
          {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    </div>
  );
}
