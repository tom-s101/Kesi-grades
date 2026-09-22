import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getQuarters } from "@/lib/queries";
import { fullName, ageFromBirthdate } from "@/lib/format";
import { remarkFor, PASSING_GRADE } from "@/lib/grades";
import { Topbar } from "@/components/layout/topbar";
import { PrintButton } from "@/components/reports/print-button";

export default async function ReportCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const supabase = await createClient();

  const { data: studentRaw } = await supabase
    .from("students")
    .select("*, grade_levels(name), schools(name), class_sections(name)")
    .eq("id", id)
    .single();
  if (!studentRaw) notFound();
  const student = studentRaw as unknown as import("@/lib/types").Student & {
    grade_levels: { name: string } | null;
    schools: { name: string } | null;
    class_sections: { name: string } | null;
  };
  const gradeAndSection = `${student.grade_levels?.name ?? "—"}${
    student.class_sections?.name && student.class_sections.name !== "Main" ? ` (${student.class_sections.name})` : ""
  }`;

  const schoolYear = await getCurrentSchoolYear();
  const quarters = schoolYear ? await getQuarters(schoolYear.id) : [];

  const [{ data: grades }, { data: summary }] = await Promise.all([
    supabase.from("quarterly_grades").select("*").eq("student_id", id).order("quarter_number"),
    schoolYear
      ? supabase.from("student_attendance_summary").select("*").eq("student_id", id).eq("school_year_id", schoolYear.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const bySubject = new Map<string, typeof grades>();
  (grades ?? []).forEach((g) => {
    const list = bySubject.get(g.subject_name) ?? [];
    list.push(g);
    bySubject.set(g.subject_name, list);
  });

  const finalAverages = [...bySubject.values()].map((rows) => {
    const completed = rows!.filter((r) => r.quarterly_grade !== null);
    return completed.length ? completed.reduce((a, r) => a + (r.quarterly_grade ?? 0), 0) / completed.length : null;
  });
  const validAverages = finalAverages.filter((a): a is number => a !== null);
  const generalAverage = validAverages.length ? Math.round((validAverages.reduce((a, b) => a + b, 0) / validAverages.length) * 100) / 100 : null;

  return (
    <>
      <Topbar teacher={teacher} title="Report Card" />
      <main className="flex-1 space-y-4 p-4 lg:p-8">
        <div className="no-print">
          <PrintButton />
        </div>

        <div className="mx-auto max-w-3xl rounded-sm border border-neutral-300 bg-white p-8 text-neutral-900 shadow-sm print:m-0 print:max-w-none print:border-0 print:shadow-none">
          <header className="mb-6 flex items-center justify-between border-b-2 border-neutral-800 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Katutubo Excel Schools</p>
              <h1 className="font-serif text-2xl font-semibold">{student.schools?.name}</h1>
            </div>
            <div className="text-right text-xs text-neutral-500">
              <p>Learner&rsquo;s Report Card</p>
              <p>SY {schoolYear?.label}</p>
            </div>
          </header>

          <section className="mb-6 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <Field label="Name" value={fullName(student)} className="col-span-2 sm:col-span-2" />
            <Field label="LRN" value={student.lrn ?? "—"} />
            <Field label="Sex" value={student.sex ?? "—"} />
            <Field label="Grade & Section" value={gradeAndSection} />
            <Field label="Age" value={String(ageFromBirthdate(student.birthdate) ?? "—")} />
            <Field label="Status" value={student.status} className="capitalize" />
          </section>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-100">
                <th className="border border-neutral-300 px-2 py-1.5 text-left">Learning Area</th>
                {quarters.map((q) => (
                  <th key={q.id} className="border border-neutral-300 px-2 py-1.5">
                    Q{q.number}
                  </th>
                ))}
                <th className="border border-neutral-300 px-2 py-1.5">Final</th>
                <th className="border border-neutral-300 px-2 py-1.5">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {[...bySubject.entries()].map(([subject, rows]) => {
                const byQ = new Map(rows!.map((r) => [r.quarter_number, r.quarterly_grade]));
                const completed = rows!.filter((r) => r.quarterly_grade !== null);
                const average = completed.length ? completed.reduce((a, r) => a + (r.quarterly_grade ?? 0), 0) / completed.length : null;
                const remark = remarkFor(average);
                return (
                  <tr key={subject}>
                    <td className="border border-neutral-300 px-2 py-1.5 font-medium">{subject}</td>
                    {quarters.map((q) => (
                      <td key={q.id} className="border border-neutral-300 px-2 py-1.5 text-center">
                        {byQ.get(q.number) ?? "—"}
                      </td>
                    ))}
                    <td className="border border-neutral-300 px-2 py-1.5 text-center font-semibold">
                      {average !== null ? Math.round(average * 100) / 100 : "—"}
                    </td>
                    <td className="border border-neutral-300 px-2 py-1.5 text-center text-xs">{remark.label}</td>
                  </tr>
                );
              })}
              <tr className="bg-neutral-50 font-semibold">
                <td className="border border-neutral-300 px-2 py-1.5" colSpan={quarters.length + 1}>
                  General Average
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 text-center" colSpan={2}>
                  {generalAverage ?? "—"}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-2 text-[11px] text-neutral-500">
            Quarterly grade = 85% Quarterly Exam + 12% Quizzes + 3% Homework &amp; Participation. Passing mark: {PASSING_GRADE}.
          </p>

          <section className="mt-6 grid grid-cols-3 gap-4 border-t border-neutral-300 pt-4 text-sm">
            <Field label="Total lates" value={String(summary?.total_lates ?? 0)} />
            <Field label="Effective absences" value={String(summary?.effective_absences ?? 0)} />
            <Field
              label="Status"
              value={summary?.should_be_dropped ? "Drop threshold reached" : summary?.at_warning ? "At risk" : "Good standing"}
            />
          </section>

          <section className="mt-12 grid grid-cols-3 gap-8 text-center text-xs">
            <Signature label="Class Adviser" />
            <Signature label="Head Teacher / Principal" />
            <Signature label="Parent / Guardian" />
          </section>
        </div>
      </main>
    </>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 h-12 border-b border-neutral-400" />
      <p className="text-neutral-500">{label}</p>
    </div>
  );
}
