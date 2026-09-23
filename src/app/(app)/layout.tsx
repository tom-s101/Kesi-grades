import { requireTeacher } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentSchoolYear } from "@/lib/queries";
import { openAccessEnabled } from "@/lib/testing-mode";

// Every page under here reads live, per-user data, so none of it is
// ever prerendered or cached on the server. (The browser does keep a
// rendered page for a few seconds so going back is instant — see
// experimental.staleTimes in next.config.ts. Saving anything clears
// that outright via revalidatePath.)
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Both are already cached, so this costs nothing the pages below
  // weren't going to pay anyway.
  const [teacher, schoolYear] = await Promise.all([requireTeacher(), getCurrentSchoolYear()]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        isHeadTeacher={teacher.is_head_teacher}
        isMasterAdmin={teacher.is_master_admin}
        openAccess={openAccessEnabled()}
        schoolName={teacher.school_name}
        schoolYearLabel={schoolYear?.label}
      />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
