"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Users } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saveAttendance } from "@/app/(app)/attendance/actions";
import type { AttendanceStatus } from "@/lib/types";

type ClassOpt = { id: string; label: string; schoolId: string };
type StudentOpt = { id: string; name: string };
type Existing = { student_id: string; session: "am" | "pm"; status: AttendanceStatus };

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; tone: string }[] = [
  { value: "present", label: "P", tone: "bg-status-good-bg text-status-good" },
  { value: "late", label: "L", tone: "bg-status-warn-bg text-status-warn" },
  { value: "absent", label: "A", tone: "bg-status-bad-bg text-status-bad" },
];

export function AttendanceClient({
  classes,
  activeClassId,
  date,
  students,
  existing,
  schoolYearId,
}: {
  classes: ClassOpt[];
  activeClassId: string;
  date: string;
  students: StudentOpt[];
  existing: Existing[];
  schoolYearId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const isFriday = new Date(date + "T00:00:00").getDay() === 5;

  const [marks, setMarks] = useState<Record<string, { am: AttendanceStatus | null; pm: AttendanceStatus | null }>>(
    () => {
      const initial: Record<string, { am: AttendanceStatus | null; pm: AttendanceStatus | null }> = {};
      for (const s of students) {
        const am = existing.find((e) => e.student_id === s.id && e.session === "am")?.status ?? null;
        const pm = existing.find((e) => e.student_id === s.id && e.session === "pm")?.status ?? null;
        initial[s.id] = { am, pm };
      }
      return initial;
    },
  );

  function updateQuery(next: Partial<{ class: string; date: string }>) {
    const params = new URLSearchParams({ class: activeClassId, date, ...next });
    router.push(`/attendance?${params.toString()}`);
  }

  function mark(studentId: string, session: "am" | "pm", status: AttendanceStatus) {
    setMarks((m) => ({ ...m, [studentId]: { ...m[studentId], [session]: status } }));
  }

  function markAllPresent() {
    setMarks((m) => {
      const next = { ...m };
      for (const s of students) next[s.id] = { am: "present", pm: isFriday ? null : "present" };
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const entries = students.map((s) => ({ studentId: s.id, am: marks[s.id]?.am ?? null, pm: marks[s.id]?.pm ?? null }));
      const result = await saveAttendance({ schoolYearId, date, entries });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Class</label>
            <Select value={activeClassId} onChange={(e) => updateQuery({ class: e.target.value })}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => updateQuery({ date: e.target.value })}
              className="h-10 w-full rounded-lg border border-border-strong bg-surface-raised px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button variant="secondary" onClick={markAllPresent} type="button">
            <Users size={15} /> Mark all present
          </Button>
          {isFriday && (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
              Friday — morning session only
            </span>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-faint">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Morning</th>
              {!isFriday && <th className="px-4 py-3 font-medium">Afternoon</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium text-text">{s.name}</td>
                <td className="px-4 py-2.5">
                  <StatusPicker value={marks[s.id]?.am ?? null} onChange={(v) => mark(s.id, "am", v)} />
                </td>
                {!isFriday && (
                  <td className="px-4 py-2.5">
                    <StatusPicker value={marks[s.id]?.pm ?? null} onChange={(v) => mark(s.id, "pm", v)} />
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-text-faint">
                  No active students in this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || students.length === 0}>
          {pending ? "Saving…" : "Save attendance"}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-status-good">
            <Check size={15} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

function StatusPicker({ value, onChange }: { value: AttendanceStatus | null; onChange: (v: AttendanceStatus) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border-strong">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-8 w-9 text-xs font-semibold transition-colors",
            value === opt.value ? opt.tone : "bg-surface-raised text-text-faint hover:bg-surface-sunken",
          )}
          title={opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
