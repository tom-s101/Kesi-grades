import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * One figure, stated plainly.
 *
 * The number leads at display size in tabular figures so a row of tiles
 * lines up; the label sits under it as a small tracked capital rather
 * than competing as body text.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    neutral: "text-brand bg-brand-soft",
    good: "text-status-good bg-status-good-bg",
    warn: "text-status-warn bg-status-warn-bg",
    bad: "text-status-bad bg-status-bad-bg",
  }[tone];

  return (
    <Card className="flex items-start gap-4 p-4 sm:p-5">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClass)}>
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="tabular block font-display text-[1.75rem] font-medium leading-none tracking-tight text-text sm:text-3xl">
          {value}
        </span>
        <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
          {label}
        </span>
        {hint && <span className="mt-1.5 block text-xs text-text-soft">{hint}</span>}
      </span>
    </Card>
  );
}
