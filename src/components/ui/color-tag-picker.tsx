"use client";

import { twMerge } from "tailwind-merge";
import { COLOR_TAG_MAP, COLOR_TAGS, type ColorTag } from "@/types";

type Props = {
  value: ColorTag;
  onChange: (tag: ColorTag) => void;
  label?: string;
  className?: string;
};

export function ColorTagPicker({
  value,
  onChange,
  label = "Color",
  className,
}: Props) {
  return (
    <fieldset className={twMerge("min-w-0 border-0 p-0", className)}>
      <legend className="mb-2 text-sm font-medium text-white/70">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {COLOR_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(tag)}
            aria-pressed={value === tag}
            className={twMerge(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50",
              value === tag
                ? "bg-white/[0.08] ring-2 ring-white/20"
                : "bg-white/[0.03] hover:bg-white/[0.06]",
            )}
          >
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: COLOR_TAG_MAP[tag] }}
              aria-hidden
            />
            <span className="text-white/80">{tag}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
