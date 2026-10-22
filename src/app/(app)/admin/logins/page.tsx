import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTING_PASSWORD } from "@/lib/starting-password";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLoader } from "@/components/ui/loader";
import { TeacherLoginsClient, type TeacherLoginRow } from "@/components/admin/teacher-logins-client";

// Who can sign in, and how — read fresh every time.
export const dynamic = "force-dynamic";

export default async function TeacherLoginsPage() {
  const teacher = await requireTeacher();
  // Admin view only: an admin who has switched to teacher view is a
  // teacher here too.
  if (!teacher.is_master_admin) redirect("/dashboard");

  return (
    <>
      <Topbar teacher={teacher} title="Teacher logins" />
      <main className="flex-1 space-y-5 p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Helping a teacher sign in</CardTitle>
            <CardDescription>
              Teachers sign in with their name as it appears below. Anyone marked{" "}
              <strong className="font-semibold text-text">{STARTING_PASSWORD}</strong> hasn&rsquo;t chosen their own
              password yet, so that&rsquo;s still theirs. A password a teacher chose themselves can&rsquo;t be looked
              up by anyone — it&rsquo;s stored scrambled — so if they&rsquo;ve forgotten it, reset them to{" "}
              <strong className="font-semibold text-text">{STARTING_PASSWORD}</strong> and they can pick a new one
              after signing in.
            </CardDescription>
          </CardHeader>
        </Card>

        <Suspense fallback={<SectionLoader label="Loading teachers" />}>
          <LoginList />
        </Suspense>
      </main>
    </>
  );
}

async function LoginList() {
  // The service role, because sign-in history lives in Supabase Auth,
  // which no ordinary query can read. The page above has already
  // checked this is an admin.
  const admin = createAdminClient();
  const [{ data: teachers }, { data: auth }] = await Promise.all([
    admin
      .from("teachers")
      .select("id, full_name, is_head_teacher, is_master_admin, password_changed_at, schools(name)")
      .eq("active", true)
      .order("full_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const lastSignIn = new Map((auth?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  type Row = {
    id: string;
    full_name: string;
    is_head_teacher: boolean;
    is_master_admin: boolean;
    password_changed_at: string | null;
    schools: { name: string } | null;
  };
  const rows: TeacherLoginRow[] = ((teachers ?? []) as unknown as Row[]).map((t) => ({
    id: t.id,
    name: t.full_name,
    school: t.schools?.name ?? "All campuses",
    role: t.is_master_admin ? "Admin" : t.is_head_teacher ? "Head teacher" : null,
    passwordChangedAt: t.password_changed_at,
    lastSignInAt: lastSignIn.get(t.id) ?? null,
  }));

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-text-faint">No teachers on file yet.</CardContent>
      </Card>
    );
  }

  return <TeacherLoginsClient rows={rows} startingPassword={STARTING_PASSWORD} />;
}
