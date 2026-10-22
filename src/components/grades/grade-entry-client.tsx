"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionLoader, Spinner } from "@/components/ui/loader";
import { rawToPercentage } from "@/lib/grades";
import { saveExamScores, saveWeeklyScores } from "@/app/(app)/grades/actions";

type SectionOpt = { id: string; label: string };
type SubjectOpt = { id: string; name: string };
type QuarterOpt = { id: string; name: string; number: number };
type StudentOpt = { id: string; name: string };
type ExistingScore = { student_id: string; raw_score: number | null; max_score: number | null; percentage: number };
type Mode = "quiz" | "homework_participation" | "exam";
/** One student's score as stored: what autosave compares against. */
type Stored = { pct: number | null; raw: number | null; max: number | null };
type SaveStatus = "saved" | "pending" | "saving" | "error" | "invalid";

/** What a student's box means, or "invalid" if it can't be saved as it stands. */
function readScoreBox(
  box: { raw: string; percentage: string } | undefined,
  entryMode: "percentage" | "raw",
  maxScore: number,
): Stored | "invalid" {
  if (!box || box.percentage === "") return { pct: null, raw: null, max: null };
  const pct = Number(box.percentage);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return "invalid";
  const raw = entryMode === "raw" && box.raw !== "" ? Number(box.raw) : null;
  return { pct, raw, max: raw !== null ? maxScore : null };
}

/** Wait this long after the last keystroke before saving. */
const AUTOSAVE_DELAY_MS = 1200;
/** And this long before trying again after a failed save. */
const RETRY_DELAY_MS = 5000;

const MODE_TABS: { value: Mode; label: string }[] = [
  { value: "quiz", label: "Quizzes" },
  { value: "homework_participation", label: "Homework & Participation" },
  { value: "exam", label: "Quarterly Exam" },
];

export function GradeEntryClient({
  sections,
  subjects,
  quarters,
  activeSectionId,
  activeSubjectId,
  activeQuarterId,
  mode,
  week,
  totalWeeks,
  students,
  existingScores,
  schoolYearId,
}: {
  sections: SectionOpt[];
  subjects: SubjectOpt[];
  quarters: QuarterOpt[];
  activeSectionId: string;
  activeSubjectId: string;
  activeQuarterId: string;
  mode: Mode;
  week: number;
  totalWeeks: number;
  students: StudentOpt[];
  existingScores: ExistingScore[];
  schoolYearId: string;
}) {
  const router = useRouter();
  // Changing class, subject, quarter or week has to go back to the
  // server for those scores. Tracked apart from saving so the sheet
  // can dim and lock while it loads rather than looking frozen.
  const [loading, startNavigation] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // A saved raw score tells us what it was marked out of; default to
  // that so reopening a week shows the same "out of" the teacher used.
  const savedMax = existingScores.find((s) => s.max_score != null)?.max_score ?? null;
  const [entryMode, setEntryMode] = useState<"percentage" | "raw">(savedMax != null ? "raw" : "percentage");
  const [maxScore, setMaxScore] = useState(savedMax ?? 100);

  const [values, setValues] = useState<Record<string, { raw: string; percentage: string }>>(() => {
    const byStudent = new Map(existingScores.map((s) => [s.student_id, s]));
    const initial: Record<string, { raw: string; percentage: string }> = {};
    for (const s of students) {
      const existing = byStudent.get(s.id);
      initial[s.id] = {
        raw: existing?.raw_score != null ? String(existing.raw_score) : "",
        percentage: existing ? String(existing.percentage) : "",
      };
    }
    return initial;
  });

  // ---------------------------------------------------------------
  // Autosave. `stored` is what the database holds; whatever on screen
  // differs from it gets saved about a second after the teacher stops
  // typing, before leaving the week, and when the phone switches away.
  // Only the differences are sent, and anything typed while a save is
  // on its way is picked up by the next one.
  // ---------------------------------------------------------------
  const stored = useRef<Record<string, Stored>>(
    Object.fromEntries(
      existingScores.map((e) => [e.student_id, { pct: e.percentage, raw: e.raw_score, max: e.max_score }]),
    ),
  );
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  // Timers and retries call the latest saveNow through here.
  const saveAgain = useRef<() => Promise<boolean>>(async () => true);
  // The latest screen state, for saves that run from timers and from
  // leaving a box. Updated right in the handlers below, not after the
  // next render: a teacher who types and taps "next week" in one motion
  // must have that last score saved before the week changes.
  const latest = useRef({ values, entryMode, maxScore });

  const readBox = useCallback((studentId: string): Stored | "invalid" => {
    const { values: v, entryMode: m, maxScore: max } = latest.current;
    return readScoreBox(v[studentId], m, max);
  }, []);

  const changesToSave = useCallback(() => {
    const entries: { studentId: string; raw: number | null; max: number | null; percentage: number | null }[] = [];
    const cleared: string[] = [];
    let invalid = 0;
    for (const s of students) {
      const now = readBox(s.id);
      if (now === "invalid") {
        invalid += 1;
        continue;
      }
      const was = stored.current[s.id] ?? { pct: null, raw: null, max: null };
      // Switching "Enter as" to Percentage only changes how scores are
      // shown; an untouched percentage isn't a change worth re-saving.
      const rawMatters = latest.current.entryMode === "raw";
      if (now.pct === was.pct && (!rawMatters || (now.raw === was.raw && now.max === was.max))) continue;
      if (now.pct === null) cleared.push(s.id);
      else entries.push({ studentId: s.id, raw: now.raw, max: now.max, percentage: now.pct });
    }
    return { entries, cleared, invalid };
  }, [students, readBox]);

  /** Save everything not yet saved. Resolves true once nothing is left unsaved. */
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    // One save at a time; a second request waits for it, then saves
    // whatever changed in the meantime.
    if (inFlight.current) await inFlight.current;

    const { entries, cleared, invalid } = changesToSave();
    if (!entries.length && !cleared.length) {
      setStatus(invalid ? "invalid" : "saved");
      return invalid === 0;
    }

    setStatus("saving");
    setError(null);
    const run = (async () => {
      const result = await (mode === "exam"
        ? saveExamScores({ quarterId: activeQuarterId, schoolYearId, subjectId: activeSubjectId, entries, cleared })
        : saveWeeklyScores({
            quarterId: activeQuarterId,
            schoolYearId,
            subjectId: activeSubjectId,
            assessmentType: mode,
            weekNumber: week,
            entries,
            cleared,
          })
      ).catch(() => ({ ok: false, error: "No connection — your scores will save as soon as it's back." }) as const);

      if (!result.ok) {
        setStatus("error");
        setError(result.error ?? "Couldn't save these scores.");
        timer.current = setTimeout(() => void saveAgain.current(), RETRY_DELAY_MS);
        return false;
      }
      for (const e of entries) stored.current[e.studentId] = { pct: e.percentage, raw: e.raw, max: e.max };
      for (const id of cleared) stored.current[id] = { pct: null, raw: null, max: null };
      setLastSavedAt(new Date());
      return true;
    })();
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    if (!ok) return false;

    // Typed while that save was on its way? Go again.
    const after = changesToSave();
    if (after.entries.length || after.cleared.length) return saveAgain.current();
    setStatus(after.invalid ? "invalid" : "saved");
    return after.invalid === 0;
  }, [changesToSave, mode, activeQuarterId, schoolYearId, activeSubjectId, week]);

  useEffect(() => {
    saveAgain.current = saveNow;
  }, [saveNow]);

  // Every change starts (or restarts) the countdown to an autosave.
  useEffect(() => {
    const { entries, cleared, invalid } = changesToSave();
    if (!entries.length && !cleared.length) {
      if (!inFlight.current) setStatus(invalid ? "invalid" : "saved");
      return;
    }
    if (!inFlight.current) setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
  }, [values, entryMode, maxScore, changesToSave, saveNow]);

  // Switching to another app or locking the phone: save straight away.
  // Closing the tab with unsaved scores: ask first.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void saveNow();
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      const { entries, cleared } = changesToSave();
      if (entries.length || cleared.length || inFlight.current) {
        void saveNow();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onLeave);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [saveNow, changesToSave]);

  function updateQuery(next: Partial<Record<"section" | "subject" | "quarter" | "mode" | "week", string>>) {
    const params = new URLSearchParams({
      section: activeSectionId,
      subject: activeSubjectId,
      quarter: activeQuarterId,
      mode,
      week: String(week),
      ...next,
    });
    startNavigation(async () => {
      // Save this week's scores before showing another.
      const ok = await saveNow();
      if (!ok && !window.confirm("Some scores here haven't saved yet. Leave anyway and lose them?")) return;
      router.push(`/grades?${params.toString()}`);
    });
  }

  /** Every change to the screen goes through here, keeping `latest` exact. */
  function apply(next: Partial<{ values: typeof values; entryMode: "percentage" | "raw"; maxScore: number }>) {
    latest.current = { ...latest.current, ...next };
    if (next.values) setValues(next.values);
    if (next.entryMode) setEntryMode(next.entryMode);
    if (next.maxScore !== undefined) setMaxScore(next.maxScore);
  }

  function setRaw(studentId: string, raw: string) {
    const max = latest.current.maxScore;
    const pct = raw === "" ? "" : String(rawToPercentage(Number(raw), max));
    apply({ values: { ...latest.current.values, [studentId]: { raw, percentage: pct } } });
  }

  function setPercentage(studentId: string, pct: string) {
    apply({ values: { ...latest.current.values, [studentId]: { raw: "", percentage: pct } } });
  }

  /**
   * Changing "out of N" has to recompute every percentage already
   * typed — otherwise 18 entered as "out of 100" silently stays 18%
   * after switching to "out of 20", and that wrong number is what
   * gets saved as the grade.
   */
  function changeMaxScore(nextMax: number) {
    const next: typeof values = {};
    for (const [studentId, entry] of Object.entries(latest.current.values)) {
      next[studentId] =
        entry.raw === "" ? entry : { raw: entry.raw, percentage: String(rawToPercentage(Number(entry.raw), nextMax)) };
    }
    apply({ maxScore: nextMax, values: next });
  }

  const entered = students.filter((s) => (values[s.id]?.percentage ?? "") !== "").length;
  const isInvalid = (studentId: string) => readScoreBox(values[studentId], entryMode, maxScore) === "invalid";

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr]" data-tour="grades-pickers">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Class</label>
            <Select
              value={activeSectionId}
              disabled={loading}
              onChange={(e) => updateQuery({ section: e.target.value, subject: "" })}
              className="h-11 text-base sm:h-10 sm:text-sm"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Subject</label>
            <Select
              value={activeSubjectId}
              disabled={loading}
              onChange={(e) => updateQuery({ subject: e.target.value })}
              className="h-11 text-base sm:h-10 sm:text-sm"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Quarter</label>
            <Select
              value={activeQuarterId}
              disabled={loading}
              onChange={(e) => updateQuery({ quarter: e.target.value })}
              className="h-11 text-base sm:h-10 sm:text-sm"
            >
              {quarters.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Three long labels don't fit across a phone, so the tabs
            scroll sideways rather than wrapping into a ragged block. */}
        <div className="mt-3 border-t border-border pt-3 sm:mt-4 sm:pt-4" data-tour="grades-tabs">
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {MODE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => updateQuery({ mode: t.value, week: "1" })}
                disabled={loading}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 sm:py-1.5",
                  mode === t.value ? "bg-brand text-on-brand" : "bg-surface-sunken text-text-soft hover:text-text",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {mode === "homework_participation" && (
            <p className="mt-3 text-sm text-text-soft">
              One score for the whole quarter — no need to enter it every week.
            </p>
          )}
          {mode === "quiz" && (
            <div className="mt-3 flex items-center justify-between gap-1.5 sm:justify-end">
              <button
                onClick={() => updateQuery({ week: String(Math.max(1, week - 1)) })}
                disabled={loading || week <= 1}
                className="rounded-lg border border-border-strong p-2 text-text-soft hover:bg-surface-sunken disabled:opacity-40"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="tabular text-sm font-medium text-text">
                Week {week} of {totalWeeks}
              </span>
              <button
                onClick={() => updateQuery({ week: String(Math.min(totalWeeks, week + 1)) })}
                disabled={loading || week >= totalWeeks}
                className="rounded-lg border border-border-strong p-2 text-text-soft hover:bg-surface-sunken disabled:opacity-40"
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm sm:mt-4 sm:pt-4">
          <span className="text-text-soft">Enter as:</span>
          <div className="flex overflow-hidden rounded-lg border border-border-strong">
            <button
              onClick={() => apply({ entryMode: "percentage" })}
              className={cn("px-3 py-2 sm:py-1.5", entryMode === "percentage" ? "bg-brand-soft text-brand-strong" : "text-text-soft")}
            >
              Percentage
            </button>
            <button
              onClick={() => apply({ entryMode: "raw" })}
              className={cn("px-3 py-2 sm:py-1.5", entryMode === "raw" ? "bg-brand-soft text-brand-strong" : "text-text-soft")}
            >
              Raw score
            </button>
          </div>
          {entryMode === "raw" && (
            <label className="flex items-center gap-2 text-text-soft">
              out of
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={maxScore}
                onChange={(e) => changeMaxScore(Number(e.target.value) || 1)}
                className="h-10 w-16 rounded-md border border-border-strong bg-surface-raised px-2 text-center text-base text-text sm:h-8 sm:text-sm"
              />
            </label>
          )}
          {loading && <span className="text-xs text-text-faint">Loading…</span>}
        </div>
      </Card>

      {/* Switching class (or week, or date): the old sheet stays up, dimmed,
          with the loader over it until the new one arrives. */}
      {loading && (
        <div className="relative z-10 h-0">
          <div className="absolute inset-x-0 top-6 flex justify-center">
            <SectionLoader label="Loading" className="rounded-2xl bg-surface-raised/95 px-8 py-4 shadow-elev-2" />
          </div>
        </div>
      )}
      <div className={cn("transition-opacity", loading && "pointer-events-none opacity-50")} data-tour="grades-sheet">
        {students.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-text-faint">
            No active students in this class yet.
          </Card>
        ) : (
          <>
            {/* Phones: name above the box, so a long name can't squeeze
                the input down to nothing. */}
            <ul className="space-y-2 sm:hidden">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-text">{s.name}</span>
                  <ScoreInput
                    entryMode={entryMode}
                    maxScore={maxScore}
                    value={values[s.id]}
                    onRaw={(v) => setRaw(s.id, v)}
                    onPercentage={(v) => setPercentage(s.id, v)}
                    onBlur={() => void saveNow()}
                    invalid={isInvalid(s.id)}
                    className="h-11 w-24 text-base"
                  />
                  {entryMode === "raw" && (
                    <span className="tabular w-12 shrink-0 text-right text-sm text-text-faint">
                      {values[s.id]?.percentage ? `${values[s.id].percentage}%` : "—"}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <Card className="hidden overflow-hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-faint">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">
                      {entryMode === "raw" ? `Score (out of ${maxScore})` : "Percentage"}
                    </th>
                    {entryMode === "raw" && <th className="px-4 py-3 font-medium">= %</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-text">{s.name}</td>
                      <td className="px-4 py-2.5">
                        <ScoreInput
                          entryMode={entryMode}
                          maxScore={maxScore}
                          value={values[s.id]}
                          onRaw={(v) => setRaw(s.id, v)}
                          onPercentage={(v) => setPercentage(s.id, v)}
                          onBlur={() => void saveNow()}
                          invalid={isInvalid(s.id)}
                          className="h-9 w-24"
                        />
                      </td>
                      {entryMode === "raw" && (
                        <td className="tabular px-4 py-2.5 text-text-faint">{values[s.id]?.percentage || "—"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>

      {status === "invalid" && (
        <p className="rounded-lg bg-status-warn-bg px-3 py-2 text-sm text-status-warn">
          A highlighted score is over {entryMode === "raw" ? `${maxScore}` : "100%"} — fix it and it will save.
        </p>
      )}
      {status === "error" && error && (
        <p className="rounded-lg bg-status-bad-bg px-3 py-2 text-sm text-status-bad">{error} Trying again…</p>
      )}

      {/* Saving happens by itself; the button is there for peace of mind. */}
      <div
        data-tour="grades-save"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void saveNow()}
            disabled={status === "saving" || status === "saved" || loading || students.length === 0}
            className="h-11 flex-1 sm:h-10 sm:flex-none"
          >
            <Save size={16} /> Save now
          </Button>
          <SaveState status={status} lastSavedAt={lastSavedAt} />
          {students.length > 0 && (
            <span className="tabular ml-auto hidden shrink-0 text-xs text-text-faint sm:inline">
              {entered}/{students.length} entered
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** What autosave is doing, in a few words. */
function SaveState({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: Date | null }) {
  if (status === "saving") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-text-soft">
        <Spinner size={14} /> Saving…
      </span>
    );
  }
  if (status === "pending") return <span className="shrink-0 text-sm text-text-faint">Unsaved changes…</span>;
  if (status === "error") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-status-bad">
        <AlertTriangle size={15} /> Not saved — retrying
      </span>
    );
  }
  if (status === "invalid") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-status-warn">
        <AlertTriangle size={15} /> Check a score
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-status-good">
      <Check size={15} />
      {lastSavedAt
        ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : "All changes saved"}
    </span>
  );
}

function ScoreInput({
  entryMode,
  maxScore,
  value,
  onRaw,
  onPercentage,
  onBlur,
  invalid = false,
  className,
}: {
  entryMode: "percentage" | "raw";
  maxScore: number;
  value?: { raw: string; percentage: string };
  onRaw: (v: string) => void;
  onPercentage: (v: string) => void;
  /** Leaving a box saves straight away, rather than waiting for the timer. */
  onBlur?: () => void;
  invalid?: boolean;
  className?: string;
}) {
  const shared = cn(
    "shrink-0 rounded-md border bg-surface-raised px-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    invalid ? "border-status-bad bg-status-bad-bg" : "border-border-strong",
    className,
  );

  return entryMode === "raw" ? (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={maxScore}
      value={value?.raw ?? ""}
      onChange={(e) => onRaw(e.target.value)}
      onBlur={onBlur}
      aria-invalid={invalid || undefined}
      className={shared}
    />
  ) : (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={100}
      step={0.01}
      value={value?.percentage ?? ""}
      onChange={(e) => onPercentage(e.target.value)}
      onBlur={onBlur}
      aria-invalid={invalid || undefined}
      className={shared}
    />
  );
}
