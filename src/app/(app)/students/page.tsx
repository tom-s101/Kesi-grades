import Link from "next/link";
import { Plus, TriangleAlert } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getGradeLevels, getSchools, getCurrentSchoolYear, getVisibleStudents } from "@/lib/queries";
import { fullName, initials } from "@/lib/format";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; grade?: string; q?: string }>;
}) {
  const teacher = await requireTeacher();
  const { school, grade, q } = await searchParams;
  const supabase = await createClient();

  const [gradeLevels, schools, schoolYear] = await Promise.all([
    getGradeLevels(),
    teacher.is_master_admin ? getSchools() : Promise.resolve([]),
    getCurrentSchoolYear(),
  ]);

  const students = await getVisibleStudents({ schoolId: school, gradeLevelId: grade }, teacher);
  const filtered = q
    ? students.filter((s) => fullName(s).toLowerCase().includes(q.toLowerCase()))
    : students;

  const summaryByStudent = new Map<string, { effective_absences: number; at_warning: boolean; should_be_dropped: boolean }>();
  if (schoolYear && filtered.length) {
    const { data: summaries } = await supabase
      .from("student_attendance_summary")
      .select("student_id, effective_absences, at_warning, should_be_dropped")
      .eq("school_year_id", schoolYear.id)
      .in(
        "student_id",
        filtered.map((s) => s.id),
      );
    summaries?.forEach((s) => summaryByStudent.set(s.student_id, s));
  }

  const canAdd = teacher.is_head_teacher || teacher.is_master_admin;

  return (
    <>
      <Topbar teacher={teacher} title="Students" />
      <main className="flex-1 space-y-5 p-5 lg:p-8">
        <form className="flex flex-wrap items-end gap-3" action="/students">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">
              Search
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name…"
              className="h-10 w-full rounded-lg border border-border-strong bg-surface-raised px-3 text-sm text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {teacher.is_master_admin && (
            <div className="w-48">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">
                School
              </label>
              <Select name="school" defaultValue={school ?? ""}>
                <option value="">All schools</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="w-44">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">
              Grade level
            </label>
            <Select name="grade" defaultValue={grade ?? ""}>
              <option value="">All grades</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {canAdd && (
            <Link href="/students/new" className="ml-auto">
              <Button type="button">
                <Plus size={16} /> Add student
              </Button>
            </Link>
          )}
        </form>

        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                {teacher.is_master_admin && <th className="px-4 py-3 font-medium">School</th>}
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const summary = summaryByStudent.get(s.id);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-sunken/60">
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
                          {initials(s)}
                        </span>
                        <span className="font-medium text-text">{fullName(s)}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-soft">
                      {s.grade_levels?.name ?? "—"}
                      {s.class_sections?.name && s.class_sections.name !== "Main" ? ` (${s.class_sections.name})` : ""}
                    </td>
                    {teacher.is_master_admin && (
                      <td className="px-4 py-3 text-text-soft">{s.schools?.name ?? "—"}</td>
                    )}
                    <td className="px-4 py-3">
                      <Badge tone={s.status === "active" ? "good" : "neutral"}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {summary?.at_warning ? (
                        <span className="inline-flex items-center gap-1 text-status-warn">
                          <TriangleAlert size={14} />
                          {summary.effective_absences} absences
                          {summary.should_be_dropped && (
                            <Badge tone="bad" className="ml-1">
                              Drop threshold
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-text-faint">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-text-faint">
                    No students match these filters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
