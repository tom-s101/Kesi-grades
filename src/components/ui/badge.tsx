import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "good" | "warn" | "bad" | "neutral" | "brand";

const toneClasses: Record<Tone, string> = {
  good: "bg-status-good-bg text-status-good",
  warn: "bg-status-warn-bg text-status-warn",
  bad: "bg-status-bad-bg text-status-bad",
  neutral: "bg-status-neutral-bg text-status-neutral",
  brand: "bg-brand-soft text-brand-strong",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
