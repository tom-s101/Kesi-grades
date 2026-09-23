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

type ClassOpt = { id: string; label: string };
type StudentOpt = { id: string; name: string };
type Existing = { student_id: string; session: "am" | "pm"; status: AttendanceStatus };

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; full: string; tone: string }[] = [
  { value: "present", label: "P", full: "Present", tone: "bg-status-good-bg text-status-good" },
  { value: "late", label: "L", full: "Late", tone: "bg-status-warn-bg text-status-warn" },
  { value: "absent", label: "A", full: "Absent", tone: "bg-status-bad-bg text-status-bad" },
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
  // Switching class or date needs fresh data from the server. Tracked
  // separately from saving so the sheet can dim and the controls lock
  // while it loads, instead of sitting there looking unresponsive.
  const [loading, startNavigation] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekday = new Date(date + "T00:00:00").getDay();
  const isFriday = weekday === 5;
  const isWeekend = weekday === 0 || weekday === 6;

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
    startNavigation(() => router.push(`/attendance?${params.toString()}`));
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

  const marked = students.filter((s) => marks[s.id]?.am || (!isFriday && marks[s.id]?.pm)).length;

  function save() {
    setError(null);
    startTransition(async () => {
      const entries = students.map((s) => ({ studentId: s.id, am: marks[s.id]?.am ?? null, pm: marks[s.id]?.pm ?? null }));
      const result = await saveAttendance({ schoolYearId, date, entries });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error ?? "Couldn't save attendance. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <Card className="p-3 sm:p-4">
        <div className="space-y-3 sm:flex sm:flex-wrap sm:items-end sm:gap-3 sm:space-y-0">
          <div className="sm:min-w-[200px] sm:flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Class</label>
            <Select
              value={activeClassId}
              disabled={loading}
              onChange={(e) => updateQuery({ class: e.target.value })}
              className="h-11 text-base sm:h-10 sm:text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Date</label>
            <input
              type="date"
              value={date}
              disabled={loading}
              onChange={(e) => updateQuery({ date: e.target.value })}
              className="h-11 w-full rounded-lg border border-border-strong bg-surface-raised px-3 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:h-10 sm:text-sm"
            />
          </div>
          <Button variant="secondary" onClick={markAllPresent} type="button" className="h-11 w-full sm:h-10 sm:w-auto">
            <Users size={15} /> Mark all present
          </Button>
        </div>

        {(isFriday || isWeekend || loading) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {loading && (
              <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-text-soft">
                Loading…
              </span>
            )}
            {isFriday && (
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
                Friday — morning session only
              </span>
            )}
            {isWeekend && (
              <span className="rounded-full bg-status-warn-bg px-3 py-1 text-xs font-medium text-status-warn">
                That&rsquo;s a weekend — pick a school day
              </span>
            )}
          </div>
        )}
      </Card>

      <div className={cn("transition-opacity", loading && "pointer-events-none opacity-50")}>
        {students.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-text-faint">No active students in this class.</Card>
        ) : (
          <>
            {/* Phones: one row per student, pickers full width and thumb-sized. */}
            <ul className="space-y-2 sm:hidden">
              {students.map((s) => (
                <li key={s.id} className="rounded-xl border border-border bg-surface-raised p-3">
                  <p className="mb-2 font-medium text-text">{s.name}</p>
                  <div className="space-y-2">
                    <SessionRow
                      label="Morning"
                      value={marks[s.id]?.am ?? null}
                      onChange={(v) => mark(s.id, "am", v)}
                    />
                    {!isFriday && (
                      <SessionRow
                        label="Afternoon"
                        value={marks[s.id]?.pm ?? null}
                        onChange={(v) => mark(s.id, "pm", v)}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <Card className="hidden overflow-hidden sm:block">
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
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>

      {error && <p className="rounded-lg bg-status-bad-bg px-3 py-2 text-sm text-status-bad">{error}</p>}

      {/* Save stays reachable without scrolling past forty-odd students. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <Button
            onClick={save}
            disabled={pending || loading || students.length === 0 || isWeekend}
            className="h-11 flex-1 sm:h-10 sm:flex-none"
          >
            {pending ? "Saving…" : "Save attendance"}
          </Button>
          {saved ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm text-status-good">
              <Check size={15} /> Saved
            </span>
          ) : (
            students.length > 0 && (
              <span className="tabular shrink-0 text-xs text-text-faint">
                {marked}/{students.length} marked
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AttendanceStatus | null;
  onChange: (v: AttendanceStatus) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-text-faint">{label}</span>
      <div className="flex flex-1 overflow-hidden rounded-lg border border-border-strong">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              "h-10 flex-1 border-r border-border-strong text-sm font-semibold last:border-r-0 transition-colors",
              value === opt.value ? opt.tone : "bg-surface-raised text-text-faint active:bg-surface-sunken",
            )}
          >
            {opt.full}
          </button>
        ))}
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
          aria-label={opt.full}
          aria-pressed={value === opt.value}
          className={cn(
            "h-8 w-9 text-xs font-semibold transition-colors",
            value === opt.value ? opt.tone : "bg-surface-raised text-text-faint hover:bg-surface-sunken",
          )}
          title={opt.full}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
