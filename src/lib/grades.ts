/** Grade-computation helpers mirroring the quarterly_grades view (latest: 0016)
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

  // Averages over the scores entered only; a part with none at all is
  // left out and the other weights scaled back up (migration 0016).
  const quizAvg = average(quizPercentages);
  const hwAvg = average(homeworkPercentages);

  const total =
    examPercentage * weights.exam + (quizAvg ?? 0) * weights.quiz + (hwAvg ?? 0) * weights.homework;
  const weight = weights.exam + (quizAvg === null ? 0 : weights.quiz) + (hwAvg === null ? 0 : weights.homework);
  return Math.round((total / weight) * 100) / 100;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
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

/**
 * KESI's passing mark, for every subject. (DepEd's own is 75; the school
 * sets a higher bar.) Used by the dashboard, the Organization page, the
 * subject chart's colouring and the report card.
 */
export const PASSING_GRADE = 80;
