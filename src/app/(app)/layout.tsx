import { requireTeacher } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar isHeadTeacher={teacher.is_head_teacher} isMasterAdmin={teacher.is_master_admin} />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
