"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, Sex, StudentStatus } from "@/lib/types";

type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

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
  const sectionId = str(formData, "section_id");

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
      father_name: str(formData, "father_name"),
      mother_name: str(formData, "mother_name"),
      mother_tongue: str(formData, "mother_tongue"),
      ip_group: str(formData, "ip_group"),
      religion: str(formData, "religion"),
      home_address: str(formData, "home_address"),
      current_grade_level_id: gradeLevelId,
      section_id: sectionId,
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
  revalidatePath("/reports");
  return { ok: true };
}

export async function updateStudent(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Missing student id." };

  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  if (!firstName || !lastName) return { error: "First name and last name are required." };

  // grade_level_id / status are only touched when the field was actually
  // submitted — the form sends a hidden input with the *current* value
  // for teachers who aren't allowed to change them, but omitting this
  // check entirely would mean a missing field silently resets status to
  // "active" for anyone who can't see that control at all.
  const update: StudentUpdate = {
    first_name: firstName,
    last_name: lastName,
    middle_name: str(formData, "middle_name"),
    lrn: str(formData, "lrn"),
    sex: (str(formData, "sex") as Sex | null) ?? null,
    birthdate: str(formData, "birthdate"),
    guardian_name: str(formData, "guardian_name"),
    guardian_contact: str(formData, "guardian_contact"),
    father_name: str(formData, "father_name"),
    mother_name: str(formData, "mother_name"),
    mother_tongue: str(formData, "mother_tongue"),
    ip_group: str(formData, "ip_group"),
    religion: str(formData, "religion"),
    home_address: str(formData, "home_address"),
    notes: str(formData, "notes"),
  };
  if (formData.has("grade_level_id")) update.current_grade_level_id = str(formData, "grade_level_id");
  if (formData.has("section_id")) update.section_id = str(formData, "section_id");
  if (formData.has("status")) update.status = (str(formData, "status") as StudentStatus | null) ?? "active";

  const { error } = await supabase.from("students").update(update).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/reports");
  return { ok: true };
}
