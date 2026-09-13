import { requireTeacher } from "@/lib/auth";
import { getCurrentSchoolYear, getGradeLevels, getSchools, getSections } from "@/lib/queries";
import { Topbar } from "@/components/layout/topbar";
import { StudentForm } from "@/components/students/student-form";
import { redirect } from "next/navigation";

export default async function NewStudentPage() {
  const teacher = await requireTeacher();
  if (!teacher.is_head_teacher && !teacher.is_master_admin) redirect("/students");

  const schoolYear = await getCurrentSchoolYear();
  const [gradeLevels, schools, sections] = await Promise.all([
    getGradeLevels(),
    teacher.is_master_admin ? getSchools() : Promise.resolve([]),
    teacher.school_id && schoolYear ? getSections(teacher.school_id, schoolYear.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <Topbar teacher={teacher} title="Add a student" />
      <main className="max-w-2xl flex-1 p-5 lg:p-8">
        <StudentForm
          mode="create"
          gradeLevels={gradeLevels}
          sections={sections}
          schools={schools}
          defaultSchoolId={teacher.school_id ?? undefined}
        />
      </main>
    </>
  );
}
