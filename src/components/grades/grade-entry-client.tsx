"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { rawToPercentage } from "@/lib/grades";
import { saveExamScores, saveWeeklyScores } from "@/app/(app)/grades/actions";

type Assignment = { id: string; label: string; gradeLevelId: string; subjectId: string; schoolId: string };
type QuarterOpt = { id: string; name: string; number: number };
type StudentOpt = { id: string; name: string };
type ExistingScore = { student_id: string; raw_score: number | null; max_score: number | null; percentage: number };
type Mode = "quiz" | "homework_participation" | "exam";

const MODE_TABS: { value: Mode; label: string }[] = [
  { value: "quiz", label: "Quizzes" },
  { value: "homework_participation", label: "Homework & Participation" },
  { value: "exam", label: "Quarterly Exam" },
];

export function GradeEntryClient(props: {
  assignments: Assignment[];
  quarters: QuarterOpt[];
  activeAssignmentId: string;
  activeQuarterId: string;
  mode: Mode;
  week: number;
  totalWeeks: number;
  students: StudentOpt[];
  existingScores: ExistingScore[];
  schoolYearId: string;
  subjectId: string;
}) {
  const { assignments, quarters, activeAssignmentId, activeQuarterId, mode, week, totalWeeks, students, existingScores, schoolYearId, subjectId } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [entryMode, setEntryMode] = useState<"percentage" | "raw">("percentage");
  const [maxScore, setMaxScore] = useState(100);
  const [saved, setSaved] = useState(false);

  const existingByStudent = useMemo(() => new Map(existingScores.map((s) => [s.student_id, s])), [existingScores]);

  const [values, setValues] = useState<Record<string, { raw: string; percentage: string }>>(() => {
    const initial: Record<string, { raw: string; percentage: string }> = {};
    for (const s of students) {
      const existing = existingByStudent.get(s.id);
      initial[s.id] = {
        raw: existing?.raw_score != null ? String(existing.raw_score) : "",
        percentage: existing ? String(existing.percentage) : "",
      };
    }
    return initial;
  });

  function updateQuery(next: Partial<{ assignment: string; quarter: string; mode: string; week: string }>) {
    const params = new URLSearchParams({
      assignment: activeAssignmentId,
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

  function save() {
    const entries = students.map((s) => {
      const v = values[s.id];
      const percentage = v?.percentage === "" || v?.percentage == null ? null : Number(v.percentage);
      const raw = entryMode === "raw" && v?.raw !== "" ? Number(v.raw) : null;
      return { studentId: s.id, raw, max: raw !== null ? maxScore : null, percentage };
    });

    startTransition(async () => {
      const result =
        mode === "exam"
          ? await saveExamScores({ quarterId: activeQuarterId, schoolYearId, subjectId, entries })
          : await saveWeeklyScores({ quarterId: activeQuarterId, schoolYearId, subjectId, assessmentType: mode, weekNumber: week, entries });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[220px] flex-1">
            <Select value={activeAssignmentId} onChange={(e) => updateQuery({ assignment: e.target.value })}>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
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
                className="rounded-md p-1.5 text-text-soft hover:bg-surface-sunken"
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-text">Week {week}</span>
              <button
                onClick={() => updateQuery({ week: String(Math.min(totalWeeks, week + 1)) })}
                className="rounded-md p-1.5 text-text-soft hover:bg-surface-sunken"
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
                onChange={(e) => setMaxScore(Number(e.target.value) || 1)}
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
    </div>
  );
}
