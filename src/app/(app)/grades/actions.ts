"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/supabase/session";
import type { AssessmentType } from "@/lib/types";
import { HOMEWORK_WEEK } from "@/lib/grades";

export type ScoreEntry = { studentId: string; raw: number | null; max: number | null; percentage: number | null };

export type SaveResult = { error?: string; ok?: boolean };

/** A score has to be a real percentage; anything else is refused rather than stored. */
function invalidScore(entries: ScoreEntry[]): string | null {
  const bad = entries.find(
    (e) => e.percentage !== null && (!Number.isFinite(e.percentage) || e.percentage < 0 || e.percentage > 100),
  );
  return bad ? "A score has to be between 0 and 100%." : null;
}

export async function saveWeeklyScores(input: {
  quarterId: string;
  schoolYearId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  weekNumber: number;
  entries: ScoreEntry[];
  /** Students whose box was emptied: their saved score for this week is removed. */
  cleared?: string[];
}): Promise<SaveResult> {
  const invalid = invalidScore(input.entries);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);

  const rows = input.entries
    .filter((e): e is ScoreEntry & { percentage: number } => e.percentage !== null)
    .map((e) => ({
      student_id: e.studentId,
      school_year_id: input.schoolYearId,
      quarter_id: input.quarterId,
      subject_id: input.subjectId,
      assessment_type: input.assessmentType,
      week_number: input.assessmentType === "homework_participation" ? HOMEWORK_WEEK : input.weekNumber,
      raw_score: e.raw,
      max_score: e.max,
      percentage: e.percentage,
      recorded_by: userId ?? undefined,
    }));

  const cleared = input.cleared ?? [];
  if (!rows.length && !cleared.length) return { error: "Enter at least one score before saving." };

  if (rows.length) {
    const { error } = await supabase
      .from("weekly_scores")
      .upsert(rows, { onConflict: "student_id,quarter_id,subject_id,assessment_type,week_number" });
    if (error) return { error: error.message };
  }
  const homework = input.assessmentType === "homework_participation";
  if (cleared.length) {
    let del = supabase
      .from("weekly_scores")
      .delete()
      .eq("quarter_id", input.quarterId)
      .eq("subject_id", input.subjectId)
      .eq("assessment_type", input.assessmentType)
      .in("student_id", cleared);
    // Homework is one score a quarter: clearing it clears every week's.
    if (!homework) del = del.eq("week_number", input.weekNumber);
    const { error } = await del;
    if (error) return { error: error.message };
  }
  if (homework && rows.length) {
    // The quarter's one homework score replaces any entered week by week
    // before; the grade grid showed those as their average already.
    const { error } = await supabase
      .from("weekly_scores")
      .delete()
      .eq("quarter_id", input.quarterId)
      .eq("subject_id", input.subjectId)
      .eq("assessment_type", input.assessmentType)
      .neq("week_number", HOMEWORK_WEEK)
      .in(
        "student_id",
        rows.map((r) => r.student_id),
      );
    if (error) return { error: error.message };
  }

  revalidatePath("/grades");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveExamScores(input: {
  quarterId: string;
  schoolYearId: string;
  subjectId: string;
  entries: ScoreEntry[];
  /** Students whose box was emptied: their saved exam score is removed. */
  cleared?: string[];
}): Promise<SaveResult> {
  const invalid = invalidScore(input.entries);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);

  const rows = input.entries
    .filter((e): e is ScoreEntry & { percentage: number } => e.percentage !== null)
    .map((e) => ({
      student_id: e.studentId,
      school_year_id: input.schoolYearId,
      quarter_id: input.quarterId,
      subject_id: input.subjectId,
      raw_score: e.raw,
      max_score: e.max,
      percentage: e.percentage,
      recorded_by: userId ?? undefined,
    }));

  const cleared = input.cleared ?? [];
  if (!rows.length && !cleared.length) return { error: "Enter at least one score before saving." };

  if (rows.length) {
    const { error } = await supabase
      .from("quarter_exam_scores")
      .upsert(rows, { onConflict: "student_id,quarter_id,subject_id" });
    if (error) return { error: error.message };
  }
  if (cleared.length) {
    const { error } = await supabase
      .from("quarter_exam_scores")
      .delete()
      .eq("quarter_id", input.quarterId)
      .eq("subject_id", input.subjectId)
      .in("student_id", cleared);
    if (error) return { error: error.message };
  }

  revalidatePath("/grades");
  revalidatePath("/dashboard");
  return { ok: true };
}
