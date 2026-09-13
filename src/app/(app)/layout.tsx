import { requireTeacher } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

// Every page under here reads live, per-user data (auth, RLS-scoped
// queries) — never prerender/cache it statically, in DISABLE_AUTH
// testing mode or otherwise.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar isHeadTeacher={teacher.is_head_teacher} isMasterAdmin={teacher.is_master_admin} />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
