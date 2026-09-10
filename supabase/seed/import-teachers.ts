/**
 * Import teachers (and their class assignments) from a CSV into
 * Supabase Auth + the `teachers` / `class_subject_teachers` tables.
 *
 * This has to run outside the SQL editor because creating an auth user
 * with a password requires the Admin API (service role key), not plain
 * SQL — inserting directly into auth.users is unsupported and unsafe.
 *
 * Usage:
 *   1. Copy supabase/seed/teachers.template.csv to supabase/seed/teachers.csv
 *      and fill in the real roster (see column notes in the template).
 *   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell
 *      (service role key = Project Settings -> API -> service_role,
 *      never expose this key in the browser/app).
 *   3. npx tsx supabase/seed/import-teachers.ts supabase/seed/teachers.csv
 *
 * Safe to re-run: existing teachers are matched by email and updated
 * rather than duplicated; class assignments are upserted.
 */
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";

type Row = {
  full_name: string;
  email: string;
  temp_password: string;
  school_slug: string;
  is_head_teacher: string;
  is_master_admin: string;
  whatsapp_number: string;
  grade_codes: string;
  subject_codes: string;
};

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npx tsx supabase/seed/import-teachers.ts <path-to-csv>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows: Row[] = parse(readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const [{ data: schools }, { data: gradeLevels }, { data: subjects }] = await Promise.all([
    supabase.from("schools").select("id, slug"),
    supabase.from("grade_levels").select("id, code"),
    supabase.from("subjects").select("id, code"),
  ]);
  const { data: schoolYear } = await supabase
    .from("school_years")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!schools || !gradeLevels || !subjects || !schoolYear) {
    console.error("Reference data missing — run the 0001-0005 migrations first.");
    process.exit(1);
  }

  const schoolBySlug = new Map(schools.map((s) => [s.slug, s.id]));
  const gradeByCode = new Map(gradeLevels.map((g) => [g.code, g.id]));
  const subjectByCode = new Map(subjects.map((s) => [s.code, s.id]));

  for (const row of rows) {
    const schoolId = row.school_slug ? schoolBySlug.get(row.school_slug) : null;
    if (row.school_slug && !schoolId) {
      console.warn(`Skipping ${row.email}: unknown school_slug "${row.school_slug}"`);
      continue;
    }

    // Create (or find) the auth user.
    let userId: string;
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: row.email,
      password: row.temp_password,
      email_confirm: true,
      user_metadata: { full_name: row.full_name },
    });

    if (createError) {
      if (!createError.message.toLowerCase().includes("already been registered")) {
        console.error(`Failed to create ${row.email}: ${createError.message}`);
        continue;
      }
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === row.email);
      if (!existing) {
        console.error(`${row.email} reported as existing but could not be found — skipping.`);
        continue;
      }
      userId = existing.id;
    } else {
      userId = created.user.id;
    }

    const { error: upsertError } = await supabase.from("teachers").upsert(
      {
        id: userId,
        full_name: row.full_name,
        school_id: schoolId ?? null,
        is_head_teacher: row.is_head_teacher?.toLowerCase() === "true",
        is_master_admin: row.is_master_admin?.toLowerCase() === "true",
        whatsapp_number: row.whatsapp_number || null,
        active: true,
      },
      { onConflict: "id" },
    );
    if (upsertError) {
      console.error(`Failed to upsert teacher row for ${row.email}: ${upsertError.message}`);
      continue;
    }

    const gradeCodes = row.grade_codes ? row.grade_codes.split(";").map((s) => s.trim()).filter(Boolean) : [];
    const subjectCodes = row.subject_codes ? row.subject_codes.split(";").map((s) => s.trim()).filter(Boolean) : [];

    if (schoolId && gradeCodes.length && subjectCodes.length) {
      const assignments = gradeCodes.flatMap((gc) =>
        subjectCodes.map((sc) => ({
          school_id: schoolId,
          grade_level_id: gradeByCode.get(gc),
          subject_id: subjectByCode.get(sc),
          school_year_id: schoolYear.id,
          teacher_id: userId,
        })),
      );
      const missingCode = assignments.find((a) => !a.grade_level_id || !a.subject_id);
      if (missingCode) {
        console.warn(`Skipping some assignments for ${row.email}: unknown grade/subject code`);
      }
      const validAssignments = assignments.filter((a) => a.grade_level_id && a.subject_id);
      if (validAssignments.length) {
        const { error: assignError } = await supabase
          .from("class_subject_teachers")
          .upsert(validAssignments, { onConflict: "school_id,grade_level_id,subject_id,school_year_id" });
        if (assignError) console.error(`Assignment upsert failed for ${row.email}: ${assignError.message}`);
      }
    }

    console.log(`OK  ${row.full_name} <${row.email}>`);
  }

  console.log("\nDone. Teachers log in with their email + temp_password (or via the WhatsApp/email you send).");
  console.log("Tell them to change their password after first login (Supabase Auth handles this via a password-update call).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
