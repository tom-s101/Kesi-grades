import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="p-5">
      <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg", toneClass)}>
        <Icon size={18} />
      </div>
      <p className="font-display text-3xl font-medium text-text">{value}</p>
      <p className="mt-0.5 text-sm text-text-soft">{label}</p>
      {hint && <p className="mt-2 text-xs text-text-faint">{hint}</p>}
    </Card>
  );
}
