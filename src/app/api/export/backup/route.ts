import ExcelJS from "exceljs";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolToday } from "@/lib/school-time";

/**
 * Backup as one Excel file: every table but attendance, a sheet each —
 * for an admin to download now and then and keep somewhere safe.
 * (Attendance is left out on request: it's by far the largest table.)
 *
 * Each sheet carries readable columns (names, school, grade) for a
 * person to look things up, and the internal ids alongside, so the data
 * could be put back exactly if it ever had to be. Passwords are never
 * included: Supabase keeps only a scrambled form, and the backup lists
 * whether each teacher is still on the starting password instead.
 */

export const dynamic = "force-dynamic";
// Gathering every table takes a few seconds.
export const maxDuration = 60;

/** Supabase hands back at most 1,000 rows per request. */
const PAGE = 1000;
/** Pages asked for at once. */
const PARALLEL = 6;

type Row = Record<string, unknown>;
type Client = Awaited<ReturnType<typeof createClient>>;

// The typed query builder can't describe "any table by name", so the
// backup speaks to it through this small, loose shape instead.
interface LooseQuery extends PromiseLike<{ data: unknown[] | null; count: number | null; error: { message: string } | null }> {
  not(column: string, operator: string, value: null): LooseQuery;
  order(column: string, options: { ascending: boolean }): LooseQuery;
  range(from: number, to: number): LooseQuery;
}
interface LooseTable {
  select(columns: string, options?: { count?: "exact"; head?: boolean }): LooseQuery;
}

/** Every row of a table or view, however many: counted, then fetched in parallel pages. */
async function fetchAll(supabase: Client, table: string, order: string[], gradedOnly = false): Promise<Row[]> {
  const from = () => supabase.from(table as never) as unknown as LooseTable;
  const narrow = (q: LooseQuery) => (gradedOnly ? q.not("quarterly_grade", "is", null) : q);

  const { count, error } = await narrow(from().select("*", { count: "exact", head: true }));
  if (error) throw new Error(`${table}: ${error.message}`);
  const total = count ?? 0;

  const pages: number[] = [];
  for (let start = 0; start < total; start += PAGE) pages.push(start);

  const out: Row[][] = [];
  for (let i = 0; i < pages.length; i += PARALLEL) {
    const batch = await Promise.all(
      pages.slice(i, i + PARALLEL).map(async (start) => {
        let q = narrow(from().select("*"));
        // A fixed order, so pages neither overlap nor skip rows.
        for (const col of order) q = q.order(col, { ascending: true });
        const { data, error: pageError } = await q.range(start, start + PAGE - 1);
        if (pageError) throw new Error(`${table}: ${pageError.message}`);
        return (data ?? []) as Row[];
      }),
    );
    out.push(...batch);
  }
  return out.flat();
}

function addSheet(book: ExcelJS.Workbook, name: string, rows: Row[], columns: { header: string; key: string; width?: number }[]) {
  const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 2) }));
  sheet.addRows(rows);
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F1E2" } };
  if (rows.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return rows.length;
}

const id = (key: string, header = key) => ({ header, key, width: 38 });

export async function GET() {
  const teacher = await requireTeacher();
  // Admin view only — an admin who has switched to teacher view is a
  // teacher here too.
  if (!teacher.is_master_admin) return new Response("Only an admin can download the backup.", { status: 403 });

  // The admin's own access already covers every school.
  const supabase = await createClient();

  try {
    const [
      schools, gradeLevels, subjects, schoolYears, quarters, weights, schoolGrades,
      sections, teachers, assignments, shared, students, enrollments,
      weekly, exams, grades,
    ] = await Promise.all([
      fetchAll(supabase, "schools", ["name"]),
      fetchAll(supabase, "grade_levels", ["sort_order"]),
      fetchAll(supabase, "subjects", ["sort_order"]),
      fetchAll(supabase, "school_years", ["start_date"]),
      fetchAll(supabase, "quarters", ["school_year_id", "number"]),
      fetchAll(supabase, "grade_weight_configs", ["school_year_id"]),
      fetchAll(supabase, "school_grade_levels", ["school_id", "grade_level_id", "school_year_id"]),
      fetchAll(supabase, "class_sections", ["school_id", "grade_level_id", "name"]),
      fetchAll(supabase, "teachers", ["full_name", "id"]),
      fetchAll(supabase, "class_subject_teachers", ["id"]),
      // Before migration 0013 this table doesn't exist; a backup without it is still a backup.
      fetchAll(supabase, "class_section_shared_teachers", ["section_id", "teacher_id"]).catch(() => [] as Row[]),
      fetchAll(supabase, "students", ["last_name", "first_name", "id"]),
      fetchAll(supabase, "student_enrollments", ["id"]),
      fetchAll(supabase, "weekly_scores", ["quarter_id", "week_number", "student_id", "subject_id", "assessment_type"]),
      fetchAll(supabase, "quarter_exam_scores", ["quarter_id", "student_id", "subject_id"]),
      fetchAll(supabase, "quarterly_grades", ["quarter_number", "student_id", "subject_id"], true),
    ]);

    // Login names come from Supabase Auth, which only the service role can read.
    const { data: auth } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    const loginEmail = new Map((auth?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    const name = <T extends Row>(rows: T[], key = "name") => new Map(rows.map((r) => [String(r.id), String(r[key] ?? "")]));
    const schoolName = name(schools);
    const gradeName = name(gradeLevels);
    const subjectName = name(subjects);
    const yearLabel = name(schoolYears, "label");
    const quarterName = name(quarters);
    const sectionName = name(sections);
    const teacherName = name(teachers, "full_name");
    const studentById = new Map(students.map((s) => [String(s.id), s]));
    const studentName = (sid: unknown) => {
      const s = studentById.get(String(sid));
      return s ? [s.last_name, [s.first_name, s.middle_name].filter(Boolean).join(" ")].join(", ") : "";
    };
    const studentCols = (sid: unknown) => {
      const s = studentById.get(String(sid));
      return {
        student: studentName(sid),
        lrn: s?.lrn ?? "",
        school: s ? schoolName.get(String(s.school_id)) : "",
        grade: s ? gradeName.get(String(s.current_grade_level_id)) : "",
      };
    };

    const book = new ExcelJS.Workbook();
    book.creator = "KESI";
    book.created = new Date();
    const counts: [string, number][] = [];
    const sheet = (n: string, rows: Row[], cols: { header: string; key: string; width?: number }[]) =>
      counts.push([n, addSheet(book, n, rows, cols)]);

    // Filled in last, but first in the file.
    const readme = book.addWorksheet("Read me");

    sheet("Students", students.map((s) => ({
      ...s,
      school: schoolName.get(String(s.school_id)),
      grade: gradeName.get(String(s.current_grade_level_id)),
      class: sectionName.get(String(s.section_id)),
    })), [
      { header: "Last name", key: "last_name", width: 18 }, { header: "First name", key: "first_name", width: 18 },
      { header: "Middle name", key: "middle_name", width: 16 }, { header: "Suffix", key: "suffix" },
      { header: "LRN", key: "lrn", width: 16 }, { header: "Sex", key: "sex" }, { header: "Birthdate", key: "birthdate" },
      { header: "School", key: "school", width: 16 }, { header: "Grade", key: "grade", width: 16 }, { header: "Class", key: "class" },
      { header: "Status", key: "status" }, { header: "Father", key: "father_name", width: 26 }, { header: "Mother", key: "mother_name", width: 26 },
      { header: "Guardian", key: "guardian_name", width: 22 }, { header: "Guardian contact", key: "guardian_contact", width: 18 },
      { header: "Mother tongue", key: "mother_tongue" }, { header: "IP group", key: "ip_group" }, { header: "Religion", key: "religion" },
      { header: "Address", key: "home_address", width: 40 }, { header: "Notes", key: "notes", width: 40 },
      id("id"), id("school_id"), id("current_grade_level_id"), id("section_id"),
      { header: "created_at", key: "created_at", width: 24 }, { header: "updated_at", key: "updated_at", width: 24 },
    ]);

    sheet("Weekly scores", weekly.map((w) => ({
      ...w, ...studentCols(w.student_id), subject: subjectName.get(String(w.subject_id)), quarter: quarterName.get(String(w.quarter_id)),
    })), [
      { header: "Quarter", key: "quarter" }, { header: "Week", key: "week_number" }, { header: "Type", key: "assessment_type", width: 22 },
      { header: "Subject", key: "subject", width: 16 }, { header: "Student", key: "student", width: 28 }, { header: "LRN", key: "lrn", width: 16 },
      { header: "School", key: "school", width: 16 }, { header: "Grade", key: "grade", width: 16 },
      { header: "Raw", key: "raw_score" }, { header: "Max", key: "max_score" }, { header: "Percent", key: "percentage" },
      id("id"), id("student_id"), id("subject_id"), id("quarter_id"), id("school_year_id"), id("recorded_by"),
    ]);

    sheet("Exam scores", exams.map((e) => ({
      ...e, ...studentCols(e.student_id), subject: subjectName.get(String(e.subject_id)), quarter: quarterName.get(String(e.quarter_id)),
    })), [
      { header: "Quarter", key: "quarter" }, { header: "Subject", key: "subject", width: 16 },
      { header: "Student", key: "student", width: 28 }, { header: "LRN", key: "lrn", width: 16 },
      { header: "School", key: "school", width: 16 }, { header: "Grade", key: "grade", width: 16 },
      { header: "Raw", key: "raw_score" }, { header: "Max", key: "max_score" }, { header: "Percent", key: "percentage" },
      id("id"), id("student_id"), id("subject_id"), id("quarter_id"), id("school_year_id"), id("recorded_by"),
    ]);

    sheet("Quarterly grades", grades.map((g) => ({ ...g, ...studentCols(g.student_id) })), [
      { header: "Quarter", key: "quarter_number" }, { header: "Subject", key: "subject_name", width: 16 },
      { header: "Student", key: "student", width: 28 }, { header: "LRN", key: "lrn", width: 16 },
      { header: "School", key: "school", width: 16 }, { header: "Grade", key: "grade", width: 16 },
      { header: "Exam %", key: "exam_percentage" }, { header: "Quiz avg", key: "quiz_average" },
      { header: "Homework avg", key: "homework_average" }, { header: "Quarterly grade", key: "quarterly_grade", width: 16 },
      id("student_id"), id("subject_id"), id("quarter_id"),
    ]);

    sheet("Teachers", teachers.map((t) => ({
      ...t,
      school: schoolName.get(String(t.school_id)) ?? "",
      login_email: loginEmail.get(String(t.id)) ?? "",
      password: t.password_changed_at ? `Own password (since ${String(t.password_changed_at).slice(0, 10)})` : "Starting password",
    })), [
      { header: "Name", key: "full_name", width: 24 }, { header: "School", key: "school", width: 16 },
      { header: "Head teacher", key: "is_head_teacher" }, { header: "Admin", key: "is_master_admin" },
      { header: "In teacher view", key: "acting_as_teacher" }, { header: "Active", key: "active" },
      { header: "Password", key: "password", width: 30 }, { header: "WhatsApp", key: "whatsapp_number", width: 16 },
      { header: "Login (internal)", key: "login_email", width: 36 }, id("id"), id("school_id"),
      { header: "created_at", key: "created_at", width: 24 },
    ]);

    sheet("Classes", sections.map((c) => ({
      ...c, school: schoolName.get(String(c.school_id)), grade: gradeName.get(String(c.grade_level_id)), year: yearLabel.get(String(c.school_year_id)),
    })), [
      { header: "School", key: "school", width: 16 }, { header: "Grade", key: "grade", width: 16 }, { header: "Class", key: "name" },
      { header: "School year", key: "year" }, { header: "Order", key: "sort_order" },
      id("id"), id("school_id"), id("grade_level_id"), id("school_year_id"),
    ]);

    sheet("Teaching assignments", assignments.map((a) => ({
      ...a, teacher: teacherName.get(String(a.teacher_id)), school: schoolName.get(String(a.school_id)),
      grade: gradeName.get(String(a.grade_level_id)), class: sectionName.get(String(a.section_id)),
      subject: subjectName.get(String(a.subject_id)), year: yearLabel.get(String(a.school_year_id)),
    })), [
      { header: "Teacher", key: "teacher", width: 24 }, { header: "School", key: "school", width: 16 },
      { header: "Grade", key: "grade", width: 16 }, { header: "Class", key: "class" }, { header: "Subject", key: "subject", width: 16 },
      { header: "School year", key: "year" }, id("id"), id("teacher_id"), id("school_id"), id("grade_level_id"),
      id("section_id"), id("subject_id"), id("school_year_id"),
    ]);

    sheet("Shared classes", shared.map((s) => ({
      ...s, teacher: teacherName.get(String(s.teacher_id)), class: sectionName.get(String(s.section_id)),
    })), [
      { header: "Teacher", key: "teacher", width: 24 }, { header: "Class", key: "class" }, id("teacher_id"), id("section_id"),
    ]);

    sheet("Enrollments", enrollments.map((e) => ({
      ...e, student: studentName(e.student_id), school: schoolName.get(String(e.school_id)),
      grade: gradeName.get(String(e.grade_level_id)), year: yearLabel.get(String(e.school_year_id)),
    })), [
      { header: "Student", key: "student", width: 28 }, { header: "School", key: "school", width: 16 },
      { header: "Grade", key: "grade", width: 16 }, { header: "School year", key: "year" }, { header: "Status", key: "status" },
      id("id"), id("student_id"), id("school_id"), id("grade_level_id"), id("school_year_id"),
    ]);

    sheet("Schools", schools, [{ header: "Name", key: "name", width: 18 }, { header: "Slug", key: "slug", width: 16 }, id("id")]);
    sheet("Grade levels", gradeLevels, [{ header: "Code", key: "code" }, { header: "Name", key: "name", width: 16 }, { header: "Order", key: "sort_order" }, id("id")]);
    sheet("Grades offered", schoolGrades.map((g) => ({
      ...g, school: schoolName.get(String(g.school_id)), grade: gradeName.get(String(g.grade_level_id)), year: yearLabel.get(String(g.school_year_id)),
    })), [
      { header: "School", key: "school", width: 16 }, { header: "Grade", key: "grade", width: 16 }, { header: "School year", key: "year" },
      { header: "Offered", key: "is_active" }, id("school_id"), id("grade_level_id"), id("school_year_id"),
    ]);
    sheet("Subjects", subjects, [{ header: "Code", key: "code", width: 16 }, { header: "Name", key: "name", width: 18 }, { header: "Order", key: "sort_order" }, id("id")]);
    sheet("School years", schoolYears, [
      { header: "Label", key: "label" }, { header: "Start", key: "start_date" }, { header: "End", key: "end_date" },
      { header: "Current", key: "is_current" }, id("id"),
    ]);
    sheet("Quarters", quarters.map((q) => ({ ...q, year: yearLabel.get(String(q.school_year_id)) })), [
      { header: "School year", key: "year" }, { header: "Quarter", key: "name" }, { header: "Number", key: "number" },
      { header: "Start", key: "start_date" }, { header: "End", key: "end_date" },
      { header: "Exam week start", key: "exam_week_start", width: 16 }, { header: "Exam week end", key: "exam_week_end", width: 16 },
      id("id"), id("school_year_id"),
    ]);
    sheet("Grade weights", weights.map((w) => ({ ...w, year: yearLabel.get(String(w.school_year_id)) })), [
      { header: "School year", key: "year" }, { header: "Exam", key: "exam_weight" }, { header: "Quizzes", key: "quiz_weight" },
      { header: "Homework", key: "homework_weight" }, id("id"), id("school_year_id"),
    ]);

    // The cover sheet: when, by whom, and what's in the file.
    const today = schoolToday();
    readme.columns = [{ width: 28 }, { width: 70 }];
    readme.addRows([
      ["KESI backup", ""],
      ["Made on", `${today} (${new Date().toISOString()})`],
      ["Made by", teacher.full_name],
      ["", ""],
      ["What's here", "Every table in the database except attendance, one sheet each. Readable columns first; the *_id columns are the database's own ids, needed only to restore."],
      ["Passwords", "Not included — they can't be read back. 'Password' on Teachers says whether each is still on the starting password."],
      ["", ""],
      ["Sheet", "Rows"],
      ...counts.map(([n, c]) => [n, c]),
    ]);
    readme.getRow(1).font = { bold: true, size: 14 };
    readme.getRow(8).font = { bold: true };

    const buffer = await book.xlsx.writeBuffer();
    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kesi-backup-${today}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("backup failed:", err);
    return new Response(`The backup couldn't be made: ${(err as Error).message}`, { status: 500 });
  }
}
