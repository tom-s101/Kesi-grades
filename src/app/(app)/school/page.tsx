import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getGradeLevels, getSchools, getSubjects } from "@/lib/queries";
import { Topbar } from "@/components/layout/topbar";
import { SchoolAdminClient } from "@/components/school/school-admin-client";
import { Card, CardContent } from "@/components/ui/card";

export default async function SchoolAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const teacher = await requireTeacher();
  if (!teacher.is_head_teacher && !teacher.is_master_admin) redirect("/dashboard");

  const { school } = await searchParams;
  const supabase = await createClient();

  const schools = teacher.is_master_admin ? await getSchools() : [];
  const activeSchoolId = teacher.is_master_admin ? school ?? schools[0]?.id : teacher.school_id!;
  const activeSchool = teacher.is_master_admin
    ? schools.find((s) => s.id === activeSchoolId)
    : { id: teacher.school_id!, name: teacher.school_name ?? "" };

  const [gradeLevels, subjects, schoolYear] = await Promise.all([getGradeLevels(), getSubjects(), getCurrentSchoolYear()]);

  if (!activeSchool || !schoolYear) {
    return (
      <>
        <Topbar teacher={teacher} title="School Admin" />
        <main className="flex-1 p-8">
          <Card>
            <CardContent className="py-10 text-center text-text-soft">Nothing to manage yet.</CardContent>
          </Card>
        </main>
      </>
    );
  }

  const [{ data: sgl }, { data: sections }, { data: assignments }, { data: teachers }] = await Promise.all([
    supabase
      .from("school_grade_levels")
      .select("*")
      .eq("school_id", activeSchool.id)
      .eq("school_year_id", schoolYear.id),
    supabase
      .from("class_sections")
      .select("*")
      .eq("school_id", activeSchool.id)
      .eq("school_year_id", schoolYear.id)
      .order("sort_order"),
    supabase
      .from("class_subject_teachers")
      .select("*")
      .eq("school_id", activeSchool.id)
      .eq("school_year_id", schoolYear.id),
    supabase.from("teachers").select("*").eq("school_id", activeSchool.id).order("full_name"),
  ]);

  return (
    <>
      <Topbar teacher={teacher} title={`School Admin — ${activeSchool.name}`} />
      <main className="flex-1 space-y-6 p-4 lg:p-8">
        <SchoolAdminClient
          // Remount when switching schools so the sections, assignments
          // and grade toggles on screen belong to the school selected.
          key={activeSchool.id}
          schools={schools}
          activeSchoolId={activeSchool.id}
          isMasterAdmin={teacher.is_master_admin}
          gradeLevels={gradeLevels}
          subjects={subjects}
          schoolYearId={schoolYear.id}
          gradeLevelActive={sgl ?? []}
          sections={sections ?? []}
          assignments={assignments ?? []}
          teachers={teachers ?? []}
        />
      </main>
    </>
  );
}
