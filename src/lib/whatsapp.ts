import "server-only";

const GRAPH_VERSION = "v21.0";

/** Sends a plain-text WhatsApp message via the Meta Cloud API. No-ops (logs) if not configured yet. */
export async function sendWhatsAppMessage(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log(`[whatsapp:not-configured] would send to ${to}: ${body}`);
    return;
  }

  await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

export const HELP_TEXT = `KESI commands:
ATT LastName AM|PM P|L|A [YYYY-MM-DD]
  e.g. ATT Santos AM P
SCORE LastName SubjectCode QUIZ|HW WeekNum Percentage
  e.g. SCORE Santos math QUIZ 3 90
EXAM LastName SubjectCode QuarterNum Percentage
  e.g. EXAM Santos math 1 88
Use LastName,FirstName if two students share a last name.
Reply HELP any time to see this again.`;

export type ParsedCommand =
  | { kind: "help" }
  | { kind: "attendance"; lastName: string; firstName?: string; session: "am" | "pm"; status: "present" | "late" | "absent"; date?: string }
  | { kind: "weekly_score"; lastName: string; firstName?: string; subjectCode: string; assessment: "quiz" | "homework_participation"; week: number; percentage: number }
  | { kind: "exam_score"; lastName: string; firstName?: string; subjectCode: string; quarterNumber: number; percentage: number }
  | { kind: "unknown"; raw: string };

const STATUS_MAP: Record<string, "present" | "late" | "absent"> = { P: "present", L: "late", A: "absent" };

function splitName(token: string): { lastName: string; firstName?: string } {
  const [last, first] = token.split(",");
  return { lastName: last.trim(), firstName: first?.trim() };
}

export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  const verb = parts[0]?.toUpperCase();

  if (!verb || verb === "HELP") return { kind: "help" };

  if (verb === "ATT" && parts.length >= 4) {
    const { lastName, firstName } = splitName(parts[1]);
    const session = parts[2].toLowerCase();
    const status = STATUS_MAP[parts[3].toUpperCase()];
    if ((session === "am" || session === "pm") && status) {
      return { kind: "attendance", lastName, firstName, session, status, date: parts[4] };
    }
  }

  if (verb === "SCORE" && parts.length >= 6) {
    const { lastName, firstName } = splitName(parts[1]);
    const subjectCode = parts[2].toLowerCase();
    const assessmentRaw = parts[3].toUpperCase();
    const assessment = assessmentRaw === "QUIZ" ? "quiz" : assessmentRaw === "HW" ? "homework_participation" : null;
    const week = Number(parts[4]);
    const percentage = Number(parts[5]);
    if (assessment && Number.isFinite(week) && Number.isFinite(percentage)) {
      return { kind: "weekly_score", lastName, firstName, subjectCode, assessment, week, percentage };
    }
  }

  if (verb === "EXAM" && parts.length >= 5) {
    const { lastName, firstName } = splitName(parts[1]);
    const subjectCode = parts[2].toLowerCase();
    const quarterNumber = Number(parts[3]);
    const percentage = Number(parts[4]);
    if (Number.isFinite(quarterNumber) && Number.isFinite(percentage)) {
      return { kind: "exam_score", lastName, firstName, subjectCode, quarterNumber, percentage };
    }
  }

  return { kind: "unknown", raw: trimmed };
}
