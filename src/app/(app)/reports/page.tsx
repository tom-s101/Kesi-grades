import { Download } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getGradeLevels, getSchools, getStudentListRows } from "@/lib/queries";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportCardPicker } from "@/components/reports/report-card-picker";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const teacher = await requireTeacher();
  const { school } = await searchParams;

  const [{ rows: students }, gradeLevels, schools] = await Promise.all([
    getStudentListRows(teacher),
    getGradeLevels(),
    teacher.is_master_admin ? getSchools() : Promise.resolve([]),
  ]);

  const canBulkExport = teacher.is_head_teacher || teacher.is_master_admin;

  return (
    <>
      <Topbar teacher={teacher} title="Reports" />
      <main className="flex-1 space-y-5 p-4 lg:p-8">
        {canBulkExport && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk export</CardTitle>
              <CardDescription>
                CSV files you can archive, hand to the office, or transfer onto official DepEd forms.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              {[
                { href: "/api/export/students", label: "Students" },
                { href: "/api/export/grades", label: "Grades" },
                { href: "/api/export/attendance", label: "Attendance" },
              ].map((x) => (
                <a key={x.href} href={`${x.href}${school ? `?school=${school}` : ""}`}>
                  <Button variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
                    <Download size={15} /> {x.label}
                  </Button>
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Report cards</CardTitle>
            <CardDescription>Printable, DepEd-style — save as PDF or print directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportCardPicker
              students={students}
              gradeLevels={gradeLevels}
              schools={schools}
              showSchool={teacher.is_master_admin}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
