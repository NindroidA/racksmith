import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Tooltip } from "./tooltip";
import { getGlossaryEntry } from "@/lib/networking-glossary";

type Props = {
  htmlFor?: string;
  term?: string;
  help?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function InlineHelp({
  htmlFor,
  term,
  help,
  required,
  children,
  className,
}: Props) {
  return (
    <div
      className={twMerge(
        "mb-1.5 flex items-center gap-1.5 text-sm font-medium text-white/70",
        className,
      )}
    >
      <label htmlFor={htmlFor} className="cursor-pointer">
        {children}
        {required && <span className="ml-1 text-accent-red">*</span>}
      </label>
      {term && (
        <Tooltip
          content={<TermHint termKey={term} />}
          className="text-white/40"
        >
          <button
            type="button"
            aria-label={`Definition of ${term}`}
            className="flex h-4 w-4 items-center justify-center rounded text-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </button>
        </Tooltip>
      )}
      {!term && help && (
        <Tooltip content={help}>
          <button
            type="button"
            aria-label="Show help"
            className="flex h-4 w-4 items-center justify-center rounded text-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

function TermHint({ termKey }: { termKey: string }) {
  const entry = getGlossaryEntry(termKey);
  if (!entry) return <div className="text-xs text-white/80">{termKey}</div>;
  return (
    <>
      <div className="text-sm font-semibold text-white">{entry.term}</div>
      <div className="mt-1 text-xs text-white/80">{entry.short}</div>
      {entry.long && (
        <div className="mt-2 text-xs text-white/70">{entry.long}</div>
      )}
    </>
  );
}
