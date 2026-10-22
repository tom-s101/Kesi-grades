"use server";

import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { openAccessEnabled } from "@/lib/testing-mode";

/**
 * Remember that this teacher has been through (or skipped) the welcome
 * tour, so it doesn't start by itself again. Best effort: if migration
 * 0017 hasn't been run the browser's own note still stops repeats there.
 */
export async function markTourDone(): Promise<void> {
  if (openAccessEnabled()) return;
  const teacher = await requireTeacher();
  await createAdminClient()
    .from("teachers")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", teacher.id);
}
