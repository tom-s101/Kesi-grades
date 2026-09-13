"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth";

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

export async function addSection(input: {
  schoolId: string;
  gradeLevelId: string;
  schoolYearId: string;
  name: string;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sections")
    .insert({
      school_id: input.schoolId,
      grade_level_id: input.gradeLevelId,
      school_year_id: input.schoolYearId,
      name: input.name,
      sort_order: input.sortOrder,
    })
    .select()
    .single();
  revalidatePath("/school");
  return { error: error?.message, section: data };
}

export async function renameSection(sectionId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_sections").update({ name }).eq("id", sectionId);
  revalidatePath("/school");
  revalidatePath("/grades");
  revalidatePath("/attendance");
  return { error: error?.message };
}

export async function reassignClass(input: {
  schoolId: string;
  gradeLevelId: string;
  sectionId: string;
  subjectId: string;
  schoolYearId: string;
  teacherId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("class_subject_teachers").upsert(
    {
      school_id: input.schoolId,
      grade_level_id: input.gradeLevelId,
      section_id: input.sectionId,
      subject_id: input.subjectId,
      school_year_id: input.schoolYearId,
      teacher_id: input.teacherId,
    },
    { onConflict: "school_id,grade_level_id,subject_id,school_year_id,section_id" },
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

export async function renameTeacher(teacherId: string, fullName: string) {
  const supabase = await createClient();
  const trimmed = fullName.trim();
  if (!trimmed) return { error: "Name can't be empty." };
  const { data, error } = await supabase
    .from("teachers")
    .update({ full_name: trimmed })
    .eq("id", teacherId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "You don't have permission to rename this teacher." };
  revalidatePath("/school");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type CreateTeacherState = { error?: string; ok?: boolean };

/**
 * Creates a login (Supabase Auth user + teachers row) for a new
 * teacher. Runs on the service-role client since creating an auth user
 * requires the Admin API — so the caller's permission is checked here
 * in application code first, rather than relying on RLS the way the
 * rest of this file does.
 */
export async function createTeacher(_prev: CreateTeacherState, formData: FormData): Promise<CreateTeacherState> {
  const caller = await requireTeacher();

  const schoolId = String(formData.get("school_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isHeadTeacher = formData.get("is_head_teacher") === "on";

  const authorized = caller.is_master_admin || (caller.is_head_teacher && caller.school_id === schoolId);
  if (!authorized) return { error: "You don't have permission to add a teacher to this school." };
  if (isHeadTeacher && !caller.is_master_admin) {
    return { error: "Only a master admin can make a new teacher a head teacher." };
  }
  if (!schoolId || !fullName || !email || !password) {
    return { error: "School, name, email, and a temporary password are all required." };
  }
  if (password.length < 8) {
    return { error: "Temporary password needs to be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) return { error: createError.message };

  const { error: insertError } = await admin.from("teachers").insert({
    id: created.user.id,
    full_name: fullName,
    school_id: schoolId,
    is_head_teacher: isHeadTeacher,
    is_master_admin: false,
    active: true,
  });
  if (insertError) return { error: insertError.message };

  revalidatePath("/school");
  return { ok: true };
}
