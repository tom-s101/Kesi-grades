/** Grade-computation helpers mirroring supabase/migrations/0003_views.sql
 *  (quarterly_grades / final_grades) — used client-side for live previews
 *  before a save round-trips to the database. */

export const DEFAULT_WEIGHTS = {
  exam: 0.85,
  quiz: 0.12,
  homework: 0.03,
} as const;

export function rawToPercentage(raw: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((raw / max) * 10000) / 100;
}

export function computeQuarterlyGrade(input: {
  examPercentage: number | null;
  quizPercentages: number[];
  homeworkPercentages: number[];
  weights?: { exam: number; quiz: number; homework: number };
}): number | null {
  const { examPercentage, quizPercentages, homeworkPercentages } = input;
  const weights = input.weights ?? DEFAULT_WEIGHTS;
  if (examPercentage === null) return null;

  const quizAvg = average(quizPercentages);
  const hwAvg = average(homeworkPercentages);

  const grade = examPercentage * weights.exam + quizAvg * weights.quiz + hwAvg * weights.homework;
  return Math.round(grade * 100) / 100;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** DepEd-style descriptor bands (Grades 1-12 report cards, per DO 8 s. 2015). */
export function remarkFor(grade: number | null): { label: string; tone: "good" | "warn" | "bad" | "neutral" } {
  if (grade === null) return { label: "Incomplete", tone: "neutral" };
  if (grade >= 90) return { label: "Outstanding", tone: "good" };
  if (grade >= 85) return { label: "Very Satisfactory", tone: "good" };
  if (grade >= 80) return { label: "Satisfactory", tone: "good" };
  if (grade >= 75) return { label: "Fairly Satisfactory", tone: "warn" };
  return { label: "Did Not Meet Expectations", tone: "bad" };
}

export const PASSING_GRADE = 75;
