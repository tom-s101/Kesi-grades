"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACT_AS_COOKIE, openAccessEnabled } from "@/lib/testing-mode";

/**
 * Switches which teacher the app treats you as while open testing mode
 * is on. Pass an empty string to go back to full admin access.
 */
export async function setActingTeacher(teacherId: string) {
  if (!openAccessEnabled()) return { error: "Not available once login is required." };

  const jar = await cookies();
  if (teacherId) {
    jar.set(ACT_AS_COOKIE, teacherId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  } else {
    jar.delete(ACT_AS_COOKIE);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
