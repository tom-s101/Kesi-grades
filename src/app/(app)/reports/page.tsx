import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getVisibleStudents, getGradeLevels, getSchools } from "@/lib/queries";
import { fullName } from "@/lib/format";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; grade?: string }>;
}) {
  const teacher = await requireTeacher();
  const { school, grade } = await searchParams;

  const [students, gradeLevels, schools] = await Promise.all([
    getVisibleStudents({ schoolId: school, gradeLevelId: grade }, teacher),
    getGradeLevels(),
    teacher.is_master_admin ? getSchools() : Promise.resolve([]),
  ]);

  const canBulkExport = teacher.is_head_teacher || teacher.is_master_admin;

  return (
    <>
      <Topbar teacher={teacher} title="Reports" />
      <main className="flex-1 space-y-6 p-5 lg:p-8">
        {canBulkExport && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk export</CardTitle>
              <CardDescription>
                CSV files you can archive, hand to the office, or transfer onto official DepEd forms.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <a href={`/api/export/students${school ? `?school=${school}` : ""}`}>
                <Button variant="secondary">
                  <Download size={15} /> Students
                </Button>
              </a>
              <a href={`/api/export/grades${school ? `?school=${school}` : ""}`}>
                <Button variant="secondary">
                  <Download size={15} /> Grades
                </Button>
              </a>
              <a href={`/api/export/attendance${school ? `?school=${school}` : ""}`}>
                <Button variant="secondary">
                  <Download size={15} /> Attendance
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Report cards</CardTitle>
            <CardDescription>Printable, DepEd-style — save as PDF or print directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="mb-4 flex flex-wrap gap-3" action="/reports">
              {teacher.is_master_admin && (
                <div className="w-48">
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
            </form>

            <div className="divide-y divide-border">
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-text">{fullName(s)}</span>
                  <Link
                    href={`/reports/report-card/${s.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                  >
                    <FileText size={14} /> View report card
                  </Link>
                </div>
              ))}
              {students.length === 0 && <p className="py-8 text-center text-text-faint">No students found.</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
