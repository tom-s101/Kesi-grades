import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Pre-authentication lookup used by the login screen so a teacher can
 * pick their school and their own name from dropdowns instead of typing
 * an email address. Only ever returns non-sensitive fields (id, name) —
 * the matching email is resolved separately in POST, and the password
 * itself is verified client-side by Supabase Auth, never by this route.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("school_id");
  const admin = createAdminClient();

  if (!schoolId) {
    const { data, error } = await admin.from("schools").select("id, name").order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ schools: data });
  }

  let query = admin
    .from("teachers")
    .select("id, full_name, is_head_teacher, is_master_admin")
    .eq("active", true)
    .order("full_name");

  query = schoolId === "admin" ? query.eq("is_master_admin", true) : query.eq("school_id", schoolId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teachers: data });
}

export async function POST(request: Request) {
  const { teacher_id } = await request.json();
  if (!teacher_id) return NextResponse.json({ error: "teacher_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: teacher, error } = await admin
    .from("teachers")
    .select("id")
    .eq("id", teacher_id)
    .single();
  if (error || !teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(teacher_id);
  if (authError || !authUser.user?.email) {
    return NextResponse.json({ error: "Could not resolve login email" }, { status: 500 });
  }

  return NextResponse.json({ email: authUser.user.email });
}
