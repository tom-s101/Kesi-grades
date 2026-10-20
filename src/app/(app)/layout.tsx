import { cookies } from "next/headers";
import { requireTeacher } from "@/lib/auth";
import { PasswordPrompt } from "@/components/auth/change-password-dialog";
import { PASSWORD_LATER_COOKIE } from "@/lib/password-prompt";
import { Sidebar } from "@/components/layout/sidebar";
import { PrefetchPages } from "@/components/layout/prefetch-pages";
import { getCurrentSchoolYear } from "@/lib/queries";
import { openAccessEnabled } from "@/lib/testing-mode";

// Every page under here reads live, per-user data, so none of it is
// ever prerendered or cached on the server. (The browser does keep a
// rendered page for a few seconds so going back is instant — see
// experimental.staleTimes in next.config.ts. Saving anything clears
// that outright via revalidatePath.)
export const dynamic = "force-dynamic";

// The pages every teacher moves between all day; loaded in the
// background so switching between them is near-instant. (The admin
// pages are left to load on demand — fewer people, used less often.)
const EVERYDAY_PAGES = ["/dashboard", "/students", "/attendance", "/grades", "/reports"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Both are already cached, so this costs nothing the pages below
  // weren't going to pay anyway.
  const [teacher, schoolYear, jar] = await Promise.all([requireTeacher(), getCurrentSchoolYear(), cookies()]);
  const openAccess = openAccessEnabled();

  // Still on the shared starting password, and hasn't said "not now"
  // since signing in. Strictly null: before migration 0012 the column
  // doesn't exist at all (undefined), and that's no reason to nag.
  const offerPasswordChange =
    !openAccess &&
    teacher.password_changed_at === null &&
    jar.get(PASSWORD_LATER_COOKIE)?.value !== teacher.id;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        isHeadTeacher={teacher.is_head_teacher}
        isMasterAdmin={teacher.is_master_admin}
        openAccess={openAccess}
        schoolName={teacher.school_name}
        schoolYearLabel={schoolYear?.label}
      />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
      {offerPasswordChange && <PasswordPrompt />}
      <PrefetchPages hrefs={EVERYDAY_PAGES} />
    </div>
  );
}
