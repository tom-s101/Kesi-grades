import { requireTeacher } from "@/lib/auth";
import { getGradeLevels, getSchools } from "@/lib/queries";
import { Topbar } from "@/components/layout/topbar";
import { StudentForm } from "@/components/students/student-form";
import { redirect } from "next/navigation";

export default async function NewStudentPage() {
  const teacher = await requireTeacher();
  if (!teacher.is_head_teacher && !teacher.is_master_admin) redirect("/students");

  const [gradeLevels, schools] = await Promise.all([getGradeLevels(), getSchools()]);

  return (
    <>
      <Topbar teacher={teacher} title="Add a student" />
      <main className="max-w-2xl flex-1 p-5 lg:p-8">
        <StudentForm
          mode="create"
          gradeLevels={gradeLevels}
          schools={schools}
          defaultSchoolId={teacher.school_id ?? undefined}
        />
      </main>
    </>
  );
}
