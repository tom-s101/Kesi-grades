import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { HELP_TEXT, parseCommand, sendWhatsAppMessage } from "@/lib/whatsapp";
import { findCurrentQuarter } from "@/lib/quarters";

/**
 * Meta WhatsApp Cloud API webhook. See docs/WHATSAPP_INTEGRATION.md for
 * the full setup (Meta app, phone number, env vars) — this route works
 * the moment WHATSAPP_VERIFY_TOKEN is set, even before you wire up
 * sending (sendWhatsAppMessage logs instead of failing when the send
 * credentials aren't configured yet).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature || !verifySignature(rawBody, signature, secret)) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);
  const messages = extractMessages(payload);

  for (const msg of messages) {
    await handleMessage(msg.from, msg.text);
  }

  return new Response("OK", { status: 200 });
}

function verifySignature(rawBody: string, header: string, secret: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

function extractMessages(payload: unknown): { from: string; text: string }[] {
  const out: { from: string; text: string }[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = (payload as any)?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          if (message.type === "text") {
            out.push({ from: message.from, text: message.text.body });
          }
        }
      }
    }
  } catch {
    /* malformed payload — nothing to process */
  }
  return out;
}

async function handleMessage(fromPhone: string, text: string) {
  const supabase = createAdminClient();
  const normalizedPhone = fromPhone.startsWith("+") ? fromPhone : `+${fromPhone}`;

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("whatsapp_number", normalizedPhone)
    .eq("active", true)
    .maybeSingle();

  if (!teacher) {
    await sendWhatsAppMessage(fromPhone, "This number isn't registered to a KESI teacher account. Ask your admin to add it.");
    return;
  }

  const command = parseCommand(text);

  if (command.kind === "help") {
    await sendWhatsAppMessage(fromPhone, HELP_TEXT);
    return;
  }
  if (command.kind === "unknown") {
    await sendWhatsAppMessage(fromPhone, `Didn't understand that.\n\n${HELP_TEXT}`);
    return;
  }

  const { data: schoolYear } = await supabase.from("school_years").select("*").eq("is_current", true).single();
  if (!schoolYear) {
    await sendWhatsAppMessage(fromPhone, "No active school year is configured yet.");
    return;
  }

  // Find the student among this teacher's assigned classes only.
  const { data: assignments } = await supabase
    .from("class_subject_teachers")
    .select("school_id, grade_level_id, subject_id")
    .eq("teacher_id", teacher.id)
    .eq("school_year_id", schoolYear.id);

  const gradeIds = [...new Set((assignments ?? []).map((a) => a.grade_level_id))];
  const schoolIds = [...new Set((assignments ?? []).map((a) => a.school_id))];

  let studentQuery = supabase
    .from("students")
    .select("id, first_name, last_name, current_grade_level_id, school_id")
    .ilike("last_name", command.lastName)
    .eq("status", "active");
  if (gradeIds.length) studentQuery = studentQuery.in("current_grade_level_id", gradeIds);
  if (schoolIds.length) studentQuery = studentQuery.in("school_id", schoolIds);
  if (command.firstName) studentQuery = studentQuery.ilike("first_name", `${command.firstName}%`);

  const { data: matches } = await studentQuery;

  if (!matches || matches.length === 0) {
    await sendWhatsAppMessage(fromPhone, `No student named "${command.lastName}" found in your classes.`);
    return;
  }
  if (matches.length > 1) {
    const names = matches.map((m) => `${m.last_name}, ${m.first_name}`).join("\n");
    await sendWhatsAppMessage(fromPhone, `Multiple students match. Resend using LastName,FirstName:\n${names}`);
    return;
  }
  const student = matches[0];

  if (command.kind === "attendance") {
    const date = command.date ?? new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("attendance_records").upsert(
      {
        student_id: student.id,
        school_year_id: schoolYear.id,
        attendance_date: date,
        session: command.session,
        status: command.status,
        recorded_by: teacher.id,
      },
      { onConflict: "student_id,attendance_date,session" },
    );
    await sendWhatsAppMessage(
      fromPhone,
      error
        ? `Couldn't save attendance: ${error.message}`
        : `Saved: ${student.first_name} ${student.last_name} — ${date} ${command.session.toUpperCase()} = ${command.status}.`,
    );
    return;
  }

  const { data: subject } = await supabase.from("subjects").select("id, name").eq("code", command.subjectCode).maybeSingle();
  if (!subject) {
    await sendWhatsAppMessage(fromPhone, `Unknown subject code "${command.subjectCode}".`);
    return;
  }

  const { data: quarters } = await supabase.from("quarters").select("*").eq("school_year_id", schoolYear.id).order("number");
  const quarter =
    command.kind === "exam_score"
      ? quarters?.find((q) => q.number === command.quarterNumber)
      : findCurrentQuarter(quarters ?? []);

  if (!quarter) {
    await sendWhatsAppMessage(fromPhone, "Couldn't determine the quarter for that entry.");
    return;
  }

  if (command.kind === "weekly_score") {
    const { error } = await supabase.from("weekly_scores").upsert(
      {
        student_id: student.id,
        school_year_id: schoolYear.id,
        quarter_id: quarter.id,
        subject_id: subject.id,
        assessment_type: command.assessment,
        week_number: command.week,
        percentage: command.percentage,
        recorded_by: teacher.id,
      },
      { onConflict: "student_id,quarter_id,subject_id,assessment_type,week_number" },
    );
    await sendWhatsAppMessage(
      fromPhone,
      error
        ? `Couldn't save score: ${error.message}`
        : `Saved: ${student.first_name} ${student.last_name} — ${subject.name} week ${command.week} = ${command.percentage}%.`,
    );
    return;
  }

  if (command.kind === "exam_score") {
    const { error } = await supabase.from("quarter_exam_scores").upsert(
      {
        student_id: student.id,
        school_year_id: schoolYear.id,
        quarter_id: quarter.id,
        subject_id: subject.id,
        percentage: command.percentage,
        recorded_by: teacher.id,
      },
      { onConflict: "student_id,quarter_id,subject_id" },
    );
    await sendWhatsAppMessage(
      fromPhone,
      error
        ? `Couldn't save exam score: ${error.message}`
        : `Saved: ${student.first_name} ${student.last_name} — ${subject.name} Q${command.quarterNumber} exam = ${command.percentage}%.`,
    );
  }
}
