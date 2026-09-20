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
    router.push(`/grades?${params.toString()}`);
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
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Class</label>
            <Select value={activeSectionId} onChange={(e) => updateQuery({ section: e.target.value, subject: "" })}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Subject</label>
            <Select value={activeSubjectId} onChange={(e) => updateQuery({ subject: e.target.value })}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Quarter</label>
            <Select value={activeQuarterId} onChange={(e) => updateQuery({ quarter: e.target.value })}>
              {quarters.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {MODE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => updateQuery({ mode: t.value, week: "1" })}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                mode === t.value ? "bg-brand text-white" : "bg-surface-sunken text-text-soft hover:text-text",
              )}
            >
              {t.label}
            </button>
          ))}

          {mode !== "exam" && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => updateQuery({ week: String(Math.max(1, week - 1)) })}
                disabled={week <= 1}
                className="rounded-md p-1.5 text-text-soft hover:bg-surface-sunken disabled:opacity-40"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-text">
                Week {week} of {totalWeeks}
              </span>
              <button
                onClick={() => updateQuery({ week: String(Math.min(totalWeeks, week + 1)) })}
                disabled={week >= totalWeeks}
                className="rounded-md p-1.5 text-text-soft hover:bg-surface-sunken disabled:opacity-40"
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm">
          <span className="text-text-soft">Enter as:</span>
          <div className="flex overflow-hidden rounded-lg border border-border-strong">
            <button
              onClick={() => setEntryMode("percentage")}
              className={cn("px-3 py-1.5", entryMode === "percentage" ? "bg-brand-soft text-brand-strong" : "text-text-soft")}
            >
              Percentage
            </button>
            <button
              onClick={() => setEntryMode("raw")}
              className={cn("px-3 py-1.5", entryMode === "raw" ? "bg-brand-soft text-brand-strong" : "text-text-soft")}
            >
              Raw score
            </button>
          </div>
          {entryMode === "raw" && (
            <label className="flex items-center gap-2 text-text-soft">
              out of
              <input
                type="number"
                min={1}
                value={maxScore}
                onChange={(e) => changeMaxScore(Number(e.target.value) || 1)}
                className="h-8 w-16 rounded-md border border-border-strong bg-surface-raised px-2 text-center text-text"
              />
            </label>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-faint">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">{entryMode === "raw" ? `Score (out of ${maxScore})` : "Percentage"}</th>
              {entryMode === "raw" && <th className="px-4 py-3 font-medium">= %</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium text-text">{s.name}</td>
                <td className="px-4 py-2.5">
                  {entryMode === "raw" ? (
                    <input
                      type="number"
                      min={0}
                      max={maxScore}
                      value={values[s.id]?.raw ?? ""}
                      onChange={(e) => setRaw(s.id, e.target.value)}
                      className="h-9 w-24 rounded-md border border-border-strong bg-surface-raised px-2 text-text"
                    />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={values[s.id]?.percentage ?? ""}
                      onChange={(e) => setPercentage(s.id, e.target.value)}
                      className="h-9 w-24 rounded-md border border-border-strong bg-surface-raised px-2 text-text"
                    />
                  )}
                </td>
                {entryMode === "raw" && (
                  <td className="px-4 py-2.5 text-text-faint">{values[s.id]?.percentage || "—"}</td>
                )}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-text-faint">
                  No active students in this class yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending || students.length === 0}>
            <Save size={16} /> {pending ? "Saving…" : "Save scores"}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-status-good">
              <Check size={15} /> Saved
            </span>
          )}
        </div>
        {error && <p className="rounded-lg bg-status-bad-bg px-3 py-2 text-sm text-status-bad">{error}</p>}
      </div>
    </div>
  );
}
