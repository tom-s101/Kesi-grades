import { requireTeacher } from "@/lib/auth";
import { getAllSections, getCurrentSchoolYear, getGradeLevels, getSchools } from "@/lib/queries";
import { Topbar } from "@/components/layout/topbar";
import { StudentForm } from "@/components/students/student-form";
import { redirect } from "next/navigation";

export default async function NewStudentPage() {
  const teacher = await requireTeacher();
  if (!teacher.is_head_teacher && !teacher.is_master_admin) redirect("/students");

  const schoolYear = await getCurrentSchoolYear();

  // Every class for the year, not just one school's — a master admin
  // picks the school in the form, so the class list has to be able to
  // follow whichever school they choose.
  const sections = schoolYear ? await getAllSections(schoolYear.id) : [];

  const [gradeLevels, schools] = await Promise.all([
    getGradeLevels(),
    teacher.is_master_admin ? getSchools() : Promise.resolve([]),
  ]);

  return (
    <>
      <Topbar teacher={teacher} title="Add a student" />
      <main className="max-w-2xl flex-1 p-4 lg:p-8">
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
