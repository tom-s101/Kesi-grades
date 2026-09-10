"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setGradeLevelActive(input: {
  schoolId: string;
  gradeLevelId: string;
  schoolYearId: string;
  isActive: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("school_grade_levels").upsert(
    {
      school_id: input.schoolId,
      grade_level_id: input.gradeLevelId,
      school_year_id: input.schoolYearId,
      is_active: input.isActive,
    },
    { onConflict: "school_id,grade_level_id,school_year_id" },
  );
  revalidatePath("/school");
  return { error: error?.message };
}

export async function reassignClass(input: {
  schoolId: string;
  gradeLevelId: string;
  subjectId: string;
  schoolYearId: string;
  teacherId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_subject_teachers").upsert(
    {
      school_id: input.schoolId,
      grade_level_id: input.gradeLevelId,
      subject_id: input.subjectId,
      school_year_id: input.schoolYearId,
      teacher_id: input.teacherId,
    },
    { onConflict: "school_id,grade_level_id,subject_id,school_year_id" },
  );
  revalidatePath("/school");
  revalidatePath("/grades");
  revalidatePath("/attendance");
  return { error: error?.message };
}

export async function setTeacherActive(teacherId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("teachers").update({ active }).eq("id", teacherId);
  revalidatePath("/school");
  return { error: error?.message };
}
