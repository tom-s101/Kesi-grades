"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AssessmentType } from "@/lib/types";

export type ScoreEntry = { studentId: string; raw: number | null; max: number | null; percentage: number | null };

export type SaveResult = { error?: string; ok?: boolean };

export async function saveWeeklyScores(input: {
  quarterId: string;
  schoolYearId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  weekNumber: number;
  entries: ScoreEntry[];
}): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = input.entries
    .filter((e): e is ScoreEntry & { percentage: number } => e.percentage !== null)
    .map((e) => ({
      student_id: e.studentId,
      school_year_id: input.schoolYearId,
      quarter_id: input.quarterId,
      subject_id: input.subjectId,
      assessment_type: input.assessmentType,
      week_number: input.weekNumber,
      raw_score: e.raw,
      max_score: e.max,
      percentage: e.percentage,
      recorded_by: user?.id,
    }));

  if (!rows.length) return { error: "Enter at least one score before saving." };

  const { error } = await supabase
    .from("weekly_scores")
    .upsert(rows, { onConflict: "student_id,quarter_id,subject_id,assessment_type,week_number" });

  if (error) return { error: error.message };
  revalidatePath("/grades");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveExamScores(input: {
  quarterId: string;
  schoolYearId: string;
  subjectId: string;
  entries: ScoreEntry[];
}): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      recorded_by: user?.id,
    }));

  if (!rows.length) return { error: "Enter at least one score before saving." };

  const { error } = await supabase
    .from("quarter_exam_scores")
    .upsert(rows, { onConflict: "student_id,quarter_id,subject_id" });

  if (error) return { error: error.message };
  revalidatePath("/grades");
  revalidatePath("/dashboard");
  return { ok: true };
}
