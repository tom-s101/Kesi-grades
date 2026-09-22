import { cookies } from "next/headers";
import { cacheReference } from "@/lib/reference-cache";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/auth";
import type { CurrentTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACT_AS_COOKIE, ROLE_COOKIE, openAccessEnabled, parseTestRole } from "@/lib/testing-mode";
import { ActAsSwitcher, type SwitchableTeacher } from "@/components/layout/act-as-switcher";

/**
 * The switcher's list of teachers is the same for everyone and changes
 * only when someone is added on the School Admin page, so it doesn't
 * need re-fetching on every navigation. It only loads at all in open
 * testing mode, where there's no row-level security to respect.
 */
const loadSwitchableTeachers = cacheReference("switchable_teachers", async (): Promise<SwitchableTeacher[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id, full_name, is_head_teacher, is_master_admin, schools(name)")
    .eq("active", true)
    .order("full_name");

  return ((data ?? []) as unknown as (SwitchableTeacher & { schools: { name: string } | null })[]).map((t) => ({
    id: t.id,
    full_name: t.full_name,
    school_name: t.schools?.name ?? null,
    is_head_teacher: t.is_head_teacher,
    is_master_admin: t.is_master_admin,
  }));
}, 60_000);

export async function Topbar({ teacher, title }: { teacher: CurrentTeacher; title?: string }) {
  const openAccess = openAccessEnabled();
  let teachers: SwitchableTeacher[] = [];
  let actingAs = "";
  let defaultLabel = "Full access (admin)";

  if (openAccess) {
    teachers = await loadSwitchableTeachers();
    const jar = await cookies();
    actingAs = jar.get(ACT_AS_COOKIE)?.value ?? "";
    defaultLabel =
      parseTestRole(jar.get(ROLE_COOKIE)?.value) === "teacher"
        ? "Teacher · all campuses"
        : "Full access (admin)";
  }

  return (
    <header className="border-b border-border bg-surface px-4 py-3 lg:px-8 lg:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {title && (
            <h1 className="truncate font-display text-lg font-medium text-text lg:text-xl">{title}</h1>
          )}
          {!title && <p className="truncate text-sm text-text-soft">{teacher.school_name ?? "All campuses"}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          {/* The switcher needs room for a full name, so on phones it
              drops to its own row below instead of crushing the title. */}
          {openAccess && teachers.length > 0 && (
            <div className="hidden sm:block">
              <ActAsSwitcher teachers={teachers} currentTeacherId={actingAs} defaultLabel={defaultLabel} />
            </div>
          )}
          <Badge tone="brand" className="whitespace-nowrap">
            {roleLabel(teacher)}
          </Badge>
          <p className="hidden text-sm font-medium text-text lg:block">{teacher.full_name}</p>
          <ThemeToggle />
        </div>
      </div>

      {openAccess && teachers.length > 0 && (
        <div className="mt-2 sm:hidden">
          <ActAsSwitcher teachers={teachers} currentTeacherId={actingAs} defaultLabel={defaultLabel} fullWidth />
        </div>
      )}
    </header>
  );
}
