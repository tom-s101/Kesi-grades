import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTeacher, type CurrentTeacher } from "@/lib/auth";
import { getGradeLevels, getSchools, getStudentListRows } from "@/lib/queries";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/ui/loader";
import { StudentsClient } from "@/components/students/students-client";

export default async function StudentsPage() {
  const teacher = await requireTeacher();
  const canAdd = teacher.is_head_teacher || teacher.is_master_admin;

  // The page itself shows straight away; the list streams in behind it.
  return (
    <>
      <Topbar teacher={teacher} title="Students" />
      <main className="flex-1 space-y-4 p-4 lg:p-8">
        {canAdd && (
          <div className="flex justify-end">
            <Link href="/students/new">
              <Button type="button" className="w-full sm:w-auto">
                <Plus size={16} /> Add student
              </Button>
            </Link>
          </div>
        )}

        <div data-tour="students-list">
          <Suspense fallback={<SectionLoader label="Loading students" />}>
            <StudentList teacher={teacher} />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function StudentList({ teacher }: { teacher: CurrentTeacher }) {
  // The roster, the grade list and the school list don't depend on
  // each other — one round trip's worth of waiting, not three.
  const [{ rows, error }, gradeLevels, schools] = await Promise.all([
    getStudentListRows(teacher),
    getGradeLevels(),
    teacher.is_master_admin ? getSchools() : Promise.resolve([]),
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised px-4 py-10 text-center">
        <p className="font-medium text-status-bad">The student list could not be loaded.</p>
        <p className="mt-1 text-xs text-text-soft">
          {error} — this usually means a migration in <code>supabase/migrations/</code> hasn&rsquo;t been run yet.
        </p>
      </div>
    );
  }

  return (
    <StudentsClient students={rows} gradeLevels={gradeLevels} schools={schools} showSchool={teacher.is_master_admin} />
  );
}
