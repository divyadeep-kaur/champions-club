"use client";

import { useId, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 1_000_000;

// A clear photo box for add forms: click to choose, see a preview, change or remove it.
// The file is sent with the form as "photo". Size and type are checked here and again on the server.
export function PhotoPicker({ current, label = "Photo" }: { current?: string | null; label?: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [problem, setProblem] = useState<string | null>(null);

  const clear = () => {
    if (input.current) input.current.value = "";
    setPreview(current ?? null);
    setProblem(null);
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-[14px] font-semibold">
        {label} <span className="font-normal text-muted">(optional)</span>
      </span>
      <div className="flex items-center gap-3">
        <label
          htmlFor={id}
          className="group relative grid size-[112px] shrink-0 cursor-pointer place-items-center overflow-hidden border-2 border-dashed border-forest/40 bg-cream text-forest transition-colors hover:border-forest hover:bg-forest/5 focus-within:ring-2 focus-within:ring-forest/30"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
            <img src={preview} alt="" className="size-full bg-white object-contain" />
          ) : (
            <span className="grid justify-items-center gap-1 text-center text-[12.5px] font-semibold">
              <Camera className="size-7" aria-hidden="true" />
              Add a photo
            </span>
          )}
          <input
            ref={input}
            id={id}
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return clear();
              if (!TYPES.includes(f.type)) {
                setProblem("Use a JPG, PNG or WebP image");
                e.target.value = "";
                return;
              }
              if (f.size > MAX) {
                setProblem("That photo is over 1 MB. Pick a smaller one.");
                e.target.value = "";
                return;
              }
              setProblem(null);
              setPreview(URL.createObjectURL(f));
            }}
          />
        </label>
        <div className="grid gap-1.5 text-[13px] text-muted">
          <span>JPG, PNG or WebP, up to 1 MB. A square photo on a plain background looks best.</span>
          {preview && preview !== current && (
            <span className="flex gap-3">
              <label htmlFor={id} className="cursor-pointer font-semibold text-forest underline underline-offset-4">
                Change
              </label>
              <button type="button" onClick={clear} className="inline-flex items-center gap-1 font-semibold text-clay">
                <X className="size-3.5" aria-hidden="true" /> Remove
              </button>
            </span>
          )}
          {problem && (
            <span role="alert" className="font-semibold text-clay">
              {problem}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
