"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Sex, StudentStatus } from "@/lib/types";

export type StudentFormState = { error?: string; ok?: boolean };

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function createStudent(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const supabase = await createClient();

  const schoolId = str(formData, "school_id");
  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  const gradeLevelId = str(formData, "grade_level_id");

  if (!schoolId || !firstName || !lastName) {
    return { error: "School, first name, and last name are required." };
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      school_id: schoolId,
      first_name: firstName,
      last_name: lastName,
      middle_name: str(formData, "middle_name"),
      lrn: str(formData, "lrn"),
      sex: (str(formData, "sex") as Sex | null) ?? null,
      birthdate: str(formData, "birthdate"),
      guardian_name: str(formData, "guardian_name"),
      guardian_contact: str(formData, "guardian_contact"),
      current_grade_level_id: gradeLevelId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (gradeLevelId) {
    const { data: schoolYear } = await supabase.from("school_years").select("id").eq("is_current", true).single();
    if (schoolYear) {
      await supabase.from("student_enrollments").insert({
        student_id: student.id,
        school_id: schoolId,
        grade_level_id: gradeLevelId,
        school_year_id: schoolYear.id,
      });
    }
  }

  revalidatePath("/students");
  return { ok: true };
}

export async function updateStudent(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Missing student id." };

  const { error } = await supabase
    .from("students")
    .update({
      first_name: str(formData, "first_name") ?? undefined,
      last_name: str(formData, "last_name") ?? undefined,
      middle_name: str(formData, "middle_name"),
      lrn: str(formData, "lrn"),
      sex: (str(formData, "sex") as Sex | null) ?? null,
      birthdate: str(formData, "birthdate"),
      guardian_name: str(formData, "guardian_name"),
      guardian_contact: str(formData, "guardian_contact"),
      current_grade_level_id: str(formData, "grade_level_id"),
      status: (str(formData, "status") as StudentStatus | null) ?? "active",
      notes: str(formData, "notes"),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return { ok: true };
}
