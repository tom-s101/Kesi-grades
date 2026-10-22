"use client";

import { useMemo, useState, useTransition } from "react";
import { KeyRound, RotateCcw, Search } from "lucide-react";
import { resetToStartingPassword } from "@/app/(app)/admin/logins/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loader";

export type TeacherLoginRow = {
  id: string;
  name: string;
  school: string;
  role: string | null;
  passwordChangedAt: string | null;
  lastSignInAt: string | null;
};

const dateFmt = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" });

function sinceText(iso: string | null): string {
  if (!iso) return "Never signed in";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Signed in today";
  if (days === 1) return "Signed in yesterday";
  if (days < 30) return `Signed in ${days} days ago`;
  return `Last signed in ${dateFmt.format(new Date(iso))}`;
}

export function TeacherLoginsClient({ rows, startingPassword }: { rows: TeacherLoginRow[]; startingPassword: string }) {
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [, startReset] = useTransition();

  const bySchool = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map<string, TeacherLoginRow[]>();
    for (const r of rows) {
      if (q && !r.name.toLowerCase().includes(q) && !r.school.toLowerCase().includes(q)) continue;
      groups.set(r.school, [...(groups.get(r.school) ?? []), r]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows, query]);

  const onStarting = rows.filter((r) => !r.passwordChangedAt).length;

  function reset(row: TeacherLoginRow) {
    if (!window.confirm(`Reset ${row.name}'s password to "${startingPassword}"?\n\nTheir current password will stop working straight away.`)) return;
    setBusyId(row.id);
    setMessage(null);
    startReset(async () => {
      const result = await resetToStartingPassword(row.id).catch(() => ({ ok: false as const, error: "Couldn't connect. Try again." }));
      setBusyId(null);
      setMessage(
        result.ok
          ? { tone: "good", text: `${row.name} can now sign in with "${startingPassword}".` }
          : { tone: "bad", text: result.error },
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a teacher or campus"
            className="h-11 pl-9 text-base sm:h-10 sm:text-sm"
          />
        </div>
        <p className="text-sm text-text-soft">
          {onStarting} of {rows.length} still on <strong className="font-semibold text-text">{startingPassword}</strong>
        </p>
      </div>

      {message && (
        <p
          role="status"
          className={
            message.tone === "good"
              ? "rounded-lg bg-status-good-bg px-4 py-3 text-sm text-status-good"
              : "rounded-lg bg-status-bad-bg px-4 py-3 text-sm text-status-bad"
          }
        >
          {message.text}
        </p>
      )}

      {bySchool.length === 0 && <p className="py-6 text-center text-sm text-text-faint">No one matches that.</p>}

      {bySchool.map(([school, teachers]) => (
        <section key={school} className="space-y-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">{school}</h2>
          <Card className="divide-y divide-border">
            {teachers.map((t) => {
              const onStartingPassword = !t.passwordChangedAt;
              return (
                <div key={t.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-text">
                      {t.name}
                      {t.role && <Badge tone="brand">{t.role}</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-text-faint">{sinceText(t.lastSignInAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    {onStartingPassword ? (
                      <Badge tone="warn" className="whitespace-nowrap">
                        <KeyRound size={12} className="mr-1 inline" />
                        {startingPassword}
                      </Badge>
                    ) : (
                      <Badge tone="good" className="whitespace-nowrap">
                        Own password · {dateFmt.format(new Date(t.passwordChangedAt!))}
                      </Badge>
                    )}
                    {/* Offered to everyone: a teacher added from School Admin
                        starts on whatever password was typed in for them. */}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busyId !== null}
                      onClick={() => reset(t)}
                      className="h-10 sm:h-8"
                    >
                      {busyId === t.id ? <Spinner size={14} /> : <RotateCcw size={14} />}
                      Reset to {startingPassword}
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}
