"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { rawToPercentage } from "@/lib/grades";
import { saveExamScores, saveWeeklyScores } from "@/app/(app)/grades/actions";

type SectionOpt = { id: string; label: string };
type SubjectOpt = { id: string; name: string };
type QuarterOpt = { id: string; name: string; number: number };
type StudentOpt = { id: string; name: string };
type ExistingScore = { student_id: string; raw_score: number | null; max_score: number | null; percentage: number };
type Mode = "quiz" | "homework_participation" | "exam";

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
  const [pending, startTransition] = useTransition();
  // Changing class, subject, quarter or week has to go back to the
  // server for those scores. Tracked apart from saving so the sheet
  // can dim and lock while it loads rather than looking frozen.
  const [loading, startNavigation] = useTransition();
  const [saved, setSaved] = useState(false);
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

  function updateQuery(next: Partial<Record<"section" | "subject" | "quarter" | "mode" | "week", string>>) {
    const params = new URLSearchParams({
      section: activeSectionId,
      subject: activeSubjectId,
      quarter: activeQuarterId,
      mode,
      week: String(week),
      ...next,
    });
    startNavigation(() => router.push(`/grades?${params.toString()}`));
  }

  function setRaw(studentId: string, raw: string) {
    const pct = raw === "" ? "" : String(rawToPercentage(Number(raw), maxScore));
    setValues((v) => ({ ...v, [studentId]: { raw, percentage: pct } }));
  }

  function setPercentage(studentId: string, pct: string) {
    setValues((v) => ({ ...v, [studentId]: { raw: "", percentage: pct } }));
  }

  /**
   * Changing "out of N" has to recompute every percentage already
   * typed — otherwise 18 entered as "out of 100" silently stays 18%
   * after switching to "out of 20", and that wrong number is what
   * gets saved as the grade.
   */
  function changeMaxScore(nextMax: number) {
    setMaxScore(nextMax);
    setValues((v) => {
      const next: typeof v = {};
      for (const [studentId, entry] of Object.entries(v)) {
        next[studentId] =
          entry.raw === ""
            ? entry
            : { raw: entry.raw, percentage: String(rawToPercentage(Number(entry.raw), nextMax)) };
      }
      return next;
    });
  }

  const entered = students.filter((s) => (values[s.id]?.percentage ?? "") !== "").length;

  function save() {
    setError(null);
    const entries = students.map((s) => {
      const v = values[s.id];
      const percentage = !v || v.percentage === "" ? null : Number(v.percentage);
      const raw = entryMode === "raw" && v && v.raw !== "" ? Number(v.raw) : null;
      return { studentId: s.id, raw, max: raw !== null ? maxScore : null, percentage };
    });

    startTransition(async () => {
      const result =
        mode === "exam"
          ? await saveExamScores({ quarterId: activeQuarterId, schoolYearId, subjectId: activeSubjectId, entries })
          : await saveWeeklyScores({
              quarterId: activeQuarterId,
              schoolYearId,
              subjectId: activeSubjectId,
              assessmentType: mode,
              weekNumber: week,
              entries,
            });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } else {
        setError(result.error ?? "Couldn't save these scores. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr]">
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
        <div className="mt-3 border-t border-border pt-3 sm:mt-4 sm:pt-4">
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

          {mode !== "exam" && (
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
              onClick={() => setEntryMode("percentage")}
              className={cn("px-3 py-2 sm:py-1.5", entryMode === "percentage" ? "bg-brand-soft text-brand-strong" : "text-text-soft")}
            >
              Percentage
            </button>
            <button
              onClick={() => setEntryMode("raw")}
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

      <div className={cn("transition-opacity", loading && "pointer-events-none opacity-50")}>
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

      {error && <p className="rounded-lg bg-status-bad-bg px-3 py-2 text-sm text-status-bad">{error}</p>}

      {/* Save stays reachable without scrolling past the whole class. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <Button
            onClick={save}
            disabled={pending || loading || students.length === 0}
            className="h-11 flex-1 sm:h-10 sm:flex-none"
          >
            <Save size={16} /> {pending ? "Saving…" : "Save scores"}
          </Button>
          {saved ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm text-status-good">
              <Check size={15} /> Saved
            </span>
          ) : (
            students.length > 0 && (
              <span className="tabular shrink-0 text-xs text-text-faint">
                {entered}/{students.length} entered
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreInput({
  entryMode,
  maxScore,
  value,
  onRaw,
  onPercentage,
  className,
}: {
  entryMode: "percentage" | "raw";
  maxScore: number;
  value?: { raw: string; percentage: string };
  onRaw: (v: string) => void;
  onPercentage: (v: string) => void;
  className?: string;
}) {
  const shared = cn(
    "shrink-0 rounded-md border border-border-strong bg-surface-raised px-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
      className={shared}
    />
  );
}
