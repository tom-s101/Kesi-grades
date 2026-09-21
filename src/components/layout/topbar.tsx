import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/auth";
import type { CurrentTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACT_AS_COOKIE, ROLE_COOKIE, openAccessEnabled, parseTestRole } from "@/lib/testing-mode";
import { ActAsSwitcher, type SwitchableTeacher } from "@/components/layout/act-as-switcher";

export async function Topbar({ teacher, title }: { teacher: CurrentTeacher; title?: string }) {
  const openAccess = openAccessEnabled();
  let teachers: SwitchableTeacher[] = [];
  let actingAs = "";
  let defaultLabel = "Full access (admin)";

  if (openAccess) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("teachers")
      .select("id, full_name, is_head_teacher, is_master_admin, schools(name)")
      .eq("active", true)
      .order("full_name");
    teachers = ((data ?? []) as unknown as (SwitchableTeacher & { schools: { name: string } | null })[]).map((t) => ({
      id: t.id,
      full_name: t.full_name,
      school_name: t.schools?.name ?? null,
      is_head_teacher: t.is_head_teacher,
      is_master_admin: t.is_master_admin,
    }));
    const jar = await cookies();
    actingAs = jar.get(ACT_AS_COOKIE)?.value ?? "";
    defaultLabel =
      parseTestRole(jar.get(ROLE_COOKIE)?.value) === "teacher"
        ? "Teacher · all campuses"
        : "Full access (admin)";
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4 lg:px-8">
      <div>
        {title && <h1 className="font-display text-xl font-medium text-text">{title}</h1>}
        {!title && <p className="text-sm text-text-soft">{teacher.school_name ?? "All campuses"}</p>}
      </div>
      <div className="flex items-center gap-3">
        {openAccess && teachers.length > 0 && (
          <ActAsSwitcher teachers={teachers} currentTeacherId={actingAs} defaultLabel={defaultLabel} />
        )}
        <Badge tone="brand">{roleLabel(teacher)}</Badge>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-text">{teacher.full_name}</p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
