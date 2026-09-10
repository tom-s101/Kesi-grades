"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Sprout } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SchoolOption = { id: string; name: string };
type TeacherOption = { id: string; full_name: string; is_head_teacher: boolean; is_master_admin: boolean };

type Step = "school" | "teacher" | "password" | "welcome";

export function LoginFlow({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("school");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOption | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/directory")
      .then((r) => r.json())
      .then((d) => setSchools(d.schools ?? []));
  }, []);

  async function chooseSchool(school: SchoolOption) {
    setSelectedSchool(school);
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/auth/directory?school_id=${school.id}`);
    const data = await res.json();
    setTeachers(data.teachers ?? []);
    setLoading(false);
    setStep("teacher");
  }

  function chooseTeacher(teacher: TeacherOption) {
    setSelectedTeacher(teacher);
    setError(null);
    setStep("password");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacher) return;
    setLoading(true);
    setError(null);

    const lookup = await fetch("/api/auth/directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_id: selectedTeacher.id }),
    }).then((r) => r.json());

    if (lookup.error) {
      setError("Couldn't find that account. Ask your admin to check your login.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: lookup.email,
      password,
    });

    if (signInError) {
      setError("That password didn't work. Try again, or ask your admin to reset it.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep("welcome");
    setTimeout(() => router.push(nextPath), 1900);
  }

  if (step === "welcome" && selectedTeacher) {
    return <WelcomeAnimation name={selectedTeacher.full_name} />;
  }

  return (
    <div className="w-full max-w-sm">
      {step !== "school" && (
        <button
          onClick={() => setStep(step === "password" ? "teacher" : "school")}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-soft hover:text-text"
        >
          <ChevronLeft size={16} /> Back
        </button>
      )}

      {step === "school" && (
        <div className="animate-kesi-rise">
          <h1 className="font-display text-2xl font-medium text-text">Which campus?</h1>
          <p className="mt-1 text-sm text-text-soft">Pick your school to find your name.</p>
          <div className="mt-6 grid grid-cols-1 gap-2">
            {schools.map((s) => (
              <button
                key={s.id}
                onClick={() => chooseSchool(s)}
                className="flex items-center justify-between rounded-xl border border-border-strong bg-surface-raised px-4 py-3.5 text-left text-sm font-medium text-text transition-colors hover:border-brand hover:bg-brand-soft"
              >
                {s.name}
                <Sprout size={16} className="text-brand" />
              </button>
            ))}
            <button
              onClick={() => chooseSchool({ id: "admin", name: "Master Admin" })}
              className="mt-2 rounded-xl border border-dashed border-border-strong px-4 py-3 text-left text-sm text-text-soft transition-colors hover:border-brand hover:text-text"
            >
              I&rsquo;m the organization admin
            </button>
          </div>
        </div>
      )}

      {step === "teacher" && (
        <div className="animate-kesi-rise">
          <h1 className="font-display text-2xl font-medium text-text">
            Hi there — who are you?
          </h1>
          <p className="mt-1 text-sm text-text-soft">{selectedSchool?.name}</p>
          <div className="mt-6 max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {loading && <Loader2 className="animate-spin text-brand" size={20} />}
            {!loading && teachers.length === 0 && (
              <p className="text-sm text-text-faint">
                No teachers set up here yet. An admin needs to run the roster import first.
              </p>
            )}
            {teachers.map((t) => (
              <button
                key={t.id}
                onClick={() => chooseTeacher(t)}
                className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm font-medium text-text transition-colors hover:border-brand hover:bg-brand-soft"
              >
                {t.full_name}
                {(t.is_head_teacher || t.is_master_admin) && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-strong">
                    {t.is_master_admin ? "Admin" : "Head Teacher"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "password" && selectedTeacher && (
        <form onSubmit={submitPassword} className="animate-kesi-rise">
          <h1 className="font-display text-2xl font-medium text-text">
            Welcome back, {selectedTeacher.full_name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-text-soft">Enter your password to continue.</p>
          <div className="mt-6">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="mt-3 text-sm text-status-bad">{error}</p>}
          <Button type="submit" className="mt-6 w-full" size="lg" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Log in"}
          </Button>
        </form>
      )}
    </div>
  );
}

function WelcomeAnimation({ name }: { name: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-6 text-center animate-kesi-rise")}>
      <div className="relative flex h-20 w-20 items-center justify-center">
        <Sprout size={40} className="animate-kesi-grow text-brand" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-faint">Welcome</p>
        <h1 className="font-display text-3xl font-medium text-text">{name.split(" ")[0]}</h1>
      </div>
      <Loader2 className="animate-spin text-text-faint" size={20} />
    </div>
  );
}
