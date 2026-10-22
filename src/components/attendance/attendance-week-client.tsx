"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, History, Users } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLoader, Spinner } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { addDays, mondayOf, sessionsOn, shortDate, shortWeekday } from "@/lib/school-days";
import { markQuarterPresent, saveAttendanceWeek, type WeekCell } from "@/app/(app)/attendance/actions";
import type { AttendanceStatus } from "@/lib/types";

type Status = AttendanceStatus | null;
type Quarter = { id: string; name: string; start: string; end: string };

const LOOK: Record<AttendanceStatus, { letter: string; label: string; tone: string }> = {
  present: { letter: "P", label: "Present", tone: "bg-status-good-bg text-status-good border-status-good/30" },
  late: { letter: "L", label: "Late", tone: "bg-status-warn-bg text-status-warn border-status-warn/40" },
  absent: { letter: "A", label: "Absent", tone: "bg-status-bad-bg text-status-bad border-status-bad/40" },
};

/** Each tap moves a box one step along: blank → P → L → A → blank. */
const NEXT: Record<string, Status> = { none: "present", present: "late", late: "absent", absent: null };

const key = (studentId: string, date: string, session: "am" | "pm") => `${studentId}|${date}|${session}`;

/**
 * A week of attendance on one sheet: a row per student, a column per
 * morning and afternoon (Fridays morning-only). Made for catching up on
 * days that weren't taken in the app — fill the week (or a whole quarter)
 * with "present", then tap the few boxes that were late or absent, and
 * save once.
 */
export function AttendanceWeekClient({
  classes,
  activeClassId,
  days,
  today,
  students,
  existing,
  quarters,
  schoolYearId,
  filled,
}: {
  /** Set straight after "Mark quarter present", to say what it did. */
  filled?: { added: number; quarter: string; from: string; to: string } | null;
  classes: { id: string; label: string }[];
  activeClassId: string;
  days: string[];
  today: string;
  students: { id: string; name: string }[];
  existing: { studentId: string; date: string; session: "am" | "pm"; status: AttendanceStatus }[];
  quarters: Quarter[];
  schoolYearId: string;
}) {
  const router = useRouter();
  const [loading, startNavigation] = useTransition();
  const [saving, startSave] = useTransition();
  const [filling, startFill] = useTransition();
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(() =>
    filled
      ? {
          tone: "good",
          text:
            filled.added === 0
              ? `${filled.quarter} was already fully marked — nothing to add.`
              : `Marked present: ${filled.added.toLocaleString()} sessions in ${filled.quarter}, ${shortDate(filled.from)} – ${shortDate(filled.to)}. Now go week by week to fix lates, absences and days with no class.`,
        }
      : null,
  );

  const initial = useMemo(() => {
    const m: Record<string, Status> = {};
    for (const e of existing) m[key(e.studentId, e.date, e.session)] = e.status;
    return m;
  }, [existing]);
  const [marks, setMarks] = useState<Record<string, Status>>(initial);
  const [noClass, setNoClass] = useState<Set<string>>(new Set());

  const monday = days[0];
  const open = (date: string) => date <= today && !noClass.has(date);
  const weekQuarter = quarters.find((q) => q.start <= days[4] && q.end >= monday);
  const startedQuarters = quarters.filter((q) => q.start <= today);
  const [fillQuarterId, setFillQuarterId] = useState(
    () => (weekQuarter && weekQuarter.start <= today ? weekQuarter.id : startedQuarters[0]?.id) ?? "",
  );

  // Every box whose value differs from what's saved.
  const changes: WeekCell[] = [];
  for (const s of students) {
    for (const date of days) {
      for (const session of sessionsOn(date)) {
        const k = key(s.id, date, session);
        const now = marks[k] ?? null;
        if (now !== (initial[k] ?? null)) changes.push({ studentId: s.id, date, session, status: now });
      }
    }
  }

  function go(next: Partial<{ class: string; week: string; view: string; date: string }>) {
    if (changes.length && !window.confirm(`You have ${changes.length} unsaved change${changes.length === 1 ? "" : "s"} on this week. Leave without saving?`)) {
      return;
    }
    const params = new URLSearchParams({ view: "week", class: activeClassId, week: monday, ...next });
    startNavigation(() => router.push(`/attendance?${params.toString()}`));
  }

  function tap(studentId: string, date: string, session: "am" | "pm") {
    if (!open(date)) return;
    setMessage(null);
    setMarks((m) => {
      const k = key(studentId, date, session);
      return { ...m, [k]: NEXT[m[k] ?? "none"] };
    });
  }

  /** Fill blank boxes with "present" — never overwrites a mark. */
  function fillPresent(dates: string[], onlyStudent?: string) {
    setMessage(null);
    setMarks((m) => {
      const next = { ...m };
      for (const s of students) {
        if (onlyStudent && s.id !== onlyStudent) continue;
        for (const date of dates) {
          if (!open(date)) continue;
          for (const session of sessionsOn(date)) {
            const k = key(s.id, date, session);
            if (!next[k]) next[k] = "present";
          }
        }
      }
      return next;
    });
  }

  function toggleNoClass(date: string) {
    setMessage(null);
    const turningOn = !noClass.has(date);
    setNoClass((prev) => {
      const next = new Set(prev);
      if (turningOn) next.add(date);
      else next.delete(date);
      return next;
    });
    if (turningOn) {
      // A day without class has no attendance: clear it (saving removes
      // anything that was recorded for it).
      setMarks((m) => {
        const next = { ...m };
        for (const s of students) for (const session of sessionsOn(date)) next[key(s.id, date, session)] = null;
        return next;
      });
    }
  }

  function save() {
    setMessage(null);
    startSave(async () => {
      const result = await saveAttendanceWeek({ schoolYearId, cells: changes }).catch(() => ({
        error: "Couldn't connect. Check your signal and try again.",
      }));
      if ("ok" in result && result.ok) {
        setMessage({ tone: "good", text: "Week saved." });
        router.refresh();
      } else {
        setMessage({ tone: "bad", text: result.error ?? "Couldn't save. Please try again." });
      }
    });
  }

  function fillQuarter() {
    const q = quarters.find((x) => x.id === fillQuarterId);
    if (!q) return;
    if (changes.length) {
      setMessage({ tone: "bad", text: "Save or undo the changes on this week first." });
      return;
    }
    const last = q.end < today ? q.end : today;
    const ok = window.confirm(
      `Mark every student in this class present for every school day of ${q.name} (${shortDate(q.start)} – ${shortDate(last)})?\n\n` +
        "Only days with nothing recorded are filled — marks already entered stay as they are. " +
        "Afterwards, go through the weeks to change anyone who was late or absent, and mark holidays as \"No class\".",
    );
    if (!ok) return;
    setMessage(null);
    startFill(async () => {
      const result = await markQuarterPresent({ sectionId: activeClassId, quarterId: q.id }).catch(() => ({
        ok: false as const,
        error: "Couldn't connect. Check your signal and try again.",
      }));
      if (!result.ok) {
        setMessage({ tone: "bad", text: result.error });
        return;
      }
      // Straight to the quarter's first week, ready for the corrections.
      // The result rides along in the address, since the sheet for that
      // week starts fresh.
      const params = new URLSearchParams({
        view: "week",
        class: activeClassId,
        week: mondayOf(q.start),
        filled: String(result.added),
        fq: q.name,
        ff: result.from,
        ft: result.to,
      });
      startNavigation(() => {
        router.push(`/attendance?${params.toString()}`);
        router.refresh();
      });
    });
  }

  const busy = loading || saving || filling;
  const nextWeek = addDays(monday, 7);

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="space-y-3 sm:flex sm:flex-wrap sm:items-end sm:gap-3 sm:space-y-0">
          <div className="sm:min-w-[200px] sm:flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Class</label>
            <Select
              value={activeClassId}
              disabled={busy}
              onChange={(e) => go({ class: e.target.value })}
              className="h-11 text-base sm:h-10 sm:text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <ViewSwitch view="week" onDay={() => go({ view: "day", date: days.find((d) => d <= today) ?? today })} />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => go({ week: addDays(monday, -7) })} className="h-10 px-3" aria-label="Previous week">
            <ChevronLeft size={16} />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="font-medium text-text">
              {shortDate(days[0])} – {shortDate(days[4])}
            </p>
            <p className="text-xs text-text-faint">{weekQuarter ? weekQuarter.name : "Between quarters"}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || nextWeek > today}
            onClick={() => go({ week: nextWeek })}
            className="h-10 px-3"
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-text-soft">
            Jump to a date{" "}
            <input
              type="date"
              max={today}
              value={monday}
              disabled={busy}
              onChange={(e) => e.target.value && go({ week: mondayOf(e.target.value) })}
              className="ml-1 h-9 rounded-lg border border-border-strong bg-surface-raised px-2 text-sm text-text"
            />
          </label>
          <div className="flex-1" />
          <Button variant="secondary" disabled={busy || students.length === 0} onClick={() => fillPresent(days)} className="h-10">
            <Users size={15} /> Mark week present
          </Button>
        </div>
      </Card>

      {startedQuarters.length > 0 && (
        <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <History size={18} className="mt-0.5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">Catching up on a whole quarter?</p>
              <p className="text-xs text-text-soft">
                Marks everyone present for every school day that has nothing recorded, then you fix the exceptions week by week.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={fillQuarterId} disabled={busy} onChange={(e) => setFillQuarterId(e.target.value)} className="h-10 w-36">
              {startedQuarters.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </Select>
            <Button variant="secondary" disabled={busy || !fillQuarterId || students.length === 0} onClick={fillQuarter} className="h-10 whitespace-nowrap">
              {filling ? <Spinner size={14} /> : <Check size={15} />} Mark quarter present
            </Button>
          </div>
        </Card>
      )}

      {message && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            message.tone === "good" ? "bg-status-good-bg text-status-good" : "bg-status-bad-bg text-status-bad",
          )}
        >
          {message.text}
        </p>
      )}

      {(loading || filling) && (
        <div className="relative z-10 h-0">
          <div className="absolute inset-x-0 top-6 flex justify-center">
            <SectionLoader
              label={filling ? "Marking the quarter" : "Loading"}
              className="rounded-2xl bg-surface-raised/95 px-8 py-4 shadow-elev-2"
            />
          </div>
        </div>
      )}

      <div className={cn("transition-opacity", (loading || filling) && "pointer-events-none opacity-50")}>
        {students.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-text-faint">No active students in this class.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-xs text-text-faint">
                  <th rowSpan={2} className="sticky left-0 z-10 border-b border-border bg-surface-raised px-3 py-2 text-left font-medium uppercase tracking-wide">
                    Student
                  </th>
                  {days.map((date) => {
                    const future = date > today;
                    const off = noClass.has(date);
                    return (
                      <th
                        key={date}
                        colSpan={sessionsOn(date).length}
                        className={cn("border-b border-l border-border px-1.5 pb-1 pt-2 text-center font-medium", off && "bg-surface-sunken")}
                      >
                        <span className="block whitespace-nowrap text-text">
                          {shortWeekday(date)} {shortDate(date)}
                        </span>
                        {future ? (
                          <span className="block py-1 text-[10px] uppercase tracking-wide">Not yet</span>
                        ) : (
                          <span className="mt-1 flex justify-center gap-1">
                            {!off && (
                              <button
                                type="button"
                                onClick={() => fillPresent([date])}
                                className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-good hover:bg-status-good-bg"
                                title="Mark everyone present this day"
                              >
                                All P
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleNoClass(date)}
                              className={cn(
                                "whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                off ? "bg-text-soft text-surface" : "text-text-faint hover:bg-surface-sunken",
                              )}
                              title={off ? "There was class this day after all" : "No class this day (holiday, event…)"}
                            >
                              {off ? "No class ✓" : "No class"}
                            </button>
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
                <tr className="text-[10px] uppercase tracking-wide text-text-faint">
                  {days.flatMap((date) =>
                    sessionsOn(date).map((session, i) => (
                      <th key={`${date}${session}`} className={cn("border-b border-border px-1 pb-1.5 font-medium", i === 0 && "border-l")}>
                        {session === "am" ? "AM" : "PM"}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="group">
                    <th className="sticky left-0 z-10 border-b border-border bg-surface-raised px-3 py-1.5 text-left font-medium text-text group-last:border-b-0">
                      <button
                        type="button"
                        onClick={() => fillPresent(days, s.id)}
                        className="max-w-[9.5rem] truncate text-left hover:text-brand sm:max-w-none"
                        title="Mark this student present all week"
                      >
                        {s.name}
                      </button>
                    </th>
                    {days.flatMap((date) =>
                      sessionsOn(date).map((session, i) => {
                        const k = key(s.id, date, session);
                        const value = marks[k] ?? null;
                        const changed = value !== (initial[k] ?? null);
                        const disabled = !open(date);
                        return (
                          <td
                            key={k}
                            className={cn(
                              "border-b border-border px-1 py-1.5 text-center group-last:border-b-0",
                              i === 0 && "border-l",
                              noClass.has(date) && "bg-surface-sunken",
                            )}
                          >
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => tap(s.id, date, session)}
                              aria-label={`${s.name}, ${shortWeekday(date)} ${session === "am" ? "morning" : "afternoon"}: ${value ? LOOK[value].label : "not marked"}`}
                              className={cn(
                                "relative h-9 w-9 rounded-md border text-xs font-semibold transition-colors sm:h-8 sm:w-8",
                                value ? LOOK[value].tone : "border-dashed border-border-strong text-text-faint",
                                disabled && "cursor-not-allowed opacity-40",
                              )}
                            >
                              {value ? LOOK[value].letter : ""}
                              {changed && (
                                <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-surface-raised" />
                              )}
                            </button>
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <p className="text-xs text-text-faint">
        Tap a box to change it: blank → <b className="text-status-good">P</b>resent → <b className="text-status-warn">L</b>ate →{" "}
        <b className="text-status-bad">A</b>bsent → blank. Tap a name to mark that student present all week. A dot means not saved yet.
      </p>

      {/* Save stays reachable without scrolling past the whole class. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy || changes.length === 0} className="h-11 flex-1 sm:h-10 sm:flex-none">
            {saving ? "Saving…" : "Save week"}
          </Button>
          <span className="tabular shrink-0 text-xs text-text-faint">
            {changes.length === 0 ? "All saved" : `${changes.length} change${changes.length === 1 ? "" : "s"} not saved`}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Day / Week toggle, shared by both attendance views. */
export function ViewSwitch({ view, onDay, onWeek }: { view: "day" | "week"; onDay?: () => void; onWeek?: () => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">View</span>
      <div className="flex h-11 overflow-hidden rounded-lg border border-border-strong sm:h-10">
        {(["day", "week"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={v === view ? undefined : v === "day" ? onDay : onWeek}
            aria-pressed={v === view}
            className={cn(
              "flex-1 px-4 text-sm font-medium transition-colors sm:flex-none",
              v === view ? "bg-brand text-on-brand" : "bg-surface-raised text-text-soft hover:bg-surface-sunken",
            )}
          >
            {v === "day" ? "Day" : "Week"}
          </button>
        ))}
      </div>
    </div>
  );
}
