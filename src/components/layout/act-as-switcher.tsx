"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { setActingTeacher } from "@/app/(app)/act-as-actions";
import { cn } from "@/lib/utils";

export type SwitchableTeacher = {
  id: string;
  full_name: string;
  school_name: string | null;
  is_head_teacher: boolean;
  is_master_admin: boolean;
};

/** Testing-only: step into any teacher's shoes to see their view of the app. */
export function ActAsSwitcher({
  teachers,
  currentTeacherId,
  defaultLabel,
  fullWidth = false,
}: {
  teachers: SwitchableTeacher[];
  currentTeacherId: string;
  /** What "nobody in particular" means — the persona picked on the landing page. */
  defaultLabel: string;
  /** Phones give it a row of its own, so it can use the whole width. */
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(value: string) {
    startTransition(async () => {
      await setActingTeacher(value);
      router.refresh();
    });
  }

  return (
    <label
      className={cn("flex items-center gap-1.5 text-xs text-text-soft", fullWidth && "w-full")}
      title="Testing only — view the app as any teacher"
    >
      <Eye size={14} className="shrink-0" />
      <span className={fullWidth ? "shrink-0" : "hidden sm:inline"}>Viewing as</span>
      <select
        value={currentTeacherId}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className={cn(
          "h-9 rounded-md border border-border-strong bg-surface-raised px-2 text-xs text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:h-8",
          fullWidth ? "min-w-0 flex-1" : "max-w-[190px]",
        )}
      >
        <option value="">{defaultLabel}</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name}
            {t.school_name ? ` · ${t.school_name}` : ""}
            {t.is_master_admin ? " (admin)" : t.is_head_teacher ? " (head)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
